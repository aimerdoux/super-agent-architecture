"""
Sandbox Validator - Core Gated Evolution System

Validates workflow modifications against performance constraints
before allowing production deployment.
"""

import asyncio
import hashlib
import json
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Callable
import docker
from docker.errors import ContainerError
import redis
import postgres_connect
import statistics


class PerformanceDimension(Enum):
    THROUGHPUT = "throughput"
    COST = "cost"
    ERROR_RATE = "error_rate"
    LATENCY = "latency"
    ACCURACY = "accuracy"
    MEMORY = "memory"
    API_RATE_LIMIT = "api_rate_limit"


@dataclass
class PerformanceMetrics:
    """Measured performance metrics from a sandbox run."""
    throughput: float  # tasks per second
    cost: float  # USD per 1000 tasks
    error_rate: float  # 0-1 ratio
    latency_p95: float  # seconds
    latency_p99: float  # seconds
    memory_peak_mb: float
    total_tasks: int
    completed_tasks: int
    failed_tasks: int
    total_duration_seconds: float
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "throughput": self.throughput,
            "cost": self.cost,
            "error_rate": self.error_rate,
            "latency_p95": self.latency_p95,
            "latency_p99": self.latency_p99,
            "memory_peak_mb": self.memory_peak_mb,
            "total_tasks": self.total_tasks,
            "completed_tasks": self.completed_tasks,
            "failed_tasks": self.failed_tasks,
            "duration_seconds": self.total_duration_seconds
        }


@dataclass
class ValidationResult:
    """Result of sandbox validation."""
    proposal_id: str
    approved: bool
    improvement: Dict[str, float]  # dimension -> % improvement
    regressions: Dict[str, float]  # dimension -> % regression
    metrics: Dict[str, PerformanceMetrics]
    confidence: float
    reason: Optional[str]
    timestamp: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "proposal_id": self.proposal_id,
            "approved": self.approved,
            "improvement": self.improvement,
            "regressions": self.regressions,
            "confidence": self.confidence,
            "reason": self.reason,
            "timestamp": self.timestamp.isoformat(),
            "metrics": {
                k: v.to_dict() for k, v in self.metrics.items()
            }
        }


class SandboxValidator:
    """
    Core validation system for workflow modifications.
    
    Only promotes changes that:
    1. Improve the identified bottleneck by >15%
    2. Don't regress other dimensions by >5%
    3. Scale linearly to 10x load
    """
    
    # Configuration
    IMPROVEMENT_THRESHOLD = 0.15  # 15% improvement required
    REGRESSION_TOLERANCE = 0.05  # 5% max regression
    SCALE_MULTIPLIERS = [1, 5, 10]  # Test at these load multipliers
    
    def __init__(
        self,
        docker_image: str = "jarvis-sandbox:latest",
        redis_url: str = "redis://localhost:6379",
        postgres_url: str = "postgres://postgres:postgres@localhost:5432/sandbox",
        resource_limits: Dict[str, str] = None
    ):
        self.docker_client = docker.from_env()
        self.redis = redis.from_url(redis_url)
        self.postgres_url = postgres_url
        self.docker_image = docker_image
        self.resource_limits = resource_limits or {
            "memory": "512m",
            "cpu_period": "100000",
            "cpu_quota": "50000"
        }
        self.execution_history = []
    
    async def validate_proposal(
        self,
        proposal_id: str,
        current_workflow: Dict[str, Any],
        proposed_workflow: Dict[str, Any],
        test_scenarios: List[Dict[str, Any]],
        limiting_factor: str = None
    ) -> ValidationResult:
        """
        Main entry point: validate a workflow modification proposal.
        
        Args:
            proposal_id: Unique identifier for this proposal
            current_workflow: Baseline workflow configuration
            proposed_workflow: Modified workflow to test
            test_scenarios: Representative test cases
            limiting_factor: Optional pre-identified bottleneck
        
        Returns:
            ValidationResult with approval decision and metrics
        """
        
        print(f"\n{'='*60}")
        print(f"SANDBOX VALIDATION: {proposal_id}")
        print(f"{'='*60}")
        
        # Step 1: Identify bottleneck if not provided
        if not limiting_factor:
            print("\n[1/5] Identifying performance bottleneck...")
            baseline_metrics = await self._run_sandbox(
                current_workflow, test_scenarios, "baseline"
            )
            limiting_factor = self._identify_bottleneck(baseline_metrics)
            print(f"   → Bottleneck: {limiting_factor}")
        else:
            print(f"\n[1/5] Using pre-identified bottleneck: {limiting_factor}")
            baseline_metrics = None
        
        # Step 2: Run baseline (if not already done)
        if baseline_metrics is None:
            print("\n[2/5] Running baseline performance test...")
            baseline_metrics = await self._run_sandbox(
                current_workflow, test_scenarios, "baseline"
            )
        print(f"   → Baseline {limiting_factor}: {self._get_metric_value(baseline_metrics, limiting_factor):.4f}")
        
        # Step 3: Run proposed workflow
        print("\n[3/5] Running proposed workflow...")
        proposed_metrics = await self._run_sandbox(
            proposed_workflow, test_scenarios, "proposed"
        )
        print(f"   → Proposed {limiting_factor}: {self._get_metric_value(proposed_metrics, limiting_factor):.4f}")
        
        # Step 4: Calculate improvements and regressions
        print("\n[4/5] Analyzing improvements and regressions...")
        improvement, regressions = self._calculate_changes(
            baseline_metrics, proposed_metrics
        )
        
        print("   Improvements:")
        for dim, pct in sorted(improvement.items(), key=lambda x: -x[1]):
            marker = "✓" if pct >= self.IMPROVEMENT_THRESHOLD else "✗"
            print(f"     {marker} {dim}: +{pct*f}%")
        
100:.1        print("   Regressions:")
        for dim, pct in sorted(regressions.items(), key=lambda x: -x[1]):
            marker = "!" if pct > self.REGRESSION_TOLERANCE else "✓"
            print(f"     {marker} {dim}: {pct*100:.1f}%")
        
        # Step 5: Scale test
        print("\n[5/5] Testing scalability at 10x load...")
        scale_results = await self._test_scale(
            proposed_workflow, test_scenarios
        )
        
        # Decision gate
        bottleneck_improved = improvement.get(limiting_factor, 0) >= self.IMPROVEMENT_THRESHOLD
        no_significant_regressions = all(
            r <= self.REGRESSION_TOLERANCE for r in regressions.values()
        )
        scales_linearly = scale_results["linearity"] > 0.8  # 80% of expected
        
        approved = (
            bottleneck_improved and 
            no_significant_regressions and 
            scales_linearly
        )
        
        confidence = self._calculate_confidence(
            improvement, regressions, scale_results
        )
        
        reason = None
        if not bottleneck_improved:
            reason = f"Bottleneck improvement ({improvement.get(limiting_factor, 0)*100:.1f}%) below {self.IMPROVEMENT_THRESHOLD*100}%"
        elif not no_significant_regressions:
            worst_regression = max(regressions.values())
            reason = f"Regression ({worst_regression*100:.1f}%) exceeds tolerance ({self.REGRESSION_TOLERANCE*100}%)"
        elif not scales_linearly:
            reason = f"Scale linearity ({scale_results['linearity']*100:.1f}%) below 80%"
        
        result = ValidationResult(
            proposal_id=proposal_id,
            approved=approved,
            improvement=improvement,
            regressions=regressions,
            metrics={"baseline": baseline_metrics, "proposed": proposed_metrics},
            confidence=confidence,
            reason=reason
        )
        
        # Store result
        await self._store_result(result)
        
        # Print decision
        print(f"\n{'='*60}")
        if approved:
            print("✅ PROPOSAL APPROVED")
            print(f"   Confidence: {confidence*100:.1f}%")
        else:
            print("❌ PROPOSAL REJECTED")
            print(f"   Reason: {reason}")
        print(f"{'='*60}\n")
        
        return result
    
    async def _run_sandbox(
        self,
        workflow: Dict[str, Any],
        test_scenarios: List[Dict[str, Any]],
        run_id: str
    ) -> PerformanceMetrics:
        """Execute workflow in sandboxed container."""
        
        container_name = f"jarvis-sandbox-{run_id}-{uuid.uuid4().hex[:8]}"
        
        # Prepare container environment
        workflow_json = json.dumps(workflow)
        scenarios_json = json.dumps(test_scenarios)
        
        start_time = time.time()
        
        try:
            # Run container with hard resource limits
            container = self.docker_client.containers.run(
                self.docker_image,
                command=f"python run_workflow.py '{workflow_json}' '{scenarios_json}'",
                name=container_name,
                environment={
                    "RUN_ID": run_id,
                    "METRICS_ENDPOINT": "http://metrics-collector:8080",
                    "SANDBOX_MODE": "true"
                },
                mem_limit=self.resource_limits["memory"],
                cpu_period=int(self.resource_limits["cpu_period"]),
                cpu_quota=int(self.resource_limits["cpu_quota"]),
                network_mode="bridge",
                detach=False,
                remove=True,
                stdout=True,
                stderr=True
            )
            
            # Wait for completion
            output = container.decode('utf-8')
            
        except ContainerError as e:
            # Container failed - still parse partial metrics
            output = e.container.logs().decode('utf-8')
            print(f"   ⚠️ Container error, parsing partial metrics...")
        
        duration = time.time() - start_time
        
        # Parse metrics from output
        metrics = self._parse_metrics_output(output, duration)
        
        # Store in Redis for quick access
        self.redis.setex(
            f"sandbox:metrics:{run_id}",
            3600,
            json.dumps(metrics.to_dict())
        )
        
        return metrics
    
    async def _test_scale(
        self,
        workflow: Dict[str, Any],
        base_scenarios: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Test if improvement holds at 5x and 10x load."""
        
        results = {}
        
        for multiplier in [1, 5, 10]:
            # Scale test scenarios
            scaled_scenarios = base_scenarios * multiplier
            
            run_id = f"scale-{multiplier}x"
            metrics = await self._run_sandbox(workflow, scaled_scenarios, run_id)
            
            results[f"{multiplier}x"] = {
                "throughput": metrics.throughput,
                "total_tasks": metrics.total_tasks,
                "duration": metrics.total_duration_seconds
            }
            
            print(f"   {multiplier}x load: {metrics.throughput:.2f} tasks/sec, {metrics.total_duration_seconds:.1f}s")
            
            # Small delay between runs
            await asyncio.sleep(2)
        
        # Calculate linearity
        baseline_throughput = results["1x"]["throughput"]
        expected_5x = baseline_throughput * 5
        actual_5x = results["5x"]["throughput"]
        linearity_5x = actual_5x / expected_5x if expected_5x > 0 else 0
        
        expected_10x = baseline_throughput * 10
        actual_10x = results["10x"]["throughput"]
        linearity_10x = actual_10x / expected_10x if expected_10x > 0 else 0
        
        avg_linearity = (linearity_5x + linearity_10x) / 2
        
        print(f"   → Scale linearity (5x): {linearity_5x*100:.1f}%")
        print(f"   → Scale linearity (10x): {linearity_10x*100:.1f}%")
        print(f"   → Average: {avg_linearity*100:.1f}%")
        
        return {
            "1x": results["1x"],
            "5x": results["5x"],
            "10x": results["10x"],
            "linearity_5x": linearity_5x,
            "linearity_10x": linearity_10x,
            "linearity": avg_linearity
        }
    
    def _identify_bottleneck(self, metrics: PerformanceMetrics) -> str:
        """Identify which dimension is most constraining."""
        
        # Calculate utilization for each dimension
        utilizations = {
            PerformanceDimension.THROUGHPUT.value: 1.0 - min(metrics.throughput / 100, 1.0),  # Assuming 100 is target
            PerformanceDimension.ERROR_RATE.value: metrics.error_rate,
            PerformanceDimension.LATENCY.value: min(metrics.latency_p95 / 5.0, 1.0),  # Assuming 5s is threshold
            PerformanceDimension.COST.value: min(metrics.cost / 1.0, 1.0),  # Assuming $1 is threshold
            PerformanceDimension.MEMORY.value: min(metrics.memory_peak_mb / 512.0, 1.0)  # Assuming 512MB limit
        }
        
        # Bottleneck is highest utilization
        bottleneck = max(utilizations, key=utilizations.get)
        
        return bottleneck
    
    def _calculate_changes(
        self,
        baseline: PerformanceMetrics,
        proposed: PerformanceMetrics
    ) -> tuple[Dict[str, float], Dict[str, float]]:
        """Calculate percentage improvements and regressions."""
        
        dimensions = [
            ("throughput", lambda m: m.throughput, True),  # Higher is better
            ("cost", lambda m: m.cost, False),  # Lower is better
            ("error_rate", lambda m: m.error_rate, False),
            ("latency", lambda m: m.latency_p95, False),
            ("memory", lambda m: m.memory_peak_mb, False)
        ]
        
        improvements = {}
        regressions = {}
        
        for dim, accessor, higher_is_better in dimensions:
            base_val = accessor(baseline)
            prop_val = accessor(proposed)
            
            if base_val == 0:
                pct_change = 0.0
            else:
                pct_change = (prop_val - base_val) / base_val
            
            if higher_is_better:
                if pct_change > 0:
                    improvements[dim] = pct_change
                else:
                    regressions[dim] = abs(pct_change)
            else:
                if pct_change < 0:
                    improvements[dim] = abs(pct_change)
                else:
                    regressions[dim] = pct_change
        
        return improvements, regressions
    
    def _calculate_confidence(
        self,
        improvements: Dict[str, float],
        regressions: Dict[str, float],
        scale_results: Dict[str, Any]
    ) -> float:
        """Calculate confidence score based on consistency."""
        
        # Base confidence
        confidence = 0.5
        
        # Add confidence for improvements
        if improvements:
            avg_improvement = sum(improvements.values()) / len(improvements)
            confidence += min(avg_improvement * 0.3, 0.3)
        
        # Reduce confidence for regressions
        if regressions:
            max_regression = max(regressions.values())
            confidence -= min(max_regression * 0.5, 0.3)
        
        # Add confidence for scale performance
        confidence += scale_results["linearity"] * 0.2
        
        return min(max(confidence, 0.0), 1.0)
    
    def _get_metric_value(
        self, 
        metrics: PerformanceMetrics, 
        dimension: str
    ) -> float:
        """Extract metric value by dimension name."""
        mapping = {
            "throughput": metrics.throughput,
            "cost": metrics.cost,
            "error_rate": metrics.error_rate,
            "latency": metrics.latency_p95,
            "latency_p95": metrics.latency_p95,
            "memory": metrics.memory_peak_mb
        }
        return mapping.get(dimension, 0.0)
    
    def _parse_metrics_output(
        self, 
        output: str, 
        duration: float
    ) -> PerformanceMetrics:
        """Parse metrics from container output."""
        
        # Try to extract from JSON output
        try:
            data = json.loads(output)
            if "metrics" in data:
                m = data["metrics"]
                return PerformanceMetrics(
                    throughput=m.get("throughput", 0),
                    cost=m.get("cost", 0),
                    error_rate=m.get("error_rate", 0),
                    latency_p95=m.get("latency_p95", 0),
                    latency_p99=m.get("latency_p99", 0),
                    memory_peak_mb=m.get("memory_peak_mb", 0),
                    total_tasks=m.get("total_tasks", 0),
                    completed_tasks=m.get("completed_tasks", 0),
                    failed_tasks=m.get("failed_tasks", 0),
                    total_duration_seconds=duration
                )
        except json.JSONDecodeError:
            pass
        
        # Fallback: return empty metrics
        return PerformanceMetrics(
            throughput=0, cost=0, error_rate=0,
            latency_p95=0, latency_p99=0, memory_peak_mb=0,
            total_tasks=0, completed_tasks=0, failed_tasks=0,
            total_duration_seconds=duration
        )
    
    async def _store_result(self, result: ValidationResult):
        """Store validation result for history tracking."""
        
        self.execution_history.append(result)
        
        # Keep last 100 results
        if len(self.execution_history) > 100:
            self.execution_history = self.execution_history[-100:]
        
        # Store in Redis
        self.redis.setex(
            f"sandbox:validation:{result.proposal_id}",
            86400,  # 24 hours
            json.dumps(result.to_dict())
        )
        
        # Publish for subscribers
        self.redis.publish(
            "sandbox.validations",
            json.dumps(result.to_dict())
        )


async def run_validation_demo():
    """Demo of the sandbox validation system."""
    
    validator = SandboxValidator()
    
    # Sample test scenarios
    test_scenarios = [
        {"type": "arithmetic", "count": 10},
        {"type": "text_processing", "count": 5},
        {"type": "api_call", "count": 3}
    ] * 10  # Repeat for meaningful metrics
    
    # Baseline workflow
    baseline = {
        "version": "1.0",
        "steps": [
            {"type": "process", "batch_size": 10, "parallelism": 1}
        ]
    }
    
    # Proposed optimization (better parallelism)
    proposed = {
        "version": "1.1",
        "steps": [
            {"type": "process", "batch_size": 10, "parallelism": 4}
        ]
    }
    
    result = await validator.validate_proposal(
        proposal_id="demo-parallelism-optimization",
        current_workflow=baseline,
        proposed_workflow=proposed,
        test_scenarios=test_scenarios
    )
    
    print(f"\nResult: {'APPROVED' if result.approved else 'REJECTED'}")
    print(f"Confidence: {result.confidence*100:.1f}%")


if __name__ == "__main__":
    asyncio.run(run_validation_demo())

"""
Meta-Cognition Engine - Agent proposes and validates its own optimizations

This is the "brain" that:
1. Analyzes performance data
2. Identifies optimization opportunities
3. Proposes workflow modifications
4. Validates through sandbox before deployment
"""

import json
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pathlib import Path

from .performance_monitor import PerformanceMonitor, PerformanceDimension
from .sandbox_validator import SandboxValidator, ValidationResult


class OptimizationType(Enum):
    """Types of optimizations the agent can propose."""
    PARALLELISM = "parallelism"
    BATCHING = "batching"
    CACHING = "caching"
    RETRY_LOGIC = "retry_logic"
    MODEL_SWITCH = "model_switch"
    CONTEXT_OPTIMIZATION = "context_optimization"
    API_ROUTING = "api_routing"
    WORKFLOW_RESTRUCTURING = "workflow_restructuring"


@dataclass
class OptimizationProposal:
    """A proposed optimization to the workflow."""
    id: str
    optimization_type: OptimizationType
    description: str
    target_bottleneck: str
    expected_improvement: float  # Expected % improvement
    workflow_modification: Dict[str, Any]
    confidence: float
    created_at: datetime = None
    validation_result: Optional[ValidationResult] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "type": self.optimization_type.value,
            "description": self.description,
            "target_bottleneck": self.target_bottleneck,
            "expected_improvement": self.expected_improvement,
            "confidence": self.confidence,
            "modification": self.workflow_modification,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "validation": self.validation_result.to_dict() if self.validation_result else None
        }


class MetaCognitionEngine:
    """
    Meta-cognitive engine that enables the agent to:
    - Reflect on its own performance
    - Propose improvements
    - Validate through sandbox before deploying
    """
    
    def __init__(
        self,
        performance_monitor: PerformanceMonitor = None,
        sandbox_validator: SandboxValidator = None,
        config: Dict[str, Any] = None
    ):
        self.perf_monitor = performance_monitor or PerformanceMonitor()
        self.sandbox = sandbox_validator or SandboxValidator()
        self.config = config or {
            "improvement_threshold": 0.15,  # 15% improvement required
            "confidence_threshold": 0.7,      # 70% confidence required
            "max_pending_proposals": 10,
            "proposal_cooldown_hours": 24    # Don't propose same optimization twice
        }
        
        self.proposals: List[OptimizationProposal] = []
        self.deployed_optimizations: List[Dict[str, Any]] = []
        self.reflection_history: List[Dict[str, Any]] = []
    
    async def reflect_and_propose(
        self,
        current_workflow: Dict[str, Any],
        test_scenarios: List[Dict[str, Any]] = None
    ) -> List[OptimizationProposal]:
        """
        Main entry point: reflect on performance and propose optimizations.
        
        Args:
            current_workflow: The current workflow configuration
            test_scenarios: Optional test scenarios for sandbox validation
        
        Returns:
            List of optimization proposals (may be empty if none identified)
        """
        
        print("\n" + "="*60)
        print("META-COGNITION: Reflecting on Performance")
        print("="*60)
        
        # Step 1: Identify current bottleneck
        print("\n[1/4] Analyzing performance bottleneck...")
        bottleneck = self.perf_monitor.identify_bottleneck()
        print(f"   → Bottleneck: {bottleneck['bottleneck']}")
        print(f"   → Severity: {bottleneck['severity']*100:.1f}%")
        
        # Step 2: Check if optimization is warranted
        if bottleneck['severity'] < 0.3:
            print(f"\n   → Performance is healthy, no optimization needed")
            return []
        
        # Step 3: Generate optimization proposals
        print("\n[2/4] Generating optimization proposals...")
        proposals = await self._generate_proposals(
            current_workflow, 
            bottleneck
        )
        
        # Step 4: Validate proposals through sandbox
        print("\n[3/4] Validating proposals through sandbox...")
        validated_proposals = []
        
        for proposal in proposals:
            if test_scenarios:
                print(f"\n   Testing: {proposal.optimization_type.value}")
                result = await self.sandbox.validate_proposal(
                    proposal_id=proposal.id,
                    current_workflow=current_workflow,
                    proposed_workflow=proposal.workflow_modification,
                    test_scenarios=test_scenarios,
                    limiting_factor=proposal.target_bottleneck
                )
                proposal.validation_result = result
                
                if result.approved:
                    validated_proposals.append(proposal)
                    print(f"   ✅ Approved ({result.confidence*100:.0f}% confidence)")
                else:
                    print(f"   ❌ Rejected: {result.reason}")
            else:
                # Skip sandbox if no test scenarios provided
                validated_proposals.append(proposal)
        
        # Step 5: Store proposals
        self.proposals.extend(validated_proposals)
        self.proposals = self.proposals[-self.config["max_pending_proposals"]:]
        
        # Record reflection
        self.reflection_history.append({
            "timestamp": datetime.now().isoformat(),
            "bottleneck": bottleneck,
            "proposals_generated": len(proposals),
            "proposals_validated": len(validated_proposals)
        })
        
        print(f"\n[4/4] Complete")
        print(f"   → Generated: {len(proposals)} proposals")
        print(f"   → Validated: {len(validated_proposals)} approved")
        
        return validated_proposals
    
    async def _generate_proposals(
        self,
        current_workflow: Dict[str, Any],
        bottleneck: Dict[str, Any]
    ) -> List[OptimizationProposal]:
        """Generate optimization proposals targeting the bottleneck."""
        
        proposals = []
        bottleneck_type = bottleneck['bottleneck']
        current_value = bottleneck['current_value']
        
        # Generate proposals based on bottleneck type
        if bottleneck_type == "throughput":
            proposals.extend(await self._propose_throughput_optimizations(current_workflow))
        
        elif bottleneck_type == "latency":
            proposals.extend(await self._propose_latency_optimizations(current_workflow))
        
        elif bottleneck_type == "api_rate_limit":
            proposals.extend(await self._propose_api_routing_optimizations(current_workflow))
        
        elif bottleneck_type == "cost":
            proposals.extend(await self._propose_cost_optimizations(current_workflow))
        
        elif bottleneck_type == "error_rate":
            proposals.extend(await self._propose_reliability_optimizations(current_workflow))
        
        return proposals
    
    async def _propose_throughput_optimizations(
        self, workflow: Dict[str, Any]
    ) -> List[OptimizationProposal]:
        """Propose optimizations targeting throughput."""
        
        proposals = []
        
        # Proposal 1: Increase parallelism
        current_parallelism = self._extract_parameter(workflow, "parallelism", default=1)
        
        if current_parallelism < 4:
            new_parallelism = min(current_parallelism * 2, 8)
            
            proposal = OptimizationProposal(
                id=f"para_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                optimization_type=OptimizationType.PARALLELISM,
                description=f"Increase parallelism from {current_parallelism} to {new_parallelism}",
                target_bottleneck="throughput",
                expected_improvement=0.3,  # Expected 30% improvement
                workflow_modification=self._apply_parameter(
                    workflow, "parallelism", new_parallelism
                ),
                confidence=0.85,
                created_at=datetime.now()
            )
            proposals.append(proposal)
        
        # Proposal 2: Add batching
        batching_configs = self._extract_parameter(workflow, "batching", default=None)
        
        if not batching_configs:
            proposal = OptimizationProposal(
                id=f"batch_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                optimization_type=OptimizationType.BATCHING,
                description="Add request batching to reduce per-request overhead",
                target_bottleneck="throughput",
                expected_improvement=0.25,
                workflow_modification=self._apply_parameter(
                    workflow, "batching", {"batch_size": 10, "max_wait_ms": 100}
                ),
                confidence=0.75,
                created_at=datetime.now()
            )
            proposals.append(proposal)
        
        return proposals
    
    async def _propose_latency_optimizations(
        self, workflow: Dict[str, Any]
    ) -> List[OptimizationProposal]:
        """Propose optimizations targeting latency."""
        
        proposals = []
        
        # Proposal 1: Add caching
        caching = self._extract_parameter(workflow, "caching", default=None)
        
        if not caching:
            proposal = OptimizationProposal(
                id=f"cache_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                optimization_type=OptimizationType.CACHING,
                description="Add result caching to avoid redundant computations",
                target_bottleneck="latency",
                expected_improvement=0.4,
                workflow_modification=self._apply_parameter(
                    workflow, "caching", {
                        "enabled": True,
                        "ttl_seconds": 300,
                        "cache_key_fields": ["input_hash"]
                    }
                ),
                confidence=0.9,
                created_at=datetime.now()
            )
            proposals.append(proposal)
        
        # Proposal 2: Switch to faster model
        model = self._extract_parameter(workflow, "model", default=None)
        
        if model and "sonnet" in model.lower():
            proposal = OptimizationProposal(
                id=f"model_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                optimization_type=OptimizationType.MODEL_SWITCH,
                description="Switch to faster model variant",
                target_bottleneck="latency",
                expected_improvement=0.35,
                workflow_modification=self._apply_parameter(
                    workflow, "model", "haiku"
                ),
                confidence=0.7,
                created_at=datetime.now()
            )
            proposals.append(proposal)
        
        return proposals
    
    async def _propose_api_routing_optimizations(
        self, workflow: Dict[str, Any]
    ) -> List[OptimizationProposal]:
        """Propose optimizations targeting API rate limits."""
        
        proposals = []
        
        # Proposal: Implement backoff strategy
        retry_config = self._extract_parameter(workflow, "retry", default=None)
        
        if not retry_config:
            proposal = OptimizationProposal(
                id=f"retry_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                optimization_type=OptimizationType.RETRY_LOGIC,
                description="Implement exponential backoff to reduce rate limit hits",
                target_bottleneck="api_rate_limit",
                expected_improvement=0.5,
                workflow_modification=self._apply_parameter(
                    workflow, "retry", {
                        "enabled": True,
                        "max_retries": 3,
                        "base_delay_ms": 1000,
                        "max_delay_ms": 30000,
                        "jitter": True
                    }
                ),
                confidence=0.88,
                created_at=datetime.now()
            )
            proposals.append(proposal)
        
        return proposals
    
    async def _propose_cost_optimizations(
        self, workflow: Dict[str, Any]
    ) -> List[OptimizationProposal]:
        """Propose optimizations targeting cost."""
        
        proposals = []
        
        # Proposal: Reduce context size
        context_config = self._extract_parameter(workflow, "context", default=None)
        
        proposal = OptimizationProposal(
            id=f"context_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            optimization_type=OptimizationType.CONTEXT_OPTIMIZATION,
            description="Optimize context window usage to reduce token costs",
            target_bottleneck="cost",
            expected_improvement=0.2,
            workflow_modification=self._apply_parameter(
                workflow, "context", {
                    "max_tokens": 4000,
                    "compression_ratio": 0.5,
                    "summarize_older": True
                }
            ),
            confidence=0.82,
            created_at=datetime.now()
        )
        proposals.append(proposal)
        
        return proposals
    
    async def _propose_reliability_optimizations(
        self, workflow: Dict[str, Any]
    ) -> List[OptimizationProposal]:
        """Propose optimizations targeting error rate."""
        
        proposals = []
        
        # Proposal: Add validation layer
        validation = self._extract_parameter(workflow, "validation", default=None)
        
        if not validation:
            proposal = OptimizationProposal(
                id=f"valid_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                optimization_type=OptimizationType.WORKFLOW_RESTRUCTURING,
                description="Add input validation to catch errors early",
                target_bottleneck="error_rate",
                expected_improvement=0.45,
                workflow_modification=self._apply_parameter(
                    workflow, "validation", {
                        "enabled": True,
                        "strict_mode": True,
                        "fail_fast": True
                    }
                ),
                confidence=0.92,
                created_at=datetime.now()
            )
            proposals.append(proposal)
        
        return proposals
    
    def _extract_parameter(
        self, 
        workflow: Dict[str, Any], 
        param_name: str, 
        default: Any = None
    ) -> Any:
        """Extract a parameter from nested workflow config."""
        
        def search(obj, path=[]):
            if isinstance(obj, dict):
                for key, value in obj.items():
                    if key == param_name:
                        return value
                    result = search(value, path + [key])
                    if result is not None:
                        return result
            elif isinstance(obj, list):
                for item in obj:
                    result = search(item, path)
                    if result is not None:
                        return result
            return None
        
        return search(workflow) or default
    
    def _apply_parameter(
        self,
        workflow: Dict[str, Any],
        param_name: str,
        param_value: Any
    ) -> Dict[str, Any]:
        """Apply a parameter modification to workflow (deep copy)."""
        
        import copy
        modified = copy.deepcopy(workflow)
        
        def set_nested(obj, path, value):
            for key in path[:-1]:
                if key not in obj:
                    obj[key] = {}
                obj = obj[key]
            obj[path[-1]] = value
        
        # Simple: add to top-level or first level
        if param_name not in modified:
            # Try to find appropriate nesting
            modified[param_name] = param_value
        
        return modified
    
    def get_proposals_status(self) -> Dict[str, Any]:
        """Get status of all pending proposals."""
        
        pending = [p for p in self.proposals if p.validation_result is None or not p.validation_result.approved]
        approved = [p for p in self.proposals if p.validation_result and p.validation_result.approved]
        
        return {
            "pending_count": len(pending),
            "approved_count": len(approved),
            "recent_proposals": [
                {
                    "id": p.id,
                    "type": p.optimization_type.value,
                    "bottleneck": p.target_bottleneck,
                    "confidence": p.confidence,
                    "approved": p.validation_result.approved if p.validation_result else False
                }
                for p in self.proposals[-10:]
            ]
        }
    
    def get_optimization_history(self) -> str:
        """Get a human-readable history of optimizations."""
        
        if not self.deployed_optimizations:
            return "No optimizations have been deployed yet."
        
        lines = [
            "Optimization Deployment History",
            "=" * 40,
            ""
        ]
        
        for opt in reversed(self.deployed_optimizations[-20:]):
            lines.append(f"- {opt['type']}: {opt['description']}")
            lines.append(f"  Deployed: {opt['deployed_at']}")
            lines.append(f"  Improvement: +{opt['actual_improvement']*100:.1f}%" if opt.get('actual_improvement') else "  (measuring...)")
            lines.append("")
        
        return "\n".join(lines)
    
    async def deploy_approved_proposal(
        self,
        proposal_id: str,
        workflow: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Deploy an approved proposal to production."""
        
        proposal = next((p for p in self.proposals if p.id == proposal_id), None)
        
        if not proposal:
            raise ValueError(f"Proposal not found: {proposal_id}")
        
        if not proposal.validation_result or not proposal.validation_result.approved:
            raise ValueError(f"Proposal not approved: {proposal_id}")
        
        # Record deployment
        deployment = {
            "id": proposal.id,
            "type": proposal.optimization_type.value,
            "description": proposal.description,
            "modification": proposal.workflow_modification,
            "expected_improvement": proposal.expected_improvement,
            "deployed_at": datetime.now().isoformat()
        }
        
        self.deployed_optimizations.append(deployment)
        
        return deployment


# Demo and test functions
async def demo_meta_cognition():
    """Demo of the meta-cognition engine."""
    
    print("\n" + "="*60)
    print("META-COGNITION ENGINE DEMO")
    print("="*60)
    
    # Initialize
    engine = MetaCognitionEngine()
    
    # Record some baseline metrics
    engine.perf_monitor.record_metrics({
        "throughput": 50.0,
        "latency": 5.0,
        "cost": 0.05,
        "error_rate": 0.03,
        "accuracy": 0.85
    })
    
    # Current workflow
    current_workflow = {
        "version": "1.0",
        "name": "baseline_agent",
        "config": {
            "parallelism": 1,
            "model": "sonnet-4",
            "caching": None
        },
        "steps": [
            {"type": "process", "batch_size": 1},
            {"type": "validate"}
        ]
    }
    
    # Generate proposals
    proposals = await engine.reflect_and_propose(current_workflow)
    
    print(f"\n{'='*60}")
    print(f"Generated {len(proposals)} proposals")
    
    for p in proposals:
        print(f"\n  {p.id}:")
        print(f"    Type: {p.optimization_type.value}")
        print(f"    Target: {p.target_bottleneck}")
        print(f"    Expected: +{p.expected_improvement*100:.0f}%")
        print(f"    Confidence: {p.confidence*100:.0f}%")


if __name__ == "__main__":
    import asyncio
    asyncio.run(demo_meta_cognition())

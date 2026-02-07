"""
Performance Monitor - Tracks agent performance across multiple dimensions
and identifies current bottleneck limiting scale.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional
from collections import deque
import json


class DimensionType(Enum):
    """Types of performance dimensions."""
    THROUGHPUT = "throughput"  # tasks/hour
    LATENCY = "latency"  # seconds
    COST = "cost"  # USD
    ERROR_RATE = "error_rate"  # ratio 0-1
    ACCURACY = "accuracy"  # ratio 0-1
    MEMORY = "memory"  # MB
    API_RATE_LIMIT = "api_rate_limit"  # utilization ratio
    TOKEN_USAGE = "token_usage"  # tokens


@dataclass
class DimensionConfig:
    """Configuration for a performance dimension."""
    name: str
    dim_type: DimensionType
    current_value: float
    target_value: Optional[float] = None
    max_value: Optional[float] = None
    min_value: Optional[float] = None
    unit: str = ""
    weight: float = 1.0  # For multi-objective optimization
    
    def utilization(self) -> float:
        """Calculate how constrained this dimension is (0-1)."""
        if self.dim_type in [DimensionType.THROUGHPUT, DimensionType.ACCURACY]:
            # Higher is better
            if self.target_value and self.current_value:
                return 1.0 - min(self.current_value / self.target_value, 1.0)
            if self.max_value:
                return self.current_value / self.max_value
            return 0.5
        
        elif self.dim_type in [DimensionType.LATENCY, DimensionType.COST, 
                               DimensionType.ERROR_RATE, DimensionType.MEMORY,
                               DimensionType.API_RATE_LIMIT]:
            # Lower is better
            if self.max_value:
                return min(self.current_value / self.max_value, 1.0)
            if self.target_value:
                return (self.current_value - self.target_value) / self.target_value
            return 0.5
        
        elif self.dim_type == DimensionType.TOKEN_USAGE:
            # Special handling for tokens
            if self.max_value:
                return self.current_value / self.max_value
            return 0.5
        
        return 0.5


@dataclass
class PerformanceSnapshot:
    """A snapshot of performance metrics."""
    timestamp: datetime
    metrics: Dict[str, float]
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "metrics": self.metrics,
            "metadata": self.metadata
        }


class PerformanceMonitor:
    """
    Tracks agent performance across multiple dimensions.
    Identifies which dimension is currently limiting scale.
    """
    
    def __init__(
        self,
        history_size: int = 1000,
        window_minutes: int = 60
    ):
        self.history: deque = deque(maxlen=history_size)
        self.window_minutes = window_minutes
        
        # Default dimension configurations
        self.dimensions: Dict[str, DimensionConfig] = {
            "throughput": DimensionConfig(
                name="throughput",
                dim_type=DimensionType.THROUGHPUT,
                current_value=50.0,
                target_value=1000.0,  # tasks/hour
                unit="tasks/hour"
            ),
            "latency": DimensionConfig(
                name="latency",
                dim_type=DimensionType.LATENCY,
                current_value=5.0,
                max_value=10.0,  # Must stay under this
                unit="seconds"
            ),
            "cost": DimensionConfig(
                name="cost",
                dim_type=DimensionType.COST,
                current_value=0.05,
                max_value=1.0,  # $1 per 1000 tasks
                unit="USD/task"
            ),
            "error_rate": DimensionConfig(
                name="error_rate",
                dim_type=DimensionType.ERROR_RATE,
                current_value=0.02,
                max_value=0.05,  # Must stay under 5%
                unit="ratio"
            ),
            "accuracy": DimensionConfig(
                name="accuracy",
                dim_type=DimensionType.ACCURACY,
                current_value=0.85,
                target_value=0.95,  # Want >95%
                unit="ratio"
            ),
            "api_rate_limit": DimensionConfig(
                name="api_rate_limit",
                dim_type=DimensionType.API_RATE_LIMIT,
                current_value=0.0,
                max_value=0.9,  # Alert at 90%
                unit="ratio"
            ),
            "token_usage": DimensionConfig(
                name="token_usage",
                dim_type=DimensionType.TOKEN_USAGE,
                current_value=0.0,
                max_value=100000,  # Daily limit
                unit="tokens"
            ),
            "memory": DimensionConfig(
                name="memory",
                dim_type=DimensionType.MEMORY,
                current_value=256.0,
                max_value=512.0,  # MB
                unit="MB"
            )
        }
    
    def record_metrics(
        self,
        metrics: Dict[str, float],
        metadata: Dict[str, Any] = None
    ):
        """Record a new performance snapshot."""
        
        snapshot = PerformanceSnapshot(
            timestamp=datetime.now(),
            metrics=metrics,
            metadata=metadata or {}
        )
        
        self.history.append(snapshot)
        
        # Update dimension configurations
        for dim_name, value in metrics.items():
            if dim_name in self.dimensions:
                self.dimensions[dim_name].current_value = value
    
    def identify_bottleneck(self) -> Dict[str, Any]:
        """
        Identify the dimension most constraining scale.
        
        Returns:
            Dict with bottleneck information
        """
        utilizations = {}
        
        for dim_name, config in self.dimensions.items():
            util = config.utilization()
            utilizations[dim_name] = {
                "utilization": util,
                "current_value": config.current_value,
                "target_value": config.target_value,
                "max_value": config.max_value,
                "unit": config.unit
            }
        
        # Bottleneck is highest utilization
        bottleneck = max(utilizations.items(), key=lambda x: x[1]["utilization"])
        
        return {
            "bottleneck": bottleneck[0],
            "severity": bottleneck[1]["utilization"],
            "current_value": bottleneck[1]["current_value"],
            "target_value": bottleneck[1]["target_value"],
            "max_value": bottleneck[1]["max_value"],
            "unit": bottleneck[1]["unit"],
            "all_dimensions": utilizations
        }
    
    def projection_at_scale(self, multiplier: float = 10.0) -> Dict[str, Any]:
        """
        Project performance at scaled load.
        
        Args:
            multiplier: Scale factor (e.g., 10 for 10x load)
        
        Returns:
            Projected values for each dimension
        """
        projections = {}
        
        for dim_name, config in self.dimensions.items():
            current = config.current_value
            
            if dim_name == "throughput":
                # Target improvement
                projections[dim_name] = current * multiplier
            
            elif dim_name in ["latency", "error_rate"]:
                # May degrade with scale
                degradation = 1.0 + (multiplier - 1.0) * 0.1  # 10% degradation per 10x
                projections[dim_name] = current * degradation
            
            elif dim_name == "cost":
                # Linear scaling
                projections[dim_name] = current * multiplier
            
            elif dim_name == "api_rate_limit":
                # Linear utilization
                projections[dim_name] = min(current * multiplier, 1.0)
            
            elif dim_name == "memory":
                # Sub-linear growth
                growth = 1.0 + (multiplier - 1.0) * 0.5  # 50% growth per 10x
                projections[dim_name] = current * growth
            
            elif dim_name == "token_usage":
                projections[dim_name] = current * multiplier
            
            else:
                projections[dim_name] = current
        
        return projections
    
    def check_constraints(self, projections: Dict[str, float]) -> Dict[str, Any]:
        """Check if projected values violate constraints."""
        
        violations = []
        
        for dim_name, projected in projections.items():
            if dim_name not in self.dimensions:
                continue
            
            config = self.dimensions[dim_name]
            
            if config.max_value and projected > config.max_value:
                violations.append({
                    "dimension": dim_name,
                    "projected": projected,
                    "limit": config.max_value,
                    "unit": config.unit,
                    "violation": f"Exceeds max by {projected - config.max_value:.2f} {config.unit}"
                })
        
        return {
            "violations": violations,
            "is_valid": len(violations) == 0
        }
    
    def get_current_state(self) -> Dict[str, Any]:
        """Get current performance state as a dict."""
        
        bottleneck = self.identify_bottleneck()
        projections = self.projection_at_scale(10.0)
        constraints = self.check_constraints(projections)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "current_scale": {
                dim_name: {
                    "value": config.current_value,
                    "unit": config.unit,
                    "utilization": config.utilization()
                }
                for dim_name, config in self.dimensions.items()
            },
            "bottleneck": bottleneck,
            "scale_projections": {
                dim_name: {
                    "value": value,
                    "unit": self.dimensions[dim_name].unit
                }
                for dim_name, value in projections.items()
            },
            "constraint_check": constraints,
            "status": "healthy" if constraints["is_valid"] else "constrained"
        }
    
    def get_trends(self, window_minutes: int = None) -> Dict[str, Any]:
        """Analyze performance trends over time window."""
        
        window = window_minutes or self.window_minutes
        cutoff = datetime.now() - timedelta(minutes=window)
        
        window_history = [
            s for s in self.history 
            if s.timestamp >= cutoff
        ]
        
        if len(window_history) < 2:
            return {"error": "Insufficient data for trend analysis"}
        
        trends = {}
        
        for dim_name in self.dimensions.keys():
            values = [s.metrics.get(dim_name, 0) for s in window_history if dim_name in s.metrics]
            
            if len(values) < 2:
                trends[dim_name] = {"trend": "unknown", "samples": len(values)}
                continue
            
            first, last = values[0], values[-1]
            if first > 0:
                pct_change = (last - first) / first
                trend = "improving" if pct_change > 0.05 else "degrading" if pct_change < -0.05 else "stable"
            else:
                trend = "unknown"
            
            avg = sum(values) / len(values)
            trends[dim_name] = {
                "trend": trend,
                "first_value": first,
                "last_value": last,
                "change_pct": pct_change * 100 if first > 0 else 0,
                "average": avg,
                "samples": len(values)
            }
        
        return trends
    
    def summary(self) -> str:
        """Get a human-readable summary."""
        
        state = self.get_current_state()
        bottleneck = state["bottleneck"]
        
        lines = [
            f"Performance Summary ({state['timestamp']})",
            "=" * 40,
            f"Status: {state['status']}",
            "",
            f"Primary Bottleneck: {bottleneck['bottleneck']}",
            f"  Severity: {bottleneck['severity']*100:.1f}%",
            f"  Current: {bottleneck['current_value']} {bottleneck['unit']}",
            "",
            "All Dimensions:"
        ]
        
        for dim_name, info in state["current_scale"].items():
            marker = "🔴" if info["utilization"] > 0.8 else "🟡" if info["utilization"] > 0.5 else "🟢"
            lines.append(f"  {marker} {dim_name}: {info['value']:.2f} {info['unit']} ({info['utilization']*100:.0f}%)")
        
        return "\n".join(lines)


# Convenience function for quick status checks
def quick_status_check() -> str:
    """Quick status check suitable for monitoring dashboards."""
    
    monitor = PerformanceMonitor()
    
    # Simulate current state (in production, this would come from real metrics)
    monitor.record_metrics({
        "throughput": 50.0,
        "latency": 3.2,
        "cost": 0.04,
        "error_rate": 0.02,
        "accuracy": 0.87,
        "api_rate_limit": 0.45,
        "token_usage": 50000,
        "memory": 256.0
    })
    
    return monitor.summary()


if __name__ == "__main__":
    print(quick_status_check())

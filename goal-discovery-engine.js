/**
 * Autonomous Goal Discovery Engine
 * 
 * Proactively identifies valuable goals from user behavior, error patterns,
 * and feedback signals without human intervention.
 */

const fs = require('fs');
const path = require('path');

class GoalDiscoveryEngine {
  constructor(options = {}) {
    this.memoryDir = options.memoryDir || path.join(process.cwd(), 'memory');
    this.goalsFile = options.goalsFile || path.join(this.memoryDir, 'discovered-goals.json');
    this.learningBudget = options.learningBudget || 100; // Points per cycle
    this.minImpactScore = options.minImpactScore || 5;  // Minimum to be actionable
    
    this.goals = this.loadGoals();
    this.signals = [];
    this.cycleCount = 0;
  }

  /**
   * Load existing goals from storage
   */
  loadGoals() {
    try {
      if (fs.existsSync(this.goalsFile)) {
        const data = JSON.parse(fs.readFileSync(this.goalsFile, 'utf-8'));
        return data.goals || [];
      }
    } catch (e) {
      console.error('Error loading goals:', e.message);
    }
    return [];
  }

  /**
   * Save goals to storage
   */
  saveGoals() {
    try {
      const dir = path.dirname(this.goalsFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.goalsFile, JSON.stringify({
        goals: this.goals,
        lastUpdated: new Date().toISOString(),
        totalSignalsProcessed: this.signals.length
      }, null, 2));
    } catch (e) {
      console.error('Error saving goals:', e.message);
    }
  }

  /**
   * === OPPORTUNITY SCANNER ===
   * Monitor and analyze input signals for opportunities
   */

  /**
   * Ingest a signal from any source
   * @param {Object} signal - Signal object with type, content, and metadata
   */
  ingestSignal(signal) {
    const normalizedSignal = {
      id: signal.id || `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: signal.type, // 'transcript', 'error', 'heartbeat', 'feedback'
      content: signal.content,
      timestamp: signal.timestamp || new Date().toISOString(),
      source: signal.source || 'unknown',
      priority: signal.priority || 1,
      processed: false
    };
    
    this.signals.push(normalizedSignal);
    return normalizedSignal;
  }

  /**
   * Process all pending signals to discover opportunities
   */
  scanOpportunities() {
    const opportunities = [];
    const signalGroups = this.groupSignalsByType();
    
    // Pattern 1: Recurring errors (error signals)
    if (signalGroups.error && signalGroups.error.length > 0) {
      const errorPatterns = this.findRecurringPatterns(signalGroups.error);
      errorPatterns.forEach(pattern => {
        opportunities.push({
          type: 'error_resolution',
          pattern,
          impact: this.calculateImpact('error', pattern),
          source: 'opportunity_scanner'
        });
      });
    }

    // Pattern 2: User struggles (transcript analysis)
    if (signalGroups.transcript && signalGroups.transcript.length > 0) {
      const struggles = this.analyzeStruggles(signalGroups.transcript);
      struggles.forEach(struggle => {
        opportunities.push({
          type: 'capability_gap',
          detail: struggle,
          impact: this.calculateImpact('struggle', struggle),
          source: 'opportunity_scanner'
        });
      });
    }

    // Pattern 3: Heartbeat patterns (proactive checks)
    if (signalGroups.heartbeat && signalGroups.heartbeat.length > 0) {
      const proactiveNeeds = this.analyzeHeartbeatPatterns(signalGroups.heartbeat);
      proactiveNeeds.forEach(need => {
        opportunities.push({
          type: 'proactive_capability',
          detail: need,
          impact: this.calculateImpact('heartbeat', need),
          source: 'opportunity_scanner'
        });
      });
    }

    // Pattern 4: Feedback signals
    if (signalGroups.feedback && signalGroups.feedback.length > 0) {
      const feedbackInsights = this.analyzeFeedback(signalGroups.feedback);
      feedbackInsights.forEach(insight => {
        opportunities.push({
          type: 'quality_improvement',
          detail: insight,
          impact: this.calculateImpact('feedback', insight),
          source: 'opportunity_scanner'
        });
      });
    }

    return opportunities.filter(o => o.impact.score >= this.minImpactScore);
  }

  /**
   * Group signals by type for analysis
   */
  groupSignalsByType() {
    const groups = {};
    this.signals.forEach(signal => {
      if (!groups[signal.type]) groups[signal.type] = [];
      groups[signal.type].push(signal);
    });
    return groups;
  }

  /**
   * Find recurring patterns in signals
   */
  findRecurringPatterns(signals) {
    const patterns = {};
    signals.forEach(signal => {
      const key = signal.content?.substring(0, 100) || 'unknown';
      if (!patterns[key]) patterns[key] = { count: 0, signals: [] };
      patterns[key].count++;
      patterns[key].signals.push(signal);
    });

    return Object.entries(patterns)
      .filter(([_, data]) => data.count >= 2)
      .map(([pattern, data]) => ({
        pattern,
        frequency: data.count,
        severity: signals.find(s => s.content === pattern)?.priority || 1
      }));
  }

  /**
   * Analyze user struggles from transcripts
   */
  analyzeStruggles(transcripts) {
    const struggleIndicators = [
      'help', 'how do i', 'what is', 'stuck', 'not working',
      'failed', 'error', 'can\'t', 'unable', 'doesn\'t work',
      'frustrated', 'confused', 'don\'t understand'
    ];

    const struggles = [];
    transcripts.forEach(transcript => {
      const content = (transcript.content || '').toLowerCase();
      struggleIndicators.forEach(indicator => {
        if (content.includes(indicator)) {
          struggles.push({
            indicator,
            context: transcript.content?.substring(0, 200),
            timestamp: transcript.timestamp
          });
        }
      });
    });

    return struggles;
  }

  /**
   * Analyze heartbeat patterns for proactive needs
   */
  analyzeHeartbeatPatterns(heartbeats) {
    const needs = [];
    heartbeats.forEach(hb => {
      const content = hb.content || {};
      if (content.checkedItems) {
        content.checkedItems.forEach(item => {
          needs.push({
            type: 'proactive_check',
            item: item.name || item,
            result: item.result,
            timestamp: hb.timestamp
          });
        });
      }
    });
    return needs;
  }

  /**
   * Analyze feedback signals
   */
  analyzeFeedback(feedback) {
    return feedback.map(fb => ({
      sentiment: fb.content?.sentiment || 'neutral',
      topic: fb.content?.topic || 'general',
      explicit: fb.content?.explicit || false,
      timestamp: fb.timestamp
    }));
  }

  /**
   * Calculate impact score for an opportunity
   */
  calculateImpact(source, data) {
    let baseScore = 1;
    let priority = 1;
    let frequency = 1;

    switch (source) {
      case 'error':
        baseScore = 8;
        priority = data.severity || 1;
        frequency = Math.min(data.frequency || 1, 5);
        break;
      case 'struggle':
        baseScore = 6;
        priority = 1;
        frequency = 1;
        break;
      case 'heartbeat':
        baseScore = 5;
        priority = 1;
        frequency = 1;
        break;
      case 'feedback':
        baseScore = 7;
        priority = data.sentiment === 'negative' ? 2 : 1;
        frequency = 1;
        break;
      default:
        baseScore = 3;
    }

    return {
      score: Math.min(baseScore * priority * frequency, 10),
      priority,
      frequency
    };
  }

  /**
   * === GOAL PROPOSER ===
   * Generate and score candidate goals
   */

  /**
   * Generate candidate goals from opportunities
   */
  generateCandidateGoals(opportunities) {
    const candidates = [];

    opportunities.forEach(opp => {
      const goal = this.createGoalFromOpportunity(opp);
      if (goal) candidates.push(goal);
    });

    // Add proactive goals based on user values (from GOALS.md)
    const proactiveGoals = this.generateProactiveGoals();
    candidates.push(...proactiveGoals);

    return candidates;
  }

  /**
   * Create a goal from an opportunity
   */
  createGoalFromOpportunity(opp) {
    const goalTemplates = {
      error_resolution: {
        title: `Resolve recurring error: ${opp.pattern?.pattern?.substring(0, 50) || 'unknown'}`,
        description: `Address the ${opp.pattern?.frequency || 1}x recurring error pattern detected in system logs.`,
        category: 'stability',
        targetMetric: 'error_frequency_reduction',
        targetValue: 0
      },
      capability_gap: {
        title: `Add capability: ${opp.detail?.indicator || 'unknown'}`,
        description: `User struggled with "${opp.detail?.context?.substring(0, 100)}" - consider adding this capability.`,
        category: 'capability',
        targetMetric: 'user_satisfaction',
        targetValue: 1
      },
      proactive_capability: {
        title: `Enable proactive check: ${opp.detail?.item || 'unknown'}`,
        description: `Heartbeat detected value in proactively checking: ${opp.detail?.item}`,
        category: 'proactive',
        targetMetric: 'proactive_success_rate',
        targetValue: 0.9
      },
      quality_improvement: {
        title: `Improve: ${opp.detail?.topic || 'general'}`,
        description: `Feedback received: ${opp.detail?.sentiment} sentiment on ${opp.detail?.topic}`,
        category: 'quality',
        targetMetric: 'feedback_sentiment',
        targetValue: 1
      }
    };

    const template = goalTemplates[opp.type];
    if (!template) return null;

    return {
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...template,
      impactScore: opp.impact.score,
      status: 'proposed',
      createdAt: new Date().toISOString(),
      sourceSignal: opp.type,
      estimatedEffort: this.estimateEffort(opp),
      assignedBudget: 0
    };
  }

  /**
   * Generate proactive goals aligned with user values
   */
  generateProactiveGoals() {
    return [
      {
        id: `goal_${Date.now()}_proactive_1`,
        title: 'Improve memory retrieval accuracy',
        description: 'Enhance context recall based on user interactions',
        category: 'memory',
        impactScore: 7,
        status: 'proposed',
        createdAt: new Date().toISOString(),
        sourceSignal: 'proactive',
        estimatedEffort: 'medium',
        assignedBudget: 0
      },
      {
        id: `goal_${Date.now()}_proactive_2`,
        title: 'Reduce proactive check latency',
        description: 'Optimize heartbeat and proactive checks for faster response',
        category: 'performance',
        impactScore: 6,
        status: 'proposed',
        createdAt: new Date().toISOString(),
        sourceSignal: 'proactive',
        estimatedEffort: 'low',
        assignedBudget: 0
      }
    ];
  }

  /**
   * Estimate effort for a goal
   */
  estimateEffort(opp) {
    const effortMap = {
      error_resolution: 'medium',
      capability_gap: 'high',
      proactive_capability: 'medium',
      quality_improvement: 'low'
    };
    return effortMap[opp.type] || 'unknown';
  }

  /**
   * Score and rank goals by potential impact
   */
  scoreGoals(goals) {
    return goals.map(goal => {
      const userValues = this.loadUserValues();
      const alignmentScore = this.calculateAlignment(goal, userValues);
      
      return {
        ...goal,
        totalScore: (goal.impactScore * 0.6) + (alignmentScore * 0.4),
        alignmentScore,
        priority: this.calculatePriority(goal)
      };
    }).sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Load user values (from GOALS.md or config)
   */
  loadUserValues() {
    const goalsFile = path.join(this.memoryDir || process.cwd(), 'GOALS.md');
    try {
      if (fs.existsSync(goalsFile)) {
        // Extract key values from GOALS.md
        return ['memory', 'proactive', 'self_awareness', 'learning'];
      }
    } catch (e) {}
    return ['memory', 'capability', 'performance'];
  }

  /**
   * Calculate alignment with user values
   */
  calculateAlignment(goal, userValues) {
    const goalCategory = goal.category?.toLowerCase() || '';
    const alignment = userValues.findIndex(v => goalCategory.includes(v));
    return alignment >= 0 ? (userValues.length - alignment) : 1;
  }

  /**
   * Calculate priority level
   */
  calculatePriority(goal) {
    if (goal.impactScore >= 8) return 'critical';
    if (goal.impactScore >= 6) return 'high';
    if (goal.impactScore >= 4) return 'medium';
    return 'low';
  }

  /**
   * === SELF-DIRECTION MODULE ===
   * Autonomous goal selection and progress tracking
   */

  /**
   * Run a full discovery cycle
   */
  runDiscoveryCycle() {
    this.cycleCount++;
    console.log(`\n🔍 Running Goal Discovery Cycle #${this.cycleCount}`);
    
    // Step 1: Scan for opportunities
    const opportunities = this.scanOpportunities();
    console.log(`   Found ${opportunities.length} opportunities`);
    
    // Step 2: Generate candidate goals
    const candidates = this.generateCandidateGoals(opportunities);
    console.log(`   Generated ${candidates.length} candidate goals`);
    
    // Step 3: Score and rank goals
    const rankedGoals = this.scoreGoals(candidates);
    console.log(`   Ranked ${rankedGoals.length} goals by impact`);
    
    // Step 4: Select goals within budget
    const selectedGoals = this.selectGoals(rankedGoals);
    console.log(`   Selected ${selectedGoals.length} goals for execution`);
    
    // Step 5: Update goal state
    this.updateGoalState(selectedGoals);
    
    // Step 6: Save and return results
    this.saveGoals();
    
    return {
      cycle: this.cycleCount,
      opportunitiesFound: opportunities.length,
      candidatesGenerated: candidates.length,
      goalsSelected: selectedGoals.length,
      activeGoals: this.goals.filter(g => g.status === 'active'),
      proposedGoals: this.goals.filter(g => g.status === 'proposed')
    };
  }

  /**
   * Select goals within learning budget
   */
  selectGoals(rankedGoals) {
    const selected = [];
    let remainingBudget = this.learningBudget;
    
    for (const goal of rankedGoals) {
      const effortCost = this.getEffortCost(goal.estimatedEffort);
      
      if (remainingBudget >= effortCost) {
        goal.status = 'active';
        goal.assignedBudget = effortCost;
        goal.activatedAt = new Date().toISOString();
        selected.push(goal);
        remainingBudget -= effortCost;
      } else {
        goal.status = 'proposed';
        goal.assignedBudget = 0;
      }
    }
    
    return selected;
  }

  /**
   * Get cost for effort level
   */
  getEffortCost(effort) {
    const costs = { low: 20, medium: 40, high: 80 };
    return costs[effort] || 40;
  }

  /**
   * Update goal state with new selections
   */
  updateGoalState(newGoals) {
    const existingIds = new Set(this.goals.map(g => g.id));
    
    newGoals.forEach(goal => {
      if (existingIds.has(goal.id)) {
        // Update existing goal
        const index = this.goals.findIndex(g => g.id === goal.id);
        this.goals[index] = { ...this.goals[index], ...goal };
      } else {
        // Add new goal
        this.goals.push(goal);
      }
    });
  }

  /**
   * Track progress on a goal
   */
  trackGoalProgress(goalId, progress) {
    const goal = this.goals.find(g => g.id === goalId);
    if (goal) {
      if (!goal.progress) goal.progress = [];
      goal.progress.push({
        timestamp: new Date().toISOString(),
        ...progress
      });
      
      // Check if goal is complete
      if (progress.status === 'complete') {
        goal.status = 'completed';
        goal.completedAt = new Date().toISOString();
      }
      
      this.saveGoals();
    }
    return goal;
  }

  /**
   * Get summary of all goals
   */
  getSummary() {
    return {
      totalGoals: this.goals.length,
      activeGoals: this.goals.filter(g => g.status === 'active').length,
      proposedGoals: this.goals.filter(g => g.status === 'proposed').length,
      completedGoals: this.goals.filter(g => g.status === 'completed').length,
      cyclesRun: this.cycleCount,
      learningBudgetRemaining: this.learningBudget - 
        this.goals.filter(g => g.status === 'active').reduce((sum, g) => sum + (g.assignedBudget || 0), 0)
    };
  }
}

// Export for use as module
module.exports = GoalDiscoveryEngine;

// CLI interface
if (require.main === module) {
  const engine = new GoalDiscoveryEngine();
  
  console.log('🎯 Autonomous Goal Discovery Engine');
  console.log('====================================\n');
  
  // Run discovery cycle
  const results = engine.runDiscoveryCycle();
  
  console.log('\n📊 Summary:');
  console.log(JSON.stringify(results, null, 2));
  
  console.log('\n📋 All Goals:');
  engine.goals.forEach(goal => {
    console.log(`  [${goal.status.toUpperCase()}] ${goal.title} (Score: ${goal.totalScore?.toFixed(1) || goal.impactScore})`);
  });
}

/**
 * Meta-Learning Engine
 * Analyzes the agent's own learning patterns and optimizes future performance.
 * 
 * Features:
 * - Performance Analyzer: Track successful vs failed tool calls, response quality
 * - Strategy Optimizer: Learn which tools work best for which tasks
 * - Self-Modification Loop: Detect gaps, propose improvements, log learnings
 */

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, 'memory');
const META_LEARNING_FILE = path.join(MEMORY_DIR, 'meta-learning.json');

class MetaLearningEngine {
    constructor() {
        this.memory = this.loadMemory();
        this.currentSession = {
            id: Date.now(),
            startTime: new Date().toISOString(),
            interactions: [],
            toolCalls: [],
            predictions: []
        };
    }

    /**
     * Load existing meta-learning memory or initialize
     */
    loadMemory() {
        try {
            if (fs.existsSync(META_LEARNING_FILE)) {
                const data = fs.readFileSync(META_LEARNING_FILE, 'utf-8');
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('Failed to load meta-learning memory:', e.message);
        }
        return this.initializeMemory();
    }

    /**
     * Initialize new meta-learning memory structure
     */
    initializeMemory() {
        const initialMemory = {
            version: '1.0.0',
            created: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            totalSessions: 0,
            totalInteractions: 0,
            toolMetrics: {},
            heuristics: [],
            learnedPatterns: [],
            capabilityGaps: [],
            improvementProposals: [],
            responseQualityHistory: [],
            predictionHistory: [],
            contextSwitchCosts: [],
            sessionSummaries: []
        };
        this.saveMemory(initialMemory);
        return initialMemory;
    }

    /**
     * Save memory to disk
     */
    saveMemory(data = null) {
        const memoryToSave = data || this.memory;
        memoryToSave.lastUpdated = new Date().toISOString();
        if (!fs.existsSync(MEMORY_DIR)) {
            fs.mkdirSync(MEMORY_DIR, { recursive: true });
        }
        fs.writeFileSync(META_LEARNING_FILE, JSON.stringify(memoryToSave, null, 2));
    }

    /**
     * Record a tool call with its outcome
     */
    recordToolCall(toolName, success, duration, metadata = {}) {
        const toolCall = {
            timestamp: new Date().toISOString(),
            tool: toolName,
            success,
            duration,
            metadata
        };

        this.currentSession.toolCalls.push(toolCall);

        // Initialize or update tool metrics
        if (!this.memory.toolMetrics[toolName]) {
            this.memory.toolMetrics[toolName] = {
                totalCalls: 0,
                successes: 0,
                failures: 0,
                totalDuration: 0,
                avgDuration: 0,
                successRate: 0,
                recentFailures: [],
                patterns: {}
            };
        }

        const metrics = this.memory.toolMetrics[toolName];
        metrics.totalCalls++;
        if (success) {
            metrics.successes++;
        } else {
            metrics.failures++;
            metrics.recentFailures.push({
                timestamp: new Date().toISOString(),
                error: metadata.error || 'Unknown error'
            });
            // Keep only last 10 failures
            if (metrics.recentFailures.length > 10) {
                metrics.recentFailures.shift();
            }
        }
        metrics.totalDuration += duration;
        metrics.avgDuration = metrics.totalDuration / metrics.totalCalls;
        metrics.successRate = (metrics.successes / metrics.totalCalls) * 100;

        this.saveMemory();
        return metrics;
    }

    /**
     * Record user satisfaction / response quality signal
     */
    recordResponseQuality(qualityScore, context = {}) {
        // qualityScore: 1-5 scale (1=poor, 5=excellent)
        const qualityRecord = {
            timestamp: new Date().toISOString(),
            score: qualityScore,
            context
        };

        this.currentSession.interactions.push({
            type: 'response',
            quality: qualityScore,
            ...context
        });

        this.memory.totalInteractions++;
        this.memory.responseQualityHistory.push(qualityRecord);

        // Keep only last 100 quality records
        if (this.memory.responseQualityHistory.length > 100) {
            this.memory.responseQualityHistory.shift();
        }

        // Calculate average quality
        const recentQualities = this.memory.responseQualityHistory.slice(-20);
        const avgQuality = recentQualities.reduce((sum, q) => sum + q.score, 0) / recentQualities.length;

        this.saveMemory();
        return { avgQuality, totalInteractions: this.memory.totalInteractions };
    }

    /**
     * Record a prediction about user needs
     */
    recordPrediction(prediction, wasAccurate) {
        const predictionRecord = {
            timestamp: new Date().toISOString(),
            prediction,
            wasAccurate
        };

        this.currentSession.predictions.push(predictionRecord);
        this.memory.predictionHistory.push(predictionRecord);

        // Keep only last 50 predictions
        if (this.memory.predictionHistory.length > 50) {
            this.memory.predictionHistory.shift();
        }

        // Calculate prediction accuracy
        const recentPredictions = this.memory.predictionHistory.slice(-20);
        const accurateCount = recentPredictions.filter(p => p.wasAccurate).length;
        const predictionAccuracy = (accurateCount / recentPredictions.length) * 100;

        this.saveMemory();
        return { predictionAccuracy, totalPredictions: this.memory.predictionHistory.length };
    }

    /**
     * Learn heuristic from interaction pattern
     */
    learnHeuristic(pattern, heuristic, confidence) {
        // Check if similar heuristic already exists
        const existing = this.memory.heuristics.find(h => 
            h.pattern === pattern && h.heuristic === heuristic
        );

        if (existing) {
            existing.confidence = Math.min(100, existing.confidence + confidence * 0.1);
            existing.timesApplied = (existing.timesApplied || 0) + 1;
            existing.lastApplied = new Date().toISOString();
        } else {
            this.memory.heuristics.push({
                pattern,
                heuristic,
                confidence,
                timesApplied: 1,
                created: new Date().toISOString(),
                lastApplied: new Date().toISOString(),
                successRate: 0 // Will be updated
            });
        }

        this.saveMemory();
    }

    /**
     * Build a learned heuristic from tool usage patterns
     */
    buildHeuristicFromPattern(taskType, toolName, successPattern) {
        const heuristic = {
            taskType,
            recommendedTool: toolName,
            conditions: successPattern.conditions || [],
            successRate: successPattern.rate || 0,
            avgDuration: successPattern.avgDuration || 0,
            confidence: Math.min(100, successPattern.rate * 100),
            reasoning: successPattern.reasoning || `Tool ${toolName} had ${successPattern.rate * 100}% success rate for ${taskType}`
        };

        this.memory.learnedPatterns.push({
            ...heuristic,
            timestamp: new Date().toISOString()
        });

        this.saveMemory();
        return heuristic;
    }

    /**
     * Detect capability gaps based on failures
     */
    detectCapabilityGap(toolName, failurePattern) {
        const gap = {
            tool: toolName,
            failurePattern,
            detected: new Date().toISOString(),
            severity: this.calculateGapSeverity(failurePattern),
            proposedSolution: null
        };

        // Check if similar gap already exists
        const exists = this.memory.capabilityGaps.find(g => 
            g.tool === toolName && g.failurePattern === failurePattern
        );

        if (!exists) {
            this.memory.capabilityGaps.push(gap);
            this.saveMemory();
        }

        return gap;
    }

    /**
     * Calculate severity of a capability gap
     */
    calculateGapSeverity(failurePattern) {
        if (failurePattern.includes('timeout') || failurePattern.includes('critical')) {
            return 'high';
        } else if (failurePattern.includes('quality') || failurePattern.includes('slow')) {
            return 'medium';
        }
        return 'low';
    }

    /**
     * Propose an improvement to AGENTS.md or skills
     */
    proposeImprovement(type, description, rationale, impact) {
        const proposal = {
            id: `proposal-${Date.now()}`,
            type, // 'AGENTS.md', 'skill', 'tool', 'workflow'
            description,
            rationale,
            impact, // 'high', 'medium', 'low'
            status: 'pending',
            created: new Date().toISOString()
        };

        this.memory.improvementProposals.push(proposal);
        this.saveMemory();
        return proposal;
    }

    /**
     * Track context switching cost
     */
    trackContextSwitch(fromContext, toContext, cost) {
        const switchRecord = {
            timestamp: new Date().toISOString(),
            from: fromContext,
            to: toContext,
            cost // in milliseconds
        };

        this.memory.contextSwitchCosts.push(switchRecord);

        // Keep only last 50 records
        if (this.memory.contextSwitchCosts.length > 50) {
            this.memory.contextSwitchCosts.shift();
        }

        // Calculate average context switch cost
        const recentSwitches = this.memory.contextSwitchCosts.slice(-10);
        const avgCost = recentSwitches.reduce((sum, s) => sum + s.cost, 0) / recentSwitches.length;

        return { avgCost, totalSwitches: this.memory.contextSwitchCosts.length };
    }

    /**
     * End current session and generate summary
     */
    endSession() {
        this.currentSession.endTime = new Date().toISOString();
        this.currentSession.duration = 
            new Date(this.currentSession.endTime) - new Date(this.currentSession.startTime);

        // Generate session summary
        const sessionSummary = {
            sessionId: this.currentSession.id,
            startTime: this.currentSession.startTime,
            endTime: this.currentSession.endTime,
            duration: this.currentSession.duration,
            toolCallCount: this.currentSession.toolCalls.length,
            interactionCount: this.currentSession.interactions.length,
            predictionCount: this.currentSession.predictions.length,
            toolSuccessRate: this.calculateSessionToolSuccessRate(),
            qualityScore: this.calculateSessionQuality()
        };

        this.memory.sessionSummaries.push(sessionSummary);
        this.memory.totalSessions++;

        // Keep only last 20 session summaries
        if (this.memory.sessionSummaries.length > 20) {
            this.memory.sessionSummaries.shift();
        }

        this.saveMemory();
        return sessionSummary;
    }

    /**
     * Calculate tool success rate for current session
     */
    calculateSessionToolSuccessRate() {
        if (this.currentSession.toolCalls.length === 0) return 100;
        const successes = this.currentSession.toolCalls.filter(c => c.success).length;
        return (successes / this.currentSession.toolCalls.length) * 100;
    }

    /**
     * Calculate average quality for current session
     */
    calculateSessionQuality() {
        if (this.currentSession.interactions.length === 0) return 0;
        const qualities = this.currentSession.interactions
            .filter(i => i.quality !== undefined)
            .map(i => i.quality);
        if (qualities.length === 0) return 0;
        return qualities.reduce((a, b) => a + b, 0) / qualities.length;
    }

    /**
     * Get comprehensive performance report
     */
    getPerformanceReport() {
        const toolSuccessRates = {};
        for (const [tool, metrics] of Object.entries(this.memory.toolMetrics)) {
            toolSuccessRates[tool] = {
                successRate: metrics.successRate.toFixed(2),
                avgDuration: metrics.avgDuration.toFixed(2),
                totalCalls: metrics.totalCalls
            };
        }

        const recentQualities = this.memory.responseQualityHistory.slice(-20);
        const avgQuality = recentQualities.length > 0
            ? (recentQualities.reduce((sum, q) => sum + q.score, 0) / recentQualities.length).toFixed(2)
            : 0;

        const recentPredictions = this.memory.predictionHistory.slice(-20);
        const predictionAccuracy = recentPredictions.length > 0
            ? ((recentPredictions.filter(p => p.wasAccurate).length / recentPredictions.length) * 100).toFixed(2)
            : 0;

        const recentSwitches = this.memory.contextSwitchCosts.slice(-10);
        const avgContextSwitchCost = recentSwitches.length > 0
            ? (recentSwitches.reduce((sum, s) => sum + s.cost, 0) / recentSwitches.length).toFixed(2)
            : 0;

        return {
            overview: {
                totalSessions: this.memory.totalSessions,
                totalInteractions: this.memory.totalInteractions,
                totalToolCalls: Object.values(this.memory.toolMetrics).reduce((sum, m) => sum + m.totalCalls, 0),
                avgResponseQuality: avgQuality,
                predictionAccuracy,
                avgContextSwitchCost: avgContextSwitchCost
            },
            toolMetrics: toolSuccessRates,
            heuristicsCount: this.memory.heuristics.length,
            patternsCount: this.memory.learnedPatterns.length,
            gapsCount: this.memory.capabilityGaps.length,
            proposalsCount: this.memory.improvementProposals.filter(p => p.status === 'pending').length
        };
    }

    /**
     * Get recommendations for improvement
     */
    getRecommendations() {
        const recommendations = [];

        // Low-performing tools
        for (const [tool, metrics] of Object.entries(this.memory.toolMetrics)) {
            if (metrics.successRate < 70 && metrics.totalCalls > 5) {
                recommendations.push({
                    type: 'tool',
                    priority: 'high',
                    message: `Tool "${tool}" has ${metrics.successRate.toFixed(1)}% success rate (below 70%)`,
                    suggestion: 'Review recent failures and consider alternative approach'
                });
            }
        }

        // Low-quality interactions
        const recentQualities = this.memory.responseQualityHistory.slice(-20);
        if (recentQualities.length > 0) {
            const avgQuality = recentQualities.reduce((sum, q) => sum + q.score, 0) / recentQualities.length;
            if (avgQuality < 3) {
                recommendations.push({
                    type: 'quality',
                    priority: 'high',
                    message: `Average response quality is ${avgQuality.toFixed(1)}/5 (below 3)`,
                    suggestion: 'Review recent interactions for improvement patterns'
                });
            }
        }

        // Low prediction accuracy
        const recentPredictions = this.memory.predictionHistory.slice(-20);
        if (recentPredictions.length >= 10) {
            const accuracy = recentPredictions.filter(p => p.wasAccurate).length / recentPredictions.length;
            if (accuracy < 0.5) {
                recommendations.push({
                    type: 'prediction',
                    priority: 'medium',
                    message: `Prediction accuracy is ${(accuracy * 100).toFixed(1)}% (below 50%)`,
                    suggestion: 'Pay more attention to user patterns and context'
                });
            }
        }

        return recommendations;
    }

    /**
     * Export heuristics for use by other modules
     */
    exportHeuristics() {
        return this.memory.heuristics.map(h => ({
            pattern: h.pattern,
            heuristic: h.heuristic,
            confidence: h.confidence,
            reasoning: h.reasoning
        }));
    }
}

// Export for use in other modules
module.exports = { MetaLearningEngine };

// CLI interface for testing
if (require.main === module) {
    console.log('Meta-Learning Engine v1.0.0\n');

    const engine = new MetaLearningEngine();

    // Demo: Record some tool calls
    console.log('Recording demo tool calls...');
    engine.recordToolCall('read', true, 45, { fileSize: 'small' });
    engine.recordToolCall('write', true, 120, { linesWritten: 50 });
    engine.recordToolCall('exec', false, 5000, { error: 'Command not found' });
    engine.recordToolCall('read', true, 38, { fileSize: 'small' });
    engine.recordToolCall('web_search', true, 2500, { resultsCount: 5 });

    // Demo: Record response quality
    console.log('Recording demo response qualities...');
    engine.recordResponseQuality(5, { task: 'file_read' });
    engine.recordResponseQuality(4, { task: 'file_write' });
    engine.recordResponseQuality(2, { task: 'exec_failed' });
    engine.recordResponseQuality(5, { task: 'web_search' });

    // Demo: Record predictions
    console.log('Recording demo predictions...');
    engine.recordPrediction('user will ask about files', true);
    engine.recordPrediction('user will need web search', true);
    engine.recordPrediction('user will run exec command', false);

    // Demo: Build heuristics
    console.log('Building demo heuristics...');
    engine.buildHeuristicFromPattern('file_operations', 'read', {
        rate: 1.0,
        avgDuration: 40,
        reasoning: 'read tool has 100% success for small files'
    });
    engine.buildHeuristicFromPattern('information_lookup', 'web_search', {
        rate: 1.0,
        avgDuration: 2500,
        reasoning: 'web_search found relevant results'
    });

    // Demo: Detect capability gap
    console.log('Detecting capability gaps...');
    engine.detectCapabilityGap('exec', 'Command not found - tool limitation');

    // Demo: Propose improvement
    console.log('Proposing improvements...');
    engine.proposeImprovement(
        'AGENTS.md',
        'Add error handling guidelines for exec failures',
        'exec tool has 33% failure rate in current session',
        'high'
    );

    // Demo: Track context switches
    console.log('Tracking context switches...');
    engine.trackContextSwitch('file_operations', 'web_search', 150);
    engine.trackContextSwitch('web_search', 'analysis', 200);

    // Get performance report
    console.log('\n--- Performance Report ---');
    const report = engine.getPerformanceReport();
    console.log(JSON.stringify(report, null, 2));

    // Get recommendations
    console.log('\n--- Recommendations ---');
    const recommendations = engine.getRecommendations();
    recommendations.forEach(r => console.log(`[${r.priority.toUpperCase()}] ${r.message}`));

    // End session
    console.log('\nEnding session...');
    const summary = engine.endSession();
    console.log('Session summary:', JSON.stringify(summary, null, 2));

    console.log('\n✅ Meta-Learning Engine test completed!');
    console.log(`📁 Memory saved to: ${META_LEARNING_FILE}`);
}

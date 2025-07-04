/**
 * @fileoverview Main exports for evolutionary testing system
 * 
 * Task-based approach (current):
 * - TaskBasedRunner: Main runner for Claude Code orchestration
 * - PatternAnalyzer: Analyzes patterns in Task agent results
 * - ClaudeAnalyzer: Formats patterns for Claude Code analysis
 */

export * from './types.js';

// Task-based approach (current implementation)
export { TaskBasedRunner, createTaskBasedRunner } from './taskBasedRunner.js';
export { ClaudeAnalyzer } from './claudeAnalyzer.js';

// Pattern analysis and improvement
export { PatternAnalyzer } from './patternAnalyzer.js';
export { PatternPresenter } from './patternPresenter.js';
export { ImprovementManager } from './improvementManager.js';
export { ToolModifier } from './toolModifier.js';

// Supporting utilities
export { GitManager } from './gitManager.js';
export { RegressionTester } from './regressionTester.js';
export { EvolutionMonitor } from './evolutionMonitor.js';
export { getMcpBridge, McpBridge } from './mcpBridge.js';
export { TelemetryPersistence } from '../../tools/telemetryPersistence.js';
export { StatisticalAnalysis } from './statisticalAnalysis.js';

// Configuration
export { getConfig, loadConfigFromEnv, DEFAULT_CONFIG } from './config.js';
export type { EvolutionTestConfig } from './config.js';
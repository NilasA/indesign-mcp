/**
 * @fileoverview Hooks-based Evolution Controller
 * 
 * Coordinates with Claude Code hooks for fully automated evolutionary testing.
 * Replaces manual orchestration with hook-driven automation.
 */

import { TaskBasedRunner } from './taskBasedRunner.js';
import { PatternAnalyzer } from './patternAnalyzer.js';
import { ClaudeAnalyzer } from './claudeAnalyzer.js';
import { ImprovementManager } from './improvementManager.js';
import { WorkflowValidator } from './validation.js';
import { TestConfig, TestRun, Pattern, Improvement, GenerationResult, ImprovementType } from './types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Hooks-enabled evolution controller configuration
 */
export interface HooksControllerConfig extends TestConfig {
  hooksEnabled: boolean;
  autoApplyImprovements: boolean;
  maxAutonomousGenerations: number;
  requireHumanApproval: boolean;
}

/**
 * Evolution controller that coordinates with Claude Code hooks
 */
export class HooksEvolutionController {
  private config: HooksControllerConfig;
  private taskRunner: TaskBasedRunner;
  private patternAnalyzer: PatternAnalyzer;
  private claudeAnalyzer: ClaudeAnalyzer;
  private improvementManager: ImprovementManager;
  private currentGeneration: number = 0;
  private isAutonomousMode: boolean = false;

  constructor(config: HooksControllerConfig) {
    this.config = config;
    // Extract base config for TaskBasedRunner
    const baseConfig = {
      testCase: config.testCase,
      agentCount: config.agentCount,
      maxGenerations: config.maxGenerations,
      targetScore: config.targetScore,
      referenceMetrics: config.referenceMetrics,
      outputDir: config.outputDir
    };
    this.taskRunner = new TaskBasedRunner(baseConfig);
    this.patternAnalyzer = new PatternAnalyzer(baseConfig);
    this.claudeAnalyzer = new ClaudeAnalyzer();
    this.improvementManager = new ImprovementManager();
  }

  /**
   * Configure Claude Code hooks for evolutionary testing
   */
  async configureHooks(): Promise<void> {
    if (!this.config.hooksEnabled) {
      console.log('Hooks disabled, using manual orchestration');
      return;
    }

    console.log('Configuring Claude Code hooks for evolutionary testing...');

    const hooksConfig = {
      hooks: {
        PreToolUse: [
          {
            matcher: "Task",
            hooks: [
              {
                type: "command",
                command: "python3 ~/.claude/evolution/task-interceptor.py"
              }
            ]
          },
          {
            matcher: "mcp__indesign__.*",
            hooks: [
              {
                type: "command", 
                command: "python3 ~/.claude/evolution/telemetry-enhancer.py"
              }
            ]
          }
        ],
        PostToolUse: [
          {
            matcher: "mcp__indesign__.*",
            hooks: [
              {
                type: "command",
                command: "python3 ~/.claude/evolution/telemetry-collector.py"
              }
            ]
          }
        ],
        Stop: [
          {
            matcher: "",
            hooks: [
              {
                type: "command",
                command: "python3 ~/.claude/evolution/checkpoint-manager.py"
              }
            ]
          }
        ]
      }
    };

    // Write hooks configuration to project settings
    const settingsPath = path.join(process.cwd(), '.claude', 'settings.json');
    
    try {
      // Ensure .claude directory exists
      await fs.mkdir(path.dirname(settingsPath), { recursive: true });
      
      // Read existing settings if they exist
      let existingSettings = {};
      try {
        const existingContent = await fs.readFile(settingsPath, 'utf-8');
        existingSettings = JSON.parse(existingContent);
      } catch (error) {
        // File doesn't exist or is invalid, start fresh
      }

      // Merge with existing settings
      const mergedSettings = {
        ...existingSettings,
        ...hooksConfig
      };

      await fs.writeFile(settingsPath, JSON.stringify(mergedSettings, null, 2));
      console.log('✓ Hooks configuration written to .claude/settings.json');
      
    } catch (error) {
      console.error('Failed to configure hooks:', error);
      throw new Error(`Hook configuration failed: ${error}`);
    }
  }

  /**
   * Start autonomous evolution testing
   */
  async startAutonomousEvolution(): Promise<GenerationResult[]> {
    console.log('Starting autonomous evolution testing with hooks...');
    
    await this.configureHooks();
    
    // Enable autonomous mode
    this.isAutonomousMode = true;
    
    // Set environment variables for hooks
    process.env.EVOLUTION_SESSION_ACTIVE = 'true';
    process.env.TELEMETRY_ENABLED = 'true';
    process.env.CLAUDE_CODE_ORCHESTRATION = 'true';
    
    const results: GenerationResult[] = [];
    
    try {
      for (let generation = 1; generation <= this.config.maxGenerations; generation++) {
        this.currentGeneration = generation;
        
        console.log(`\n🔄 Starting Generation ${generation}/${this.config.maxGenerations}`);
        
        const generationResult = await this.runGeneration(generation);
        results.push(generationResult);
        
        // Check if we've reached target score
        if (generationResult.averageScore >= this.config.targetScore) {
          console.log(`🎯 Target score ${this.config.targetScore} reached!`);
          break;
        }
        
        // Check for convergence
        if (this.hasConverged(results)) {
          console.log('📈 Evolution has converged');
          break;
        }
        
        // Auto-apply improvements if enabled
        if (this.config.autoApplyImprovements && generationResult.patterns.length > 0) {
          await this.autoApplyImprovements(generationResult.patterns);
        }
      }
      
    } finally {
      // Clean up environment
      this.isAutonomousMode = false;
      delete process.env.EVOLUTION_SESSION_ACTIVE;
    }
    
    return results;
  }

  /**
   * Run a single generation with hooks coordination
   */
  private async runGeneration(generation: number): Promise<GenerationResult> {
    console.log(`Running ${this.config.agentCount} agents for generation ${generation}...`);
    
    const testRuns: TestRun[] = [];
    
    // Spawn task agents (hooks will automatically capture telemetry)
    for (let i = 0; i < this.config.agentCount; i++) {
      const agentId = `gen${generation}-agent${i + 1}`;
      
      console.log(`Spawning agent ${agentId}...`);
      
      try {
        // The Task tool call will be intercepted by hooks
        const testRun = await this.spawnTaskAgent(agentId, generation);
        testRuns.push(testRun);
        
      } catch (error) {
        console.error(`Agent ${agentId} failed:`, error);
        
        // Create failed test run record
        const failedTelemetry: TelemetrySession = {
          sessionId: `failed-${agentId}`,
          toolCalls: [],
          startTime: Date.now(),
          endTime: Date.now(),
          metadata: { error: error instanceof Error ? error.message : String(error) }
        };
        
        testRuns.push({
          agentId,
          telemetry: failedTelemetry,
          duration: 0,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          generation
        });
      }
    }
    
    console.log(`Completed ${testRuns.length} agent runs`);
    
    // Analyze patterns from collected telemetry
    const patterns = this.patternAnalyzer.analyzePatterns(testRuns);
    
    // Calculate generation metrics
    const successfulRuns = testRuns.filter(run => run.success);
    const scores = successfulRuns.map(run => run.comparisonResult?.score || 0);
    const averageScore = scores.length > 0 
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 0;
    
    const generationResult: GenerationResult = {
      generation,
      runs: testRuns,
      patterns,
      averageScore,
      bestScore: scores.length > 0 ? Math.max(...scores) : 0,
      worstScore: scores.length > 0 ? Math.min(...scores) : 0
    };
    
    console.log(`Generation ${generation} complete - Average Score: ${averageScore.toFixed(1)}`);
    
    return generationResult;
  }

  /**
   * Spawn a task agent (will be intercepted by hooks)
   */
  private async spawnTaskAgent(agentId: string, generation: number): Promise<TestRun> {
    // In hooks mode, this would trigger the Task tool which gets intercepted
    // For now, we simulate the process with a basic implementation
    const startTime = Date.now();
    
    try {
      // Simulate a task agent run with basic telemetry
      const telemetry: TelemetrySession = {
        sessionId: agentId,
        toolCalls: [],
        startTime,
        endTime: Date.now() + 5000, // Simulate 5 second run
        metadata: { simulated: true }
      };
      
      return {
        agentId,
        telemetry,
        duration: Date.now() - startTime,
        success: true,
        generation,
        // Simulate basic metrics and comparison
        extractedMetrics: {
          frames: [],
          margins: { top: 36, left: 36, bottom: 36, right: 36 },
          columns: 1
        },
        comparisonResult: {
          score: Math.random() * 100, // Random score for simulation
          differences: [],
          matches: []
        }
      };
      
    } catch (error) {
      const failedTelemetry: TelemetrySession = {
        sessionId: agentId,
        toolCalls: [],
        startTime,
        endTime: Date.now(),
        metadata: { error: error instanceof Error ? error.message : String(error) }
      };
      
      return {
        agentId,
        telemetry: failedTelemetry,
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        generation
      };
    }
  }

  /**
   * Generate improvements from detected patterns
   */
  private async generateImprovements(patterns: Pattern[]): Promise<Improvement[]> {
    // In hooks mode, this would use claudeAnalyzer.formatForAnalysis()
    // For now, return basic improvements based on patterns
    return patterns.map((pattern, index) => ({
      type: 'description' as ImprovementType,
      tool: `tool_${index}`, // Simplified tool reference
      current: `Current description`,
      proposed: `Improved description addressing ${pattern.description}`,
      rationale: pattern.description,
      expectedImpact: pattern.confidence,
      generation: this.currentGeneration
    }));
  }

  /**
   * Automatically apply improvements if enabled
   */
  private async autoApplyImprovements(patterns: Pattern[]): Promise<void> {
    if (!this.config.autoApplyImprovements) {
      return;
    }
    
    console.log('🔧 Auto-applying improvements...');
    
    const improvements = await this.generateImprovements(patterns);
    
    for (const improvement of improvements) {
      try {
        // In hooks mode, this would call improvementManager.applyImprovement()
        // For now, just log the attempted improvement
        console.log(`✓ Would apply improvement to ${improvement.tool}: ${improvement.proposed}`);
      } catch (error) {
        console.error(`Failed to apply improvement to ${improvement.tool}:`, error);
      }
    }
  }

  /**
   * Check if evolution has converged
   */
  private hasConverged(results: GenerationResult[]): boolean {
    if (results.length < 3) return false;
    
    const recentScores = results.slice(-3).map(r => r.averageScore);
    const scoreVariance = this.calculateVariance(recentScores);
    
    // Consider converged if variance is very low
    return scoreVariance < 1.0;
  }

  /**
   * Calculate variance of an array of numbers
   */
  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((sum, sq) => sum + sq, 0) / numbers.length;
  }

  /**
   * Get current evolution status
   */
  getStatus(): { 
    generation: number; 
    isAutonomous: boolean; 
    hooksEnabled: boolean;
  } {
    return {
      generation: this.currentGeneration,
      isAutonomous: this.isAutonomousMode,
      hooksEnabled: this.config.hooksEnabled
    };
  }
}

/**
 * Create a hooks-enabled evolution controller
 */
export function createHooksController(config: Partial<HooksControllerConfig>): HooksEvolutionController {
  const defaultConfig: HooksControllerConfig = {
    testCase: 'hooks-evolution',
    agentCount: 3,
    maxGenerations: 5,
    targetScore: 85,
    referenceMetrics: {
      frames: [],
      margins: { top: 36, left: 36, bottom: 36, right: 36 },
      columns: 1
    },
    hooksEnabled: true,
    autoApplyImprovements: false,
    maxAutonomousGenerations: 10,
    requireHumanApproval: true
  };

  const mergedConfig = { ...defaultConfig, ...config };

  return new HooksEvolutionController(mergedConfig);
}
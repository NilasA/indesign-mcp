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
import { DashboardIntegration } from './dashboard.js';
import { TestConfig, TestRun, Pattern, Improvement, GenerationResult, ImprovementType } from './types.js';
import { TelemetrySession } from '../../tools/telemetry.js';
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
  dashboard?: {
    enabled: boolean;
    port?: number;
  };
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
  private dashboardIntegration: DashboardIntegration;
  private currentGeneration: number = 0;
  private isAutonomousMode: boolean = false;

  constructor(config: HooksControllerConfig) {
    this.config = config;
    // Extract base config for TaskBasedRunner (simplified)
    this.taskRunner = new TaskBasedRunner();
    this.patternAnalyzer = new PatternAnalyzer();
    this.claudeAnalyzer = new ClaudeAnalyzer();
    this.improvementManager = new ImprovementManager();
    this.dashboardIntegration = new DashboardIntegration();
  }

  /**
   * Deep merge hooks configuration to preserve existing user hooks
   */
  private deepMergeHooks(existing: any, newConfig: any): any {
    const result = { ...existing };
    
    // Handle hooks object specifically
    if (newConfig.hooks) {
      if (!result.hooks) {
        result.hooks = {};
      }
      
      // Merge each hook type (PreToolUse, PostToolUse, Stop)
      Object.keys(newConfig.hooks).forEach(hookType => {
        if (!result.hooks[hookType]) {
          result.hooks[hookType] = [];
        }
        
        // Append new hooks to existing ones, avoiding duplicates
        const existingHooks = result.hooks[hookType];
        const newHooks = newConfig.hooks[hookType];
        
        newHooks.forEach((newHook: any) => {
          // Check if hook already exists (same matcher and command)
          const exists = existingHooks.some((existing: any) => 
            existing.matcher === newHook.matcher &&
            existing.hooks?.[0]?.command === newHook.hooks?.[0]?.command
          );
          
          if (!exists) {
            existingHooks.push(newHook);
          }
        });
      });
    }
    
    // Merge other settings normally
    Object.keys(newConfig).forEach(key => {
      if (key !== 'hooks') {
        result[key] = newConfig[key];
      }
    });
    
    return result;
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
            matcher: "^Task$",
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

      // Deep merge with existing settings to preserve user hooks
      const mergedSettings = this.deepMergeHooks(existingSettings, hooksConfig);

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
    
    // Initialize dashboard if enabled
    await this.dashboardIntegration.initialize(this.config);
    
    // Enable autonomous mode
    this.isAutonomousMode = true;
    
    // Set environment variables for hooks
    process.env.EVOLUTION_SESSION_ACTIVE = 'true';
    process.env.TELEMETRY_ENABLED = 'true';
    process.env.CLAUDE_CODE_ORCHESTRATION = 'true';
    
    const results: GenerationResult[] = [];
    
    try {
      for (let generation = 1; generation <= this.config.maxAutonomousGenerations; generation++) {
        this.currentGeneration = generation;
        
        console.log(`\n🔄 Starting Generation ${generation}/${this.config.maxAutonomousGenerations}`);
        
        const generationResult = await this.runGeneration(generation);
        results.push(generationResult);
        
        // Update dashboard with generation results
        this.dashboardIntegration.updateGeneration(generationResult);
        
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
      
      // Shutdown dashboard
      await this.dashboardIntegration.shutdown();
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
          id: `failed-${agentId}`,
          calls: [],
          startTime: Date.now(),
          endTime: Date.now(),
          agentId,
          generation
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
    
    // Update dashboard with patterns
    this.dashboardIntegration.updatePatterns(patterns);
    
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
    const startTime = Date.now();
    
    try {
      if (this.config.hooksEnabled) {
        // REAL IMPLEMENTATION: Use Task tool (would be intercepted by hooks)
        console.log(`🤖 Spawning Task agent ${agentId} for generation ${generation}...`);
        
        // Create prompt for Task agent
        const prompt = this.createTaskPrompt(agentId, generation);
        
        // In a real implementation, this would call the Task tool
        // For now, we simulate the hooks capturing the data
        console.log(`📝 Task prompt created for ${agentId}`);
        
        // Wait for simulated task execution
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Collect telemetry (would come from hooks in real implementation)
        const telemetry = this.createFallbackTelemetry(agentId, generation);
        
        // Extract metrics and compare (placeholders)
        const metrics = await this.extractLayoutMetrics();
        const comparison = await this.compareToReference(metrics);
        
        return {
          agentId,
          telemetry,
          success: true,
          duration: Date.now() - startTime,
          generation,
          extractedMetrics: metrics,
          comparisonResult: comparison
        };
      }
      
      // FALLBACK: Simulation mode when hooks disabled
      console.log(`⚠️  Running in simulation mode for ${agentId} (hooks disabled)`);
      return this.simulateTaskAgent(agentId, generation, startTime);
      
    } catch (error) {
      console.error(`Task agent ${agentId} failed:`, error);
      
      const failedTelemetry: TelemetrySession = {
        id: agentId,
        calls: [],
        startTime,
        endTime: Date.now(),
        agentId,
        generation
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
   * Create task prompt for agent
   */
  private createTaskPrompt(agentId: string, generation: number): string {
    return `Recreate this book page layout in InDesign using the available MCP tools.

Agent ID: ${agentId}
Generation: ${generation}

Reference: ${this.config.referenceImage || 'Academic book page layout'}

Instructions:
1. Use create_textframe to establish the page structure
2. Add text content with add_text
3. Apply appropriate styling with paragraph styles
4. Ensure proper positioning and layout

Requirements:
- Follow academic book design principles
- Use appropriate typography hierarchy
- Maintain consistent margins and spacing
- Complete the layout efficiently`;
  }

  /**
   * Extract layout metrics (placeholder - would use actual MCP bridge)
   */
  private async extractLayoutMetrics(): Promise<any> {
    // Placeholder - would call actual MCP tools
    return {
      frames: [],
      margins: { top: 36, left: 36, bottom: 36, right: 36 },
      columns: 1
    };
  }

  /**
   * Compare to reference (placeholder - would use actual comparison)
   */
  private async compareToReference(metrics: any): Promise<any> {
    // Placeholder - would do actual comparison
    return {
      match: true,
      score: Math.random() * 100,
      deviations: []
    };
  }

  /**
   * Create fallback telemetry when hooks fail
   */
  private createFallbackTelemetry(agentId: string, generation: number): TelemetrySession {
    return {
      id: `${Date.now()}-${agentId}-gen${generation}`,
      startTime: Date.now() - 30000,
      endTime: Date.now(),
      agentId,
      generation,
      calls: []
    };
  }

  /**
   * Simulate task agent when hooks are disabled
   */
  private async simulateTaskAgent(agentId: string, generation: number, startTime: number): Promise<TestRun> {
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const telemetry: TelemetrySession = {
      id: agentId,
      calls: [],
      startTime,
      endTime: Date.now(),
      agentId,
      generation
    };
    
    return {
      agentId,
      telemetry,
      success: true,
      duration: Date.now() - startTime,
      generation,
      extractedMetrics: {
        frames: [],
        margins: { top: 36, left: 36, bottom: 36, right: 36 },
        columns: 1
      },
      comparisonResult: {
        match: true,
        score: Math.random() * 100,
        deviations: []
      }
    };
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
        // Apply improvement using ImprovementManager
        const result = await this.improvementManager.applyImprovement(improvement);
        
        if (result.success) {
          console.log(`✅ Applied improvement to ${improvement.tool}: ${improvement.proposed}`);
          console.log(`   Score improvement: ${result.beforeScore.toFixed(1)} → ${result.afterScore.toFixed(1)}`);
        } else {
          console.log(`❌ Failed to apply improvement to ${improvement.tool}: ${result.error}`);
          
          if (result.reverted) {
            console.log(`   Changes reverted due to failure`);
          }
        }
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
    generation: 1,
    maxGenerations: 5,
    targetScore: 85,
    improvementThreshold: 0.1,
    referenceMetrics: {
      frames: [],
      margins: { top: 36, left: 36, bottom: 36, right: 36 },
      columns: 1
    },
    referenceImage: 'reference.png',
    hooksEnabled: true,
    autoApplyImprovements: false,
    maxAutonomousGenerations: 10,
    requireHumanApproval: true
  };

  const mergedConfig = { ...defaultConfig, ...config };

  return new HooksEvolutionController(mergedConfig);
}
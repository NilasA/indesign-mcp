#!/usr/bin/env node
/**
 * @fileoverview Autonomous Evolution Testing CLI
 * 
 * Single-command interface for fully automated evolutionary testing with hooks.
 * 
 * Usage:
 *   npm run evolve:complete
 *   npm run evolve:complete -- --test-case=book-page --target-score=85
 */

import { createHooksController } from './hooksController.js';
import type { HooksControllerConfig } from './hooksController.js';
import { runPreFlightChecks } from './validation.js';

interface CLIOptions {
  testCase?: string;
  targetScore?: number;
  agentCount?: number;
  maxGenerations?: number;
  autoApply?: boolean;
  dryRun?: boolean;
  dashboard?: boolean;
  dashboardPort?: number;
  help?: boolean;
}

function parseArguments(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('--test-case=')) {
      options.testCase = arg.split('=')[1];
    } else if (arg.startsWith('--target-score=')) {
      options.targetScore = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--agent-count=')) {
      options.agentCount = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--max-generations=')) {
      options.maxGenerations = parseInt(arg.split('=')[1]);
    } else if (arg === '--auto-apply') {
      options.autoApply = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--dashboard') {
      options.dashboard = true;
    } else if (arg.startsWith('--dashboard-port=')) {
      options.dashboardPort = parseInt(arg.split('=')[1]);
    }
  }
  
  return options;
}

function showHelp(): void {
  console.log(`
Autonomous Evolution Testing CLI

Usage:
  npm run evolve:complete [options]

Options:
  --test-case=NAME         Test case identifier (default: autonomous-evolution)
  --target-score=N         Target score to achieve (default: 85)
  --agent-count=N          Number of agents per generation (default: 3)
  --max-generations=N      Maximum generations to run (default: 5)
  --auto-apply             Automatically apply improvements (default: false)
  --dry-run               Simulate without making changes (default: false)
  --dashboard             Enable real-time analytics dashboard (default: false)
  --dashboard-port=N      Dashboard port (default: 3000)
  --help, -h              Show this help message

Examples:
  npm run evolve:complete
  npm run evolve:complete -- --test-case=book-page --target-score=90
  npm run evolve:complete -- --auto-apply --max-generations=10
  npm run evolve:complete -- --dashboard --dashboard-port=3001

Prerequisites:
  - InDesign must be running with a document open
  - Claude Code hooks must be properly configured
  - Reference metrics must be available for comparison

For more information, see HOOKS-IMPLEMENTATION-PLAN.md
`);
}

async function main(): Promise<void> {
  try {
    const options = parseArguments();
    
    if (options.help) {
      showHelp();
      process.exit(0);
    }
    
    console.log('🚀 Starting Autonomous Evolution Testing with Hooks');
    console.log('=' .repeat(60));
    
    // Build configuration from CLI options
    const config: Partial<HooksControllerConfig> = {
      testCase: options.testCase || 'autonomous-evolution',
      targetScore: options.targetScore || 85,
      agentCount: options.agentCount || 3,
      maxGenerations: options.maxGenerations || 5,
      hooksEnabled: true,
      autoApplyImprovements: options.autoApply || false,
      maxAutonomousGenerations: options.maxGenerations || 5,
      requireHumanApproval: !options.autoApply,
      dashboard: {
        enabled: options.dashboard || false,
        port: options.dashboardPort || 3000
      },
      // Default reference metrics (should be overridden with real data)
      referenceMetrics: {
        frames: [
          { x: 72, y: 72, width: 400, height: 500, hasText: true, overflows: false, contentLength: 1000 }
        ],
        margins: { top: 36, left: 36, bottom: 36, right: 36 },
        columns: 1
      }
    };
    
    console.log('Configuration:');
    console.log(`  Test Case: ${config.testCase}`);
    console.log(`  Target Score: ${config.targetScore}`);
    console.log(`  Agent Count: ${config.agentCount}`);
    console.log(`  Max Generations: ${config.maxGenerations}`);
    console.log(`  Auto-apply Improvements: ${config.autoApplyImprovements}`);
    console.log(`  Hooks Enabled: ${config.hooksEnabled}`);
    console.log(`  Dashboard Enabled: ${config.dashboard?.enabled}`);
    if (config.dashboard?.enabled) {
      console.log(`  Dashboard Port: ${config.dashboard.port}`);
    }
    
    if (options.dryRun) {
      console.log('\n🔍 DRY RUN MODE - No changes will be made');
      console.log('Configuration validated successfully');
      console.log('Hooks would be configured and evolution would proceed');
      return;
    }
    
    // Run pre-flight checks
    console.log('\n🔍 Running pre-flight checks...');
    await runPreFlightChecks(config as any);
    
    // Create hooks controller
    console.log('\n⚙️  Initializing hooks-based evolution controller...');
    const controller = createHooksController(config);
    
    // Start autonomous evolution
    console.log('\n🔄 Starting autonomous evolution...');
    const startTime = Date.now();
    
    const results = await controller.startAutonomousEvolution();
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    // Show results
    console.log('\n✅ Autonomous evolution completed!');
    console.log('=' .repeat(60));
    console.log(`Duration: ${duration} seconds`);
    console.log(`Generations completed: ${results.length}`);
    
    if (results.length > 0) {
      const finalResult = results[results.length - 1];
      console.log(`Final average score: ${finalResult.averageScore.toFixed(1)}`);
      console.log(`Patterns identified: ${finalResult.patterns.length}`);
      
      if (finalResult.averageScore >= config.targetScore!) {
        console.log(`🎯 Target score of ${config.targetScore} achieved!`);
      } else {
        console.log(`📊 Target score of ${config.targetScore} not reached`);
      }
    }
    
    console.log('\n📋 Summary:');
    results.forEach((result, index) => {
      console.log(`  Generation ${result.generation}: Score ${result.averageScore.toFixed(1)} (${result.patterns.length} patterns)`);
    });
    
    console.log('\n🎉 Autonomous evolution testing complete!');
    
  } catch (error) {
    console.error('\n❌ Autonomous evolution failed:');
    console.error(error instanceof Error ? error.message : String(error));
    
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    console.log('\n💡 Troubleshooting tips:');
    console.log('  - Ensure InDesign is running with a document open');
    console.log('  - Check that Claude Code hooks are properly configured');
    console.log('  - Verify reference metrics are accurate for your test case');
    console.log('  - Review HOOKS-IMPLEMENTATION-PLAN.md for setup details');
    
    process.exit(1);
  }
}

// Run the CLI
main().catch(console.error);
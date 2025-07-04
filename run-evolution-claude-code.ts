/**
 * Script to run evolutionary testing with Claude Code orchestration
 * This initializes the system and provides the necessary context for Claude Code
 */

import { createTaskBasedRunner } from './src/experimental/evolutionary/taskBasedRunner.js';
import { PatternAnalyzer } from './src/experimental/evolutionary/patternAnalyzer.js';
import { ClaudeAnalyzer } from './src/experimental/evolutionary/claudeAnalyzer.js';
import { TestConfig } from './src/experimental/evolutionary/types.js';

// Set environment to indicate Claude Code orchestration
process.env.CLAUDE_CODE_ORCHESTRATION = 'true';
process.env.TELEMETRY_ENABLED = 'true';

async function setupEvolution() {
  console.log('🧬 Initializing Evolution Testing for Claude Code Orchestration\n');
  
  // Initialize components
  const runner = createTaskBasedRunner();
  const patternAnalyzer = new PatternAnalyzer();
  const claudeAnalyzer = new ClaudeAnalyzer();
  
  console.log('Initializing runner with telemetry...');
  await runner.initialize();
  console.log('✓ Runner ready with telemetry enabled\n');
  
  // Configuration
  const config: TestConfig = {
    testCase: 'book-page',
    agentCount: 3,
    generation: 1,
    maxGenerations: 5,
    targetScore: 85,
    improvementThreshold: 5,
    referenceMetrics: {
      frames: [],
      margins: { top: 36, left: 50.4, bottom: 36, right: 50.4 },
      columns: 1,
      styles: [],
      textRegions: []
    },
    referenceImage: 'tests/decision-analysis/reference-images/book-page.jpg',
    referenceDescription: `Academic book page with:
    - 5.125" x 7.75" document
    - Clear heading at top
    - Body text in professional typography
    - Consistent paragraph spacing`
  };
  
  console.log('=== Evolution Testing Ready ===\n');
  console.log('Configuration:');
  console.log(`- Test Case: ${config.testCase}`);
  console.log(`- Agents per generation: ${config.agentCount}`);
  console.log(`- Target score: ${config.targetScore}%`);
  console.log(`- Reference image: ${config.referenceImage}`);
  console.log(`\n✅ System initialized and ready for Claude Code orchestration`);
  
  // Store in a safer way that won't confuse Claude Code's CLI
  // Avoid global assignment which might trigger CLI parsing issues
  const evolutionSystem = {
    runner,
    patternAnalyzer,
    claudeAnalyzer,
    config
  };
  
  // Return the system for direct use instead of global assignment
  console.log('\n✅ Evolution system ready for use');
  
  // Create the first prompt for demonstration
  const agentId = 'agent-1';
  const sessionId = runner.generateSessionId(agentId, config.generation);
  const prompt = runner.createTaskPrompt(config, agentId, sessionId);
  
  // Display orchestration guidance
  console.log(runner.createOrchestrationGuidance(config));
  console.log(runner.getResetInstructions());
  console.log('\n=== Example Task Prompt ===');
  console.log('Use this with the Task tool:\n');
  console.log(prompt);
  console.log('\n=== Ready for Task Tool Invocation ===');
  
  return { runner, config, sessionId, prompt, evolutionSystem };
}

// Run setup with better error handling
setupEvolution()
  .then(() => {
    console.log('\n✨ Setup complete! Use the Task tool with the prompt shown above.');
    // Don't use process.exit() as it might confuse Claude Code's response handling
  })
  .catch((error) => {
    // Avoid using console.error which might trigger CLI parsing
    console.log('\n❌ Setup failed:', error?.message || 'Unknown error');
    // Let the script end naturally without forcing exit
  });
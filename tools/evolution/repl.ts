#!/usr/bin/env tsx

/**
 * @fileoverview Evolution REPL - Interactive evolution controller
 * 
 * This script boots an InteractiveEvolution instance and exports it on globalThis
 * for easy access in a REPL environment. Prevents the multi-PID madness that
 * occurs when running multiple `node -e` commands.
 * 
 * Usage:
 *   npm run evol-repl
 *   > await evo.initialize('book-page', 3)
 *   > await evo.startGeneration()
 *   > const prompt = await evo.getNextAgentPrompt()
 *   > // Run Task agent with prompt.prompt
 *   > await evo.processAgentCompletion(prompt.sessionId)
 */

import { InteractiveEvolution } from '../../src/experimental/evolutionary/interactiveEvolution.js';
import * as readline from 'readline';

// Create evolution instance and make it globally available
const evolution = new InteractiveEvolution();
(globalThis as any).evo = evolution;

// Set up REPL interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'evo> '
});

console.log(`
🧬 Evolution REPL Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Available Commands:
  evo                        - Access the InteractiveEvolution instance
  await evo.initialize()     - Initialize the evolution system
  await evo.startGeneration() - Start a new generation
  await evo.getNextAgentPrompt() - Get prompt for next Task agent
  await evo.processAgentCompletion(sessionId) - Process agent results
  await evo.analyzeGeneration() - Analyze completed generation
  await evo.getProgress()    - Check current progress
  help()                     - Show this help again

Example Workflow:
  await evo.initialize('book-page', 3)
  await evo.startGeneration()
  
  // For each agent (repeat 3 times):
  const { prompt, sessionId } = await evo.getNextAgentPrompt()
  console.log(prompt)  // Copy this prompt to Task tool
  // After Task agent completes:
  await evo.processAgentCompletion(sessionId)
  
  // After all agents:
  await evo.analyzeGeneration()

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

// Helper functions in global scope
(globalThis as any).help = () => {
  console.log(`
🧬 Evolution REPL Commands:

Basic Operations:
  await evo.initialize('book-page', 3)  - Initialize with test case and agent count
  await evo.startGeneration()          - Start a new generation
  await evo.getProgress()              - Check current status

Agent Workflow:
  await evo.getNextAgentPrompt()       - Get next agent prompt and session ID
  await evo.processAgentCompletion(id) - Process agent completion

Analysis:
  await evo.analyzeGeneration()        - Analyze completed generation patterns
  await evo.suggestImprovements()      - Get improvement suggestions
  await evo.applyImprovement(improvement) - Apply a suggested improvement

State Management:
  await evo.saveProgress('gen1.json')  - Save current state
  await evo.loadProgress('gen1.json')  - Load saved state
  await evo.nextGeneration()           - Advance to next generation

Debug:
  evo.generateChecklist()              - Show current checklist
  process.exit()                       - Exit REPL
`);
};

// Show help initially
(globalThis as any).help();

// Keep the process alive
rl.on('line', (input) => {
  if (input.trim() === 'exit') {
    console.log('👋 Goodbye!');
    process.exit(0);
  }
  
  // Try to evaluate the input as JavaScript
  try {
    const result = eval(input.trim());
    if (result instanceof Promise) {
      result.then(res => {
        console.log(res);
        rl.prompt();
      }).catch(err => {
        console.error('Error:', err.message);
        rl.prompt();
      });
    } else {
      console.log(result);
      rl.prompt();
    }
  } catch (error) {
    console.error('Error:', (error as Error).message);
    rl.prompt();
  }
});

rl.on('close', () => {
  console.log('\n👋 Evolution REPL closed');
  process.exit(0);
});

// Start the prompt
rl.prompt();
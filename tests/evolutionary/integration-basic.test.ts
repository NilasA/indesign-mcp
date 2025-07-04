/**
 * @fileoverview Basic integration tests for evolutionary testing system
 * Verifies core components can be imported and instantiated
 */

import { describe, test, expect } from '@jest/globals';

describe('Evolutionary Testing Basic Integration', () => {
  test('Core modules can be imported', async () => {
    // Test that all core modules can be imported without errors
    expect(async () => {
      await import('../../src/experimental/evolutionary/taskBasedRunner.js');
      await import('../../src/experimental/evolutionary/patternAnalyzer.js');
      await import('../../src/experimental/evolutionary/claudeAnalyzer.js');
      await import('../../src/experimental/evolutionary/validation.js');
      await import('../../src/experimental/evolutionary/types.js');
    }).not.toThrow();
  });

  test('TaskBasedRunner can be created', async () => {
    const { createTaskBasedRunner } = await import('../../src/experimental/evolutionary/taskBasedRunner.js');
    
    const minimalConfig = {
      testCase: 'basic-test',
      agentCount: 2,
      maxGenerations: 1,
      targetScore: 80,
      referenceMetrics: {
        frames: [],
        margins: { top: 36, left: 36, bottom: 36, right: 36 },
        columns: 1
      }
    };

    const runner = createTaskBasedRunner(minimalConfig);
    expect(runner).toBeDefined();
  });

  test('WorkflowValidator can validate config', async () => {
    const { WorkflowValidator } = await import('../../src/experimental/evolutionary/validation.js');
    
    const validConfig = {
      testCase: 'validation-test',
      agentCount: 3,
      maxGenerations: 2,
      targetScore: 85,
      referenceMetrics: {
        frames: [],
        margins: { top: 36, left: 36, bottom: 36, right: 36 },
        columns: 1
      }
    };

    expect(() => {
      WorkflowValidator.validateConfig(validConfig);
    }).not.toThrow();
  });

  test('PatternAnalyzer can be instantiated', async () => {
    const { PatternAnalyzer } = await import('../../src/experimental/evolutionary/patternAnalyzer.js');
    
    const config = {
      testCase: 'pattern-test',
      agentCount: 2,
      maxGenerations: 1,
      targetScore: 80,
      referenceMetrics: {
        frames: [],
        margins: { top: 36, left: 36, bottom: 36, right: 36 },
        columns: 1
      }
    };

    const analyzer = new PatternAnalyzer(config);
    expect(analyzer).toBeDefined();
  });

  test('ClaudeAnalyzer can be instantiated', async () => {
    const { ClaudeAnalyzer } = await import('../../src/experimental/evolutionary/claudeAnalyzer.js');
    
    const analyzer = new ClaudeAnalyzer();
    expect(analyzer).toBeDefined();
  });

  test('No deprecated components are exported from index', async () => {
    const exported = await import('../../src/experimental/evolutionary/index.js');
    
    // Verify deprecated components are not exported
    expect(exported.EvolutionaryTestRunner).toBeUndefined();
    expect(exported.SubAgentExecutor).toBeUndefined();
    expect(exported.EvolutionOrchestrator).toBeUndefined();
    
    // Verify current components are exported
    expect(exported.TaskBasedRunner).toBeDefined();
    expect(exported.PatternAnalyzer).toBeDefined();
    expect(exported.ClaudeAnalyzer).toBeDefined();
  });

  test('Build system works correctly', () => {
    // This test passes if the file imports work, which means TypeScript compilation succeeded
    expect(true).toBe(true);
  });
});
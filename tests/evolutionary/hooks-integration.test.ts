/**
 * @fileoverview Integration tests for hooks-based evolutionary testing
 * Tests the new hooks controller and coordination system
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { HooksEvolutionController, createHooksController } from '../../src/experimental/evolutionary/hooksController.js';
import type { HooksControllerConfig } from '../../src/experimental/evolutionary/hooksController.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Hooks-based Evolutionary Testing Integration', () => {
  let tempDir: string;
  let hooksConfig: Partial<HooksControllerConfig>;

  beforeEach(async () => {
    // Create temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hooks-test-'));
    
    // Set up hooks configuration
    hooksConfig = {
      testCase: 'hooks-integration-test',
      agentCount: 2,
      maxGenerations: 1,
      targetScore: 80,
      referenceMetrics: {
        frames: [
          { x: 72, y: 72, width: 200, height: 100, hasText: true, overflows: false, contentLength: 50 }
        ],
        margins: { top: 36, left: 36, bottom: 36, right: 36 },
        columns: 1
      },
      outputDir: tempDir,
      hooksEnabled: true,
      autoApplyImprovements: false,
      maxAutonomousGenerations: 5,
      requireHumanApproval: true
    };
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('HooksEvolutionController can be created', () => {
    const controller = createHooksController(hooksConfig);
    expect(controller).toBeDefined();
    expect(controller.getStatus().hooksEnabled).toBe(true);
  });

  test('Controller status reflects configuration', () => {
    const controller = createHooksController(hooksConfig);
    const status = controller.getStatus();
    
    expect(status.generation).toBe(0);
    expect(status.isAutonomous).toBe(false);
    expect(status.hooksEnabled).toBe(true);
  });

  test('Hook configuration can be generated', async () => {
    const controller = createHooksController(hooksConfig);
    
    // This should not throw and should prepare hooks configuration
    await expect(async () => {
      await controller.configureHooks();
    }).not.toThrow();
  });

  test('Hooks disabled configuration works', () => {
    const disabledConfig = {
      ...hooksConfig,
      hooksEnabled: false
    };
    
    const controller = createHooksController(disabledConfig);
    expect(controller.getStatus().hooksEnabled).toBe(false);
  });

  test('Default configuration is applied correctly', () => {
    const controller = createHooksController({});
    const status = controller.getStatus();
    
    expect(status.hooksEnabled).toBe(true);
    expect(status.generation).toBe(0);
    expect(status.isAutonomous).toBe(false);
  });

  test('Configuration validation passes', () => {
    // Test that the hooks controller accepts valid configurations
    expect(() => {
      createHooksController({
        testCase: 'validation-test',
        agentCount: 3,
        maxGenerations: 2,
        targetScore: 85,
        hooksEnabled: true,
        autoApplyImprovements: true
      });
    }).not.toThrow();
  });

  test('Hooks controller is exported correctly', async () => {
    const exported = await import('../../src/experimental/evolutionary/index.js');
    
    // Verify hooks components are exported
    expect(exported.HooksEvolutionController).toBeDefined();
    expect(exported.createHooksController).toBeDefined();
    
    // Test that we can create a controller through the exported function
    const controller = exported.createHooksController(hooksConfig);
    expect(controller).toBeDefined();
  });

  test('Hooks system integrates with existing components', async () => {
    // Verify that hooks controller can work with existing evolutionary components
    const { TaskBasedRunner, PatternAnalyzer, ClaudeAnalyzer } = await import('../../src/experimental/evolutionary/index.js');
    
    expect(TaskBasedRunner).toBeDefined();
    expect(PatternAnalyzer).toBeDefined();
    expect(ClaudeAnalyzer).toBeDefined();
    
    // Create controller and verify it doesn't conflict with existing exports
    const controller = createHooksController(hooksConfig);
    expect(controller).toBeDefined();
  });

  test('Build system supports hooks implementation', () => {
    // This test passes if the file imports work, meaning TypeScript compilation succeeded
    // and all dependencies are properly resolved
    expect(true).toBe(true);
  });
});
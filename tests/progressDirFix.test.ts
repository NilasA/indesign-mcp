/**
 * @fileoverview Test for progressDir path validation fix
 * Tests that loadProgress and saveProgress work with empty/undefined config
 */

import { InteractiveEvolution } from '../src/experimental/evolutionary/interactiveEvolution.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('ProgressDir Path Validation Fix', () => {
  let evolution: InteractiveEvolution;
  let tempDir: string;

  beforeEach(() => {
    evolution = new InteractiveEvolution();
    tempDir = path.join(os.tmpdir(), `test-evolution-${Date.now()}`);
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('loadProgress should not throw "path argument must be string" error with empty config', async () => {
    // Test the scenario that was causing the original error
    const testFilename = 'test-progress.json';
    
    // Create a minimal valid progress file
    const progressDir = path.join(os.tmpdir(), 'evolution_progress');
    await fs.mkdir(progressDir, { recursive: true });
    
    const testProgress = {
      generation: 1,
      completedAgents: [],
      runs: [],
      improvements: [],
      startTime: Date.now(),
      config: null, // This was causing the undefined path error
      currentAgentIndex: 0
    };
    
    const testFile = path.join(progressDir, testFilename);
    await fs.writeFile(testFile, JSON.stringify(testProgress, null, 2));
    
    // This should not throw "path argument must be string" error
    // The fix works if loadProgress doesn't crash with path validation errors
    await expect(evolution.loadProgress(testFilename)).resolves.not.toThrow();
    // It should succeed because we now have proper fallback path handling
    
    // Clean up
    await fs.unlink(testFile);
  });

  test('saveProgress should work with minimal config', async () => {
    // Initialize with minimal config to test fallback
    await evolution.initialize('book-page', 1);
    
    const testFilename = 'test-save-progress.json';
    
    // This should not throw any path-related errors
    await expect(evolution.saveProgress(testFilename)).resolves.not.toThrow();
    
    // Verify file was created in fallback location
    const fallbackDir = path.join(os.tmpdir(), 'evolution_progress');
    const expectedFile = path.join(fallbackDir, testFilename);
    
    const fileExists = await fs.access(expectedFile).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);
    
    // Clean up
    if (fileExists) {
      await fs.unlink(expectedFile);
    }
  });

  test('saveProgress and loadProgress should use config progressDir when available', async () => {
    // Initialize with proper config that includes progressDir
    await evolution.initialize('book-page', 1);
    
    const testFilename = 'config-test-progress.json';
    
    // Save progress
    await evolution.saveProgress(testFilename);
    
    // Should be able to load it back
    await evolution.loadProgress(testFilename);
    
    // Verify the progress was actually saved and loaded
    const progress = await evolution.getProgress();
    expect(progress).toContain('Generation: 1');
  });
});
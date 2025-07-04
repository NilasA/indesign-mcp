/**
 * @fileoverview Tests for evolution dashboard functionality
 */

import { EvolutionDashboard, DashboardIntegration } from '../../src/experimental/evolutionary/dashboard.js';
import { GenerationResult, Pattern } from '../../src/experimental/evolutionary/types.js';
import { TelemetrySession } from '../../src/tools/telemetry.js';

describe('Evolution Dashboard', () => {
  let dashboard: EvolutionDashboard;
  
  beforeEach(() => {
    // Use a different port for testing to avoid conflicts
    dashboard = new EvolutionDashboard(3001);
  });
  
  afterEach(async () => {
    if (dashboard.isActive()) {
      await dashboard.stop();
    }
  });

  test('dashboard can be created and configured', () => {
    expect(dashboard).toBeDefined();
    expect(dashboard.isActive()).toBe(false);
    expect(dashboard.getUrl()).toBe('http://localhost:3001');
  });

  test('dashboard can start and stop', async () => {
    expect(dashboard.isActive()).toBe(false);
    
    await dashboard.start();
    expect(dashboard.isActive()).toBe(true);
    
    await dashboard.stop();
    expect(dashboard.isActive()).toBe(false);
  }, 10000);

  test('dashboard can update generation data', async () => {
    const mockGenerationResult: GenerationResult = {
      generation: 1,
      runs: [],
      patterns: [],
      averageScore: 75.5,
      bestScore: 85.0,
      worstScore: 65.0
    };

    // Should not throw when updating data
    expect(() => dashboard.updateGeneration(mockGenerationResult)).not.toThrow();
  });

  test('dashboard can update telemetry statistics', async () => {
    const mockSessions: TelemetrySession[] = [
      {
        id: 'session1',
        startTime: Date.now() - 10000,
        endTime: Date.now(),
        agentId: 'agent1',
        generation: 1,
        calls: [
          {
            timestamp: Date.now(),
            tool: 'create_textframe',
            parameters: { x: 72, y: 72, width: 200, height: 200 },
            executionTime: 500,
            result: 'success'
          }
        ]
      }
    ];

    expect(() => dashboard.updateTelemetryStats(mockSessions)).not.toThrow();
  });

  test('dashboard can update pattern analysis', async () => {
    const mockPatterns: Pattern[] = [
      {
        type: 'parameter-choice',
        frequency: 0.8,
        description: 'Agents consistently use small font sizes',
        examples: [],
        confidence: 0.85,
        severity: 'medium'
      }
    ];

    expect(() => dashboard.updatePatterns(mockPatterns)).not.toThrow();
  });
});

describe('Dashboard Integration', () => {
  let integration: DashboardIntegration;
  
  beforeEach(() => {
    integration = new DashboardIntegration();
  });
  
  afterEach(async () => {
    await integration.shutdown();
  });

  test('dashboard integration can be created', () => {
    expect(integration).toBeDefined();
    expect(integration.getUrl()).toBeNull();
  });

  test('dashboard integration handles disabled dashboard', async () => {
    const config = { dashboard: { enabled: false } };
    
    await integration.initialize(config);
    expect(integration.getUrl()).toBeNull();
  });

  test('dashboard integration can handle updates when disabled', () => {
    const mockGeneration: GenerationResult = {
      generation: 1,
      runs: [],
      patterns: [],
      averageScore: 75.0,
      bestScore: 85.0,
      worstScore: 65.0
    };

    // Should not throw even when dashboard is disabled
    expect(() => integration.updateGeneration(mockGeneration)).not.toThrow();
    expect(() => integration.updateTelemetry([])).not.toThrow();
    expect(() => integration.updatePatterns([])).not.toThrow();
  });

  test('dashboard integration can initialize with enabled dashboard', async () => {
    const config = { 
      dashboard: { 
        enabled: true, 
        port: 3002 
      } 
    };
    
    await integration.initialize(config);
    expect(integration.getUrl()).toBe('http://localhost:3002');
    
    // Should be able to update data
    const mockGeneration: GenerationResult = {
      generation: 1,
      runs: [],
      patterns: [],
      averageScore: 75.0,
      bestScore: 85.0,
      worstScore: 65.0
    };

    expect(() => integration.updateGeneration(mockGeneration)).not.toThrow();
  }, 10000);

  test('dashboard integration can shutdown gracefully', async () => {
    const config = { 
      dashboard: { 
        enabled: true, 
        port: 3003 
      } 
    };
    
    await integration.initialize(config);
    expect(integration.getUrl()).toBe('http://localhost:3003');
    
    await integration.shutdown();
    expect(integration.getUrl()).toBeNull();
  }, 10000);
});

describe('Dashboard Data Processing', () => {
  test('telemetry statistics calculation', () => {
    const dashboard = new EvolutionDashboard(3004);
    
    const mockSessions: TelemetrySession[] = [
      {
        id: 'session1',
        startTime: Date.now(),
        endTime: Date.now(),
        agentId: 'agent1',
        generation: 1,
        calls: [
          { timestamp: Date.now(), tool: 'create_textframe', parameters: {}, executionTime: 100, result: 'success' },
          { timestamp: Date.now(), tool: 'add_text', parameters: {}, executionTime: 200, result: 'success' }
        ]
      },
      {
        id: 'session2',
        startTime: Date.now(),
        endTime: Date.now(),
        agentId: 'agent2',
        generation: 1,
        calls: [
          { timestamp: Date.now(), tool: 'create_textframe', parameters: {}, executionTime: 150, result: 'success' }
        ]
      },
      {
        id: 'session3',
        startTime: Date.now(),
        endTime: Date.now(),
        agentId: 'agent3',
        generation: 1,
        calls: [] // Empty session (failed agent)
      }
    ];

    // Test that updateTelemetryStats processes the data correctly
    expect(() => dashboard.updateTelemetryStats(mockSessions)).not.toThrow();
  });

  test('generation data processing', () => {
    const dashboard = new EvolutionDashboard(3005);
    
    const mockGeneration: GenerationResult = {
      generation: 2,
      runs: [
        {
          agentId: 'agent1',
          telemetry: { id: 'session1', startTime: Date.now(), endTime: Date.now(), agentId: 'agent1', generation: 2, calls: [] },
          duration: 5000,
          success: true,
          generation: 2,
          comparisonResult: { score: 80, differences: [], matches: [] }
        }
      ],
      patterns: [
        {
          type: 'tool-sequence',
          frequency: 1.0,
          description: 'All agents use similar tool sequences',
          examples: [],
          confidence: 0.9,
          severity: 'high'
        }
      ],
      averageScore: 80.0,
      bestScore: 80.0,
      worstScore: 80.0
    };

    expect(() => dashboard.updateGeneration(mockGeneration)).not.toThrow();
  });
});
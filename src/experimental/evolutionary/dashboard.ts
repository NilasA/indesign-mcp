/**
 * @fileoverview Real-time Analytics Dashboard for Evolution Testing
 * 
 * Provides web-based monitoring of evolution progress, telemetry visualization,
 * and pattern analysis results.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as http from 'http';
import { WebSocketServer } from 'ws';
import { TelemetrySession } from '../../tools/telemetry.js';
import { GenerationResult, Pattern, TestRun } from './types.js';
import { getConfig } from './config.js';

/**
 * Real-time evolution analytics dashboard
 */
export class EvolutionDashboard {
  private server?: http.Server;
  private wsServer?: WebSocketServer;
  private port: number = 3000;
  private isRunning: boolean = false;
  private clients: Set<any> = new Set();
  private currentData: DashboardData = {
    generations: [],
    currentGeneration: 0,
    totalScore: 0,
    patterns: [],
    telemetryStats: {
      totalSessions: 0,
      successfulSessions: 0,
      averageToolsPerSession: 0,
      mostUsedTools: []
    }
  };

  constructor(port?: number) {
    if (port) this.port = port;
  }

  /**
   * Start the dashboard server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Dashboard already running');
      return;
    }

    console.log(`🌐 Starting Evolution Analytics Dashboard on port ${this.port}...`);

    // Create HTTP server
    this.server = http.createServer(async (req, res) => {
      await this.handleHttpRequest(req, res);
    });

    // Create WebSocket server for real-time updates
    this.wsServer = new WebSocketServer({ server: this.server });
    this.wsServer.on('connection', (ws) => {
      console.log('📊 Dashboard client connected');
      this.clients.add(ws);
      
      // Send current data to new client
      ws.send(JSON.stringify({
        type: 'initial_data',
        data: this.currentData
      }));

      ws.on('close', () => {
        console.log('📊 Dashboard client disconnected');
        this.clients.delete(ws);
      });
    });

    // Start server
    return new Promise<void>((resolve) => {
      this.server!.listen(this.port, () => {
        console.log(`✅ Evolution Dashboard running at http://localhost:${this.port}`);
        this.isRunning = true;
        resolve();
      });
    });
  }

  /**
   * Stop the dashboard server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('🛑 Stopping Evolution Dashboard...');
    
    if (this.wsServer) {
      this.wsServer.close();
    }
    
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => {
          this.isRunning = false;
          console.log('✅ Dashboard stopped');
          resolve();
        });
      });
    } else {
      this.isRunning = false;
      console.log('✅ Dashboard stopped');
    }
  }

  /**
   * Update dashboard with new generation data
   */
  updateGeneration(result: GenerationResult): void {
    this.currentData.generations.push({
      generation: result.generation,
      averageScore: result.averageScore,
      bestScore: result.bestScore,
      worstScore: result.worstScore,
      runsCompleted: result.runs.length,
      patterns: result.patterns.length,
      timestamp: Date.now()
    });

    this.currentData.currentGeneration = result.generation;
    this.currentData.totalScore = result.averageScore;
    this.currentData.patterns = result.patterns;

    this.broadcast({
      type: 'generation_update',
      data: {
        generation: result.generation,
        result: result
      }
    });
  }

  /**
   * Update telemetry statistics
   */
  updateTelemetryStats(sessions: TelemetrySession[]): void {
    const successfulSessions = sessions.filter(s => s.calls && s.calls.length > 0);
    const totalTools = sessions.reduce((sum, s) => sum + (s.calls?.length || 0), 0);
    
    // Calculate most used tools
    const toolUsage = new Map<string, number>();
    sessions.forEach(session => {
      session.calls?.forEach(call => {
        const current = toolUsage.get(call.tool) || 0;
        toolUsage.set(call.tool, current + 1);
      });
    });
    
    const mostUsedTools = Array.from(toolUsage.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tool, count]) => ({ tool, count }));

    this.currentData.telemetryStats = {
      totalSessions: sessions.length,
      successfulSessions: successfulSessions.length,
      averageToolsPerSession: sessions.length > 0 ? totalTools / sessions.length : 0,
      mostUsedTools
    };

    this.broadcast({
      type: 'telemetry_update',
      data: this.currentData.telemetryStats
    });
  }

  /**
   * Update pattern analysis results
   */
  updatePatterns(patterns: Pattern[]): void {
    this.currentData.patterns = patterns;

    this.broadcast({
      type: 'patterns_update',
      data: patterns
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(message: any): void {
    const data = JSON.stringify(message);
    this.clients.forEach(client => {
      try {
        client.send(data);
      } catch (error) {
        console.warn('Failed to send to client:', error);
        this.clients.delete(client);
      }
    });
  }

  /**
   * Handle HTTP requests
   */
  private async handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = req.url || '/';
    
    try {
      if (url === '/' || url === '/index.html') {
        await this.serveDashboardHtml(res);
      } else if (url === '/dashboard.js') {
        await this.serveDashboardJs(res);
      } else if (url === '/api/data') {
        await this.serveApiData(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    } catch (error) {
      console.error('Dashboard request error:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }

  /**
   * Serve dashboard HTML
   */
  private async serveDashboardHtml(res: http.ServerResponse): Promise<void> {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Evolution Analytics Dashboard</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .metric { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 2em; font-weight: bold; color: #007acc; }
        .chart { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .patterns { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .pattern { padding: 10px; border-left: 4px solid #007acc; margin: 10px 0; background: #f8f9fa; }
        .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }
        .status.running { background: #28a745; color: white; }
        .status.completed { background: #6c757d; color: white; }
        .tools-list { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
        .tool-tag { background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧬 Evolution Analytics Dashboard</h1>
            <p>Real-time monitoring of InDesign MCP evolutionary testing</p>
            <span id="status" class="status running">Connected</span>
        </div>
        
        <div class="metrics">
            <div class="metric">
                <h3>Current Generation</h3>
                <div class="value" id="currentGeneration">0</div>
            </div>
            <div class="metric">
                <h3>Average Score</h3>
                <div class="value" id="averageScore">0.0%</div>
            </div>
            <div class="metric">
                <h3>Total Sessions</h3>
                <div class="value" id="totalSessions">0</div>
            </div>
            <div class="metric">
                <h3>Success Rate</h3>
                <div class="value" id="successRate">0.0%</div>
            </div>
        </div>
        
        <div class="chart">
            <h3>📈 Score Progression</h3>
            <canvas id="scoreChart" width="800" height="300"></canvas>
        </div>
        
        <div class="patterns">
            <h3>🔍 Current Patterns</h3>
            <div id="patternsList">No patterns detected yet...</div>
        </div>
        
        <div class="chart">
            <h3>🛠️ Most Used Tools</h3>
            <div id="toolsList" class="tools-list">Loading...</div>
        </div>
    </div>
    
    <script src="/dashboard.js"></script>
</body>
</html>`;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  /**
   * Serve dashboard JavaScript
   */
  private async serveDashboardJs(res: http.ServerResponse): Promise<void> {
    const js = `
// Dashboard WebSocket connection
const ws = new WebSocket('ws://localhost:${this.port}');
let data = { generations: [], currentGeneration: 0, totalScore: 0, patterns: [], telemetryStats: {} };

ws.onopen = () => {
    console.log('Connected to evolution dashboard');
    updateStatus('running', 'Connected');
};

ws.onclose = () => {
    console.log('Disconnected from evolution dashboard');
    updateStatus('completed', 'Disconnected');
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    
    switch (message.type) {
        case 'initial_data':
            data = message.data;
            updateDashboard();
            break;
        case 'generation_update':
            updateGeneration(message.data);
            break;
        case 'telemetry_update':
            data.telemetryStats = message.data;
            updateTelemetryMetrics();
            break;
        case 'patterns_update':
            data.patterns = message.data;
            updatePatterns();
            break;
    }
};

function updateStatus(type, text) {
    const status = document.getElementById('status');
    status.className = 'status ' + type;
    status.textContent = text;
}

function updateGeneration(genData) {
    data.currentGeneration = genData.generation;
    data.totalScore = genData.result.averageScore;
    data.generations.push({
        generation: genData.generation,
        averageScore: genData.result.averageScore,
        bestScore: genData.result.bestScore,
        worstScore: genData.result.worstScore
    });
    updateDashboard();
}

function updateDashboard() {
    // Update metrics
    document.getElementById('currentGeneration').textContent = data.currentGeneration;
    document.getElementById('averageScore').textContent = data.totalScore.toFixed(1) + '%';
    
    updateTelemetryMetrics();
    updateChart();
    updatePatterns();
}

function updateTelemetryMetrics() {
    const stats = data.telemetryStats;
    document.getElementById('totalSessions').textContent = stats.totalSessions || 0;
    
    const successRate = stats.totalSessions > 0 
        ? ((stats.successfulSessions || 0) / stats.totalSessions * 100)
        : 0;
    document.getElementById('successRate').textContent = successRate.toFixed(1) + '%';
    
    // Update tools list
    const toolsList = document.getElementById('toolsList');
    if (stats.mostUsedTools && stats.mostUsedTools.length > 0) {
        toolsList.innerHTML = stats.mostUsedTools
            .map(t => '<div class="tool-tag">' + t.tool + ' (' + t.count + ')</div>')
            .join('');
    } else {
        toolsList.innerHTML = 'No tool usage data yet...';
    }
}

function updateChart() {
    const canvas = document.getElementById('scoreChart');
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (data.generations.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        ctx.fillText('No data available yet...', 50, 150);
        return;
    }
    
    // Simple line chart
    const padding = 50;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;
    
    // Draw axes
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Plot data
    if (data.generations.length > 1) {
        const maxScore = Math.max(...data.generations.map(g => g.averageScore));
        const minScore = Math.min(...data.generations.map(g => g.averageScore));
        const scoreRange = maxScore - minScore || 1;
        
        ctx.strokeStyle = '#007acc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        data.generations.forEach((gen, i) => {
            const x = padding + (i / (data.generations.length - 1)) * chartWidth;
            const y = canvas.height - padding - ((gen.averageScore - minScore) / scoreRange) * chartHeight;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            
            // Draw point
            ctx.fillStyle = '#007acc';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
        
        ctx.stroke();
    }
}

function updatePatterns() {
    const patternsList = document.getElementById('patternsList');
    
    if (!data.patterns || data.patterns.length === 0) {
        patternsList.innerHTML = 'No patterns detected yet...';
        return;
    }
    
    patternsList.innerHTML = data.patterns
        .map(p => '<div class="pattern"><strong>' + p.type + '</strong> (Confidence: ' + 
                  (p.confidence * 100).toFixed(1) + '%)<br>' + p.description + '</div>')
        .join('');
}

// Initial update
updateDashboard();
`;

    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(js);
  }

  /**
   * Serve API data endpoint
   */
  private async serveApiData(res: http.ServerResponse): Promise<void> {
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(this.currentData));
  }

  /**
   * Get dashboard URL
   */
  getUrl(): string {
    return `http://localhost:${this.port}`;
  }

  /**
   * Check if dashboard is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

/**
 * Dashboard data structure
 */
interface DashboardData {
  generations: GenerationMetrics[];
  currentGeneration: number;
  totalScore: number;
  patterns: Pattern[];
  telemetryStats: TelemetryStats;
}

interface GenerationMetrics {
  generation: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  runsCompleted?: number;
  patterns?: number;
  timestamp?: number;
}

interface TelemetryStats {
  totalSessions: number;
  successfulSessions: number;
  averageToolsPerSession: number;
  mostUsedTools: { tool: string; count: number; }[];
}

/**
 * Create and start evolution dashboard
 */
export async function createEvolutionDashboard(port?: number): Promise<EvolutionDashboard> {
  const dashboard = new EvolutionDashboard(port);
  await dashboard.start();
  return dashboard;
}

/**
 * Dashboard integration utilities
 */
export class DashboardIntegration {
  private dashboard?: EvolutionDashboard;
  
  /**
   * Initialize dashboard if enabled
   */
  async initialize(config: any): Promise<void> {
    if (config.dashboard?.enabled) {
      console.log('🌐 Initializing Evolution Dashboard...');
      this.dashboard = await createEvolutionDashboard(config.dashboard.port);
      console.log(`📊 Dashboard available at: ${this.dashboard.getUrl()}`);
    }
  }
  
  /**
   * Update dashboard with generation results
   */
  updateGeneration(result: GenerationResult): void {
    if (this.dashboard) {
      this.dashboard.updateGeneration(result);
    }
  }
  
  /**
   * Update dashboard with telemetry data
   */
  updateTelemetry(sessions: TelemetrySession[]): void {
    if (this.dashboard) {
      this.dashboard.updateTelemetryStats(sessions);
    }
  }
  
  /**
   * Update dashboard with pattern analysis
   */
  updatePatterns(patterns: Pattern[]): void {
    if (this.dashboard) {
      this.dashboard.updatePatterns(patterns);
    }
  }
  
  /**
   * Shutdown dashboard
   */
  async shutdown(): Promise<void> {
    if (this.dashboard) {
      await this.dashboard.stop();
      this.dashboard = undefined;
    }
  }
  
  /**
   * Get dashboard URL if running
   */
  getUrl(): string | null {
    return this.dashboard?.getUrl() || null;
  }
}
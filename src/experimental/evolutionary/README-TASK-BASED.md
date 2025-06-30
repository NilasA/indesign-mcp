# Task-Based Evolutionary Testing

This document explains how to use the simplified Task-based approach for evolutionary testing.

## ⚠️ ES Module Project Warning

**This is an ES module project.** Use the correct execution patterns:

✅ **CORRECT:**
- `npm run evol-repl`
- `npx tsx src/experimental/evolutionary/runEvolutionTest.ts`

❌ **WRONG:**
- `node -e "require('./dist/src/...)"` (CommonJS fails on ES modules)

## Overview

The evolutionary testing system uses Claude Code's Task tool to spawn real Task agents that attempt to recreate layouts in InDesign. Claude Code then analyzes their behavior patterns and suggests improvements to the MCP tool descriptions.

## Key Components

1. **TaskBasedRunner** - Manages the testing workflow and telemetry collection
2. **PatternAnalyzer** - Detects patterns in Task agent behavior
3. **ClaudeAnalyzer** - Formats patterns for Claude Code's analysis
4. **ToolModifier** - Applies improvements to tool descriptions

## How to Run Evolution

### Step 1: Initialize the System

```typescript
import { createTaskBasedRunner } from './taskBasedRunner.js';
import { PatternAnalyzer } from './patternAnalyzer.js';
import { ClaudeAnalyzer } from './claudeAnalyzer.js';

const runner = createTaskBasedRunner();
const patternAnalyzer = new PatternAnalyzer();
const claudeAnalyzer = new ClaudeAnalyzer();

await runner.initialize();
```

### Step 2: Configure the Test

```typescript
const config = {
  testCase: 'book-page',
  agentCount: 3,
  generation: 1,
  maxGenerations: 5,
  targetScore: 85,
  improvementThreshold: 5,
  referenceMetrics: { /* loaded from reference */ },
  referenceImage: 'path/to/reference.jpg',
  referenceDescription: 'A professional book page with heading and body text'
};
```

### Step 3: Run Task Agents

For each agent, Claude Code will:

1. **Prepare the prompt**:
```typescript
const prompt = runner.createTaskPrompt(config, 'agent-1');
```

2. **Use Task tool** (Claude Code does this):
```
Task("Recreate layout", prompt)
```

3. **Collect results**:
```typescript
const telemetry = await runner.collectTaskTelemetry('agent-1');
const run = await runner.processTaskResult('agent-1', telemetry, config);
```

### Step 4: Analyze Patterns

After running all agents:

```typescript
const patterns = patternAnalyzer.analyzePatterns(runs);
const report = await claudeAnalyzer.formatPatternAnalysis(
  runs,
  patterns,
  config.referenceImage,
  config.testCase
);
console.log(report);
```

### Step 5: Generate Improvements

Claude Code analyzes the report and suggests improvements like:

```typescript
const improvement = {
  tool: 'create_paragraph_style',
  type: 'description',
  field: 'font_size',
  current: 'Font size in points',
  proposed: 'Font size in points (headlines 18-30pt, body 9-12pt)',
  rationale: 'Agents consistently undersize fonts by 20-30%',
  expectedImpact: 0.7
};
```

### Step 6: Apply and Test

Apply the improvement and run another generation to test effectiveness.

## Example Workflow

See `example-task-workflow.ts` for a complete example of how Claude Code would orchestrate the evolution process.

## Key Differences from Original Design

1. **Real Agents**: Uses Task tool instead of simulations
2. **Direct Analysis**: Claude Code analyzes patterns, no API needed
3. **Interactive**: Semi-automated with Claude Code driving
4. **Free**: No external API costs

## Debug Logging

The evolutionary testing system includes comprehensive debug logging controlled by environment variables:

### Debug Categories
```bash
DEBUG_EVOLUTION=true     # Evolution orchestration (recommended)
DEBUG_TELEMETRY=true     # Telemetry system details
DEBUG_PATTERNS=true      # Pattern analysis details
DEBUG_AGENT=true         # Agent execution details
DEBUG_TESTING=true       # Test execution details
DEBUG_VALIDATION=true    # Validation warnings
DEBUG_EXAMPLES=true      # Example workflow output
DEBUG_ALL=true           # Enable all debug output
```

### Usage Examples
```bash
# Basic evolution debugging
DEBUG_EVOLUTION=true npm run evol-repl

# Full debug output
DEBUG_ALL=true npm run evol-repl

# Telemetry troubleshooting
DEBUG_TELEMETRY=true DEBUG_EVOLUTION=true npm run evol-repl
```

### Debug Output Control
- **Default**: Only critical progress messages shown
- **With DEBUG_EVOLUTION**: Detailed workflow steps
- **With DEBUG_ALL**: Complete verbose output
- **Without debug flags**: Clean, minimal output

## Tips for Success

1. Run agents sequentially (InDesign constraint)
2. Reset InDesign state between agents
3. Focus on high-impact patterns
4. Test improvements before committing
5. Document rationale for each change
6. Use `DEBUG_EVOLUTION=true` for troubleshooting
7. Check telemetry health before running agents
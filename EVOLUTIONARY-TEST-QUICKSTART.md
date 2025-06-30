# Evolutionary Testing Quick Start Guide for Claude Code

## Overview
This guide provides step-by-step instructions for running the evolutionary testing system to improve InDesign MCP tool descriptions based on empirical LLM behavior.

## Prerequisites
1. InDesign must be running with a document open
2. MCP server built and ready (`npm run build`)
3. Reference images in `tests/decision-analysis/reference-images/`
4. You must be Claude Code (only Claude Code can use the Task tool)

## Quick Start Commands

### 1. Build and Start the MCP Server
```bash
# Build the project
npm run build

# Start the MCP server WITHOUT telemetry enabled (in a separate terminal)
npm start
```

**Important**: The server starts with telemetry OFF by default. Task agents will enable it themselves using the `set_environment_variable` tool. This ensures telemetry capture works correctly.

## ⚠️ CRITICAL: Timeout Configuration

**Before running any evolution commands**, you MUST configure proper timeouts:

### **Problem**: Default timeout mismatch causes failures
- Claude Code's bash commands timeout after **2 minutes**
- Evolution system needs **5+ minutes** (3-4 min Task agents + 2 min processing)
- **Result**: Process killed before completion, invalid test results

### **Solution**: Set longer timeouts
```bash
# Use gtimeout for proper timeout handling on macOS
gtimeout 7m node -e "your evolution command here"

# Alternative: Use the provided script with built-in timeout handling
chmod +x run-evolution-test.sh && ./run-evolution-test.sh
```

### **Expected Timings**
- **Task Agent Runtime**: 3-4 minutes each
- **Telemetry Wait**: Up to 5 minutes
- **Processing Time**: 1-2 minutes
- **Total per Agent**: 6-7 minutes maximum
- **Full Generation (3 agents)**: 20+ minutes

### **Warning Signs**
- Command timeouts after exactly 2 minutes → timeout configuration issue
- "No telemetry found" errors → process was killed before completion
- Missing session files → evolution process died early

## 🔄 CRITICAL: Single Evolution Instance Rule

**Process Management Requirements**:

### **Problem**: Multiple competing evolution instances
- Running multiple `node -e` commands creates competing processes
- Each overwrites `process.env.EVOLUTION_SESSION_ID`
- Results in session confusion and telemetry failures

### **Solution**: Single long-lived evolution instance
```bash
# ✅ CORRECT: One background MCP server + one evolution controller
Terminal 1: npm start                    # MCP server (background)
Terminal 2: node -i run-evolution.js     # Interactive evolution controller

# ❌ WRONG: Multiple node processes competing
node -e "evolution command 1"
node -e "evolution command 2"  # Overwrites session ID!
node -e "evolution command 3"  # More confusion!
```

### **Best Practice**: Use Interactive Controller
1. Create one `InteractiveEvolution` instance
2. Reuse it for the entire generation
3. Use `saveProgress()` / `loadProgress()` for persistence
4. Never spawn multiple evolution processes simultaneously

### **Recovery from Interruptions**
```typescript
// Save progress before long-running operations
await evolution.saveProgress('generation1.json');

// If interrupted, reload state
const evolution = new InteractiveEvolution();
await evolution.loadProgress('generation1.json');
console.log(await evolution.getProgress());
```

### 2. Run Evolution Test with REPL Interface

Instead of multiple short-lived `node -e` commands that lose state, use the persistent REPL interface:

#### Start the Evolution REPL
```bash
npm run evol-repl
```

This creates a single, long-lived Node process with the `InteractiveEvolution` instance available as `evo`.

#### Initialize the Evolution System
```javascript
await evo.initialize('book-page', 3); // 3 agents per generation
```

#### Start a Generation
```javascript
await evo.startGeneration();
console.log(await evo.getProgress());
```

#### Run Task Agents
For each agent in the generation:
```javascript
// Get the next agent prompt
const { prompt, sessionId, agentId, isLastAgent } = await evo.getNextAgentPrompt();
console.log(`Running ${agentId}...`);

// Copy the prompt and run it with the Task tool in Claude Code
console.log("═".repeat(50));
console.log("TASK PROMPT:");
console.log(prompt);
console.log("═".repeat(50));

// After the Task agent completes (3-4 minutes), process the results
const result = await evo.processAgentCompletion(sessionId);
console.log(`Score: ${result.score}%`);

// Continue with next agent unless this was the last one
if (!isLastAgent) {
  console.log('Document reset for next agent. Continue...');
}
```

#### Analyze Generation Results
After all agents complete:
```javascript
const { patterns, report, averageScore } = await evo.analyzeGeneration();
console.log(`Average score: ${averageScore}%`);
console.log(`Patterns found: ${patterns.length}`);

// View the detailed report
console.log(report);
```

#### Generate and Apply Improvements
```javascript
// Get improvement suggestions
const improvements = await evo.suggestImprovements();

// Select and apply an improvement (Claude Code decides which one)
const selectedImprovement = improvements[0]; // Example: first suggestion
await evo.applyImprovement(selectedImprovement);

// Commit the change using git
// git add -A && git commit -m "Improve font_size description based on evolution testing"
```

#### Continue to Next Generation
```javascript
// Move to next generation
await evo.nextGeneration();

// Start the new generation
await evo.startGeneration();
// ... repeat the agent process
```

## Complete Example Session

Here's a full example of running one generation using the REPL:

```bash
# 1. Start REPL
npm run evol-repl

# (If this is a fresh clone run `npm run build` once first so TypeScript paths resolve)

# 2. In the REPL:
await evo.initialize('book-page', 3)
await evo.startGeneration()

# 3. Run 3 agents
for (let i = 0; i < 3; i++) {
  const { prompt, sessionId, agentId } = await evo.getNextAgentPrompt();
  console.log(`Running ${agentId}...`);
  console.log("PROMPT FOR TASK TOOL:");
  console.log(prompt);
  
  // Copy prompt to Task tool in Claude Code, wait for completion
  // Then process results:
  const result = await evo.processAgentCompletion(sessionId);
  console.log(`${agentId} score: ${result.score}%`);
}

# 4. Analyze patterns
const { patterns, report, averageScore } = await evo.analyzeGeneration();
console.log(`Generation 1 average: ${averageScore}%`);

# 5. Apply improvements and continue...
```

## State Management

### Save Progress
```typescript
// Save current state before interruption
await evolution.saveProgress('evolution-gen1-progress.json');
```

### Resume Progress
```typescript
// In a new session, load previous state
const evolution = new InteractiveEvolution();
await evolution.loadProgress('evolution-gen1-progress.json');
console.log(await evolution.getProgress());

// Continue where you left off
const { prompt, sessionId } = await evolution.getNextAgentPrompt();
```

## Why REPL Interface?

The previous approach using multiple `node -e` commands created separate processes that lost the `InteractiveEvolution` state between operations. The REPL interface maintains a single, persistent Node process with the evolution instance in memory, solving the "Evolution system not initialized" errors.

## Important Notes

### Telemetry System
- **Dynamic Enable**: Task agents can enable telemetry mid-session using `set_environment_variable` tool
- **Always Wrapped**: All tools are pre-wrapped with telemetry, enabling runtime control
- **Session Coherence**: Each Task agent gets a unique session ID via environment variable
- **File-Based**: Telemetry writes to JSONL files in `${os.tmpdir()}/evolution_tests/telemetry/` (e.g., `/tmp` on macOS/Linux or `%TEMP%` on Windows)
- **Automatic Cleanup**: Files older than 24 hours are cleaned up automatically
- **Retry Logic**: Writes retry 3 times with exponential backoff on failure
- **Timeout**: Default 5 minutes wait for Task completion (configurable via TELEMETRY_WAIT_TIMEOUT)

### InDesign State Management
- **Sequential Execution**: Agents must run one at a time (InDesign constraint)
- **Document Reset**: Document is cleared between agents
- **Safe Reset**: Creates new document if none exists
- **State Preservation**: Each agent's final state is saved as `.indd` file

### Pattern Detection
- **Minimum Frequency**: Patterns must occur in at least 2 agents
- **Confidence Threshold**: 60% confidence required
- **Types Detected**:
  - Tool sequences (order of tool usage)
  - Parameter patterns (common parameter values)
  - Error patterns (repeated failures)
  - Visual deviations (consistent differences from reference)

## 🚨 When Things Go Wrong: Error Recovery Procedures

### **Critical Rule: NEVER Skip processAgentCompletion()**
- `processAgentCompletion()` contains the document reset logic
- Skipping it causes document contamination between agents
- Even if telemetry fails, this method has robust fallback logic
- **Always let the system complete its full workflow**

### **Timeout Errors**
**Symptoms**: "Command timed out after 2m 0.0s"
**Cause**: Bash timeout too short for evolution process
**Solutions**:
1. **Use longer timeout**: `timeout 7m node -e "your command"`
2. **Check if process is still running**: Evolution may continue in background
3. **Look for telemetry files**: Process may have completed despite timeout message
4. **Use saveProgress()**: Before long operations, save state for recovery

### **Telemetry Collection Failures**
**Symptoms**: "No telemetry data found", missing session files
**Diagnosis Steps**:
1. Check Task agent called `set_environment_variable` and `telemetry_end_session`
2. Verify environment variables: `echo $EVOLUTION_SESSION_ID`
3. Check telemetry directory: `ls -la ${os.tmpdir()}/evolution_tests/telemetry/`
4. Look for session ID pattern in filenames

**Recovery**:
- System has robust fallback telemetry creation
- Document analysis provides synthetic telemetry
- **Still call processAgentCompletion()** for document reset

### **Multiple Process Confusion**
**Symptoms**: Session ID mismatches, competing processes
**Cause**: Multiple `node -e` commands running simultaneously
**Solution**:
1. Kill all node processes: `pkill -f "node -e"`
2. Use single evolution instance approach
3. Check `process.env.EVOLUTION_SESSION_ID` consistency

### **Document Contamination**
**Symptoms**: Later agents see content from previous agents
**Cause**: Document reset was skipped or failed
**Prevention**:
- Always use `processAgentCompletion()` workflow
- Never run agents without document reset
- Verify reset success before next agent

**Recovery**:
```typescript
// Manual document reset if needed
await mcpBridge.resetDocument();
console.log('Document manually reset');
```

### **State Recovery from Interruptions**
```typescript
// If evolution was interrupted, resume from saved state
const evolution = new InteractiveEvolution();
await evolution.loadProgress('generation1.json');

// Check current status
console.log(await evolution.getProgress());

// Continue from where you left off
const { prompt, sessionId } = await evolution.getNextAgentPrompt();
```

## Troubleshooting

### "No document open in InDesign"
**Solution**: Open any document in InDesign before running tests

### "Telemetry session not found"
**Cause**: Task agent didn't call `telemetry_end_session` or took longer than timeout
**Solution**: 
- Check Task agent completed successfully
- Use new timeout configuration: `TELEMETRY_WAIT_TIMEOUT=600000` (10 minutes)

### "Failed to get evolutionary test config"
**Info**: This warning is normal outside test context - telemetry falls back to `./telemetry` directory

### "Document reset failed"
**Solution**: Manually create a new document in InDesign

## Example Full Session

```bash
# Terminal 1: Start MCP server
npm start

# Terminal 2: Claude Code runs evolution test
npx tsx src/experimental/evolutionary/runEvolutionTest.ts
# This command will run for 15-20 minutes total!
# Claude Code must:
# 1. Immediately expand output with ctrl+r
# 2. Watch for agent prompts in real-time
# 3. Launch Task agents QUICKLY when prompts appear
# 4. Continue monitoring while Task agents run
# 5. Repeat for all 3 agents
# 6. Only then will pattern analysis appear
```

## Configuration Options

Edit `src/experimental/evolutionary/config.ts` to adjust:
- `defaultAgentCount`: Number of agents per generation (default: 3)
- `defaultTargetScore`: Target accuracy score (default: 85%)
- `defaultTimeoutMs`: Task agent timeout (default: 2 minutes)
- `telemetryDir`: Where telemetry files are stored

## Next Steps

1. Run initial baseline (Generation 1)
2. Identify top 3 failure patterns
3. Apply one improvement at a time
4. Test each improvement thoroughly
5. Document successful improvements
6. Repeat until target score achieved

Remember: The goal is to make the MCP tools more intuitive for LLMs to use correctly without extensive prompting.
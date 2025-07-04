# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# InDesign MCP Server

## 🎯 Project Overview
Building an **AI-driven InDesign automation platform** using TypeScript MCP (Model Context Protocol) server that bridges LLMs with Adobe InDesign via ExtendScript.

**Current State**: Production-ready TypeScript MCP with 52 working tools + foundational resources/prompts
**Goal**: Complete agentic workflow platform for two MVP scenarios:
1. **Copy-Design** – Recreate reference page layouts from images
2. **Add-Content** – Flow new text into existing documents while preserving design

## 📌 Current Development Focus
All core functionality is complete. Current challenge: **Improving LLM Decision-Making**

### Primary Challenge
**LLM Tool Usage Optimization**: While all MCP tools execute successfully, LLMs often make poor strategic decisions about which tools to use, when to use them, and with what parameters. This results in layouts that diverge from reference images despite technical success.

**Important Context**: We use minimal Task agent prompts to expose MCP deficiencies. However, we must acknowledge that:
- Some tasks may be fundamentally impossible without prompt engineering
- The MCP might have inherent limitations that can't be overcome
- Low scores don't necessarily mean the system is broken
- Success might require accepting some level of additional context

The goal is to push the MCP as far as possible while being realistic about constraints.

### Active Work Areas
1. **Evolutionary Testing System** (✅ Complete - Task-based): Built infrastructure using Claude Code's Task tool
2. **Pattern Analysis** (✅ Complete): Algorithms to identify common failure patterns in tool usage
3. **Improvement Generation** (✅ Complete): Claude Code directly analyzes patterns and proposes improvements
4. **Evolution Loop** (✅ Complete): Semi-automated testing with Claude Code orchestration

## 📁 Project Structure
```
indesign-mcp/                    # Main TypeScript MCP project
├── src/
│   ├── index.ts                 # Server entry point
│   ├── extendscript.ts          # AppleScript-ExtendScript bridge
│   ├── types.ts                 # TypeScript type definitions
│   ├── tools/                   # Tool implementations (8 categories)
│   │   ├── telemetry.ts         # Telemetry capture system
│   │   ├── telemetryPersistence.ts  # Telemetry file storage
│   │   └── telemetryServer.ts   # Telemetry-enabled server
│   └── prompts/                 # Strategic workflow prompts
├── src/experimental/
│   └── evolutionary/            # Evolutionary testing system (Task-based)
│       ├── taskBasedRunner.ts   # Task tool integration
│       ├── patternAnalyzer.ts   # Pattern detection
│       ├── claudeAnalyzer.ts    # Claude Code analysis
│       └── example-task-workflow.ts  # Usage example
├── docs/                        # Documentation and API references
│   └── InDesign ExtendScript_API_Adob_InDesign_2025/  # Complete InDesign API docs
├── dist/                        # Compiled JavaScript
└── package.json                 # Dependencies & scripts
```

## ⚠️ IMPORTANT: ES Module Project

This project uses ES modules (`"type": "module"` in package.json). 

**✅ CORRECT Command Patterns:**
- `npx tsx run-evolution-claude-code.ts` (Real Mode evolution testing - must run in Claude Code)
- `npm run build && npm start` (MCP server startup)
- `npm run lint && npm run typecheck` (validation)

**❌ INCORRECT - DO NOT USE:**
- `node -e "const x = require('./dist/...)"` (CommonJS require fails)
- `require('./dist/src/experimental/...)` (wrong path + CommonJS)
- Direct `node` execution of dist files without import()

**Common Error**: If you see `Cannot find module './dist/src/...'`, you're using CommonJS syntax on ES modules.

## Development Commands

```bash
# Build and run
npm run build        # Compile TypeScript to dist/
npm start           # Run MCP server (uses tsx)
npm run dev         # Development mode with watch

# Testing and validation
npm test            # Run unit tests with Jest
npm run lint        # Run ESLint on TypeScript files
npm run lint:fix    # Auto-fix ESLint issues

# Validation
npm run build && npm start    # Validate compilation and server startup

# Evolutionary Testing (Real Mode)
npx tsx run-evolution-claude-code.ts  # Setup script for Claude Code orchestration

# Legacy Simulation Commands (DO NOT USE for real testing)
npm run evolve:complete    # Simulation mode only - no real InDesign interaction

# Debug flags for setup script
DEBUG_EVOLUTION=true npx tsx run-evolution-claude-code.ts   # Evolution workflow details
DEBUG_TELEMETRY=true npx tsx run-evolution-claude-code.ts   # Telemetry system debugging  
DEBUG_ALL=true npx tsx run-evolution-claude-code.ts         # Complete verbose output
```

## 📋 Git Workflow

### Current Setup
- **Repository**: `indesign-mcp` on GitHub
- **Main Branch**: `main` (52 working tools)
- **Development**: Feature branches for tier implementation

### Branch Strategy
```bash
# Create feature branch for new implementation
git checkout -b tier1-export-import
git commit -m "Start Tier 1: Document Export/Import implementation"

# Regular commits during development
git add .
git commit -m "Implement [tool1, tool2, tool3] - Tier 1 batch 1"

# Merge when tier is complete
git checkout main
git merge tier1-export-import
git push origin main
```

### Commit Conventions
- **Feature**: `"Implement [tool_names] - Tier X batch Y"`
- **Fix**: `"Fix threading tool error handling"`
- **Refactor**: `"Refactor ExtendScript template generation"`
- **Test**: `"Add integration tests for export tools"`

## Architecture Overview

This MCP server bridges AI assistants with Adobe InDesign via **ExtendScript automation through AppleScript**. Key architectural components:

### Core Flow
1. **MCP Tool Call** → TypeScript handler in `src/tools/*/index.ts`
2. **ExtendScript Generation** → Template literals create JSX code
3. **AppleScript Execution** → `src/extendscript.ts` runs JSX via AppleScript
4. **InDesign Processing** → ExtendScript manipulates document
5. **Result Return** → JSON response back through MCP

### Critical Technical Constraints

**ExtendScript Stability Requirements**:
- **String Building**: Use `array.join()`, never `+=` concatenation
- **Boolean Conversion**: TypeScript `true`/`false` → ExtendScript `"true"`/`"false"` strings
- **Newline Escaping**: Use `\\\\n` in template literals (double-escaped)
- **Error Handling**: Wrap all ExtendScript in try/catch blocks

**TypeScript MCP Patterns**:
- **Tool Registration**: `server.tool(name, description, schema, handler)`
- **Type Safety**: All parameters defined in `src/types.ts` interfaces
- **Async Execution**: All handlers use `async/await` with proper error handling

**Telemetry Architecture**:
- **Always-Wrapped Tools**: All tools are pre-wrapped with telemetry capability
- **Runtime Control**: Telemetry can be dynamically enabled/disabled via `set_environment_variable`
- **Zero Overhead**: When disabled, telemetry wrapper adds only one boolean check per tool call
- **File-Based Capture**: Telemetry writes to JSONL files for evolutionary testing analysis

### Testing Requirements
- Test each tool with empty document and complex document
- Verify no regressions in existing 52 tools
- Integration testing for cross-tool workflows

## 🧪 Testing Strategy

### Integration Testing (Primary Focus)
**Manual Test Protocol** (after each 3-tool batch):
1. **Tool Functionality**: Each new tool with valid parameters
2. **Error Handling**: Invalid parameters, empty documents
3. **Regression Check**: Quick test of 3-4 existing tools
4. **Cross-Tool Flow**: Test tools that work together

### Test Document Requirements
Keep these test documents ready:
- **Empty document**: New InDesign file
- **Simple content**: 1-2 pages with text and basic formatting
- **Complex document**: Multi-page with threading, styles, images

### Error Threshold Guidelines

**Continue Debugging When**:
- Single tool fails but others in batch work
- ExtendScript syntax errors (fixable patterns)
- Type errors caught by TypeScript compiler
- Parameter validation issues

**Stop and Ask When**:
- Multiple tools in same batch fail with similar errors
- Server won't start/compile after changes
- Fundamental architecture questions arise
- ExtendScript execution consistently times out
- Breaking changes affect existing tools

**Time-Based Threshold**:
- Single tool debugging: 15 minutes max
- Batch-level issues: 30 minutes max
- Architecture problems: Stop immediately

### InDesign Version
- **Target**: Latest InDesign version (currently running locally)
- **Compatibility**: Focus on current version, expand later if needed

## 📊 Implementation Status

### ✅ Completed (52 tools)
- **Text Tools** (4): add_text, update_text, remove_text, get_document_text
- **Style Tools** (8): paragraph/character style management, text selection
- **Layout Tools** (3): text frame positioning, creation, and info
- **Page Tools** (4): page management, dimensions
- **Special Tools** (4): layers, tables, special characters, status
- **Threading/Flow Tools** (7): text threading, overset resolution, flow management, close_document
- **Export/Import Tools** (6): document export, save, import content, place files, preview
- **Transform Tools** (3): object transformation, duplication, alignment

### 🎯 Current Priority: LLM Decision-Making Optimization
1. **Automated testing loops**: Reduce manual validation overhead
2. **Decision pattern analysis**: Identify common LLM mistakes in tool usage
3. **Enhanced validation rules**: Catch layout problems before they cascade
4. **Prompt refinement**: Guide LLMs toward better strategic decisions

### Future Enhancements
Focus areas for potential expansion:
1. **Advanced Text Operations**: find/replace, spell check, typography
2. **Image Management**: image processing, effects, color management
3. **Print Production**: color separation, preflighting, packaging

### 📋 Documentation Guide
- **InDesign API Reference** (`docs/InDesign ExtendScript_API_Adob_InDesign_2025/`): Complete Adobe InDesign 2025 ExtendScript API documentation for method signatures, parameters, and examples

## ⚡ Quick Reference

### Start Development Session
```bash
npm run build && npm start
# Ensure InDesign is running with a document open
```

### Before Implementing New Tools
1. Read both documentation files for context
2. Review existing tool patterns in `src/tools/*/index.ts`
3. Create feature branch
4. Implement in 3-tool batches
5. Test thoroughly before committing

### Key Files to Understand

**Core Infrastructure**:
- `src/index.ts` - MCP server entry point and configuration
- `src/tools/index.ts` - Central tool registration (8 categories)
- `src/prompts/index.ts` - Strategic workflow prompts for intelligent automation
- `src/extendscript.ts` - AppleScript→ExtendScript bridge with app detection
- `src/types.ts` - TypeScript interfaces for all tool parameters

**Tool Implementation Pattern** (examine for new tools):
- `src/tools/text/index.ts` - Complete tool category example with 4 tools
- `src/tools/export/index.ts` - Recent Tier 1 implementation patterns

**Tool Categories** (organized in `src/tools/`):
- `text/` - Core text manipulation (4 tools)
- `styles/` - Character/paragraph styles (7 tools) 
- `layout/` - Text frame positioning (2 tools)
- `pages/` - Page management (3 tools)
- `special/` - Layers, tables, special chars (4 tools)
- `utility/` - Threading, flow management (6 tools + telemetry_end_session)
- `export/` - Document export/import (6 tools) 
- `transform/` - Object transformation (3 tools)
- `composite/` - High-level workflow tools (3 tools)
- `analysis/` - Decision tracking and metrics (4 tools)

## 🔄 Development Cycle
1. **Plan**: Select 3 tools from priority list
2. **Implement**: Follow TypeScript patterns, 15-20 min
3. **Test**: Build, restart server, validate tools, 10 min
4. **Commit**: Document working state
5. **Repeat**: Move to next 3 tools

## 🧬 Evolutionary Testing System

### Overview
The evolutionary testing system automatically improves MCP tool descriptions based on empirical observation of LLM behavior. It runs multiple agents, captures telemetry, analyzes patterns, and evolves better tool descriptions.

### Current Status
- **Phase 1-5**: ✅ Complete
- **Architecture**: Simplified Task-based approach using Claude Code
- **Cost**: Zero API costs - uses Task tool only
- **O3 Fixes**: ✅ All critical issues resolved (config fallback, document safety, telemetry robustness)
- **Telemetry Architecture**: ✅ Fixed dynamic enable/disable capability with always-wrapped tools

### Debug Flags
The evolutionary testing system supports granular debug logging:

```bash
DEBUG_EVOLUTION=true     # Evolution orchestration details (recommended for troubleshooting)
DEBUG_TELEMETRY=true     # Telemetry system debugging (capture, sessions, health)
DEBUG_PATTERNS=true      # Pattern analysis details (frequency, confidence, examples)
DEBUG_AGENT=true         # Agent execution details (prompts, responses, timing)
DEBUG_TESTING=true       # Test execution output (validation, scoring, metrics)
DEBUG_VALIDATION=true    # Validation warnings (config issues, missing files)
DEBUG_EXAMPLES=true      # Example workflow output (demo scripts, tutorials)
DEBUG_ALL=true           # Enable all debug categories
```

**Usage Examples:**
- Basic troubleshooting: `DEBUG_EVOLUTION=true npx tsx run-evolution-claude-code.ts`
- Telemetry issues: `DEBUG_TELEMETRY=true npx tsx run-evolution-claude-code.ts`
- Full debugging: `DEBUG_ALL=true npx tsx run-evolution-claude-code.ts`
- Clean output: `npx tsx run-evolution-claude-code.ts` (default - minimal output)

### Quick Start Guides
For running the evolutionary testing system:
- **Quick Start Guide**: `EVOLUTION-QUICK-START.md` - Complete Real Mode workflow instructions
- **Important**: Must run inside Claude Code CLI for real testing (not simulation mode)

### Key Components
- **Telemetry**: Captures all tool calls with parameters (now with retry logic and queue management)
- **SubAgents**: Uses Task tool to run real Claude instances
- **Pattern Analysis**: Identifies common failure patterns
- **Claude Code Analysis**: Direct pattern interpretation and improvement generation

### Usage (Real Mode)
1. **Claude Code Required**: Must run from Claude Code CLI, not standalone Node.js
2. **Setup**: `npx tsx run-evolution-claude-code.ts` to initialize
3. **Orchestration**: Claude Code uses Task tool to spawn real agents
4. **Reference**: Follow `EVOLUTION-QUICK-START.md` for complete workflow

### **⚠️ Critical Operational Requirements**
- **Claude Code Environment**: Evolution testing only works in Claude Code CLI, not standalone Node.js
- **Real vs Simulation Mode**: `npm run evolve:complete` = simulation (fake data), Claude Code orchestration = real testing
- **Fixed CLI Bug**: Updated `run-evolution-claude-code.ts` removes global assignment that crashed Claude Code CLI
- **Task Tool Required**: Real agents spawn via Claude Code's Task tool, not subprocess hooks

### **Quick Troubleshooting**
- **"Not running in Claude Code environment"** → Using simulation mode, must run from Claude Code CLI
- **Claude Code CLI crashes** → Use fixed `run-evolution-claude-code.ts` (removes global assignment bug)
- **No InDesign activity** → Verify Real Mode (Claude Code orchestration), not simulation
- **Setup script completes but no agents** → Claude Code should use Task tool with displayed prompt

**Note on Minimal Prompts**: Task agents receive only "Recreate this academic book page layout in InDesign using the available MCP tools" plus a reference. This intentionally minimal approach:
- Avoids telling agents they're being tested (Hawthorne effect)
- Exposes true MCP usability issues without masking them
- Tests natural tool discovery without hand-holding
- Reveals where the MCP needs improvement

## 🚀 Running Evolution Tests (Quick Command)

For Claude Code to run a complete evolution test, use this exact prompt:

> "Please run the evolution test following the EVOLUTION-QUICK-START.md guide. Start with the setup script, then spawn 3 agents per generation for 3 generations, analyzing patterns between each generation."

Claude Code will automatically:
1. Run `npx tsx run-evolution-claude-code.ts` setup script
2. Use Task tool to spawn real agents with the displayed prompt
3. Monitor InDesign document changes and capture telemetry
4. Analyze patterns between generations
5. Report final recommendations for MCP tool improvements

This guide provides Claude Code with essential project context for continuing InDesign MCP development efficiently.
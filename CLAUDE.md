# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# InDesign MCP Server

## 🎯 Project Overview
We're expanding a **TypeScript InDesign MCP server** from 34 working tools to comprehensive InDesign automation coverage (60+ tools across 4 tiers).

**Current State**: Fully functional TypeScript MCP with 34 working tools across 8 categories  
**Goal**: Complete InDesign automation platform covering document export, page properties, object transformation, advanced text operations, and more.

## 📁 Project Structure
```
indesign-mcp/                    # Main TypeScript MCP project
├── src/
│   ├── index.ts                 # Server entry point
│   ├── extendscript.ts          # AppleScript-ExtendScript bridge
│   ├── types.ts                 # TypeScript type definitions
│   └── tools/                   # Tool implementations (8 categories)
├── dist/                        # Compiled JavaScript
└── package.json                 # Dependencies & scripts

archive/                         # Archived Python version
└── python-indesign-mcp/        # Original Python implementation

docs/                            # Documentation and API references
└── InDesign ExtendScript_API_Adob_InDesign_2025/  # Complete InDesign API docs

```

## Development Commands

```bash
# Build and run
npm run build        # Compile TypeScript to dist/
npm start           # Run MCP server (uses tsx)
npm run dev         # Development mode with watch

# Validation
npm run build && npm start    # Validate compilation and server startup
```

**Note**: No `npm run lint` or test commands currently configured in package.json.

## 📋 Git Workflow

### Current Setup
- **Repository**: `indesign-mcp` on GitHub
- **Main Branch**: `main` (34 working tools)
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

### Testing Requirements
- Test each tool with empty document and complex document
- Verify no regressions in existing 34 tools
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

### ✅ Completed (34 tools)
- **Text Tools** (4): add_text, update_text, remove_text, get_document_text
- **Style Tools** (8): paragraph/character style management, text selection
- **Layout Tools** (3): text frame positioning, creation, and info
- **Page Tools** (4): page management, dimensions
- **Special Tools** (4): layers, tables, special characters, status
- **Threading/Flow Tools** (6): text threading, overset resolution, flow management
- **Export/Import Tools** (5): document export, save, import content, place files
- **Transform Tools** (3): object transformation, duplication, alignment

### 🎯 Next Priority: Tier 2+ (26+ remaining tools)
Focus areas for continued expansion:
1. **Advanced Text Operations**: find/replace, spell check, typography
2. **Image Management**: image processing, effects, color management
3. **Print Production**: color separation, preflighting, packaging
4. **Interactive Elements**: buttons, forms, hyperlinks, bookmarks

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
- `utility/` - Threading, flow management (6 tools)
- `export/` - Document export/import (5 tools) 
- `transform/` - Object transformation (3 tools)

## 🔄 Development Cycle
1. **Plan**: Select 3 tools from priority list
2. **Implement**: Follow TypeScript patterns, 15-20 min
3. **Test**: Build, restart server, validate tools, 10 min
4. **Commit**: Document working state
5. **Repeat**: Move to next 3 tools

This guide provides Claude Code with essential project context for continuing InDesign MCP development efficiently.
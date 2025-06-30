# InDesign MCP Server

An experimental MCP (Model Context Protocol) server for Adobe InDesign automation via ExtendScript. This is a work-in-progress proof of concept that allows AI assistants to interact with InDesign documents.

## Features

Currently implements 52 tools across 10 categories:

- **Text Operations** (4): Add, update, remove, and extract text content
- **Style Management** (7): Create and apply paragraph/character styles, text selection
- **Layout Control** (3): Position and create text frames with enhanced workflow guidance
- **Page Management** (4): Add, remove, inspect pages, get dimensions  
- **Special Features** (4): Insert characters, manage layers, create tables, status
- **Utility Tools** (7): Text threading, overset resolution, flow management, environment control
- **Document Operations** (6): Export, save, import content, place files, preview generation
- **Object Transformation** (3): Transform, duplicate, and align objects
- **Composite Tools** (7): High-level workflow automation and layout operations
- **Analysis Tools** (7): Decision tracking, metrics extraction, and layout comparison

## Requirements

- Node.js 18+
- Adobe InDesign (tested with 2025 v20.3.1)
- macOS (ExtendScript automation via AppleScript)

## Setup

```bash
npm install
npm run build
npm start
```

### Server Startup with Telemetry (for Evolutionary Testing)

Need telemetry for evolutionary tests? Run the server with the handy alias **or** the raw command:

```bash
# Preferred – uses the alias added in package.json
npm run start:telemetry &

# Equivalent manual invocation
TELEMETRY_ENABLED=true EVOLUTION_SESSION_ID=$(date +%s) npm start &
```

The ampersand backgrounds the process; when you are done stop it with `kill %1` (or just press Ctrl-C if you ran it in the foreground).

With telemetry enabled from launch every tool call is logged to `${os.tmpdir()}/evolution_tests/telemetry/<session>.jsonl`, so Task agents no longer need to fiddle with environment variables before the server starts.

## Usage

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "indesign": {
      "command": "node",
      "args": ["/path/to/indesign-mcp/dist/index.js"]
    }
  }
}
```

Make sure InDesign is running with a document open before using the tools.

## Development

```bash
npm run build      # Compile TypeScript
npm start          # Run the server
npm run dev        # Development mode with watch
npm test           # Run unit tests
npm run lint       # Run ESLint
```

## Status

This is an experimental project. Some tools may have limitations or edge cases. Contributions and feedback welcome.

## License

MIT

## Environment Variable Helpers

All runtime configuration is now accessed via the typed helpers in `src/utils/env.ts`.

Example:

```ts
import { ENV, getBool, getInt, getString } from "./src/utils/env.js";

if (ENV.telemetryEnabled()) {
  // ...
}
```

Direct reads of `process.env` have been removed (and are lint-guarded by `node/no-process-env`).
Assignments (e.g. in the Task runner and utility tools) are still allowed and whitelisted with inline eslint comments.

Key variables:

* `TELEMETRY_ENABLED` – turn telemetry capture on/off
* `EVOLUTION_SESSION_ID` – session identifier shared between agents
* `TELEMETRY_SESSION_ID` – fallback session id for non-evolution contexts
* `TELEMETRY_AGENT_ID` – logical agent identifier (defaults to `task-agent`)
* `TELEMETRY_GENERATION` – current generation number (integer)

See `src/utils/env.ts` for the complete list and default values.
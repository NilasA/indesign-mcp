#!/bin/bash

# CI script for running InDesign MCP server with telemetry enabled
# Used in automated testing environments

set -e

echo "Starting InDesign MCP server with telemetry enabled..."

# Set required environment variables for telemetry
export TELEMETRY_ENABLED=true
export EVOLUTION_SESSION_ID=$(date +%s)
export RUN_INDESIGN_TESTS=true

echo "Environment configured:"
echo "  TELEMETRY_ENABLED=${TELEMETRY_ENABLED}"
echo "  EVOLUTION_SESSION_ID=${EVOLUTION_SESSION_ID}"
echo "  RUN_INDESIGN_TESTS=${RUN_INDESIGN_TESTS}"

# Run the server with telemetry enabled via convenience script
npm run start:telemetry
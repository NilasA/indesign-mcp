#!/bin/bash
"""
Evolution Hooks Installation Script

This script installs the Claude Code hooks for evolutionary testing into the 
user's ~/.claude/evolution/ directory and makes them executable.
"""

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directories
HOOKS_SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/hooks" && pwd)"
HOOKS_TARGET_DIR="$HOME/.claude/evolution"

echo -e "${BLUE}🔧 Installing Evolution Hooks${NC}"
echo "Source: $HOOKS_SOURCE_DIR"
echo "Target: $HOOKS_TARGET_DIR"
echo

# Create target directory
echo -e "${YELLOW}📁 Creating target directory...${NC}"
mkdir -p "$HOOKS_TARGET_DIR"

# Copy and install hooks
HOOKS=(
    "task-interceptor.py"
    "telemetry-enhancer.py" 
    "telemetry-collector.py"
    "checkpoint-manager.py"
)

for hook in "${HOOKS[@]}"; do
    source_file="$HOOKS_SOURCE_DIR/$hook"
    target_file="$HOOKS_TARGET_DIR/$hook"
    
    if [[ -f "$source_file" ]]; then
        echo -e "${GREEN}✓${NC} Installing $hook"
        cp "$source_file" "$target_file"
        chmod +x "$target_file"
    else
        echo -e "${RED}✗${NC} Missing $hook in source directory"
        exit 1
    fi
done

# Create telemetry directory
echo -e "${YELLOW}📊 Creating telemetry directory...${NC}"
mkdir -p "$HOME/.claude/telemetry"

# Create archive directory  
echo -e "${YELLOW}🗃️  Creating archive directory...${NC}"
mkdir -p "$HOME/.claude/evolution-archive"

# Verify installation
echo
echo -e "${BLUE}🔍 Verifying installation...${NC}"

all_good=true
for hook in "${HOOKS[@]}"; do
    target_file="$HOOKS_TARGET_DIR/$hook"
    if [[ -f "$target_file" && -x "$target_file" ]]; then
        echo -e "${GREEN}✓${NC} $hook: installed and executable"
    else
        echo -e "${RED}✗${NC} $hook: installation failed"
        all_good=false
    fi
done

# Test Python execution
echo
echo -e "${YELLOW}🐍 Testing Python execution...${NC}"
for hook in "${HOOKS[@]}"; do
    target_file="$HOOKS_TARGET_DIR/$hook"
    if python3 -m py_compile "$target_file" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $hook: Python syntax OK"
    else
        echo -e "${RED}✗${NC} $hook: Python syntax error"
        all_good=false
    fi
done

echo
if $all_good; then
    echo -e "${GREEN}✅ All hooks installed successfully!${NC}"
    echo
    echo -e "${BLUE}📋 Next steps:${NC}"
    echo "1. Run evolutionary testing: npm run evolve:complete"
    echo "2. Enable dashboard: npm run evolve:complete -- --dashboard"  
    echo "3. Debug mode: DEBUG_EVOLUTION=true npm run evolve:complete"
    echo
    echo -e "${YELLOW}💡 Hook files are now in:${NC}"
    echo "   $HOOKS_TARGET_DIR"
    echo
else
    echo -e "${RED}❌ Installation failed!${NC}"
    echo "Please check the errors above and try again."
    exit 1
fi
#!/usr/bin/env python3
"""
MCP Tool Telemetry Enhancement Hook for Claude Code

This hook captures MCP tool calls during Task agent execution for evolutionary testing.
It enhances telemetry with timing, session correlation, and parameter analysis.

Hook Type: PreToolUse  
Matcher: "mcp__indesign__.*"
"""

import json
import sys
import os
import time
from datetime import datetime

def get_session_info():
    """Get current evolution session information"""
    
    session_id = os.environ.get('EVOLUTION_SESSION_ID') or os.environ.get('TELEMETRY_SESSION_ID')
    agent_id = os.environ.get('TELEMETRY_AGENT_ID', 'unknown')
    generation = os.environ.get('TELEMETRY_GENERATION', '0')
    
    return {
        'session_id': session_id,
        'agent_id': agent_id,
        'generation': int(generation) if generation.isdigit() else 0
    }

def enhance_telemetry_capture(tool_call):
    """Enhance tool call with telemetry metadata"""
    
    session_info = get_session_info()
    
    enhanced_call = {
        'timestamp': int(time.time() * 1000),  # milliseconds
        'tool': tool_call.get('name', 'unknown'),
        'parameters': tool_call.get('arguments', {}),
        'session_id': session_info['session_id'],
        'agent_id': session_info['agent_id'],
        'generation': session_info['generation'],
        'capture_source': 'hook_preuse'
    }
    
    return enhanced_call

def write_telemetry_record(enhanced_call):
    """Write telemetry record to JSONL file"""
    
    session_id = enhanced_call.get('session_id')
    if not session_id:
        return
    
    # Write to telemetry directory
    telemetry_dir = os.path.expanduser('~/.claude/telemetry')
    os.makedirs(telemetry_dir, exist_ok=True)
    
    telemetry_file = os.path.join(telemetry_dir, f"{session_id}.jsonl")
    
    try:
        with open(telemetry_file, 'a') as f:
            f.write(json.dumps(enhanced_call) + '\n')
            
        if os.environ.get('DEBUG_TELEMETRY'):
            print(f"📊 Telemetry captured: {enhanced_call['tool']}", file=sys.stderr)
            
    except Exception as e:
        if os.environ.get('DEBUG_TELEMETRY'):
            print(f"❌ Telemetry write error: {e}", file=sys.stderr)

def analyze_tool_usage(tool_name, parameters):
    """Analyze tool usage patterns for evolution insights"""
    
    # Track common parameter patterns
    param_analysis = {
        'parameter_count': len(parameters),
        'has_coordinates': any(key in parameters for key in ['x', 'y', 'width', 'height']),
        'has_text_content': any(key in parameters for key in ['text', 'content', 'description']),
        'has_style_info': any(key in parameters for key in ['style', 'font', 'alignment']),
        'complexity_score': min(len(str(parameters)), 1000) / 100  # 0-10 scale
    }
    
    return param_analysis

def main():
    """Main hook execution"""
    
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        # Extract tool information
        tool_info = input_data.get('tool', {})
        tool_name = tool_info.get('name', '')
        
        # Only process MCP InDesign tools
        if not tool_name.startswith('mcp__indesign__'):
            # Pass through unchanged
            print(json.dumps(input_data))
            return
        
        # Check if we're in an evolution session
        if not os.environ.get('EVOLUTION_SESSION_ID'):
            # Not in evolution mode, pass through
            print(json.dumps(input_data))
            return
        
        # Enhance and capture telemetry
        enhanced_call = enhance_telemetry_capture(tool_info)
        
        # Add usage analysis
        enhanced_call['usage_analysis'] = analyze_tool_usage(
            tool_name, 
            tool_info.get('arguments', {})
        )
        
        # Write telemetry record
        write_telemetry_record(enhanced_call)
        
        # Pass through the original request unchanged
        print(json.dumps(input_data))
        
    except Exception as e:
        # On error, pass through unchanged and log error
        if os.environ.get('DEBUG_TELEMETRY'):
            print(f"❌ Telemetry enhancer error: {e}", file=sys.stderr)
        
        # Try to read and pass through original input
        try:
            input_data = json.loads(sys.stdin.read())
            print(json.dumps(input_data))
        except:
            # If all else fails, output minimal valid response
            print(json.dumps({"tool": {"name": "unknown", "arguments": {}}}))

if __name__ == "__main__":
    main()
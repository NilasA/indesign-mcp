#!/usr/bin/env python3
"""
MCP Tool Telemetry Collection Hook for Claude Code

This hook captures MCP tool results and execution timing after tool completion.
It completes the telemetry record with results, timing, and error information.

Hook Type: PostToolUse
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

def analyze_tool_result(tool_name, result):
    """Analyze tool execution result for evolution insights"""
    
    analysis = {
        'success': not result.get('error'),
        'has_content': bool(result.get('content')),
        'result_size': len(str(result)) if result else 0,
        'error_type': None
    }
    
    # Categorize errors if present
    if result.get('error'):
        error_msg = str(result.get('error', '')).lower()
        if 'timeout' in error_msg:
            analysis['error_type'] = 'timeout'
        elif 'permission' in error_msg or 'access' in error_msg:
            analysis['error_type'] = 'permission'
        elif 'not found' in error_msg or 'missing' in error_msg:
            analysis['error_type'] = 'not_found'
        elif 'invalid' in error_msg or 'parameter' in error_msg:
            analysis['error_type'] = 'parameter'
        else:
            analysis['error_type'] = 'unknown'
    
    return analysis

def complete_telemetry_record(tool_call, result, execution_time):
    """Complete telemetry record with result and timing"""
    
    session_info = get_session_info()
    
    completed_record = {
        'timestamp': int(time.time() * 1000),  # milliseconds
        'tool': tool_call.get('name', 'unknown'),
        'parameters': tool_call.get('arguments', {}),
        'result': 'success' if not result.get('error') else 'error',
        'execution_time': execution_time,
        'session_id': session_info['session_id'],
        'agent_id': session_info['agent_id'],
        'generation': session_info['generation'],
        'capture_source': 'hook_postuse'
    }
    
    # Add error details if present
    if result.get('error'):
        completed_record['error_message'] = str(result.get('error'))
    
    # Add result analysis
    completed_record['result_analysis'] = analyze_tool_result(
        tool_call.get('name', ''), 
        result
    )
    
    return completed_record

def write_telemetry_record(completed_record):
    """Write completed telemetry record to JSONL file"""
    
    session_id = completed_record.get('session_id')
    if not session_id:
        return
    
    # Write to telemetry directory
    telemetry_dir = os.path.expanduser('~/.claude/telemetry')
    os.makedirs(telemetry_dir, exist_ok=True)
    
    telemetry_file = os.path.join(telemetry_dir, f"{session_id}.jsonl")
    
    try:
        with open(telemetry_file, 'a') as f:
            f.write(json.dumps(completed_record) + '\n')
            
        if os.environ.get('DEBUG_TELEMETRY'):
            status = completed_record['result']
            timing = completed_record['execution_time']
            print(f"📊 Telemetry completed: {completed_record['tool']} ({status}, {timing}ms)", file=sys.stderr)
            
    except Exception as e:
        if os.environ.get('DEBUG_TELEMETRY'):
            print(f"❌ Telemetry completion error: {e}", file=sys.stderr)

def update_session_statistics(session_id):
    """Update running session statistics"""
    
    stats_file = os.path.expanduser(f'~/.claude/telemetry/{session_id}-stats.json')
    
    try:
        # Load existing stats
        stats = {}
        if os.path.exists(stats_file):
            with open(stats_file, 'r') as f:
                stats = json.load(f)
        
        # Update counters
        stats['total_tools'] = stats.get('total_tools', 0) + 1
        stats['last_update'] = datetime.now().isoformat()
        
        # Write updated stats
        with open(stats_file, 'w') as f:
            json.dump(stats, f)
            
    except Exception as e:
        if os.environ.get('DEBUG_TELEMETRY'):
            print(f"❌ Stats update error: {e}", file=sys.stderr)

def main():
    """Main hook execution"""
    
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        # Extract tool and result information
        tool_info = input_data.get('tool', {})
        tool_name = tool_info.get('name', '')
        result = input_data.get('result', {})
        timing = input_data.get('timing', {})
        
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
        
        # Extract execution time
        execution_time = timing.get('total_ms', 0)
        
        # Complete and capture telemetry
        completed_record = complete_telemetry_record(tool_info, result, execution_time)
        
        # Write telemetry record
        write_telemetry_record(completed_record)
        
        # Update session statistics
        session_info = get_session_info()
        if session_info['session_id']:
            update_session_statistics(session_info['session_id'])
        
        # Pass through the original result unchanged
        print(json.dumps(input_data))
        
    except Exception as e:
        # On error, pass through unchanged and log error
        if os.environ.get('DEBUG_TELEMETRY'):
            print(f"❌ Telemetry collector error: {e}", file=sys.stderr)
        
        # Try to read and pass through original input
        try:
            input_data = json.loads(sys.stdin.read())
            print(json.dumps(input_data))
        except:
            # If all else fails, output minimal valid response
            print(json.dumps({"result": {}, "tool": {"name": "unknown"}}))

if __name__ == "__main__":
    main()
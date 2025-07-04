#!/usr/bin/env python3
"""
Task Agent Orchestration Hook for Claude Code

This hook intercepts Task tool calls and sets up evolution session context.
It enables automatic telemetry capture and session coherence for evolutionary testing.

Hook Type: PreToolUse
Matcher: "Task"
"""

import json
import sys
import os
import uuid
import re
from datetime import datetime

def setup_evolution_session():
    """Setup environment for evolution testing session"""
    
    # Generate unique session ID
    session_id = f"{int(datetime.now().timestamp())}-evolution-{str(uuid.uuid4())[:8]}"
    
    # Set environment variables for telemetry capture
    os.environ['EVOLUTION_SESSION_ID'] = session_id
    os.environ['TELEMETRY_ENABLED'] = 'true'
    os.environ['TELEMETRY_SESSION_ID'] = session_id
    
    return session_id

def is_evolution_prompt(prompt_text):
    """Detect if this is an evolutionary testing prompt"""
    
    evolution_keywords = [
        'recreate this',
        'book page layout',
        'indesign',
        'mcp tools',
        'telemetry_end_session',
        'set_environment_variable',
        'reference image'
    ]
    
    prompt_lower = prompt_text.lower()
    matches = sum(1 for keyword in evolution_keywords if keyword in prompt_lower)
    
    # Require at least 3 keywords to consider it evolution testing
    return matches >= 3

def extract_reference_info(prompt_text):
    """Extract reference image or description from prompt"""
    
    ref_patterns = [
        r'reference image:\s*([^\n]+)',
        r'reference:\s*([^\n]+)'
    ]
    
    for pattern in ref_patterns:
        match = re.search(pattern, prompt_text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    
    return None

def main():
    """Main hook execution"""
    
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        # Extract tool parameters
        tool_name = input_data.get('tool', {}).get('name', '')
        parameters = input_data.get('tool', {}).get('arguments', {})
        
        # Only process Task tool calls
        if tool_name != 'Task':
            # Pass through unchanged
            print(json.dumps(input_data))
            return
        
        # Extract prompt text
        prompt_text = parameters.get('prompt', '')
        
        # Check if this looks like evolutionary testing
        if is_evolution_prompt(prompt_text):
            
            # Setup evolution session
            session_id = setup_evolution_session()
            
            # Extract reference information
            reference = extract_reference_info(prompt_text)
            
            # Log evolution session start
            if os.environ.get('DEBUG_EVOLUTION'):
                print(f"🧬 Evolution session started: {session_id}", file=sys.stderr)
                if reference:
                    print(f"📷 Reference: {reference}", file=sys.stderr)
            
            # Store session metadata
            evolution_metadata = {
                'session_id': session_id,
                'reference': reference,
                'start_time': datetime.now().isoformat(),
                'intercepted': True
            }
            
            # Write metadata file for downstream hooks
            metadata_file = f"/tmp/evolution-{session_id}.json"
            with open(metadata_file, 'w') as f:
                json.dump(evolution_metadata, f)
        
        # Pass through the original request unchanged
        print(json.dumps(input_data))
        
    except Exception as e:
        # On error, pass through unchanged and log error
        if os.environ.get('DEBUG_EVOLUTION'):
            print(f"❌ Task interceptor error: {e}", file=sys.stderr)
        
        # Try to read and pass through original input
        try:
            input_data = json.loads(sys.stdin.read())
            print(json.dumps(input_data))
        except:
            # If all else fails, output minimal valid response
            print(json.dumps({"tool": {"name": "Task", "arguments": {}}}))

if __name__ == "__main__":
    main()
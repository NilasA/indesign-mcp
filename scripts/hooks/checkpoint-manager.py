#!/usr/bin/env python3
"""
Evolution Checkpoint Manager Hook for Claude Code

This hook manages evolution state persistence at conversation boundaries.
It archives telemetry, saves progress, and prepares for potential recovery.

Hook Type: Stop
Matcher: "" (matches all stop events)
"""

import json
import sys
import os
import shutil
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

def finalize_telemetry_session(session_id):
    """Mark telemetry session as complete"""
    
    if not session_id:
        return
    
    telemetry_dir = os.path.expanduser('~/.claude/telemetry')
    telemetry_file = os.path.join(telemetry_dir, f"{session_id}.jsonl")
    
    # Add session completion marker
    completion_record = {
        'timestamp': int(time.time() * 1000),
        'session_id': session_id,
        'event': 'session_complete',
        'completion_time': datetime.now().isoformat(),
        'capture_source': 'hook_stop'
    }
    
    try:
        with open(telemetry_file, 'a') as f:
            f.write(json.dumps(completion_record) + '\n')
            
        if os.environ.get('DEBUG_TELEMETRY'):
            print(f"📊 Session marked complete: {session_id}", file=sys.stderr)
            
    except Exception as e:
        if os.environ.get('DEBUG_TELEMETRY'):
            print(f"❌ Session completion error: {e}", file=sys.stderr)

def archive_evolution_data(session_id):
    """Archive telemetry and session data"""
    
    if not session_id:
        return None
    
    # Create archive directory
    archive_dir = os.path.expanduser('~/.claude/evolution-archive')
    os.makedirs(archive_dir, exist_ok=True)
    
    # Create timestamped archive subdirectory
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    session_archive = os.path.join(archive_dir, f"{timestamp}_{session_id}")
    os.makedirs(session_archive, exist_ok=True)
    
    archived_files = []
    
    try:
        # Archive telemetry files
        telemetry_dir = os.path.expanduser('~/.claude/telemetry')
        if os.path.exists(telemetry_dir):
            for filename in os.listdir(telemetry_dir):
                if session_id in filename:
                    src = os.path.join(telemetry_dir, filename)
                    dst = os.path.join(session_archive, filename)
                    shutil.copy2(src, dst)
                    archived_files.append(filename)
        
        # Archive session metadata
        metadata_file = f"/tmp/evolution-{session_id}.json"
        if os.path.exists(metadata_file):
            dst = os.path.join(session_archive, 'session-metadata.json')
            shutil.copy2(metadata_file, dst)
            archived_files.append('session-metadata.json')
            # Clean up temp file
            os.remove(metadata_file)
        
        # Create archive summary
        archive_summary = {
            'session_id': session_id,
            'archive_time': datetime.now().isoformat(),
            'archive_path': session_archive,
            'archived_files': archived_files,
            'total_files': len(archived_files)
        }
        
        summary_file = os.path.join(session_archive, 'archive-summary.json')
        with open(summary_file, 'w') as f:
            json.dump(archive_summary, f, indent=2)
        
        if os.environ.get('DEBUG_EVOLUTION'):
            print(f"🗃️  Session archived: {session_archive}", file=sys.stderr)
            print(f"📁 Files archived: {len(archived_files)}", file=sys.stderr)
        
        return session_archive
        
    except Exception as e:
        if os.environ.get('DEBUG_EVOLUTION'):
            print(f"❌ Archive error: {e}", file=sys.stderr)
        return None

def cleanup_temporary_files():
    """Clean up temporary evolution files"""
    
    try:
        # Clean up old session metadata files
        temp_pattern = "/tmp/evolution-*.json"
        import glob
        for temp_file in glob.glob(temp_pattern):
            try:
                # Remove files older than 1 hour
                if time.time() - os.path.getmtime(temp_file) > 3600:
                    os.remove(temp_file)
                    if os.environ.get('DEBUG_EVOLUTION'):
                        print(f"🧹 Cleaned temp file: {temp_file}", file=sys.stderr)
            except:
                pass  # Ignore cleanup errors
                
    except Exception as e:
        if os.environ.get('DEBUG_EVOLUTION'):
            print(f"❌ Cleanup error: {e}", file=sys.stderr)

def generate_resume_instructions(session_id, archive_path):
    """Generate instructions for resuming evolution if needed"""
    
    if not archive_path:
        return
    
    resume_file = os.path.join(archive_path, 'RESUME_INSTRUCTIONS.md')
    
    instructions = f"""# Evolution Session Resume Instructions

## Session Information
- **Session ID**: {session_id}
- **Archive Time**: {datetime.now().isoformat()}
- **Archive Path**: {archive_path}

## To Resume Evolution Testing

1. **Check archived telemetry**:
   ```bash
   ls {archive_path}
   cat {archive_path}/{session_id}.jsonl
   ```

2. **Restart evolution with same configuration**:
   ```bash
   npm run evolve:complete -- --resume-from={session_id}
   ```

3. **Or manually continue**:
   ```bash
   # Set environment variables
   export EVOLUTION_SESSION_ID={session_id}
   export TELEMETRY_ENABLED=true
   
   # Run next generation
   npm run evolve:complete
   ```

## Archived Files
- Telemetry data: `{session_id}.jsonl`
- Session stats: `{session_id}-stats.json`
- Session metadata: `session-metadata.json`
- Archive summary: `archive-summary.json`

## Notes
This session was automatically checkpointed due to conversation boundary.
All telemetry and progress data has been preserved for analysis or resumption.
"""
    
    try:
        with open(resume_file, 'w') as f:
            f.write(instructions)
            
        if os.environ.get('DEBUG_EVOLUTION'):
            print(f"📝 Resume instructions: {resume_file}", file=sys.stderr)
            
    except Exception as e:
        if os.environ.get('DEBUG_EVOLUTION'):
            print(f"❌ Resume instructions error: {e}", file=sys.stderr)

def main():
    """Main hook execution"""
    
    try:
        # Read input from stdin (Stop events may have minimal data)
        try:
            input_data = json.loads(sys.stdin.read())
        except:
            input_data = {}
        
        # Check if we're in an evolution session
        session_info = get_session_info()
        session_id = session_info['session_id']
        
        if session_id and os.environ.get('EVOLUTION_SESSION_ACTIVE'):
            
            if os.environ.get('DEBUG_EVOLUTION'):
                print(f"🔚 Evolution checkpoint triggered for session: {session_id}", file=sys.stderr)
            
            # Finalize telemetry session
            finalize_telemetry_session(session_id)
            
            # Archive evolution data
            archive_path = archive_evolution_data(session_id)
            
            # Generate resume instructions
            generate_resume_instructions(session_id, archive_path)
            
            # Cleanup temporary files
            cleanup_temporary_files()
            
            # Clear evolution environment
            if 'EVOLUTION_SESSION_ID' in os.environ:
                del os.environ['EVOLUTION_SESSION_ID']
            if 'EVOLUTION_SESSION_ACTIVE' in os.environ:
                del os.environ['EVOLUTION_SESSION_ACTIVE']
            
            if os.environ.get('DEBUG_EVOLUTION'):
                print(f"✅ Evolution checkpoint complete", file=sys.stderr)
        
        # Pass through the original data (Stop events typically don't need modification)
        print(json.dumps(input_data))
        
    except Exception as e:
        # On error, pass through unchanged and log error
        if os.environ.get('DEBUG_EVOLUTION'):
            print(f"❌ Checkpoint manager error: {e}", file=sys.stderr)
        
        # Output minimal valid response
        print(json.dumps({}))

if __name__ == "__main__":
    main()
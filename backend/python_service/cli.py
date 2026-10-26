"""
CLI Runner for AI LifeOS Hybrid Scheduling Engine.
Accepts JSON input via stdin or file, outputs JSON to stdout.
Enables reliable, zero-downtime execution from Node.js Express.
"""
import sys
import json
import os

# Ensure project root is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
workspace_dir = os.path.dirname(parent_dir)
if workspace_dir not in sys.path:
    sys.path.insert(0, workspace_dir)

from python_service.models import ScheduleRequest
from python_service.hybrid_planner import generate_hybrid_schedule

def main():
    try:
        raw_input = ""
        if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
            with open(sys.argv[1], "r", encoding="utf-8") as f:
                raw_input = f.read()
        else:
            raw_input = sys.stdin.read()

        if not raw_input.strip():
            print(json.dumps({"success": False, "error": "No input provided to Python scheduler"}))
            sys.exit(1)

        data = json.loads(raw_input)
        request = ScheduleRequest(**data)
        response = generate_hybrid_schedule(request)
        print(json.dumps(response.model_dump()))
        sys.exit(0)
    except Exception as e:
        import traceback
        err_details = traceback.format_exc()
        print(json.dumps({"success": False, "error": str(e), "traceback": err_details}))
        sys.exit(1)

if __name__ == "__main__":
    main()

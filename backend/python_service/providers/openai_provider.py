"""
OpenAI Provider for AI LifeOS Hybrid Planner.
Uses official OpenAI Python SDK.
"""
import os
import sys
import json
from typing import Dict, Any, Optional
from openai import OpenAI

def get_openai_client() -> Optional[OpenAI]:
    api_key = os.getenv("OPENAI_API_KEY") or os.getenv("AI_API_KEY")
    if not api_key or api_key.startswith("your_") or api_key.strip() == "":
        return None
    return OpenAI(api_key=api_key.strip())

def analyze_with_openai(context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Query OpenAI to analyze the user's commitments, priorities, and suggest optimal prep and flow.
    """
    client = get_openai_client()
    if not client:
        return None

    model = os.getenv("OPENAI_MODEL") or os.getenv("AI_MODEL") or "gpt-4o-mini"

    prompt = f"""
You are the AI LifeOS Cognitive Planner.
Analyze the user's daily data for {context.get('date', 'Today')}.
Timezone: {context.get('timezone', 'UTC')}

User Preferences:
Wake: {context.get('preferences', {}).get('wake_time', '06:00')}, Sleep: {context.get('preferences', {}).get('sleep_time', '22:00')}

Fixed Calendar Events (EXACT TIMES MUST NEVER BE CHANGED):
{json.dumps(context.get('events', []), indent=2)}

Tasks:
{json.dumps(context.get('tasks', []), indent=2)}

Active Goals:
{json.dumps(context.get('goals', []), indent=2)}

Habits:
{json.dumps(context.get('habits', []), indent=2)}

Generate a structured JSON response with:
1. "strategic_summary": High-level analysis of the day's primary focal points.
2. "contextual_recommendations": Array of actionable suggestions (e.g. pre-exam revision, travel buffers, hydration, rest).
3. "suggested_routines": Array of suggested activities with {{"title": str, "description": str, "duration_minutes": int, "preferred_time_window": "MORNING|AFTERNOON|EVENING"}}.
"""

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a professional executive productivity and schedule architect. Respond in valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2
        )
        content = response.choices[0].message.content
        if not content:
            return None
        return json.loads(content)
    except Exception as e:
        print(f"[OpenAI Provider Warning] Error generating analysis: {e}", file=sys.stderr)
        return None

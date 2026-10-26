"""
Google Gemini Provider for AI LifeOS Hybrid Planner.
Uses official google-genai Python SDK.
"""
import os
import sys
import json
from typing import Dict, Any, Optional
from google import genai
from google.genai import types

def get_gemini_client() -> Optional[genai.Client]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "PASTE_YOUR_NEW_GEMINI_API_KEY_HERE" or api_key.startswith("your_") or api_key.strip() == "":
        return None
    return genai.Client(api_key=api_key.strip())

def analyze_with_gemini(context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Query Gemini to analyze the user's commitments, priorities, and suggest optimal prep and flow.
    """
    client = get_gemini_client()
    if not client:
        return None

    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    system_instruction = (
        "You are the AI LifeOS Cognitive Planner. "
        "Analyze the user's daily data and recommend realistic routines, focus blocks, prep buffers, and rest. "
        "Fixed calendar events and locked task times MUST NEVER be modified or moved. "
        "Respond in valid JSON."
    )

    prompt = f"""
Context for Date: {context.get('date', 'Today')}
Timezone: {context.get('timezone', 'UTC')}

User Preferences:
Wake: {context.get('preferences', {}).get('wake_time', '06:00')}, Sleep: {context.get('preferences', {}).get('sleep_time', '22:00')}

Fixed Calendar Events (MUST NEVER BE SHIFTED):
{json.dumps(context.get('events', []), indent=2)}

Tasks:
{json.dumps(context.get('tasks', []), indent=2)}

Goals:
{json.dumps(context.get('goals', []), indent=2)}

Habits:
{json.dumps(context.get('habits', []), indent=2)}

Return JSON with:
1. "strategic_summary": High-level strategic synthesis.
2. "contextual_recommendations": Array of strategic guidance tips.
3. "suggested_routines": Array of suggested activities with {{"title": str, "description": str, "duration_minutes": int, "preferred_time_window": "MORNING|AFTERNOON|EVENING"}}.
"""

    try:
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                temperature=0.2
            )
        )
        if not response or not response.text:
            return None
        return json.loads(response.text)
    except Exception as e:
        print(f"[Gemini Provider Warning] Error generating analysis: {e}", file=sys.stderr)
        return None

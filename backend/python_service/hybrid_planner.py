"""
Hybrid AI Planner Orchestrator.
Combines OpenAI + Google Gemini + Deterministic Constraint Scheduling.
"""
import os
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Load backend/.env if present
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)

from .models import ScheduleRequest, ScheduleResponse
from .scheduler import DeterministicScheduler
from .providers.openai_provider import analyze_with_openai
from .providers.gemini_provider import analyze_with_gemini

def generate_hybrid_schedule(request: ScheduleRequest) -> ScheduleResponse:
    """
    Main entry point for generating a realistic, conflict-free, exact-time preserving schedule.
    """
    provider_config = (os.getenv("AI_PROVIDER") or "hybrid").lower()
    
    openai_analysis = None
    gemini_analysis = None
    active_provider = "rule_based_fallback"
    ai_generated = False

    context = request.model_dump()

    # 1. Attempt AI analysis based on provider configuration
    if provider_config in ("hybrid", "all"):
        # Try both or cascade
        openai_analysis = analyze_with_openai(context)
        gemini_analysis = analyze_with_gemini(context)

        if openai_analysis and gemini_analysis:
            active_provider = "hybrid (OpenAI + Gemini)"
            ai_generated = True
        elif openai_analysis:
            active_provider = "openai"
            ai_generated = True
        elif gemini_analysis:
            active_provider = "gemini"
            ai_generated = True
        else:
            active_provider = "rule_based_fallback"
            ai_generated = False

    elif provider_config == "openai":
        openai_analysis = analyze_with_openai(context)
        if openai_analysis:
            active_provider = "openai"
            ai_generated = True
        else:
            # Fallback to gemini if configured
            gemini_analysis = analyze_with_gemini(context)
            if gemini_analysis:
                active_provider = "gemini (fallback from openai)"
                ai_generated = True

    elif provider_config == "gemini":
        gemini_analysis = analyze_with_gemini(context)
        if gemini_analysis:
            active_provider = "gemini"
            ai_generated = True
        else:
            # Fallback to openai if configured
            openai_analysis = analyze_with_openai(context)
            if openai_analysis:
                active_provider = "openai (fallback from gemini)"
                ai_generated = True

    # 2. Combine AI suggestions if available
    combined_suggestions: Dict[str, Any] = {
        "strategic_summary": "",
        "recommendations": [],
        "suggested_routines": []
    }

    if openai_analysis:
        if "strategic_summary" in openai_analysis:
            combined_suggestions["strategic_summary"] = openai_analysis["strategic_summary"]
        if "contextual_recommendations" in openai_analysis:
            combined_suggestions["recommendations"].extend(openai_analysis["contextual_recommendations"])
        if "suggested_routines" in openai_analysis:
            combined_suggestions["suggested_routines"].extend(openai_analysis["suggested_routines"])

    if gemini_analysis:
        if not combined_suggestions["strategic_summary"] and "strategic_summary" in gemini_analysis:
            combined_suggestions["strategic_summary"] = gemini_analysis["strategic_summary"]
        elif "strategic_summary" in gemini_analysis and combined_suggestions["strategic_summary"]:
            # Combine summaries concisely
            combined_suggestions["strategic_summary"] += " " + gemini_analysis["strategic_summary"]

        if "contextual_recommendations" in gemini_analysis:
            combined_suggestions["recommendations"].extend(gemini_analysis["contextual_recommendations"])
        if "suggested_routines" in gemini_analysis:
            combined_suggestions["suggested_routines"].extend(gemini_analysis["suggested_routines"])

    # Deduplicate recommendations
    unique_recs = []
    seen = set()
    for r in combined_suggestions["recommendations"]:
        clean_r = str(r).strip()
        if clean_r and clean_r.lower() not in seen:
            seen.add(clean_r.lower())
            unique_recs.append(clean_r)
    combined_suggestions["recommendations"] = unique_recs[:5]

    # 3. Pass to Deterministic Constraint Scheduler (the Mathematical Truth Source)
    scheduler = DeterministicScheduler(request)
    response = scheduler.build_schedule(ai_suggestions=combined_suggestions)

    # 4. Enrich with active provider and AI generated metadata
    response.generated_by_ai = ai_generated
    response.ai_provider = active_provider

    if combined_suggestions["strategic_summary"]:
        response.summary = combined_suggestions["strategic_summary"]
    if combined_suggestions["recommendations"]:
        # Merge AI recommendations with scheduler recommendations
        all_recs = list(dict.fromkeys(combined_suggestions["recommendations"] + response.recommendations))
        response.recommendations = all_recs[:5]

    return response

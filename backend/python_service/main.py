"""
FastAPI Service for AI LifeOS Hybrid Planner.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os

from .models import ScheduleRequest, ScheduleResponse
from .hybrid_planner import generate_hybrid_schedule

app = FastAPI(
    title="AI LifeOS Hybrid Scheduling Engine",
    description="Deterministic Constraint-Based Scheduler powered by OpenAI + Gemini + Python",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AI LifeOS Hybrid Planner",
        "provider": os.getenv("AI_PROVIDER", "hybrid")
    }

@app.post("/api/schedule/generate", response_model=ScheduleResponse)
def generate_schedule_endpoint(request: ScheduleRequest):
    try:
        schedule = generate_hybrid_schedule(request)
        return schedule
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PYTHON_SERVICE_PORT", 8000))
    uvicorn.run("backend.python_service.main:app", host="0.0.0.0", port=port, reload=True)

"""
Pydantic data models for the AI LifeOS Python Hybrid Scheduling Engine.
"""
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

class UserPreferences(BaseModel):
    wake_time: Optional[str] = "06:00"
    sleep_time: Optional[str] = "22:00"
    work_start: Optional[str] = "09:00"
    work_end: Optional[str] = "17:00"
    preferred_focus_minutes: Optional[int] = 60
    preferred_break_minutes: Optional[int] = 15
    timezone: Optional[str] = "UTC"

class TaskItem(BaseModel):
    id: Optional[int] = None
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "MEDIUM"
    status: Optional[str] = "TODO"
    task_date: Optional[str] = None
    due_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    estimated_minutes: Optional[int] = 60
    category: Optional[str] = None

class EventItem(BaseModel):
    id: Optional[int] = None
    title: str
    description: Optional[str] = None
    start_time: str
    end_time: str
    event_type: Optional[str] = None
    location: Optional[str] = None

class GoalItem(BaseModel):
    id: Optional[int] = None
    title: str
    description: Optional[str] = None
    target_date: Optional[str] = None
    priority: Optional[str] = "MEDIUM"
    progress: Optional[int] = 0
    status: Optional[str] = "TODO"

class HabitItem(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    frequency: Optional[str] = "DAILY"
    target_count: Optional[int] = 1
    preferred_time: Optional[str] = None

class ScheduleRequest(BaseModel):
    date: str
    timezone: Optional[str] = "Asia/Kolkata"
    current_time: Optional[str] = None
    is_today: Optional[bool] = False
    preferences: Optional[UserPreferences] = Field(default_factory=UserPreferences)
    tasks: List[TaskItem] = Field(default_factory=list)
    goals: List[GoalItem] = Field(default_factory=list)
    habits: List[HabitItem] = Field(default_factory=list)
    events: List[EventItem] = Field(default_factory=list)

class ScheduleItem(BaseModel):
    selected_date: str
    start_time: str
    end_time: str
    start: Optional[str] = None
    end: Optional[str] = None
    time_range: str
    title: str
    description: Optional[str] = ""
    task_id: Optional[int] = None
    activity_type: str = "AI_SUGGESTION" # "FIXED_COMMITMENT", "AI_SUGGESTION", "ROUTINE", "BREAK", "GOAL", "HABIT"
    is_fixed: bool = False
    priority: Optional[str] = "MEDIUM"
    category: Optional[str] = None

class ConflictReport(BaseModel):
    type: str
    title_a: str
    title_b: str
    time_a: str
    time_b: str
    message: str

class UnscheduledTask(BaseModel):
    task_id: Optional[int] = None
    title: str
    reason: str

class ScheduleResponse(BaseModel):
    success: bool = True
    date: str
    summary: str
    schedule: List[ScheduleItem] = Field(default_factory=list)
    breaks: List[Dict[str, Any]] = Field(default_factory=list)
    unscheduled_tasks: List[UnscheduledTask] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    conflicts: List[ConflictReport] = Field(default_factory=list)
    generated_by_ai: bool = True
    ai_provider: str = "hybrid"

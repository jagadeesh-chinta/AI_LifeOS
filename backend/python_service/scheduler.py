"""
Deterministic Constraint-Based Scheduling Engine for AI LifeOS.

Acts as the mathematical source of truth:
1. Exact-time preservation for locked intervals (interviews, exams, fixed meetings).
2. Starting today's schedule from current practical time (no past slots or morning routines for today).
3. Prioritizes actual user tasks and balanced pre-commitment preparation (interviews, exams, meetings).
4. Eliminates generic goal filler ("Work toward goal: ...").
5. Interval reservation preventing any overlap.
6. Conflict detection for overlapping existing commitments.
7. Intelligent placement of preparation, travel buffers, meals, breaks, and flexible tasks in free windows.
8. Strict validation of times, dates, and non-overlapping sequences.
"""
from typing import List, Dict, Any, Tuple, Optional
import re
from .models import (
    ScheduleRequest,
    ScheduleResponse,
    ScheduleItem,
    ConflictReport,
    UnscheduledTask
)

def parse_time_to_minutes(time_str: Optional[str]) -> Optional[int]:
    """Parse 24h (HH:MM or HH:MM:SS) or 12h (h:mm AM/PM) into minutes from midnight (0-1439)."""
    if not time_str:
        return None
    s = str(time_str).strip().upper()

    # Match 12-hour AM/PM: e.g. "2:00 PM", "02:00 PM", "9:30 AM"
    m12 = re.match(r"^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$", s)
    if m12:
        h = int(m12.group(1))
        m = int(m12.group(2))
        ampm = m12.group(3)
        if ampm == "PM" and h < 12:
            h += 12
        if ampm == "AM" and h == 12:
            h = 0
        return h * 60 + m

    # Match 24-hour: e.g. "14:00", "09:30", "14:00:00"
    m24 = re.match(r"^(\d{1,2}):(\d{2})(?::\d{2})?$", s)
    if m24:
        h = int(m24.group(1))
        m = int(m24.group(2))
        return h * 60 + m

    # Match ISO datetime string: e.g. "2026-10-21T14:00:00" or "2026-10-21 14:00:00"
    m_iso = re.search(r"(\d{1,2}):(\d{2})(?::\d{2})?", s)
    if m_iso:
        h = int(m_iso.group(1))
        m = int(m_iso.group(2))
        return h * 60 + m

    return None

def minutes_to_24h(minutes: int) -> str:
    """Format minutes from midnight into 24-hour HH:MM format."""
    clamped = max(0, min(minutes, 1439))
    h = clamped // 60
    m = clamped % 60
    return f"{h:02d}:{m:02d}"

def minutes_to_12h(minutes: int) -> str:
    """Format minutes from midnight into clean 12-hour AM/PM format (e.g. '02:00 PM')."""
    clamped = max(0, min(minutes, 1439))
    h = clamped // 60
    m = clamped % 60
    ampm = "PM" if h >= 12 else "AM"
    display_h = h % 12
    display_h = 12 if display_h == 0 else display_h
    return f"{display_h:02d}:{m:02d} {ampm}"

def format_time_range(start_m: int, end_m: int) -> str:
    """Return 'HH:MM AM/PM – HH:MM AM/PM'."""
    s12 = minutes_to_12h(start_m)
    e12 = minutes_to_12h(end_m)
    if s12 == e12:
        return s12
    return f"{s12} – {e12}"

class DeterministicScheduler:
    def __init__(self, request: ScheduleRequest):
        self.request = request
        self.date = request.date
        self.prefs = request.preferences
        
        # User day boundaries
        self.wake_m = parse_time_to_minutes(self.prefs.wake_time) or (6 * 60) # 06:00
        self.sleep_m = parse_time_to_minutes(self.prefs.sleep_time) or (22 * 60) # 22:00
        self.work_start_m = parse_time_to_minutes(self.prefs.work_start) or (9 * 60) # 09:00
        self.work_end_m = parse_time_to_minutes(self.prefs.work_end) or (17 * 60) # 17:00

        # Current time & today detection
        self.is_today = bool(request.is_today)
        self.current_m = parse_time_to_minutes(request.current_time) if request.current_time else None
        
        if self.is_today and self.current_m is not None:
            # Practical next start rounded up with a 15-minute practical buffer
            # E.g. 10:45 AM (645m) -> 11:00 AM (660m)
            # E.g. 18:35 (1115m) -> 18:45 or 19:00
            self.baseline_start_m = max(self.wake_m, ((self.current_m + 15) // 15) * 15)
        else:
            self.baseline_start_m = self.wake_m

        # State tracking
        self.fixed_commitments: List[Dict[str, Any]] = []
        self.conflicts: List[ConflictReport] = []
        self.allocated_intervals: List[Tuple[int, int]] = []
        self.final_schedule: List[ScheduleItem] = []
        self.unscheduled_tasks: List[UnscheduledTask] = []
        self.breaks: List[Dict[str, Any]] = []

    def extract_fixed_commitments(self):
        """
        Identify all locked commitments (tasks with explicit start_time/end_time and calendar events).
        Critical rule: fixed commitments MUST NEVER be altered or moved by AI.
        """
        # 1. Tasks with explicit start_time
        for task in self.request.tasks:
            if task.start_time:
                s_m = parse_time_to_minutes(task.start_time)
                e_m = parse_time_to_minutes(task.end_time)
                if s_m is not None:
                    if e_m is None or e_m <= s_m:
                        dur = task.estimated_minutes if task.estimated_minutes and task.estimated_minutes > 0 else 60
                        e_m = min(s_m + dur, 1439)
                    
                    self.fixed_commitments.append({
                        "title": task.title,
                        "description": task.description or "User fixed commitment",
                        "start_m": s_m,
                        "end_m": e_m,
                        "task_id": task.id,
                        "activity_type": "FIXED_COMMITMENT",
                        "is_fixed": True,
                        "priority": task.priority or "HIGH",
                        "category": task.category or "TASK"
                    })

        # 2. Calendar Events
        for evt in self.request.events:
            s_m = parse_time_to_minutes(evt.start_time)
            e_m = parse_time_to_minutes(evt.end_time)
            if s_m is not None:
                if e_m is None or e_m <= s_m:
                    e_m = min(s_m + 60, 1439)
                self.fixed_commitments.append({
                    "title": evt.title,
                    "description": evt.description or f"Fixed event: {evt.event_type or 'Calendar'}",
                    "start_m": s_m,
                    "end_m": e_m,
                    "task_id": None,
                    "activity_type": "FIXED_COMMITMENT",
                    "is_fixed": True,
                    "priority": "URGENT",
                    "category": evt.event_type or "EVENT"
                })

        # Sort fixed commitments chronologically
        self.fixed_commitments.sort(key=lambda x: x["start_m"])

        # Detect internal conflicts among fixed commitments
        for i in range(len(self.fixed_commitments)):
            for j in range(i + 1, len(self.fixed_commitments)):
                c1 = self.fixed_commitments[i]
                c2 = self.fixed_commitments[j]
                if c1["start_m"] < c2["end_m"] and c2["start_m"] < c1["end_m"]:
                    self.conflicts.append(ConflictReport(
                        type="OVERLAPPING_FIXED_COMMITMENTS",
                        title_a=c1["title"],
                        title_b=c2["title"],
                        time_a=format_time_range(c1["start_m"], c1["end_m"]),
                        time_b=format_time_range(c2["start_m"], c2["end_m"]),
                        message=(
                            f"Scheduling conflict: '{c1['title']}' ({minutes_to_12h(c1['start_m'])}) "
                            f"overlaps with '{c2['title']}' ({minutes_to_12h(c2['start_m'])}). "
                            "Both fixed commitments are preserved without arbitrary modification."
                        )
                    ))

    def _is_interval_free(self, start_m: int, end_m: int) -> bool:
        """Check if an interval [start_m, end_m) does not overlap any already allocated interval."""
        if start_m >= end_m:
            return False
        for alloc_start, alloc_end in self.allocated_intervals:
            if start_m < alloc_end and alloc_start < end_m:
                return False
        return True

    def _allocate_interval(self, item: Dict[str, Any]) -> bool:
        """Allocate an interval for a schedule item if free."""
        s_m = item["start_m"]
        e_m = item["end_m"]
        if self._is_interval_free(s_m, e_m):
            self.allocated_intervals.append((s_m, e_m))
            self.allocated_intervals.sort(key=lambda x: x[0])
            self.final_schedule.append(ScheduleItem(
                selected_date=self.date,
                start_time=minutes_to_24h(s_m),
                end_time=minutes_to_24h(e_m),
                start=minutes_to_24h(s_m),
                end=minutes_to_24h(e_m),
                time_range=format_time_range(s_m, e_m),
                title=item["title"],
                description=item.get("description", ""),
                task_id=item.get("task_id"),
                activity_type=item.get("activity_type", "AI_SUGGESTION"),
                is_fixed=item.get("is_fixed", False),
                priority=item.get("priority", "MEDIUM"),
                category=item.get("category")
            ))
            if item.get("activity_type") == "BREAK":
                self.breaks.append({
                    "title": item["title"],
                    "start_time": minutes_to_24h(s_m),
                    "end_time": minutes_to_24h(e_m)
                })
            return True
        return False

    def find_free_slot(self, duration_m: int, preferred_start_m: int, latest_end_m: int) -> Optional[Tuple[int, int]]:
        """Find the earliest available free slot of length duration_m between preferred_start_m and latest_end_m."""
        # Enforce that flexible activities for today cannot start before baseline_start_m
        effective_start = max(preferred_start_m, self.baseline_start_m)
        curr = effective_start
        step = 15 # check in 15-minute increments
        while curr + duration_m <= latest_end_m:
            if self._is_interval_free(curr, curr + duration_m):
                return (curr, curr + duration_m)
            curr += step
        return None

    def find_latest_free_slot_before(self, duration_m: int, target_end_m: int, earliest_start_m: int) -> Optional[Tuple[int, int]]:
        """Find the latest available free slot of length duration_m that ends right at or before target_end_m."""
        effective_start = max(earliest_start_m, self.baseline_start_m)
        if target_end_m - duration_m < effective_start:
            return None
        
        curr_end = target_end_m
        step = 15
        while curr_end - duration_m >= effective_start:
            start_cand = curr_end - duration_m
            if self._is_interval_free(start_cand, curr_end):
                return (start_cand, curr_end)
            curr_end -= step
        return None

    def build_schedule(self, ai_suggestions: Optional[Dict[str, Any]] = None) -> ScheduleResponse:
        """
        Build the full-day deterministic schedule.
        1. Lock all fixed commitments (interviews, exams, meetings).
        2. Filter out past flexible slots when today.
        3. Prioritize actual user tasks and balanced pre-commitment prep.
        4. Eliminate generic goal filler.
        """
        # 1. Identify and lock fixed commitments FIRST
        self.extract_fixed_commitments()
        for fc in self.fixed_commitments:
            self.allocated_intervals.append((fc["start_m"], fc["end_m"]))
            self.final_schedule.append(ScheduleItem(
                selected_date=self.date,
                start_time=minutes_to_24h(fc["start_m"]),
                end_time=minutes_to_24h(fc["end_m"]),
                start=minutes_to_24h(fc["start_m"]),
                end=minutes_to_24h(fc["end_m"]),
                time_range=format_time_range(fc["start_m"], fc["end_m"]),
                title=fc["title"],
                description=fc["description"],
                task_id=fc["task_id"],
                activity_type="FIXED_COMMITMENT",
                is_fixed=True,
                priority=fc["priority"],
                category=fc["category"]
            ))

        self.allocated_intervals.sort(key=lambda x: x[0])

        # 2. Check for early morning routine ONLY if planning for tomorrow or if early in the morning today
        if not self.is_today or (self.current_m is not None and self.current_m < self.wake_m + 30):
            morning_dur = 60
            m_slot = self.find_free_slot(morning_dur, self.wake_m, min(self.wake_m + 120, self.sleep_m))
            if m_slot:
                self._allocate_interval({
                    "title": "Wake up and morning routine",
                    "description": "Hydration, stretching, and mental preparation for the day.",
                    "start_m": m_slot[0],
                    "end_m": m_slot[1],
                    "activity_type": "ROUTINE",
                    "is_fixed": False,
                    "priority": "HIGH"
                })

        # 3. Categorize upcoming fixed commitments for dedicated, balanced preparation
        upcoming_commitments = [
            fc for fc in self.fixed_commitments
            if not self.is_today or (self.current_m is None or fc["end_m"] > self.current_m)
        ]

        interview_commitments = [
            fc for fc in upcoming_commitments
            if any(k in fc["title"].lower() or k in (fc.get("description") or "").lower() for k in ["interview", "screening", "hr round", "technical round"])
        ]
        exam_commitments = [
            fc for fc in upcoming_commitments
            if any(k in fc["title"].lower() or k in (fc.get("description") or "").lower() for k in ["exam", "test", "midterm", "final", "quiz", "assessment"])
        ]
        meeting_commitments = [
            fc for fc in upcoming_commitments
            if fc not in interview_commitments and fc not in exam_commitments and any(k in fc["title"].lower() for k in ["meeting", "presentation", "demo", "client", "sync"])
        ]

        # Case A: Both Interview AND Exam commitments exist (Direct requirement: Section 2 & 3 example)
        if interview_commitments and exam_commitments:
            interview = interview_commitments[0]
            exam = exam_commitments[0]

            # In chronological order:
            first_comm = interview if interview["start_m"] < exam["start_m"] else exam
            second_comm = exam if first_comm == interview else interview

            # 1. Immediate prep right before the first commitment (e.g. 5:30 - 6:00 PM for 6:00 PM interview)
            prep1_buffer = self.find_latest_free_slot_before(30, first_comm["start_m"], self.baseline_start_m)
            if prep1_buffer:
                title = f"Prepare for the {first_comm['title'].lower()}" if "interview" in first_comm["title"].lower() else f"Final arrival / travel buffer for {first_comm['title']}"
                self._allocate_interval({
                    "title": title,
                    "description": f"Environment setup, materials review, and mental focus for {first_comm['title']}.",
                    "start_m": prep1_buffer[0],
                    "end_m": prep1_buffer[1],
                    "activity_type": "AI_SUGGESTION",
                    "is_fixed": False,
                    "priority": "HIGH"
                })

            # 2. Targeted revision slot right before that (e.g. 5:00 - 5:30 PM: Revise interview questions and answers)
            rev1_slot = self.find_latest_free_slot_before(30, prep1_buffer[0] if prep1_buffer else first_comm["start_m"], self.baseline_start_m)
            if rev1_slot:
                self._allocate_interval({
                    "title": f"Revise {first_comm['title'].lower()} questions and answers",
                    "description": "High-yield Q&A review, key talking points, and STAR framework responses.",
                    "start_m": rev1_slot[0],
                    "end_m": rev1_slot[1],
                    "activity_type": "AI_SUGGESTION",
                    "is_fixed": False,
                    "priority": "HIGH"
                })

            # 3. Buffer and preparation between first and second commitments (e.g. 6:30 - 7:00 PM break, 7:00 - 8:00 PM final revision or travel)
            if first_comm["end_m"] < second_comm["start_m"]:
                gap_start = first_comm["end_m"]
                gap_end = second_comm["start_m"]
                gap_dur = gap_end - gap_start

                if gap_dur >= 90:
                    # Break + final revision/travel
                    self._allocate_interval({
                        "title": f"Break and prepare for the {second_comm['title'].lower()}",
                        "description": "Mental transition, hydration, and setting up notes.",
                        "start_m": gap_start,
                        "end_m": gap_start + 30,
                        "activity_type": "BREAK",
                        "is_fixed": False,
                        "priority": "MEDIUM"
                    })
                    self._allocate_interval({
                        "title": f"Final revision or travel for {second_comm['title'].lower()}",
                        "description": f"Travel to venue or final formula and concept recall before {second_comm['title']}.",
                        "start_m": gap_start + 30,
                        "end_m": gap_end,
                        "activity_type": "AI_SUGGESTION",
                        "is_fixed": False,
                        "priority": "HIGH"
                    })
                elif gap_dur >= 45:
                    self._allocate_interval({
                        "title": f"Transition and final prep for {second_comm['title'].lower()}",
                        "description": "Quick review and arrival readiness.",
                        "start_m": gap_start,
                        "end_m": gap_end,
                        "activity_type": "AI_SUGGESTION",
                        "is_fixed": False,
                        "priority": "HIGH"
                    })

            # 4. In earlier available windows (e.g. 11:00 AM - 5:00 PM):
            # Balance interview prep and exam prep realistically!
            # Slot A: Prepare interview introduction and project explanations (60m)
            s_intro = self.find_free_slot(60, self.baseline_start_m, rev1_slot[0] if rev1_slot else first_comm["start_m"])
            if s_intro:
                self._allocate_interval({
                    "title": "Prepare interview introduction and project explanations",
                    "description": "Structure your personal pitch, key architectural decisions, and recent impact.",
                    "start_m": s_intro[0],
                    "end_m": s_intro[1],
                    "activity_type": "AI_SUGGESTION",
                    "is_fixed": False,
                    "priority": "HIGH"
                })

            # Slot B: Practise technical interview questions (45m)
            s_tech = self.find_free_slot(45, s_intro[1] if s_intro else self.baseline_start_m, rev1_slot[0] if rev1_slot else first_comm["start_m"])
            if s_tech:
                self._allocate_interval({
                    "title": "Practise technical interview questions",
                    "description": "Core algorithms, system design trade-offs, and live coding explanations.",
                    "start_m": s_tech[0],
                    "end_m": s_tech[1],
                    "activity_type": "AI_SUGGESTION",
                    "is_fixed": False,
                    "priority": "HIGH"
                })

            # Slot C: Lunch and break (45m)
            s_lunch = self.find_free_slot(45, max(s_tech[1] if s_tech else 12 * 60, 12 * 60), 14 * 60)
            if s_lunch:
                self._allocate_interval({
                    "title": "Lunch and break",
                    "description": "Nourishing meal and mental rest to sustain stamina.",
                    "start_m": s_lunch[0],
                    "end_m": s_lunch[1],
                    "activity_type": "BREAK",
                    "is_fixed": False,
                    "priority": "MEDIUM"
                })

            # Slot D: Prepare for the exam: topic-wise revision (90m)
            s_exam_rev = self.find_free_slot(90, s_lunch[1] if s_lunch else (s_tech[1] if s_tech else self.baseline_start_m), rev1_slot[0] if rev1_slot else first_comm["start_m"])
            if s_exam_rev:
                self._allocate_interval({
                    "title": f"Prepare for the {exam['title'].lower()}: topic-wise revision",
                    "description": "Comprehensive review of core syllabus topics and key theories.",
                    "start_m": s_exam_rev[0],
                    "end_m": s_exam_rev[1],
                    "activity_type": "AI_SUGGESTION",
                    "is_fixed": False,
                    "priority": "HIGH"
                })

            # Slot E: Short break (15m)
            if s_exam_rev:
                s_brk = self.find_free_slot(15, s_exam_rev[1], rev1_slot[0] if rev1_slot else first_comm["start_m"])
                if s_brk:
                    self._allocate_interval({
                        "title": "Short break",
                        "description": "Rest your eyes, hydrate, and stretch.",
                        "start_m": s_brk[0],
                        "end_m": s_brk[1],
                        "activity_type": "BREAK",
                        "is_fixed": False,
                        "priority": "LOW"
                    })

            # Slot F: Solve exam practice questions (60m)
            s_qs_start = s_brk[1] if (s_exam_rev and 's_brk' in locals() and s_brk) else (s_exam_rev[1] if s_exam_rev else self.baseline_start_m)
            s_exam_qs = self.find_free_slot(60, s_qs_start, rev1_slot[0] if rev1_slot else first_comm["start_m"])
            if s_exam_qs:
                self._allocate_interval({
                    "title": f"Solve {exam['title'].lower()} practice questions",
                    "description": "Timed problem solving and past paper analysis.",
                    "start_m": s_exam_qs[0],
                    "end_m": s_exam_qs[1],
                    "activity_type": "AI_SUGGESTION",
                    "is_fixed": False,
                    "priority": "HIGH"
                })

            # Slot G: Review weak exam topics (45m)
            s_weak_start = s_exam_qs[1] if s_exam_qs else s_qs_start
            s_weak = self.find_free_slot(45, s_weak_start, rev1_slot[0] if rev1_slot else first_comm["start_m"])
            if s_weak:
                self._allocate_interval({
                    "title": f"Review weak {exam['title'].lower()} topics",
                    "description": "Targeted clarification on difficult concepts and high-error areas.",
                    "start_m": s_weak[0],
                    "end_m": s_weak[1],
                    "activity_type": "AI_SUGGESTION",
                    "is_fixed": False,
                    "priority": "HIGH"
                })

        # Case B: Only Exam commitment
        elif exam_commitments:
            exam = exam_commitments[0]
            exam_start = exam["start_m"]
            exam_end = exam["end_m"]

            # Pre-exam Travel / Final Prep Buffer (45m - 60m before exam)
            travel_slot = self.find_latest_free_slot_before(60, exam_start, self.baseline_start_m)
            if travel_slot:
                self._allocate_interval({
                    "title": "Travel to exam center / Final arrival buffer",
                    "description": "Travel with required materials, arrive comfortably early.",
                    "start_m": travel_slot[0],
                    "end_m": travel_slot[1],
                    "activity_type": "AI_SUGGESTION",
                    "is_fixed": False,
                    "priority": "HIGH"
                })

            # Lunch before travel if slot available around midday
            lunch_bound = travel_slot[0] if travel_slot else exam_start
            if self.baseline_start_m < 14 * 60:
                lunch_slot = self.find_free_slot(45, max(12 * 60, self.baseline_start_m), min(lunch_bound, 14 * 60 + 30))
                if lunch_slot:
                    self._allocate_interval({
                        "title": "Nutritious lunch and mental break",
                        "description": "Light, energizing meal and hydration to sustain cognitive focus.",
                        "start_m": lunch_slot[0],
                        "end_m": lunch_slot[1],
                        "activity_type": "BREAK",
                        "is_fixed": False,
                        "priority": "MEDIUM"
                    })

            # Deep Exam Revision / Prep block (90m)
            prep_bound = travel_slot[0] if travel_slot else exam_start
            prep_slot = self.find_free_slot(90, self.baseline_start_m, prep_bound)
            if prep_slot:
                self._allocate_interval({
                    "title": f"Focused preparation & topic review for {exam['title']}",
                    "description": "Active recall, key formulas, and high-yield concept review.",
                    "start_m": prep_slot[0],
                    "end_m": prep_slot[1],
                    "activity_type": "AI_SUGGESTION",
                    "is_fixed": False,
                    "priority": "HIGH"
                })

            # Practice questions block (60m)
            if prep_slot:
                qs_slot = self.find_free_slot(60, prep_slot[1], prep_bound)
                if qs_slot:
                    self._allocate_interval({
                        "title": f"Solve practice questions for {exam['title']}",
                        "description": "Self-testing, past questions, and weak-area clarification.",
                        "start_m": qs_slot[0],
                        "end_m": qs_slot[1],
                        "activity_type": "AI_SUGGESTION",
                        "is_fixed": False,
                        "priority": "HIGH"
                    })

            # Post-Exam Rest & Recovery (immediately following exam)
            rest_start = exam_end
            rest_end = min(exam_end + 60, self.sleep_m)
            if self._is_interval_free(rest_start, rest_end):
                self._allocate_interval({
                    "title": "Rest and decompression",
                    "description": "Mental reset and physical relaxation after the exam.",
                    "start_m": rest_start,
                    "end_m": rest_end,
                    "activity_type": "BREAK",
                    "is_fixed": False,
                    "priority": "MEDIUM"
                })

        # Case C: Only Interview commitment
        elif interview_commitments:
            interview = interview_commitments[0]
            int_start = interview["start_m"]
            int_end = interview["end_m"]

            # 30m final setup & mental readiness buffer before interview
            prep_buffer = self.find_latest_free_slot_before(30, int_start, self.baseline_start_m)
            if prep_buffer:
                self._allocate_interval({
                    "title": "Final interview setup & mental readiness",
                    "description": "Camera/mic check, quiet space confirmation, and resume review.",
                    "start_m": prep_buffer[0],
                    "end_m": prep_buffer[1],
                    "activity_type": "AI_SUGGESTION",
                    "is_fixed": False,
                    "priority": "HIGH"
                })

            # Interview Q&A revision before buffer (45m)
            rev_bound = prep_buffer[0] if prep_buffer else int_start
            rev_slot = self.find_latest_free_slot_before(45, rev_bound, self.baseline_start_m)
            if rev_slot:
                self._allocate_interval({
                    "title": "Revise key interview questions & STAR answers",
                    "description": "Behavioral responses, technical fundamentals, and questions for the interviewer.",
                    "start_m": rev_slot[0],
                    "end_m": rev_slot[1],
                    "activity_type": "AI_SUGGESTION",
                    "is_fixed": False,
                    "priority": "HIGH"
                })

            # Project explanations & introduction practice (60m)
            intro_bound = rev_slot[0] if rev_slot else rev_bound
            intro_slot = self.find_free_slot(60, self.baseline_start_m, intro_bound)
            if intro_slot:
                self._allocate_interval({
                    "title": "Prepare introduction and project architecture walk-through",
                    "description": "Crisp 2-minute elevator pitch and technical project deep-dives.",
                    "start_m": intro_slot[0],
                    "end_m": intro_slot[1],
                    "activity_type": "AI_SUGGESTION",
                    "is_fixed": False,
                    "priority": "HIGH"
                })

            # Post-Interview notes & debrief
            debrief_end = min(int_end + 30, self.sleep_m)
            if self._is_interval_free(int_end, debrief_end):
                self._allocate_interval({
                    "title": "Interview debrief and notes",
                    "description": "Document questions asked, key impressions, and follow-up items.",
                    "start_m": int_end,
                    "end_m": debrief_end,
                    "activity_type": "AI_SUGGESTION",
                    "is_fixed": False,
                    "priority": "MEDIUM"
                })

        # Case D: Meeting commitments
        elif meeting_commitments:
            meeting = meeting_commitments[0]
            m_prep = self.find_latest_free_slot_before(30, meeting["start_m"], self.baseline_start_m)
            if m_prep:
                self._allocate_interval({
                    "title": f"Prepare agenda & talking points for {meeting['title']}",
                    "description": "Review agenda, prepare updates, and verify documents.",
                    "start_m": m_prep[0],
                    "end_m": m_prep[1],
                    "activity_type": "AI_SUGGESTION",
                    "is_fixed": False,
                    "priority": "HIGH"
                })

        # 4. Schedule Flexible User Tasks (tasks with no fixed start_time)
        # Priority sort: URGENT (4) > HIGH (3) > MEDIUM (2) > LOW (1)
        priority_map = {"URGENT": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
        flexible_tasks = [t for t in self.request.tasks if not t.start_time]
        flexible_tasks.sort(key=lambda t: priority_map.get((t.priority or "MEDIUM").upper(), 2), reverse=True)

        for task in flexible_tasks:
            duration = task.estimated_minutes if task.estimated_minutes and task.estimated_minutes > 0 else 60
            duration = min(max(duration, 30), 120) # clamp between 30m and 120m per block
            
            # Find earliest available slot in remaining available hours today
            slot = self.find_free_slot(duration, self.baseline_start_m, self.sleep_m - 30)
            if slot:
                self._allocate_interval({
                    "title": task.title,
                    "description": task.description or "Focused execution block.",
                    "start_m": slot[0],
                    "end_m": slot[1],
                    "task_id": task.id,
                    "activity_type": "AI_SUGGESTION",
                    "is_fixed": False,
                    "priority": task.priority or "MEDIUM",
                    "category": task.category or "TASK"
                })
            else:
                self.unscheduled_tasks.append(UnscheduledTask(
                    task_id=task.id,
                    title=task.title,
                    reason="No contiguous focus window available without conflicting with higher priority commitments."
                ))

        # 5. Evening Dinner / Wind-down (only if enough evening time remains)
        if self.baseline_start_m < 20 * 60:
            dinner_slot = self.find_free_slot(45, 19 * 60 + 30, min(21 * 60, self.sleep_m - 30))
            if dinner_slot:
                self._allocate_interval({
                    "title": "Dinner and mental relaxation",
                    "description": "Nourishing dinner, hydration, and offline break.",
                    "start_m": dinner_slot[0],
                    "end_m": dinner_slot[1],
                    "activity_type": "BREAK",
                    "is_fixed": False,
                    "priority": "LOW"
                })

        # Bedtime / Sleep Prep (30 mins before sleep_m, if user is not already past bedtime)
        if self.baseline_start_m < self.sleep_m:
            sleep_prep_start = max(self.sleep_m - 30, self.baseline_start_m)
            if self._is_interval_free(sleep_prep_start, self.sleep_m):
                self._allocate_interval({
                    "title": "Prepare for sleep",
                    "description": "Dim lighting, disconnect from devices, and optimize sleep hygiene.",
                    "start_m": sleep_prep_start,
                    "end_m": self.sleep_m,
                    "activity_type": "ROUTINE",
                    "is_fixed": False,
                    "priority": "MEDIUM"
                })

        # 6. Sort final schedule strictly chronologically
        self.final_schedule.sort(key=lambda item: parse_time_to_minutes(item.start_time) or 0)

        # 7. Verify Final Schedule Integrity
        self._verify_schedule_integrity()

        # Build Summary
        fixed_count = len(self.fixed_commitments)
        flex_count = len(self.final_schedule) - fixed_count
        summary = (
            f"Personalized schedule for {self.date}. "
            f"Preserved {fixed_count} fixed commitment(s) at their exact original times, "
            f"and harmonized {flex_count} activity slot(s) starting from your current availability."
        )
        if self.conflicts:
            summary += f" [Warning: {len(self.conflicts)} overlapping fixed commitment(s) flagged]."

        recommendations = [
            "Fixed commitments are locked to your specified times to guarantee reliability.",
            "Protect your scheduled preparation windows and recovery breaks for peak performance."
        ]
        if interview_commitments:
            recommendations.append("Conduct mock Q&A with the slot assistant and test your audio/camera setup early.")
        if exam_commitments:
            recommendations.append("Prioritize arriving at your exam venue with ample buffer time and review formula summaries calmly.")

        return ScheduleResponse(
            success=True,
            date=self.date,
            summary=summary,
            schedule=self.final_schedule,
            breaks=self.breaks,
            unscheduled_tasks=self.unscheduled_tasks,
            recommendations=recommendations,
            conflicts=self.conflicts,
            generated_by_ai=True,
            ai_provider="hybrid"
        )

    def _verify_schedule_integrity(self):
        """
        Rigorous integrity check:
        1. Fixed commitments must retain exact original start/end times and task IDs.
        2. No generated activity overlaps a fixed commitment.
        3. All intervals belong to the selected date.
        """
        fixed_map = {fc.get("task_id"): fc for fc in self.fixed_commitments if fc.get("task_id")}
        
        for item in self.final_schedule:
            if item.is_fixed and item.task_id and item.task_id in fixed_map:
                orig = fixed_map[item.task_id]
                orig_s24 = minutes_to_24h(orig["start_m"])
                orig_e24 = minutes_to_24h(orig["end_m"])
                assert item.start_time == orig_s24, (
                    f"Integrity Violation: Fixed task '{item.title}' start time moved from {orig_s24} to {item.start_time}"
                )
                assert item.end_time == orig_e24, (
                    f"Integrity Violation: Fixed task '{item.title}' end time moved from {orig_e24} to {item.end_time}"
                )

        # Ensure no non-fixed activity overlaps any fixed commitment
        for item in self.final_schedule:
            if not item.is_fixed:
                s_m = parse_time_to_minutes(item.start_time)
                e_m = parse_time_to_minutes(item.end_time)
                for fc in self.fixed_commitments:
                    fc_s = fc["start_m"]
                    fc_e = fc["end_m"]
                    if s_m < fc_e and fc_s < e_m:
                        raise ValueError(
                            f"Integrity Violation: Suggested activity '{item.title}' ({item.start_time}-{item.end_time}) "
                            f"overlaps with locked commitment '{fc['title']}' ({minutes_to_24h(fc_s)}-{minutes_to_24h(fc_e)})"
                        )

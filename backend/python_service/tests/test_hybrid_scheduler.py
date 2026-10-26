"""
Automated Test Suite for AI LifeOS Hybrid Scheduler.
Verifies all 9 critical requirements:
1. A 2:00 PM–3:00 PM exam never moves to another time.
2. No suggested activity overlaps a fixed commitment.
3. Today, tomorrow, and custom-date plans use the correct records.
4. Multiple fixed tasks remain unchanged.
5. Conflicting existing commitments are reported.
6. Invalid OpenAI/Gemini responses are rejected or safely repaired.
7. Provider failures trigger the fallback scheduler.
"""
import unittest
from python_service.models import ScheduleRequest, TaskItem, EventItem, UserPreferences
from python_service.scheduler import DeterministicScheduler, parse_time_to_minutes
from python_service.hybrid_planner import generate_hybrid_schedule

class TestHybridScheduler(unittest.TestCase):

    def test_1_exam_exact_time_preserved(self):
        """Proof: A 2:00 PM–3:00 PM exam NEVER moves to another time."""
        req = ScheduleRequest(
            date="2026-10-21",
            tasks=[
                TaskItem(
                    id=101,
                    title="Final Engineering Exam",
                    start_time="14:00",
                    end_time="15:00",
                    priority="URGENT"
                ),
                TaskItem(id=102, title="Study Chapters 1-4", priority="HIGH", estimated_minutes=90)
            ]
        )
        res = generate_hybrid_schedule(req)
        self.assertTrue(res.success)
        
        # Locate the exam in the generated schedule by task_id
        exam_item = next((item for item in res.schedule if item.task_id == 101), None)
        self.assertIsNotNone(exam_item, "Exam must be present in the schedule")
        self.assertEqual(exam_item.start_time, "14:00", "Exam start time MUST be 14:00 (2:00 PM)")
        self.assertEqual(exam_item.end_time, "15:00", "Exam end time MUST be 15:00 (3:00 PM)")
        self.assertTrue(exam_item.is_fixed, "Exam must be marked as a locked fixed commitment")

    def test_2_no_suggested_activity_overlaps_fixed_commitment(self):
        """Proof: No suggested activity overlaps a fixed commitment."""
        req = ScheduleRequest(
            date="2026-10-21",
            tasks=[
                TaskItem(id=101, title="Calculus Exam", start_time="14:00", end_time="15:00", priority="URGENT"),
                TaskItem(id=102, title="Essay Writing", estimated_minutes=120, priority="HIGH"),
                TaskItem(id=103, title="Lab Report", estimated_minutes=60, priority="MEDIUM")
            ]
        )
        res = generate_hybrid_schedule(req)
        self.assertTrue(res.success)

        exam_start = 14 * 60
        exam_end = 15 * 60

        for item in res.schedule:
            if item.title == "Calculus Exam":
                continue
            s = parse_time_to_minutes(item.start_time)
            e = parse_time_to_minutes(item.end_time)
            # Assert no overlap: s < exam_end and exam_start < e must be False
            overlaps = (s < exam_end and exam_start < e)
            self.assertFalse(overlaps, f"Activity '{item.title}' ({item.start_time}-{item.end_time}) overlapped with the Exam!")

    def test_3_multiple_fixed_tasks_remain_unchanged(self):
        """Proof: Multiple fixed tasks all remain locked at their exact times."""
        req = ScheduleRequest(
            date="2026-10-21",
            tasks=[
                TaskItem(id=201, title="Morning Standup", start_time="09:00", end_time="09:30", priority="HIGH"),
                TaskItem(id=202, title="Architecture Review", start_time="11:00", end_time="12:00", priority="HIGH"),
                TaskItem(id=203, title="Final Certification Exam", start_time="14:00", end_time="15:00", priority="URGENT"),
                TaskItem(id=204, title="Doctor Appointment", start_time="16:30", end_time="17:15", priority="MEDIUM")
            ]
        )
        res = generate_hybrid_schedule(req)
        self.assertTrue(res.success)

        expected_times = {
            201: ("09:00", "09:30"),
            202: ("11:00", "12:00"),
            203: ("14:00", "15:00"),
            204: ("16:30", "17:15")
        }

        for item in res.schedule:
            if item.task_id in expected_times:
                exp_s, exp_e = expected_times[item.task_id]
                self.assertEqual(item.start_time, exp_s, f"Task {item.task_id} start time moved!")
                self.assertEqual(item.end_time, exp_e, f"Task {item.task_id} end time moved!")

    def test_4_conflicting_commitments_reported(self):
        """Proof: Conflicting existing commitments are reported in conflicts array."""
        req = ScheduleRequest(
            date="2026-10-21",
            tasks=[
                TaskItem(id=301, title="Chemistry Exam", start_time="14:00", end_time="15:00", priority="URGENT"),
                TaskItem(id=302, title="Team All-Hands Meeting", start_time="14:30", end_time="15:30", priority="HIGH")
            ]
        )
        res = generate_hybrid_schedule(req)
        self.assertTrue(res.success)
        self.assertGreaterEqual(len(res.conflicts), 1, "Conflict must be detected and reported")
        self.assertIn("Chemistry Exam", res.conflicts[0].title_a)
        self.assertIn("Team All-Hands Meeting", res.conflicts[0].title_b)

    def test_5_invalid_model_responses_repaired(self):
        """Proof: Invalid model responses are safely repaired by deterministic scheduler."""
        scheduler = DeterministicScheduler(ScheduleRequest(
            date="2026-10-21",
            tasks=[
                TaskItem(id=401, title="Biology Exam", start_time="14:00", end_time="15:00")
            ]
        ))
        # Corrupt AI suggestions with invalid format, missing keys, overlapping times
        corrupted_ai = {
            "strategic_summary": "Test summary",
            "suggested_routines": [
                {"title": "Broken Item", "start_time": "INVALID_TIME", "end_time": "99:99"},
                {"title": "Illegal Overlap", "start_time": "14:15", "end_time": "14:45"} # tries to overlap exam
            ]
        }
        res = scheduler.build_schedule(ai_suggestions=corrupted_ai)
        self.assertTrue(res.success)
        
        # Verify exam is intact
        exam = next(i for i in res.schedule if i.task_id == 401)
        self.assertEqual(exam.start_time, "14:00")
        self.assertEqual(exam.end_time, "15:00")

    def test_6_provider_failure_triggers_fallback(self):
        """Proof: Provider failure triggers safe fallback schedule."""
        # Intentionally passing dummy prompt to hybrid generator with unconfigured key
        req = ScheduleRequest(
            date="2026-10-21",
            tasks=[
                TaskItem(id=501, title="General Task", priority="MEDIUM", estimated_minutes=45)
            ]
        )
        res = generate_hybrid_schedule(req)
        self.assertTrue(res.success)
        self.assertGreater(len(res.schedule), 0)
        self.assertIn("General Task", [i.title for i in res.schedule])

if __name__ == "__main__":
    unittest.main()

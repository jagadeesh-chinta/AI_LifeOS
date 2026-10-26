import React, { useState } from 'react';
import {
  Sparkles, BookOpen, Clock, Calendar, CheckCircle2, AlertCircle,
  Plus, Trash2, Edit2, Download, Save, RefreshCw, ChevronRight,
  Flame, Award, Target, Coffee, ShieldCheck, ArrowRight
} from 'lucide-react';
import { generateAIStudyTimetable, createSavedTimetable, updateSavedTimetable } from '../../services/timetable.service';
import { exportAIStudyPdf } from '../../utils/timetablePdf';

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const GOALS = [
  { id: 'exam_preparation', label: 'Final Exam Preparation', desc: 'Intensive revision and problem solving' },
  { id: 'semester_study', label: 'Semester Coursework', desc: 'Consistent balanced academic routine' },
  { id: 'competitive_exams', label: 'Competitive Entrance Exams', desc: 'High-focus mock tests and recall' },
  { id: 'skill_learning', label: 'Tech & Career Skill Mastery', desc: 'Project-driven code and theory' }
];

const STUDY_METHODS = [
  'Concept Deep Dive', 'Practice Questions & Exercises', 'Mock Tests & Timed Quizzes',
  'Active Recall & Flashcards', 'Hands-on Projects & Coding'
];

const AIStudyBuilder = ({ initialData, onSaved }) => {
  const [timetableId, setTimetableId] = useState(initialData?.id || null);
  const [title, setTitle] = useState(initialData?.title || 'Personalized AI Study Schedule');
  const [step, setStep] = useState(initialData?.data?.weekly_schedule ? 'view' : 'form');

  // Form requirements
  const [academicGoal, setAcademicGoal] = useState(initialData?.settings?.academic_goal || 'exam_preparation');
  const [subjects, setSubjects] = useState(
    initialData?.settings?.subjects || [
      { name: 'Data Structures & Algorithms', proficiency: 'Intermediate', is_difficult: true, exam_date: '', priority: 'High' },
      { name: 'Database Management Systems', proficiency: 'Beginner', is_difficult: true, exam_date: '', priority: 'High' },
      { name: 'Computer Networks', proficiency: 'Intermediate', is_difficult: false, exam_date: '', priority: 'Medium' }
    ]
  );

  const [availableDays, setAvailableDays] = useState(initialData?.settings?.available_days || ALL_DAYS);
  const [wakeTime, setWakeTime] = useState(initialData?.settings?.wake_time || '07:00');
  const [sleepTime, setSleepTime] = useState(initialData?.settings?.sleep_time || '23:00');
  const [dailyHours, setDailyHours] = useState(initialData?.settings?.daily_study_hours || 5);
  const [sessionDuration, setSessionDuration] = useState(initialData?.settings?.session_duration || 60);
  const [breakDuration, setBreakDuration] = useState(initialData?.settings?.break_duration || 15);
  const [includeMeals, setIncludeMeals] = useState(initialData?.settings?.include_meals_rest ?? true);
  const [selectedMethods, setSelectedMethods] = useState(
    initialData?.settings?.study_methods || ['Concept Deep Dive', 'Practice Questions & Exercises', 'Mock Tests & Timed Quizzes']
  );

  // Fixed commitments (College, Work, etc.)
  const [fixedCommitments, setFixedCommitments] = useState(
    initialData?.settings?.fixed_commitments || [
      { title: 'College Classes / Work', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], start_time: '09:00', end_time: '12:30' }
    ]
  );

  // New Subject Form
  const [newSubj, setNewSubj] = useState({ name: '', proficiency: 'Intermediate', is_difficult: false, exam_date: '', priority: 'Medium' });
  const [showAddSubject, setShowAddSubject] = useState(false);

  // New Commitment Form
  const [newCommit, setNewCommit] = useState({ title: '', days: ['Monday', 'Tuesday', 'Wednesday'], start_time: '14:00', end_time: '16:00' });
  const [showAddCommit, setShowAddCommit] = useState(false);

  // Generated Result
  const [generatedData, setGeneratedData] = useState(initialData?.data || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [activeDayView, setActiveDayView] = useState('Monday');

  const handleAddSubject = () => {
    if (!newSubj.name.trim()) return;
    setSubjects([...subjects, { ...newSubj }]);
    setNewSubj({ name: '', proficiency: 'Intermediate', is_difficult: false, exam_date: '', priority: 'Medium' });
    setShowAddSubject(false);
  };

  const handleRemoveSubject = (index) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const handleAddCommitment = () => {
    if (!newCommit.title.trim()) return;
    setFixedCommitments([...fixedCommitments, { ...newCommit }]);
    setNewCommit({ title: '', days: ['Monday'], start_time: '14:00', end_time: '16:00' });
    setShowAddCommit(false);
  };

  const handleRemoveCommitment = (index) => {
    setFixedCommitments(fixedCommitments.filter((_, i) => i !== index));
  };

  // Generate with Backend AI Service
  const handleGenerate = async () => {
    if (subjects.length === 0) {
      alert('Please add at least one subject to generate your study schedule.');
      return;
    }

    setIsGenerating(true);
    try {
      const payload = {
        title,
        academic_goal: academicGoal,
        subjects,
        available_days: availableDays,
        wake_time: wakeTime,
        sleep_time: sleepTime,
        daily_study_hours: Number(dailyHours),
        session_duration: Number(sessionDuration),
        break_duration: Number(breakDuration),
        fixed_commitments: fixedCommitments,
        study_methods: selectedMethods,
        include_meals_rest: includeMeals
      };

      const result = await generateAIStudyTimetable(payload);
      setGeneratedData(result);
      setStep('view');
    } catch (err) {
      alert('Failed to generate timetable: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsGenerating(false);
    }
  };

  // Save to MySQL
  const handleSaveToBackend = async () => {
    if (!generatedData) return;
    setIsSaving(true);
    setSaveSuccessMsg('');
    try {
      const payload = {
        title,
        type: 'ai_study',
        description: `${subjects.length} subjects • ${dailyHours}h daily target • ${academicGoal}`,
        settings: {
          academic_goal: academicGoal,
          subjects,
          available_days: availableDays,
          wake_time: wakeTime,
          sleep_time: sleepTime,
          daily_study_hours: dailyHours,
          session_duration: sessionDuration,
          break_duration: breakDuration,
          fixed_commitments: fixedCommitments,
          study_methods: selectedMethods,
          include_meals_rest: includeMeals
        },
        data: generatedData
      };

      let res;
      if (timetableId) {
        res = await updateSavedTimetable(timetableId, payload);
      } else {
        res = await createSavedTimetable(payload);
        setTimetableId(res.id);
      }

      setSaveSuccessMsg('✓ AI Study Timetable saved successfully to MySQL');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
      if (onSaved) onSaved(res);
    } catch (err) {
      alert('Failed to save timetable: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!generatedData) return;
    exportAIStudyPdf({
      title,
      data: generatedData
    });
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header Info */}
      <div className="glass-card p-5 rounded-2xl border border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-bold text-textPrimary bg-transparent border-b border-transparent hover:border-purple-500/50 focus:border-purple-500 focus:outline-none transition-colors px-1"
              placeholder="Enter Timetable Title..."
            />
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 font-semibold border border-purple-500/30">
              AI Study Mode
            </span>
          </div>
          <p className="text-xs text-textSecondary">
            AI-driven study schedule tailored to your goals, weaker subjects, deadlines, and fixed commitments.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {step === 'view' ? (
            <>
              <button
                onClick={() => setStep('form')}
                className="px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-elevated/80 border border-border text-xs text-textSecondary hover:text-textPrimary flex items-center gap-1.5 transition-colors"
              >
                <Edit2 size={13} /> Edit Requirements
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-elevated/80 border border-border text-xs text-purple-400 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw size={13} className={isGenerating ? 'animate-spin' : ''} /> Regenerate
              </button>
              <button
                onClick={handleDownloadPdf}
                className="px-3.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-xs text-purple-300 flex items-center gap-1.5 font-medium shadow-sm"
              >
                <Download size={13} /> Export PDF
              </button>
              <button
                onClick={handleSaveToBackend}
                disabled={isSaving}
                className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5 shadow-md shadow-purple-500/20 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                {timetableId ? 'Save Changes' : 'Save Timetable'}
              </button>
            </>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="btn-primary text-xs px-5 py-2 flex items-center gap-2 shadow-lg shadow-purple-500/25 disabled:opacity-50 font-bold"
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Synthesizing Intelligent Schedule...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Generate Intelligent Timetable
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={15} /> {saveSuccessMsg}
        </div>
      )}

      {/* STEP 1: GUIDED REQUIREMENTS FORM */}
      {step === 'form' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: Goals, Subjects & Routine */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Academic Goal */}
            <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-3">
              <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                <Target size={16} className="text-purple-400" /> Academic Goal & Focus
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {GOALS.map((g) => (
                  <button
                    type="button"
                    key={g.id}
                    onClick={() => setAcademicGoal(g.id)}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      academicGoal === g.id
                        ? 'bg-purple-500/15 border-purple-500 text-purple-300 font-bold'
                        : 'bg-surface-elevated/70 border-border text-textSecondary hover:border-purple-500/40'
                    }`}
                  >
                    <div className="text-xs font-bold text-textPrimary">{g.label}</div>
                    <div className="text-[11px] text-textSecondary mt-0.5">{g.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Subjects List */}
            <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                    <BookOpen size={16} className="text-cyan-400" /> Subjects & Difficulty ({subjects.length})
                  </h3>
                  <p className="text-[11px] text-textSecondary">
                    AI allocates extra time to difficult subjects and imminent exam deadlines.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddSubject(true)}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1 hover:bg-cyan-500/25"
                >
                  <Plus size={13} /> Add Subject
                </button>
              </div>

              {/* Subjects Cards */}
              <div className="space-y-2">
                {subjects.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-surface-elevated border border-border/70 flex items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-textPrimary">{s.name}</span>
                        {s.is_difficult && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            Extra Focus
                          </span>
                        )}
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface-elevated text-textSecondary border border-border">
                          {s.proficiency}
                        </span>
                      </div>
                      {s.exam_date && (
                        <div className="text-[10px] text-red-400 font-semibold flex items-center gap-1">
                          <Calendar size={10} /> Exam on: {s.exam_date}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveSubject(idx)}
                      className="p-1 hover:text-red-400 text-textSecondary opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Subject Inline Form */}
              {showAddSubject && (
                <div className="p-4 rounded-xl bg-surface-elevated/90 border border-cyan-500/40 space-y-3 animate-fadeIn">
                  <div className="text-xs font-bold text-cyan-400">Add New Subject</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Subject Name (e.g. Algorithms)"
                      value={newSubj.name}
                      onChange={(e) => setNewSubj({ ...newSubj, name: e.target.value })}
                      className="px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary"
                    />
                    <select
                      value={newSubj.proficiency}
                      onChange={(e) => setNewSubj({ ...newSubj, proficiency: e.target.value })}
                      className="px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary"
                    >
                      <option value="Beginner">Proficiency: Beginner</option>
                      <option value="Intermediate">Proficiency: Intermediate</option>
                      <option value="Advanced">Proficiency: Advanced</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="text-[10px] text-textSecondary block mb-1">Target Exam Date (Optional)</label>
                      <input
                        type="date"
                        value={newSubj.exam_date}
                        onChange={(e) => setNewSubj({ ...newSubj, exam_date: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer mt-4">
                      <input
                        type="checkbox"
                        checked={newSubj.is_difficult}
                        onChange={(e) => setNewSubj({ ...newSubj, is_difficult: e.target.checked })}
                        className="rounded text-purple-500"
                      />
                      <span className="text-xs text-textPrimary">Demanding Subject (Need extra slots)</span>
                    </label>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowAddSubject(false)}
                      className="px-3 py-1 text-xs text-textSecondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddSubject}
                      className="btn-primary text-xs px-3.5 py-1 shadow-md shadow-cyan-500/20"
                    >
                      Add Subject
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Fixed Commitments (College, Work) */}
            <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" /> Fixed Non-Study Commitments ({fixedCommitments.length})
                  </h3>
                  <p className="text-[11px] text-textSecondary">
                    College, office, or personal commitments that AI must NEVER override.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddCommit(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 hover:bg-emerald-500/25"
                >
                  <Plus size={13} /> Add Commitment
                </button>
              </div>

              <div className="space-y-2">
                {fixedCommitments.map((c, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-surface-elevated border border-border flex items-center justify-between gap-3 group"
                  >
                    <div>
                      <div className="text-xs font-bold text-textPrimary">{c.title}</div>
                      <div className="text-[11px] text-textSecondary">
                        {c.start_time} - {c.end_time} • {Array.isArray(c.days) ? c.days.join(', ') : c.day}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveCommitment(i)}
                      className="p-1 hover:text-red-400 text-textSecondary opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Commitment Inline */}
              {showAddCommit && (
                <div className="p-4 rounded-xl bg-surface-elevated/90 border border-emerald-500/40 space-y-3 animate-fadeIn">
                  <input
                    type="text"
                    placeholder="Commitment Title (e.g. College Lectures)"
                    value={newCommit.title}
                    onChange={(e) => setNewCommit({ ...newCommit, title: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="time"
                      value={newCommit.start_time}
                      onChange={(e) => setNewCommit({ ...newCommit, start_time: e.target.value })}
                      className="px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary"
                    />
                    <input
                      type="time"
                      value={newCommit.end_time}
                      onChange={(e) => setNewCommit({ ...newCommit, end_time: e.target.value })}
                      className="px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowAddCommit(false)}
                      className="px-3 py-1 text-xs text-textSecondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddCommitment}
                      className="btn-primary text-xs px-3.5 py-1 shadow-md shadow-emerald-500/20"
                    >
                      Save Commitment
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Timing, Hours, Preferences */}
          <div className="space-y-6">
            {/* Timing & Daily Limits */}
            <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-4">
              <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                <Clock size={16} className="text-purple-400" /> Routine & Duration
              </h3>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-textSecondary">Target Daily Study</span>
                    <strong className="text-purple-400">{dailyHours} Hours/Day</strong>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    step="0.5"
                    value={dailyHours}
                    onChange={(e) => setDailyHours(e.target.value)}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-textSecondary block mb-1">Wake-up Time</label>
                    <input
                      type="time"
                      value={wakeTime}
                      onChange={(e) => setWakeTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-textSecondary block mb-1">Sleep Time</label>
                    <input
                      type="time"
                      value={sleepTime}
                      onChange={(e) => setSleepTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-textSecondary block mb-1">Session Block</label>
                    <select
                      value={sessionDuration}
                      onChange={(e) => setSessionDuration(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary"
                    >
                      <option value={45}>45 mins</option>
                      <option value={60}>60 mins (Standard)</option>
                      <option value={90}>90 mins (Deep)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-textSecondary block mb-1">Break Duration</label>
                    <select
                      value={breakDuration}
                      onChange={(e) => setBreakDuration(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary"
                    >
                      <option value={10}>10 mins</option>
                      <option value={15}>15 mins (Recommended)</option>
                      <option value={30}>30 mins</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={includeMeals}
                    onChange={(e) => setIncludeMeals(e.target.checked)}
                    className="rounded text-purple-500"
                  />
                  <span className="text-xs text-textPrimary">Auto-schedule Meals & Rest Windows</span>
                </label>
              </div>
            </div>

            {/* Study Methods */}
            <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-3">
              <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                <Award size={16} className="text-cyan-400" /> Active Learning Methods
              </h3>
              <div className="space-y-1.5">
                {STUDY_METHODS.map((m) => {
                  const checked = selectedMethods.includes(m);
                  return (
                    <label key={m} className="flex items-center gap-2 text-xs text-textSecondary hover:text-textPrimary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (checked) {
                            setSelectedMethods(selectedMethods.filter((x) => x !== m));
                          } else {
                            setSelectedMethods([...selectedMethods, m]);
                          }
                        }}
                        className="rounded text-cyan-500"
                      />
                      <span>{m}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Big Action Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full btn-primary text-sm py-3.5 flex items-center justify-center gap-2 shadow-xl shadow-purple-500/25 font-bold"
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Synthesizing Intelligent Schedule...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Generate Timetable Now
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: GENERATED TIMETABLE VIEW */}
      {step === 'view' && generatedData && (
        <div className="space-y-6">
          {/* Strategy Synopsis Box */}
          {generatedData.strategy_summary && (
            <div className="glass-card p-4 rounded-2xl border border-purple-500/40 bg-purple-500/5 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                <Sparkles size={18} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                  AI Academic Synthesis Synopsis
                </h4>
                <p className="text-xs text-textSecondary leading-relaxed">
                  {generatedData.strategy_summary}
                </p>
                <div className="text-[11px] text-textSecondary pt-1 flex items-center gap-4">
                  <span>Weekly Study Target: <strong className="text-textPrimary">{generatedData.total_weekly_study_hours || (availableDays.length * dailyHours)} hrs</strong></span>
                  <span>Subjects Covered: <strong className="text-textPrimary">{subjects.length}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* Day selection tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/50">
            {availableDays.map((day) => {
              const count = (generatedData.weekly_schedule?.[day] || []).length;
              return (
                <button
                  key={day}
                  onClick={() => setActiveDayView(day)}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                    activeDayView === day
                      ? 'bg-purple-500/20 border border-purple-500/60 text-purple-300 font-bold'
                      : 'text-textSecondary hover:text-textPrimary hover:bg-surface-elevated'
                  }`}
                >
                  <span>{day}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-elevated text-textSecondary font-semibold">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Day Slots Timeline */}
          <div className="space-y-2.5">
            {(generatedData.weekly_schedule?.[activeDayView] || []).map((slot, sIdx) => {
              const isBreak = slot.category === 'BREAK';
              const isFixed = slot.category === 'COMMITMENT' || slot.is_fixed;

              return (
                <div
                  key={slot.id || sIdx}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isBreak
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                      : isFixed
                      ? 'bg-slate-500/10 border-slate-500/25 text-slate-300'
                      : 'glass-card border-border/80 hover:border-purple-500/40 text-textPrimary'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className="px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold shrink-0 border"
                      style={{
                        backgroundColor: isBreak ? '#10b98115' : isFixed ? '#64748b15' : '#8b5cf615',
                        borderColor: isBreak ? '#10b98135' : isFixed ? '#64748b35' : '#8b5cf635',
                        color: isBreak ? '#10b981' : isFixed ? '#94a3b8' : '#c084fc'
                      }}
                    >
                      {slot.start_time} - {slot.end_time}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-textPrimary">
                          {slot.title || slot.subject}
                        </h4>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-surface-elevated text-textSecondary uppercase font-semibold">
                          {slot.category}
                        </span>
                      </div>
                      {slot.method && (
                        <p className="text-[11px] text-textSecondary mt-0.5">
                          Method: {slot.method}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-textSecondary font-medium self-end sm:self-center">
                    {slot.duration_minutes || 60} mins
                  </div>
                </div>
              );
            })}

            {(!generatedData.weekly_schedule?.[activeDayView] ||
              generatedData.weekly_schedule[activeDayView].length === 0) && (
              <div className="glass-card p-8 rounded-2xl border border-dashed border-border text-center text-xs text-textSecondary">
                No sessions scheduled for {activeDayView}.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIStudyBuilder;

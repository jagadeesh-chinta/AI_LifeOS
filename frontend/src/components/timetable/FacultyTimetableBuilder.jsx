import React, { useState } from 'react';
import {
  Users, BookOpen, Clock, Calendar, CheckCircle2, AlertTriangle,
  Plus, Trash2, Edit2, Download, Save, RefreshCw, ChevronRight,
  School, Building, UserCheck, Layers, Eye
} from 'lucide-react';
import { generateFacultyTimetable, createSavedTimetable, updateSavedTimetable } from '../../services/timetable.service';
import { exportFacultyPdf } from '../../utils/timetablePdf';

const ALL_WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const FacultyTimetableBuilder = ({ initialData, onSaved }) => {
  const [timetableId, setTimetableId] = useState(initialData?.id || null);
  const [title, setTitle] = useState(initialData?.title || 'Department Faculty Timetable');
  const [step, setStep] = useState(initialData?.data?.schedule_by_class ? 'view' : 'config');

  // Step 1: Institution & Timing
  const [institutionName, setInstitutionName] = useState(initialData?.settings?.institution_name || 'Dept. of Computer Science');
  const [termName, setTermName] = useState(initialData?.settings?.term_name || 'Fall Semester 2026');
  const [workingDays, setWorkingDays] = useState(initialData?.settings?.working_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [startTime, setStartTime] = useState(initialData?.settings?.start_time || '09:00');
  const [periodDuration, setPeriodDuration] = useState(initialData?.settings?.period_duration || 50);
  const [periodsPerDay, setPeriodsPerDay] = useState(initialData?.settings?.periods_per_day || 6);
  const [lunchStart, setLunchStart] = useState(initialData?.settings?.lunch_start || '12:30');
  const [lunchEnd, setLunchEnd] = useState(initialData?.settings?.lunch_end || '13:20');

  // Step 2: Classes & Rooms
  const [classes, setClasses] = useState(initialData?.settings?.classes || ['CSE-A', 'CSE-B']);
  const [rooms, setRooms] = useState(initialData?.settings?.rooms || ['Room 101', 'Room 102', 'Lab 1', 'Lab 2']);

  // Step 3: Faculty Members
  const [faculty, setFaculty] = useState(
    initialData?.settings?.faculty || [
      { id: 'f1', name: 'Dr. Alan Turing', subjects: ['Algorithms', 'Theory of Computation'], max_hours_per_day: 4, available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
      { id: 'f2', name: 'Prof. Grace Hopper', subjects: ['Database Systems', 'Compiler Design'], max_hours_per_day: 4, available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
      { id: 'f3', name: 'Dr. Claude Shannon', subjects: ['Computer Networks', 'Information Theory'], max_hours_per_day: 3, available_days: ['Monday', 'Wednesday', 'Friday'] },
      { id: 'f4', name: 'Prof. Ada Lovelace', subjects: ['Software Engineering', 'Web Architecture'], max_hours_per_day: 4, available_days: ['Tuesday', 'Wednesday', 'Thursday', 'Friday'] }
    ]
  );

  // Step 4: Curriculum Requirements
  const [curriculum, setCurriculum] = useState(
    initialData?.settings?.curriculum || [
      { code: 'CS301', name: 'Data Structures & Algorithms', class: 'CSE-A', faculty_id: 'Dr. Alan Turing', periods_per_week: 4, duration_periods: 1, room_type: 'classroom', assigned_room: 'Room 101' },
      { code: 'CS302', name: 'Database Systems', class: 'CSE-A', faculty_id: 'Prof. Grace Hopper', periods_per_week: 4, duration_periods: 1, room_type: 'classroom', assigned_room: 'Room 101' },
      { code: 'CS303', name: 'DBMS Hands-on Lab', class: 'CSE-A', faculty_id: 'Prof. Grace Hopper', periods_per_week: 2, duration_periods: 2, room_type: 'lab', assigned_room: 'Lab 1' },
      { code: 'CS304', name: 'Computer Networks', class: 'CSE-A', faculty_id: 'Dr. Claude Shannon', periods_per_week: 3, duration_periods: 1, room_type: 'classroom', assigned_room: 'Room 101' },
      { code: 'CS305', name: 'Web Architecture', class: 'CSE-A', faculty_id: 'Prof. Ada Lovelace', periods_per_week: 3, duration_periods: 1, room_type: 'classroom', assigned_room: 'Room 101' },

      { code: 'CS301', name: 'Data Structures & Algorithms', class: 'CSE-B', faculty_id: 'Dr. Alan Turing', periods_per_week: 4, duration_periods: 1, room_type: 'classroom', assigned_room: 'Room 102' },
      { code: 'CS302', name: 'Database Systems', class: 'CSE-B', faculty_id: 'Prof. Grace Hopper', periods_per_week: 4, duration_periods: 1, room_type: 'classroom', assigned_room: 'Room 102' },
      { code: 'CS303', name: 'DBMS Hands-on Lab', class: 'CSE-B', faculty_id: 'Prof. Grace Hopper', periods_per_week: 2, duration_periods: 2, room_type: 'lab', assigned_room: 'Lab 2' },
      { code: 'CS305', name: 'Web Architecture', class: 'CSE-B', faculty_id: 'Prof. Ada Lovelace', periods_per_week: 4, duration_periods: 1, room_type: 'classroom', assigned_room: 'Room 102' }
    ]
  );

  // Modal / Inputs for adding items
  const [showAddFaculty, setShowAddFaculty] = useState(false);
  const [newFac, setNewFac] = useState({ name: '', max_hours_per_day: 4, available_days: ALL_WORKING_DAYS.slice(0, 5) });

  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubj, setNewSubj] = useState({
    code: '', name: '', class: 'CSE-A', faculty_id: '', periods_per_week: 3, duration_periods: 1, room_type: 'classroom', assigned_room: 'Room 101'
  });

  // Generated Result
  const [generatedData, setGeneratedData] = useState(initialData?.data || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // View Filter states
  const [viewPerspective, setViewPerspective] = useState('class'); // 'class' | 'faculty' | 'room' | 'summary'
  const [selectedClass, setSelectedClass] = useState('CSE-A');
  const [selectedFaculty, setSelectedFaculty] = useState(faculty[0]?.name || '');
  const [selectedRoom, setSelectedRoom] = useState(rooms[0] || '');

  // Add Faculty Handler
  const handleAddFaculty = () => {
    if (!newFac.name.trim()) return;
    setFaculty([...faculty, { ...newFac, id: `f_${Date.now()}` }]);
    setNewFac({ name: '', max_hours_per_day: 4, available_days: ALL_WORKING_DAYS.slice(0, 5) });
    setShowAddFaculty(false);
  };

  // Add Subject Handler
  const handleAddSubject = () => {
    if (!newSubj.code.trim() || !newSubj.name.trim()) return;
    setCurriculum([...curriculum, { ...newSubj }]);
    setNewSubj({
      code: '', name: '', class: classes[0] || 'CSE-A', faculty_id: faculty[0]?.name || '', periods_per_week: 3, duration_periods: 1, room_type: 'classroom', assigned_room: rooms[0] || 'Room 101'
    });
    setShowAddSubject(false);
  };

  // Generate Teaching Schedule via Backend Constraint Solver
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const payload = {
        institution_name: institutionName,
        term_name: termName,
        working_days: workingDays,
        start_time: startTime,
        period_duration: Number(periodDuration),
        periods_per_day: Number(periodsPerDay),
        lunch_start: lunchStart,
        lunch_end: lunchEnd,
        classes,
        rooms,
        faculty,
        curriculum
      };

      const result = await generateFacultyTimetable(payload);
      setGeneratedData(result);
      if (classes.length > 0) setSelectedClass(classes[0]);
      if (faculty.length > 0) setSelectedFaculty(faculty[0].name);
      if (rooms.length > 0) setSelectedRoom(rooms[0]);
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
        type: 'faculty',
        description: `${institutionName} • ${classes.length} classes • ${faculty.length} faculty • ${termName}`,
        settings: {
          institution_name: institutionName,
          term_name: termName,
          working_days: workingDays,
          start_time: startTime,
          period_duration: periodDuration,
          periods_per_day: periodsPerDay,
          lunch_start: lunchStart,
          lunch_end: lunchEnd,
          classes,
          rooms,
          faculty,
          curriculum
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

      setSaveSuccessMsg('✓ Faculty Timetable saved successfully to MySQL');
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
    exportFacultyPdf(
      {
        title,
        settings: { institution_name: institutionName, term_name: termName },
        data: generatedData
      },
      viewPerspective === 'class' ? selectedClass : null
    );
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
              className="text-lg font-bold text-textPrimary bg-transparent border-b border-transparent hover:border-emerald-500/50 focus:border-emerald-500 focus:outline-none transition-colors px-1"
              placeholder="Enter Faculty Timetable Title..."
            />
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30">
              Faculty Mode
            </span>
          </div>
          <p className="text-xs text-textSecondary">
            Automated conflict-aware faculty scheduling with classroom, lab, and teaching-hours constraints.
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {step === 'view' ? (
            <>
              <button
                onClick={() => setStep('config')}
                className="px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-elevated/80 border border-border text-xs text-textSecondary hover:text-textPrimary flex items-center gap-1.5 transition-colors"
              >
                <Edit2 size={13} /> Edit Constraints
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-elevated/80 border border-border text-xs text-emerald-400 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw size={13} className={isGenerating ? 'animate-spin' : ''} /> Reschedule
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
                className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                {timetableId ? 'Save Changes' : 'Save Timetable'}
              </button>
            </>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="btn-primary text-xs px-5 py-2 flex items-center gap-2 shadow-lg shadow-emerald-500/25 disabled:opacity-50 font-bold"
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Solving Constraints & Generating...
                </>
              ) : (
                <>
                  <Users size={14} /> Generate Faculty Timetable
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

      {/* STEP 1: CONSTRAINTS & REVIEWS */}
      {step === 'config' && (
        <div className="space-y-6">
          {/* Institutional Settings */}
          <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-4">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
              <School size={16} className="text-cyan-400" /> Institution & Period Configuration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] text-textSecondary block mb-1">Institution / Dept</label>
                <input
                  type="text"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary"
                />
              </div>
              <div>
                <label className="text-[10px] text-textSecondary block mb-1">Academic Term / Sem</label>
                <input
                  type="text"
                  value={termName}
                  onChange={(e) => setTermName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary"
                />
              </div>
              <div>
                <label className="text-[10px] text-textSecondary block mb-1">College Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary"
                />
              </div>
              <div>
                <label className="text-[10px] text-textSecondary block mb-1">Periods / Day</label>
                <input
                  type="number"
                  min="4"
                  max="8"
                  value={periodsPerDay}
                  onChange={(e) => setPeriodsPerDay(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/50">
              <div>
                <label className="text-[10px] text-textSecondary block mb-1">Period Duration (Mins)</label>
                <input
                  type="number"
                  value={periodDuration}
                  onChange={(e) => setPeriodDuration(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary"
                />
              </div>
              <div>
                <label className="text-[10px] text-textSecondary block mb-1">Lunch Break Start</label>
                <input
                  type="time"
                  value={lunchStart}
                  onChange={(e) => setLunchStart(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary"
                />
              </div>
              <div>
                <label className="text-[10px] text-textSecondary block mb-1">Lunch Break End</label>
                <input
                  type="time"
                  value={lunchEnd}
                  onChange={(e) => setLunchEnd(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Faculty Members */}
            <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                    <UserCheck size={16} className="text-emerald-400" /> Faculty Members ({faculty.length})
                  </h3>
                  <p className="text-[11px] text-textSecondary">
                    Daily teaching limits and available days.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddFaculty(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 hover:bg-emerald-500/25"
                >
                  <Plus size={13} /> Add Faculty
                </button>
              </div>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {faculty.map((f, idx) => (
                  <div
                    key={f.id || idx}
                    className="p-3 rounded-xl bg-surface-elevated border border-border/70 flex items-center justify-between gap-3 group"
                  >
                    <div>
                      <div className="text-xs font-bold text-textPrimary">{f.name}</div>
                      <div className="text-[10px] text-textSecondary">
                        Max {f.max_hours_per_day} hrs/day • {f.available_days?.length || 5} working days
                      </div>
                    </div>
                    <button
                      onClick={() => setFaculty(faculty.filter((_, i) => i !== idx))}
                      className="p-1 hover:text-red-400 text-textSecondary opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {showAddFaculty && (
                <div className="p-3.5 rounded-xl bg-surface-elevated border border-emerald-500/40 space-y-2.5 animate-fadeIn">
                  <div className="text-xs font-bold text-emerald-400">Add Faculty Member</div>
                  <input
                    type="text"
                    placeholder="Faculty Name (e.g. Dr. John von Neumann)"
                    value={newFac.name}
                    onChange={(e) => setNewFac({ ...newFac, name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary"
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] text-textSecondary block mb-1">Max Periods / Day</label>
                      <input
                        type="number"
                        min="1"
                        max="6"
                        value={newFac.max_hours_per_day}
                        onChange={(e) => setNewFac({ ...newFac, max_hours_per_day: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                      <button
                        onClick={() => setShowAddFaculty(false)}
                        className="px-3 py-1 text-xs text-textSecondary"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddFaculty}
                        className="btn-primary text-xs px-3.5 py-1 shadow-md shadow-emerald-500/20"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Curriculum Allocations */}
            <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                    <BookOpen size={16} className="text-purple-400" /> Subject Allocations ({curriculum.length})
                  </h3>
                  <p className="text-[11px] text-textSecondary">
                    Classes, assigned faculty, and weekly teaching loads.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddSubject(true)}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 text-xs font-semibold flex items-center gap-1 hover:bg-purple-500/25"
                >
                  <Plus size={13} /> Add Subject
                </button>
              </div>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {curriculum.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-surface-elevated border border-border/70 flex items-center justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-textPrimary">{c.code} - {c.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300 font-semibold">
                          {c.class}
                        </span>
                        {c.duration_periods > 1 && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 font-semibold">
                            {c.duration_periods}h Lab Block
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-textSecondary mt-0.5">
                        Faculty: {c.faculty_id} • {c.periods_per_week} periods/wk • {c.assigned_room}
                      </div>
                    </div>
                    <button
                      onClick={() => setCurriculum(curriculum.filter((_, i) => i !== idx))}
                      className="p-1 hover:text-red-400 text-textSecondary opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {showAddSubject && (
                <div className="p-3.5 rounded-xl bg-surface-elevated border border-purple-500/40 space-y-2.5 animate-fadeIn">
                  <div className="text-xs font-bold text-purple-400">Add Subject Requirement</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Code (e.g. CS306)"
                      value={newSubj.code}
                      onChange={(e) => setNewSubj({ ...newSubj, code: e.target.value })}
                      className="px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary"
                    />
                    <input
                      type="text"
                      placeholder="Name (e.g. Cloud Systems)"
                      value={newSubj.name}
                      onChange={(e) => setNewSubj({ ...newSubj, name: e.target.value })}
                      className="px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={newSubj.class}
                      onChange={(e) => setNewSubj({ ...newSubj, class: e.target.value })}
                      className="px-2 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary"
                    >
                      {classes.map((cls) => (
                        <option key={cls} value={cls}>Class: {cls}</option>
                      ))}
                    </select>
                    <select
                      value={newSubj.faculty_id}
                      onChange={(e) => setNewSubj({ ...newSubj, faculty_id: e.target.value })}
                      className="px-2 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary"
                    >
                      <option value="">Select Faculty...</option>
                      {faculty.map((f) => (
                        <option key={f.id} value={f.name}>{f.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      placeholder="Periods/Wk"
                      value={newSubj.periods_per_week}
                      onChange={(e) => setNewSubj({ ...newSubj, periods_per_week: Number(e.target.value) })}
                      className="px-2 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setShowAddSubject(false)}
                      className="px-3 py-1 text-xs text-textSecondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddSubject}
                      className="btn-primary text-xs px-3.5 py-1 shadow-md shadow-purple-500/20"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: GENERATED VIEW WITH MULTIPLE PERSPECTIVES */}
      {step === 'view' && generatedData && (
        <div className="space-y-6">
          {/* Bottlenecks / Feasibility Alert */}
          {!generatedData.is_valid && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertTriangle size={16} />
                <span>Scheduling Constraint Bottlenecks Detected</span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                Some requirements could not be assigned without violating hard constraints (faculty clash, period limits, or hours).
              </p>
              {generatedData.bottlenecks?.map((b, i) => (
                <div key={i} className="pl-5 text-[11px]">
                  • <strong>{b.message}</strong> <em>(Suggestion: {b.suggestion})</em>
                </div>
              ))}
            </div>
          )}

          {/* Perspective Selector Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/50">
            <div className="flex p-1 bg-surface-elevated rounded-xl border border-border text-xs">
              <button
                onClick={() => setViewPerspective('class')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  viewPerspective === 'class' ? 'bg-emerald-500 text-white font-bold' : 'text-textSecondary hover:text-textPrimary'
                }`}
              >
                By Class / Section
              </button>
              <button
                onClick={() => setViewPerspective('faculty')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  viewPerspective === 'faculty' ? 'bg-emerald-500 text-white font-bold' : 'text-textSecondary hover:text-textPrimary'
                }`}
              >
                By Faculty Member
              </button>
              <button
                onClick={() => setViewPerspective('summary')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  viewPerspective === 'summary' ? 'bg-emerald-500 text-white font-bold' : 'text-textSecondary hover:text-textPrimary'
                }`}
              >
                Workload Audit
              </button>
            </div>

            {/* Sub-selector Dropdown */}
            {viewPerspective === 'class' && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-textSecondary">Select Class:</span>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border text-textPrimary font-bold"
                >
                  {classes.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            {viewPerspective === 'faculty' && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-textSecondary">Select Faculty:</span>
                <select
                  value={selectedFaculty}
                  onChange={(e) => setSelectedFaculty(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border text-textPrimary font-bold"
                >
                  {faculty.map((f) => (
                    <option key={f.name} value={f.name}>{f.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* PERSPECTIVE 1 & 2: TIMETABLE GRID (CLASS / FACULTY) */}
          {(viewPerspective === 'class' || viewPerspective === 'faculty') && (
            <div className="overflow-x-auto pb-4">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="border-b border-border/80 bg-surface-elevated/70">
                    <th className="p-3 text-xs font-bold text-textPrimary w-24">Day</th>
                    {(generatedData.period_slots || []).map((slot, sIdx) => (
                      <th key={sIdx} className="p-3 text-center text-xs font-bold text-textPrimary">
                        <div>{slot.label}</div>
                        <div className="text-[10px] text-cyan-400 font-normal">
                          {slot.start_time} - {slot.end_time}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(generatedData.working_days || []).map((day) => {
                    const rowSlots =
                      viewPerspective === 'class'
                        ? generatedData.schedule_by_class?.[selectedClass]?.[day] || []
                        : generatedData.schedule_by_faculty?.[selectedFaculty]?.[day] || [];

                    return (
                      <tr key={day} className="border-b border-border/40 hover:bg-surface-elevated/30 transition-colors">
                        <td className="p-3 font-bold text-xs text-textPrimary">{day}</td>
                        {(generatedData.period_slots || []).map((slot, sIdx) => {
                          const item = rowSlots[sIdx];
                          if (!item) {
                            return (
                              <td key={sIdx} className="p-2 text-center">
                                <div className="p-2 rounded-xl border border-dashed border-border/50 text-[10px] text-textSecondary/60 min-h-[58px] flex items-center justify-center">
                                  Free
                                </div>
                              </td>
                            );
                          }
                          if (item.is_break) {
                            return (
                              <td key={sIdx} className="p-2 text-center bg-emerald-500/5">
                                <div className="text-[10px] font-bold text-emerald-400 py-4 uppercase tracking-wider">
                                  Lunch Break
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td key={sIdx} className="p-2">
                              <div
                                className="p-2.5 rounded-xl border transition-all text-xs space-y-1 min-h-[58px]"
                                style={{
                                  backgroundColor: `${item.color || '#8b5cf6'}15`,
                                  borderColor: `${item.color || '#8b5cf6'}35`,
                                  color: '#f8fafc'
                                }}
                              >
                                <div className="font-bold flex items-center justify-between text-[11px]">
                                  <span>{item.code}</span>
                                  {viewPerspective === 'faculty' ? (
                                    <span className="text-[9px] px-1 rounded bg-black/30 font-mono">
                                      {item.class}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-textSecondary font-mono">
                                      [{item.room || 'Room'}]
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] font-medium line-clamp-1 text-slate-200">
                                  {item.name}
                                </div>
                                {viewPerspective === 'class' && (
                                  <div className="text-[9px] text-cyan-300 font-medium">
                                    {item.faculty}
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* PERSPECTIVE 3: WORKLOAD AUDIT TABLE */}
          {viewPerspective === 'summary' && (
            <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-4">
              <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                <UserCheck size={16} className="text-purple-400" /> Faculty Workload Fulfillment & Hours Audit
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/60 text-textSecondary pb-2">
                      <th className="py-2.5 font-semibold">Faculty Member</th>
                      <th className="py-2.5 font-semibold">Target Periods / Wk</th>
                      <th className="py-2.5 font-semibold">Scheduled Periods</th>
                      <th className="py-2.5 font-semibold">Utilization Rate</th>
                      <th className="py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(generatedData.faculty_summary || []).map((f, i) => (
                      <tr key={i} className="border-b border-border/40 py-2">
                        <td className="py-2.5 font-bold text-textPrimary">{f.faculty_name}</td>
                        <td className="py-2.5 text-textSecondary">{f.target_periods} periods</td>
                        <td className="py-2.5 font-mono text-cyan-400 font-bold">{f.scheduled_periods} periods</td>
                        <td className="py-2.5 font-mono text-purple-300">{f.utilization_rate}%</td>
                        <td className="py-2.5">
                          {f.utilization_rate >= 100 ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">
                              ✓ 100% Fulfilled
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold">
                              Partial Allocation
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FacultyTimetableBuilder;

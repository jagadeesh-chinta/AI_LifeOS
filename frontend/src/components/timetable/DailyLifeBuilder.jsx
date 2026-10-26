import React, { useState, useEffect } from 'react';
import {
  Clock, Plus, Trash2, Edit2, Copy, AlertTriangle, CheckCircle,
  Save, Download, Calendar, Sparkles, X, ChevronRight, Layers,
  RefreshCw, Sun, Moon, Coffee, Dumbbell, Briefcase, BookOpen, User, Plane
} from 'lucide-react';
import { exportDailyLifePdf } from '../../utils/timetablePdf';
import { createSavedTimetable, updateSavedTimetable } from '../../services/timetable.service';

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const CATEGORIES = [
  { label: 'Study & Learning', value: 'Study', icon: BookOpen, color: '#06b6d4' },
  { label: 'Work & Job', value: 'Work', icon: Briefcase, color: '#8b5cf6' },
  { label: 'Fitness & Health', value: 'Exercise', icon: Dumbbell, color: '#10b981' },
  { label: 'Meals & Food', value: 'Meals', icon: Coffee, color: '#f59e0b' },
  { label: 'Travel & Commute', value: 'Travel', icon: Plane, color: '#3b82f6' },
  { label: 'Rest & Leisure', value: 'Rest', icon: Moon, color: '#ec4899' },
  { label: 'Personal & Routine', value: 'Personal', icon: User, color: '#64748b' }
];

const DailyLifeBuilder = ({ initialData, onSaved, onBackToModes }) => {
  const [timetableId, setTimetableId] = useState(initialData?.id || null);
  const [title, setTitle] = useState(initialData?.title || 'My Weekly Routine');
  const [weekStartDate, setWeekStartDate] = useState(initialData?.settings?.week_start_date || '');
  const [selectedDays, setSelectedDays] = useState(initialData?.settings?.days || ALL_DAYS);
  const [dailyStartTime, setDailyStartTime] = useState(initialData?.settings?.daily_start_time || '07:00');
  const [dailyEndTime, setDailyEndTime] = useState(initialData?.settings?.daily_end_time || '23:00');
  const [timeFormat, setTimeFormat] = useState(initialData?.settings?.time_format || '12');
  const [notes, setNotes] = useState(initialData?.settings?.notes || '');

  // Activities list
  const [activities, setActivities] = useState(
    initialData?.data?.activities || [
      {
        id: 'act_1',
        title: 'Morning Yoga & Meditation',
        days: ['Monday', 'Wednesday', 'Friday'],
        start_time: '07:00',
        end_time: '07:45',
        category: 'Exercise',
        description: 'Sun salutations and breathing exercises',
        priority: 'High',
        location: 'Home Gym',
        color: '#10b981'
      },
      {
        id: 'act_2',
        title: 'Full Stack Development',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        start_time: '09:00',
        end_time: '11:30',
        category: 'Study',
        description: 'React, Node.js API development and testing',
        priority: 'High',
        location: 'Study Desk',
        color: '#06b6d4'
      },
      {
        id: 'act_3',
        title: 'Lunch & Break',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        start_time: '12:30',
        end_time: '13:30',
        category: 'Meals',
        description: 'Nutritious lunch and mental break',
        priority: 'Medium',
        location: 'Dining',
        color: '#f59e0b'
      }
    ]
  );

  // Active day filter for Day View
  const [activeDayTab, setActiveDayTab] = useState('Monday');
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly' | 'day'

  // Activity Edit/Add Modal
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [activityForm, setActivityForm] = useState({
    title: '',
    days: ['Monday'],
    start_time: '09:00',
    end_time: '10:00',
    category: 'Study',
    description: '',
    priority: 'Medium',
    location: '',
    color: '#06b6d4'
  });

  // Copy Day Dialog
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceDay, setCopySourceDay] = useState('Monday');
  const [copyTargetDay, setCopyTargetDay] = useState('Tuesday');

  // Saving states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [conflicts, setConflicts] = useState([]);

  // Validate overlaps whenever activities change
  useEffect(() => {
    validateOverlaps();
  }, [activities]);

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const validateOverlaps = () => {
    const clashing = [];
    ALL_DAYS.forEach((day) => {
      const dayActs = activities.filter((a) => {
        if (Array.isArray(a.days)) return a.days.includes(day) || a.days.includes('Daily');
        return a.day === day || a.day === 'Daily' || a.day_of_week === day;
      });

      for (let i = 0; i < dayActs.length; i++) {
        for (let j = i + 1; j < dayActs.length; j++) {
          const a = dayActs[i];
          const b = dayActs[j];
          const aStart = timeToMinutes(a.start_time);
          const aEnd = timeToMinutes(a.end_time);
          const bStart = timeToMinutes(b.start_time);
          const bEnd = timeToMinutes(b.end_time);

          if (Math.max(aStart, bStart) < Math.min(aEnd, bEnd)) {
            clashing.push({
              day,
              actA: a.title,
              timeA: `${a.start_time}-${a.end_time}`,
              actB: b.title,
              timeB: `${b.start_time}-${b.end_time}`
            });
          }
        }
      }
    });
    setConflicts(clashing);
  };

  // Open modal to add or edit
  const handleOpenAdd = () => {
    setEditingActivityId(null);
    setActivityForm({
      title: '',
      days: [activeDayTab],
      start_time: '10:00',
      end_time: '11:00',
      category: 'Study',
      description: '',
      priority: 'Medium',
      location: '',
      color: '#06b6d4'
    });
    setShowActivityModal(true);
  };

  const handleOpenEdit = (act) => {
    setEditingActivityId(act.id);
    setActivityForm({
      title: act.title,
      days: Array.isArray(act.days) ? act.days : [act.day || 'Monday'],
      start_time: act.start_time,
      end_time: act.end_time,
      category: act.category || 'Study',
      description: act.description || '',
      priority: act.priority || 'Medium',
      location: act.location || '',
      color: act.color || '#06b6d4'
    });
    setShowActivityModal(true);
  };

  const handleSaveActivity = (e) => {
    e.preventDefault();
    if (!activityForm.title.trim()) return;
    if (activityForm.end_time <= activityForm.start_time) {
      alert('End time must be later than start time');
      return;
    }

    const catObj = CATEGORIES.find((c) => c.value === activityForm.category);
    const newAct = {
      ...activityForm,
      id: editingActivityId || `act_${Date.now()}`,
      color: catObj?.color || activityForm.color
    };

    if (editingActivityId) {
      setActivities((prev) => prev.map((a) => (a.id === editingActivityId ? newAct : a)));
    } else {
      setActivities((prev) => [...prev, newAct]);
    }

    setShowActivityModal(false);
  };

  const handleDeleteActivity = (id) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  const handleDuplicateActivity = (act) => {
    const duplicated = {
      ...act,
      id: `act_${Date.now()}`,
      title: `${act.title} (Copy)`
    };
    setActivities((prev) => [...prev, duplicated]);
  };

  // Copy one day to another
  const handleExecuteCopyDay = () => {
    const sourceActs = activities.filter((a) => {
      if (Array.isArray(a.days)) return a.days.includes(copySourceDay);
      return a.day === copySourceDay;
    });

    if (sourceActs.length === 0) {
      alert(`No activities found on ${copySourceDay} to copy.`);
      return;
    }

    // For each source act, ensure copyTargetDay is added to its days or create cloned act
    const updated = activities.map((act) => {
      const actDays = Array.isArray(act.days) ? [...act.days] : [act.day];
      if (actDays.includes(copySourceDay) && !actDays.includes(copyTargetDay)) {
        return { ...act, days: [...actDays, copyTargetDay] };
      }
      return act;
    });

    setActivities(updated);
    setShowCopyModal(false);
    setActiveDayTab(copyTargetDay);
    alert(`Copied ${sourceActs.length} activities from ${copySourceDay} to ${copyTargetDay}.`);
  };

  // Save to backend
  const handleSaveToBackend = async () => {
    setIsSaving(true);
    setSaveSuccessMsg('');
    try {
      const payload = {
        title,
        type: 'daily',
        description: `${activities.length} routine activities across ${selectedDays.length} days`,
        settings: {
          week_start_date: weekStartDate,
          days: selectedDays,
          daily_start_time: dailyStartTime,
          daily_end_time: dailyEndTime,
          time_format: timeFormat,
          notes
        },
        data: {
          activities
        }
      };

      let result;
      if (timetableId) {
        result = await updateSavedTimetable(timetableId, payload);
      } else {
        result = await createSavedTimetable(payload);
        setTimetableId(result.id);
      }

      setSaveSuccessMsg('✓ Timetable saved successfully to MySQL');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
      if (onSaved) onSaved(result);
    } catch (err) {
      alert('Failed to save timetable: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = () => {
    exportDailyLifePdf({
      title,
      settings: { week_start_date: weekStartDate },
      data: { activities }
    });
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header Info Banner */}
      <div className="glass-card p-5 rounded-2xl border border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-bold text-textPrimary bg-transparent border-b border-transparent hover:border-cyan-500/50 focus:border-cyan-500 focus:outline-none transition-colors px-1"
              placeholder="Enter Timetable Title..."
            />
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-semibold border border-cyan-500/30">
              Daily Life Mode
            </span>
          </div>
          <p className="text-xs text-textSecondary">
            Plan custom day-by-day routines, schedule recurring habits, and eliminate overlapping time clashes.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowCopyModal(true)}
            className="px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-elevated/80 border border-border text-xs text-textSecondary hover:text-textPrimary flex items-center gap-1.5 transition-colors"
          >
            <Copy size={13} /> Copy Day Routine
          </button>
          <button
            onClick={handleDownloadPdf}
            className="px-3.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-xs text-purple-300 flex items-center gap-1.5 transition-colors font-medium shadow-sm"
          >
            <Download size={13} /> Export PDF
          </button>
          <button
            onClick={handleSaveToBackend}
            disabled={isSaving}
            className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5 shadow-md shadow-cyan-500/20 disabled:opacity-50"
          >
            {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
            {timetableId ? 'Save Changes' : 'Save Timetable'}
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle size={15} /> {saveSuccessMsg}
        </div>
      )}

      {/* Conflict Warning Alert */}
      {conflicts.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle size={15} className="text-amber-400" />
            <span>Overlap Conflict Detected ({conflicts.length})</span>
          </div>
          <div className="pl-6 space-y-0.5 text-[11px] text-amber-200/90">
            {conflicts.slice(0, 3).map((c, i) => (
              <div key={i}>
                • {c.day}: "{c.actA}" ({c.timeA}) overlaps with "{c.actB}" ({c.timeB})
              </div>
            ))}
            {conflicts.length > 3 && <div>...and {conflicts.length - 3} more conflict(s)</div>}
          </div>
        </div>
      )}

      {/* Controls Bar: View Toggle, Add Activity, Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-surface-elevated rounded-xl border border-border text-xs">
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                viewMode === 'weekly' ? 'bg-cyan-500 text-white shadow-sm' : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              Weekly 7-Day Grid
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                viewMode === 'day' ? 'bg-cyan-500 text-white shadow-sm' : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              Day-by-Day View
            </button>
          </div>

          <span className="text-xs text-textSecondary hidden md:inline">
            Total Activities: <strong className="text-textPrimary">{activities.length}</strong>
          </span>
        </div>

        <button
          onClick={handleOpenAdd}
          className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 shadow-md shadow-cyan-500/20 self-start sm:self-auto"
        >
          <Plus size={14} /> Add Activity
        </button>
      </div>

      {/* VIEW MODE 1: WEEKLY 7-DAY GRID */}
      {viewMode === 'weekly' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 overflow-x-auto pb-4">
          {ALL_DAYS.map((day) => {
            const dayActs = activities.filter((a) => {
              if (Array.isArray(a.days)) return a.days.includes(day) || a.days.includes('Daily');
              return a.day === day || a.day === 'Daily' || a.day_of_week === day;
            }).sort((a, b) => a.start_time.localeCompare(b.start_time));

            return (
              <div
                key={day}
                className="glass-card p-3 rounded-2xl border border-border/70 flex flex-col min-w-[150px] space-y-2.5"
              >
                {/* Day Header */}
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <span className="text-xs font-bold text-textPrimary">{day.slice(0, 3)}</span>
                  <span className="text-[10px] text-textSecondary font-semibold px-1.5 py-0.5 rounded-md bg-surface-elevated">
                    {dayActs.length}
                  </span>
                </div>

                {/* Day Slots */}
                <div className="space-y-2 min-h-[160px]">
                  {dayActs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-3 text-center border border-dashed border-border/50 rounded-xl text-[11px] text-textSecondary/60">
                      <span>Free Day / Rest</span>
                    </div>
                  ) : (
                    dayActs.map((act) => {
                      const cat = CATEGORIES.find((c) => c.value === act.category) || CATEGORIES[0];
                      const Icon = cat.icon;
                      return (
                        <div
                          key={act.id}
                          className="p-2.5 rounded-xl border border-border/60 hover:border-cyan-500/40 transition-all group bg-surface-elevated/70 relative"
                        >
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <span className="text-[10px] font-bold text-cyan-400">
                              {act.start_time} - {act.end_time}
                            </span>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEdit(act)}
                                className="p-0.5 hover:text-cyan-400 text-textSecondary"
                              >
                                <Edit2 size={11} />
                              </button>
                              <button
                                onClick={() => handleDeleteActivity(act.id)}
                                className="p-0.5 hover:text-red-400 text-textSecondary"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                          <div className="text-xs font-semibold text-textPrimary leading-snug line-clamp-1">
                            {act.title}
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-textSecondary">
                            <Icon size={10} style={{ color: cat.color }} />
                            <span>{act.category}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 2: DAY-BY-DAY LIST */}
      {viewMode === 'day' && (
        <div className="space-y-4">
          {/* Day selection tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border/50">
            {ALL_DAYS.map((day) => {
              const count = activities.filter((a) => {
                if (Array.isArray(a.days)) return a.days.includes(day) || a.days.includes('Daily');
                return a.day === day || a.day === 'Daily';
              }).length;

              return (
                <button
                  key={day}
                  onClick={() => setActiveDayTab(day)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeDayTab === day
                      ? 'bg-cyan-500/15 border border-cyan-500/50 text-cyan-400 font-bold'
                      : 'text-textSecondary hover:text-textPrimary hover:bg-surface-elevated'
                  }`}
                >
                  <span>{day}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-elevated text-textSecondary">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Activities list for active day */}
          <div className="space-y-2.5">
            {activities
              .filter((a) => {
                if (Array.isArray(a.days)) return a.days.includes(activeDayTab) || a.days.includes('Daily');
                return a.day === activeDayTab || a.day === 'Daily';
              })
              .sort((a, b) => a.start_time.localeCompare(b.start_time))
              .map((act) => {
                const cat = CATEGORIES.find((c) => c.value === act.category) || CATEGORIES[0];
                const Icon = cat.icon;

                return (
                  <div
                    key={act.id}
                    className="glass-card p-4 rounded-2xl border border-border/80 hover:border-cyan-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                        style={{ backgroundColor: `${cat.color}15`, borderColor: `${cat.color}35`, color: cat.color }}
                      >
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-cyan-400">
                            {act.start_time} - {act.end_time}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-elevated text-textSecondary border border-border">
                            {act.category}
                          </span>
                          {act.priority && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                act.priority === 'High'
                                  ? 'text-red-400 bg-red-500/10'
                                  : act.priority === 'Medium'
                                  ? 'text-amber-400 bg-amber-500/10'
                                  : 'text-emerald-400 bg-emerald-500/10'
                              }`}
                            >
                              {act.priority}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-textPrimary mt-0.5">{act.title}</h4>
                        {act.description && (
                          <p className="text-xs text-textSecondary mt-0.5">{act.description}</p>
                        )}
                        {act.location && (
                          <span className="text-[11px] text-textSecondary/80 mt-1 inline-block">
                            📍 {act.location}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDuplicateActivity(act)}
                        title="Duplicate Activity"
                        className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-elevated/80 text-textSecondary hover:text-textPrimary transition-colors"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(act)}
                        title="Edit Activity"
                        className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-elevated/80 text-textSecondary hover:text-cyan-400 transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteActivity(act.id)}
                        title="Delete Activity"
                        className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-elevated/80 text-textSecondary hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}

            {activities.filter((a) => {
              if (Array.isArray(a.days)) return a.days.includes(activeDayTab) || a.days.includes('Daily');
              return a.day === activeDayTab || a.day === 'Daily';
            }).length === 0 && (
              <div className="glass-card p-8 rounded-2xl border border-dashed border-border text-center space-y-2">
                <p className="text-xs text-textSecondary">No activities scheduled for {activeDayTab}.</p>
                <button
                  onClick={handleOpenAdd}
                  className="btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1 shadow-md shadow-cyan-500/20"
                >
                  <Plus size={13} /> Add Activity for {activeDayTab}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACTIVITY ADD / EDIT MODAL */}
      {showActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card max-w-lg w-full p-6 rounded-3xl border border-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="text-base font-bold text-textPrimary">
                {editingActivityId ? 'Edit Activity' : 'Add New Activity'}
              </h3>
              <button
                onClick={() => setShowActivityModal(false)}
                className="p-1 text-textSecondary hover:text-textPrimary rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-textSecondary block mb-1">Activity Title *</label>
                <input
                  type="text"
                  required
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  placeholder="e.g. Java Programming, Gym Workout, Lunch..."
                  className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border text-textPrimary text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Day selection checkboxes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-textSecondary">Active Days</label>
                  <div className="flex items-center gap-2 text-[10px] text-cyan-400">
                    <button
                      type="button"
                      onClick={() => setActivityForm({ ...activityForm, days: [...ALL_DAYS] })}
                      className="hover:underline"
                    >
                      All 7 Days
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() =>
                        setActivityForm({
                          ...activityForm,
                          days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
                        })
                      }
                      className="hover:underline"
                    >
                      Weekdays
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DAYS.map((d) => {
                    const isSelected = activityForm.days.includes(d);
                    return (
                      <button
                        type="button"
                        key={d}
                        onClick={() => {
                          if (isSelected) {
                            if (activityForm.days.length > 1) {
                              setActivityForm({
                                ...activityForm,
                                days: activityForm.days.filter((x) => x !== d)
                              });
                            }
                          } else {
                            setActivityForm({ ...activityForm, days: [...activityForm.days, d] });
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-cyan-500 text-white font-bold'
                            : 'bg-surface-elevated border border-border text-textSecondary hover:text-textPrimary'
                        }`}
                      >
                        {d.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-textSecondary block mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={activityForm.start_time}
                    onChange={(e) => setActivityForm({ ...activityForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border text-textPrimary text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-textSecondary block mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={activityForm.end_time}
                    onChange={(e) => setActivityForm({ ...activityForm, end_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border text-textPrimary text-xs focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-textSecondary block mb-1">Category</label>
                  <select
                    value={activityForm.category}
                    onChange={(e) => setActivityForm({ ...activityForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border text-textPrimary text-xs focus:border-cyan-500 focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-textSecondary block mb-1">Priority</label>
                  <select
                    value={activityForm.priority}
                    onChange={(e) => setActivityForm({ ...activityForm, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border text-textPrimary text-xs focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-textSecondary block mb-1">Location (Optional)</label>
                <input
                  type="text"
                  value={activityForm.location}
                  onChange={(e) => setActivityForm({ ...activityForm, location: e.target.value })}
                  placeholder="e.g. Study Room, Main Library, Home"
                  className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border text-textPrimary text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-textSecondary block mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={activityForm.description}
                  onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                  placeholder="Add specific notes, chapter goals, or instructions..."
                  className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border text-textPrimary text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setShowActivityModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-border text-xs text-textSecondary hover:text-textPrimary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs px-4 py-1.5 shadow-md shadow-cyan-500/20"
                >
                  {editingActivityId ? 'Update Activity' : 'Save to Timetable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COPY DAY MODAL */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card max-w-sm w-full p-6 rounded-3xl border border-border shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-textPrimary">Copy Day Timetable</h3>
            <p className="text-xs text-textSecondary">
              Duplicate all activities from one day directly into another day.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-textSecondary block mb-1">From Day</label>
                <select
                  value={copySourceDay}
                  onChange={(e) => setCopySourceDay(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border text-textPrimary text-xs"
                >
                  {ALL_DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-textSecondary block mb-1">To Target Day</label>
                <select
                  value={copyTargetDay}
                  onChange={(e) => setCopyTargetDay(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border text-textPrimary text-xs"
                >
                  {ALL_DAYS.filter((d) => d !== copySourceDay).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
              <button
                onClick={() => setShowCopyModal(false)}
                className="px-3 py-1.5 rounded-xl border border-border text-xs text-textSecondary"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteCopyDay}
                className="btn-primary text-xs px-3.5 py-1.5 shadow-md shadow-cyan-500/20"
              >
                Execute Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyLifeBuilder;

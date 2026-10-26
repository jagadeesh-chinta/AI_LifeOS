import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getTasks, createTask, updateTask, deleteTask } from '../services/task.service';
import { 
  Plus, 
  Check, 
  Trash2, 
  Edit3, 
  Clock, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  AlertCircle,
  X, 
  Search, 
  Loader2, 
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Tag,
  BrainCircuit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TaskDecomposerModal from '../components/tasks/TaskDecomposerModal';

// Helper to get local date in YYYY-MM-DD format (no UTC date shifts)
export const getLocalTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Convert 12h hour + minute + period into standard 24h HH:MM for backend
export const to24Hour = (hourStr, minuteStr, period) => {
  let h = parseInt(hourStr, 10);
  const m = minuteStr.padStart(2, '0');
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m}`;
};

// Convert 24h or 12h string into { hour: "09", minute: "00", period: "AM" }
export const parseTo12hParts = (timeStr, defaultHour = '09', defaultMinute = '00', defaultPeriod = 'AM') => {
  if (!timeStr) return { hour: defaultHour, minute: defaultMinute, period: defaultPeriod };
  const str = timeStr.toString().trim().toUpperCase();

  const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = match12[2];
    const period = match12[3];
    return { hour: String(h).padStart(2, '0'), minute: m, period };
  }

  const match24 = str.match(/^(\d{1,2}):(\d{2})/);
  if (match24) {
    let h = parseInt(match24[1], 10);
    const m = match24[2];
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return { hour: String(h).padStart(2, '0'), minute: m, period };
  }

  return { hour: defaultHour, minute: defaultMinute, period: defaultPeriod };
};

// Format 24h into clean 12h AM/PM for card display
export const formatTime12h = (timeStr) => {
  if (!timeStr) return '';
  const parts = parseTo12hParts(timeStr);
  return `${parts.hour}:${parts.minute} ${parts.period}`;
};

// Calculate duration from 12h components
export const calculateDurationFrom12h = (sh, sm, sp, eh, em, ep) => {
  const s24 = to24Hour(sh, sm, sp);
  const e24 = to24Hour(eh, em, ep);
  const [sH, sM] = s24.split(':').map(Number);
  const [eH, eM] = e24.split(':').map(Number);

  let diff = (eH * 60 + eM) - (sH * 60 + sM);
  if (diff <= 0) return '';

  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours > 0 && mins > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minute${mins > 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  return `${mins} minutes`;
};

// Dynamic status calculation: exactly PENDING or COMPLETED (no Overdue)
export const computeLiveStatus = (task) => {
  if (task.status === 'COMPLETED' || task.is_completed) {
    return 'COMPLETED';
  }

  const dateStr = task.task_date || (task.due_date ? task.due_date.substring(0, 10) : null);
  if (!dateStr) return 'PENDING';

  const localToday = getLocalTodayDateString();
  const now = new Date();
  const localNowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // If task date is in the past, automatically Completed
  if (dateStr < localToday) {
    return 'COMPLETED';
  }

  // If task date is in the future, automatically Pending
  if (dateStr > localToday) {
    return 'PENDING';
  }

  // If task date is today, check if scheduled end time has passed
  if (dateStr === localToday) {
    const rawEnd = task.end_time || task.start_time;
    if (rawEnd) {
      const parts = parseTo12hParts(rawEnd);
      const end24 = to24Hour(parts.hour, parts.minute, parts.period);
      if (end24 <= localNowTime) {
        return 'COMPLETED';
      }
    }
    return 'PENDING';
  }

  return 'PENDING';
};

// Clean date formatting without UTC timezone drift
export const formatCardDate = (dateStr) => {
  if (!dateStr) return 'No Date';
  const today = getLocalTodayDateString();
  const tomorrow = getTomorrowDateString();

  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';

  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return `${months[mIdx]} ${day}, ${parts[0]}`;
  }
  return dateStr;
};

// Custom 12-hour AM/PM Time Selector Component
const AmPmTimePicker = ({ label, hour, minute, period, onHourChange, onMinuteChange, onPeriodChange }) => {
  const hours = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  return (
    <div>
      <label className="block text-sm font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
        <Clock size={16} className="text-accent" />
        {label}
      </label>
      <div className="flex items-center gap-2 bg-input-background border border-border rounded-xl p-2 focus-within:border-primary/50 transition-colors">
        {/* Hour Select */}
        <select
          value={hour}
          onChange={(e) => onHourChange(e.target.value)}
          className="bg-transparent text-textPrimary font-mono font-bold text-base px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer flex-1 text-center"
        >
          {hours.map(h => (
            <option key={h} value={h} className="bg-surface text-textPrimary">{h}</option>
          ))}
        </select>

        <span className="text-textSecondary font-bold font-mono">:</span>

        {/* Minute Select */}
        <select
          value={minute}
          onChange={(e) => onMinuteChange(e.target.value)}
          className="bg-transparent text-textPrimary font-mono font-bold text-base px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer flex-1 text-center"
        >
          {minutes.map(m => (
            <option key={m} value={m} className="bg-surface text-textPrimary">{m}</option>
          ))}
        </select>

        {/* AM / PM Toggle Buttons */}
        <div className="flex items-center bg-surface-elevated rounded-lg p-0.5 border border-border ml-1">
          <button
            type="button"
            onClick={() => onPeriodChange('AM')}
            className={`px-3 py-1.5 rounded-md text-xs font-extrabold transition-all ${
              period === 'AM'
                ? 'bg-accent text-white shadow-md shadow-accent/20'
                : 'text-textSecondary hover:text-textPrimary'
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => onPeriodChange('PM')}
            className={`px-3 py-1.5 rounded-md text-xs font-extrabold transition-all ${
              period === 'PM'
                ? 'bg-accent text-white shadow-md shadow-accent/20'
                : 'text-textSecondary hover:text-textPrimary'
            }`}
          >
            PM
          </button>
        </div>
      </div>
    </div>
  );
};

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // Exactly 3 options: 'ALL' | 'PENDING' | 'COMPLETED'
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingTask, setDeletingTask] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [decomposingTask, setDecomposingTask] = useState(null);

  // Notification banners
  const [successMsg, setSuccessMsg] = useState('');
  const [pageErrorMsg, setPageErrorMsg] = useState('');
  const [formError, setFormError] = useState('');

  // Form input states
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(() => getLocalTodayDateString());

  // 12-Hour AM/PM Time States
  const [startHour, setStartHour] = useState('09');
  const [startMinute, setStartMinute] = useState('00');
  const [startPeriod, setStartPeriod] = useState('AM');

  const [endHour, setEndHour] = useState('10');
  const [endMinute, setEndMinute] = useState('00');
  const [endPeriod, setEndPeriod] = useState('AM');

  const [formPriority, setFormPriority] = useState('MEDIUM');
  const [formDescription, setFormDescription] = useState('');

  // Fetch tasks on initial mount
  const fetchTaskList = useCallback(async () => {
    try {
      setLoading(true);
      setPageErrorMsg('');
      const data = await getTasks();
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setPageErrorMsg('Unable to load tasks. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTaskList();
  }, [fetchTaskList]);

  // Periodic status recalculation while the application is open
  // Automatically updates any task whose scheduled end time passes without requiring a page refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(prevTasks => {
        let changed = false;
        const updated = prevTasks.map(task => {
          const liveStatus = computeLiveStatus(task);
          if (liveStatus !== task.status) {
            changed = true;
            return { ...task, status: liveStatus, is_completed: liveStatus === 'COMPLETED' };
          }
          return task;
        });
        return changed ? updated : prevTasks;
      });
    }, 20000); // Check every 20 seconds

    return () => clearInterval(interval);
  }, []);

  // Calculated duration preview in the modal
  const liveDuration = useMemo(() => {
    return calculateDurationFrom12h(startHour, startMinute, startPeriod, endHour, endMinute, endPeriod);
  }, [startHour, startMinute, startPeriod, endHour, endMinute, endPeriod]);

  // Validity check for time range
  const isTimeRangeValid = useMemo(() => {
    const s24 = to24Hour(startHour, startMinute, startPeriod);
    const e24 = to24Hour(endHour, endMinute, endPeriod);
    const [sh, sm] = s24.split(':').map(Number);
    const [eh, em] = e24.split(':').map(Number);
    return (eh * 60 + em) > (sh * 60 + sm);
  }, [startHour, startMinute, startPeriod, endHour, endMinute, endPeriod]);

  // Open modal for creating a new task
  const handleOpenCreateModal = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormDate(getLocalTodayDateString()); // Dynamic current date, never hardcoded

    // Default: 09:00 AM to 10:00 AM
    setStartHour('09');
    setStartMinute('00');
    setStartPeriod('AM');

    setEndHour('10');
    setEndMinute('00');
    setEndPeriod('AM');

    setFormPriority('MEDIUM');
    setFormDescription('');
    setFormError('');
    setShowModal(true);
  };

  // Open modal for editing an existing task
  const handleOpenEditModal = (task) => {
    setEditingTask(task);
    setFormTitle(task.title || '');
    setFormDate(task.task_date || getLocalTodayDateString());

    const sParts = parseTo12hParts(task.start_time, '09', '00', 'AM');
    setStartHour(sParts.hour);
    setStartMinute(sParts.minute);
    setStartPeriod(sParts.period);

    const eParts = parseTo12hParts(task.end_time, '10', '00', 'AM');
    setEndHour(eParts.hour);
    setEndMinute(eParts.minute);
    setEndPeriod(eParts.period);

    setFormPriority(task.priority || 'MEDIUM');
    setFormDescription(task.description || '');
    setFormError('');
    setShowModal(true);
  };

  // Close form modal
  const handleCloseModal = () => {
    if (!saving) {
      setShowModal(false);
      setEditingTask(null);
      setFormError('');
    }
  };

  // Handle saving task (both create and edit)
  const handleSaveTask = async (e) => {
    e.preventDefault();
    setFormError('');

    // 1. Validate Task Title
    if (!formTitle.trim()) {
      setFormError('Task title is required. Please enter a task name.');
      return;
    }

    // 2. Validate Time Range
    if (!isTimeRangeValid) {
      setFormError('End time must be later than start time.');
      return;
    }

    const s24 = to24Hour(startHour, startMinute, startPeriod);
    const e24 = to24Hour(endHour, endMinute, endPeriod);

    const payload = {
      title: formTitle.trim(),
      task_date: formDate || getLocalTodayDateString(),
      start_time: s24,
      end_time: e24,
      priority: formPriority,
      description: formDescription.trim() || null
    };

    setSaving(true);
    try {
      if (editingTask) {
        const updated = await updateTask(editingTask.id, payload);
        setTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));
        setSuccessMsg(`Task "${updated.title}" successfully updated!`);
      } else {
        const created = await createTask(payload);
        setTasks(prev => [created, ...prev]);
        setSuccessMsg(`Task "${created.title}" successfully created!`);
      }

      setShowModal(false);
      setEditingTask(null);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Save task error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to save task. Please try again.';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Toggle task completion status in the list
  const handleToggleStatus = async (task) => {
    const isNowCompleted = task.status !== 'COMPLETED';
    const nextStatus = isNowCompleted ? 'COMPLETED' : 'TODO';

    // Optimistic UI update
    setTasks(prev => prev.map(t => {
      if (t.id === task.id) {
        return {
          ...t,
          status: isNowCompleted ? 'COMPLETED' : computeLiveStatus({ ...t, status: 'TODO', is_completed: false }),
          is_completed: isNowCompleted
        };
      }
      return t;
    }));

    try {
      const updated = await updateTask(task.id, { status: nextStatus });
      setTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    } catch (err) {
      console.error('Error toggling task completion:', err);
      fetchTaskList();
    }
  };

  // Confirm delete task
  const handleConfirmDelete = async () => {
    if (!deletingTask) return;
    setDeleting(true);
    try {
      await deleteTask(deletingTask.id);
      setTasks(prev => prev.filter(t => t.id !== deletingTask.id));
      setSuccessMsg(`Task "${deletingTask.title}" was deleted.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setDeletingTask(null);
    } catch (err) {
      console.error('Error deleting task:', err);
      setPageErrorMsg('Failed to delete task. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered and searched tasks with live status calculation
  const processedTasks = useMemo(() => {
    return tasks.map(task => ({
      ...task,
      status: computeLiveStatus(task)
    }));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return processedTasks.filter(task => {
      if (filter !== 'ALL' && task.status !== filter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title?.toLowerCase().includes(query);
        const matchesDesc = task.description?.toLowerCase().includes(query);
        return matchesTitle || matchesDesc;
      }
      return true;
    });
  }, [processedTasks, filter, searchQuery]);

  // Counts for the exactly three filter options: ALL, PENDING, COMPLETED
  const counts = useMemo(() => {
    const res = { ALL: processedTasks.length, PENDING: 0, COMPLETED: 0 };
    processedTasks.forEach(t => {
      if (t.status === 'COMPLETED') res.COMPLETED++;
      else res.PENDING++;
    });
    return res;
  }, [processedTasks]);

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Top Banner Notifications */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-300 backdrop-blur-md shadow-lg"
          >
            <CheckCircle2 size={20} className="flex-shrink-0" />
            <span className="font-medium text-sm md:text-base">{successMsg}</span>
          </motion.div>
        )}

        {pageErrorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-300 backdrop-blur-md shadow-lg"
          >
            <AlertCircle size={20} className="flex-shrink-0" />
            <span className="font-medium text-sm md:text-base">{pageErrorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <Check className="text-primary" size={24} />
            </div>
            Task Management
          </h1>
          <p className="text-slate-400 mt-2 text-base">
            Schedule, track, and complete your commitments with dynamic AM/PM precision.
          </p>
        </div>

        <button 
          onClick={handleOpenCreateModal} 
          className="btn-primary flex items-center gap-2.5 px-6 py-3 rounded-2xl font-bold shadow-[0_0_25px_rgba(99,102,241,0.35)] hover:scale-105 transition-transform"
        >
          <Plus size={20} />
          New Task
        </button>
      </div>

      {/* Search and Filters Bar — Exactly 3 Filters: All, Pending, Completed */}
      {/* Search and Filters Bar — Exactly 3 Filters: All, Pending, Completed */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8 bg-surface border border-border p-4 rounded-2xl shadow-md">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'All', count: counts.ALL },
            { id: 'PENDING', label: 'Pending', count: counts.PENDING },
            { id: 'COMPLETED', label: 'Completed', count: counts.COMPLETED }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2.5 ${
                filter === tab.id
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'bg-surface-elevated text-textSecondary hover:text-textPrimary hover:bg-surface-elevated/80'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                filter === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-surface text-textSecondary border border-border'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Instant Search Bar */}
        <div className="relative min-w-[220px]">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-textSecondary" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-input-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-primary/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary hover:text-textPrimary"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-textSecondary">
          <Loader2 className="animate-spin text-accent mb-4" size={40} />
          <p className="text-lg font-medium">Loading your scheduled tasks...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface border border-border rounded-3xl p-12 text-center shadow-md flex flex-col items-center justify-center min-h-[300px]"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-6 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
            {filter === 'COMPLETED' ? (
              <CheckCircle2 size={36} className="text-emerald-500" />
            ) : (
              <CalendarIcon size={36} className="text-primary" />
            )}
          </div>
          
          <h3 className="text-2xl font-bold text-textPrimary mb-2">
            {filter === 'COMPLETED' ? 'No completed tasks yet' :
             filter === 'PENDING' ? 'No pending tasks' :
             searchQuery ? 'No matching tasks found' : 'No tasks yet'}
          </h3>
          
          <p className="text-textSecondary max-w-md mb-8 text-base">
            {filter === 'COMPLETED' ? 'Tasks automatically become Completed once their scheduled end time passes or when you check them off.' :
             filter === 'PENDING' ? 'All scheduled tasks have concluded. Plan new tasks to keep your day structured.' :
             searchQuery ? 'Try adjusting your search terms or filter criteria.' :
             'Create your first task with date and AM/PM time range to organize your day.'}
          </p>

          {!searchQuery && (
            <button
              onClick={handleOpenCreateModal}
              className="btn-primary flex items-center gap-2 px-6 py-3 text-sm font-bold shadow-lg"
            >
              <Plus size={18} /> Add Your First Task
            </button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredTasks.map((task) => {
              const isDone = task.status === 'COMPLETED';

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`group relative bg-surface hover:bg-surface-elevated/70 border transition-all duration-200 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md ${
                    isDone 
                      ? 'border-border/60 opacity-75' 
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Completion Checkbox */}
                    <button
                      onClick={() => handleToggleStatus(task)}
                      title={isDone ? 'Mark as Pending' : 'Mark as Completed'}
                      className={`w-7 h-7 mt-0.5 rounded-xl border-2 flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                        isDone
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                          : 'border-border hover:border-primary bg-surface-elevated text-transparent'
                      }`}
                    >
                      <Check size={16} className={isDone ? 'opacity-100' : 'opacity-0'} />
                    </button>

                    {/* Task Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <h3 className={`text-lg md:text-xl font-bold tracking-tight break-words ${
                          isDone ? 'line-through text-textSecondary' : 'text-textPrimary'
                        }`}>
                          {task.title}
                        </h3>

                        {/* Status Badge — Exactly 2 States: Pending or Completed */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isDone ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 size={13} /> Completed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                              <Clock size={13} /> Pending
                            </span>
                          )}
                        </div>
                      </div>

                      {task.description && (
                        <p className={`text-sm mb-4 leading-relaxed ${
                          isDone ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          {task.description}
                        </p>
                      )}

                      {/* Scheduled Info Chips */}
                      <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-slate-300 mt-3 pt-3 border-t border-white/5">
                        {/* Dynamic Date Display */}
                        <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl font-medium">
                          <CalendarIcon size={14} className="text-primary" />
                          <span>{formatCardDate(task.task_date)}</span>
                        </div>

                        {/* 12-Hour AM/PM Time Display */}
                        {(task.start_time || task.end_time) && (
                          <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl font-medium font-mono text-xs text-slate-200">
                            <Clock size={14} className="text-accent" />
                            <span>
                              {formatTime12h(task.start_time) || '--'}
                              {' '}<span className="text-slate-500">→</span>{' '}
                              {formatTime12h(task.end_time) || '--'}
                            </span>
                          </div>
                        )}

                        {/* Calculated Duration */}
                        {task.duration && (
                          <div className="flex items-center gap-1.5 bg-accent/10 border border-accent/20 text-accent px-3 py-1.5 rounded-xl font-medium text-xs">
                            <Sparkles size={13} />
                            <span>{task.duration}</span>
                          </div>
                        )}

                        {/* Priority Badge */}
                        {task.priority && (
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs border ${
                            task.priority === 'URGENT' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                            task.priority === 'HIGH' ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' :
                            task.priority === 'MEDIUM' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
                            'bg-slate-500/15 text-slate-400 border-slate-500/30'
                          }`}>
                            <Tag size={13} />
                            <span>{task.priority}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setDecomposingTask(task)}
                        title="Break Down with AI"
                        className="px-2.5 py-1.5 text-purple-400 hover:text-purple-300 rounded-xl hover:bg-purple-500/15 border border-purple-500/20 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                      >
                        <BrainCircuit size={15} />
                        <span className="hidden sm:inline">Break Down</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(task)}
                        title="Edit Task"
                        className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <Edit3 size={18} />
                      </button>

                      <button
                        onClick={() => setDeletingTask(task)}
                        title="Delete Task"
                        className="p-2 text-slate-400 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ============================================================ */}
      {/* TASK MODAL (Create & Edit) — No Status Selection */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="glass-card border border-border rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl relative my-8"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    {editingTask ? <Edit3 size={20} /> : <Plus size={20} />}
                  </div>
                  <h2 className="text-2xl font-bold text-textPrimary tracking-tight">
                    {editingTask ? 'Edit Task' : 'Create New Task'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={saving}
                  className="text-textSecondary hover:text-textPrimary p-2 rounded-xl hover:bg-surface-elevated transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Validation / Error banner */}
              {formError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-500 text-sm">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveTask} className="space-y-5">
                {/* 1. Task Title */}
                <div>
                  <label className="block text-sm font-semibold text-textPrimary mb-2">
                    Task Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Complete database schema"
                    value={formTitle}
                    onChange={(e) => {
                      setFormTitle(e.target.value);
                      if (formError) setFormError('');
                    }}
                    className="w-full bg-input-background border border-border rounded-xl px-4 py-3 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-primary text-base transition-colors"
                    autoFocus
                  />
                </div>

                {/* 2. Dynamic Task Date Picker with Quick Date Chips */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-textPrimary flex items-center gap-1.5">
                      <CalendarIcon size={16} className="text-primary" />
                      Task Date <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFormDate(getLocalTodayDateString())}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                          formDate === getLocalTodayDateString()
                            ? 'bg-primary/10 text-primary border-primary/30'
                            : 'bg-surface-elevated text-textSecondary border-border hover:text-textPrimary'
                        }`}
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormDate(getTomorrowDateString())}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                          formDate === getTomorrowDateString()
                            ? 'bg-primary/10 text-primary border-primary/30'
                            : 'bg-surface-elevated text-textSecondary border-border hover:text-textPrimary'
                        }`}
                      >
                        Tomorrow
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-input-background border border-border rounded-xl px-4 py-3 text-textPrimary focus:outline-none focus:border-primary text-base transition-colors cursor-pointer"
                  />
                  <p className="text-xs text-textSecondary mt-1.5 flex items-center gap-1.5">
                    <span>Selected date:</span>
                    <strong className="text-textPrimary">{formatCardDate(formDate)}</strong>
                  </p>
                </div>

                {/* 3 & 4. 12-Hour AM/PM Time Pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AmPmTimePicker
                    label="Start Time"
                    hour={startHour}
                    minute={startMinute}
                    period={startPeriod}
                    onHourChange={(val) => {
                      setStartHour(val);
                      if (formError) setFormError('');
                    }}
                    onMinuteChange={(val) => {
                      setStartMinute(val);
                      if (formError) setFormError('');
                    }}
                    onPeriodChange={(val) => {
                      setStartPeriod(val);
                      if (formError) setFormError('');
                    }}
                  />

                  <AmPmTimePicker
                    label="End Time"
                    hour={endHour}
                    minute={endMinute}
                    period={endPeriod}
                    onHourChange={(val) => {
                      setEndHour(val);
                      if (formError) setFormError('');
                    }}
                    onMinuteChange={(val) => {
                      setEndMinute(val);
                      if (formError) setFormError('');
                    }}
                    onPeriodChange={(val) => {
                      setEndPeriod(val);
                      if (formError) setFormError('');
                    }}
                  />
                </div>

                {/* Real-time Calculated Duration Preview */}
                {liveDuration ? (
                  <div className="p-3 bg-accent/10 border border-accent/20 rounded-xl flex items-center gap-2.5 text-accent text-sm font-medium">
                    <Sparkles size={16} className="flex-shrink-0" />
                    <span>Duration: <strong>{liveDuration}</strong></span>
                  </div>
                ) : !isTimeRangeValid ? (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-red-500 text-xs">
                    <AlertCircle size={15} className="flex-shrink-0" />
                    <span>End time must be later than start time.</span>
                  </div>
                ) : null}

                {/* 5. Priority (Status selection completely removed) */}
                <div>
                  <label className="block text-sm font-semibold text-textPrimary mb-2">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                    className="w-full bg-input-background border border-border rounded-xl px-4 py-3 text-textPrimary focus:outline-none focus:border-primary text-sm cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                {/* Optional Description */}
                <div>
                  <label className="block text-sm font-semibold text-textPrimary mb-2">
                    Description <span className="text-xs text-textSecondary font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Add extra context or notes..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full bg-input-background border border-border rounded-xl px-4 py-3 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-primary text-sm transition-colors resize-none"
                  />
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={saving}
                    className="btn-secondary px-5 py-2.5 font-semibold text-sm"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving || !isTimeRangeValid}
                    className="btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(99,102,241,0.4)] disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Saving...
                      </>
                    ) : (
                      editingTask ? 'Update Task' : 'Save Task'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ============================================================ */}
      <AnimatePresence>
        {deletingTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card border border-border rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4">
                <ShieldAlert size={26} />
              </div>

              <h3 className="text-xl font-bold text-textPrimary mb-2">Delete Task?</h3>
              <p className="text-textSecondary text-sm mb-6 leading-relaxed">
                Are you sure you want to permanently delete <strong>"{deletingTask.title}"</strong>? This action cannot be undone.
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setDeletingTask(null)}
                  disabled={deleting}
                  className="btn-secondary px-5 py-2.5 font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors shadow-lg shadow-red-600/30 flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} /> Yes, Delete Task
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feature Two: AI Task Decomposer Modal */}
      <TaskDecomposerModal
        isOpen={Boolean(decomposingTask)}
        task={decomposingTask}
        onClose={() => setDecomposingTask(null)}
        onSubtasksSaved={() => fetchTaskList()}
      />
    </div>
  );
};

export default Tasks;

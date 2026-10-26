import React, { useState, useEffect, useMemo } from 'react';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../services/event.service';
import { getTasks } from '../services/task.service';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus,
  Clock, MapPin, Trash2, Edit3, CheckCircle2, AlertCircle,
  CalendarDays, CheckSquare, X, ListFilter, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Month names and weekday abbreviations
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Helper to format local Date object to YYYY-MM-DD
const toLocalDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Helper to format Date or string to HH:MM AM/PM
const formatTimeAMPM = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Helper for datetime-local input (YYYY-MM-DDTHH:MM)
const toDateTimeLocalString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}`;
};

const CalendarView = () => {
  const today = useMemo(() => new Date(), []);
  
  // Current view state (Year & Month)
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

  // Selected date for day drawer/details
  const [selectedDate, setSelectedDate] = useState(today);

  // Data state
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    start_time: '',
    end_time: '',
    location: '',
    description: ''
  });
  const [eventSaving, setEventSaving] = useState(false);
  const [eventError, setEventError] = useState('');

  // Delete confirmation modal
  const [eventToDelete, setEventToDelete] = useState(null);

  // Fetch all user events and tasks
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedEvents, fetchedTasks] = await Promise.all([
        getEvents().catch(() => []),
        getTasks().catch(() => [])
      ]);
      setEvents(fetchedEvents || []);
      setTasks(fetchedTasks || []);
    } catch (err) {
      console.error('Failed to load calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Navigate months
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleGoToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(today);
  };

  // Group events and tasks by local date key (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach(evt => {
      if (!evt.start_time) return;
      const d = new Date(evt.start_time);
      if (isNaN(d.getTime())) return;
      const key = toLocalDateKey(d);
      if (!map[key]) map[key] = [];
      map[key].push(evt);
    });
    // Sort each day's events chronologically
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    });
    return map;
  }, [events]);

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.due_date) return;
      const key = t.due_date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tasks]);

  // Generate full calendar grid for current month
  const calendarGrid = useMemo(() => {
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const grid = [];

    // 1. Trailing days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDate = new Date(currentYear, currentMonth - 1, daysInPrevMonth - i);
      grid.push({
        date: prevDate,
        dayNum: daysInPrevMonth - i,
        isCurrentMonth: false,
        dateKey: toLocalDateKey(prevDate)
      });
    }

    // 2. Days from 1st to actual last day of current month (28, 29, 30, or 31)
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      grid.push({
        date,
        dayNum: day,
        isCurrentMonth: true,
        dateKey: toLocalDateKey(date)
      });
    }

    // 3. Leading days of next month to complete the row (35 or 42 grid cells)
    const totalSlots = grid.length > 35 ? 42 : 35;
    const remainingSlots = totalSlots - grid.length;
    for (let day = 1; day <= remainingSlots; day++) {
      const nextDate = new Date(currentYear, currentMonth + 1, day);
      grid.push({
        date: nextDate,
        dayNum: day,
        isCurrentMonth: false,
        dateKey: toLocalDateKey(nextDate)
      });
    }

    return grid;
  }, [currentYear, currentMonth]);

  // Selected date key
  const selectedDateKey = toLocalDateKey(selectedDate);
  const selectedDayEvents = eventsByDate[selectedDateKey] || [];
  const selectedDayTasks = tasksByDate[selectedDateKey] || [];
  const todayKey = toLocalDateKey(today);

  // Open modal to create event on currently selected date
  const handleOpenCreateModal = (specificDate) => {
    const targetDate = specificDate || selectedDate;
    const start = new Date(targetDate);
    start.setHours(9, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(10, 0, 0, 0);

    setEditingEventId(null);
    setEventForm({
      title: '',
      start_time: toDateTimeLocalString(start),
      end_time: toDateTimeLocalString(end),
      location: '',
      description: ''
    });
    setEventError('');
    setShowEventModal(true);
  };

  // Open modal to edit existing event
  const handleOpenEditModal = (evt) => {
    setEditingEventId(evt.id);
    const startDate = new Date(evt.start_time);
    const endDate = new Date(evt.end_time);

    setEventForm({
      title: evt.title || '',
      start_time: toDateTimeLocalString(startDate),
      end_time: toDateTimeLocalString(endDate),
      location: evt.location || '',
      description: evt.description || ''
    });
    setEventError('');
    setShowEventModal(true);
  };

  // Submit event form (Create or Update)
  const handleSaveEvent = async (e) => {
    e.preventDefault();
    setEventError('');

    if (!eventForm.title.trim()) {
      setEventError('Event title is required.');
      return;
    }
    if (!eventForm.start_time || !eventForm.end_time) {
      setEventError('Start and end times are required.');
      return;
    }
    if (new Date(eventForm.end_time) <= new Date(eventForm.start_time)) {
      setEventError('End time must be after start time.');
      return;
    }

    setEventSaving(true);
    try {
      const payload = {
        title: eventForm.title.trim(),
        start_time: new Date(eventForm.start_time).toISOString(),
        end_time: new Date(eventForm.end_time).toISOString(),
        location: eventForm.location.trim() || null,
        description: eventForm.description.trim() || null
      };

      if (editingEventId) {
        const updated = await updateEvent(editingEventId, payload);
        setEvents(prev => prev.map(e => (e.id === editingEventId ? { ...e, ...updated } : e)));
      } else {
        const created = await createEvent(payload);
        setEvents(prev => [...prev, created]);
      }
      setShowEventModal(false);
    } catch (err) {
      setEventError(err.response?.data?.message || err.message || 'Failed to save event.');
    } finally {
      setEventSaving(false);
    }
  };

  // Delete event
  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      await deleteEvent(eventToDelete.id);
      setEvents(prev => prev.filter(e => e.id !== eventToDelete.id));
      setEventToDelete(null);
    } catch (err) {
      alert('Failed to delete event: ' + (err.message || 'Unknown error'));
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-16 px-2 sm:px-4">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-textPrimary flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-500/30">
              <CalendarIcon className="text-cyan-400" size={28} />
            </div>
            Life Calendar
          </h1>
          <p className="text-textSecondary mt-1">
            Month overview of your commitments, tasks, and scheduled activities.
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleGoToday}
            className="btn-secondary text-sm font-semibold px-3 py-2 flex items-center gap-1.5 hover:border-cyan-500/40"
          >
            <CalendarDays size={16} className="text-cyan-400" />
            Today
          </button>

          <div className="flex items-center glass-card px-2 py-1 rounded-xl border border-border/80">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-surface-elevated text-textSecondary hover:text-textPrimary transition-colors"
              title="Previous Month"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="px-3 text-sm font-bold text-textPrimary min-w-[150px] text-center">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-surface-elevated text-textSecondary hover:text-textPrimary transition-colors"
              title="Next Month"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <button
            onClick={() => handleOpenCreateModal()}
            className="btn-primary text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/20 whitespace-nowrap"
          >
            <Plus size={18} /> New Event
          </button>
        </div>
      </div>

      {/* Main Calendar Layout: Grid + Selected Day Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar Grid (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="glass-card p-4 sm:p-6 overflow-hidden">
            {/* Weekday Header */}
            <div className="grid grid-cols-7 gap-2 mb-2 text-center">
              {WEEKDAYS.map((day, idx) => (
                <div
                  key={day}
                  className={`text-xs font-bold uppercase tracking-wider py-1.5 ${
                    idx === 0 || idx === 6 ? 'text-cyan-400/80' : 'text-textSecondary'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarGrid.map((slot) => {
                const isSelected = slot.dateKey === selectedDateKey;
                const isToday = slot.dateKey === todayKey;
                const dayEvents = eventsByDate[slot.dateKey] || [];
                const dayTasks = tasksByDate[slot.dateKey] || [];
                const hasItems = dayEvents.length > 0 || dayTasks.length > 0;

                return (
                  <motion.div
                    key={slot.dateKey}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedDate(slot.date)}
                    className={`min-h-[92px] sm:min-h-[105px] p-2 rounded-xl cursor-pointer transition-all flex flex-col justify-between border ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-400 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-400'
                        : isToday
                        ? 'bg-purple-500/10 border-purple-500/40'
                        : slot.isCurrentMonth
                        ? 'bg-surface-elevated/40 border-border/50 hover:border-cyan-500/40 hover:bg-surface-elevated/70'
                        : 'bg-surface-elevated/10 border-border/20 opacity-40 hover:opacity-70'
                    }`}
                  >
                    {/* Top Row: Day number and Today badge */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                          isToday
                            ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-sm'
                            : isSelected
                            ? 'text-cyan-400 font-extrabold'
                            : slot.isCurrentMonth
                            ? 'text-textPrimary'
                            : 'text-textSecondary/60'
                        }`}
                      >
                        {slot.dayNum}
                      </span>

                      {/* Small badge count */}
                      {hasItems && (
                        <div className="flex items-center gap-1">
                          {dayEvents.length > 0 && (
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                          )}
                          {dayTasks.length > 0 && (
                            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Middle: Micro Event Chips */}
                    <div className="space-y-1 my-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map((evt) => (
                        <div
                          key={evt.id}
                          className="text-[10px] leading-tight px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-medium truncate border border-cyan-500/30"
                          title={evt.title}
                        >
                          {formatTimeAMPM(evt.start_time)} {evt.title}
                        </div>
                      ))}

                      {dayEvents.length > 2 && (
                        <div className="text-[9px] text-cyan-400 font-semibold px-1">
                          +{dayEvents.length - 2} more
                        </div>
                      )}

                      {/* Task Pill if any */}
                      {dayTasks.length > 0 && dayEvents.length <= 1 && (
                        <div className="text-[10px] leading-tight px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-medium truncate border border-purple-500/30 flex items-center gap-1">
                          <CheckSquare size={9} />
                          {dayTasks.length} task{dayTasks.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>

                    {/* Bottom Indicator for active selection */}
                    <div className="h-0.5 w-full rounded-full bg-transparent">
                      {isSelected && <div className="h-full w-full bg-cyan-400 rounded-full"></div>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Day Schedule Side Panel (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-4">
          <motion.div
            key={selectedDateKey}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6 h-full flex flex-col"
          >
            {/* Header of selected day */}
            <div className="border-b border-border/60 pb-4 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} />
                  Day Schedule
                </span>
                {selectedDateKey === todayKey && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    TODAY
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-textPrimary mt-1">
                {selectedDate.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </h3>
              <p className="text-xs text-textSecondary mt-0.5">
                {selectedDayEvents.length} event{selectedDayEvents.length === 1 ? '' : 's'} ·{' '}
                {selectedDayTasks.length} task{selectedDayTasks.length === 1 ? '' : 's'} scheduled
              </p>
            </div>

            {/* Quick Add Button */}
            <button
              onClick={() => handleOpenCreateModal(selectedDate)}
              className="w-full mb-4 py-2 px-3 rounded-xl bg-surface-elevated hover:bg-surface-elevated/80 border border-dashed border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Plus size={15} /> Add Event to this Day
            </button>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[500px]">
              {/* Section 1: Events */}
              <div>
                <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock size={13} className="text-cyan-400" /> Fixed Events
                </h4>

                {selectedDayEvents.length === 0 ? (
                  <div className="text-center py-6 px-4 rounded-xl bg-surface-elevated/20 border border-border/40 text-xs text-textSecondary">
                    No fixed events scheduled for this day.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedDayEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="p-3 rounded-xl bg-surface-elevated/60 border border-border/60 hover:border-cyan-500/40 transition-all group relative"
                      >
                        <div className="flex justify-between items-start">
                          <h5 className="text-sm font-semibold text-textPrimary pr-12">
                            {evt.title}
                          </h5>
                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleOpenEditModal(evt)}
                              className="p-1 text-textSecondary hover:text-cyan-400 rounded-md hover:bg-surface-elevated"
                              title="Edit Event"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => setEventToDelete(evt)}
                              className="p-1 text-textSecondary hover:text-rose-400 rounded-md hover:bg-surface-elevated"
                              title="Delete Event"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-textSecondary">
                          <span className="flex items-center gap-1 text-cyan-400 font-medium">
                            <Clock size={12} />
                            {formatTimeAMPM(evt.start_time)} – {formatTimeAMPM(evt.end_time)}
                          </span>
                          {evt.location && (
                            <span className="flex items-center gap-1 text-textSecondary">
                              <MapPin size={12} className="text-purple-400" />
                              {evt.location}
                            </span>
                          )}
                        </div>

                        {evt.description && (
                          <p className="mt-2 text-xs text-textSecondary/80 border-t border-border/40 pt-1.5 line-clamp-2">
                            {evt.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: Tasks Due */}
              <div>
                <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckSquare size={13} className="text-purple-400" /> Tasks Due
                </h4>

                {selectedDayTasks.length === 0 ? (
                  <div className="text-center py-4 px-4 rounded-xl bg-surface-elevated/20 border border-border/40 text-xs text-textSecondary">
                    No tasks due on this date.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDayTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 rounded-xl bg-surface-elevated/40 border border-border/60 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              t.status === 'COMPLETED'
                                ? 'bg-emerald-400'
                                : t.priority === 'URGENT'
                                ? 'bg-rose-400'
                                : t.priority === 'HIGH'
                                ? 'bg-amber-400'
                                : 'bg-cyan-400'
                            }`}
                          ></span>
                          <span
                            className={`text-xs font-medium truncate ${
                              t.status === 'COMPLETED'
                                ? 'line-through text-textSecondary/60'
                                : 'text-textPrimary'
                            }`}
                          >
                            {t.title}
                          </span>
                        </div>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-surface border border-border text-textSecondary shrink-0">
                          {t.status || 'PENDING'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Add / Edit Event Modal */}
      <AnimatePresence>
        {showEventModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card max-w-lg w-full p-6 sm:p-8 border border-border/80 shadow-2xl relative"
            >
              <div className="flex justify-between items-center mb-6 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <CalendarIcon size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-textPrimary">
                      {editingEventId ? 'Edit Event' : 'Create New Event'}
                    </h3>
                    <p className="text-xs text-textSecondary">
                      {editingEventId ? 'Update your calendar event details.' : 'Schedule a commitment on your calendar.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="text-textSecondary hover:text-textPrimary p-1.5 rounded-lg hover:bg-surface-elevated transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {eventError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{eventError}</span>
                </div>
              )}

              <form onSubmit={handleSaveEvent} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    placeholder="e.g., Client Strategy Meeting"
                    className="input-field text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                      Start Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={eventForm.start_time}
                      onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                      className="input-field text-sm cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                      End Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={eventForm.end_time}
                      onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                      className="input-field text-sm cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                    Location (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={eventForm.location}
                      onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                      placeholder="e.g., Room 302, Google Meet, or Office"
                      className="input-field pl-9 text-sm"
                    />
                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                    Description / Agenda (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    placeholder="Add meeting notes, agenda, or relevant links..."
                    className="input-field text-sm resize-none"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => setShowEventModal(false)}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={eventSaving}
                    className="btn-primary text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                  >
                    {eventSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        {editingEventId ? 'Update Event' : 'Create Event'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Event Confirmation Modal */}
      <AnimatePresence>
        {eventToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card max-w-sm w-full p-6 border border-border/80 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-rose-400 mb-3">
                <AlertCircle size={24} />
                <h3 className="text-base font-bold text-textPrimary">Delete Event?</h3>
              </div>
              <p className="text-xs text-textSecondary mb-5">
                Are you sure you want to delete <strong className="text-textPrimary">"{eventToDelete.title}"</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEventToDelete(null)}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs px-3.5 py-1.5 rounded-xl shadow-md transition-all"
                >
                  Delete Event
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalendarView;

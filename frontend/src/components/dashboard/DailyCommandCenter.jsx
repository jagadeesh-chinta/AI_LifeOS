import React, { useState, useEffect } from 'react';
import {
  Sparkles, CheckCircle2, Clock, Calendar, AlertTriangle, ArrowRight,
  TrendingUp, Shield, RefreshCw, Zap, CheckSquare, Target, Activity,
  ChevronRight, Compass, Flame, Sun, Moon
} from 'lucide-react';
import { getDailyBriefing, optimizeDayPreview, applyOptimizedDay } from '../../services/ecosystem.service';
import { updateTask } from '../../services/task.service';

const DailyCommandCenter = ({ onTaskUpdated, onNavigateToPlanner, onNavigateToGoals, onNavigateToHabits }) => {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Optimize Day Modal states
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [optimizePreview, setOptimizePreview] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applySuccessMsg, setApplySuccessMsg] = useState('');

  useEffect(() => {
    loadBriefing();
  }, []);

  const loadBriefing = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getDailyBriefing();
      setBriefing(data);
    } catch (err) {
      console.error('Failed to load command briefing:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleToggleTask = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'COMPLETED' ? 'TODO' : 'COMPLETED';
      await updateTask(taskId, { status: newStatus });
      await loadBriefing(true);
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      alert('Failed to update task: ' + err.message);
    }
  };

  const handleStartOptimizeDay = async () => {
    setShowOptimizeModal(true);
    setOptimizing(true);
    try {
      const preview = await optimizeDayPreview();
      setOptimizePreview(preview);
    } catch (err) {
      alert('Failed to optimize day: ' + err.message);
      setShowOptimizeModal(false);
    } finally {
      setOptimizing(false);
    }
  };

  const handleApplyOptimization = async () => {
    if (!optimizePreview) return;
    setApplying(true);
    try {
      await applyOptimizedDay(optimizePreview.date, optimizePreview.proposed_items);
      setApplySuccessMsg('✓ Optimized schedule applied to your day!');
      setTimeout(() => {
        setApplySuccessMsg('');
        setShowOptimizeModal(false);
        loadBriefing(true);
        if (onNavigateToPlanner) onNavigateToPlanner();
      }, 1200);
    } catch (err) {
      alert('Failed to apply schedule: ' + err.message);
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6 rounded-3xl border border-border/80 animate-pulse space-y-4">
        <div className="h-6 w-48 bg-surface-elevated rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-24 bg-surface-elevated rounded-2xl"></div>
          <div className="h-24 bg-surface-elevated rounded-2xl"></div>
          <div className="h-24 bg-surface-elevated rounded-2xl"></div>
          <div className="h-24 bg-surface-elevated rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (!briefing) return null;

  const workloadColors = {
    light: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    balanced: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    high: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    overloaded: 'text-red-400 bg-red-500/10 border-red-500/30'
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="glass-card p-6 sm:p-7 rounded-3xl border border-border/80 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 pb-5 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Compass size={14} /> AI Command Center
              </span>
              <span className="text-textSecondary">•</span>
              <span className="text-xs text-textSecondary font-medium">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-textSecondary mt-1">
              Here is your synchronized intelligence briefing across tasks, habits, commitments, and roadmap progress.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
            <button
              onClick={() => loadBriefing(true)}
              disabled={refreshing}
              className="p-2 rounded-xl bg-surface-elevated hover:bg-surface-elevated/80 border border-border text-textSecondary hover:text-textPrimary transition-colors"
              title="Refresh Briefing"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin text-cyan-400' : ''} />
            </button>

            <button
              onClick={handleStartOptimizeDay}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-2 shadow-lg shadow-cyan-500/25 font-bold"
            >
              <Zap size={14} />
              <span>Optimize My Day</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-5 relative z-10">
          {/* Workload Status */}
          <div className="p-4 rounded-2xl bg-surface-elevated/70 border border-border/70 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-textSecondary">Workload Status</span>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${workloadColors[briefing.stats.workload_status]}`}>
                {briefing.stats.workload_status}
              </span>
            </div>
            <span className="text-[10px] text-textSecondary mt-1">
              {briefing.stats.planned_minutes}m planned today
            </span>
          </div>

          {/* Tasks Progress */}
          <div className="p-4 rounded-2xl bg-surface-elevated/70 border border-border/70 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-textSecondary">Tasks Completed</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <strong className="text-xl font-bold text-textPrimary">{briefing.stats.tasks_completed}</strong>
              <span className="text-xs text-textSecondary">/ {briefing.stats.tasks_total}</span>
            </div>
            <div className="w-full bg-border/60 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${briefing.stats.tasks_total > 0 ? (briefing.stats.tasks_completed / briefing.stats.tasks_total) * 100 : 0}%`
                }}
              ></div>
            </div>
          </div>

          {/* Habits Status */}
          <div className="p-4 rounded-2xl bg-surface-elevated/70 border border-border/70 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-textSecondary">Habit Check-ins</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <strong className="text-xl font-bold text-purple-400">{briefing.stats.habits_completed}</strong>
              <span className="text-xs text-textSecondary">/ {briefing.stats.habits_total}</span>
            </div>
            <span className="text-[10px] text-purple-300 font-medium mt-1">
              {briefing.stats.habits_total > 0 && briefing.stats.habits_completed === briefing.stats.habits_total ? '✓ All habits logged!' : 'Keep your momentum'}
            </span>
          </div>

          {/* Active Goals */}
          <div className="p-4 rounded-2xl bg-surface-elevated/70 border border-border/70 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-textSecondary">Active Career Goals</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <strong className="text-xl font-bold text-cyan-400">{briefing.stats.goals_active}</strong>
              <span className="text-xs text-textSecondary">targets</span>
            </div>
            <span className="text-[10px] text-textSecondary mt-1">
              Roadmaps tracking in sync
            </span>
          </div>
        </div>

        {/* AI Intelligent Briefing Synopsis Banner */}
        {briefing.ai_briefing && (
          <div className="mt-5 p-4 rounded-2xl border border-purple-500/35 bg-purple-500/5 relative z-10 flex flex-col sm:flex-row sm:items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
              <Sparkles size={20} />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                Executive Daily Briefing
              </div>
              <p className="text-xs text-textPrimary leading-relaxed">
                <strong>Focus First:</strong> {briefing.ai_briefing.focus_first}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px] text-textSecondary">
                <div>
                  <strong className="text-amber-400">Deadlines:</strong> {briefing.ai_briefing.deadline_alert}
                </div>
                <div>
                  <strong className="text-cyan-400">Next Action:</strong> {briefing.ai_briefing.next_action}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Two-Column Core Activity Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 & 2: Top Priorities & Today's Schedule */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top 3 Priorities */}
          <div className="glass-card p-5 sm:p-6 rounded-3xl border border-border/80 space-y-4 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
              <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                <CheckSquare size={16} className="text-cyan-400" />
                <span>Today's Top 3 Priorities</span>
              </h3>
              <span className="text-[11px] text-textSecondary font-medium">
                High-leverage impact
              </span>
            </div>

            <div className="space-y-2.5">
              {briefing.top_priorities.length === 0 ? (
                <div className="p-6 text-center text-xs text-textSecondary border border-dashed border-border rounded-2xl">
                  No pending priorities scheduled for today! Great job staying ahead.
                </div>
              ) : (
                briefing.top_priorities.map((task, idx) => (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-2xl bg-surface-elevated/70 border border-border/70 hover:border-cyan-500/40 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleTask(task.id, 'TODO')}
                        className="w-5 h-5 rounded-full border border-border hover:border-cyan-400 hover:bg-cyan-500/20 transition-all flex items-center justify-center shrink-0"
                        title="Mark Complete"
                      >
                        <CheckCircle2 size={13} className="text-transparent hover:text-cyan-400" />
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-textPrimary group-hover:text-cyan-300 transition-colors">
                            {task.title}
                          </h4>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            task.priority === 'High' ? 'text-red-400 bg-red-500/10' : 'text-amber-400 bg-amber-500/10'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-textSecondary mt-0.5">
                          <span>Est: {task.estimated_minutes}m</span>
                          <span>•</span>
                          <span>Category: {task.category}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-xs font-semibold text-textSecondary group-hover:text-cyan-400 group-hover:translate-x-1 transition-all">
                      Priority #{idx + 1}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Today's Schedule Overview */}
          <div className="glass-card p-5 sm:p-6 rounded-3xl border border-border/80 space-y-4 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
              <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                <Clock size={16} className="text-purple-400" />
                <span>Today's Time-Blocked Schedule ({briefing.today_schedule.length} slots)</span>
              </h3>
              {onNavigateToPlanner && (
                <button
                  onClick={onNavigateToPlanner}
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                >
                  AI Planner <ArrowRight size={13} />
                </button>
              )}
            </div>

            <div className="space-y-2">
              {briefing.today_schedule.length === 0 ? (
                <div className="p-6 text-center text-xs text-textSecondary border border-dashed border-border rounded-2xl">
                  No slots scheduled yet for today. Click <strong>"Optimize My Day"</strong> to generate your structured timetable!
                </div>
              ) : (
                briefing.today_schedule.slice(0, 5).map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3 rounded-xl bg-surface-elevated/60 border border-border/60 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-cyan-400 font-bold shrink-0">
                        {item.start_time} - {item.end_time}
                      </span>
                      <span className="font-semibold text-textPrimary">{item.title}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-elevated text-textSecondary font-medium border border-border">
                      {item.item_type || 'TASK'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Column 3: Upcoming Deadlines & Habit Highlights */}
        <div className="space-y-6">
          {/* Upcoming Deadlines */}
          <div className="glass-card p-5 sm:p-6 rounded-3xl border border-border/80 space-y-4 shadow-md">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2 pb-2 border-b border-border/50">
              <Calendar size={16} className="text-amber-400" />
              <span>Upcoming Deadlines (7 Days)</span>
            </h3>

            <div className="space-y-2">
              {briefing.upcoming_deadlines.length === 0 ? (
                <div className="p-4 text-center text-xs text-textSecondary border border-dashed border-border rounded-xl">
                  No pending deadlines in the next 7 days.
                </div>
              ) : (
                briefing.upcoming_deadlines.slice(0, 4).map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-xl bg-surface-elevated/70 border border-border/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-textPrimary">{d.title}</div>
                      <div className="text-[10px] text-amber-400 font-semibold mt-0.5">
                        Due: {d.due_date}
                      </div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 font-bold uppercase">
                      {d.priority}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Habits Glance */}
          <div className="glass-card p-5 sm:p-6 rounded-3xl border border-border/80 space-y-4 shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                <Activity size={16} className="text-emerald-400" />
                <span>Today's Habits</span>
              </h3>
              {onNavigateToHabits && (
                <button
                  onClick={onNavigateToHabits}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                >
                  All Habits <ArrowRight size={13} />
                </button>
              )}
            </div>

            <div className="space-y-2">
              {briefing.habits.slice(0, 4).map((h) => (
                <div
                  key={h.id}
                  className="p-2.5 rounded-xl bg-surface-elevated/60 border border-border/60 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-textPrimary">{h.name}</span>
                  {h.completed ? (
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Done
                    </span>
                  ) : (
                    <span className="text-[10px] text-textSecondary font-medium">
                      {h.preferred_time || 'Pending'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* OPTIMIZE MY DAY PREVIEW MODAL */}
      {showOptimizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn font-sans">
          <div className="glass-card max-w-2xl w-full p-6 sm:p-7 rounded-3xl border border-cyan-500/40 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
                  <Zap size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-textPrimary">Optimize My Day Schedule</h3>
                  <p className="text-xs text-textSecondary">Realistic conflict-free timetable preview based on your remaining hours.</p>
                </div>
              </div>
              <button
                onClick={() => setShowOptimizeModal(false)}
                className="text-textSecondary hover:text-textPrimary"
              >
                ✕
              </button>
            </div>

            {optimizing ? (
              <div className="p-12 text-center text-xs text-textSecondary space-y-3">
                <RefreshCw size={24} className="animate-spin text-cyan-400 mx-auto" />
                <p>Analyzing remaining time, preserving fixed commitments, and structuring your day...</p>
              </div>
            ) : optimizePreview ? (
              <div className="space-y-4">
                {applySuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 size={16} /> {applySuccessMsg}
                  </div>
                )}

                <p className="text-xs text-textSecondary leading-relaxed bg-surface-elevated/70 p-3 rounded-xl border border-border">
                  {optimizePreview.summary}
                </p>

                {/* Proposed Schedule Preview Items */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {optimizePreview.proposed_items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-surface-elevated border border-border flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-cyan-400 font-bold">
                          {item.start_time} - {item.end_time}
                        </span>
                        <div>
                          <div className="font-bold text-textPrimary">{item.title}</div>
                          {item.item_type === 'COMMITMENT' && (
                            <span className="text-[9px] text-amber-400 font-semibold">[Fixed Commitment Preserved]</span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-elevated text-textSecondary border border-border">
                        {item.priority || 'Medium'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Changes Explained */}
                {optimizePreview.changes_explained?.length > 0 && (
                  <div className="space-y-1.5 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-[11px] text-textSecondary">
                    <strong className="text-cyan-400 block mb-1">Key Schedule Adjustments:</strong>
                    {optimizePreview.changes_explained.map((c, i) => (
                      <div key={i}>
                        • <strong>{c.task_title}</strong>: {c.reason}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
                  <button
                    onClick={() => setShowOptimizeModal(false)}
                    className="px-4 py-2 rounded-xl border border-border text-xs text-textSecondary hover:text-textPrimary"
                  >
                    Reject Suggestions
                  </button>
                  <button
                    onClick={handleApplyOptimization}
                    disabled={applying}
                    className="btn-primary text-xs px-5 py-2 shadow-lg shadow-cyan-500/20 font-bold flex items-center gap-1.5"
                  >
                    {applying ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                    <span>Approve & Apply Schedule</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyCommandCenter;

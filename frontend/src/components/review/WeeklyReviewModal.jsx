import React, { useState, useEffect } from 'react';
import {
  X,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Brain,
  Sparkles,
  ArrowRight,
  Loader2,
  Clock,
  Target,
  ListTodo,
  ShieldCheck,
  ChevronRight,
  Zap,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ecosystemService from '../../services/ecosystem.service';

export default function WeeklyReviewModal({ isOpen, onClose, onScheduleUpdated }) {
  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [nextWeekPlan, setNextWeekPlan] = useState(null);
  const [planAppliedSuccess, setPlanAppliedSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadWeeklyReview();
    } else {
      setReviewData(null);
      setNextWeekPlan(null);
      setPlanAppliedSuccess(false);
      setError(null);
    }
  }, [isOpen]);

  const loadWeeklyReview = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await ecosystemService.getWeeklyReview(null, forceRefresh);
      if (res.success && res.review) {
        setReviewData(res.review);
      } else {
        setError('Failed to load weekly life review.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Error loading weekly review');
    } finally {
      setLoading(false);
    }
  };

  const handlePrepareNextWeek = async () => {
    setPreparing(true);
    setError(null);
    try {
      const res = await ecosystemService.prepareNextWeek(false); // preview mode
      if (res.success && res.plan) {
        setNextWeekPlan(res.plan);
      } else {
        setError('Failed to generate next week plan.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Error preparing next week');
    } finally {
      setPreparing(false);
    }
  };

  const handleApplyNextWeekPlan = async () => {
    setApplying(true);
    setError(null);
    try {
      const res = await ecosystemService.prepareNextWeek(true); // apply mode
      if (res.success) {
        setPlanAppliedSuccess(true);
        if (onScheduleUpdated) onScheduleUpdated(res);
      } else {
        setError('Failed to apply next week plan.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Error applying schedule');
    } finally {
      setApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="glass-card border border-border/80 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col bg-surface-elevated/95"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-border/70 bg-surface/50 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                <CalendarDays size={18} />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Weekly Life Review & Strategy
              </span>
              {reviewData && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface border border-border text-textSecondary font-mono">
                  Week {reviewData.weekStartDate} to {reviewData.weekEndDate}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-textPrimary">
              Evidence-Based Performance & Next Week Blueprint
            </h2>
            <p className="text-xs text-textSecondary">
              Measured from actual completed tasks, verified habit logs, and scheduled sessions.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-surface border border-transparent hover:border-border text-textSecondary hover:text-textPrimary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {loading && (
            <div className="py-20 text-center space-y-3">
              <Loader2 size={32} className="animate-spin text-emerald-400 mx-auto" />
              <p className="text-sm font-medium text-textPrimary">Synthesizing weekly achievements...</p>
              <p className="text-xs text-textSecondary">Analyzing task velocity, habit logs, and scheduling adherence.</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => loadWeeklyReview(true)}
                className="px-3 py-1 rounded-lg bg-rose-500/20 font-semibold hover:bg-rose-500/30"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && reviewData && (
            <div className="space-y-6">
              {/* Executive Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-surface/50 border border-border">
                  <div className="flex items-center gap-2 text-textSecondary text-xs mb-1">
                    <ListTodo size={14} className="text-cyan-400" />
                    <span>Tasks Completed</span>
                  </div>
                  <div className="text-xl font-extrabold text-textPrimary">
                    {reviewData.stats?.tasksCompleted ?? 0}
                    <span className="text-xs font-normal text-textSecondary"> / {reviewData.stats?.tasksPlanned ?? 0}</span>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono mt-1">
                    {reviewData.stats?.taskCompletionRate ?? 0}% execution rate
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-surface/50 border border-border">
                  <div className="flex items-center gap-2 text-textSecondary text-xs mb-1">
                    <TrendingUp size={14} className="text-purple-400" />
                    <span>Habit Consistency</span>
                  </div>
                  <div className="text-xl font-extrabold text-textPrimary">
                    {reviewData.stats?.habitCompletionRate ?? 0}%
                  </div>
                  <div className="text-[10px] text-textSecondary font-mono mt-1">
                    {reviewData.stats?.habitsLoggedCount ?? 0} completions logged
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-surface/50 border border-border">
                  <div className="flex items-center gap-2 text-textSecondary text-xs mb-1">
                    <Clock size={14} className="text-amber-400" />
                    <span>Focus Hours</span>
                  </div>
                  <div className="text-xl font-extrabold text-textPrimary">
                    {reviewData.stats?.scheduledHours ?? 0}h
                  </div>
                  <div className="text-[10px] text-textSecondary font-mono mt-1">
                    Scheduled focus time
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-surface/50 border border-border">
                  <div className="flex items-center gap-2 text-textSecondary text-xs mb-1">
                    <Target size={14} className="text-emerald-400" />
                    <span>Topics Mastered</span>
                  </div>
                  <div className="text-xl font-extrabold text-textPrimary">
                    {reviewData.stats?.learningTopicsCompleted ?? 0}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono mt-1">
                    Career roadmap milestones
                  </div>
                </div>
              </div>

              {/* Evidence-Based AI Insights & Recommendations */}
              <div className="p-5 rounded-2xl bg-surface/40 border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-textSecondary flex items-center gap-2">
                    <Brain size={15} className="text-purple-400" />
                    Evidence-Based Strategic Recommendations
                  </h3>
                  <button
                    onClick={() => loadWeeklyReview(true)}
                    className="text-xs text-textSecondary hover:text-textPrimary flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={12} /> Refresh
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {reviewData.recommendations?.map((rec, i) => (
                    <div 
                      key={i}
                      className="p-3.5 rounded-xl bg-surface border border-border/80 flex flex-col justify-between space-y-2"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 inline-block">
                          {rec.category || 'Strategic Focus'}
                        </span>
                        <h4 className="text-xs font-bold text-textPrimary leading-snug">
                          {rec.title}
                        </h4>
                        <p className="text-[11px] text-textSecondary leading-relaxed">
                          {rec.description}
                        </p>
                      </div>

                      {rec.evidence && (
                        <div className="text-[10px] font-mono text-cyan-400/90 pt-1 border-t border-border/40">
                          Evidence: {rec.evidence}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Unfinished Work & Carryover */}
              {reviewData.unfinishedTasks && reviewData.unfinishedTasks.length > 0 && (
                <div className="p-4 rounded-2xl bg-surface/40 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <AlertCircle size={14} /> Unfinished Tasks Eligible for Carryover ({reviewData.unfinishedTasks.length})
                    </span>
                    <span className="text-[11px] text-textSecondary">
                      Will be prioritized into next week's schedule
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {reviewData.unfinishedTasks.slice(0, 6).map((t) => (
                      <div key={t.id} className="p-2 rounded-xl bg-surface border border-border/60 flex items-center justify-between text-xs">
                        <span className="truncate text-textPrimary font-medium">{t.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono flex-shrink-0 ml-2">
                          {t.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Week Planning Section */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-transparent border border-emerald-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                      <Sparkles size={16} className="text-emerald-400" />
                      Ready to Prepare Next Week?
                    </h3>
                    <p className="text-xs text-textSecondary mt-0.5">
                      Intelligently rolls over unfinished priorities, honors upcoming deadlines, and generates conflict-free scheduling blocks.
                    </p>
                  </div>

                  {!nextWeekPlan && (
                    <button
                      onClick={handlePrepareNextWeek}
                      disabled={preparing}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer flex-shrink-0 transition-all"
                    >
                      {preparing ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                      Prepare Next Week Blueprint
                    </button>
                  )}
                </div>

                {/* Proposed Next Week Schedule Preview */}
                {nextWeekPlan && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-surface/80 border border-emerald-500/40 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Proposed Next Week Plan Preview
                      </span>
                      <span className="text-xs font-mono text-textSecondary">
                        {nextWeekPlan.proposedSlots?.length ?? 0} optimized sessions
                      </span>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {nextWeekPlan.proposedSlots?.map((slot, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-cyan-400 font-semibold">{slot.day || 'Mon'} {slot.time}</span>
                            <span className="text-textPrimary font-medium truncate">{slot.title}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-surface-elevated text-textSecondary font-mono flex-shrink-0">
                            {slot.durationMinutes}m • {slot.category}
                          </span>
                        </div>
                      ))}
                    </div>

                    {!planAppliedSuccess ? (
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={handleApplyNextWeekPlan}
                          disabled={applying}
                          className="px-5 py-2.5 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                        >
                          {applying ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={15} />}
                          Approve & Commit Next Week Schedule
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        Next week schedule committed and integrated into your AI Planner!
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/70 bg-surface/50 flex items-center justify-between">
          <div className="text-xs text-textSecondary">
            <span>Historical reviews remain permanently archived in your analytics vault.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-xs font-semibold text-textPrimary cursor-pointer"
          >
            Close Review
          </button>
        </div>
      </motion.div>
    </div>
  );
}

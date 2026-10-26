import React, { useState, useEffect } from 'react';
import {
  Activity, CheckCircle2, Flame, Award, Clock, ArrowRight,
  ShieldAlert, RefreshCw, Zap, Sparkles, HeartHandshake, Check
} from 'lucide-react';
import { getHabitCoach, logHabitRecovery } from '../../services/ecosystem.service';

const AdaptiveHabitCoach = ({ onHabitUpdated }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingId, setLoggingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadCoachData();
  }, []);

  const loadCoachData = async () => {
    setLoading(true);
    try {
      const res = await getHabitCoach();
      setData(res);
    } catch (err) {
      console.error('Failed to load habit coach:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLog = async (habitId, currentCompleted) => {
    setLoggingId(habitId);
    try {
      await logHabitRecovery(habitId, {
        date: new Date().toISOString().split('T')[0],
        completed: !currentCompleted
      });
      setSuccessMsg('✓ Habit status updated!');
      setTimeout(() => setSuccessMsg(''), 2500);
      await loadCoachData();
      if (onHabitUpdated) onHabitUpdated();
    } catch (err) {
      alert('Failed to log habit: ' + err.message);
    } finally {
      setLoggingId(null);
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6 rounded-3xl border border-border/80 animate-pulse space-y-4">
        <div className="h-6 w-48 bg-surface-elevated rounded-xl"></div>
        <div className="h-20 bg-surface-elevated rounded-2xl"></div>
      </div>
    );
  }

  if (!data || data.habits.length === 0) return null;

  return (
    <div className="glass-card p-6 sm:p-7 rounded-3xl border border-border/80 space-y-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Activity size={14} /> Adaptive Habit Coach
            </span>
          </div>
          <h3 className="text-xl font-bold text-textPrimary">
            Consistency & Streak Momentum
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
            <Flame size={14} />
            <span>Weekly Consistency: {data.weekly_completion_rate}%</span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={15} /> {successMsg}
        </div>
      )}

      {/* Adaptive Recovery Mode Alert */}
      {data.recovery_plans?.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <HeartHandshake size={16} />
            <span>Habit Recovery Mode Activated</span>
          </div>
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            {data.recovery_plans[0].message}
          </p>
          <div className="pt-1 flex items-center gap-2">
            <button
              onClick={() => handleQuickLog(data.recovery_plans[0].habit_id, false)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40 text-[11px] flex items-center gap-1"
            >
              <Zap size={12} /> {data.recovery_plans[0].recovery_action}
            </button>
          </div>
        </div>
      )}

      {/* Busy Day Micro-Habit Recommendations */}
      {data.adaptive_recommendations?.length > 0 && (
        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-purple-300">
            <Sparkles size={16} />
            <span>Adaptive Recommendation: {data.adaptive_recommendations[0].title}</span>
          </div>
          <p className="text-[11px] text-purple-200/90 leading-relaxed">
            {data.adaptive_recommendations[0].explanation}
          </p>
        </div>
      )}

      {/* Active Habits Real Streak Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {data.habits.map((h) => (
          <div
            key={h.id}
            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
              h.completed_today
                ? 'bg-emerald-500/10 border-emerald-500/35 text-textPrimary'
                : 'glass-card border-border/70 hover:border-emerald-500/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] font-semibold text-textSecondary uppercase tracking-wider">
                  {h.frequency || 'Daily'}
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-amber-400">
                  <Flame size={12} /> {h.current_streak} Day Streak
                </span>
              </div>

              <h4 className="text-sm font-bold text-textPrimary line-clamp-1">{h.name}</h4>
              <p className="text-[11px] text-textSecondary mt-0.5 line-clamp-1">
                Preferred: {h.preferred_time || 'Flexible'}
              </p>
            </div>

            <div className="pt-2 border-t border-border/50 flex items-center justify-between">
              <span className="text-[10px] text-textSecondary font-medium">
                Past 7d: {h.weekly_completion_rate}%
              </span>

              <button
                onClick={() => handleQuickLog(h.id, h.completed_today)}
                disabled={loggingId === h.id}
                className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                  h.completed_today
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-surface-elevated hover:bg-emerald-500/20 text-textSecondary hover:text-emerald-300 border border-border'
                }`}
              >
                {h.completed_today ? (
                  <>
                    <Check size={12} /> Completed
                  </>
                ) : (
                  'Check In'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdaptiveHabitCoach;

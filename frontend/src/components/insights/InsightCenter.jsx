import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Clock,
  Target,
  TrendingUp,
  BrainCircuit,
  CheckCircle2,
  X,
  ArrowRight,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Bell,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ecosystemService from '../../services/ecosystem.service';
import { useNavigate } from 'react-router-dom';

export default function InsightCenter({ onActionClick }) {
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [insights, setInsights] = useState([]);
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ecosystemService.getInsights();
      if (res.success && res.insights) {
        setInsights(res.insights);
      }
    } catch (err) {
      setError('Unable to refresh intelligent insights.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (insightId, resolution) => {
    setResolvingId(insightId);
    try {
      const res = await ecosystemService.resolveInsight(insightId, resolution);
      if (res.success) {
        setInsights(prev => prev.filter(i => i.id !== insightId));
      }
    } catch (err) {
      alert('Error updating insight status.');
    } finally {
      setResolvingId(null);
    }
  };

  const handleAction = (insight) => {
    if (onActionClick) {
      onActionClick(insight);
    } else if (insight.actionRoute) {
      navigate(insight.actionRoute);
    }
  };

  const filteredInsights = insights.filter(i => {
    if (filterPriority === 'ALL') return true;
    return i.priority === filterPriority;
  });

  if (loading && insights.length === 0) {
    return (
      <div className="glass-card p-6 rounded-3xl border border-border/70 flex items-center justify-center gap-3 text-xs text-textSecondary">
        <Loader2 size={16} className="animate-spin text-purple-400" />
        <span>Scanning LifeOS ecosystem for cross-module intelligence...</span>
      </div>
    );
  }

  if (insights.length === 0 && !loading) {
    return null; // Clean empty state, no noise if no insights
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Sparkles size={15} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
              Cross-Module Intelligence & Alerts
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                {insights.length} active
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-surface border border-border rounded-xl px-2.5 py-1 text-[11px] text-textSecondary focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          <button
            onClick={loadInsights}
            disabled={loading}
            className="p-1.5 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-textSecondary hover:text-textPrimary cursor-pointer transition-all"
            title="Refresh insights"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-purple-400' : ''} />
          </button>
        </div>
      </div>

      {/* Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AnimatePresence>
          {filteredInsights.map((insight) => {
            const isHigh = insight.priority === 'HIGH';
            const isMedium = insight.priority === 'MEDIUM';

            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                  isHigh
                    ? 'bg-rose-500/5 border-rose-500/30 shadow-sm'
                    : isMedium
                    ? 'bg-amber-500/5 border-amber-500/25'
                    : 'bg-surface/50 border-border/80'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                      isHigh
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : isMedium
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                    }`}>
                      {insight.insightType?.replace(/_/g, ' ') || 'SYSTEM ALERT'}
                    </span>

                    <button
                      onClick={() => handleResolve(insight.id, 'DISMISSED')}
                      disabled={resolvingId === insight.id}
                      className="p-1 rounded-lg text-textSecondary hover:text-textPrimary hover:bg-surface transition-all cursor-pointer"
                      title="Dismiss insight"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  <h4 className="text-xs font-bold text-textPrimary leading-snug">
                    {insight.title}
                  </h4>

                  <p className="text-[11px] text-textSecondary leading-relaxed">
                    {insight.message}
                  </p>

                  {/* Supporting evidence */}
                  {insight.evidenceData && (
                    <div className="text-[10px] font-mono text-cyan-400/90 pt-1">
                      Evidence: {typeof insight.evidenceData === 'object' ? JSON.stringify(insight.evidenceData) : String(insight.evidenceData)}
                    </div>
                  )}
                </div>

                {/* Bottom action buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2">
                  <button
                    onClick={() => handleResolve(insight.id, 'RESOLVED')}
                    disabled={resolvingId === insight.id}
                    className="text-[11px] font-semibold text-textSecondary hover:text-emerald-400 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <CheckCircle2 size={13} /> Mark Resolved
                  </button>

                  {insight.actionLabel && (
                    <button
                      onClick={() => handleAction(insight)}
                      className="px-3 py-1 rounded-xl bg-purple-500 text-white hover:bg-purple-600 text-xs font-bold flex items-center gap-1 shadow-sm cursor-pointer transition-all"
                    >
                      <span>{insight.actionLabel}</span>
                      <ArrowRight size={11} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

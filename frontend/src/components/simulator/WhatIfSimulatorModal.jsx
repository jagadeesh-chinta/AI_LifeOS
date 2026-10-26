import React, { useState, useEffect } from 'react';
import {
  X,
  Compass,
  Sliders,
  TrendingUp,
  AlertCircle,
  Clock,
  Calendar,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Loader2,
  ChevronRight,
  Info,
  ShieldCheck,
  Zap,
  Briefcase,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ecosystemService from '../../services/ecosystem.service';

const PRESET_SCENARIOS = [
  {
    type: 'STUDY_2H_DAILY',
    title: 'Study 2 Hours Every Day',
    description: 'Add dedicated 2-hour daily deep-work blocks to accelerate career learning roadmap.',
    defaultHours: 2,
    defaultDays: 7,
    icon: GraduationCap,
    color: 'from-blue-500/20 to-cyan-500/20 border-cyan-500/30 text-cyan-400'
  },
  {
    type: 'PART_TIME_JOB',
    title: 'Add a Part-Time Job (20 hrs/week)',
    description: 'Model 4 hours/day, 5 days/week work commitment and see available free time impact.',
    defaultHours: 4,
    defaultDays: 5,
    icon: Briefcase,
    color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400'
  },
  {
    type: 'WEEKEND_PLACEMENT_PREP',
    title: 'Weekend Placement Prep Sprint',
    description: 'Dedicate 5 hours every Saturday and Sunday to technical interview questions.',
    defaultHours: 5,
    defaultDays: 2,
    icon: Zap,
    color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400'
  },
  {
    type: 'CUSTOM',
    title: 'Custom Routine Simulator',
    description: 'Define your own hours and days to stress-test your weekly bandwidth.',
    defaultHours: 3,
    defaultDays: 4,
    icon: Sliders,
    color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400'
  }
];

export default function WhatIfSimulatorModal({ isOpen, onClose, onScenarioApplied }) {
  const [selectedPreset, setSelectedPreset] = useState(PRESET_SCENARIOS[0]);
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [daysPerWeek, setDaysPerWeek] = useState(7);
  const [customTitle, setCustomTitle] = useState('');
  
  const [simulating, setSimulating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedPreset) {
      setHoursPerDay(selectedPreset.defaultHours);
      setDaysPerWeek(selectedPreset.defaultDays);
      setCustomTitle(selectedPreset.title);
      setSimulationResult(null);
      setAppliedSuccess(false);
      setError(null);
    }
  }, [selectedPreset]);

  const handleRunSimulation = async () => {
    setSimulating(true);
    setError(null);
    setAppliedSuccess(false);
    try {
      const res = await ecosystemService.runSimulation({
        scenarioType: selectedPreset.type,
        customHoursPerDay: Number(hoursPerDay),
        customDaysPerWeek: Number(daysPerWeek),
        scenarioTitle: customTitle || selectedPreset.title
      });

      if (res.success && res.simulation) {
        setSimulationResult(res.simulation);
      } else {
        setError('Failed to compute simulation scenario.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Error running simulation');
    } finally {
      setSimulating(false);
    }
  };

  const handleApplyScenario = async () => {
    if (!simulationResult || !simulationResult.scenarioId) return;
    if (!window.confirm("Apply this scenario? This will create task blocks or goals reflecting your simulation. Your existing fixed commitments will NOT be overwritten.")) {
      return;
    }

    setApplying(true);
    setError(null);
    try {
      const res = await ecosystemService.applySimulationScenario(simulationResult.scenarioId);
      if (res.success) {
        setAppliedSuccess(true);
        if (onScenarioApplied) onScenarioApplied(res);
      } else {
        setError('Failed to apply scenario.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Error applying scenario');
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
              <span className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400">
                <Compass size={18} />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                What-If Life Simulator
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface border border-border text-textSecondary font-mono">
                Isolated Sandbox Mode
              </span>
            </div>
            <h2 className="text-xl font-bold text-textPrimary">
              Explore Life Decisions Without Modifying Real Data
            </h2>
            <p className="text-xs text-textSecondary">
              Forecast time impact, workload stress, and feasibility before committing any real changes.
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
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Scenario Selection Grid */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-3">
              1. Choose a Life Scenario to Test
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PRESET_SCENARIOS.map((scenario) => {
                const IconComponent = scenario.icon;
                const isSelected = selectedPreset.type === scenario.type;
                return (
                  <button
                    key={scenario.type}
                    onClick={() => setSelectedPreset(scenario)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? `bg-gradient-to-br ${scenario.color} shadow-lg ring-1 ring-cyan-500/40`
                        : 'bg-surface hover:bg-surface-elevated border-border text-textSecondary'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="p-2 rounded-xl bg-surface/60 w-fit">
                        <IconComponent size={18} className={isSelected ? 'text-textPrimary' : 'text-textSecondary'} />
                      </div>
                      <h4 className="text-xs font-bold text-textPrimary leading-snug">
                        {scenario.title}
                      </h4>
                      <p className="text-[11px] text-textSecondary leading-relaxed">
                        {scenario.description}
                      </p>
                    </div>
                    <div className="pt-3 text-[10px] font-mono opacity-80">
                      {scenario.defaultHours}h/day • {scenario.defaultDays}d/week
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assumptions Adjuster */}
          <div className="p-5 rounded-2xl bg-surface/60 border border-border space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-textSecondary flex items-center gap-2">
              <Sliders size={14} className="text-cyan-400" />
              2. Tune Assumptions & Parameters
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-xs font-semibold text-textSecondary block mb-1.5">
                  Scenario Label
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-textPrimary focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. Study 2h daily for Placements"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-textSecondary mb-1.5">
                  <span>Hours per session</span>
                  <span className="font-mono text-cyan-400">{hoursPerDay} hrs/day</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="8"
                  step="0.5"
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(e.target.value)}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-textSecondary mb-1.5">
                  <span>Days per week</span>
                  <span className="font-mono text-cyan-400">{daysPerWeek} days/wk</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="7"
                  step="1"
                  value={daysPerWeek}
                  onChange={(e) => setDaysPerWeek(e.target.value)}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleRunSimulation}
                disabled={simulating}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 text-black hover:bg-cyan-400 font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer transition-all"
              >
                {simulating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Run Live Simulation
              </button>
            </div>
          </div>

          {/* Simulation Comparative Results */}
          {simulationResult && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-textSecondary flex items-center gap-2">
                <TrendingUp size={14} className="text-emerald-400" />
                3. Comparative Impact Analysis
              </h3>

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Current Plan */}
                <div className="p-4 rounded-2xl bg-surface/50 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-textSecondary">
                      Current Baseline Plan
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface border border-border text-textSecondary">
                      Verified Data
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-textSecondary">Active Tasks Scheduled</span>
                      <span className="font-mono font-semibold text-textPrimary">{simulationResult.currentPlan?.totalTasks ?? 0}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-textSecondary">Weekly Scheduled Load</span>
                      <span className="font-mono font-semibold text-textPrimary">{simulationResult.currentPlan?.weeklyWorkloadHours ?? 0} hrs</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-textSecondary">Weekly Available Free Time</span>
                      <span className="font-mono font-semibold text-emerald-400">{simulationResult.currentPlan?.availableFreeHours ?? 40} hrs</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-textSecondary">Current Bandwidth Status</span>
                      <span className="font-semibold text-cyan-400">{simulationResult.currentPlan?.bandwidthStatus ?? 'Balanced'}</span>
                    </div>
                  </div>
                </div>

                {/* Proposed Scenario */}
                <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                      Proposed Simulation
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono">
                      +{(hoursPerDay * daysPerWeek).toFixed(1)} hrs/wk
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-textSecondary">New Weekly Workload</span>
                      <span className="font-mono font-semibold text-textPrimary">
                        {simulationResult.proposedPlan?.newWeeklyWorkloadHours ?? 0} hrs
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-textSecondary">Remaining Free Bandwidth</span>
                      <span className={`font-mono font-semibold ${
                        (simulationResult.proposedPlan?.remainingFreeHours ?? 0) < 5 
                          ? 'text-rose-400' 
                          : 'text-emerald-400'
                      }`}>
                        {simulationResult.proposedPlan?.remainingFreeHours ?? 0} hrs
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-textSecondary">Roadmap Finish Velocity</span>
                      <span className="font-semibold text-cyan-300">
                        {simulationResult.proposedPlan?.roadmapVelocityMultiplier ?? '1.4x faster'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-textSecondary">Feasibility Assessment</span>
                      <span className={`font-bold ${
                        simulationResult.proposedPlan?.feasibility === 'CHALLENGING'
                          ? 'text-amber-400'
                          : simulationResult.proposedPlan?.feasibility === 'OVERLOADED'
                          ? 'text-rose-400'
                          : 'text-emerald-400'
                      }`}>
                        {simulationResult.proposedPlan?.feasibility ?? 'REALISTIC & SUSTAINABLE'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trade-Offs and Considerations */}
              {simulationResult.tradeOffs && simulationResult.tradeOffs.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <AlertCircle size={14} /> Potential Trade-Offs & Scheduling Conflicts
                  </span>
                  <ul className="space-y-1 text-xs text-textSecondary list-disc list-inside">
                    {simulationResult.tradeOffs.map((to, i) => (
                      <li key={i}>{to}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Disclaimer */}
              <div className="p-3 rounded-xl bg-surface border border-border/60 text-[11px] text-textSecondary flex items-center gap-2">
                <Info size={14} className="text-textSecondary flex-shrink-0" />
                <span>
                  {simulationResult.forecastDisclaimer || "Forecasts are AI predictive estimates based on your logged calendar habits. Actual velocity may vary."}
                </span>
              </div>
            </motion.div>
          )}

          {appliedSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} />
                <span className="font-semibold">Scenario successfully applied to your active schedule & goals!</span>
              </div>
              <button
                onClick={onClose}
                className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 font-bold"
              >
                Close Simulator
              </button>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/70 bg-surface/50 flex items-center justify-between">
          <div className="text-xs text-textSecondary">
            <span>Simulations are completely isolated and never alter real data until applied.</span>
          </div>

          <div className="flex items-center gap-2">
            {simulationResult && !appliedSuccess && (
              <button
                onClick={handleApplyScenario}
                disabled={applying}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 font-bold text-xs flex items-center gap-1.5 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {applying ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={14} />}
                Confirm & Apply Scenario
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-xs font-semibold text-textSecondary cursor-pointer"
            >
              {appliedSuccess ? 'Done' : 'Cancel'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

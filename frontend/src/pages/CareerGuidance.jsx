import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getCareerGuidance, getGoalProgressSummary } from '../services/career.service';
import StageLearningView from '../components/career/StageLearningView';
import {
  Compass, ArrowLeft, RefreshCw, CheckCircle2, Clock,
  Sparkles, Target, Layers, Laptop, Award, CheckSquare,
  AlertCircle, Share2, BookOpen, Cpu, ChevronRight, Play, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CareerGuidance = () => {
  const { id: paramId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const goalId = paramId || searchParams.get('goalId');
  const stageQueryParam = searchParams.get('stage');

  const [roadmap, setRoadmap] = useState(null);
  const [goalSummary, setGoalSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');

  // Active Stage for dedicated full-screen learning workspace
  const [activeStageNumber, setActiveStageNumber] = useState(
    stageQueryParam ? parseInt(stageQueryParam, 10) : null
  );

  // Checklist tracking
  const [completedItems, setCompletedItems] = useState({});

  useEffect(() => {
    if (!goalId) {
      setError('No Goal ID provided. Please navigate from your Goals section.');
      setLoading(false);
      return;
    }
    fetchRoadmapAndProgress();
  }, [goalId]);

  useEffect(() => {
    if (stageQueryParam) {
      const num = parseInt(stageQueryParam, 10);
      if (!isNaN(num) && num !== activeStageNumber) {
        setActiveStageNumber(num);
      }
    } else {
      setActiveStageNumber(null);
    }
  }, [stageQueryParam]);

  const fetchRoadmapAndProgress = async (force = false) => {
    if (force) {
      setRegenerating(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const [roadmapData, summaryData] = await Promise.all([
        getCareerGuidance(goalId, force),
        getGoalProgressSummary(goalId).catch(() => null)
      ]);
      setRoadmap(roadmapData);
      setGoalSummary(summaryData);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load career guidance roadmap.');
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  const handleOpenStage = (stageNum) => {
    setActiveStageNumber(stageNum);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('stage', stageNum);
    if (!newParams.get('goalId')) newParams.set('goalId', goalId);
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToRoadmap = () => {
    setActiveStageNumber(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('stage');
    setSearchParams(newParams);
    // Refresh progress summary so the table reflects newly completed topics
    getGoalProgressSummary(goalId).then(setGoalSummary).catch(() => {});
  };

  const toggleChecklist = (index) => {
    setCompletedItems((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <span className="text-sm font-semibold text-textPrimary">
            Architecting Personalized AI Career Guidance...
          </span>
          <span className="text-xs text-textSecondary">
            Synthesizing curriculum, project milestones, and industry skills
          </span>
        </div>
      </div>
    );
  }

  // 1. IMMERSIVE FULL-SCREEN STAGE LEARNING WORKSPACE (When a stage is open)
  if (activeStageNumber) {
    return (
      <div className="min-h-screen bg-background text-textPrimary pb-20 px-4 sm:px-8 pt-6 max-w-7xl mx-auto">
        <StageLearningView
          goalId={goalId}
          stageNumber={activeStageNumber}
          onBack={handleBackToRoadmap}
          onProgressUpdated={(newProg) => {
            getGoalProgressSummary(goalId).then(setGoalSummary).catch(() => {});
          }}
        />
      </div>
    );
  }

  // Helper to get stage progress
  const getStageStats = (stageNum) => {
    const found = goalSummary?.stages?.find(s => s.stage_number === stageNum);
    return found || { completed: 0, total: 12, percentage: 0 };
  };

  // 2. MAIN CAREER GUIDANCE ROADMAP VIEW
  return (
    <div className="min-h-screen bg-background text-textPrimary pb-20 px-4 sm:px-8 pt-8 max-w-6xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/60">
        <button
          onClick={() => navigate('/goals')}
          className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-2 hover:border-cyan-500/40 cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Goals
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchRoadmapAndProgress(true)}
            disabled={regenerating}
            className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5 hover:border-cyan-500/40 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
            {regenerating ? 'Regenerating...' : 'Regenerate Roadmap'}
          </button>

          <button
            onClick={() => window.print()}
            className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer"
          >
            <Share2 size={14} /> Print / Export
          </button>
        </div>
      </div>

      {error ? (
        <div className="glass-card p-8 text-center rounded-2xl max-w-md mx-auto">
          <AlertCircle size={40} className="mx-auto text-rose-400 mb-3" />
          <h3 className="text-base font-bold text-textPrimary">Roadmap Error</h3>
          <p className="text-xs text-textSecondary mt-1 mb-5">{error}</p>
          <button onClick={() => fetchRoadmapAndProgress(true)} className="btn-primary text-xs cursor-pointer">
            Retry Generation
          </button>
        </div>
      ) : roadmap ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header Banner */}
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-border/80 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                    <Compass size={13} />
                    Interactive Career Guidance Roadmap
                  </span>

                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                    <Clock size={13} />
                    Target: {roadmap.target_duration}
                  </span>

                  {roadmap.ai_provider && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface border border-border text-textSecondary flex items-center gap-1">
                      <Cpu size={12} className="text-cyan-400" />
                      Powered by {roadmap.ai_provider}
                    </span>
                  )}
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold text-textPrimary tracking-tight">
                  {roadmap.goal_title}
                </h1>
              </div>

              {/* Overall Progress Stat Box */}
              {goalSummary && (
                <div className="p-4 rounded-2xl bg-surface-elevated/80 border border-border sm:w-64 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-textSecondary uppercase tracking-wider">Goal Progress</span>
                    <span className="text-cyan-400 font-mono text-sm">{goalSummary.overall_progress}%</span>
                  </div>
                  <div className="w-full bg-surface border border-border rounded-full h-2.5 overflow-hidden p-0.5">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${goalSummary.overall_progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="text-[11px] text-textSecondary flex items-center justify-between">
                    <span>{goalSummary.total_completed} topics completed</span>
                    <span className="text-emerald-400 font-bold">Interactive</span>
                  </div>
                </div>
              )}
            </div>

            {/* Strategic Overview */}
            <div className="mt-5 pt-4 border-t border-border/60">
              <h3 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles size={14} className="text-cyan-400" />
                Strategic Path Overview
              </h3>
              <p className="text-sm text-textSecondary leading-relaxed">
                {roadmap.overview}
              </p>
            </div>

            {/* Required Skills Badges */}
            {roadmap.required_skills && roadmap.required_skills.length > 0 && (
              <div className="mt-5 pt-4 border-t border-border/60">
                <h3 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-2.5">
                  Core Competencies to Master
                </h3>
                <div className="flex flex-wrap gap-2">
                  {roadmap.required_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-surface-elevated border border-border/80 text-textPrimary"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* STRUCTURED ROADMAP TABLE (Every stage row is clickable!) */}
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-border/80 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2">
                  <Layers className="text-cyan-400" size={20} />
                  Stage-by-Stage Curriculum & Interactive Topics
                </h2>
                <p className="text-xs text-textSecondary mt-0.5">
                  Click any stage to open its <strong>dedicated full-screen learning workspace, topic checklist, and AI mentor</strong>.
                </p>
              </div>

              <span className="text-xs text-cyan-400 font-bold bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-xl w-fit">
                Interactive Learning Enabled
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border/70 shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-elevated/80 border-b border-border/70 text-textSecondary font-semibold uppercase tracking-wider">
                    <th className="p-4 w-1/5">Stage</th>
                    <th className="p-4 w-1/4">Skills / Topics</th>
                    <th className="p-4 w-1/5">Technologies</th>
                    <th className="p-4 w-1/4">Practical Project</th>
                    <th className="p-4 w-32 text-center">Progress / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {roadmap.stages &&
                    roadmap.stages.map((stage, idx) => {
                      const stageNum = stage.stage_number || idx + 1;
                      const stats = getStageStats(stageNum);

                      return (
                        <tr
                          key={idx}
                          onClick={() => handleOpenStage(stageNum)}
                          className="hover:bg-cyan-500/5 transition-all cursor-pointer group"
                        >
                          {/* Stage Name & Link */}
                          <td className="p-4 align-top">
                            <div className="space-y-1">
                              <span className="font-extrabold text-sm text-cyan-400 group-hover:text-cyan-300 flex items-center gap-1.5 transition-colors">
                                <span>{stage.stage_name || `Stage ${stageNum}`}</span>
                                <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-cyan-400" />
                              </span>
                              <span className="inline-block text-[10px] font-semibold text-textSecondary bg-surface px-2 py-0.5 rounded border border-border">
                                {stage.estimated_duration}
                              </span>
                            </div>
                          </td>

                          {/* Skills / Topics */}
                          <td className="p-4 align-top text-textSecondary leading-relaxed">
                            {stage.skills_topics}
                          </td>

                          {/* Technologies */}
                          <td className="p-4 align-top">
                            <span className="inline-block p-1.5 rounded-lg bg-surface border border-border text-[11px] font-medium text-purple-300">
                              {stage.technologies}
                            </span>
                          </td>

                          {/* Practical Project */}
                          <td className="p-4 align-top">
                            <div className="flex items-start gap-1.5">
                              <Laptop size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                              <span className="font-semibold text-textPrimary leading-snug">
                                {stage.practical_project}
                              </span>
                            </div>
                          </td>

                          {/* Progress & Open Button */}
                          <td className="p-4 align-top text-center whitespace-nowrap">
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="w-full bg-surface border border-border rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full"
                                  style={{ width: `${stats.percentage}%` }}
                                />
                              </div>

                              <span className="text-[11px] font-mono font-bold text-textSecondary">
                                {stats.percentage}% Done
                              </span>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenStage(stageNum);
                                }}
                                className="px-3 py-1 rounded-xl bg-cyan-500/15 group-hover:bg-cyan-500 text-cyan-300 group-hover:text-black border border-cyan-500/30 font-bold text-[11px] transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                              >
                                <Play size={10} className="fill-current" />
                                <span>Learn Stage</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Milestones & Achievement Checklist Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Milestones */}
            {roadmap.milestones && roadmap.milestones.length > 0 && (
              <div className="glass-card p-6 rounded-3xl border border-border/80 shadow-md">
                <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Award size={18} className="text-amber-400" />
                  Key Milestones to Reach
                </h3>
                <div className="space-y-3">
                  {roadmap.milestones.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-surface-elevated/40 border border-border/60 flex items-start gap-2.5"
                    >
                      <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <span className="text-xs text-textSecondary leading-relaxed">{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Final Achievement Checklist */}
            {roadmap.checklist && roadmap.checklist.length > 0 && (
              <div className="glass-card p-6 rounded-3xl border border-border/80 shadow-md">
                <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider mb-4 flex items-center gap-2">
                  <CheckSquare size={18} className="text-emerald-400" />
                  Final Achievement Checklist
                </h3>
                <div className="space-y-3">
                  {roadmap.checklist.map((item, idx) => {
                    const isChecked = Boolean(completedItems[idx]);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleChecklist(idx)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                          isChecked
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-surface-elevated/40 border-border/60 hover:border-cyan-500/40'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isChecked
                              ? 'bg-emerald-500 text-white'
                              : 'border border-border bg-surface'
                          }`}
                        >
                          {isChecked && <CheckCircle2 size={14} />}
                        </div>
                        <span
                          className={`text-xs leading-relaxed ${
                            isChecked
                              ? 'line-through text-textSecondary/60'
                              : 'text-textSecondary'
                          }`}
                        >
                          {item}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      ) : null}
    </div>
  );
};

export default CareerGuidance;

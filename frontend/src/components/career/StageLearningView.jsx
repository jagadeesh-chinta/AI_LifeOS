import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Sparkles, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  RotateCcw, 
  Laptop, 
  BookOpen, 
  Code, 
  Layers, 
  Target, 
  Check, 
  AlertTriangle,
  Loader2,
  ExternalLink,
  Zap,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getStageCurriculum, 
  toggleTopicCompletion, 
  resetStageProgress 
} from '../../services/career.service';
import TopicDetailModal from './TopicDetailModal';

export default function StageLearningView({
  goalId,
  stageNumber,
  onBack,
  onProgressUpdated
}) {
  const [loading, setLoading] = useState(true);
  const [stageData, setStageData] = useState(null);
  const [error, setError] = useState('');

  // Filtering & Search state
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'incomplete' | 'completed'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTechs, setExpandedTechs] = useState({});

  // Topic Detail Modal state
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedTech, setSelectedTech] = useState(null);

  // Reset Progress Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    loadStageCurriculum();
  }, [goalId, stageNumber]);

  const loadStageCurriculum = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getStageCurriculum(goalId, stageNumber);
      setStageData(data);
      // Expand all technologies by default
      const defaultExpanded = {};
      (data.technologies || []).forEach(t => {
        defaultExpanded[t.id] = true;
      });
      setExpandedTechs(defaultExpanded);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load stage curriculum.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle individual topic completion
  const handleToggleTopic = async (topic, tech) => {
    try {
      const nextCompleted = !topic.completed;
      
      // Optimistic update
      setStageData(prev => {
        if (!prev) return prev;
        let newStageCompleted = 0;
        let newStageTotal = 0;

        const updatedTechs = prev.technologies.map(t => {
          let techCompleted = 0;
          const updatedTopics = t.topics.map(tp => {
            const isMatch = tp.id === topic.id;
            const isDone = isMatch ? nextCompleted : tp.completed;
            if (isDone) techCompleted++;
            return isMatch ? { ...tp, completed: nextCompleted } : tp;
          });

          newStageCompleted += techCompleted;
          newStageTotal += updatedTopics.length;

          return {
            ...t,
            progress: {
              ...t.progress,
              completed: techCompleted,
              percentage: updatedTopics.length > 0 ? Math.round((techCompleted / updatedTopics.length) * 100) : 0
            },
            topics: updatedTopics
          };
        });

        const newStagePercent = newStageTotal > 0 ? Math.round((newStageCompleted / newStageTotal) * 100) : 0;
        const delta = nextCompleted ? 1 : -1;
        const newGoalCompleted = Math.max(0, (prev.progress?.goal?.completed || 0) + delta);
        const goalTotal = prev.progress?.goal?.total || 1;
        const newGoalPercent = Math.min(100, Math.round((newGoalCompleted / goalTotal) * 100));

        return {
          ...prev,
          progress: {
            stage: {
              completed: newStageCompleted,
              total: newStageTotal,
              percentage: newStagePercent
            },
            goal: {
              ...prev.progress?.goal,
              completed: newGoalCompleted,
              percentage: newGoalPercent
            }
          },
          technologies: updatedTechs
        };
      });

      if (selectedTopic && selectedTopic.id === topic.id) {
        setSelectedTopic(prev => prev ? { ...prev, completed: nextCompleted } : null);
      }

      // Persist to MySQL
      const res = await toggleTopicCompletion(
        goalId,
        stageNumber,
        topic.id,
        {
          technologyId: tech?.id || 'tech',
          completed: nextCompleted
        }
      );

      if (res.stage_curriculum) {
        setStageData(res.stage_curriculum);
      }

      if (onProgressUpdated) {
        onProgressUpdated(res.progress);
      }
    } catch (err) {
      console.error('Failed to toggle topic completion:', err);
      loadStageCurriculum();
    }
  };

  // Reset stage progress
  const handleConfirmReset = async () => {
    setResetting(true);
    try {
      const res = await resetStageProgress(goalId, stageNumber);
      if (res.stage_curriculum) {
        setStageData(res.stage_curriculum);
      }
      setShowResetModal(false);
      if (onProgressUpdated) {
        onProgressUpdated(res.stage_curriculum?.progress);
      }
    } catch (err) {
      console.error('Failed to reset stage progress:', err);
    } finally {
      setResetting(false);
    }
  };

  // Continue Learning: Jumps to first incomplete topic
  const handleContinueLearning = () => {
    if (!stageData) return;
    for (const tech of stageData.technologies || []) {
      for (const topic of tech.topics || []) {
        if (!topic.completed) {
          // Expand tech if collapsed
          setExpandedTechs(prev => ({ ...prev, [tech.id]: true }));
          setSelectedTopic(topic);
          setSelectedTech(tech);
          return;
        }
      }
    }
    // If all completed, open first topic
    const firstTech = stageData.technologies?.[0];
    const firstTopic = firstTech?.topics?.[0];
    if (firstTopic) {
      setSelectedTopic(firstTopic);
      setSelectedTech(firstTech);
    }
  };

  const toggleTechExpand = (techId) => {
    setExpandedTechs(prev => ({
      ...prev,
      [techId]: !prev[techId]
    }));
  };

  const toggleExpandAll = () => {
    const allExpanded = Object.values(expandedTechs).every(Boolean);
    const updated = {};
    (stageData?.technologies || []).forEach(t => {
      updated[t.id] = !allExpanded;
    });
    setExpandedTechs(updated);
  };

  // Filtering topics helper
  const filterTopics = (topics = []) => {
    return topics.filter(t => {
      // 1. Completion filter
      if (activeFilter === 'completed' && !t.completed) return false;
      if (activeFilter === 'incomplete' && t.completed) return false;

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesDesc = (t.short_description || '').toLowerCase().includes(q);
        const matchesConcepts = (t.key_concepts || []).some(k => k.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesConcepts) return false;
      }

      return true;
    });
  };

  // Estimate remaining learning time in minutes
  const calculateRemainingMinutes = () => {
    if (!stageData) return 0;
    let totalMins = 0;
    (stageData.technologies || []).forEach(tech => {
      (tech.topics || []).forEach(tp => {
        if (!tp.completed) {
          const match = String(tp.estimated_time || '45 mins').match(/(\d+)/);
          totalMins += match ? parseInt(match[1], 10) : 45;
        }
      });
    });
    return totalMins;
  };

  const remainingMins = calculateRemainingMinutes();
  const remainingHoursStr = remainingMins > 60 
    ? `${Math.floor(remainingMins / 60)}h ${remainingMins % 60}m` 
    : `${remainingMins} mins`;

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
        <h3 className="text-base font-bold text-textPrimary">
          Synthesizing Stage {stageNumber} Curriculum & Roadmaps...
        </h3>
        <p className="text-xs text-textSecondary mt-1">
          Breaking down skills, individual technologies, and topic checklists
        </p>
      </div>
    );
  }

  if (error || !stageData) {
    return (
      <div className="glass-card p-8 rounded-3xl max-w-md mx-auto text-center space-y-4 my-12">
        <AlertTriangle size={36} className="text-rose-400 mx-auto" />
        <h3 className="text-lg font-bold text-textPrimary">Curriculum Unavailable</h3>
        <p className="text-xs text-textSecondary">{error || 'Could not load stage curriculum.'}</p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={onBack} className="btn-secondary text-xs px-4 py-2">
            Back to Roadmap
          </button>
          <button onClick={loadStageCurriculum} className="btn-primary text-xs px-4 py-2">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stageProgress = stageData.progress?.stage || { completed: 0, total: 1, percentage: 0 };
  const goalProgress = stageData.progress?.goal || { completed: 0, total: 1, percentage: 0 };

  return (
    <div className="space-y-6 pb-20">
      {/* TOP HEADER SECTION */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-border/80 shadow-2xl relative overflow-hidden">
        {/* Accent Top Gradient */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500" />

        {/* Back Button & Top Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <button
            onClick={onBack}
            className="btn-secondary text-xs px-4 py-2 flex items-center gap-2 hover:border-cyan-500/40 w-fit cursor-pointer shadow-sm group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back to Roadmap</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
              <Sparkles size={13} />
              {stageData.goal_title}
            </span>

            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
              <Clock size={13} />
              Est. Duration: {stageData.estimated_duration || '4 weeks'}
            </span>
          </div>
        </div>

        {/* Stage Title & Progress Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-8 space-y-2">
            <div className="text-xs font-extrabold uppercase tracking-wider text-cyan-400">
              Stage {stageData.stage_number} Interactive Learning Workspace
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-textPrimary tracking-tight">
              {stageData.stage_name}
            </h1>
            
            {stageData.practical_project && (
              <div className="pt-2 flex items-center gap-2 text-xs sm:text-sm text-emerald-400 font-medium">
                <Laptop size={16} className="shrink-0" />
                <span>Capstone Project: <strong>{stageData.practical_project}</strong></span>
              </div>
            )}
          </div>

          {/* Stage Completion Progress Widget */}
          <div className="lg:col-span-4 bg-surface-elevated/70 p-4 sm:p-5 rounded-2xl border border-border/80 shadow-md space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-textSecondary">
                Stage Completion
              </span>
              <span className="text-lg font-extrabold text-cyan-400 font-mono">
                {stageProgress.percentage}%
              </span>
            </div>

            {/* Smooth Progress Bar */}
            <div className="w-full bg-surface border border-border rounded-full h-3 overflow-hidden p-0.5 shadow-inner">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                initial={{ width: 0 }}
                animate={{ width: `${stageProgress.percentage}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-textSecondary font-medium">
              <span>{stageProgress.completed} of {stageProgress.total} topics completed</span>
              <span className="text-emerald-400 font-bold">
                {stageProgress.total - stageProgress.completed} remaining
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ACTION CONTROLS & FILTER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface border border-border/80 p-4 rounded-2xl shadow-sm">
        {/* Left: Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                : 'bg-surface-elevated text-textSecondary hover:text-textPrimary hover:bg-surface-elevated/80'
            }`}
          >
            All Topics ({stageProgress.total})
          </button>

          <button
            onClick={() => setActiveFilter('incomplete')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'incomplete'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                : 'bg-surface-elevated text-textSecondary hover:text-textPrimary hover:bg-surface-elevated/80'
            }`}
          >
            Incomplete ({stageProgress.total - stageProgress.completed})
          </button>

          <button
            onClick={() => setActiveFilter('completed')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeFilter === 'completed'
                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                : 'bg-surface-elevated text-textSecondary hover:text-textPrimary hover:bg-surface-elevated/80'
            }`}
          >
            <Check size={13} />
            <span>Completed ({stageProgress.completed})</span>
          </button>
        </div>

        {/* Right: Search, Expand All & Reset Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics or concepts..."
              className="w-full bg-surface-elevated border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-textPrimary placeholder:text-textSecondary focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            onClick={toggleExpandAll}
            className="px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-elevated/80 border border-border text-xs font-semibold text-textSecondary hover:text-textPrimary transition-all cursor-pointer"
            title="Expand or collapse all technology sections"
          >
            {Object.values(expandedTechs).every(Boolean) ? 'Collapse All' : 'Expand All'}
          </button>

          <button
            onClick={() => setShowResetModal(true)}
            className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-bold text-red-400 transition-all flex items-center gap-1 cursor-pointer"
            title="Reset stage progress to 0%"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE: LEFT TECH SECTIONS | RIGHT STATS & CONTINUE LEARNING */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT: TECHNOLOGY CARDS & DETAILED TOPIC LIST (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          {(stageData.technologies || []).map((tech, techIdx) => {
            const isExpanded = Boolean(expandedTechs[tech.id]);
            const filteredTopics = filterTopics(tech.topics);
            const techProgress = tech.progress || { completed: 0, total: 1, percentage: 0 };

            return (
              <motion.div
                key={tech.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: techIdx * 0.05 }}
                className="glass-card rounded-2xl border border-border/80 shadow-lg overflow-hidden"
              >
                {/* Technology Header Bar */}
                <div
                  onClick={() => toggleTechExpand(tech.id)}
                  className="p-4 sm:p-5 bg-surface-elevated/50 hover:bg-surface-elevated/80 border-b border-border/60 transition-colors cursor-pointer flex items-center justify-between gap-4 select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-sm">
                      <Code size={20} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base sm:text-lg font-bold text-textPrimary tracking-tight truncate">
                        {tech.name}
                      </h2>
                      <p className="text-xs text-textSecondary truncate">
                        {tech.description}
                      </p>
                    </div>
                  </div>

                  {/* Progress & Accordion Toggle */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <span className="text-xs font-mono font-bold text-cyan-400">
                        {techProgress.percentage}%
                      </span>
                      <span className="text-[11px] text-textSecondary block">
                        {techProgress.completed}/{techProgress.total} completed
                      </span>
                    </div>

                    <div className="w-6 h-6 rounded-lg bg-surface border border-border flex items-center justify-center text-textSecondary">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* Technology Topics List */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="divide-y divide-border/40 overflow-hidden"
                    >
                      {filteredTopics.length === 0 ? (
                        <div className="p-6 text-center text-xs text-textSecondary">
                          No topics match your current filter or search criteria.
                        </div>
                      ) : (
                        filteredTopics.map((topic, topicIdx) => (
                          <div
                            key={topic.id}
                            className={`p-3.5 sm:p-4.5 hover:bg-surface-elevated/40 transition-colors flex items-start gap-3.5 group ${
                              topic.completed ? 'bg-surface/30' : ''
                            }`}
                          >
                            {/* CIRCULAR COMPLETION CHECKBOX */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleTopic(topic, tech);
                              }}
                              className="mt-0.5 shrink-0 cursor-pointer focus:outline-none transition-transform active:scale-90"
                              title={topic.completed ? "Mark incomplete" : "Mark as completed"}
                            >
                              {topic.completed ? (
                                <div className="w-5 h-5 rounded-full bg-emerald-500 border border-emerald-400 flex items-center justify-center text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                                  <Check size={12} strokeWidth={3} />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-slate-400 hover:border-emerald-400 bg-transparent transition-colors" />
                              )}
                            </button>

                            {/* Topic Title & Description (Clickable to open details) */}
                            <div
                              onClick={() => {
                                setSelectedTopic(topic);
                                setSelectedTech(tech);
                              }}
                              className="flex-1 min-w-0 cursor-pointer space-y-1"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-sm sm:text-base font-bold leading-snug group-hover:text-cyan-400 transition-colors ${
                                  topic.completed ? 'line-through text-textSecondary/70' : 'text-textPrimary'
                                }`}>
                                  {topic.title}
                                </span>

                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                                  topic.difficulty === 'Advanced'
                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                    : topic.difficulty === 'Intermediate'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                }`}>
                                  {topic.difficulty || 'Beginner'}
                                </span>

                                <span className="text-[11px] font-mono text-textSecondary flex items-center gap-1">
                                  <Clock size={11} className="text-cyan-400" />
                                  {topic.estimated_time || '45 mins'}
                                </span>
                              </div>

                              <p className="text-xs text-textSecondary leading-relaxed line-clamp-2">
                                {topic.short_description}
                              </p>

                              {/* Key concepts pill preview */}
                              {topic.key_concepts && topic.key_concepts.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                  {topic.key_concepts.slice(0, 3).map((concept, i) => (
                                    <span
                                      key={i}
                                      className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface border border-border/70 text-textSecondary"
                                    >
                                      {concept}
                                    </span>
                                  ))}
                                  {topic.key_concepts.length > 3 && (
                                    <span className="text-[10px] text-textSecondary">
                                      +{topic.key_concepts.length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Open Details Arrow Button */}
                            <button
                              onClick={() => {
                                setSelectedTopic(topic);
                                setSelectedTech(tech);
                              }}
                              className="text-textSecondary group-hover:text-cyan-400 p-1.5 rounded-lg hover:bg-surface transition-colors shrink-0 cursor-pointer"
                              title="Open learning details"
                            >
                              <ExternalLink size={15} />
                            </button>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* RIGHT SIDEBAR: OVERALL GOAL PROGRESS & CONTINUE LEARNING (lg:col-span-4) */}
        <div className="lg:col-span-4 lg:sticky lg:top-4 space-y-6">
          
          {/* Continue Learning CTA Card */}
          <div className="glass-card p-6 rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-surface via-surface-elevated to-surface shadow-2xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-2xl pointer-events-none" />

            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Play size={13} className="fill-cyan-400 text-cyan-400" />
                Recommended Next Step
              </span>
              <h3 className="text-lg font-extrabold text-textPrimary tracking-tight">
                {stageData.next_recommended_topic?.title || 'Stage Complete! Review or practice.'}
              </h3>
              <p className="text-xs text-textSecondary">
                {stageData.next_recommended_topic 
                  ? `In module: ${stageData.next_recommended_topic.technology_name}` 
                  : 'You have completed all curriculum topics in this stage!'}
              </p>
            </div>

            <button
              onClick={handleContinueLearning}
              className="w-full btn-primary text-xs sm:text-sm font-bold py-3 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Zap size={16} />
              <span>Continue Learning</span>
            </button>
          </div>

          {/* Overall Goal Progress Card */}
          <div className="glass-card p-6 rounded-3xl border border-border/80 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-textPrimary">
                <Target size={16} className="text-indigo-400" />
                <span>Overall Goal Roadmap</span>
              </div>
              <span className="text-xs font-mono font-extrabold text-indigo-400 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                {goalProgress.percentage}% Done
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-surface border border-border rounded-full h-2.5 overflow-hidden p-0.5">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${goalProgress.percentage}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
              <div className="p-3 rounded-2xl bg-surface-elevated border border-border/70 space-y-1">
                <span className="text-textSecondary block">Stage Topics</span>
                <span className="text-base font-bold text-textPrimary font-mono">
                  {stageProgress.completed} / {stageProgress.total}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-elevated border border-border/70 space-y-1">
                <span className="text-textSecondary block">Time Remaining</span>
                <span className="text-base font-bold text-cyan-400 font-mono">
                  {remainingHoursStr}
                </span>
              </div>
            </div>

            {/* Capstone Project Card */}
            {stageData.practical_project && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Award size={14} /> Stage Capstone Project
                </span>
                <p className="text-xs text-emerald-200/90 font-medium">
                  {stageData.practical_project}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TOPIC DETAIL MODAL */}
      <AnimatePresence>
        {selectedTopic && (
          <TopicDetailModal
            topic={selectedTopic}
            technology={selectedTech}
            stageNumber={stageNumber}
            goalId={goalId}
            goalTitle={stageData.goal_title}
            onClose={() => {
              setSelectedTopic(null);
              setSelectedTech(null);
            }}
            onToggleComplete={(tp) => handleToggleTopic(tp, selectedTech)}
          />
        )}
      </AnimatePresence>

      {/* RESET CONFIRMATION MODAL */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-border rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-400 flex items-center justify-center">
                <RotateCcw size={22} />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-extrabold text-textPrimary">Reset Stage Progress?</h3>
                <p className="text-xs sm:text-sm text-textSecondary leading-relaxed">
                  This will unmark all completed topics in <strong>Stage {stageNumber}</strong> and reset this stage's progress to 0%. Your other stages will not be affected.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowResetModal(false)}
                  disabled={resetting}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-xs font-semibold text-textSecondary cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  onClick={handleConfirmReset}
                  disabled={resetting}
                  className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {resetting ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                  <span>Yes, Reset Progress</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

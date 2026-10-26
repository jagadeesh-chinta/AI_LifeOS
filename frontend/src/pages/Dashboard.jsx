import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  Activity, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  TrendingUp, 
  Quote, 
  ChevronRight, 
  Calendar, 
  Check, 
  ArrowRight, 
  BrainCircuit, 
  Plus, 
  AlertCircle,
  Flame,
  Zap,
  CheckSquare
} from 'lucide-react';
import { 
  getDashboardStats, 
  getDashboardTimeline, 
  getDashboardRecommendations, 
  getLocalDateString 
} from '../services/dashboard.service';
import { updateTask } from '../services/task.service';
import { updateScheduleItem } from '../services/schedule.service';
import { logHabit } from '../services/habit.service';
import { useActiveTime, formatTimeTracked } from '../context/ActiveTimeContext';
import NotificationCenter from '../components/dashboard/NotificationCenter';
import TravelPlannerModal from '../components/dashboard/TravelPlannerModal';
import TimetableModal from '../components/dashboard/TimetableModal';
import BudgetCalculatorModal from '../components/dashboard/BudgetCalculatorModal';
import DailyCommandCenter from '../components/dashboard/DailyCommandCenter';
import InsightCenter from '../components/insights/InsightCenter';
import WhatIfSimulatorModal from '../components/simulator/WhatIfSimulatorModal';
import WeeklyReviewModal from '../components/review/WeeklyReviewModal';
import { Plane, CalendarRange, Wallet, Compass, CalendarDays } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { liveSeconds, setLiveSeconds } = useActiveTime();

  // Tool Modal states
  const [isTravelOpen, setIsTravelOpen] = useState(false);
  const [isTimetableOpen, setIsTimetableOpen] = useState(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isWeeklyReviewOpen, setIsWeeklyReviewOpen] = useState(false);

  // Greeting state
  const [greeting, setGreeting] = useState('');
  
  // Dashboard data states
  const [stats, setStats] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Helper: compute time-based greeting strictly per spec
  const calculateGreeting = useCallback(() => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const totalMinutes = hour * 60 + minute;

    // 5:00 AM (300m) to 11:59 AM (719m): Good morning
    // 12:00 PM (720m) to 4:59 PM (1019m): Good afternoon
    // 5:00 PM (1020m) to 4:59 AM (299m): Good evening
    if (totalMinutes >= 300 && totalMinutes < 720) {
      return 'Good morning';
    } else if (totalMinutes >= 720 && totalMinutes < 1020) {
      return 'Good afternoon';
    } else {
      return 'Good evening';
    }
  }, []);

  // Update greeting and keep it updated dynamically
  useEffect(() => {
    setGreeting(calculateGreeting());
    const greetingInterval = setInterval(() => {
      setGreeting(calculateGreeting());
    }, 60000); // Check every minute

    return () => clearInterval(greetingInterval);
  }, [calculateGreeting]);

  // Load all dynamic dashboard data
  const loadDashboardData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setRefreshing(true);

      const today = getLocalDateString();
      const [statsData, timelineData, recsData] = await Promise.all([
        getDashboardStats(today),
        getDashboardTimeline(today),
        getDashboardRecommendations(today)
      ]);

      setStats(statsData);
      setTimeline(timelineData || []);
      setRecommendations(recsData || []);
      if (statsData && typeof statsData.secondsTracked === 'number') {
        setLiveSeconds(prev => Math.max(prev, statsData.secondsTracked));
      }
    } catch (err) {
      console.error('Failed to load dynamic dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setLiveSeconds]);

  useEffect(() => {
    loadDashboardData(true);
  }, [loadDashboardData]);

  // Timeline item toggle completion
  const handleToggleTimelineItem = async (item) => {
    try {
      if (item.sourceType === 'SCHEDULE_ITEM') {
        await updateScheduleItem(item.scheduleItemId, { completed: !item.completed });
        setTimeline(prev => prev.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i));
      } else if (item.sourceType === 'TASK') {
        const nextStatus = item.completed ? 'TODO' : 'COMPLETED';
        await updateTask(item.taskId, { status: nextStatus });
        setTimeline(prev => prev.map(i => i.id === item.id ? { ...i, completed: !item.completed } : i));
      }
      // Refresh stats to update Upcoming Tasks and Today's Progress immediately
      loadDashboardData(false);
    } catch (err) {
      console.error('Failed to toggle timeline item:', err);
    }
  };

  // Recommendation action handler
  const handleRecommendationAction = async (rec) => {
    if (rec.actionType === 'NAVIGATE') {
      navigate(rec.actionPath || '/tasks');
    } else if (rec.actionType === 'COMPLETE_HABIT') {
      try {
        const today = getLocalDateString();
        await logHabit(rec.targetId, { completed_date: today, completed: true });
        // Remove recommendation and refresh stats
        setRecommendations(prev => prev.filter(r => r.id !== rec.id));
        loadDashboardData(false);
      } catch (err) {
        console.error('Failed to log habit from recommendation:', err);
      }
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.4, ease: 'easeOut' }
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-slate-400 text-sm animate-pulse">Loading your intelligent LifeOS dashboard...</p>
      </div>
    );
  }

  const todayProgress = stats?.todayProgress || {
    percentage: 0,
    tasksCompleted: 0,
    tasksTotal: 0,
    goalsActiveWithProgress: 0,
    goalsActiveTotal: 0
  };

  const progressPercentage = Math.min(Math.max(todayProgress.percentage || 0, 0), 100);
  const strokeDashoffset = 251.2 - (251.2 * progressPercentage) / 100;

  return (
    <motion.div 
      className="w-full max-w-7xl mx-auto space-y-8 pb-16"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 1. Dynamic Time-Based Greeting (Header) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <motion.div variants={itemVariants}>
          <h1 className="text-3xl md:text-4xl font-extrabold text-textPrimary tracking-tight">
            {greeting}, {user?.name || 'there'}
          </h1>
          <p className="text-textSecondary mt-2 text-base md:text-lg flex items-center gap-2">
            <Sparkles size={18} className="text-primary flex-shrink-0" />
            Here's your intelligent plan for today.
          </p>
        </motion.div>

        {/* Upper-Right Header: Ecosystem Tools & Notification Center */}
        <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-2.5 self-end md:self-auto">
          <button
            onClick={() => setIsSimulatorOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-textSecondary hover:text-cyan-400 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Launch What-If Life Simulator"
          >
            <Compass size={14} className="text-cyan-400" />
            <span className="hidden sm:inline">What-If Simulator</span>
          </button>

          <button
            onClick={() => setIsWeeklyReviewOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-textSecondary hover:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Launch Weekly Life Review"
          >
            <CalendarDays size={14} className="text-emerald-400" />
            <span className="hidden sm:inline">Weekly Review</span>
          </button>

          <NotificationCenter />
        </motion.div>
      </div>

      {/* AI Daily Command Center (Executive Briefing, Workload, Priorities, Schedule & Optimize My Day) */}
      <motion.div variants={itemVariants}>
        <DailyCommandCenter
          onNavigate={(tab) => navigate(`/${tab}`)}
          onScheduleUpdated={() => loadDashboardData(false)}
        />
      </motion.div>

      {/* AI LifeOS Insight Engine (Cross-Module Intelligence & Alerts) */}
      <motion.div variants={itemVariants}>
        <InsightCenter
          onActionClick={(insight) => {
            if (insight.actionRoute) navigate(insight.actionRoute);
          }}
        />
      </motion.div>

      {/* 2. Top Area: Daily Motivation (Left) & Today's Progress (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily Motivation Card (Replaces AI Insights, spans 2 columns) */}
        <motion.div 
          variants={itemVariants} 
          className="lg:col-span-2 relative group rounded-3xl p-[1px] overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-accent/20 to-purple-500/20 opacity-40 group-hover:opacity-80 transition-opacity duration-500 rounded-3xl" />
          <div className="relative h-full bg-surface backdrop-blur-xl rounded-3xl p-7 md:p-8 border border-border flex flex-col justify-between overflow-hidden shadow-lg">
            {/* Background decorative quotation mark */}
            <div className="absolute -right-6 -bottom-8 text-textSecondary/[0.05] select-none pointer-events-none">
              <Quote size={200} />
            </div>

            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-textPrimary flex items-center gap-3">
                    <Quote className="text-primary" size={24} /> Daily Motivation
                  </h2>
                  <p className="text-textSecondary text-sm mt-0.5">A little inspiration for your journey.</p>
                </div>
                <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold rounded-full uppercase tracking-wider">
                  Today's Quote
                </span>
              </div>

              {/* Quote Content */}
              <div className="bg-primary/5 p-6 rounded-2xl border-l-4 border-primary my-2 relative z-10">
                <p className="text-textPrimary text-lg md:text-xl font-medium leading-relaxed italic">
                  "{stats?.dailyQuote?.quote || 'Success is the sum of small efforts, repeated day-in and day-out.'}"
                </p>
                {stats?.dailyQuote?.author && (
                  <p className="text-primary font-semibold text-sm mt-4 not-italic flex items-center gap-2">
                    <span className="w-5 h-[1.5px] bg-primary inline-block" />
                    {stats.dailyQuote.author}
                  </p>
                )}
              </div>
            </div>

            {/* Footer label */}
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs tracking-widest text-textSecondary font-semibold uppercase">
              <span>Your Daily Inspiration</span>
              <span className="text-textSecondary normal-case font-normal text-xs">Updated each calendar day</span>
            </div>
          </div>
        </motion.div>

        {/* Today's Progress Widget (Calculated from actual tasks & goals) */}
        <motion.div 
          variants={itemVariants} 
          className="bg-surface backdrop-blur-xl border border-border shadow-xl rounded-3xl p-7 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold text-textPrimary flex items-center gap-2">
                <TrendingUp className="text-emerald-500" size={20} /> Today's Progress
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium border border-emerald-500/20">
                Live
              </span>
            </div>
            <p className="text-slate-400 text-xs">Based on actual tasks due today and active goals.</p>
          </div>
          
          {/* Animated Circular Progress Ring */}
          <div className="flex flex-col items-center justify-center my-4">
            <div className="relative w-36 h-36">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="rgba(255,255,255,0.06)" 
                  strokeWidth="8" 
                  fill="none" 
                />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="url(#progressGradient)" 
                  strokeWidth="8" 
                  fill="none" 
                  strokeDasharray="251.2" 
                  strokeDashoffset={strokeDashoffset} 
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out" 
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#06B6D4" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-white tracking-tight">
                  {progressPercentage}%
                </span>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium mt-0.5">
                  Completed
                </span>
              </div>
            </div>
          </div>

          {/* Progress Details Beneath Ring */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-black/30 p-3.5 rounded-2xl border border-white/5">
            <div className="flex flex-col">
              <span className="text-slate-400">Tasks Due Today</span>
              <strong className="text-white text-sm font-semibold mt-0.5">
                {todayProgress.tasksCompleted}/{todayProgress.tasksTotal}
              </strong>
            </div>
            <div className="flex flex-col border-l border-white/10 pl-3">
              <span className="text-slate-400">Active Goals</span>
              <strong className="text-white text-sm font-semibold mt-0.5">
                {todayProgress.goalsActiveWithProgress}/{todayProgress.goalsActiveTotal}
              </strong>
            </div>
          </div>
        </motion.div>

      </div>

      {/* 3. Secondary Grid: 4 Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { 
            title: 'Upcoming Tasks', 
            value: stats?.upcomingTasksCount ?? 0, 
            icon: CheckCircle2, 
            color: 'text-blue-400', 
            bg: 'bg-blue-400/10',
            border: 'hover:border-blue-500/30',
            onClick: () => navigate('/tasks')
          },
          { 
            title: 'Active Goals', 
            value: stats?.activeGoalsCount ?? 0, 
            icon: Target, 
            color: 'text-purple-400', 
            bg: 'bg-purple-400/10',
            border: 'hover:border-purple-500/30',
            onClick: () => navigate('/goals')
          },
          { 
            title: 'Current Streak', 
            value: `${stats?.currentStreak ?? 0} ${stats?.currentStreak === 1 ? 'Day' : 'Days'}`, 
            icon: Flame, 
            color: 'text-orange-400', 
            bg: 'bg-orange-400/10',
            border: 'hover:border-orange-500/30',
            onClick: () => navigate('/habits')
          },
          { 
            title: 'Time Tracked', 
            value: formatTimeTracked(liveSeconds), 
            icon: Clock, 
            color: 'text-emerald-400', 
            bg: 'bg-emerald-400/10',
            border: 'hover:border-emerald-500/30',
            onClick: () => {}
          },
        ].map((stat, idx) => (
          <motion.div 
            key={idx} 
            variants={itemVariants}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
            onClick={stat.onClick}
            className={`bg-surface backdrop-blur-xl border border-border shadow-md rounded-2xl p-5 flex items-center gap-4 group cursor-pointer hover:bg-surface-elevated hover:shadow-lg transition-all duration-200 ${stat.border}`}
          >
            <div className={`w-13 h-13 p-3 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color} group-hover:scale-105 transition-transform duration-200`}>
              <stat.icon size={26} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-textSecondary text-xs font-medium mb-1 truncate">{stat.title}</p>
              <h3 className="text-2xl font-bold text-textPrimary tracking-tight truncate">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 4. Scrollable Section: Your Day at a Glance (Timeline) */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-2xl font-bold text-textPrimary flex items-center gap-2.5">
              <Calendar className="text-primary" size={24} />
              Your Day at a Glance
            </h2>
            <p className="text-textSecondary text-sm mt-0.5">See what's ahead and make today count.</p>
          </div>
          <button 
            onClick={() => navigate('/schedule')}
            className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
          >
            Open AI Planner <ChevronRight size={14} />
          </button>
        </div>

        {timeline.length === 0 ? (
          /* Empty State strictly per specification */
          <div className="bg-surface border border-border rounded-3xl p-8 md:p-10 text-center flex flex-col items-center justify-center backdrop-blur-xl shadow-md">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
              <BrainCircuit size={32} />
            </div>
            <h3 className="text-xl font-bold text-textPrimary mb-2">Your day is waiting to be planned.</h3>
            <p className="text-textSecondary text-sm max-w-md mb-6 leading-relaxed">
              Add a task, schedule an activity, or ask AI Planner to organize your day.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button 
                onClick={() => navigate('/schedule')}
                className="btn-primary flex items-center gap-2 px-5 py-2.5"
              >
                <Sparkles size={16} />
                Ask AI Planner
              </button>
              <button 
                onClick={() => navigate('/tasks')}
                className="btn-secondary px-5 py-2.5 flex items-center gap-2 font-medium"
              >
                <Plus size={16} />
                Add a Task
              </button>
            </div>
          </div>
        ) : (
          /* Real Timeline items */
          <div className="bg-surface border border-border rounded-3xl p-6 backdrop-blur-xl space-y-3 shadow-md">
            {timeline.map((item) => (
              <div 
                key={item.id}
                className={`p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4 ${
                  item.completed 
                    ? 'bg-surface-elevated/50 border-border opacity-60' 
                    : 'bg-surface-elevated/40 border-border hover:border-primary/40 hover:bg-surface-elevated'
                }`}
              >
                {/* Completion Toggle */}
                <button
                  onClick={() => handleToggleTimelineItem(item)}
                  className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors flex-shrink-0 ${
                    item.completed
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-white/20 hover:border-primary text-transparent'
                  }`}
                >
                  <Check size={14} className={item.completed ? 'opacity-100' : 'opacity-0'} />
                </button>

                {/* Time badge */}
                <div className="min-w-[85px] text-xs font-semibold text-slate-300">
                  {item.startTime}
                </div>

                {/* Title & Description */}
                <div className="flex-1 min-w-0">
                  <h4 className={`text-base font-semibold truncate ${item.completed ? 'line-through text-slate-400' : 'text-white'}`}>
                    {item.title}
                  </h4>
                  {item.description && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">{item.description}</p>
                  )}
                </div>

                {/* Duration */}
                {item.duration && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg">
                    <Clock size={12} /> {item.duration}
                  </span>
                )}

                {/* Category badge */}
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                  item.category === 'HABIT' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                  item.category === 'EVENT' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                  item.category === 'FOCUS' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-primary/10 text-primary border border-primary/20'
                }`}>
                  {item.category}
                </span>

                {/* Priority */}
                {item.priority && item.priority !== 'MEDIUM' && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase hidden md:inline-block ${
                    item.priority === 'URGENT' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    item.priority === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                    'bg-slate-500/10 text-slate-400'
                  }`}>
                    {item.priority}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* 5. Scrollable Section: Focus for Today (Recommendations) */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Zap className="text-amber-500" size={24} />
            Focus for Today
          </h2>
          <p className="text-textSecondary text-sm mt-0.5">Choose what deserves your attention first.</p>
        </div>

        {recommendations.length === 0 ? (
          /* Empty State strictly per specification */
          <div className="bg-surface border border-border rounded-3xl p-8 md:p-10 text-center flex flex-col items-center justify-center backdrop-blur-xl shadow-md">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4">
              <CheckSquare size={32} />
            </div>
            <h3 className="text-xl font-bold text-textPrimary mb-2">Your next step starts here.</h3>
            <p className="text-textSecondary text-sm max-w-md mb-6 leading-relaxed">
              Create your first task or goal to receive personalized focus recommendations.
            </p>
            <button 
              onClick={() => navigate('/tasks')}
              className="btn-primary flex items-center gap-2 px-6 py-2.5"
            >
              <Plus size={18} />
              Create Your First Task
            </button>
          </div>
        ) : (
          /* Up to 3 real actionable recommendations */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="bg-surface border border-border hover:border-primary/40 rounded-3xl p-6 flex flex-col justify-between backdrop-blur-xl group transition-all duration-200 shadow-md hover:shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      rec.category === 'HABIT' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' :
                      rec.category === 'GOAL' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                      'bg-primary/10 text-primary border border-primary/20'
                    }`}>
                      {rec.category}
                    </span>
                    {rec.priority && (
                      <span className="text-[10px] text-textSecondary uppercase font-semibold">
                        {rec.priority}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-textPrimary mb-2 group-hover:text-primary transition-colors line-clamp-1">
                    {rec.title}
                  </h3>
                  <p className="text-textSecondary text-xs leading-relaxed line-clamp-3">
                    {rec.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-border flex justify-end">
                  <button
                    onClick={() => handleRecommendationAction(rec)}
                    className="flex items-center gap-2 text-xs font-semibold text-textPrimary bg-surface-elevated hover:bg-primary hover:text-white border border-border px-4 py-2 rounded-xl transition-all"
                  >
                    {rec.actionLabel}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* 6. Section: Weekly Consistency */}
      {stats?.weeklyConsistency && (
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-textPrimary flex items-center gap-2.5">
                <Activity className="text-emerald-500" size={24} />
                Weekly Consistency
              </h2>
              <p className="text-textSecondary text-sm mt-0.5">Your habit and task momentum over the current week.</p>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-3xl p-6 backdrop-blur-xl shadow-md">
            <div className="grid grid-cols-7 gap-2 md:gap-4">
              {stats.weeklyConsistency.map((day) => {
                const hasActivity = day.totalCompleted > 0;
                return (
                  <div 
                    key={day.date}
                    className={`flex flex-col items-center justify-between p-3 md:p-4 rounded-2xl border transition-all text-center ${
                      day.isToday 
                        ? 'bg-primary/10 border-primary/40 shadow-lg shadow-primary/10' 
                        : hasActivity 
                          ? 'bg-surface-elevated/70 border-border' 
                          : 'bg-surface-elevated/30 border-border'
                    }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">
                      {day.dayName}
                    </span>
                    <span className={`text-lg md:text-xl font-extrabold ${day.isToday ? 'text-primary' : 'text-textPrimary'}`}>
                      {day.dayNumber}
                    </span>

                    {/* Completion Ring / Badge */}
                    <div className="my-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        hasActivity
                          ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                          : 'bg-surface-elevated text-textSecondary'
                      }`}>
                        {day.totalCompleted}
                      </div>
                    </div>

                    <div className="flex flex-col gap-0.5 text-[10px] text-slate-400">
                      <span>{day.tasksCompleted} tasks</span>
                      <span>{day.habitsCompleted} habits</span>
                    </div>

                    {day.isToday && (
                      <span className="mt-2 text-[9px] font-bold text-primary uppercase tracking-widest">
                        Today
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* 7. Section: Three New Interactive Feature Cards (Travel, Timetable, Budget) */}
      <motion.div variants={itemVariants} className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-textPrimary flex items-center gap-2.5">
              <Sparkles className="text-cyan-400" size={24} />
              LifeOS Planning & Productivity Suites
            </h2>
            <p className="text-textSecondary text-sm mt-0.5">
              Interactive travel planning, recurring weekly scheduling, and financial budget tracking.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Travel Planner */}
          <div className="glass-card p-6 rounded-3xl border border-border/80 hover:border-cyan-500/50 transition-all flex flex-col justify-between group shadow-md hover:shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none"></div>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center mb-4 border border-cyan-500/30 group-hover:scale-110 transition-transform">
                <Plane size={24} />
              </div>
              <h3 className="text-lg font-bold text-textPrimary mb-1.5">
                Travel & Itinerary Planner
              </h3>
              <p className="text-xs text-textSecondary leading-relaxed">
                Plan domestic and global trips with custom day-by-day itineraries, flight notes, and estimated travel budgets.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                Trip Management
              </span>
              <button
                onClick={() => setIsTravelOpen(true)}
                className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1 shadow-md shadow-cyan-500/20"
              >
                Open Planner <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Card 2: Timetable */}
          <div className="glass-card p-6 rounded-3xl border border-border/80 hover:border-purple-500/50 transition-all flex flex-col justify-between group shadow-md hover:shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all pointer-events-none"></div>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-4 border border-purple-500/30 group-hover:scale-110 transition-transform">
                <CalendarRange size={24} />
              </div>
              <h3 className="text-lg font-bold text-textPrimary mb-1.5">
                Timetable Builder
              </h3>
              <p className="text-xs text-textSecondary leading-relaxed">
                Design personal daily routines, AI-driven study schedules, and conflict-free faculty teaching timetables with PDF export.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">
                Conflict-Free Blocks
              </span>
              <button
                onClick={() => navigate('/timetable')}
                className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1 shadow-md shadow-purple-500/20"
              >
                Open Timetable <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Card 3: Budget Calculator */}
          <div className="glass-card p-6 rounded-3xl border border-border/80 hover:border-emerald-500/50 transition-all flex flex-col justify-between group shadow-md hover:shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none"></div>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/30 group-hover:scale-110 transition-transform">
                <Wallet size={24} />
              </div>
              <h3 className="text-lg font-bold text-textPrimary mb-1.5">
                Income & Budget Calculator
              </h3>
              <p className="text-xs text-textSecondary leading-relaxed">
                Log recurring revenue streams, category living expenses, dynamic savings rate %, and net cash velocity.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                Cash Flow Intelligence
              </span>
              <button
                onClick={() => setIsBudgetOpen(true)}
                className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1 shadow-md shadow-emerald-500/20"
              >
                Open Calculator <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modals for the 3 Feature Suites */}
      <TravelPlannerModal
        isOpen={isTravelOpen}
        onClose={() => setIsTravelOpen(false)}
      />

      <TimetableModal
        isOpen={isTimetableOpen}
        onClose={() => setIsTimetableOpen(false)}
      />

      <BudgetCalculatorModal
        isOpen={isBudgetOpen}
        onClose={() => setIsBudgetOpen(false)}
      />

      {/* Feature Five: What-If Life Simulator Modal */}
      <WhatIfSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onScenarioApplied={() => loadDashboardData(false)}
      />

      {/* Feature Six: Weekly Life Review Modal */}
      <WeeklyReviewModal
        isOpen={isWeeklyReviewOpen}
        onClose={() => setIsWeeklyReviewOpen(false)}
        onScheduleUpdated={() => loadDashboardData(false)}
      />

    </motion.div>
  );
};

export default Dashboard;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGoals, createGoal, updateGoal, deleteGoal } from '../services/goal.service';
import {
  Plus, Target, Trash2, Calendar as CalendarIcon, TrendingUp,
  Compass, Clock, Sparkles, AlertCircle, CheckCircle2, ChevronRight,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Goals = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Enhanced goal form state
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    duration_value: 6,
    duration_unit: 'Months',
    custom_duration: '',
    target_date: '',
    priority: 'HIGH'
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const data = await getGoals();
      setGoals(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!newGoal.title.trim()) {
      setFormError('Goal title is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: newGoal.title.trim(),
        description: newGoal.description.trim() || undefined,
        duration_value: parseInt(newGoal.duration_value, 10) || 6,
        duration_unit: newGoal.duration_unit || 'Months',
        custom_duration: newGoal.custom_duration.trim() || undefined,
        target_date: newGoal.target_date || undefined,
        priority: newGoal.priority || 'MEDIUM',
        progress: 0,
        status: 'IN_PROGRESS'
      };

      const created = await createGoal(payload);
      setGoals([created, ...goals]);
      setNewGoal({
        title: '',
        description: '',
        duration_value: 6,
        duration_unit: 'Months',
        custom_duration: '',
        target_date: '',
        priority: 'HIGH'
      });
      setShowForm(false);
    } catch (error) {
      setFormError(error.response?.data?.message || error.message || 'Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProgress = async (goal, newProgress) => {
    try {
      const updated = await updateGoal(goal.id, { progress: newProgress });
      setGoals(goals.map((g) => (g.id === updated.id ? updated : g)));
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    try {
      await deleteGoal(id);
      setGoals(goals.filter((g) => g.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpenGuidance = (goalId) => {
    window.open(`/career-guidance?goalId=${goalId}`, '_blank');
  };

  if (loading) {
    return <div className="text-center text-textSecondary mt-20">Loading goals...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto pb-16 px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-textPrimary flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-500/30">
              <Target className="text-cyan-400" size={28} />
            </div>
            Strategic Goals & Career Guidance
          </h1>
          <p className="text-textSecondary mt-1">
            Define objectives with realistic timeframes and generate full AI career guidance roadmaps.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center flex-wrap sm:flex-nowrap">
          <button
            onClick={() => navigate('/connections')}
            className="px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 bg-surface/80 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 hover:text-white hover:bg-cyan-500/10 transition-all shadow-md shadow-cyan-500/10 group cursor-pointer"
            title="Discover users enrolled in goals and encrypted messaging"
          >
            <Users size={18} className="text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Connections</span>
          </button>

          <button
            onClick={() => {
              setShowForm(!showForm);
              setFormError('');
            }}
            className="btn-primary text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/20 whitespace-nowrap"
          >
            <Plus size={18} /> New Goal
          </button>
        </div>
      </div>

      {/* New Goal Modal / Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreate}
            className="mb-8 overflow-hidden"
          >
            <div className="glass-card p-6 space-y-4 border border-cyan-500/30 shadow-xl">
              <div className="flex justify-between items-center border-b border-border/60 pb-3">
                <h3 className="text-base font-bold text-textPrimary flex items-center gap-2">
                  <Sparkles size={16} className="text-cyan-400" />
                  Define New Strategic Goal
                </h3>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                  Goal Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Become a Full Stack Developer, Learn Machine Learning, Master Flutter App Development"
                  className="input-field text-sm font-semibold"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Duration Value */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                    Goal Duration Value *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    required
                    className="input-field text-sm"
                    value={newGoal.duration_value}
                    onChange={(e) => setNewGoal({ ...newGoal, duration_value: e.target.value })}
                  />
                </div>

                {/* Duration Unit */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                    Duration Unit *
                  </label>
                  <select
                    className="input-field text-sm cursor-pointer"
                    value={newGoal.duration_unit}
                    onChange={(e) => setNewGoal({ ...newGoal, duration_unit: e.target.value })}
                  >
                    <option value="Months">Months</option>
                    <option value="Years">Years</option>
                    <option value="Weeks">Weeks</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                    Priority
                  </label>
                  <select
                    className="input-field text-sm cursor-pointer"
                    value={newGoal.priority}
                    onChange={(e) => setNewGoal({ ...newGoal, priority: e.target.value })}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Target Date */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                    Target Completion Date (Optional)
                  </label>
                  <input
                    type="date"
                    className="input-field text-sm cursor-pointer"
                    value={newGoal.target_date}
                    onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                  />
                </div>

                {/* Short Description */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                    Context / Description (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Switch careers into engineering and publish a SaaS application"
                    className="input-field text-sm"
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs shadow-md shadow-cyan-500/20"
                >
                  {submitting ? 'Creating Goal...' : 'Create Goal & Setup Roadmap'}
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Goal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.length === 0 && !showForm && (
          <div className="col-span-full text-center py-16 glass-card rounded-2xl">
            <Target className="mx-auto text-cyan-400/40 mb-3" size={44} />
            <h3 className="text-base font-bold text-textPrimary">No goals set yet</h3>
            <p className="text-xs text-textSecondary mt-1 max-w-sm mx-auto">
              Define your first career or learning goal to unlock AI-powered roadmaps, milestone tracking, and daily scheduling.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 btn-primary text-xs inline-flex items-center gap-1.5"
            >
              <Plus size={15} /> Define First Goal
            </button>
          </div>
        )}

        {goals.map((goal) => {
          const durationLabel = goal.duration_value
            ? `${goal.duration_value} ${goal.duration_unit || 'Months'}`
            : goal.custom_duration || '6 Months';

          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-6 rounded-2xl border border-border/70 hover:border-cyan-500/40 transition-all flex flex-col justify-between shadow-sm hover:shadow-md relative group"
            >
              {/* Card Header */}
              <div>
                <div className="flex justify-between items-start mb-3 gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                        <Clock size={11} /> {durationLabel}
                      </span>
                      {goal.priority && (
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${
                            goal.priority === 'URGENT'
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              : goal.priority === 'HIGH'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-surface text-textSecondary border-border'
                          }`}
                        >
                          {goal.priority}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-textPrimary leading-snug">
                      {goal.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="text-textSecondary hover:text-rose-400 p-1.5 rounded-lg hover:bg-surface-elevated transition-colors shrink-0"
                    title="Delete Goal"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {goal.description && (
                  <p className="text-textSecondary text-xs mb-4 line-clamp-2 leading-relaxed">
                    {goal.description}
                  </p>
                )}
              </div>

              {/* Progress Slider */}
              <div className="mt-4 pt-3 border-t border-border/50">
                <div className="flex justify-between text-xs mb-1.5 text-textSecondary font-medium">
                  <span className="flex items-center gap-1">
                    <TrendingUp size={13} className="text-cyan-400" /> Progress
                  </span>
                  <span className="font-bold text-textPrimary">{goal.progress || 0}%</span>
                </div>
                <div className="h-2 w-full bg-surface-elevated border border-border/60 rounded-full overflow-hidden mb-4 relative group/slider cursor-pointer">
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-purple-600 transition-all duration-300 rounded-full"
                    style={{ width: `${goal.progress || 0}%` }}
                  ></div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={goal.progress || 0}
                    onChange={(e) =>
                      handleUpdateProgress(goal, parseInt(e.target.value, 10))
                    }
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  />
                </div>

                {/* Footer Actions: Target Date & Career Guidance Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  {goal.target_date ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-textSecondary">
                      <CalendarIcon size={13} className="text-purple-400 shrink-0" />
                      Target: {new Date(goal.target_date).toLocaleDateString()}
                    </div>
                  ) : (
                    <div className="text-[11px] text-textSecondary/60 italic">
                      Continuous objective
                    </div>
                  )}

                  {/* Career Guidance Button */}
                  <button
                    onClick={() => handleOpenGuidance(goal.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 via-indigo-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 text-cyan-300 hover:text-cyan-200 border border-cyan-500/40 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <Compass size={14} className="text-cyan-400" />
                    Career Guidance
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Goals;

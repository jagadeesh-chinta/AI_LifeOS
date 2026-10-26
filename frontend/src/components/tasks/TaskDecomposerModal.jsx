import React, { useState, useEffect } from 'react';
import {
  Sparkles, CheckCircle2, Clock, Trash2, Edit2, Plus, RefreshCw,
  Calendar, ArrowRight, ShieldCheck, CheckSquare, Layers, X
} from 'lucide-react';
import {
  decomposeTask,
  saveSubtasks,
  scheduleSubtasksToPlanner
} from '../../services/ecosystem.service';

const TaskDecomposerModal = ({ isOpen, onClose, task, onSubtasksCreated }) => {
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);

  // New subtask manual entry
  const [showAddManual, setShowAddManual] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualMinutes, setManualMinutes] = useState(30);

  useEffect(() => {
    if (isOpen && task) {
      handleDecompose();
    }
  }, [isOpen, task]);

  const handleDecompose = async () => {
    setLoading(true);
    setSuccessMsg('');
    try {
      const data = await decomposeTask(task?.id, task?.title);
      setSubtasks(data.subtasks || []);
    } catch (err) {
      alert('Failed to decompose task: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSubtask = (index) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleAddManualSubtask = () => {
    if (!manualTitle.trim()) return;
    setSubtasks([
      ...subtasks,
      {
        title: manualTitle.trim(),
        description: 'Custom added milestone',
        estimated_minutes: Number(manualMinutes) || 30,
        priority: 'Medium',
        suggested_order: subtasks.length + 1,
        dependencies: [],
        completion_criteria: 'Completed verified.'
      }
    ]);
    setManualTitle('');
    setManualMinutes(30);
    setShowAddManual(false);
  };

  const handleSaveSubtasks = async () => {
    if (!task?.id || subtasks.length === 0) return;
    setSaving(true);
    try {
      await saveSubtasks(task.id, subtasks);
      setSuccessMsg('✓ Subtasks approved and saved to your task!');
      setTimeout(() => {
        if (onSubtasksCreated) onSubtasksCreated();
        onClose();
      }, 1000);
    } catch (err) {
      alert('Failed to save subtasks: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleScheduleToPlanner = async () => {
    if (!task?.id || subtasks.length === 0) return;
    setScheduling(true);
    try {
      // First save if not yet saved
      const saveRes = await saveSubtasks(task.id, subtasks);
      const subtaskIds = saveRes.subtasks.map(s => s.id);
      await scheduleSubtasksToPlanner(task.id, subtaskIds);
      setSuccessMsg('✓ Subtasks scheduled to AI Planner timetable!');
      setTimeout(() => {
        if (onSubtasksCreated) onSubtasksCreated();
        onClose();
      }, 1200);
    } catch (err) {
      alert('Failed to schedule subtasks: ' + err.message);
    } finally {
      setScheduling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="glass-card max-w-2xl w-full p-6 sm:p-7 rounded-3xl border border-purple-500/40 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-textPrimary">
                Break Down with AI
              </h3>
              <p className="text-xs text-textSecondary line-clamp-1">
                Task: <strong className="text-textPrimary">{task?.title || 'Selected Task'}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-textSecondary hover:text-textPrimary p-1">
            <X size={20} />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={16} /> {successMsg}
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center text-xs text-textSecondary space-y-3">
              <RefreshCw size={24} className="animate-spin text-purple-400 mx-auto" />
              <p>Analyzing requirements and decomposing into actionable milestones...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-textSecondary">
                <span>Proposed Actionable Subtasks ({subtasks.length}):</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDecompose}
                    className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 text-[11px]"
                  >
                    <RefreshCw size={11} /> Regenerate
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => setShowAddManual(true)}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 text-[11px]"
                  >
                    <Plus size={11} /> Add Custom
                  </button>
                </div>
              </div>

              {/* Subtasks List */}
              <div className="space-y-2.5">
                {subtasks.map((st, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-surface-elevated/70 border border-border/70 hover:border-purple-500/40 transition-all space-y-1.5 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-purple-500/15 text-purple-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-purple-500/30">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-textPrimary leading-snug">
                            {st.title}
                          </div>
                          {st.description && (
                            <p className="text-[11px] text-textSecondary mt-0.5">
                              {st.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveSubtask(idx)}
                        className="text-textSecondary hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove Subtask"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 pt-1 text-[10px] text-textSecondary pl-7">
                      <span className="flex items-center gap-1 text-cyan-400 font-medium">
                        <Clock size={11} /> {st.estimated_minutes} mins
                      </span>
                      <span>•</span>
                      <span className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                        st.priority === 'High' ? 'text-red-400 bg-red-500/10' : 'text-amber-400 bg-amber-500/10'
                      }`}>
                        {st.priority}
                      </span>
                      {st.dependencies?.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-textSecondary/80">
                            Requires: {st.dependencies.join(', ')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Manual Add Card */}
              {showAddManual && (
                <div className="p-3.5 rounded-2xl bg-surface-elevated border border-cyan-500/40 space-y-2.5 animate-fadeIn">
                  <div className="text-xs font-bold text-cyan-400">Add Custom Subtask</div>
                  <input
                    type="text"
                    placeholder="Milestone description..."
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-surface-elevated border border-border text-xs text-textPrimary focus:outline-none"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-textSecondary">Est. Minutes:</span>
                      <input
                        type="number"
                        min="10"
                        max="180"
                        value={manualMinutes}
                        onChange={(e) => setManualMinutes(e.target.value)}
                        className="w-20 px-2 py-1 rounded-lg bg-surface-elevated border border-border text-xs text-textPrimary font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAddManual(false)}
                        className="px-3 py-1 text-xs text-textSecondary"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddManualSubtask}
                        className="btn-primary text-xs px-3.5 py-1 shadow-md shadow-cyan-500/20"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-xs text-textSecondary hover:text-textPrimary"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleScheduleToPlanner}
              disabled={scheduling || saving || subtasks.length === 0}
              className="px-4 py-2 rounded-xl bg-purple-500/15 border border-purple-500/40 text-purple-300 hover:bg-purple-500/25 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Calendar size={13} />
              <span>Send to AI Planner</span>
            </button>

            <button
              onClick={handleSaveSubtasks}
              disabled={saving || scheduling || subtasks.length === 0}
              className="btn-primary text-xs px-5 py-2 shadow-lg shadow-cyan-500/20 font-bold flex items-center gap-1.5"
            >
              {saving ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              <span>Approve & Save Subtasks</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDecomposerModal;

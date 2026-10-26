import React, { useState, useEffect } from 'react';
import {
  FolderHeart, Calendar, Clock, Sparkles, Users, Download,
  Copy, Trash2, Edit3, ArrowRight, AlertTriangle, RefreshCw
} from 'lucide-react';
import { getSavedTimetables, duplicateSavedTimetable, deleteSavedTimetable } from '../../services/timetable.service';
import { exportDailyLifePdf, exportAIStudyPdf, exportFacultyPdf } from '../../utils/timetablePdf';

const SavedTimetablesList = ({ onOpenTimetable, onNewTimetable }) => {
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [deletingId, setDeletingId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    loadTimetables();
  }, [filterType]);

  const loadTimetables = async () => {
    setLoading(true);
    try {
      const type = filterType === 'ALL' ? null : filterType;
      const data = await getSavedTimetables(type);
      setTimetables(data || []);
    } catch (err) {
      console.error('Failed to load saved timetables:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (id, e) => {
    e.stopPropagation();
    setActionLoadingId(id);
    try {
      await duplicateSavedTimetable(id);
      loadTimetables();
    } catch (err) {
      alert('Failed to duplicate timetable: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    try {
      await deleteSavedTimetable(deletingId);
      setTimetables(timetables.filter((t) => t.id !== deletingId));
      setDeletingId(null);
    } catch (err) {
      alert('Failed to delete timetable: ' + err.message);
    }
  };

  const handleDownloadPdf = (t, e) => {
    e.stopPropagation();
    if (t.type === 'daily') {
      exportDailyLifePdf(t);
    } else if (t.type === 'ai_study') {
      exportAIStudyPdf(t);
    } else if (t.type === 'faculty') {
      exportFacultyPdf(t);
    }
  };

  const getTypeBadge = (type) => {
    if (type === 'daily') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
          <Clock size={10} /> Daily Routine
        </span>
      );
    }
    if (type === 'ai_study') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center gap-1">
          <Sparkles size={10} /> AI Study
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
        <Users size={10} /> Faculty Timetable
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/60">
        <div>
          <h3 className="text-base font-bold text-textPrimary flex items-center gap-2">
            <FolderHeart size={18} className="text-purple-400" /> Saved Timetables Archive
          </h3>
          <p className="text-xs text-textSecondary">
            Manage your personal daily routines, AI study plans, and faculty schedules.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex p-1 bg-surface-elevated rounded-xl border border-border text-xs">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              filterType === 'ALL' ? 'bg-purple-500 text-white font-bold' : 'text-textSecondary hover:text-textPrimary'
            }`}
          >
            All Modes
          </button>
          <button
            onClick={() => setFilterType('daily')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              filterType === 'daily' ? 'bg-cyan-500 text-white font-bold' : 'text-textSecondary hover:text-textPrimary'
            }`}
          >
            Daily Life
          </button>
          <button
            onClick={() => setFilterType('ai_study')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              filterType === 'ai_study' ? 'bg-purple-500 text-white font-bold' : 'text-textSecondary hover:text-textPrimary'
            }`}
          >
            AI Study
          </button>
          <button
            onClick={() => setFilterType('faculty')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              filterType === 'faculty' ? 'bg-emerald-500 text-white font-bold' : 'text-textSecondary hover:text-textPrimary'
            }`}
          >
            Faculty
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-xs text-textSecondary gap-2">
          <RefreshCw size={16} className="animate-spin text-purple-400" /> Loading saved timetables...
        </div>
      ) : timetables.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl border border-dashed border-border text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
            <Calendar size={24} />
          </div>
          <h4 className="text-sm font-bold text-textPrimary">No Saved Timetables Yet</h4>
          <p className="text-xs text-textSecondary max-w-sm mx-auto">
            Create your first timetable using Daily Life routines, AI Study generation, or Faculty Scheduling.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <button
              onClick={() => onNewTimetable('daily')}
              className="btn-primary text-xs px-3.5 py-1.5 shadow-md shadow-cyan-500/20"
            >
              Start Daily Routine
            </button>
            <button
              onClick={() => onNewTimetable('ai_study')}
              className="px-3.5 py-1.5 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-semibold hover:bg-purple-500/25"
            >
              Start AI Study
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {timetables.map((t) => {
            const dateStr = new Date(t.updated_at || t.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <div
                key={t.id}
                onClick={() => onOpenTimetable(t)}
                className="glass-card p-5 rounded-2xl border border-border/80 hover:border-purple-500/50 transition-all flex flex-col justify-between group shadow-sm hover:shadow-xl cursor-pointer relative"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {getTypeBadge(t.type)}
                    <span className="text-[10px] text-textSecondary">{dateStr}</span>
                  </div>

                  <h4 className="text-sm font-bold text-textPrimary group-hover:text-purple-300 transition-colors line-clamp-1 mb-1">
                    {t.title}
                  </h4>
                  {t.description && (
                    <p className="text-xs text-textSecondary line-clamp-2 leading-relaxed">
                      {t.description}
                    </p>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleDuplicate(t.id, e)}
                      title="Duplicate Timetable"
                      disabled={actionLoadingId === t.id}
                      className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-elevated/80 text-textSecondary hover:text-textPrimary transition-colors"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      onClick={(e) => handleDownloadPdf(t, e)}
                      title="Download PDF"
                      className="p-1.5 rounded-lg bg-surface-elevated hover:bg-purple-500/20 text-textSecondary hover:text-purple-300 transition-colors"
                    >
                      <Download size={13} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(t.id);
                      }}
                      title="Delete Timetable"
                      className="p-1.5 rounded-lg bg-surface-elevated hover:bg-red-500/20 text-textSecondary hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <span className="text-xs font-semibold text-purple-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Open <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card max-w-sm w-full p-6 rounded-3xl border border-red-500/40 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2 rounded-xl bg-red-500/10">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-sm font-bold text-textPrimary">Delete Timetable?</h3>
            </div>
            <p className="text-xs text-textSecondary leading-relaxed">
              Are you sure you want to permanently delete this timetable? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
              <button
                onClick={() => setDeletingId(null)}
                className="px-3.5 py-1.5 rounded-xl border border-border text-xs text-textSecondary hover:text-textPrimary"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs shadow-md shadow-red-500/20"
              >
                Delete Timetable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedTimetablesList;

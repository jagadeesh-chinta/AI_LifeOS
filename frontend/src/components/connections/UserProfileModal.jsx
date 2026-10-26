import React from 'react';
import {
  X, Target, Clock, Calendar, Flame, Globe, Shield,
  CheckCircle2, UserPlus, MessageSquare, Check, Hourglass
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const UserProfileModal = ({
  user,
  onClose,
  onConnect,
  onOpenChat,
  onAccept,
  onReject,
  actionLoading
}) => {
  if (!user) return null;

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatDuration = (goal) => {
    if (goal.custom_duration) return goal.custom_duration;
    if (goal.duration_value) return `${goal.duration_value} ${goal.duration_unit || 'Months'}`;
    return null;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-surface/95 border border-border/80 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header Banner */}
          <div className="relative p-6 bg-gradient-to-r from-cyan-950/60 via-purple-950/50 to-surface border-b border-border/50">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-full bg-surface/80 hover:bg-surface border border-border/70 text-textSecondary hover:text-textPrimary transition-all cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-18 h-18 rounded-2xl object-cover border-2 border-cyan-500/40 shadow-lg shadow-cyan-500/10"
                />
              ) : (
                <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-cyan-500/20">
                  {getInitials(user.name)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-textPrimary truncate">{user.name}</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Goal Enrolled
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-textSecondary">
                  {user.timezone && (
                    <span className="flex items-center gap-1">
                      <Globe size={13} className="text-cyan-400" />
                      {user.timezone}
                    </span>
                  )}
                  {user.current_streak > 0 && (
                    <span className="flex items-center gap-1 text-amber-400">
                      <Flame size={13} />
                      {user.current_streak} Day Streak
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Target size={13} className="text-purple-400" />
                    {user.goals_count || user.all_goals?.length || 1} Goals
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Body: All Goals List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-textSecondary flex items-center gap-2">
                <Target size={16} className="text-cyan-400" />
                Enrolled Goals ({user.all_goals?.length || 0})
              </h3>
              <span className="text-[11px] text-textSecondary flex items-center gap-1">
                <Shield size={12} className="text-cyan-400" /> Privacy Protected
              </span>
            </div>

            {(!user.all_goals || user.all_goals.length === 0) ? (
              <p className="text-xs text-textSecondary py-4">No detailed goals found.</p>
            ) : (
              <div className="space-y-3">
                {user.all_goals.map((goal, idx) => (
                  <div
                    key={goal.id || idx}
                    className="p-4 rounded-2xl bg-surface-elevated/40 border border-border/70 hover:border-cyan-500/30 transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-textPrimary">{goal.title}</h4>
                        {goal.description && (
                          <p className="text-xs text-textSecondary mt-0.5 leading-relaxed line-clamp-2">
                            {goal.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                          goal.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : goal.status === 'IN_PROGRESS'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-border/60 text-textSecondary'
                        }`}
                      >
                        {goal.status?.replace('_', ' ') || 'ACTIVE'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-textSecondary pt-1">
                      {formatDuration(goal) && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-cyan-400" />
                          Duration: {formatDuration(goal)}
                        </span>
                      )}
                      {goal.target_date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-purple-400" />
                          Target: {new Date(goal.target_date).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="pt-1">
                      <div className="flex justify-between text-[10px] text-textSecondary mb-1">
                        <span>Progress</span>
                        <span className="font-semibold text-cyan-400">{goal.progress || 0}%</span>
                      </div>
                      <div className="w-full bg-border/50 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-cyan-500 to-purple-600 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, goal.progress || 0))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-6 bg-surface border-t border-border/60 flex items-center justify-between gap-3">
            <span className="text-[11px] text-textSecondary/70 hidden sm:inline">
              AI LifeOS Peer Collaboration
            </span>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-textSecondary hover:text-textPrimary bg-surface-elevated/40 hover:bg-surface-elevated transition-all cursor-pointer"
              >
                Close
              </button>

              {user.connection_status === 'CONNECTED' ? (
                <button
                  onClick={() => {
                    onClose();
                    onOpenChat(user.id);
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <MessageSquare size={14} /> Open Chat
                </button>
              ) : user.connection_status === 'PENDING_OUTGOING' ? (
                <button
                  disabled
                  className="px-5 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 flex items-center gap-1.5 cursor-not-allowed opacity-80"
                >
                  <Hourglass size={14} /> Request Pending
                </button>
              ) : user.connection_status === 'PENDING_INCOMING' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onAccept(user.connection_id)}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
                  >
                    <Check size={14} /> Accept Request
                  </button>
                  <button
                    onClick={() => onReject(user.connection_id)}
                    disabled={actionLoading}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onConnect(user.id)}
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <UserPlus size={14} /> Connect
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UserProfileModal;

import React from 'react';
import {
  UserPlus, Check, X, Clock, Target, Calendar,
  Sparkles, Globe, Flame, AlertCircle, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { motion } from 'framer-motion';

const RequestsTab = ({
  incoming = [],
  outgoing = [],
  loading,
  onAccept,
  onReject,
  onCancel,
  onViewProfile,
  actionLoading
}) => {
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
    if (!goal) return null;
    if (goal.custom_duration) return goal.custom_duration;
    if (goal.duration_value) return `${goal.duration_value} ${goal.duration_unit || 'Months'}`;
    return null;
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-textSecondary">Loading connection requests...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* 1. Incoming Requests */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <ArrowDownLeft size={16} />
            </div>
            <h3 className="text-sm font-bold text-textPrimary">
              Received Requests ({incoming.length})
            </h3>
          </div>
          <span className="text-[11px] text-textSecondary">
            Peers wanting to connect with you
          </span>
        </div>

        {incoming.length === 0 ? (
          <div className="p-8 rounded-2xl glass-card border border-border/70 text-center bg-surface/40">
            <Sparkles size={28} className="mx-auto text-cyan-400/40 mb-2" />
            <p className="text-xs font-semibold text-textPrimary">No incoming requests</p>
            <p className="text-[11px] text-textSecondary mt-0.5">
              When peers send you a connection request, you'll see them here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {incoming.map((req) => {
              const sender = req.sender;
              const goal = sender.primary_goal;

              return (
                <motion.div
                  key={req.connection_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl glass-card border border-border/80 hover:border-cyan-500/40 bg-surface/80 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      onClick={() => onViewProfile(sender)}
                    >
                      {sender.avatar ? (
                        <img
                          src={sender.avatar}
                          alt={sender.name}
                          className="w-11 h-11 rounded-xl object-cover border border-cyan-500/30 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {getInitials(sender.name)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-textPrimary truncate hover:text-cyan-300">
                          {sender.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-textSecondary">
                          {sender.timezone && (
                            <span className="flex items-center gap-0.5">
                              <Globe size={11} className="text-cyan-400" /> {sender.timezone}
                            </span>
                          )}
                          {sender.current_streak > 0 && (
                            <span className="text-amber-400 flex items-center gap-0.5 font-medium">
                              <Flame size={11} /> {sender.current_streak}d
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] text-textSecondary/60 shrink-0">
                      {new Date(req.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  {/* Primary Goal Snippet */}
                  {goal && (
                    <div className="p-2.5 rounded-xl bg-surface-elevated/40 border border-border/50 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-textSecondary">
                        <span className="font-semibold text-cyan-400 flex items-center gap-1">
                          <Target size={11} /> Goal:
                        </span>
                        {formatDuration(goal) && (
                          <span className="flex items-center gap-1 text-[10px]">
                            <Clock size={10} /> {formatDuration(goal)}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-textPrimary truncate">{goal.title}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                    <button
                      onClick={() => onReject(req.connection_id)}
                      disabled={actionLoading}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-textSecondary hover:text-rose-300 hover:bg-rose-500/10 border border-border/60 hover:border-rose-500/30 transition-all cursor-pointer"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => onAccept(req.connection_id)}
                      disabled={actionLoading}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 shadow-md shadow-emerald-500/20 flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Check size={14} /> Accept Request
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Outgoing Requests */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <ArrowUpRight size={16} />
            </div>
            <h3 className="text-sm font-bold text-textPrimary">
              Sent Requests ({outgoing.length})
            </h3>
          </div>
          <span className="text-[11px] text-textSecondary">
            Awaiting peer response
          </span>
        </div>

        {outgoing.length === 0 ? (
          <div className="p-8 rounded-2xl glass-card border border-border/70 text-center bg-surface/40">
            <Clock size={28} className="mx-auto text-purple-400/40 mb-2" />
            <p className="text-xs font-semibold text-textPrimary">No pending sent requests</p>
            <p className="text-[11px] text-textSecondary mt-0.5">
              Requests you send to peers will appear here until they accept or decline.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {outgoing.map((req) => {
              const recipient = req.recipient;
              const goal = recipient.primary_goal;

              return (
                <motion.div
                  key={req.connection_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl glass-card border border-border/80 hover:border-purple-500/40 bg-surface/80 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      onClick={() => onViewProfile(recipient)}
                    >
                      {recipient.avatar ? (
                        <img
                          src={recipient.avatar}
                          alt={recipient.name}
                          className="w-11 h-11 rounded-xl object-cover border border-purple-500/30 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {getInitials(recipient.name)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-textPrimary truncate hover:text-purple-300">
                          {recipient.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-textSecondary">
                          {recipient.timezone && (
                            <span className="flex items-center gap-0.5">
                              <Globe size={11} className="text-purple-400" /> {recipient.timezone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold shrink-0">
                      Pending
                    </span>
                  </div>

                  {/* Primary Goal Snippet */}
                  {goal && (
                    <div className="p-2.5 rounded-xl bg-surface-elevated/40 border border-border/50 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-textSecondary">
                        <span className="font-semibold text-purple-400 flex items-center gap-1">
                          <Target size={11} /> Enrolled Goal:
                        </span>
                        {formatDuration(goal) && (
                          <span className="flex items-center gap-1 text-[10px]">
                            <Clock size={10} /> {formatDuration(goal)}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-textPrimary truncate">{goal.title}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                    <span className="text-[10px] text-textSecondary/60">
                      Sent {new Date(req.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>

                    <button
                      onClick={() => onCancel(req.connection_id)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
                    >
                      Cancel Request
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestsTab;

import React, { useState } from 'react';
import {
  Users, MessageSquare, Target, Clock, Search, X,
  Trash2, Globe, Flame, Shield, Sparkles, ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';

const ConnectionsTab = ({
  connections = [],
  loading,
  onOpenChat,
  onViewProfile,
  onDisconnect,
  onGoToDiscover,
  actionLoading
}) => {
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredConnections = connections.filter((conn) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = conn.partner.name?.toLowerCase().includes(term);
    const goalMatch = conn.partner.primary_goal?.title?.toLowerCase().includes(term);
    return nameMatch || goalMatch;
  });

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-textSecondary">Loading connections...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl glass-card border border-border/80 bg-surface/70">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search your connections by name or goal..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-surface-elevated/50 border border-border/70 focus:border-cyan-500 focus:outline-none text-sm text-textPrimary placeholder:text-textSecondary/60 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-textSecondary hover:text-textPrimary cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-textSecondary shrink-0">
          <Users size={16} className="text-cyan-400" />
          <span>
            <strong className="text-textPrimary">{connections.length}</strong> Connected Peer{connections.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {connections.length === 0 ? (
        <div className="py-16 text-center glass-card border border-border/70 rounded-3xl p-8 bg-surface/50">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Users size={32} />
          </div>
          <h3 className="text-lg font-bold text-textPrimary">No connections yet</h3>
          <p className="text-xs text-textSecondary max-w-md mx-auto mt-1 leading-relaxed">
            Connect with peers working toward similar strategic goals to start private encrypted conversations and share milestones.
          </p>
          <button
            onClick={onGoToDiscover}
            className="mt-4 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            Discover Goal-Enrolled Peers
          </button>
        </div>
      ) : filteredConnections.length === 0 ? (
        <div className="py-12 text-center glass-card border border-border/70 rounded-2xl p-6 bg-surface/40">
          <p className="text-sm font-semibold text-textPrimary">No connections match "{searchTerm}"</p>
          <button
            onClick={() => setSearchTerm('')}
            className="mt-2 text-xs text-cyan-400 hover:underline"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredConnections.map((conn) => {
            const partner = conn.partner;
            const goal = partner.primary_goal;
            const duration = formatDuration(goal);

            return (
              <motion.div
                key={conn.connection_id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl glass-card border border-border/80 hover:border-cyan-500/40 bg-surface/80 hover:bg-surface transition-all flex flex-col justify-between shadow-lg shadow-black/10 hover:shadow-cyan-500/5 group"
              >
                <div>
                  {/* Top user row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div
                      className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      onClick={() => onViewProfile(partner)}
                    >
                      {partner.avatar ? (
                        <img
                          src={partner.avatar}
                          alt={partner.name}
                          className="w-12 h-12 rounded-xl object-cover border border-cyan-500/30 shrink-0 group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                          {getInitials(partner.name)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-textPrimary truncate group-hover:text-cyan-300 transition-colors">
                          {partner.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-textSecondary mt-0.5">
                          {partner.timezone && (
                            <span className="flex items-center gap-1">
                              <Globe size={11} className="text-cyan-400" /> {partner.timezone}
                            </span>
                          )}
                          {partner.current_streak > 0 && (
                            <span className="text-amber-400 flex items-center gap-0.5 font-medium">
                              <Flame size={11} /> {partner.current_streak}d
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (window.confirm(`Disconnect from ${partner.name}? Messaging history will be removed.`)) {
                          onDisconnect(conn.connection_id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-textSecondary hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Disconnect peer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Primary Goal Box */}
                  {goal && (
                    <div
                      onClick={() => onViewProfile(partner)}
                      className="p-3.5 rounded-xl bg-surface-elevated/40 border border-border/60 hover:border-cyan-500/30 transition-all cursor-pointer mb-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px] text-textSecondary">
                        <span className="font-semibold text-cyan-400 flex items-center gap-1">
                          <Target size={12} /> Strategic Goal
                        </span>
                        {duration && (
                          <span className="flex items-center gap-1 text-[10px]">
                            <Clock size={10} /> {duration}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-textPrimary truncate">{goal.title}</p>
                    </div>
                  )}

                  {/* Last message preview */}
                  {conn.last_message && (
                    <div className="text-[11px] text-textSecondary mb-3 px-1 truncate">
                      <span className="text-textSecondary/70">Last: </span>
                      <span className="text-textPrimary font-medium">
                        {conn.last_message.content}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom actions */}
                <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onViewProfile(partner)}
                    className="text-xs text-textSecondary hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    View Goals
                  </button>

                  <button
                    onClick={() => onOpenChat(partner.id)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <MessageSquare size={13} />
                    <span>Open Chat</span>
                    {conn.unread_count > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-extrabold animate-pulse">
                        {conn.unread_count}
                      </span>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ConnectionsTab;

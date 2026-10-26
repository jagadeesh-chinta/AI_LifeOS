import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, X, Target, Clock, Filter, Sparkles, UserPlus,
  MessageSquare, Hourglass, Check, UserCheck, Flame, Globe, Eye
} from 'lucide-react';
import { motion } from 'framer-motion';

const DiscoverTab = ({
  users = [],
  loading,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onConnect,
  onOpenChat,
  onAccept,
  onReject,
  onViewProfile,
  actionLoading
}) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Debounce search update
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch]);

  // Keep local search synced with parent if changed externally
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

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

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl glass-card border border-border/80 bg-surface/70">
        {/* Search input with debouncing and clear */}
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search by user name, or goal (e.g. Full Stack Developer)..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-surface-elevated/50 border border-border/70 focus:border-cyan-500 focus:outline-none text-sm text-textPrimary placeholder:text-textSecondary/60 transition-all"
          />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch('');
                onSearchChange('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-textSecondary hover:text-textPrimary cursor-pointer"
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filter by connection status */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 shrink-0">
          <Filter size={15} className="text-textSecondary shrink-0 hidden sm:inline" />
          {[
            { id: 'ALL', label: 'All Peers' },
            { id: 'NOT_CONNECTED', label: 'Not Connected' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'CONNECTED', label: 'Connected' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onStatusFilterChange(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                  : 'bg-surface-elevated/40 text-textSecondary hover:text-textPrimary hover:bg-surface-elevated/70 border border-border/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-textSecondary px-1">
        <span>
          Showing <span className="font-bold text-textPrimary">{users.length}</span> eligible peer
          {users.length === 1 ? '' : 's'} enrolled in goals
        </span>
        {searchQuery && (
          <span className="text-cyan-400">
            Filtered by "{searchQuery}"
          </span>
        )}
      </div>

      {/* User Cards Grid */}
      {loading ? (
        // Skeleton loader
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl glass-card border border-border/50 bg-surface/50 animate-pulse space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-surface-elevated/80" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface-elevated/80 rounded w-2/3" />
                  <div className="h-3 bg-surface-elevated/60 rounded w-1/3" />
                </div>
              </div>
              <div className="h-16 bg-surface-elevated/40 rounded-xl" />
              <div className="h-9 bg-surface-elevated/80 rounded-xl" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        // Empty state
        <div className="py-16 text-center glass-card border border-border/70 rounded-3xl p-8 bg-surface/50">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Sparkles size={32} />
          </div>
          <h3 className="text-lg font-bold text-textPrimary">No peers match your search</h3>
          <p className="text-xs text-textSecondary max-w-md mx-auto mt-1 leading-relaxed">
            {searchQuery
              ? `We couldn't find any goal-enrolled peers matching "${searchQuery}". Try a different keyword or clear filters.`
              : 'Only users who have created strategic goals are eligible for discovery. When peers enroll in goals, they will appear here!'}
          </p>
          {searchQuery && (
            <button
              onClick={() => {
                setLocalSearch('');
                onSearchChange('');
                onStatusFilterChange('ALL');
              }}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 transition-all cursor-pointer"
            >
              Clear Search & Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {users.map((peer) => {
            const primary = peer.primary_goal;
            const duration = formatDuration(primary);

            return (
              <motion.div
                key={peer.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="group relative p-5 rounded-2xl glass-card border border-border/80 hover:border-cyan-500/40 bg-surface/80 hover:bg-surface transition-all flex flex-col justify-between shadow-lg shadow-black/10 hover:shadow-cyan-500/5"
              >
                {/* Upper User Info */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div
                      className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      onClick={() => onViewProfile(peer)}
                      title="Click to view full goals profile"
                    >
                      {peer.avatar ? (
                        <img
                          src={peer.avatar}
                          alt={peer.name}
                          className="w-12 h-12 rounded-xl object-cover border border-cyan-500/30 shrink-0 group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                          {getInitials(peer.name)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-textPrimary truncate group-hover:text-cyan-300 transition-colors">
                            {peer.name}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-textSecondary mt-0.5">
                          {peer.timezone && (
                            <span className="truncate flex items-center gap-1">
                              <Globe size={11} className="text-cyan-400 shrink-0" />
                              {peer.timezone}
                            </span>
                          )}
                          {peer.current_streak > 0 && (
                            <span className="flex items-center gap-0.5 text-amber-400 shrink-0 font-medium">
                              <Flame size={11} /> {peer.current_streak}d
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onViewProfile(peer)}
                      className="p-1.5 rounded-lg text-textSecondary hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 transition-all cursor-pointer"
                      title="View all goals"
                    >
                      <Eye size={15} />
                    </button>
                  </div>

                  {/* Primary Goal Box */}
                  <div
                    onClick={() => onViewProfile(peer)}
                    className="p-3.5 rounded-xl bg-surface-elevated/40 border border-border/60 hover:border-cyan-500/30 transition-all cursor-pointer mb-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-1 text-[11px]">
                      <span className="text-textSecondary uppercase tracking-wider font-semibold flex items-center gap-1">
                        <Target size={12} className="text-cyan-400" /> Primary Goal
                      </span>
                      {peer.goals_count > 1 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          +{peer.goals_count - 1} more goal{peer.goals_count > 2 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-bold text-textPrimary line-clamp-1">
                      {primary ? primary.title : 'Active Strategic Goal'}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-textSecondary pt-0.5">
                      {duration ? (
                        <span className="flex items-center gap-1 text-[10px]">
                          <Clock size={11} className="text-cyan-400" /> {duration}
                        </span>
                      ) : (
                        <span className="text-[10px] text-textSecondary/60">Target: Ongoing</span>
                      )}

                      <span className="text-[10px] font-semibold text-cyan-400">
                        {primary?.progress || 0}% complete
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onViewProfile(peer)}
                    className="text-xs text-textSecondary hover:text-cyan-300 font-medium transition-colors cursor-pointer"
                  >
                    View profile
                  </button>

                  <div>
                    {peer.connection_status === 'CONNECTED' ? (
                      <button
                        onClick={() => onOpenChat(peer.id)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <MessageSquare size={13} /> Chat
                      </button>
                    ) : peer.connection_status === 'PENDING_OUTGOING' ? (
                      <span className="px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 flex items-center gap-1">
                        <Hourglass size={12} /> Pending
                      </span>
                    ) : peer.connection_status === 'PENDING_INCOMING' ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onAccept(peer.connection_id)}
                          disabled={actionLoading}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Check size={13} /> Accept
                        </button>
                        <button
                          onClick={() => onReject(peer.connection_id)}
                          disabled={actionLoading}
                          className="px-2 py-1.5 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-200 bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onConnect(peer.id)}
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <UserPlus size={13} /> Connect
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DiscoverTab;

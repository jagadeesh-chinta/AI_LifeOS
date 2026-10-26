import React, { useState, useEffect } from 'react';
import { 
  X, Shield, AlertTriangle, Trash2, Ban, CheckCircle, 
  User, Mail, Calendar, Clock, Activity, Target, CheckSquare, 
  FileText, Repeat, Users, Loader2, LogIn, LogOut, ExternalLink,
  ChevronLeft, ChevronRight, Lock, Unlock
} from 'lucide-react';
import { adminService } from '../../services/admin.service';

export default function UserProfileCardModal({ 
  userId, 
  onClose, 
  onOpenBlockModal, 
  onOpenDeleteModal, 
  onUnblockSuccess,
  onOpenConnections 
}) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [unblocking, setUnblocking] = useState(false);

  // Pagination states for long histories
  const [loginPage, setLoginPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const PAGE_SIZE = 5;

  const fetchProfile = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getUserProfile(userId);
      setProfileData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch user profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  if (!userId) return null;

  const user = profileData?.user;
  const metrics = profileData?.metrics || {};
  const goals = profileData?.goals || [];
  const tasks = profileData?.tasks || [];
  const habits = profileData?.habits || [];
  const connections = profileData?.connections || { accepted: [], incoming: [], outgoing: [] };
  const loginLogs = profileData?.loginLogs || [];
  const activityLogs = profileData?.activityLogs || [];
  const blockHistory = profileData?.blockHistory || [];

  const isBlocked = user?.account_status === 'TEMPORARILY_BLOCKED';

  // Handle Unblock action directly
  const handleUnblock = async () => {
    if (!window.confirm(`Are you sure you want to unblock ${user.name || user.username}? Normal application access will be restored immediately.`)) {
      return;
    }
    try {
      setUnblocking(true);
      await adminService.unblockUser(user.id);
      await fetchProfile();
      if (onUnblockSuccess) onUnblockSuccess(user.id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to unblock account');
    } finally {
      setUnblocking(false);
    }
  };

  // Helper date formatter
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not available';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Not available';
      return d.toLocaleString();
    } catch {
      return 'Not available';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b1329] border border-cyan-500/30 w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col text-slate-100 overflow-hidden relative shadow-indigo-950/50">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0f172a]/95 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 rounded-xl text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>User Profile Card</span>
                <span className="text-xs font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-full">
                  ID: #{userId}
                </span>
              </h3>
              <p className="text-xs text-slate-400">Comprehensive administrative dossier and real-time records</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="p-24 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
            <p className="text-sm text-slate-400">Loading user profile & verified database histories...</p>
          </div>
        ) : error ? (
          <div className="m-6 p-6 bg-red-950/30 border border-red-500/40 rounded-xl text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
            <p className="text-sm text-red-200">{error}</p>
            <button
              onClick={fetchProfile}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-lg text-white"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* User Overview Header Banner */}
            <div className="p-6 bg-gradient-to-r from-[#0c152e] via-[#0f1a3a] to-[#0c152e] border-b border-slate-800/80">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                
                {/* Left Profile Info */}
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-xl flex-shrink-0 border-2 border-cyan-500/30">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full rounded-2xl object-cover" />
                    ) : (
                      (user?.name || user?.username || 'U')[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                      <h2 className="text-xl font-bold text-white">{user?.name || user?.username}</h2>
                      
                      {/* Session Status Badge */}
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        user?.is_online 
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user?.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                        <span>{user?.is_online ? 'ONLINE' : 'OFFLINE'}</span>
                      </span>

                      {/* Account Status Badge */}
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        isBlocked
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 animate-pulse'
                          : user?.account_status === 'SUSPENDED'
                          ? 'bg-red-500/10 text-red-300 border-red-500/40'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {isBlocked ? <Ban className="w-3 h-3 mr-0.5" /> : <CheckCircle className="w-3 h-3 mr-0.5" />}
                        <span>{isBlocked ? 'TEMPORARILY BLOCKED' : user?.account_status || 'ACTIVE'}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1.5">
                      <span className="flex items-center space-x-1">
                        <Mail className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{user?.email}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Joined: {formatDate(user?.created_at)}</span>
                      </span>
                      <span>•</span>
                      <span className="text-amber-400 font-medium">🔥 {user?.streak || 0}d streak</span>
                    </div>

                    {isBlocked && (
                      <div className="mt-2 text-xs bg-amber-950/40 border border-amber-500/40 text-amber-300 px-3 py-1.5 rounded-lg">
                        <strong>Restricted until:</strong> {formatDate(user?.blocked_until)}
                        {user?.block_reason && <span className="ml-2">• Reason: &ldquo;{user.block_reason}&rdquo;</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Quick Action Buttons */}
                <div className="flex items-center space-x-2 self-stretch sm:self-auto justify-end">
                  {isBlocked ? (
                    <button
                      onClick={handleUnblock}
                      disabled={unblocking}
                      className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl text-xs font-medium transition-all shadow-md"
                    >
                      {unblocking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                      <span>Unblock Account</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onOpenBlockModal(user)}
                      className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-600/80 hover:bg-amber-600 text-white rounded-xl text-xs font-medium transition-all shadow-md"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Block Account</span>
                    </button>
                  )}

                  <button
                    onClick={() => onOpenDeleteModal(user)}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-medium transition-all shadow-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>

              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 p-4 bg-[#080d1e] border-b border-slate-800/80 text-xs">
              <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl">
                <span className="text-slate-400 text-[11px] block">Tasks</span>
                <span className="font-bold text-white text-sm">{metrics.completedTasks || 0} / {metrics.totalTasks || 0}</span>
                <span className="text-[10px] text-emerald-400 block mt-0.5">done</span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl">
                <span className="text-slate-400 text-[11px] block">Goals</span>
                <span className="font-bold text-white text-sm">{metrics.totalGoals || 0}</span>
                <span className="text-[10px] text-cyan-400 block mt-0.5">{goals.length} tracked</span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl">
                <span className="text-slate-400 text-[11px] block">Habits</span>
                <span className="font-bold text-white text-sm">{metrics.totalHabits || 0}</span>
                <span className="text-[10px] text-indigo-400 block mt-0.5">{metrics.totalHabitLogs || 0} logs</span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl">
                <span className="text-slate-400 text-[11px] block">Documents</span>
                <span className="font-bold text-white text-sm">{metrics.totalDocuments || 0}</span>
                <span className="text-[10px] text-purple-400 block mt-0.5">stored files</span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl">
                <span className="text-slate-400 text-[11px] block">Notes & Plans</span>
                <span className="font-bold text-white text-sm">{(metrics.totalNotes || 0) + (metrics.totalScheduleItems || 0)}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">items</span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl">
                <span className="text-slate-400 text-[11px] block">Connections</span>
                <span className="font-bold text-white text-sm">{metrics.acceptedConnections || 0}</span>
                <span className="text-[10px] text-amber-400 block mt-0.5">active</span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-1 px-6 pt-3 border-b border-slate-800 bg-[#0f172a]/50 text-xs overflow-x-auto custom-scrollbar">
              {[
                { id: 'overview', label: 'Overview', icon: User },
                { id: 'goals_tasks', label: 'Goals & Tasks', icon: Target },
                { id: 'activity', label: 'Activity History', icon: Activity },
                { id: 'logins', label: 'Login History', icon: LogIn },
                { id: 'connections', label: 'Connections', icon: Users },
                { id: 'actions', label: 'Account Actions', icon: Shield },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-1.5 pb-2.5 px-3.5 font-medium whitespace-nowrap transition-all border-b-2 ${
                      activeTab === tab.id
                        ? 'border-cyan-400 text-cyan-300 font-semibold'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Contents Area */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar text-sm space-y-4">
              
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Account Timestamps Box */}
                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Security & Access Timestamps</span>
                      </h4>
                      <div className="space-y-2 text-xs divide-y divide-slate-800/60">
                        <div className="pt-2 flex justify-between">
                          <span className="text-slate-400">Last Login:</span>
                          <span className="text-slate-200 font-medium">{formatDate(user?.last_login)}</span>
                        </div>
                        <div className="pt-2 flex justify-between">
                          <span className="text-slate-400">Last Logout:</span>
                          <span className="text-slate-200 font-medium">{formatDate(user?.last_logout)}</span>
                        </div>
                        <div className="pt-2 flex justify-between">
                          <span className="text-slate-400">Last Activity:</span>
                          <span className="text-slate-200 font-medium">{formatDate(user?.last_activity || user?.last_login)}</span>
                        </div>
                        <div className="pt-2 flex justify-between">
                          <span className="text-slate-400">Registration Date:</span>
                          <span className="text-slate-200 font-medium">{formatDate(user?.created_at)}</span>
                        </div>
                        <div className="pt-2 flex justify-between">
                          <span className="text-slate-400">Account Type / Role:</span>
                          <span className="text-indigo-300 font-medium">{user?.role || 'user'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bio and Goal Focus Box */}
                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                        <Target className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Profile Persona & Focus</span>
                      </h4>
                      <div className="space-y-2.5 text-xs">
                        <div>
                          <span className="text-slate-400 block mb-0.5">Bio / Summary:</span>
                          <p className="text-slate-200 italic bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                            {user?.bio || 'Not available'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Primary Goal:</span>
                          <p className="text-slate-200 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60 font-medium">
                            {user?.primary_goal || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Notification Unread:</span>
                          <span className="text-slate-200">{metrics.totalNotifications || 0} records</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Block Record Audit if exists */}
                  {blockHistory.length > 0 && (
                    <div className="p-4 bg-slate-900/60 border border-amber-500/30 rounded-xl space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Administrative Block History Log ({blockHistory.length})</span>
                      </h4>
                      <div className="space-y-2">
                        {blockHistory.slice(0, 3).map((bh) => (
                          <div key={bh.id} className="text-xs bg-slate-950/40 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center">
                            <div>
                              <span className="font-semibold text-white">{bh.action}</span>
                              <span className="text-slate-400 ml-2">by Admin #{bh.admin_id}</span>
                              {bh.reason && <p className="text-slate-300 mt-0.5">&ldquo;{bh.reason}&rdquo;</p>}
                            </div>
                            <span className="text-slate-500">{formatDate(bh.created_at)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: GOALS & TASKS */}
              {activeTab === 'goals_tasks' && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center space-x-2">
                      <Target className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Registered User Goals ({goals.length})</span>
                    </h4>
                    {goals.length === 0 ? (
                      <p className="text-xs text-slate-500 italic p-3 bg-slate-900/40 rounded-xl">No active goals found.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {goals.map((g) => (
                          <div key={g.id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-xs text-white truncate">{g.title}</span>
                              <span className="text-[10px] px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full">
                                {g.category || 'General'}
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full"
                                style={{ width: `${Math.min(100, g.progress || 0)}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5">
                              <span>Progress: {g.progress || 0}%</span>
                              <span>Status: {g.status || 'IN_PROGRESS'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center space-x-2">
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                      <span>User Tasks ({tasks.length})</span>
                    </h4>
                    {tasks.length === 0 ? (
                      <p className="text-xs text-slate-500 italic p-3 bg-slate-900/40 rounded-xl">No tasks logged.</p>
                    ) : (
                      <div className="space-y-2">
                        {tasks.slice(0, 8).map((t) => (
                          <div key={t.id} className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2.5 truncate">
                              <span className={`w-2 h-2 rounded-full ${t.completed ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                              <span className={`font-medium truncate ${t.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                                {t.title}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 ml-2">
                              {t.due_date ? `Due: ${new Date(t.due_date).toLocaleDateString()}` : 'No date'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center space-x-2">
                      <Repeat className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Active Habits ({habits.length})</span>
                    </h4>
                    {habits.length === 0 ? (
                      <p className="text-xs text-slate-500 italic p-3 bg-slate-900/40 rounded-xl">No habits logged.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {habits.map((h) => (
                          <div key={h.id} className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs flex justify-between items-center">
                            <div>
                              <span className="font-semibold text-white block">{h.name}</span>
                              <span className="text-[11px] text-slate-400">{h.frequency || 'Daily'}</span>
                            </div>
                            <span className="text-amber-400 font-medium">🔥 {h.streak || 0}d</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: ACTIVITY HISTORY */}
              {activeTab === 'activity' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center space-x-2">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Real-time User Activity History ({activityLogs.length})</span>
                  </h4>
                  {activityLogs.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-4 bg-slate-900/40 rounded-xl text-center">
                      No tracked recent activity logs for this user.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {activityLogs
                          .slice((activityPage - 1) * PAGE_SIZE, activityPage * PAGE_SIZE)
                          .map((log) => (
                            <div key={log.id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                              <div>
                                <span className="font-semibold text-white block">{log.action || log.event || 'Account Action'}</span>
                                <span className="text-slate-400 text-[11px]">{log.details || log.description || 'System event'}</span>
                              </div>
                              <span className="text-slate-500 text-[11px] whitespace-nowrap ml-3">
                                {formatDate(log.created_at || log.timestamp)}
                              </span>
                            </div>
                          ))}
                      </div>

                      {/* Pagination for Activity */}
                      {activityLogs.length > PAGE_SIZE && (
                        <div className="flex justify-between items-center pt-2 text-xs text-slate-400">
                          <span>
                            Showing {(activityPage - 1) * PAGE_SIZE + 1} - {Math.min(activityPage * PAGE_SIZE, activityLogs.length)} of {activityLogs.length}
                          </span>
                          <div className="flex space-x-1">
                            <button
                              disabled={activityPage === 1}
                              onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                              className="p-1.5 rounded-lg bg-slate-800 disabled:opacity-40 hover:bg-slate-700 text-white"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              disabled={activityPage * PAGE_SIZE >= activityLogs.length}
                              onClick={() => setActivityPage((p) => p + 1)}
                              className="p-1.5 rounded-lg bg-slate-800 disabled:opacity-40 hover:bg-slate-700 text-white"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* TAB 4: LOGIN HISTORY */}
              {activeTab === 'logins' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center space-x-2">
                    <LogIn className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Historical Authentications & Sessions ({loginLogs.length})</span>
                  </h4>
                  {loginLogs.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-4 bg-slate-900/40 rounded-xl text-center">
                      No explicit login history records found in log table.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {loginLogs
                          .slice((loginPage - 1) * PAGE_SIZE, loginPage * PAGE_SIZE)
                          .map((log) => (
                            <div key={log.id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-semibold text-emerald-400">Login Successful</span>
                                  {log.ip_address && (
                                    <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                                      IP: {log.ip_address}
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-400 text-[11px] mt-0.5">{log.user_agent || 'Standard Web Browser'}</p>
                              </div>
                              <span className="text-slate-500 text-[11px] whitespace-nowrap ml-3">
                                {formatDate(log.login_time || log.created_at)}
                              </span>
                            </div>
                          ))}
                      </div>

                      {/* Pagination for Logins */}
                      {loginLogs.length > PAGE_SIZE && (
                        <div className="flex justify-between items-center pt-2 text-xs text-slate-400">
                          <span>
                            Showing {(loginPage - 1) * PAGE_SIZE + 1} - {Math.min(loginPage * PAGE_SIZE, loginLogs.length)} of {loginLogs.length}
                          </span>
                          <div className="flex space-x-1">
                            <button
                              disabled={loginPage === 1}
                              onClick={() => setLoginPage((p) => Math.max(1, p - 1))}
                              className="p-1.5 rounded-lg bg-slate-800 disabled:opacity-40 hover:bg-slate-700 text-white"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              disabled={loginPage * PAGE_SIZE >= loginLogs.length}
                              onClick={() => setLoginPage((p) => p + 1)}
                              className="p-1.5 rounded-lg bg-slate-800 disabled:opacity-40 hover:bg-slate-700 text-white"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* TAB 5: CONNECTIONS */}
              {activeTab === 'connections' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Connections & Requests ({connections.accepted?.length || 0} active)</span>
                    </h4>
                    {onOpenConnections && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenConnections(user);
                        }}
                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 underline"
                      >
                        <span>Open Full Connections Manager</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {connections.accepted?.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-4 bg-slate-900/40 rounded-xl text-center">
                      User has not established any connections yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {connections.accepted.map((c) => (
                        <div key={c.connection_id || c.connected_user_id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center space-x-3 text-xs">
                          <div className="w-8 h-8 rounded-full bg-cyan-600/30 text-cyan-300 font-bold flex items-center justify-center flex-shrink-0">
                            {(c.name || 'U')[0].toUpperCase()}
                          </div>
                          <div className="truncate">
                            <span className="font-semibold text-white block truncate">{c.name || c.username}</span>
                            <span className="text-slate-400 text-[11px] block truncate">{c.email}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: ACCOUNT ACTIONS */}
              {activeTab === 'actions' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-cyan-400" />
                      <span>Administrative Account Governance</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Perform authoritative lifecycle adjustments for user <strong className="text-slate-200">{user.email}</strong>. Every administrative action is audited in the MySQL event registry.
                    </p>
                  </div>

                  {/* Temporary Block / Unblock Box */}
                  <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h5 className="text-sm font-bold text-amber-300 flex items-center space-x-2">
                        {isBlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        <span>{isBlocked ? 'Account Currently Blocked' : 'Temporary Account Blocking'}</span>
                      </h5>
                      <p className="text-xs text-slate-400 mt-1 max-w-xl">
                        {isBlocked
                          ? `Restricted until ${formatDate(user?.blocked_until)}. Reason: "${user?.block_reason || 'Administrative restriction'}". You may unblock this account early.`
                          : 'Restrict user access for 1 to 30 days (or custom duration). Sockets are disconnected and access to protected APIs is revoked.'}
                      </p>
                    </div>

                    {isBlocked ? (
                      <button
                        onClick={handleUnblock}
                        disabled={unblocking}
                        className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold whitespace-nowrap shadow-md"
                      >
                        {unblocking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                        <span>Unblock Account</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onOpenBlockModal(user)}
                        className="flex items-center space-x-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold whitespace-nowrap shadow-md"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Block Account</span>
                      </button>
                    )}
                  </div>

                  {/* Permanent Account Deletion Box */}
                  <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h5 className="text-sm font-bold text-red-300 flex items-center space-x-2">
                        <Trash2 className="w-4 h-4 text-red-400" />
                        <span>Permanent Account Deletion</span>
                      </h5>
                      <p className="text-xs text-slate-400 mt-1 max-w-xl">
                        Atomically wipe this user account, stored documents, goals, tasks, connections, and authentication tokens from the database. This operation is irreversible.
                      </p>
                    </div>

                    <button
                      onClick={() => onOpenDeleteModal(user)}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold whitespace-nowrap shadow-md shadow-red-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Permanently Delete</span>
                    </button>
                  </div>

                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-[#0f172a] border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Authorized Admin Console Record</span>
              </span>
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

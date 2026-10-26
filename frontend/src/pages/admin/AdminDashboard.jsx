import React, { useState, useEffect } from 'react';
import { 
  getUsers, 
  getAdminStats, 
  blockUser, 
  unblockUser, 
  permanentlyDeleteUser 
} from '../../services/admin.service';
import { connectSocket } from '../../services/socket';
import {
  Shield, Users, UserCheck, Activity, CheckSquare, Target,
  FileText, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight,
  LogOut, AlertCircle, CheckCircle2, Radio, Clock, Ban,
  Sparkles, RefreshCw, X, Bell, HelpCircle, Network
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Modals and Subsections
import UserProfileCardModal from '../../components/admin/UserProfileCardModal';
import UserConnectionsModal from '../../components/admin/UserConnectionsModal';
import BlockAccountModal from '../../components/admin/BlockAccountModal';
import PermanentDeleteModal from '../../components/admin/PermanentDeleteModal';
import HelpRequestsSection from '../../components/admin/HelpRequestsSection';

const AdminDashboard = ({ admin, onLogout }) => {
  // Active Dashboard Tab: 'users' | 'help'
  const [activeTab, setActiveTab] = useState('users');

  // Stat counters
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    onlineUsers: 0,
    totalTasks: 0,
    totalGoals: 0,
    totalDocuments: 0
  });

  // Table state
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters and sorting
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Active Modals state
  const [selectedProfileUserId, setSelectedProfileUserId] = useState(null);
  const [selectedConnectionsUser, setSelectedConnectionsUser] = useState(null);
  const [userToBlock, setUserToBlock] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Real-time toast alerts
  const [toasts, setToasts] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);

  const addToast = (title, message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [{ id, title, message, type }, ...prev.slice(0, 4)]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // Initial data load
  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchUsersList();
  }, [pagination.page, statusFilter, sortBy, sortOrder]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((p) => ({ ...p, page: 1 }));
      fetchUsersList();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Socket.IO real-time event listeners
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const socket = connectSocket(token);

    if (socket) {
      if (socket.connected) {
        setSocketConnected(true);
      }

      socket.on('connect', () => {
        setSocketConnected(true);
      });

      socket.on('disconnect', () => {
        setSocketConnected(false);
      });

      // 1. New user registration
      socket.on('new_user_registered', (data) => {
        addToast(
          'New User Registered',
          `"${data.username || data.email}" just created an AI LifeOS account!`,
          'success'
        );
        fetchStats();
        fetchUsersList();
      });

      // 2. User logged in
      socket.on('user_logged_in', (data) => {
        addToast(
          'User Logged In',
          `${data.username || data.email} initiated an active session.`,
          'info'
        );
        fetchStats();
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.id === data.userId
              ? {
                  ...u,
                  is_online: true,
                  session_status: 'ONLINE',
                  last_login_time: data.login_time || new Date().toISOString(),
                  current_streak: data.streak !== undefined ? data.streak : u.current_streak
                }
              : u
          )
        );
      });

      // 3. User logged out
      socket.on('user_logged_out', (data) => {
        addToast(
          'User Logged Out',
          `User ID #${data.userId} concluded session.`,
          'info'
        );
        fetchStats();
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.id === data.userId
              ? {
                  ...u,
                  is_online: false,
                  session_status: 'OFFLINE',
                  last_logout_time: data.logout_time || new Date().toISOString()
                }
              : u
          )
        );
      });

      // 4. User profile updated
      socket.on('user_profile_updated', (data) => {
        addToast(
          'Profile Updated',
          `User #${data.userId} updated their profile info.`,
          'info'
        );
        fetchUsersList();
      });

      // 5. Account status changed
      socket.on('user_status_changed', (data) => {
        addToast(
          'Status Change',
          `User #${data.userId} status updated to ${data.status}`,
          'warning'
        );
        fetchStats();
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.id === data.userId
              ? { ...u, account_status: data.status, blocked_until: data.blocked_until }
              : u
          )
        );
      });

      // 6. User account deleted
      socket.on('user_deleted', (data) => {
        addToast(
          'Account Deleted',
          `User #${data.userId} account was permanently purged.`,
          'warning'
        );
        fetchStats();
        setUsers((prevUsers) => prevUsers.filter((u) => u.id !== data.userId));
      });

      // 7. New help request
      socket.on('new_help_request', (data) => {
        addToast(
          'New Help Request',
          `Received appeal ${data.requestId} from ${data.email}`,
          'info'
        );
      });
    }

    return () => {
      if (socket) {
        socket.off('new_user_registered');
        socket.off('user_logged_in');
        socket.off('user_logged_out');
        socket.off('user_profile_updated');
        socket.off('user_status_changed');
        socket.off('user_deleted');
        socket.off('new_help_request');
      }
    };
  }, []);

  const fetchStats = async () => {
    try {
      const data = await getAdminStats();
      if (data) setStats(data);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    }
  };

  const fetchUsersList = async () => {
    setLoading(true);
    try {
      const data = await getUsers({
        page: pagination.page,
        limit: pagination.limit,
        search,
        status: statusFilter,
        sortBy,
        sortOrder
      });
      setUsers(data.users || []);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('DESC');
    }
  };

  // Block account confirm handler
  const handleConfirmBlock = async ({ durationDays, reason }) => {
    if (!userToBlock) return;
    try {
      await blockUser(userToBlock.id, { durationDays, reason });
      addToast(
        'Account Blocked',
        `${userToBlock.username || userToBlock.email} has been temporarily blocked for ${durationDays} days.`,
        'warning'
      );
      setUserToBlock(null);
      // Close profile modal or refresh it
      fetchStats();
      fetchUsersList();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to block account');
    }
  };

  // Permanent Delete confirm handler
  const handleConfirmPermanentDelete = async (confirmationText) => {
    if (!userToDelete) return;
    try {
      setIsDeleting(true);
      await permanentlyDeleteUser(userToDelete.id, confirmationText);
      addToast(
        'Account Permanently Deleted',
        `User ${userToDelete.username || userToDelete.email} and all associated records have been erased.`,
        'warning'
      );
      setUserToDelete(null);
      setSelectedProfileUserId(null);
      fetchStats();
      fetchUsersList();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-textPrimary pb-16 px-4 sm:px-8 pt-6">
      {/* Real-Time Toast Notifications Overlay */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className="pointer-events-auto p-3.5 rounded-xl glass-card border border-cyan-500/30 shadow-xl flex items-start gap-3 bg-surface/90 backdrop-blur-md"
            >
              <div
                className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                  toast.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : toast.type === 'warning'
                    ? 'bg-rose-500/10 text-rose-400'
                    : 'bg-cyan-500/10 text-cyan-400'
                }`}
              >
                <Bell size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-bold text-textPrimary">{toast.title}</h5>
                <p className="text-[11px] text-textSecondary mt-0.5">{toast.message}</p>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-textSecondary hover:text-textPrimary"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Top Navbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-0.5 shadow-md shadow-cyan-500/20">
            <div className="w-full h-full bg-surface p-2 rounded-xl flex items-center justify-center">
              <Shield className="text-cyan-400" size={24} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-textPrimary">
                AI LifeOS Management Console
              </h1>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                ADMIN
              </span>
            </div>
            <p className="text-xs text-textSecondary flex items-center gap-2 mt-0.5">
              <span>Logged in as <strong>{admin?.username || admin?.email}</strong></span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    socketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                  }`}
                ></span>
                <span className="text-[11px]">
                  {socketConnected ? 'Socket.IO Live' : 'Connecting Real-Time...'}
                </span>
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchStats();
              fetchUsersList();
            }}
            className="btn-secondary text-xs font-semibold px-3 py-2 flex items-center gap-1.5"
            title="Refresh Table & Counters"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={onLogout}
            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </div>

      {/* KPI Counters Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {/* Total Users */}
        <div className="glass-card p-4 rounded-xl border border-border/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-textSecondary mb-2">
            <span className="text-xs font-medium">Total Registered</span>
            <Users size={16} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-textPrimary">{stats.totalUsers}</div>
        </div>

        {/* Active Accounts */}
        <div className="glass-card p-4 rounded-xl border border-border/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-textSecondary mb-2">
            <span className="text-xs font-medium">Active Accounts</span>
            <UserCheck size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{stats.activeUsers}</div>
        </div>

        {/* Online Now */}
        <div className="glass-card p-4 rounded-xl border border-border/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-textSecondary mb-2">
            <span className="text-xs font-medium">Online Right Now</span>
            <Radio size={16} className="text-purple-400 animate-pulse" />
          </div>
          <div className="text-2xl font-bold text-purple-400">{stats.onlineUsers}</div>
        </div>

        {/* Total Tasks */}
        <div className="glass-card p-4 rounded-xl border border-border/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-textSecondary mb-2">
            <span className="text-xs font-medium">Total Tasks</span>
            <CheckSquare size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-textPrimary">{stats.totalTasks}</div>
        </div>

        {/* Active Goals */}
        <div className="glass-card p-4 rounded-xl border border-border/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-textSecondary mb-2">
            <span className="text-xs font-medium">User Goals</span>
            <Target size={16} className="text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-textPrimary">{stats.totalGoals}</div>
        </div>

        {/* Stored Documents */}
        <div className="glass-card p-4 rounded-xl border border-border/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-textSecondary mb-2">
            <span className="text-xs font-medium">Stored Documents</span>
            <FileText size={16} className="text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-textPrimary">{stats.totalDocuments}</div>
        </div>
      </div>

      {/* Main Console Navigation Tabs: Users Directory vs Help & Feedback */}
      <div className="flex items-center space-x-2 border-b border-border/60 mb-5">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'users'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-textSecondary hover:text-textPrimary'
          }`}
        >
          <Users size={16} />
          <span>Registered LifeOS Users</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {pagination.total}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('help')}
          className={`flex items-center space-x-2 pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'help'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-textSecondary hover:text-textPrimary'
          }`}
        >
          <HelpCircle size={16} />
          <span>Help & Feedback Requests</span>
        </button>
      </div>

      {/* SECTION 1: REGISTERED USERS DIRECTORY */}
      {activeTab === 'users' && (
        <div className="glass-card p-6 rounded-2xl border border-border/80 shadow-xl space-y-5">
          {/* Table Search & Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2">
                <Users size={20} className="text-cyan-400" />
                Registered LifeOS Users
              </h2>
              <span className="text-xs text-textSecondary font-medium">
                ({pagination.total} total)
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Search Input */}
              <div className="relative w-full sm:w-64">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary"
                />
                <input
                  type="text"
                  placeholder="Search username or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field pl-9 text-xs"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl glass-card border border-border/80 text-xs">
                {['ALL', 'ACTIVE', 'TEMPORARILY_BLOCKED', 'SUSPENDED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setStatusFilter(st);
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all text-[11px] ${
                      statusFilter === st
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-textSecondary hover:text-textPrimary'
                    }`}
                  >
                    {st === 'ALL' ? 'ALL' : st === 'TEMPORARILY_BLOCKED' ? 'BLOCKED' : st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-elevated/80 border-b border-border/60 text-textSecondary font-semibold uppercase tracking-wider text-[11px]">
                  <th
                    onClick={() => handleSort('name')}
                    className="p-3.5 cursor-pointer hover:text-cyan-400 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      User <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('email')}
                    className="p-3.5 cursor-pointer hover:text-cyan-400 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Email <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="p-3.5">Session Status</th>
                  <th
                    onClick={() => handleSort('status')}
                    className="p-3.5 cursor-pointer hover:text-cyan-400 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Account Status <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('streak')}
                    className="p-3.5 cursor-pointer hover:text-cyan-400 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Streak <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('created_at')}
                    className="p-3.5 cursor-pointer hover:text-cyan-400 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Registered <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('last_login')}
                    className="p-3.5 cursor-pointer hover:text-cyan-400 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Last Login <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="p-3.5">Last Logout</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-textSecondary">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin"></div>
                        <span>Loading user records...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-textSecondary">
                      No users match your criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedProfileUserId(u.id)}
                      className="hover:bg-surface-elevated/60 transition-colors cursor-pointer group"
                    >
                      {/* User (Clickable) */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 p-0.5 shrink-0 group-hover:scale-105 transition-transform">
                            <div className="w-full h-full bg-surface rounded-full flex items-center justify-center font-bold text-cyan-300 text-xs">
                              {u.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-textPrimary truncate group-hover:text-cyan-300 transition-colors">
                              {u.username}
                            </div>
                            <div className="text-[10px] text-textSecondary">ID #{u.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="p-3.5 font-medium text-textSecondary">
                        {u.email}
                      </td>

                      {/* Session Status */}
                      <td className="p-3.5">
                        {u.is_online ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            ONLINE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-surface text-textSecondary border border-border">
                            OFFLINE
                          </span>
                        )}
                      </td>

                      {/* Account Status */}
                      <td className="p-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                            u.account_status === 'ACTIVE'
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                              : u.account_status === 'TEMPORARILY_BLOCKED'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {u.account_status}
                        </span>
                      </td>

                      {/* Streak */}
                      <td className="p-3.5 font-bold text-amber-400">
                        {u.current_streak} {u.current_streak === 1 ? 'day' : 'days'}
                      </td>

                      {/* Registered Date */}
                      <td className="p-3.5 text-textSecondary whitespace-nowrap">
                        {new Date(u.created_at).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </td>

                      {/* Last Login */}
                      <td className="p-3.5 text-textSecondary whitespace-nowrap">
                        {u.last_login_time
                          ? new Date(u.last_login_time).toLocaleString([], {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })
                          : '—'}
                      </td>

                      {/* Last Logout */}
                      <td className="p-3.5 text-textSecondary whitespace-nowrap">
                        {u.last_logout_time
                          ? new Date(u.last_logout_time).toLocaleString([], {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })
                          : '—'}
                      </td>

                      {/* Actions: Replaced Suspend with Connections Button! */}
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation(); // prevent opening profile modal
                            setSelectedConnectionsUser(u);
                          }}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-all inline-flex items-center space-x-1.5 shadow-sm"
                        >
                          <Network size={13} className="text-cyan-400" />
                          <span>Connections</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between text-xs text-textSecondary pt-2">
            <div>
              Showing Page <strong>{pagination.page}</strong> of{' '}
              <strong>{pagination.totalPages}</strong> ({pagination.total} records)
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                className="btn-secondary px-3 py-1.5 flex items-center gap-1 disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                className="btn-secondary px-3 py-1.5 flex items-center gap-1 disabled:opacity-40"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: HELP & FEEDBACK REQUESTS */}
      {activeTab === 'help' && (
        <HelpRequestsSection
          onUnblockUser={(unblockedUserId) => {
            fetchStats();
            fetchUsersList();
          }}
        />
      )}

      {/* MODAL 1: User Profile Card Modal (Full dossier with tabs and account actions) */}
      {selectedProfileUserId && (
        <UserProfileCardModal
          userId={selectedProfileUserId}
          onClose={() => setSelectedProfileUserId(null)}
          onOpenBlockModal={(targetUser) => setUserToBlock(targetUser)}
          onOpenDeleteModal={(targetUser) => setUserToDelete(targetUser)}
          onUnblockSuccess={() => {
            fetchStats();
            fetchUsersList();
          }}
          onOpenConnections={(targetUser) => {
            setSelectedProfileUserId(null);
            setSelectedConnectionsUser(targetUser);
          }}
        />
      )}

      {/* MODAL 2: User Connections Modal (Real DB records with back button) */}
      {selectedConnectionsUser && (
        <UserConnectionsModal
          user={selectedConnectionsUser}
          onClose={() => setSelectedConnectionsUser(null)}
          onViewProfile={(targetUser) => {
            setSelectedConnectionsUser(null);
            setSelectedProfileUserId(targetUser.id);
          }}
        />
      )}

      {/* MODAL 3: Block Account Modal */}
      {userToBlock && (
        <BlockAccountModal
          user={userToBlock}
          onClose={() => setUserToBlock(null)}
          onConfirm={handleConfirmBlock}
        />
      )}

      {/* MODAL 4: Permanent Delete Modal (Requires DELETE ACCOUNT confirmation) */}
      {userToDelete && (
        <PermanentDeleteModal
          user={userToDelete}
          onClose={() => setUserToDelete(null)}
          onConfirm={handleConfirmPermanentDelete}
          isDeleting={isDeleting}
        />
      )}

    </div>
  );
};

export default AdminDashboard;

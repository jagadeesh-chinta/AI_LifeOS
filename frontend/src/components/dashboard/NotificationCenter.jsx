import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../../services/notification.service';
import { connectSocket } from '../../services/socket';
import {
  Bell, CheckCheck, Trash2, ExternalLink, Sparkles,
  CheckSquare, Target, Clock, Shield, Info, X,
  UserPlus, UserCheck, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getNotifIcon = (type) => {
  switch (type) {
    case 'TASK':
      return <CheckSquare size={16} className="text-cyan-400" />;
    case 'GOAL':
      return <Target size={16} className="text-purple-400" />;
    case 'SCHEDULE':
      return <Clock size={16} className="text-amber-400" />;
    case 'SECURITY':
      return <Shield size={16} className="text-rose-400" />;
    case 'CONNECTION_REQUEST':
      return <UserPlus size={16} className="text-cyan-400" />;
    case 'CONNECTION_ACCEPTED':
      return <UserCheck size={16} className="text-emerald-400" />;
    case 'MESSAGE':
      return <MessageSquare size={16} className="text-purple-400" />;
    default:
      return <Info size={16} className="text-blue-400" />;
  }
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - d) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const panelRef = useRef(null);
  const navigate = useNavigate();

  // Load initial notifications
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Connect Socket.IO for real-time notifications
  useEffect(() => {
    const token = localStorage.getItem('token');
    const socket = connectSocket(token);

    if (socket) {
      socket.on('new_notification', (newNotif) => {
        setNotifications((prev) => [newNotif, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });
    }

    return () => {
      if (socket) {
        socket.off('new_notification');
      }
    };
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      if (data) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notif) => {
    if (notif.is_read) return;
    try {
      await markAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleItemClick = (notif) => {
    handleMarkAsRead(notif);
    if (notif.link) {
      setIsOpen(false);
      navigate(notif.link);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button with Unread Badge */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2.5 rounded-2xl glass-card border border-border/70 hover:border-cyan-500/40 text-textSecondary hover:text-textPrimary transition-all group shadow-sm hover:shadow-md"
        title="Notifications"
      >
        <Bell size={20} className="group-hover:scale-105 transition-transform" />

        {/* Unread Pill Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold shadow-md shadow-rose-500/40 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl glass-card border border-border/80 shadow-2xl p-4 bg-surface/95 backdrop-blur-xl flex flex-col max-h-[500px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-cyan-400" />
                <h4 className="text-sm font-bold text-textPrimary">Notification Center</h4>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                    {unreadCount} new
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors"
                >
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/40 my-2 pr-1">
              {loading && notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-textSecondary flex flex-col items-center gap-2">
                  <div className="w-5 h-5 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin"></div>
                  <span>Checking notifications...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-10 text-center text-textSecondary">
                  <Sparkles size={28} className="mx-auto text-cyan-400/40 mb-2" />
                  <p className="text-xs font-semibold text-textPrimary">All caught up!</p>
                  <p className="text-[11px] text-textSecondary mt-0.5">
                    No new reminders or system notifications.
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`py-3 px-2 rounded-xl transition-all cursor-pointer flex items-start gap-3 group relative ${
                      !n.is_read
                        ? 'bg-cyan-500/10 hover:bg-cyan-500/15'
                        : 'hover:bg-surface-elevated/40'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-surface border border-border shrink-0 mt-0.5">
                      {getNotifIcon(n.type)}
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-1.5">
                        <h5
                          className={`text-xs font-semibold truncate ${
                            !n.is_read ? 'text-textPrimary font-bold' : 'text-textSecondary'
                          }`}
                        >
                          {n.title}
                        </h5>
                        {!n.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                        )}
                      </div>

                      <p className="text-[11px] text-textSecondary line-clamp-2 mt-0.5">
                        {n.message}
                      </p>

                      <div className="flex items-center gap-2 text-[10px] text-textSecondary/60 mt-1">
                        <span>{formatTimeAgo(n.created_at)}</span>
                        {n.link && (
                          <span className="text-cyan-400 flex items-center gap-0.5">
                            Open <ExternalLink size={10} />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete button on hover */}
                    <button
                      onClick={(e) => handleDelete(e, n.id)}
                      className="absolute top-3 right-2 opacity-0 group-hover:opacity-100 p-1 text-textSecondary hover:text-rose-400 transition-opacity"
                      title="Remove notification"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-border/60 text-center">
              <span className="text-[10px] text-textSecondary/60">
                AI LifeOS Real-Time Delivery Active
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;

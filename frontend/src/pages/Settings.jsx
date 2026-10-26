import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getPreferences, updatePreferences } from '../services/preference.service';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Moon, 
  Sun, 
  Monitor, 
  Save, 
  LogOut, 
  ShieldAlert, 
  User as UserIcon,
  Check,
  Sparkles,
  Trash2,
  AlertTriangle,
  AlertOctagon,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const THEME_OPTIONS = [
  {
    id: 'light',
    name: 'Light',
    description: 'Bright, clean, and easy on the eyes.',
    icon: Sun,
    preview: {
      bg: '#F8FAFC',
      card: '#FFFFFF',
      border: '#E2E8F0',
      text: '#0F172A',
      accent: '#6366F1'
    }
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'Focused, elegant, and comfortable at night.',
    icon: Moon,
    preview: {
      bg: '#0B0F19',
      card: '#141B2D',
      border: 'rgba(255, 255, 255, 0.12)',
      text: '#F8FAFC',
      accent: '#6366F1'
    }
  },
  {
    id: 'system',
    name: 'System',
    description: 'Automatically follows your device.',
    icon: Monitor,
    isSplit: true
  }
];

const Settings = () => {
  const { user, logout, deleteAccount } = useAuth();
  const { theme, effectiveTheme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [preferences, setPreferences] = useState({
    notifications_enabled: true,
    wake_time: '07:00',
    sleep_time: '23:00',
    work_start: '09:00',
    work_end: '17:00',
    preferred_focus_minutes: 60,
    preferred_break_minutes: 15
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchPrefs();
  }, []);

  const fetchPrefs = async () => {
    try {
      const data = await getPreferences();
      if (data) {
        setPreferences(prev => ({
          ...prev,
          ...data
        }));
        // If backend returned a theme preference and local was default, sync if available
        if (data.theme && ['light', 'dark', 'system'].includes(data.theme.toLowerCase())) {
          // Do not overwrite local if local has explicit preference
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPreferences(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value, 10) : value)
    }));
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      await updatePreferences({
        ...preferences,
        theme
      });
      setSuccessMsg('Settings saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePermanentlyDelete = async (e) => {
    e.preventDefault();
    if (deleteConfirmText.trim() !== 'DELETE MY ACCOUNT') {
      setDeleteError('Please type "DELETE MY ACCOUNT" exactly as shown.');
      return;
    }
    if (!deletePassword) {
      setDeleteError('Password is required to confirm account deletion.');
      return;
    }

    setDeleteError('');
    setIsDeleting(true);

    try {
      await deleteAccount(deletePassword, deleteConfirmText.trim());
      setShowDeleteModal(false);
      navigate('/login', {
        replace: true,
        state: { message: 'Your account and associated data have been permanently deleted.' }
      });
    } catch (err) {
      console.error('Account deletion error:', err);
      setDeleteError(
        err.response?.data?.message || err.message || 'Failed to delete account. Please try again.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-textSecondary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-16">
      {/* Refined Page Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles size={14} />
          <span>Personalization & Parameters</span>
        </div>
        <h1 className="text-3xl font-extrabold text-textPrimary tracking-tight flex items-center gap-3">
          <SettingsIcon className="text-primary" size={32} />
          Settings
        </h1>
        <p className="text-textSecondary mt-1 text-sm md:text-base">
          Customize your interface theme, AI scheduling parameters, notifications, and security.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Appearance Section */}
        <motion.section 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="glass-card p-6 md:p-8 relative overflow-hidden"
          aria-labelledby="appearance-heading"
        >
          <div className="border-b border-border pb-5 mb-6">
            <h2 id="appearance-heading" className="text-xl font-bold text-textPrimary flex items-center gap-2">
              Appearance
            </h2>
            <p className="text-sm text-textSecondary mt-1">
              Select how AI LifeOS looks to you. Choose light, dark, or sync automatically with your device.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-textPrimary tracking-wide">
                Interface Theme
              </span>
              <span className="text-xs text-textSecondary bg-surface-elevated px-2.5 py-1 rounded-md border border-border">
                Effective: <strong className="text-textPrimary capitalize">{effectiveTheme}</strong>
                {theme === 'system' && ' (Auto OS)'}
              </span>
            </div>

            {/* Responsive 3-Card Theme Selector */}
            <div 
              role="radiogroup" 
              aria-label="Interface Theme Options"
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {THEME_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = theme === opt.id;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleThemeChange(opt.id)}
                    className={`group relative flex flex-col justify-between text-left p-5 rounded-2xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[220px] ${
                      isSelected
                        ? 'border-primary bg-primary/[0.04] dark:bg-primary/[0.08] shadow-[0_8px_25px_-5px_rgba(99,102,241,0.2)]'
                        : 'border-border bg-surface hover:border-textSecondary/40 hover:bg-surface-elevated/60 shadow-sm'
                    }`}
                  >
                    {/* Header: Icon, Name & Active Checkmark */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-2.5 rounded-xl transition-colors ${
                          isSelected 
                            ? 'bg-primary text-white shadow-md shadow-primary/30' 
                            : 'bg-surface-elevated text-textSecondary group-hover:text-textPrimary border border-border'
                        }`}>
                          <Icon size={20} />
                        </div>

                        {isSelected ? (
                          <div className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                            <Check size={12} className="stroke-[3]" />
                            <span>Active</span>
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-border group-hover:border-textSecondary transition-colors" />
                        )}
                      </div>

                      <h3 className="text-base font-bold text-textPrimary tracking-tight">
                        {opt.name}
                      </h3>
                      <p className="text-xs text-textSecondary mt-1 leading-relaxed">
                        {opt.description}
                      </p>
                    </div>

                    {/* Realistic Mini Preview */}
                    <div className="mt-4 pt-3 border-t border-border/60">
                      {opt.isSplit ? (
                        /* Split Preview for System Mode */
                        <div className="h-14 rounded-lg overflow-hidden border border-border flex shadow-inner">
                          <div className="w-1/2 bg-[#F8FAFC] p-1.5 flex flex-col justify-between border-r border-[#E2E8F0]">
                            <div className="flex items-center gap-1">
                              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                              <div className="w-6 h-1.5 rounded bg-slate-300" />
                            </div>
                            <div className="w-full h-4 rounded bg-white border border-[#E2E8F0] px-1 flex items-center">
                              <div className="w-8 h-1 rounded bg-slate-300" />
                            </div>
                          </div>
                          <div className="w-1/2 bg-[#0B0F19] p-1.5 flex flex-col justify-between">
                            <div className="flex items-center gap-1">
                              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                              <div className="w-6 h-1.5 rounded bg-slate-700" />
                            </div>
                            <div className="w-full h-4 rounded bg-[#141B2D] border border-white/10 px-1 flex items-center">
                              <div className="w-8 h-1 rounded bg-slate-600" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Dedicated Light or Dark Mini Preview */
                        <div 
                          className="h-14 rounded-lg p-2 flex flex-col justify-between shadow-inner transition-colors duration-200"
                          style={{
                            backgroundColor: opt.preview.bg,
                            border: `1px solid ${opt.preview.border}`
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                              <div 
                                className="w-8 h-1.5 rounded"
                                style={{ backgroundColor: opt.id === 'light' ? '#CBD5E1' : '#334155' }} 
                              />
                            </div>
                            <div className="w-2 h-2 rounded-full bg-accent" />
                          </div>
                          <div 
                            className="w-full h-5 rounded px-1.5 flex items-center justify-between"
                            style={{
                              backgroundColor: opt.preview.card,
                              border: `1px solid ${opt.preview.border}`
                            }}
                          >
                            <div 
                              className="w-10 h-1.5 rounded" 
                              style={{ backgroundColor: opt.id === 'light' ? '#94A3B8' : '#64748B' }}
                            />
                            <div className="w-3 h-1.5 rounded-full bg-primary/70" />
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* AI Scheduler Parameters */}
        <motion.section 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.08 }} 
          className="glass-card p-6 md:p-8"
        >
          <div className="border-b border-border pb-4 mb-6">
            <h2 className="text-xl font-bold text-textPrimary">AI Scheduler Parameters</h2>
            <p className="text-sm text-textSecondary mt-1">
              Configure your daily boundaries so AI LifeOS produces realistic, burnout-free schedules.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-textPrimary mb-2">Wake Time</label>
              <input 
                type="time" 
                name="wake_time" 
                className="input-field" 
                value={preferences.wake_time?.substring(0,5) || '07:00'} 
                onChange={handleChange} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textPrimary mb-2">Sleep Time</label>
              <input 
                type="time" 
                name="sleep_time" 
                className="input-field" 
                value={preferences.sleep_time?.substring(0,5) || '23:00'} 
                onChange={handleChange} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textPrimary mb-2">Work Start</label>
              <input 
                type="time" 
                name="work_start" 
                className="input-field" 
                value={preferences.work_start?.substring(0,5) || '09:00'} 
                onChange={handleChange} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textPrimary mb-2">Work End</label>
              <input 
                type="time" 
                name="work_end" 
                className="input-field" 
                value={preferences.work_end?.substring(0,5) || '17:00'} 
                onChange={handleChange} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textPrimary mb-2">Focus Block (Minutes)</label>
              <input 
                type="number" 
                name="preferred_focus_minutes" 
                className="input-field" 
                value={preferences.preferred_focus_minutes || 60} 
                onChange={handleChange} 
                step="15" 
                min="15" 
                max="180" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textPrimary mb-2">Break Duration (Minutes)</label>
              <input 
                type="number" 
                name="preferred_break_minutes" 
                className="input-field" 
                value={preferences.preferred_break_minutes || 15} 
                onChange={handleChange} 
                step="5" 
                min="5" 
                max="60" 
              />
            </div>
          </div>
        </motion.section>

        {/* Notifications */}
        <motion.section 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.16 }} 
          className="glass-card p-6 md:p-8 flex items-center justify-between"
        >
          <div>
            <h2 className="text-xl font-bold text-textPrimary flex items-center gap-2">
              <Bell size={20} className="text-primary" /> Notifications
            </h2>
            <p className="text-sm text-textSecondary mt-1">Receive proactive alerts for tasks and schedule milestones.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              name="notifications_enabled" 
              className="sr-only peer" 
              checked={preferences.notifications_enabled} 
              onChange={handleChange} 
            />
            <div className="w-11 h-6 bg-surface-elevated border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </motion.section>

        {/* Account & Security Section */}
        <motion.section 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.24 }} 
          className="glass-card p-6 md:p-8"
        >
          <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
            <UserIcon className="text-primary" size={22} />
            <h2 className="text-xl font-bold text-textPrimary">Account & Security</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 bg-surface-elevated border border-border p-4 rounded-xl">
            <div className="flex items-center gap-3.5">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.name || 'User'}
                  className="w-12 h-12 rounded-full object-cover border border-primary/30 shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-[1.5px] shadow-sm">
                  <div className="w-full h-full bg-surface rounded-full flex items-center justify-center text-base font-bold text-transparent bg-clip-text bg-gradient-to-tr from-cyan-400 to-purple-400">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </div>
              )}
              <div>
                <p className="text-textPrimary font-semibold">{user?.name || 'LifeOS User'}</p>
                <p className="text-sm text-textSecondary">{user?.email || 'Authenticated User'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 font-medium transition-all duration-200"
            >
              <LogOut size={18} />
              Log Out
            </button>
          </div>
          <p className="text-xs text-textSecondary">
            Logging out will end your current active session and require credentials to sign back in.
          </p>
        </motion.section>

        {/* Action Button Banner */}
        <div className="flex items-center justify-end gap-4 mt-8 pt-4">
          {successMsg && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              className="text-emerald-500 text-sm font-semibold flex items-center gap-1.5"
            >
              <Check size={16} />
              {successMsg}
            </motion.span>
          )}
          <button 
            type="submit" 
            disabled={saving} 
            className="btn-primary px-8 py-3 flex items-center gap-2 font-semibold shadow-lg hover:shadow-primary/30"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Danger Zone Section */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="mt-12 rounded-2xl p-6 md:p-8 space-y-4 border border-rose-500/30 bg-rose-500/[0.04] dark:bg-rose-950/20 shadow-sm transition-colors"
      >
        <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
          <h2 className="text-xl font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertTriangle className="text-rose-500 shrink-0" size={22} />
            Danger Zone
          </h2>
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            Irreversible Action
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-4 rounded-xl bg-surface/90 border border-rose-500/20">
          <div className="space-y-1">
            <h3 className="font-bold text-textPrimary text-base">
              Permanently Delete Account
            </h3>
            <p className="text-xs md:text-sm text-textSecondary leading-relaxed max-w-xl">
              Permanently delete your account and all associated personal data including tasks, goals, habits, schedules, calendar events, notes, documents, and personal preferences. This action cannot be undone.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setDeleteConfirmText('');
              setDeletePassword('');
              setDeleteError('');
              setShowDeleteModal(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition-all duration-200 shadow-md shadow-rose-600/25 hover:shadow-rose-600/40 shrink-0 cursor-pointer"
          >
            <Trash2 size={16} />
            Permanently Delete Account
          </button>
        </div>
      </motion.section>

      {/* Modals Container */}
      <AnimatePresence>
        {/* Logout Confirmation Modal */}
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card border border-border rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4">
                <ShieldAlert size={26} />
              </div>
              <h3 className="text-xl font-bold text-textPrimary mb-2">Confirm Logout</h3>
              <p className="text-textSecondary text-sm mb-6 leading-relaxed">
                Are you sure you want to log out of your AI LifeOS account? Any unsaved local session data will be preserved in the cloud.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="btn-secondary px-5 py-2.5 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    logout();
                    navigate('/login');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition-colors shadow-lg shadow-red-600/30 cursor-pointer"
                >
                  Yes, Log Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Permanent Account Deletion Modal */}
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="glass-card border border-rose-500/30 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative my-8"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
                  <AlertOctagon size={26} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-textPrimary">Permanently Delete Account</h3>
                  <p className="text-xs text-rose-500 font-semibold uppercase tracking-wider mt-0.5">
                    Critical Warning • Irreversible Action
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-textSecondary space-y-2 mb-5 leading-relaxed">
                <p className="font-medium text-rose-600 dark:text-rose-400">
                  This action will permanently purge your account and all associated data from the servers. You will permanently lose:
                </p>
                <ul className="list-disc list-inside space-y-1 text-textSecondary">
                  <li>Your user profile, streak data, and preferences</li>
                  <li>All tasks, task history, and category breakdowns</li>
                  <li>All goals, progress metrics, and AI career guidance roadmaps</li>
                  <li>All habits and daily habit completion logs</li>
                  <li>All schedules, AI generated planner items, and calendar events</li>
                  <li>All notes, documents, and profile photo assets</li>
                  <li>All budget entries, timetables, and travel plans</li>
                </ul>
              </div>

              {deleteError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <form onSubmit={handlePermanentlyDelete} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    1. Type <span className="text-rose-500 select-all font-mono font-bold">DELETE MY ACCOUNT</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE MY ACCOUNT"
                    disabled={isDeleting}
                    autoComplete="off"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none text-sm text-textPrimary font-mono transition-all placeholder:text-textSecondary/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5">
                    2. Enter your password to re-authenticate:
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Your account password"
                      disabled={isDeleting}
                      autoComplete="current-password"
                      className="w-full px-3.5 py-2.5 pl-10 rounded-xl bg-surface border border-border focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none text-sm text-textPrimary transition-all placeholder:text-textSecondary/40"
                    />
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-textSecondary/50" />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isDeleting) {
                        setShowDeleteModal(false);
                        setDeleteError('');
                      }
                    }}
                    disabled={isDeleting}
                    className="btn-secondary px-5 py-2.5 text-sm font-medium cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      deleteConfirmText.trim() !== 'DELETE MY ACCOUNT' ||
                      !deletePassword.trim() ||
                      isDeleting
                    }
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      deleteConfirmText.trim() === 'DELETE MY ACCOUNT' && deletePassword.trim() && !isDeleting
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 cursor-pointer'
                        : 'bg-rose-500/20 border border-rose-500/20 text-rose-400/50 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span>Permanently Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        <span>Permanently Delete Account</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User, Mail, Shield, Award, Activity, Lock, Eye, EyeOff,
  CheckCircle2, AlertCircle, Edit3, X, KeyRound, Sparkles,
  FileText, Target, Calendar, Check, Camera, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProfilePhotoCropModal from '../components/profile/ProfilePhotoCropModal';

const Profile = () => {
  const { user, updateProfile, changePassword, getUserStats } = useAuth();
  
  // Stats state
  const [stats, setStats] = useState({
    tasks_completed: 0,
    current_streak: 0,
    active_goals: 0,
    total_notes: 0,
    total_documents: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Photo crop modal state
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Change password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Sync profile form when user updates
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || ''
      });
    }
  }, [user]);

  // Load real user stats from database
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      if (getUserStats) {
        const data = await getUserStats();
        if (data) {
          setStats(data);
        }
      }
    } catch (err) {
      console.error('Failed to load user stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!profileForm.name.trim()) {
      setProfileError('Full name is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileForm.email)) {
      setProfileError('Please enter a valid email address.');
      return;
    }

    setProfileSaving(true);
    try {
      await updateProfile(profileForm.name.trim(), profileForm.email.trim());
      setProfileSuccess('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err) {
      setProfileError(err.response?.data?.message || err.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError('New password must be different from current password.');
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
        passwordForm.confirmPassword
      );
      setPasswordSuccess('Password changed successfully! Keep your credentials safe.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setPasswordSuccess('');
        setShowPasswordModal(false);
      }, 2000);
    } catch (err) {
      setPasswordError(err.response?.data?.message || err.message || 'Failed to change password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 px-2 sm:px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-textPrimary flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-500/30">
            <User className="text-cyan-400" size={28} />
          </div>
          My Profile
        </h1>
        <p className="text-textSecondary mt-1">Manage your account information, real-time statistics, and security.</p>
      </div>

      {/* Global Alerts */}
      {profileSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-3"
        >
          <CheckCircle2 size={20} className="shrink-0" />
          <span className="text-sm font-medium">{profileSuccess}</span>
        </motion.div>
      )}

      {profileError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-3"
        >
          <AlertCircle size={20} className="shrink-0" />
          <span className="text-sm font-medium">{profileError}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Avatar & LifeOS Stats */}
        <div className="md:col-span-1 space-y-6">
          {/* Avatar Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 flex flex-col items-center text-center relative overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500"></div>
            
            <div className="relative mb-4 group cursor-pointer" onClick={() => setIsPhotoModalOpen(true)}>
              <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-1 shadow-lg shadow-cyan-500/20 relative">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user?.name || 'Profile'}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-surface rounded-full flex items-center justify-center text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-tr from-cyan-400 to-purple-400">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}

                {/* Hover overlay with Camera */}
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-semibold gap-1 backdrop-blur-[1px]">
                  <Camera size={20} className="text-cyan-300" />
                  <span>{user?.avatar ? 'Change' : 'Upload'}</span>
                </div>
              </div>

              {/* Floating Camera Badge */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPhotoModalOpen(true);
                }}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-primary hover:bg-primary-hover text-white shadow-lg transition-transform hover:scale-110 border-2 border-surface"
                title={user?.avatar ? 'Change Profile Photo' : 'Upload Profile Photo'}
              >
                <Camera size={14} />
              </button>
            </div>

            <h2 className="text-xl font-bold text-textPrimary tracking-tight">{user?.name || 'LifeOS User'}</h2>
            <p className="text-sm text-textSecondary flex items-center gap-1.5 mt-1 justify-center break-all">
              <Mail size={13} className="text-cyan-400 shrink-0" />
              {user?.email}
            </p>

            {/* Upload / Change Photo Action Button */}
            <button
              type="button"
              onClick={() => setIsPhotoModalOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-elevated hover:bg-surface border border-border text-cyan-400 hover:text-cyan-300 transition-colors shadow-sm cursor-pointer"
            >
              <Camera size={13} />
              <span>{user?.avatar ? 'Change Photo' : 'Upload Photo'}</span>
            </button>

            <div className="mt-4 w-full flex items-center justify-center gap-2 text-xs font-semibold bg-emerald-500/10 text-emerald-400 py-2 rounded-xl border border-emerald-500/20">
              <Shield size={14} /> Account Active & Verified
            </div>
          </motion.div>

          {/* Dynamic LifeOS Statistics Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-textSecondary uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-cyan-400" />
                LifeOS Statistics
              </h3>
              {loadingStats && <div className="w-3.5 h-3.5 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin"></div>}
            </div>

            <div className="space-y-3.5 pt-1">
              {/* Tasks Completed */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated/40 border border-border/50">
                <div className="flex items-center gap-2.5 text-textPrimary">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Award size={16} />
                  </div>
                  <span className="text-sm font-medium">Tasks Completed</span>
                </div>
                <span className="font-bold text-base text-textPrimary">
                  {stats.tasks_completed}
                </span>
              </div>

              {/* Current Streak */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated/40 border border-border/50">
                <div className="flex items-center gap-2.5 text-textPrimary">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                    <Activity size={16} />
                  </div>
                  <span className="text-sm font-medium">Current Streak</span>
                </div>
                <span className="font-bold text-base text-amber-400">
                  {stats.current_streak} {stats.current_streak === 1 ? 'Day' : 'Days'}
                </span>
              </div>

              {/* Active Goals */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated/40 border border-border/50">
                <div className="flex items-center gap-2.5 text-textPrimary">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                    <Target size={16} />
                  </div>
                  <span className="text-sm font-medium">Active Goals</span>
                </div>
                <span className="font-bold text-base text-textPrimary">
                  {stats.active_goals}
                </span>
              </div>

              {/* Notes & Documents */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated/40 border border-border/50">
                <div className="flex items-center gap-2.5 text-textPrimary">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <FileText size={16} />
                  </div>
                  <span className="text-sm font-medium">Notes & Docs</span>
                </div>
                <span className="font-bold text-base text-textPrimary">
                  {(stats.total_notes || 0) + (stats.total_documents || 0)}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Personal Information & Security */}
        <div className="md:col-span-2 space-y-6">
          {/* Personal Information Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 md:p-8"
          >
            <div className="flex justify-between items-center mb-6 border-b border-border/60 pb-4">
              <div>
                <h2 className="text-lg font-bold text-textPrimary">Personal Information</h2>
                <p className="text-xs text-textSecondary mt-0.5">Your primary contact details stored securely in MySQL.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(!isEditing);
                  setProfileError('');
                }}
                className={`text-sm font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  isEditing
                    ? 'text-rose-400 hover:bg-rose-500/10 border border-rose-500/20'
                    : 'text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/20'
                }`}
              >
                {isEditing ? (
                  <>
                    <X size={15} /> Cancel
                  </>
                ) : (
                  <>
                    <Edit3 size={15} /> Edit Profile
                  </>
                )}
              </button>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  disabled={!isEditing}
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="input-field disabled:opacity-60 disabled:bg-surface-elevated/40"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  disabled={!isEditing}
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="input-field disabled:opacity-60 disabled:bg-surface-elevated/40"
                  placeholder="your.email@example.com"
                />
              </div>

              {isEditing && (
                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setProfileForm({ name: user?.name || '', email: user?.email || '' });
                      setProfileError('');
                    }}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="btn-primary flex items-center gap-2 text-sm shadow-lg shadow-cyan-500/20"
                  >
                    {profileSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check size={16} /> Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </motion.div>

          {/* Security Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 md:p-8"
          >
            <div className="border-b border-border/60 pb-4 mb-6">
              <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2">
                <Shield className="text-purple-400" size={20} />
                Security & Authentication
              </h2>
              <p className="text-xs text-textSecondary mt-0.5">Protect your account and update your login credentials.</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-surface-elevated/40 border border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-textPrimary flex items-center gap-2">
                    <KeyRound size={16} className="text-cyan-400" />
                    Account Password
                  </h4>
                  <p className="text-xs text-textSecondary mt-1">
                    Regularly updating your password strengthens your LifeOS data security.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPasswordError('');
                    setPasswordSuccess('');
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setShowPasswordModal(true);
                  }}
                  className="btn-secondary text-sm font-medium whitespace-nowrap hover:border-cyan-500/50"
                >
                  Change Password
                </button>
              </div>

              <div className="p-4 rounded-xl bg-surface-elevated/40 border border-border/60 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-textPrimary">Session Security</h4>
                  <p className="text-xs text-textSecondary mt-0.5">
                    Persistent token authorization with automatic renewal and secure scoping.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Protected
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card max-w-md w-full p-6 sm:p-8 border border-border/80 shadow-2xl relative"
            >
              <div className="flex justify-between items-center mb-6 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <Lock size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-textPrimary">Change Password</h3>
                    <p className="text-xs text-textSecondary">Enter your current and new password below.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="text-textSecondary hover:text-textPrimary p-1.5 rounded-lg hover:bg-surface-elevated transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {passwordSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                {/* 1. Current Password */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      required
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                      className="input-field pr-10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary hover:text-textPrimary"
                    >
                      {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* 2. New Password */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Min. 6 characters"
                      className="input-field pr-10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary hover:text-textPrimary"
                    >
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* 3. Confirm New Password */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Re-enter new password"
                      className="input-field pr-10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary hover:text-textPrimary"
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="btn-primary text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                  >
                    {passwordSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Check size={16} /> Update Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Photo Crop & Cloudinary Upload Modal */}
      <ProfilePhotoCropModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        onPhotoUploaded={() => {
          setProfileSuccess('Profile picture updated and saved to Cloudinary!');
          setTimeout(() => setProfileSuccess(''), 4000);
        }}
      />
    </div>
  );
};

export default Profile;

import React, { useState, useEffect } from 'react';
import { getAdminStatus, registerInitialAdmin, loginAdmin } from '../../services/admin.service';
import { Shield, Lock, Mail, User, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminAuth = ({ onLoginSuccess }) => {
  const [hasAdmin, setHasAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const data = await getAdminStatus();
      setHasAdmin(data.hasAdmin);
      // If no admin exists yet, default to initial admin registration mode
      setIsRegisterMode(!data.hasAdmin);
    } catch (err) {
      setError('Failed to connect to backend service.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isRegisterMode) {
      if (!formData.username.trim()) {
        setError('Username is required');
        return;
      }
      if (!formData.email.trim()) {
        setError('Email is required');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      setSubmitting(true);
      try {
        const data = await registerInitialAdmin({
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password
        });
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.admin));
        setSuccess('Admin account provisioned successfully! Loading dashboard...');
        setTimeout(() => {
          onLoginSuccess(data.admin);
        }, 1000);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Registration failed');
      } finally {
        setSubmitting(false);
      }
    } else {
      // Sign in mode
      if (!formData.email.trim() || !formData.password) {
        setError('Email and password are required');
        return;
      }

      setSubmitting(true);
      try {
        const data = await loginAdmin({
          email: formData.email.trim(),
          password: formData.password
        });
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.admin));
        setSuccess('Authenticated successfully! Redirecting...');
        setTimeout(() => {
          onLoginSuccess(data.admin);
        }, 800);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Invalid admin credentials');
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-textSecondary">Verifying admin configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Decorative gradient glow backgrounds */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-cyan-600/20 via-indigo-600/20 to-purple-600/20 blur-[130px] rounded-full pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card max-w-md w-full p-8 rounded-2xl border border-border/80 shadow-2xl relative z-10"
      >
        {/* Brand / Title */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-0.5 mx-auto mb-3 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-surface rounded-2xl flex items-center justify-center">
              <Shield className="text-cyan-400" size={26} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-textPrimary tracking-tight">AI LifeOS Admin</h1>
          <p className="text-xs text-textSecondary mt-1">
            {isRegisterMode
              ? 'First-Time Setup: Provision Primary Administrator'
              : 'Authorized administrative session access only'}
          </p>
        </div>

        {/* Security Notice for First-Time Setup */}
        {isRegisterMode && (
          <div className="mb-5 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-start gap-2.5">
            <Shield size={16} className="shrink-0 mt-0.5" />
            <span>
              <strong>Initial Admin Provisioning:</strong> No admin exists in the database. Creating this account will permanently disable public admin registration.
            </span>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username (only for registration) */}
          {isRegisterMode && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                Admin Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="e.g. system_admin"
                  className="input-field pl-9 text-sm"
                />
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
              {isRegisterMode ? 'Admin Email Address' : 'Email or Username'}
            </label>
            <div className="relative">
              <input
                type={isRegisterMode ? 'email' : 'text'}
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={isRegisterMode ? 'admin@company.com' : 'admin@company.com or username'}
                className="input-field pl-9 text-sm"
              />
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password"
                className="input-field pl-9 pr-10 text-sm"
              />
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary hover:text-textPrimary"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password (only for registration) */}
          {isRegisterMode && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-textSecondary mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  className="input-field pl-9 pr-10 text-sm"
                />
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full btn-primary py-2.5 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 mt-2"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span>{isRegisterMode ? 'Complete Admin Setup' : 'Sign In to Admin Panel'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-border/60 text-center">
          <a
            href="/dashboard"
            className="text-xs text-textSecondary hover:text-cyan-400 transition-colors"
          >
            ← Return to LifeOS User App
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminAuth;

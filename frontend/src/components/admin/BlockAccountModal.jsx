import React, { useState, useMemo } from 'react';
import {
  Ban, Clock, AlertTriangle, X, Check, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PRESET_DURATIONS = [
  { label: '1 Day', days: 1 },
  { label: '3 Days', days: 3 },
  { label: '7 Days', days: 7 },
  { label: '14 Days', days: 14 },
  { label: '30 Days', days: 30 }
];

const BlockAccountModal = ({ user, onClose, onConfirm, loading }) => {
  const [selectedDays, setSelectedDays] = useState(7);
  const [isCustom, setIsCustom] = useState(false);
  const [customDays, setCustomDays] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const finalDays = useMemo(() => {
    if (isCustom) {
      const parsed = parseInt(customDays, 10);
      return isNaN(parsed) || parsed < 1 ? 1 : parsed;
    }
    return selectedDays;
  }, [isCustom, customDays, selectedDays]);

  const expirationPreview = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + finalDays);
    return d.toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }, [finalDays]);

  const handleSelectPreset = (days) => {
    setIsCustom(false);
    setSelectedDays(days);
  };

  const handleCustomChange = (e) => {
    setIsCustom(true);
    setCustomDays(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for blocking this account.');
      return;
    }
    if (finalDays < 1 || finalDays > 365) {
      setError('Block duration must be between 1 and 365 days.');
      return;
    }
    setError('');
    onConfirm({ durationDays: finalDays, reason: reason.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative max-w-lg w-full rounded-3xl glass-card border border-rose-500/30 bg-surface/95 p-6 shadow-2xl space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Ban size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-textPrimary">Block User Account</h3>
              <p className="text-xs text-textSecondary">Temporarily restrict access to AI LifeOS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-textSecondary hover:text-textPrimary bg-surface-elevated/40 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Selected User Info */}
        <div className="p-3.5 rounded-2xl bg-surface-elevated/40 border border-border/70 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-textSecondary block">Target User</span>
            <span className="font-bold text-textPrimary text-sm">{user?.username}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-textSecondary block">Email</span>
            <span className="text-textSecondary font-mono">{user?.email}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Duration Selector */}
          <div>
            <label className="block text-xs font-bold text-textPrimary mb-2 flex items-center justify-between">
              <span>Select Block Duration</span>
              <span className="text-cyan-400 font-semibold">{finalDays} {finalDays === 1 ? 'Day' : 'Days'}</span>
            </label>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2.5">
              {PRESET_DURATIONS.map((preset) => (
                <button
                  type="button"
                  key={preset.days}
                  onClick={() => handleSelectPreset(preset.days)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    !isCustom && selectedDays === preset.days
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20 border border-rose-400'
                      : 'bg-surface-elevated/40 hover:bg-surface-elevated text-textSecondary hover:text-textPrimary border border-border/60'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom duration option */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="365"
                value={customDays}
                onChange={handleCustomChange}
                placeholder="Or enter custom days (e.g. 10)"
                className={`flex-1 px-3 py-2 rounded-xl text-xs bg-surface-elevated/50 border focus:outline-none transition-all ${
                  isCustom ? 'border-rose-500 text-textPrimary' : 'border-border/60 text-textSecondary'
                }`}
              />
            </div>
          </div>

          {/* Expiration Preview */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between">
            <span className="text-amber-300 flex items-center gap-1.5 font-medium">
              <Clock size={13} /> Automatic Expiry:
            </span>
            <span className="font-bold text-amber-200">{expirationPreview}</span>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-bold text-textPrimary mb-1">
              Reason for Block <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this account is being temporarily restricted (visible to user)..."
              className="w-full px-3 py-2 rounded-xl bg-surface-elevated/50 border border-border/70 focus:border-rose-500 focus:outline-none text-xs text-textPrimary placeholder:text-textSecondary/50 transition-all resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-400 font-semibold">{error}</p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-textSecondary hover:text-textPrimary bg-surface-elevated/40 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 shadow-lg shadow-rose-500/20 disabled:opacity-40 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {loading ? (
                <span>Blocking...</span>
              ) : (
                <>
                  <Ban size={14} />
                  <span>Confirm Temporary Block</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default BlockAccountModal;

import React, { useState } from 'react';
import { 
  X, 
  Clock, 
  AlertCircle, 
  Loader2, 
  Check, 
  Scissors, 
  Calendar, 
  Lock,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { adjustSlotTiming, splitSlot } from '../../services/schedule.service';

export default function SlotTimingModal({ slot, onClose, onUpdated }) {
  const [mode, setMode] = useState('edit'); // 'edit' or 'split'
  const [startTime, setStartTime] = useState(slot?.start_time || slot?.start || '10:00');
  const [endTime, setEndTime] = useState(slot?.end_time || slot?.end || '11:00');
  
  // Split mode state
  const duration = slot?.duration_minutes || 60;
  const [splitMinutes, setSplitMinutes] = useState(Math.floor(duration / 2));
  const [part1Title, setPart1Title] = useState(`${slot?.title || 'Part 1'} (Part A)`);
  const [part2Title, setPart2Title] = useState(`${slot?.title || 'Part 2'} (Part B)`);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Calculate live duration
  const getDurationString = () => {
    try {
      const [sH, sM] = startTime.split(':').map(Number);
      const [eH, eM] = endTime.split(':').map(Number);
      const sTotal = sH * 60 + sM;
      const eTotal = eH * 60 + eM;
      if (eTotal > sTotal) {
        const diff = eTotal - sTotal;
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        return `${diff} minutes (${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m` : ''})`;
      }
      return 'Invalid duration (end time must be after start time)';
    } catch {
      return '';
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!slot || slot.is_fixed) return;

    setError('');
    setSaving(true);
    try {
      const res = await adjustSlotTiming(slot.id, {
        start_time: startTime,
        end_time: endTime
      });
      if (res.success) {
        if (onUpdated) onUpdated(res.item);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to update timing due to conflict.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSplit = async (e) => {
    e.preventDefault();
    if (!slot || slot.is_fixed) return;

    if (splitMinutes <= 10 || splitMinutes >= duration - 10) {
      setError(`Split point must be between 10m and ${duration - 10}m.`);
      return;
    }

    setError('');
    setSaving(true);
    try {
      const res = await splitSlot(slot.id, {
        split_minutes: splitMinutes,
        part1_title: part1Title,
        part2_title: part2Title
      });
      if (res.success) {
        if (onUpdated) onUpdated();
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to split slot.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-card border border-border rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
              <Clock size={22} />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-textPrimary tracking-tight">
                {mode === 'edit' ? 'Edit Slot Timing' : 'Split Time Slot'}
              </h3>
              <p className="text-xs text-textSecondary truncate max-w-xs">
                {slot?.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-surface border border-border text-textSecondary hover:text-textPrimary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        {!slot?.is_fixed && (
          <div className="flex rounded-xl bg-surface-elevated p-1 mb-5 border border-border">
            <button
              onClick={() => { setMode('edit'); setError(''); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === 'edit' 
                  ? 'bg-accent/20 text-accent border border-accent/30 shadow-sm' 
                  : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              Adjust Start & End
            </button>
            <button
              onClick={() => { setMode('split'); setError(''); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'split' 
                  ? 'bg-accent/20 text-accent border border-accent/30 shadow-sm' 
                  : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              <Scissors size={13} />
              <span>Split into 2 Slots</span>
            </button>
          </div>
        )}

        {/* Error notice */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Fixed commitment notice */}
        {slot?.is_fixed ? (
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-xs text-indigo-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-indigo-400">
              <Lock size={15} />
              <span>Locked Fixed Commitment</span>
            </div>
            <p>
              This commitment is locked to your exact specified time ({slot.time_range}). It cannot be moved or split by the scheduling engine.
            </p>
          </div>
        ) : mode === 'edit' ? (
          /* Edit Form */
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-textSecondary uppercase tracking-wider">
                  Start Time (24h)
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm font-mono text-textPrimary focus:outline-none focus:border-accent"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-textSecondary uppercase tracking-wider">
                  End Time (24h)
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm font-mono text-textPrimary focus:outline-none focus:border-accent"
                  required
                />
              </div>
            </div>

            <div className="p-3 bg-surface-elevated/60 border border-border/80 rounded-xl text-xs text-textSecondary">
              <span>Recalculated Duration: </span>
              <strong className="text-accent">{getDurationString()}</strong>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-xs font-semibold text-textSecondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary px-5 py-2 text-xs font-bold flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Checking Conflicts...
                  </>
                ) : (
                  <>
                    <Check size={14} /> Save Timing
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Split Form */
          <form onSubmit={handleSaveSplit} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-textSecondary uppercase tracking-wider">
                  Split after (minutes)
                </span>
                <span className="font-mono text-accent font-bold">
                  {splitMinutes}m / {duration - splitMinutes}m
                </span>
              </div>
              <input
                type="range"
                min="10"
                max={duration - 10}
                step="5"
                value={splitMinutes}
                onChange={(e) => setSplitMinutes(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-textSecondary">Part 1 Title ({splitMinutes} mins)</label>
                <input
                  type="text"
                  value={part1Title}
                  onChange={(e) => setPart1Title(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-textPrimary focus:outline-none focus:border-accent"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-textSecondary">Part 2 Title ({duration - splitMinutes} mins)</label>
                <input
                  type="text"
                  value={part2Title}
                  onChange={(e) => setPart2Title(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-textPrimary focus:outline-none focus:border-accent"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-xs font-semibold text-textSecondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary px-5 py-2 text-xs font-bold flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Splitting...
                  </>
                ) : (
                  <>
                    <Scissors size={14} /> Split Activity
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

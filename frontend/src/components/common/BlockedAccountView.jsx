import React, { useState } from 'react';
import {
  ShieldAlert, Clock, HelpCircle, LogOut, Send,
  CheckCircle2, AlertCircle, X, Lock, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { submitHelpRequest } from '../../services/admin.service';

const BlockedAccountView = ({ blockedInfo, onLogout }) => {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const username = blockedInfo?.username || '';
  const email = blockedInfo?.email || '';
  const reason = blockedInfo?.block_reason || 'Administrative policy review';
  const blockedUntil = blockedInfo?.blocked_until;

  const formattedExpiry = blockedUntil
    ? new Date(blockedUntil).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : 'Pending Review';

  const handleSubmitHelp = async (e) => {
    e.preventDefault();
    if (!helpMessage.trim() || submitting) return;

    setSubmitting(true);
    setErrorMessage('');
    try {
      const res = await submitHelpRequest({
        message: helpMessage.trim(),
        email: email || 'user@example.com',
        username: username || 'User'
      });
      setSubmitResult(res);
      setHelpMessage('');
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to submit help request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-xl">
      {/* Dynamic ambient background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative max-w-lg w-full rounded-3xl glass-card border border-rose-500/30 bg-surface/95 p-6 sm:p-8 shadow-2xl text-center space-y-6"
      >
        {/* Warning Icon Badge */}
        <div className="w-18 h-18 mx-auto rounded-3xl bg-gradient-to-tr from-rose-500/20 to-amber-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-500/20">
          <ShieldAlert size={38} className="animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
            Access Restricted
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-textPrimary">
            Account Temporarily Restricted
          </h2>
          <p className="text-xs sm:text-sm text-textSecondary leading-relaxed">
            Your account has been temporarily restricted by an administrator. Access to tasks, goals, planner records, and messaging will be automatically restored when the block expires.
          </p>
        </div>

        {/* Reason & Expiration Details Box */}
        <div className="p-4 rounded-2xl bg-surface-elevated/40 border border-border/80 text-left space-y-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-textSecondary tracking-wider block">
              Reason Provided
            </span>
            <p className="text-xs font-semibold text-textPrimary mt-0.5">{reason}</p>
          </div>

          <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
            <span className="text-textSecondary flex items-center gap-1.5">
              <Clock size={13} className="text-amber-400" /> Restriction Expiry:
            </span>
            <span className="font-bold text-cyan-400">{formattedExpiry}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={() => setShowHelpModal(true)}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <HelpCircle size={15} />
            <span>Get Help / Request Review</span>
          </button>

          <button
            onClick={onLogout}
            className="w-full sm:w-auto py-3 px-5 rounded-xl text-xs font-semibold text-textSecondary hover:text-textPrimary bg-surface-elevated/40 hover:bg-surface-elevated border border-border/70 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </motion.div>

      {/* Help / Account Recovery Request Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-md w-full rounded-3xl glass-card border border-border/80 bg-surface/95 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <HelpCircle size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-textPrimary">Account Review Request</h3>
                </div>
                <button
                  onClick={() => {
                    setShowHelpModal(false);
                    setSubmitResult(null);
                  }}
                  className="p-1 text-textSecondary hover:text-textPrimary cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {submitResult ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-textPrimary">Request Submitted!</h4>
                  <p className="text-xs text-textSecondary leading-relaxed">
                    {submitResult.message}
                  </p>
                  <div className="p-3 rounded-xl bg-surface-elevated/50 border border-border text-xs">
                    <span className="text-textSecondary block text-[10px] uppercase font-bold">Request Tracking ID</span>
                    <span className="font-mono font-bold text-cyan-400 text-sm">{submitResult.requestId}</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowHelpModal(false);
                      setSubmitResult(null);
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-cyan-500 hover:bg-cyan-400 transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitHelp} className="space-y-3.5">
                  <p className="text-xs text-textSecondary">
                    Provide details explaining why you need assistance or believe your restriction was applied in error. An administrator will review your submission.
                  </p>

                  <div>
                    <label className="block text-[11px] font-semibold text-textSecondary mb-1">
                      Account Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      readOnly
                      className="w-full px-3 py-2 rounded-xl bg-surface-elevated/30 border border-border text-xs text-textSecondary cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-textSecondary mb-1">
                      Account Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      readOnly
                      className="w-full px-3 py-2 rounded-xl bg-surface-elevated/30 border border-border text-xs text-textSecondary cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-textSecondary mb-1">
                      Message / Reason for Appeal <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={helpMessage}
                      onChange={(e) => setHelpMessage(e.target.value)}
                      placeholder="Explain your situation in detail..."
                      className="w-full px-3 py-2 rounded-xl bg-surface-elevated/50 border border-border/70 focus:border-cyan-500 focus:outline-none text-xs text-textPrimary placeholder:text-textSecondary/50 transition-all resize-none"
                    />
                  </div>

                  {errorMessage && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                      <AlertCircle size={14} />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowHelpModal(false)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-textSecondary hover:text-textPrimary bg-surface-elevated/40 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!helpMessage.trim() || submitting}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-md shadow-cyan-500/20 disabled:opacity-40 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      {submitting ? (
                        <span>Sending...</span>
                      ) : (
                        <>
                          <Send size={13} />
                          <span>Submit Request</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BlockedAccountView;

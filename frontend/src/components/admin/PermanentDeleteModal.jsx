import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

export default function PermanentDeleteModal({ user, onClose, onConfirm, isDeleting }) {
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');

  if (!user) return null;

  const isValid = confirmText.trim() === 'DELETE ACCOUNT';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) {
      setError('You must type "DELETE ACCOUNT" exactly to proceed.');
      return;
    }
    setError('');
    onConfirm(confirmText.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f172a] border border-red-500/40 w-full max-w-lg rounded-2xl p-6 shadow-2xl text-slate-100 relative shadow-red-950/40">
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Permanently Delete Account</h3>
            <p className="text-xs text-red-400 font-medium">Irreversible Destructive Action</p>
          </div>
        </div>

        <div className="space-y-4 my-5 text-sm text-slate-300">
          <p className="bg-red-950/20 border border-red-500/20 p-3.5 rounded-xl text-slate-200">
            You are about to permanently delete user account <strong className="text-red-300 font-semibold">{user.name || user.username}</strong> (<code className="text-xs text-cyan-300">{user.email}</code>, ID: #{user.id}).
          </p>

          <div className="space-y-2 text-xs text-slate-400 bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
            <span className="font-semibold text-slate-200 block mb-1">What will be permanently wiped:</span>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>Profile data, authentication credentials, and session tokens</li>
              <li>All goals, tasks, habit records, notes, and calendar schedules</li>
              <li>Stored documents and physical / cloud asset files</li>
              <li>Chat conversations, direct messages, and connection links</li>
              <li>Notifications, login audit trails, and block history</li>
            </ul>
          </div>

          <p className="text-xs text-amber-300/90 font-medium">
            This action cannot be undone. Unrelated users and admin records will remain untouched.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                To confirm, type <span className="font-mono text-red-400 font-bold">DELETE ACCOUNT</span> below:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => {
                  setConfirmText(e.target.value);
                  if (error) setError('');
                }}
                disabled={isDeleting}
                placeholder="DELETE ACCOUNT"
                className="w-full bg-slate-950 border border-red-500/40 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                autoFocus
              />
              {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
            </div>

            <div className="flex justify-end items-center space-x-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isValid || isDeleting}
                className="flex items-center space-x-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-red-900/30"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Wiping Account...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

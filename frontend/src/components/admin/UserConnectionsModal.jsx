import React, { useState, useEffect } from 'react';
import { 
  Users, ArrowLeft, X, Loader2, UserCheck, Clock, Send, 
  ExternalLink, Shield, AlertCircle 
} from 'lucide-react';
import { adminService } from '../../services/admin.service';

export default function UserConnectionsModal({ user, onClose, onViewProfile }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('accepted'); // 'accepted' | 'incoming' | 'outgoing'

  useEffect(() => {
    let mounted = true;
    const fetchConnections = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        setError(null);
        const res = await adminService.getUserConnections(user.id);
        if (mounted) {
          setData(res.data);
        }
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.message || 'Failed to load user connections');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchConnections();
    return () => { mounted = false; };
  }, [user?.id]);

  if (!user) return null;

  const accepted = data?.accepted || [];
  const incoming = data?.incoming || [];
  const outgoing = data?.outgoing || [];
  const stats = data?.stats || { acceptedCount: 0, pendingIncomingCount: 0, pendingOutgoingCount: 0, totalCount: 0 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b1329] border border-cyan-500/30 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col text-slate-100 overflow-hidden relative shadow-cyan-950/40">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0f172a]/90 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs font-medium border border-slate-700/60"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Users</span>
            </button>
            <div className="h-5 w-[1px] bg-slate-800" />
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span>Connections & Network</span>
                  <span className="text-xs font-normal text-slate-400">for</span>
                  <span className="text-cyan-300 font-semibold">{user.name || user.username}</span>
                </h3>
                <p className="text-[11px] text-slate-400">User ID #{user.id} • {user.email}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onViewProfile && (
              <button
                onClick={() => {
                  onClose();
                  onViewProfile(user);
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium px-2 py-1"
              >
                View Full Profile
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-4 gap-3 px-6 py-4 bg-[#090e21] border-b border-slate-800/80">
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">Total Links</span>
              <span className="text-lg font-bold text-white">{stats.totalCount}</span>
            </div>
            <Users className="w-5 h-5 text-indigo-400/80" />
          </div>

          <div className="bg-slate-900/80 border border-emerald-500/20 p-3 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-emerald-400 block">Accepted</span>
              <span className="text-lg font-bold text-emerald-300">{stats.acceptedCount}</span>
            </div>
            <UserCheck className="w-5 h-5 text-emerald-400/80" />
          </div>

          <div className="bg-slate-900/80 border border-amber-500/20 p-3 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-amber-400 block">Incoming Requests</span>
              <span className="text-lg font-bold text-amber-300">{stats.pendingIncomingCount}</span>
            </div>
            <Clock className="w-5 h-5 text-amber-400/80" />
          </div>

          <div className="bg-slate-900/80 border border-cyan-500/20 p-3 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-cyan-400 block">Sent Requests</span>
              <span className="text-lg font-bold text-cyan-300">{stats.pendingOutgoingCount}</span>
            </div>
            <Send className="w-5 h-5 text-cyan-400/80" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 px-6 pt-3 border-b border-slate-800 bg-[#0f172a]/40 text-xs">
          <button
            onClick={() => setActiveTab('accepted')}
            className={`pb-2.5 px-3 font-semibold transition-all border-b-2 flex items-center space-x-1.5 ${
              activeTab === 'accepted'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Active Connections ({accepted.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('incoming')}
            className={`pb-2.5 px-3 font-semibold transition-all border-b-2 flex items-center space-x-1.5 ${
              activeTab === 'incoming'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Incoming Requests ({incoming.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('outgoing')}
            className={`pb-2.5 px-3 font-semibold transition-all border-b-2 flex items-center space-x-1.5 ${
              activeTab === 'outgoing'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Outgoing Requests ({outgoing.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-xs text-slate-400">Loading verified network records...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-950/20 border border-red-500/30 rounded-xl text-center space-y-2">
              <AlertCircle className="w-6 h-6 text-red-400 mx-auto" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          ) : activeTab === 'accepted' ? (
            accepted.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-2">
                <Users className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
                <p className="text-sm">No active connections established yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {accepted.map((conn) => (
                  <div
                    key={conn.connection_id || conn.connected_user_id}
                    className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center space-x-3.5 hover:border-slate-700 transition-colors"
                  >
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
                      {conn.avatar_url ? (
                        <img src={conn.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        (conn.name || conn.username || 'U')[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-white truncate">{conn.name || conn.username}</h4>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                          Connected
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{conn.email}</p>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-1">
                        <span>Since: {conn.connected_at ? new Date(conn.connected_at).toLocaleDateString() : 'N/A'}</span>
                        {conn.streak > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-amber-400">🔥 {conn.streak}d streak</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'incoming' ? (
            incoming.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-2">
                <Clock className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
                <p className="text-sm">No pending incoming connection requests.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {incoming.map((req) => (
                  <div
                    key={req.connection_id}
                    className="p-3.5 bg-slate-900/60 border border-amber-500/20 rounded-xl flex items-center justify-between hover:border-amber-500/40 transition-colors"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-sm border border-amber-500/30">
                        {(req.sender_name || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">{req.sender_name}</h4>
                        <p className="text-xs text-slate-400">{req.sender_email}</p>
                        <span className="text-[11px] text-slate-500">
                          Requested: {req.created_at ? new Date(req.created_at).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full font-medium">
                      Awaiting {user.name || user.username}&apos;s Acceptance
                    </span>
                  </div>
                ))}
              </div>
            )
          ) : (
            outgoing.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-2">
                <Send className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
                <p className="text-sm">No outgoing pending requests sent by this user.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {outgoing.map((req) => (
                  <div
                    key={req.connection_id}
                    className="p-3.5 bg-slate-900/60 border border-cyan-500/20 rounded-xl flex items-center justify-between hover:border-cyan-500/40 transition-colors"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-sm border border-cyan-500/30">
                        {(req.receiver_name || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">{req.receiver_name}</h4>
                        <p className="text-xs text-slate-400">{req.receiver_email}</p>
                        <span className="text-[11px] text-slate-500">
                          Sent: {req.created_at ? new Date(req.created_at).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-3 py-1 rounded-full font-medium">
                      Sent • Awaiting Response
                    </span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#0f172a] border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <span>Real-time database network sync</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

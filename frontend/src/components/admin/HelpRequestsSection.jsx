import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, Search, Filter, CheckCircle, Clock, AlertTriangle, 
  X, MessageSquare, Send, User, Mail, Shield, Unlock, Loader2,
  ChevronLeft, ChevronRight, RefreshCw, Eye
} from 'lucide-react';
import { adminService } from '../../services/admin.service';

export default function HelpRequestsSection({ onUnblockUser }) {
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Selected request for details modal
  const [selectedReq, setSelectedReq] = useState(null);
  const [adminResponseText, setAdminResponseText] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [unblocking, setUnblocking] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getHelpRequests({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchQuery || undefined,
        page,
        limit: 10
      });
      setRequests(res.data.requests || []);
      setPagination(res.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load help requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, page]);

  // Debounced or enter search
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRequests();
  };

  const handleOpenDetails = (req) => {
    setSelectedReq(req);
    setAdminResponseText(req.admin_response || '');
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedReq) return;
    try {
      setUpdatingStatus(true);
      const res = await adminService.updateHelpRequest(selectedReq.id, {
        status: newStatus,
        adminResponse: adminResponseText.trim()
      });
      setSelectedReq(res.data.request);
      // Refresh list
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update request');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleQuickUnblock = async () => {
    if (!selectedReq?.user_id) return;
    if (!window.confirm(`Unblock user ${selectedReq.username || selectedReq.email}? This will restore their active application access.`)) {
      return;
    }
    try {
      setUnblocking(true);
      await adminService.unblockUser(selectedReq.user_id);
      if (onUnblockUser) onUnblockUser(selectedReq.user_id);
      // Also update request to RESOLVED with unblock note if desired
      await adminService.updateHelpRequest(selectedReq.id, {
        status: 'RESOLVED',
        adminResponse: adminResponseText 
          ? `${adminResponseText} (Account unblocked by admin)` 
          : 'Account has been reviewed and unblocked by admin.'
      });
      alert('User has been unblocked successfully and request marked as Resolved.');
      fetchRequests();
      setSelectedReq(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to unblock user');
    } finally {
      setUnblocking(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'NEW':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">NEW</span>;
      case 'IN_REVIEW':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">IN REVIEW</span>;
      case 'RESOLVED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">RESOLVED</span>;
      case 'CLOSED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700/60 text-slate-300 border border-slate-600">CLOSED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0d1631] border border-slate-800 p-4 rounded-2xl">
        {/* Status Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'NEW', 'IN_REVIEW', 'RESOLVED', 'CLOSED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                statusFilter === st
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Requests' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 w-full sm:w-80">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user, email, or REQ-..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700"
          >
            Search
          </button>
          <button
            type="button"
            onClick={fetchRequests}
            title="Refresh"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Requests Table */}
      <div className="bg-[#0b1329] border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0f172a] text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Request ID</th>
                <th className="py-3.5 px-4">User Details</th>
                <th className="py-3.5 px-4">Subject & Message</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4">Submitted</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                      <span className="text-xs text-slate-400">Loading help requests...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-red-400 font-medium">
                    {error}
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                    <span>No help requests match current filters.</span>
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-300">
                      {req.request_id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{req.user_name || req.username}</div>
                      <div className="text-slate-400 text-[11px]">{req.email}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate">
                      <div className="font-medium text-slate-200">{req.subject || 'Account Assistance'}</div>
                      <div className="text-slate-400 truncate text-[11px]">{req.message}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {req.account_status === 'TEMPORARILY_BLOCKED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 inline-flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          <span>BLOCKED</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400">
                          {req.account_status || 'ACTIVE'}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                      {new Date(req.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenDetails(req)}
                        className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-medium inline-flex items-center space-x-1 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Review</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 bg-[#0f172a] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total requests)
            </span>
            <div className="flex items-center space-x-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-slate-800 disabled:opacity-40 hover:bg-slate-700 text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg bg-slate-800 disabled:opacity-40 hover:bg-slate-700 text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Request Details & Resolution Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0b1329] border border-cyan-500/40 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col text-slate-100 overflow-hidden relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0f172a]">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>Help Request</span>
                    <span className="font-mono text-cyan-300 text-xs font-semibold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                      {selectedReq.request_id}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Review user-submitted appeal and issue administrative resolution</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedReq(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar text-xs">
              
              {/* User Dossier Quick Banner */}
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white text-sm block">{selectedReq.user_name || selectedReq.username}</span>
                  <span className="text-slate-400">{selectedReq.email}</span>
                </div>
                <div className="text-right">
                  <div className="mb-1">{getStatusBadge(selectedReq.status)}</div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(selectedReq.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Block Alert Banner if user is currently blocked */}
              {selectedReq.account_status === 'TEMPORARILY_BLOCKED' && (
                <div className="p-3.5 bg-amber-950/30 border border-amber-500/40 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-amber-300 block">Account Is Temporarily Blocked</span>
                      <span className="text-slate-300 text-[11px]">
                        Restricted until {selectedReq.blocked_until ? new Date(selectedReq.blocked_until).toLocaleString() : 'N/A'}. Reason: &ldquo;{selectedReq.block_reason || 'N/A'}&rdquo;
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleQuickUnblock}
                    disabled={unblocking}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-xs whitespace-nowrap shadow"
                  >
                    {unblocking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>Unblock User</span>
                  </button>
                </div>
              )}

              {/* Subject & Message */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Subject</label>
                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 font-medium">
                  {selectedReq.subject || 'Account Recovery / Inquiry'}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">User Message / Explanation</label>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selectedReq.message}
                </div>
              </div>

              {/* Admin Response Textarea */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                  <span>Administrative Response / Resolution Notes</span>
                  <span className="text-slate-500 text-[11px]">Stored in database history</span>
                </label>
                <textarea
                  rows={3}
                  value={adminResponseText}
                  onChange={(e) => setAdminResponseText(e.target.value)}
                  placeholder="Enter notes or explanation for the resolution..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Status Update Action Bar */}
              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-400 font-medium">Set Request Status:</span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => handleUpdateStatus('IN_REVIEW')}
                    className="px-3 py-1.5 bg-amber-600/30 hover:bg-amber-600/40 text-amber-300 border border-amber-500/40 rounded-lg font-medium text-xs"
                  >
                    Mark In Review
                  </button>
                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => handleUpdateStatus('RESOLVED')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-xs shadow"
                  >
                    Mark Resolved
                  </button>
                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => handleUpdateStatus('CLOSED')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium text-xs border border-slate-700"
                  >
                    Close Request
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-[#0f172a] border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedReq(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

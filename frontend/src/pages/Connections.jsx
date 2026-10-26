import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Users, UserPlus, MessageSquare, Shield,
  Sparkles, RefreshCw, AlertCircle, CheckCircle2, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import {
  discoverUsers,
  getUserPublicProfile,
  sendConnectionRequest,
  getRequests,
  acceptRequest,
  rejectRequest,
  cancelOrDisconnect,
  getAcceptedConnections,
  getMessages,
  sendMessage
} from '../services/connection.service';
import { connectSocket, getSocket } from '../services/socket';

import DiscoverTab from '../components/connections/DiscoverTab';
import RequestsTab from '../components/connections/RequestsTab';
import ConnectionsTab from '../components/connections/ConnectionsTab';
import MessagesTab from '../components/connections/MessagesTab';
import UserProfileModal from '../components/connections/UserProfileModal';

const Connections = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuth();

  // Active tab from URL query params (default: 'discover')
  const activeTab = searchParams.get('tab') || 'discover';
  const paramUserId = searchParams.get('userId');

  // Discover state
  const [discoveredUsers, setDiscoveredUsers] = useState([]);
  const [loadingDiscover, setLoadingDiscover] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Requests state
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Accepted connections state
  const [connections, setConnections] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(false);

  // Active Messaging state
  const [activePartnerId, setActivePartnerId] = useState(paramUserId || null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  // Modals & Action loading
  const [inspectingUser, setInspectingUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusNotification, setStatusNotification] = useState(null);

  const socketRef = useRef(null);

  // Sync active partner from URL if changed
  useEffect(() => {
    if (paramUserId && paramUserId !== activePartnerId) {
      setActivePartnerId(paramUserId);
    }
  }, [paramUserId]);

  const showNotification = (message, type = 'success') => {
    setStatusNotification({ message, type });
    setTimeout(() => {
      setStatusNotification(null);
    }, 3500);
  };

  const setTab = (newTab, extraParams = {}) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', newTab);
    if (extraParams.userId) {
      params.set('userId', extraParams.userId);
    } else if (newTab !== 'messages') {
      params.delete('userId');
    }
    if (extraParams.q !== undefined) {
      if (extraParams.q) params.set('q', extraParams.q);
      else params.delete('q');
    }
    setSearchParams(params);
  };

  // 1. Initial Load of Discover & Connections
  useEffect(() => {
    fetchDiscoverUsers();
    fetchRequests();
    fetchConnections();
  }, []);

  // Fetch when search or status filter changes in Discover tab
  useEffect(() => {
    fetchDiscoverUsers();
  }, [searchQuery, statusFilter]);

  // Fetch messages when activePartnerId changes
  useEffect(() => {
    if (activePartnerId && activeTab === 'messages') {
      fetchMessages(activePartnerId);
    }
  }, [activePartnerId, activeTab]);

  // Socket.IO Setup for real-time connection requests and messaging
  useEffect(() => {
    const token = localStorage.getItem('token');
    const socket = connectSocket(token);
    socketRef.current = socket;

    if (socket) {
      // Incoming real-time message
      socket.on('new_message', (newMsg) => {
        // If message belongs to currently open conversation
        if (
          (parseInt(newMsg.sender_id) === parseInt(activePartnerId) &&
            parseInt(newMsg.recipient_id) === parseInt(currentUser?.id)) ||
          (parseInt(newMsg.sender_id) === parseInt(currentUser?.id) &&
            parseInt(newMsg.recipient_id) === parseInt(activePartnerId))
        ) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }

        // Refresh conversation list preview & unread counts
        fetchConnections(false);
      });

      // Typing indicators
      socket.on('user_typing', ({ senderId, isTyping }) => {
        if (parseInt(senderId) === parseInt(activePartnerId)) {
          setIsPartnerTyping(isTyping);
        }
      });

      // Messages read receipts
      socket.on('messages_read', ({ read_by }) => {
        if (parseInt(read_by) === parseInt(activePartnerId)) {
          setMessages((prev) =>
            prev.map((m) => (m.sender_id === currentUser?.id ? { ...m, is_read: true } : m))
          );
        }
      });

      // Real-time connection request events
      socket.on('connection_request_received', () => {
        fetchRequests(false);
        fetchDiscoverUsers(false);
      });

      socket.on('connection_request_accepted', () => {
        fetchRequests(false);
        fetchConnections(false);
        fetchDiscoverUsers(false);
      });

      socket.on('connection_request_rejected', () => {
        fetchRequests(false);
        fetchDiscoverUsers(false);
      });

      socket.on('connection_removed', () => {
        fetchConnections(false);
        fetchRequests(false);
        fetchDiscoverUsers(false);
      });
    }

    return () => {
      if (socket) {
        socket.off('new_message');
        socket.off('user_typing');
        socket.off('messages_read');
        socket.off('connection_request_received');
        socket.off('connection_request_accepted');
        socket.off('connection_request_rejected');
        socket.off('connection_removed');
      }
    };
  }, [activePartnerId, currentUser]);

  // Data Fetching Functions
  const fetchDiscoverUsers = async (showLoading = true) => {
    if (showLoading) setLoadingDiscover(true);
    try {
      const data = await discoverUsers({ search: searchQuery, status: statusFilter });
      setDiscoveredUsers(data.users || []);
    } catch (err) {
      console.error('Failed to load peers:', err);
    } finally {
      if (showLoading) setLoadingDiscover(false);
    }
  };

  const fetchRequests = async (showLoading = true) => {
    if (showLoading) setLoadingRequests(true);
    try {
      const data = await getRequests();
      setIncomingRequests(data.incoming || []);
      setOutgoingRequests(data.outgoing || []);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      if (showLoading) setLoadingRequests(false);
    }
  };

  const fetchConnections = async (showLoading = true) => {
    if (showLoading) setLoadingConnections(true);
    try {
      const data = await getAcceptedConnections();
      setConnections(data.connections || []);
    } catch (err) {
      console.error('Failed to load connections:', err);
    } finally {
      if (showLoading) setLoadingConnections(false);
    }
  };

  const fetchMessages = async (partnerId) => {
    setLoadingMessages(true);
    try {
      const data = await getMessages(partnerId);
      setMessages(data.messages || []);
      // Update unread count for this partner in connections list
      setConnections((prev) =>
        prev.map((c) =>
          parseInt(c.partner.id) === parseInt(partnerId) ? { ...c, unread_count: 0 } : c
        )
      );
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Actions
  const handleConnect = async (recipientId) => {
    setActionLoading(true);
    try {
      const res = await sendConnectionRequest(recipientId);
      showNotification(res.message || 'Connection request sent successfully!');
      fetchDiscoverUsers(false);
      fetchRequests(false);
      if (inspectingUser && inspectingUser.id === recipientId) {
        setInspectingUser((prev) => ({ ...prev, connection_status: 'PENDING_OUTGOING' }));
      }
    } catch (err) {
      showNotification(err.response?.data?.message || err.message || 'Failed to send request', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async (connectionId) => {
    setActionLoading(true);
    try {
      await acceptRequest(connectionId);
      showNotification('Connection accepted! You can now send encrypted messages.');
      fetchRequests(false);
      fetchConnections(false);
      fetchDiscoverUsers(false);
      if (inspectingUser) {
        setInspectingUser((prev) => ({ ...prev, connection_status: 'CONNECTED' }));
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to accept request', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (connectionId) => {
    setActionLoading(true);
    try {
      await rejectRequest(connectionId);
      showNotification('Connection request declined');
      fetchRequests(false);
      fetchDiscoverUsers(false);
      if (inspectingUser) {
        setInspectingUser((prev) => ({ ...prev, connection_status: 'NONE' }));
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to reject request', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrDisconnect = async (connectionId) => {
    setActionLoading(true);
    try {
      await cancelOrDisconnect(connectionId);
      showNotification('Connection removed');
      fetchRequests(false);
      fetchConnections(false);
      fetchDiscoverUsers(false);
      if (inspectingUser) {
        setInspectingUser((prev) => ({ ...prev, connection_status: 'NONE' }));
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to remove connection', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenChat = (partnerId) => {
    setActivePartnerId(partnerId);
    setTab('messages', { userId: partnerId });
  };

  const handleSendMessage = async (partnerId, content) => {
    setSendingMessage(true);
    try {
      const res = await sendMessage(partnerId, content);
      if (res.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.message.id)) return prev;
          return [...prev, res.message];
        });
      }
      fetchConnections(false);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to send message', 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleViewProfile = async (peer) => {
    try {
      const profileData = await getUserPublicProfile(peer.id);
      setInspectingUser(profileData.profile || peer);
    } catch (err) {
      setInspectingUser(peer);
    }
  };

  const handleTypingStart = (recipientId) => {
    socketRef.current?.emit('typing_start', { recipientId });
  };

  const handleTypingStop = (recipientId) => {
    socketRef.current?.emit('typing_stop', { recipientId });
  };

  // Calculate total unread messages across all connections
  const totalUnreadMessages = connections.reduce(
    (acc, curr) => acc + (curr.unread_count || 0),
    0
  );

  return (
    <div className="min-h-screen bg-background text-textPrimary px-4 sm:px-8 py-6 relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {statusNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center gap-2 backdrop-blur-md ${
              statusNotification.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
            }`}
          >
            {statusNotification.type === 'error' ? (
              <AlertCircle size={16} className="text-rose-400" />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-400" />
            )}
            <span>{statusNotification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar with Prominent Back to Goals Navigation */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-border/60">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/goals')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface/80 hover:bg-surface border border-border/70 hover:border-cyan-500/40 text-textSecondary hover:text-textPrimary transition-all text-sm font-semibold group cursor-pointer shadow-sm shrink-0"
            title="Return to Strategic Goals & Career Guidance"
          >
            <ArrowLeft size={16} className="text-cyan-400 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Goals</span>
          </button>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-textPrimary flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-500/30">
                <Users size={22} className="text-cyan-400" />
              </div>
              Connections & Encrypted Messaging
            </h1>
            <p className="text-xs text-textSecondary mt-0.5">
              Discover peers enrolled in strategic goals, collaborate, and exchange private AES-256-GCM encrypted messages.
            </p>
          </div>
        </div>

        {/* Global Encryption Status Pill */}
        <div className="flex items-center gap-2 self-start md:self-center px-3 py-1.5 rounded-xl bg-surface/80 border border-cyan-500/20 text-xs text-textSecondary">
          <Lock size={13} className="text-cyan-400" />
          <span>Authenticated Encryption Active</span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center gap-2 border-b border-border/60 overflow-x-auto pb-1">
          {[
            {
              id: 'discover',
              label: 'Discover Peers',
              icon: Sparkles,
              count: discoveredUsers.length > 0 ? discoveredUsers.length : null
            },
            {
              id: 'requests',
              label: 'Connection Requests',
              icon: UserPlus,
              count: incomingRequests.length > 0 ? incomingRequests.length : null,
              countColor: 'bg-cyan-500'
            },
            {
              id: 'connections',
              label: 'My Connections',
              icon: Users,
              count: connections.length > 0 ? connections.length : null
            },
            {
              id: 'messages',
              label: 'Encrypted Messages',
              icon: MessageSquare,
              count: totalUnreadMessages > 0 ? totalUnreadMessages : null,
              countColor: 'bg-rose-500'
            }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-t-2xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                  isActive
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                    : 'border-transparent text-textSecondary hover:text-textPrimary hover:bg-surface/40'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-cyan-400' : 'text-textSecondary'} />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold text-white ${
                      tab.countColor || 'bg-cyan-600/80'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="max-w-7xl mx-auto">
        {activeTab === 'discover' && (
          <DiscoverTab
            users={discoveredUsers}
            loading={loadingDiscover}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              setTab('discover', { q });
            }}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onConnect={handleConnect}
            onOpenChat={handleOpenChat}
            onAccept={handleAccept}
            onReject={handleReject}
            onViewProfile={handleViewProfile}
            actionLoading={actionLoading}
          />
        )}

        {activeTab === 'requests' && (
          <RequestsTab
            incoming={incomingRequests}
            outgoing={outgoingRequests}
            loading={loadingRequests}
            onAccept={handleAccept}
            onReject={handleReject}
            onCancel={handleCancelOrDisconnect}
            onViewProfile={handleViewProfile}
            actionLoading={actionLoading}
          />
        )}

        {activeTab === 'connections' && (
          <ConnectionsTab
            connections={connections}
            loading={loadingConnections}
            onOpenChat={handleOpenChat}
            onViewProfile={handleViewProfile}
            onDisconnect={handleCancelOrDisconnect}
            onGoToDiscover={() => setTab('discover')}
            actionLoading={actionLoading}
          />
        )}

        {activeTab === 'messages' && (
          <MessagesTab
            connections={connections}
            activePartnerId={activePartnerId}
            onSelectPartner={(partnerId) => {
              setActivePartnerId(partnerId);
              setTab('messages', { userId: partnerId });
            }}
            messages={messages}
            loadingMessages={loadingMessages}
            onSendMessage={handleSendMessage}
            sendingMessage={sendingMessage}
            currentUserId={currentUser?.id}
            onGoToDiscover={() => setTab('discover')}
            isPartnerTyping={isPartnerTyping}
            onTypingStart={handleTypingStart}
            onTypingStop={handleTypingStop}
          />
        )}
      </div>

      {/* User Goals & Public Profile Modal */}
      {inspectingUser && (
        <UserProfileModal
          user={inspectingUser}
          onClose={() => setInspectingUser(null)}
          onConnect={handleConnect}
          onOpenChat={handleOpenChat}
          onAccept={handleAccept}
          onReject={handleReject}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
};

export default Connections;

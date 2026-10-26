import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Lock, Shield, Check, CheckCheck, Clock,
  ArrowLeft, Search, MessageSquare, Sparkles, User, Globe, Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessagesTab = ({
  connections = [],
  activePartnerId,
  onSelectPartner,
  messages = [],
  loadingMessages,
  onSendMessage,
  sendingMessage,
  currentUserId,
  onGoToDiscover,
  isPartnerTyping = false,
  onTypingStart,
  onTypingStop
}) => {
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const activeConnection = connections.find(
    (c) => parseInt(c.partner.id) === parseInt(activePartnerId)
  );

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (onTypingStart && activePartnerId) {
      onTypingStart(activePartnerId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (onTypingStop) onTypingStop(activePartnerId);
      }, 1500);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || sendingMessage || !activePartnerId) return;
    const content = inputText.trim();
    setInputText('');
    if (onTypingStop) onTypingStop(activePartnerId);
    onSendMessage(activePartnerId, content);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredConnections = connections.filter((conn) => {
    if (!searchTerm) return true;
    return conn.partner.name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="h-[75vh] min-h-[550px] glass-card border border-border/80 rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl bg-surface/90">
      {/* 1. Conversations Sidebar (Left Panel) */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-border/70 flex flex-col bg-surface/60 ${
          activePartnerId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Sidebar Header & Search */}
        <div className="p-4 border-b border-border/60 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
              <MessageSquare size={16} className="text-cyan-400" />
              Conversations
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/20">
              AES-256-GCM
            </span>
          </div>

          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-elevated/40 border border-border/60 focus:border-cyan-500 focus:outline-none text-xs text-textPrimary placeholder:text-textSecondary/50"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/30">
          {connections.length === 0 ? (
            <div className="p-8 text-center text-textSecondary space-y-3">
              <MessageSquare size={28} className="mx-auto text-cyan-400/40" />
              <p className="text-xs font-semibold text-textPrimary">No conversations yet</p>
              <p className="text-[11px] text-textSecondary leading-relaxed">
                Connect with peers in your goals to unlock private encrypted chats.
              </p>
              <button
                onClick={onGoToDiscover}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-cyan-500 hover:bg-cyan-400 shadow-md shadow-cyan-500/20 cursor-pointer transition-all"
              >
                Find Peers
              </button>
            </div>
          ) : filteredConnections.length === 0 ? (
            <div className="p-6 text-center text-xs text-textSecondary">
              No conversations match "{searchTerm}"
            </div>
          ) : (
            filteredConnections.map((conn) => {
              const partner = conn.partner;
              const isSelected = parseInt(partner.id) === parseInt(activePartnerId);
              const lastMsg = conn.last_message;

              return (
                <div
                  key={conn.connection_id}
                  onClick={() => onSelectPartner(partner.id)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-500/15 border-l-4 border-l-cyan-400'
                      : 'hover:bg-surface-elevated/40'
                  }`}
                >
                  {partner.avatar ? (
                    <img
                      src={partner.avatar}
                      alt={partner.name}
                      className="w-11 h-11 rounded-xl object-cover border border-cyan-500/30 shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                      {getInitials(partner.name)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={`text-xs truncate ${
                          isSelected ? 'font-bold text-textPrimary' : 'font-semibold text-textPrimary'
                        }`}
                      >
                        {partner.name}
                      </h4>
                      {lastMsg && (
                        <span className="text-[10px] text-textSecondary/60 shrink-0">
                          {formatMessageTime(lastMsg.created_at)}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-textSecondary truncate mt-0.5">
                      {partner.primary_goal?.title ? (
                        <span className="text-cyan-400/90 font-medium">
                          {partner.primary_goal.title}
                        </span>
                      ) : (
                        'Active Connection'
                      )}
                    </p>

                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[11px] text-textSecondary/70 truncate pr-2">
                        {lastMsg ? lastMsg.content : 'No messages yet. Say hello!'}
                      </p>

                      {conn.unread_count > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-extrabold shadow-sm shadow-rose-500/30 animate-pulse shrink-0">
                          {conn.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Active Chat View (Right Panel) */}
      <div
        className={`flex-1 flex flex-col bg-background/50 ${
          !activePartnerId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeConnection ? (
          <>
            {/* Chat Header */}
            <div className="p-3.5 sm:p-4 border-b border-border/70 bg-surface/80 backdrop-blur-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back Button */}
                <button
                  onClick={() => onSelectPartner(null)}
                  className="md:hidden p-1.5 rounded-lg text-textSecondary hover:text-textPrimary bg-surface-elevated/40"
                  title="Back to conversation list"
                >
                  <ArrowLeft size={16} />
                </button>

                {activeConnection.partner.avatar ? (
                  <img
                    src={activeConnection.partner.avatar}
                    alt={activeConnection.partner.name}
                    className="w-10 h-10 rounded-xl object-cover border border-cyan-500/40 shrink-0 shadow-sm"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                    {getInitials(activeConnection.partner.name)}
                  </div>
                )}

                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-textPrimary truncate flex items-center gap-2">
                    {activeConnection.partner.name}
                    {isPartnerTyping && (
                      <span className="text-[10px] text-cyan-400 font-normal animate-pulse">
                        typing...
                      </span>
                    )}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-textSecondary">
                    <span className="text-cyan-400 truncate">
                      {activeConnection.partner.primary_goal?.title || 'Goal Partner'}
                    </span>
                    {activeConnection.partner.timezone && (
                      <span className="hidden sm:inline-block text-textSecondary/60">
                        • {activeConnection.partner.timezone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Encryption Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-semibold shrink-0">
                <Shield size={12} className="text-cyan-400" />
                <span className="hidden sm:inline">AES-256-GCM Encrypted</span>
                <span className="sm:hidden">Encrypted</span>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
              {/* Encryption Notice Banner */}
              <div className="py-2 px-3 mx-auto max-w-md rounded-xl bg-surface-elevated/40 border border-border/50 text-center text-[10px] text-textSecondary/80 flex items-center justify-center gap-1.5">
                <Lock size={11} className="text-cyan-400 shrink-0" />
                <span>
                  Messages are encrypted at rest with authenticated AES-256-GCM. Original plaintext is never stored in the database.
                </span>
              </div>

              {loadingMessages ? (
                <div className="py-16 text-center text-xs text-textSecondary">
                  <div className="w-6 h-6 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin mx-auto mb-2" />
                  Decrypting message history...
                </div>
              ) : messages.length === 0 ? (
                <div className="py-16 text-center text-textSecondary space-y-2">
                  <Sparkles size={24} className="mx-auto text-cyan-400/40" />
                  <p className="text-xs font-semibold text-textPrimary">Encrypted conversation started</p>
                  <p className="text-[11px] max-w-xs mx-auto">
                    Say hello to {activeConnection.partner.name} and share progress on your goals!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = parseInt(msg.sender_id) === parseInt(currentUserId);

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-md text-xs leading-relaxed break-words ${
                          isMine
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none shadow-cyan-500/10'
                            : 'bg-surface border border-border/80 text-textPrimary rounded-tl-none shadow-black/20'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>

                      <div
                        className={`flex items-center gap-1 text-[10px] text-textSecondary/60 mt-1 px-1 ${
                          isMine ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span>{formatMessageTime(msg.created_at)}</span>
                        {isMine && (
                          <span>
                            {msg.is_read ? (
                              <CheckCheck size={12} className="text-cyan-400" title="Read" />
                            ) : (
                              <Check size={12} className="text-textSecondary/70" title="Delivered" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator bubble */}
              {isPartnerTyping && (
                <div className="flex items-center gap-2 text-textSecondary text-xs">
                  <div className="p-2.5 rounded-2xl rounded-tl-none bg-surface border border-border/70 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[10px] text-textSecondary/60">typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSend}
              className="p-3 sm:p-4 border-t border-border/70 bg-surface/90 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder={`Encrypted message to ${activeConnection.partner.name}...`}
                className="flex-1 py-2.5 px-4 rounded-xl bg-surface-elevated/50 border border-border/70 focus:border-cyan-500 focus:outline-none text-xs text-textPrimary placeholder:text-textSecondary/50 transition-all"
                disabled={sendingMessage}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || sendingMessage}
                className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-cyan-500/20 transition-all cursor-pointer shrink-0"
                title="Send encrypted message"
              >
                <Send size={16} />
              </button>
            </form>
          </>
        ) : (
          /* Empty Chat state (no partner selected on desktop) */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-textSecondary space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <MessageSquare size={32} />
            </div>
            <h3 className="text-base font-bold text-textPrimary">Your Encrypted Messages</h3>
            <p className="text-xs text-textSecondary max-w-sm leading-relaxed">
              Select a connected peer from the left panel to view message history and send real-time encrypted messages.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesTab;

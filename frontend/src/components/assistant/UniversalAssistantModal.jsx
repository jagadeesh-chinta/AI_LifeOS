import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Calendar,
  ListTodo,
  TrendingUp,
  Brain,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ecosystemService from '../../services/ecosystem.service';

const QUICK_PROMPTS = [
  "What should I focus on today?",
  "Show my incomplete tasks and deadlines",
  "Which Career Guidance topics should I revise?",
  "Suggest an optimized timetable for my remaining tasks",
  "Summarize my weekly productivity and habits"
];

export default function UniversalAssistantModal({
  isOpen,
  onClose,
  initialContext = null,
  onActionCompleted
}) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I am your Universal LifeOS Assistant. I have secure, authorized access to your tasks, schedule, career roadmap, and habits. How can I help you optimize your day or achieve your goals?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionExecuting, setActionExecuting] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    setInputValue('');
    const userMsg = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await ecosystemService.sendAssistantMessage({
        message: text,
        contextTopic: initialContext?.topic || null,
        contextTask: initialContext?.task || null,
        contextGoal: initialContext?.goal || null
      });

      if (res.success) {
        const assistantMsg = {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          text: res.answer,
          actionProposal: res.actionProposal || null,
          proposalId: res.proposalId || res.chatId || null,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'assistant',
            text: "I encountered a momentary issue processing your request. Please try again.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: err?.response?.data?.message || "Error connecting with your LifeOS AI assistant.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (msgIndex, proposal) => {
    if (!proposal) return;
    setActionExecuting(msgIndex);
    try {
      const res = await ecosystemService.executeAssistantAction({
        proposalId: proposal.id || `prop-${Date.now()}`,
        actionType: proposal.type,
        actionData: proposal.previewData,
        confirmed: true
      });

      if (res.success) {
        setMessages(prev => {
          const updated = [...prev];
          updated[msgIndex] = {
            ...updated[msgIndex],
            actionProposal: {
              ...updated[msgIndex].actionProposal,
              executed: true,
              executionResult: res.message || 'Action executed successfully in your LifeOS database.'
            }
          };
          return updated;
        });
        if (onActionCompleted) onActionCompleted(res);
      } else {
        alert(res.message || 'Action execution was rejected.');
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Error executing action.');
    } finally {
      setActionExecuting(null);
    }
  };

  const handleRejectAction = (msgIndex) => {
    setMessages(prev => {
      const updated = [...prev];
      updated[msgIndex] = {
        ...updated[msgIndex],
        actionProposal: {
          ...updated[msgIndex].actionProposal,
          rejected: true
        }
      };
      return updated;
    });
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-center p-0 sm:p-5 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`glass-card border border-border/80 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col bg-surface-elevated/95 transition-all duration-200 ${
          isExpanded 
            ? 'w-full h-full sm:w-[90vw] sm:h-[90vh]' 
            : 'w-full h-[90vh] sm:w-[620px] sm:h-[680px]'
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border/70 bg-surface/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-textPrimary">Universal LifeOS Assistant</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Online & Authorized
                </span>
              </div>
              <p className="text-[11px] text-textSecondary">
                Context-aware across your tasks, habits, roadmap, and schedule.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-xl hover:bg-surface border border-transparent hover:border-border text-textSecondary hover:text-textPrimary transition-colors"
              title={isExpanded ? "Collapse view" : "Expand view"}
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-surface border border-transparent hover:border-border text-textSecondary hover:text-textPrimary transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Chat History */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {messages.map((m, idx) => (
            <div
              key={m.id || idx}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-textSecondary font-mono">
                {m.sender === 'user' ? (
                  <><span>You</span> • <span>{m.timestamp}</span></>
                ) : (
                  <>
                    <span className="text-purple-400 font-bold">LifeOS AI</span> • <span>{m.timestamp}</span>
                  </>
                )}
              </div>

              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[88%] sm:max-w-[80%] whitespace-pre-wrap relative group ${
                  m.sender === 'user'
                    ? 'bg-cyan-500 text-black font-medium rounded-tr-none shadow-md'
                    : 'bg-surface border border-border/80 text-textPrimary rounded-tl-none shadow-sm'
                }`}
              >
                {m.text}

                {/* Copy button for AI replies */}
                {m.sender === 'assistant' && (
                  <button
                    onClick={() => handleCopy(m.text, idx)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md bg-surface-elevated border border-border text-textSecondary hover:text-textPrimary transition-all cursor-pointer"
                    title="Copy response"
                  >
                    {copiedIndex === idx ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                )}
              </div>

              {/* Action Proposal Card */}
              {m.actionProposal && (
                <div className="mt-2.5 max-w-[88%] sm:max-w-[80%] p-4 rounded-2xl bg-surface/80 border border-purple-500/40 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                      <Sparkles size={11} /> Safe Action Proposal
                    </span>
                    <span className="text-[10px] font-mono text-textSecondary">Requires Your Confirmation</span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-textPrimary">
                      {m.actionProposal.title || 'Proposed System Action'}
                    </h4>
                    <p className="text-[11px] text-textSecondary mt-0.5">
                      {m.actionProposal.description || 'This will create or update records in your authorized workspace.'}
                    </p>
                  </div>

                  {/* Preview Data Box */}
                  {m.actionProposal.previewData && (
                    <div className="p-2.5 rounded-xl bg-surface border border-border text-[11px] font-mono text-cyan-300 space-y-1">
                      {Object.entries(m.actionProposal.previewData).map(([key, val]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-textSecondary capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span className="truncate max-w-[180px] font-semibold">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Execution controls */}
                  {!m.actionProposal.executed && !m.actionProposal.rejected && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleConfirmAction(idx, m.actionProposal)}
                        disabled={actionExecuting === idx}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                      >
                        {actionExecuting === idx ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                        Confirm & Execute Action
                      </button>
                      <button
                        onClick={() => handleRejectAction(idx)}
                        disabled={actionExecuting === idx}
                        className="py-1.5 px-3 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-xs font-semibold text-textSecondary cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {m.actionProposal.executed && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 size={15} />
                      <span>{m.actionProposal.executionResult || 'Action executed successfully in your LifeOS database.'}</span>
                    </div>
                  )}

                  {m.actionProposal.rejected && (
                    <div className="text-[11px] text-textSecondary italic flex items-center gap-1">
                      <XCircle size={13} /> Action suggestion dismissed.
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-surface border border-border/60 w-fit text-xs text-purple-400">
              <Loader2 size={14} className="animate-spin" />
              <span>Analyzing authorized LifeOS records...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Bar */}
        <div className="px-4 py-2 bg-surface/40 border-t border-border/40 overflow-x-auto flex gap-2 no-scrollbar">
          {QUICK_PROMPTS.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(p)}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-elevated border border-border text-[11px] text-textSecondary hover:text-textPrimary whitespace-nowrap cursor-pointer transition-all"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-border/70 bg-surface/70">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything about your tasks, schedule, career, or habits..."
              disabled={loading}
              className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-xs text-textPrimary placeholder:text-textSecondary focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || loading}
              className="p-2.5 rounded-xl bg-cyan-500 text-black hover:bg-cyan-400 font-bold transition-all disabled:opacity-40 cursor-pointer shadow-md"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

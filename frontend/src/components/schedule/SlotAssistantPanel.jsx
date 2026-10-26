import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Sparkles, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Loader2, 
  Lock, 
  Scissors, 
  Edit3, 
  ArrowRight, 
  Bot, 
  User, 
  Check, 
  ChevronRight,
  RefreshCw,
  Zap,
  HelpCircle,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSlotChat, sendSlotMessage, updateSlotPlan, adjustSlotTiming } from '../../services/schedule.service';

export default function SlotAssistantPanel({
  slot,
  onClose,
  onSlotUpdated,
  onOpenTimingModal,
  onToggleComplete
}) {
  const [loadingChat, setLoadingChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  
  // Checklist State
  const [actionPlan, setActionPlan] = useState([]);
  const [newStepText, setNewStepText] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);
  const [planSavedNotice, setPlanSavedNotice] = useState(false);

  // Quick timing adjustments
  const [adjustingTiming, setAdjustingTiming] = useState(false);
  const [timingError, setTimingError] = useState('');

  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!slot || !slot.id) return;
    loadChatAndPlan();
  }, [slot?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const loadChatAndPlan = async () => {
    setLoadingChat(true);
    setTimingError('');
    try {
      const data = await getSlotChat(slot.id);
      if (data.success) {
        setMessages(data.messages || []);
        setSuggestedPrompts(data.suggested_prompts || []);
        if (Array.isArray(data.action_plan)) {
          setActionPlan(data.action_plan);
        } else if (slot.action_plan && Array.isArray(slot.action_plan)) {
          setActionPlan(slot.action_plan);
        } else {
          // Initialize default checklist based on title
          setActionPlan([
            { id: '1', text: `Review requirements and materials for ${slot.title}`, completed: false },
            { id: '2', text: 'Execute focused study / working session without distraction', completed: false },
            { id: '3', text: 'Summarize key takeaways and track remaining questions', completed: false }
          ]);
        }
      }
    } catch (err) {
      console.warn('Failed to load slot chat:', err);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || sending) return;

    setInputText('');
    setSending(true);

    // Optimistic user message
    const tempUserMsg = {
      id: Date.now(),
      sender: 'user',
      message: text,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await sendSlotMessage(slot.id, text);
      if (res.success && res.reply) {
        setMessages(prev => [...prev, res.reply]);
        if (res.action_plan && Array.isArray(res.action_plan) && res.action_plan.length > 0) {
          setActionPlan(res.action_plan);
        }
        if (res.suggested_prompts && Array.isArray(res.suggested_prompts)) {
          setSuggestedPrompts(res.suggested_prompts);
        }
      }
    } catch (err) {
      console.error('Send message error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          message: 'Sorry, I encountered a temporary connection issue. Please try again or rephrase your request.',
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  // Checklist actions
  const toggleStep = async (stepId) => {
    const updated = actionPlan.map(item => 
      item.id === stepId ? { ...item, completed: !item.completed } : item
    );
    setActionPlan(updated);
    saveChecklist(updated);
  };

  const addStep = (e) => {
    e?.preventDefault();
    if (!newStepText.trim()) return;
    const newStep = {
      id: `step_${Date.now()}`,
      text: newStepText.trim(),
      completed: false
    };
    const updated = [...actionPlan, newStep];
    setActionPlan(updated);
    setNewStepText('');
    saveChecklist(updated);
  };

  const removeStep = (stepId) => {
    const updated = actionPlan.filter(i => i.id !== stepId);
    setActionPlan(updated);
    saveChecklist(updated);
  };

  const saveChecklist = async (planToSave) => {
    setSavingPlan(true);
    try {
      await updateSlotPlan(slot.id, planToSave);
      setPlanSavedNotice(true);
      setTimeout(() => setPlanSavedNotice(false), 2000);
      if (onSlotUpdated) {
        onSlotUpdated({ ...slot, action_plan: planToSave });
      }
    } catch (err) {
      console.error('Failed to save checklist:', err);
    } finally {
      setSavingPlan(false);
    }
  };

  // Quick duration adjust: +15m or -15m
  const handleQuickAdjust = async (deltaMinutes) => {
    if (slot.is_fixed) return;
    setAdjustingTiming(true);
    setTimingError('');
    try {
      const res = await adjustSlotTiming(slot.id, { duration_delta: deltaMinutes });
      if (res.success && res.item) {
        if (onSlotUpdated) onSlotUpdated(res.item);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Timing conflict detected';
      setTimingError(msg);
    } finally {
      setAdjustingTiming(false);
    }
  };

  // Status computation & visual tags
  const getStatusBadge = () => {
    if (slot.completed) {
      return (
        <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
          <CheckCircle2 size={13} /> Completed
        </span>
      );
    }
    if (slot.status === 'IN_PROGRESS') {
      return (
        <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5 animate-pulse">
          <Clock size={13} /> In Progress
        </span>
      );
    }
    if (slot.status === 'MISSED') {
      return (
        <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
          <AlertCircle size={13} /> Missed
        </span>
      );
    }
    if (slot.is_fixed) {
      return (
        <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center gap-1.5">
          <Lock size={12} /> Fixed Commitment
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase bg-slate-500/15 text-slate-300 border border-slate-500/30 flex items-center gap-1.5">
        <Clock size={13} /> Upcoming
      </span>
    );
  };

  const durationMin = slot.duration_minutes || 60;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25 }}
      className="bg-surface border border-border/80 rounded-3xl shadow-2xl flex flex-col h-full max-h-[880px] overflow-hidden"
    >
      {/* Top Header */}
      <div className="p-5 md:p-6 border-b border-border/70 bg-surface-elevated/40 flex items-start justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {getStatusBadge()}
            {slot.priority && (
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                slot.priority.toLowerCase() === 'urgent'
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : slot.priority.toLowerCase() === 'high'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }`}>
                {slot.priority} Priority
              </span>
            )}
            <span className="text-xs text-textSecondary font-mono bg-surface px-2 py-0.5 rounded-md border border-border">
              {durationMin} mins
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-extrabold text-textPrimary tracking-tight">
            {slot.title}
          </h2>

          <div className="flex items-center gap-2 text-xs md:text-sm text-accent font-mono font-medium">
            <Clock size={15} />
            <span>{slot.time_range || `${slot.start_time} – ${slot.end_time}`}</span>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-surface border border-border text-textSecondary hover:text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer"
          title="Close Assistant Panel"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 custom-scrollbar">
        {/* Timing Conflict Error Alert */}
        {timingError && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs md:text-sm text-red-400 flex items-center gap-2.5">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{timingError}</span>
          </div>
        )}

        {/* Why this activity is scheduled & Context */}
        <div className="bg-surface-elevated/50 border border-border/60 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
            <Sparkles size={14} />
            <span>Why this activity is scheduled</span>
          </div>
          <p className="text-xs md:text-sm text-textSecondary leading-relaxed">
            {slot.description || 'Intelligently positioned in your focus window to maximize cognitive stamina, balance preparation before fixed commitments, and prevent time overlaps.'}
          </p>

          {slot.task_id && (
            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-textSecondary">
              <span>Linked User Task: <strong>#{slot.task_id}</strong></span>
              <span className="text-emerald-400 font-medium">Synced with My Tasks</span>
            </div>
          )}
        </div>

        {/* Quick Timing & Status Controls */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-textSecondary">
            Timing & Status Actions
          </span>
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Toggle Complete */}
            <button
              onClick={() => onToggleComplete && onToggleComplete(slot)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                slot.completed
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                  : 'bg-surface hover:bg-surface-elevated border-border text-textPrimary hover:border-emerald-500/40'
              }`}
            >
              {slot.completed ? <Check size={14} /> : <Circle size={14} />}
              <span>{slot.completed ? 'Mark Incomplete' : 'Mark Completed'}</span>
            </button>

            {/* Edit Timing Modal */}
            <button
              onClick={() => onOpenTimingModal && onOpenTimingModal(slot)}
              disabled={slot.is_fixed}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-surface hover:bg-surface-elevated border border-border hover:border-accent/40 text-textPrimary transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title={slot.is_fixed ? "Fixed commitments cannot be shifted" : "Edit exact timing"}
            >
              <Edit3 size={14} className="text-accent" />
              <span>Edit Timing</span>
            </button>

            {/* Quick +15m */}
            {!slot.is_fixed && (
              <>
                <button
                  onClick={() => handleQuickAdjust(15)}
                  disabled={adjustingTiming}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-surface hover:bg-surface-elevated border border-border text-textSecondary hover:text-textPrimary transition-all cursor-pointer"
                  title="Extend by 15 minutes"
                >
                  +15m
                </button>
                <button
                  onClick={() => handleQuickAdjust(-15)}
                  disabled={adjustingTiming || durationMin <= 15}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-surface hover:bg-surface-elevated border border-border text-textSecondary hover:text-textPrimary transition-all cursor-pointer"
                  title="Shorten by 15 minutes"
                >
                  -15m
                </button>
              </>
            )}
          </div>
        </div>

        {/* Editable Step-by-Step Checklist */}
        <div className="space-y-3 bg-surface-elevated/30 border border-border/60 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-textPrimary">
              <CheckCircle2 size={15} className="text-accent" />
              <span>Action Plan Checklist</span>
              <span className="text-[11px] font-mono text-textSecondary bg-surface px-2 py-0.5 rounded-full border border-border">
                {actionPlan.filter(i => i.completed).length}/{actionPlan.length}
              </span>
            </div>

            {planSavedNotice && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold animate-fade-in">
                <Check size={13} /> Saved
              </span>
            )}
          </div>

          <div className="space-y-2">
            {actionPlan.map((step) => (
              <div
                key={step.id}
                className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-surface/60 transition-colors group"
              >
                <button
                  onClick={() => toggleStep(step.id)}
                  className="mt-0.5 text-textSecondary hover:text-accent transition-colors cursor-pointer flex-shrink-0"
                >
                  {step.completed ? (
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  ) : (
                    <Circle size={16} />
                  )}
                </button>
                <span className={`text-xs md:text-sm flex-1 leading-snug ${
                  step.completed ? 'line-through text-textSecondary/60' : 'text-textPrimary'
                }`}>
                  {step.text}
                </span>
                <button
                  onClick={() => removeStep(step.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-500 transition-opacity cursor-pointer flex-shrink-0"
                  title="Delete item"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Add Item Input */}
          <form onSubmit={addStep} className="flex items-center gap-2 pt-2 border-t border-border/40">
            <input
              type="text"
              value={newStepText}
              onChange={(e) => setNewStepText(e.target.value)}
              placeholder="Add checklist action..."
              className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-xs text-textPrimary placeholder:text-textSecondary focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={!newStepText.trim()}
              className="p-2 bg-accent/20 hover:bg-accent/30 text-accent rounded-xl border border-accent/40 disabled:opacity-40 cursor-pointer transition-colors"
            >
              <Plus size={15} />
            </button>
          </form>
        </div>

        {/* CONTEXTUAL AI MINI-CHATBOT */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-textPrimary">
              <Bot size={16} className="text-accent" />
              <span>Slot Assistant Chatbot</span>
            </div>
            <span className="text-[11px] text-textSecondary">
              Tailored to {slot.title}
            </span>
          </div>

          {/* Quick Prompt Chips */}
          {suggestedPrompts.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {suggestedPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={sending}
                  className="text-[11px] font-medium bg-surface hover:bg-surface-elevated text-textSecondary hover:text-accent border border-border hover:border-accent/30 rounded-xl px-3 py-1.5 transition-all text-left flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Zap size={11} className="text-accent flex-shrink-0" />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          )}

          {/* Chat Messages Container */}
          <div className="bg-surface-elevated/40 border border-border/70 rounded-2xl p-4 min-h-[220px] max-h-[360px] overflow-y-auto space-y-3.5 custom-scrollbar">
            {loadingChat ? (
              <div className="flex flex-col items-center justify-center py-10 text-textSecondary text-xs gap-2">
                <Loader2 size={20} className="animate-spin text-accent" />
                <span>Loading slot assistant...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-xs text-textSecondary space-y-2">
                <Bot size={28} className="mx-auto text-accent opacity-70" />
                <p className="font-semibold text-textPrimary">How can I assist your focus for this session?</p>
                <p className="max-w-xs mx-auto">
                  Ask me to break down your topics into a timed plan, generate practice questions, explain difficult concepts, or revise key points.
                </p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={msg.id || index}
                  className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender !== 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center text-accent flex-shrink-0 mt-0.5">
                      <Bot size={15} />
                    </div>
                  )}

                  <div className={`p-3 rounded-2xl text-xs md:text-sm max-w-[85%] leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-accent/90 to-primary/90 text-white font-medium rounded-tr-sm shadow-md'
                      : 'bg-surface border border-border text-textPrimary rounded-tl-sm shadow-sm'
                  }`}>
                    {msg.message}
                  </div>

                  {msg.sender === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-textSecondary flex-shrink-0 mt-0.5">
                      <User size={15} />
                    </div>
                  )}
                </div>
              ))
            )}

            {sending && (
              <div className="flex items-center gap-2 text-xs text-accent p-2">
                <Loader2 size={14} className="animate-spin" />
                <span>AI assistant is formulating your response...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask for topic breakdown, explanations, quiz, or revision..."
              disabled={sending}
              className="flex-1 bg-surface border border-border rounded-2xl px-4 py-2.5 text-xs md:text-sm text-textPrimary placeholder:text-textSecondary focus:outline-none focus:border-accent shadow-sm"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="p-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-primary text-white shadow-md hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all cursor-pointer flex-shrink-0"
              title="Send message"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* Panel Bottom Footer */}
      <div className="p-4 border-t border-border/70 bg-surface-elevated/40 flex items-center justify-between text-xs text-textSecondary">
        <span>Slot ID: #{slot.id || 'draft'}</span>
        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded-xl bg-surface hover:bg-surface-elevated border border-border font-semibold text-textPrimary transition-colors cursor-pointer"
        >
          Back to Schedule
        </button>
      </div>
    </motion.div>
  );
}

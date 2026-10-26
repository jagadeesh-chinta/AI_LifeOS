import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Sparkles, 
  Code, 
  Send, 
  Loader2, 
  Bot, 
  User, 
  Lightbulb, 
  Zap, 
  BookOpen, 
  HelpCircle,
  Copy,
  Check,
  BrainCircuit,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { askTopicAssistant } from '../../services/career.service';
import TopicQuizModal from './TopicQuizModal';

export default function TopicDetailModal({
  topic,
  technology,
  stageNumber,
  goalId,
  goalTitle,
  onClose,
  onToggleComplete
}) {
  const [copied, setCopied] = useState(false);
  const [messages, setMessages] = useState([]);
  const [queryInput, setQueryInput] = useState('');
  const [askingAi, setAskingAi] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [currentMastery, setCurrentMastery] = useState(topic?.mastery_score ?? (topic?.completed ? 30 : 0));

  if (!topic) return null;

  const handleCopyCode = () => {
    if (!topic.code_example) return;
    navigator.clipboard.writeText(topic.code_example);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAskAI = async (promptToSend) => {
    const text = (promptToSend || queryInput).trim();
    if (!text || askingAi) return;

    setQueryInput('');
    setAskingAi(true);

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const topicContext = {
        id: topic.id,
        topic_title: topic.title,
        short_description: topic.short_description,
        technology_name: technology?.name,
        stage_name: `Stage ${stageNumber}`,
        key_concepts: topic.key_concepts
      };

      const res = await askTopicAssistant(goalId, stageNumber, topicContext, text);
      if (res.success && res.answer) {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'assistant',
            text: res.answer,
            provider: res.provider
          }
        ]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          text: 'I ran into a temporary issue connecting with the AI mentor. Please try asking again!'
        }
      ]);
    } finally {
      setAskingAi(false);
    }
  };

  const quickPrompts = [
    `Explain ${topic.title} with a real-world analogy`,
    `Give me a 3-question quick quiz on this topic`,
    `What are common senior interview questions on this?`,
    `Show me a common pitfall or bug to avoid`
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="glass-card border border-border/80 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-border/70 bg-surface-elevated/40 flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                {technology?.name || 'Technology Module'}
              </span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                topic.difficulty === 'Advanced'
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  : topic.difficulty === 'Intermediate'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }`}>
                {topic.difficulty || 'Beginner'}
              </span>
              <span className="text-xs text-textSecondary font-mono flex items-center gap-1">
                <Clock size={12} className="text-accent" />
                {topic.estimated_time || '45 mins'}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                <Award size={12} /> Mastery: {currentMastery}%
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-textPrimary tracking-tight">
              {topic.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Circular completion button in header */}
            <button
              onClick={() => onToggleComplete(topic)}
              className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer text-xs font-bold ${
                topic.completed
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                  : 'bg-surface hover:bg-surface-elevated border-border text-textSecondary hover:border-emerald-500/40 hover:text-emerald-400'
              }`}
              title={topic.completed ? "Click to mark incomplete" : "Click to mark complete"}
            >
              {topic.completed ? (
                <>
                  <CheckCircle2 size={17} className="text-emerald-400 fill-emerald-500/20" />
                  <span className="hidden sm:inline">Completed</span>
                </>
              ) : (
                <>
                  <Circle size={17} className="text-textSecondary hover:text-emerald-400" />
                  <span className="hidden sm:inline">Mark Done</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-surface border border-border text-textSecondary hover:text-textPrimary hover:bg-surface-elevated transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar text-xs sm:text-sm">
          
          {/* What it means */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
              <BookOpen size={14} />
              What you need to know
            </h3>
            <p className="text-textSecondary leading-relaxed text-sm">
              {topic.short_description}
            </p>
          </div>

          {/* Why it is important */}
          {topic.why_important && (
            <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 space-y-1">
              <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 text-cyan-400">
                <Sparkles size={13} /> Why this matters for {goalTitle}
              </span>
              <p className="text-xs leading-relaxed text-cyan-200/90">
                {topic.why_important}
              </p>
            </div>
          )}

          {/* Key Concepts */}
          {topic.key_concepts && topic.key_concepts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-textSecondary">
                Key Concepts to Master
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {topic.key_concepts.map((concept, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-surface-elevated border border-border text-xs font-medium text-textPrimary"
                  >
                    • {concept}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Code or Implementation Example */}
          {topic.code_example && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-textSecondary flex items-center gap-1.5">
                  <Code size={13} className="text-accent" />
                  Code / Implementation Example
                </span>
                <button
                  onClick={handleCopyCode}
                  className="text-[11px] text-textSecondary hover:text-accent flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-[#090d16] border border-border/80 text-xs font-mono text-cyan-200 overflow-x-auto leading-relaxed shadow-inner">
                <code>{topic.code_example}</code>
              </pre>
            </div>
          )}

          {/* Practical Hands-on Challenge */}
          {topic.practical_exercise && (
            <div className="p-4 rounded-2xl bg-surface-elevated/60 border border-border space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Lightbulb size={14} /> Practical Exercise / Hands-On Challenge
              </span>
              <p className="text-xs md:text-sm text-textPrimary leading-relaxed">
                {topic.practical_exercise}
              </p>
            </div>
          )}

          {/* Contextual AI Learning Mentor Assistant */}
          <div className="pt-4 border-t border-border/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-textPrimary flex items-center gap-1.5">
                <Bot size={15} className="text-accent" />
                AI Learning Mentor
              </span>
              <span className="text-[11px] text-textSecondary">
                Instant answers & practice quizzes
              </span>
            </div>

            {/* Quick Prompts */}
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleAskAI(p)}
                  disabled={askingAi}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-surface hover:bg-surface-elevated border border-border hover:border-accent/40 text-textSecondary hover:text-accent transition-all cursor-pointer flex items-center gap-1"
                >
                  <Zap size={10} className="text-accent" />
                  <span>{p}</span>
                </button>
              ))}
            </div>

            {/* AI Conversation Container */}
            {messages.length > 0 && (
              <div className="bg-surface-elevated/40 border border-border/70 rounded-2xl p-3.5 space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.sender !== 'user' && (
                      <div className="w-6 h-6 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center text-accent shrink-0 mt-0.5">
                        <Bot size={13} />
                      </div>
                    )}
                    <div className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap max-w-[85%] ${
                      m.sender === 'user'
                        ? 'bg-accent text-black font-semibold rounded-tr-none'
                        : 'bg-surface border border-border text-textPrimary rounded-tl-none'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}

                {askingAi && (
                  <div className="flex items-center gap-2 text-xs text-accent p-1">
                    <Loader2 size={13} className="animate-spin" />
                    <span>AI Mentor is thinking...</span>
                  </div>
                )}
              </div>
            )}

            {/* Ask AI Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskAI();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder={`Ask any question about ${topic.title}...`}
                disabled={askingAi}
                className="flex-1 bg-surface border border-border rounded-xl px-3.5 py-2 text-xs text-textPrimary placeholder:text-textSecondary focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={!queryInput.trim() || askingAi}
                className="p-2 rounded-xl bg-accent text-black font-bold hover:scale-105 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/70 bg-surface-elevated/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onToggleComplete(topic)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                topic.completed
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                  : 'bg-emerald-500 text-black hover:bg-emerald-400 border-emerald-500'
              }`}
            >
              {topic.completed ? (
                <>
                  <CheckCircle2 size={15} /> Completed (Click to Unmark)
                </>
              ) : (
                <>
                  <Check size={15} /> Mark Topic as Completed
                </>
              )}
            </button>

            <button
              onClick={() => setShowQuizModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-purple-500/40 bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 flex items-center gap-2 cursor-pointer transition-all"
            >
              <BrainCircuit size={15} /> Take Mastery Quiz
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-xs font-semibold text-textSecondary cursor-pointer"
          >
            Close Details
          </button>
        </div>

        {/* Skill Mastery Quiz Modal */}
        <TopicQuizModal
          isOpen={showQuizModal}
          onClose={() => setShowQuizModal(false)}
          topic={topic}
          technology={technology}
          stageNumber={stageNumber}
          goalId={goalId}
          onQuizCompleted={(res) => {
            if (res?.masteryScore !== undefined) {
              setCurrentMastery(res.masteryScore);
            }
          }}
        />
      </motion.div>
    </div>
  );
}

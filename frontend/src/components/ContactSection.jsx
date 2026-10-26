import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Send, 
  Check, 
  Copy, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  ChevronDown, 
  ArrowUp, 
  HelpCircle,
  MessageCircle,
  Zap,
  CheckCircle2
} from 'lucide-react';

const TOPICS = [
  { id: 'general', label: 'General', placeholder: 'Tell us how we can help you with AI LifeOS...' },
  { id: 'features', label: 'Feature Request', placeholder: 'What feature or pillar would supercharge your workflow?' },
  { id: 'support', label: 'Tech Support', placeholder: 'Describe what issue you are running into...' },
  { id: 'enterprise', label: 'Enterprise & Team', placeholder: 'Tell us about your team size and scheduling needs...' },
];

const FAQS = [
  {
    q: 'How does AI LifeOS auto-schedule my day?',
    a: 'AI LifeOS analyzes your fixed commitments, task priorities, energy levels, and habit goals to dynamically calculate optimal, distraction-free time slots for high-impact focus work.'
  },
  {
    q: 'Is my personal schedule and data private?',
    a: 'Absolutely. We adhere to enterprise-grade end-to-end encryption. Your personal notes, schedule, and habit trends are never shared or used to train public language models.'
  },
  {
    q: 'Can I sync with Google and Outlook Calendar?',
    a: 'Yes! AI LifeOS seamlessly integrates with Google Calendar and Outlook with two-way sync, preventing double-bookings automatically.'
  }
];

const ContactSection = () => {
  const [activeTopic, setActiveTopic] = useState('general');
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('hello@ailifeos.com');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setSubmitting(true);
    
    // Simulate swift asynchronous sending
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 900);
  };

  const handleReset = () => {
    setFormData({ name: '', email: '', message: '' });
    setSubmitted(false);
  };

  return (
    <div id="contact" className="relative bg-transparent text-white pt-24 pb-16 overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      <div className="max-w-[1320px] mx-auto px-6 lg:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wider uppercase mb-4">
            <Sparkles size={14} />
            Direct Communication & Support
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Get in touch with our team
          </h2>
          <p className="text-slate-400 text-base md:text-lg leading-relaxed">
            Have questions, feedback, or need tailored enterprise onboarding? Reach us directly or send a quick note below.
          </p>
        </div>

        {/* 2-Column Efficient Contact Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-20">
          
          {/* Left Column: Direct Info, Response Metrics & Quick FAQs (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Live Status & Response Card */}
            <div className="bg-[#0e1526]/80 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-sm font-semibold text-slate-200">Support Online</span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">
                  Active 24/7
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                    <Clock size={18} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Avg Response</div>
                    <div className="text-sm font-bold text-white">&lt; 2 hours</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Privacy</div>
                    <div className="text-sm font-bold text-white">100% Encrypted</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Email Chip with 1-Click Copy */}
            <div className="bg-[#0e1526]/80 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                    <Mail size={18} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Direct Inquiries</div>
                    <div className="text-sm font-semibold text-white">hello@ailifeos.com</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    copied
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                  }`}
                  title="Copy email to clipboard"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copy
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <a
                  href="mailto:hello@ailifeos.com"
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 transition-colors"
                >
                  Open in mail client →
                </a>
                <span className="text-xs text-slate-500">San Francisco, CA</span>
              </div>
            </div>

            {/* Instant Quick FAQs */}
            <div className="bg-[#0e1526]/80 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl">
              <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <HelpCircle size={15} className="text-blue-400" />
                Quick Answers
              </div>

              <div className="space-y-3">
                {FAQS.map((faq, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div
                      key={idx}
                      className="border border-white/10 rounded-xl overflow-hidden transition-colors bg-white/[0.02]"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        className="w-full text-left p-3.5 flex items-center justify-between text-xs md:text-sm font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer"
                      >
                        <span>{faq.q}</span>
                        <ChevronDown
                          size={16}
                          className={`text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="px-3.5 pb-3.5 text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-2"
                          >
                            {faq.a}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column: Sleek Instant Contact Form (7 cols) */}
          <div className="lg:col-span-7">
            <div className="bg-[#0e1526]/90 backdrop-blur-xl rounded-2xl p-7 md:p-9 border border-white/10 shadow-2xl relative">
              
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="py-12 text-center flex flex-col items-center"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/10">
                      <CheckCircle2 size={36} />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Message received!</h3>
                    <p className="text-slate-400 text-sm max-w-md mx-auto mb-8 leading-relaxed">
                      Thank you for contacting AI LifeOS. Our team has received your message regarding{' '}
                      <span className="text-blue-400 font-semibold">
                        {TOPICS.find((t) => t.id === activeTopic)?.label}
                      </span>
                      . We will follow up at <span className="text-white font-medium">{formData.email}</span> shortly.
                    </p>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-all border border-white/10 cursor-pointer"
                    >
                      Send another message
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    {/* Topic selector pills */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
                        Inquiry Topic
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {TOPICS.map((topic) => {
                          const isSelected = activeTopic === topic.id;
                          return (
                            <button
                              key={topic.id}
                              type="button"
                              onClick={() => setActiveTopic(topic.id)}
                              className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border text-center cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                                  : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/[0.08] hover:text-white'
                              }`}
                            >
                              {topic.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                          Your Name
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Alex Morgan"
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                          Your Email
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="alex@company.com"
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-slate-400">
                          Message
                        </label>
                        <span className="text-[11px] text-slate-500">
                          {formData.message.length} chars
                        </span>
                      </div>
                      <textarea
                        required
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder={
                          TOPICS.find((t) => t.id === activeTopic)?.placeholder ||
                          'How can we help your productivity workflow?'
                        }
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                      />
                    </div>

                    {/* Submit button & Back to top action */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full sm:flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {submitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Sending message...</span>
                          </>
                        ) : (
                          <>
                            <Send size={16} />
                            <span>Send Message</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/10 font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <ArrowUp size={15} />
                        <span>Back to top</span>
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

            </div>
          </div>

        </div>

        {/* Footer info bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="AI LifeOS Logo" className="h-6 object-contain opacity-80" />
            <span className="font-semibold text-slate-300">AI LifeOS</span>
            <span className="text-slate-600">•</span>
            <span>Intelligent operating system for high achievers</span>
          </div>
          <div>© {new Date().getFullYear()} AI LifeOS Inc. All rights reserved.</div>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">System Status</a>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ContactSection;

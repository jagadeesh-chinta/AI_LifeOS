import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  CheckSquare,
  Target,
  Activity,
  Calendar,
  BrainCircuit,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Sparkles
} from 'lucide-react';

const TOUR_STEPS = [
  {
    targetId: 'tour-nav-dashboard',
    title: 'Dashboard',
    explanation: 'View daily progress, important statistics, insights, and an overview of your day.',
    icon: LayoutDashboard,
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
  },
  {
    targetId: 'tour-nav-tasks',
    title: 'My Tasks',
    explanation: 'Create, organize, schedule, and track tasks with automatic Pending/Completed status.',
    icon: CheckSquare,
    badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30'
  },
  {
    targetId: 'tour-nav-goals',
    title: 'Goals',
    explanation: 'Set long-term goals, track progress, and access personalized Career Guidance roadmaps.',
    icon: Target,
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30'
  },
  {
    targetId: 'tour-nav-habits',
    title: 'Habits',
    explanation: 'Build consistent routines and monitor daily habit completion.',
    icon: Activity,
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
  },
  {
    targetId: 'tour-nav-calendar',
    title: 'Calendar',
    explanation: 'View the complete monthly calendar and explore tasks and events by date.',
    icon: Calendar,
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
  },
  {
    targetId: 'tour-nav-schedule',
    title: 'AI Planner',
    explanation: 'Generate personalized daily schedules using your actual tasks, goals, and commitments.',
    icon: BrainCircuit,
    badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
  },
  {
    targetId: 'tour-nav-notes',
    title: 'Notes',
    explanation: 'Save notes and upload documents for easy access.',
    icon: BookOpen,
    badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30'
  }
];

const OnboardingTour = () => {
  const { user, completeTour } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Check reduced-motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Cleanup helper to remove active attributes
  const cleanupTourActiveState = () => {
    document.querySelectorAll('[data-tour-active="true"]').forEach((node) => {
      node.removeAttribute('data-tour-active');
    });
  };

  // Determine if tour should start: ONLY for users where tour_completed === false
  useEffect(() => {
    if (!user) return;

    if (user.tour_completed === false) {
      // Ensure user is on /dashboard during the initial onboarding tour
      if (location.pathname !== '/dashboard') {
        navigate('/dashboard', { replace: true });
      }

      // Delay slightly so dashboard DOM and sidebar elements finish mounting smoothly
      const timer = setTimeout(() => {
        const savedStep = sessionStorage.getItem(`lifeos_tour_step_${user.id}`);
        if (savedStep !== null) {
          const stepNum = parseInt(savedStep, 10);
          if (!isNaN(stepNum) && stepNum >= 0 && stepNum < TOUR_STEPS.length) {
            setCurrentStep(stepNum);
          }
        }
        setIsOpen(true);
      }, 600);

      return () => clearTimeout(timer);
    } else {
      setIsOpen(false);
      cleanupTourActiveState();
    }
  }, [user, location.pathname, navigate]);

  // Update target rect for current step
  const updateTargetRect = useCallback(() => {
    if (!isOpen || currentStep >= TOUR_STEPS.length) return;

    const step = TOUR_STEPS[currentStep];

    // Clear previous tour-active elements
    cleanupTourActiveState();

    const el = document.getElementById(step.targetId);

    if (el) {
      el.setAttribute('data-tour-active', 'true');
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right
      });
    } else {
      // Fallback target if sidebar element not found immediately
      setTargetRect({
        top: 100 + currentStep * 55,
        left: 16,
        width: 220,
        height: 48,
        bottom: 148 + currentStep * 55,
        right: 236
      });
    }
  }, [currentStep, isOpen]);

  // Track target rect on step change, resize, scroll, and animation frames
  useEffect(() => {
    if (!isOpen) return;

    updateTargetRect();
    const rafId = requestAnimationFrame(updateTargetRect);
    const timeoutId = setTimeout(updateTargetRect, 80);

    const handleScrollResize = () => updateTargetRect();
    window.addEventListener('scroll', handleScrollResize, true);
    window.addEventListener('resize', handleScrollResize);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', handleScrollResize, true);
      window.removeEventListener('resize', handleScrollResize);
    };
  }, [currentStep, isOpen, updateTargetRect]);

  // Handle tour completion or skip
  const handleFinishOrSkip = async (isSkip = false) => {
    setIsFinishing(true);
    setIsOpen(false);
    cleanupTourActiveState();

    if (user) {
      sessionStorage.removeItem(`lifeos_tour_step_${user.id}`);
    }

    try {
      await completeTour();
    } catch (err) {
      console.error('Failed to complete onboarding tour:', err);
    } finally {
      setIsFinishing(false);
    }
  };

  // Next step handler
  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      if (user) {
        sessionStorage.setItem(`lifeos_tour_step_${user.id}`, String(next));
      }
    } else {
      handleFinishOrSkip(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleFinishOrSkip(true);
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, handleNext, handleFinishOrSkip]);

  if (!isOpen || !targetRect) return null;

  const currentTour = TOUR_STEPS[currentStep];
  const Icon = currentTour.icon;
  const isFinalStep = currentStep === TOUR_STEPS.length - 1;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const tooltipStyle = isMobile
    ? {
        position: 'fixed',
        left: '16px',
        right: '16px',
        bottom: '24px',
        zIndex: 100002
      }
    : {
        position: 'fixed',
        top: Math.max(16, Math.min(window.innerHeight - 340, targetRect.top - 12)),
        left: Math.min(window.innerWidth - 380, targetRect.right + 26),
        width: '356px',
        zIndex: 100002
      };

  const portalContent = (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[99999] pointer-events-auto"
        role="dialog"
        aria-modal="true"
        aria-label="First-Time User Tour"
      >
        {/* Transparent overlay click interceptor to skip on background click */}
        <div
          className="fixed inset-0 z-[99999]"
          onClick={() => handleFinishOrSkip(true)}
        />

        {/* 1. Spotlight Cutout & Glowing Ring: Box-shadow technique cuts through darkness */}
        <motion.div
          key="spotlight-box"
          initial={false}
          animate={{
            top: targetRect.top - 5,
            left: targetRect.left - 5,
            width: targetRect.width + 10,
            height: targetRect.height + 10
          }}
          transition={{
            type: prefersReducedMotion ? false : 'spring',
            stiffness: 320,
            damping: 30
          }}
          className="rounded-2xl pointer-events-none border-2 border-cyan-400 ring-4 ring-cyan-500/35 z-[100000] bg-cyan-400/10"
          style={{
            position: 'fixed',
            boxShadow: '0 0 0 9999px rgba(7, 11, 20, 0.78), 0 0 30px rgba(6, 182, 212, 0.7)'
          }}
        >
          {/* Pulsating Beacon in Top-Right Corner */}
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 pointer-events-none">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></span>
          </span>
        </motion.div>

        {/* 2. High-Visibility Animated Cursor/Pointer pointing directly at the active section */}
        {!isMobile && (
          <motion.div
            key={`pointer-cursor-${currentStep}`}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: [0, -8, 0] }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.2 },
              x: {
                repeat: Infinity,
                duration: 1.1,
                ease: 'easeInOut'
              }
            }}
            style={{
              position: 'fixed',
              top: targetRect.top + targetRect.height / 2 - 14,
              left: targetRect.right + 4,
              zIndex: 100003
            }}
            className="flex items-center gap-1 pointer-events-none drop-shadow-[0_0_15px_rgba(6,182,212,0.9)]"
          >
            {/* Direct Arrow Pointer pointing LEFT into the highlighted section */}
            <div className="flex items-center gap-1 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-lg ring-2 ring-cyan-300">
              <ArrowLeft size={14} className="stroke-[3] animate-pulse" />
              <span>Here</span>
            </div>
          </motion.div>
        )}

        {/* 3. Tour Tooltip Card */}
        <motion.div
          key={`tour-card-${currentStep}`}
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.94, y: 10 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 10 }}
          transition={{ duration: 0.22 }}
          style={tooltipStyle}
          className="bg-surface/95 backdrop-blur-2xl border border-border shadow-[0_20px_60px_rgba(0,0,0,0.7)] rounded-3xl p-6 text-textPrimary relative z-[100002] overflow-hidden group"
        >
          {/* Callout Arrow notch on left edge pointing back to the targeted element */}
          <div
            className="hidden md:block absolute -left-2.5 top-7 w-0 h-0 border-y-[9px] border-y-transparent border-r-[11px] border-r-surface/95 filter drop-shadow-[-3px_0_3px_rgba(0,0,0,0.4)] pointer-events-none"
          />

          {/* Ambient Top Gradient Accent */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500" />
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header: Step counter & Close Button */}
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                <Sparkles size={11} /> {currentStep + 1} of {TOUR_STEPS.length}
              </span>
            </div>

            <button
              onClick={() => handleFinishOrSkip(true)}
              className="text-textSecondary hover:text-textPrimary p-1 rounded-lg hover:bg-surface-elevated transition-colors"
              title="Skip Tour (Esc)"
              aria-label="Skip Tour"
            >
              <X size={16} />
            </button>
          </div>

          {/* Title & Section Icon */}
          <div className="flex items-center gap-3 mb-2.5">
            <div className={`p-2.5 rounded-xl border ${currentTour.badgeColor} shrink-0`}>
              <Icon size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-textPrimary tracking-tight leading-snug">
                {currentTour.title}
              </h3>
            </div>
          </div>

          {/* Explanation Text */}
          <p className="text-textSecondary text-sm leading-relaxed mb-6">
            {currentTour.explanation}
          </p>

          {/* Progress Indicator Dots */}
          <div className="flex items-center gap-1.5 mb-5">
            {TOUR_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? 'w-6 bg-gradient-to-r from-cyan-400 to-indigo-500 shadow-sm'
                    : idx < currentStep
                    ? 'w-2 bg-primary/60'
                    : 'w-1.5 bg-border'
                }`}
              />
            ))}
          </div>

          {/* Bottom Actions: Skip & Next / Finish */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/50">
            <button
              type="button"
              onClick={() => handleFinishOrSkip(true)}
              disabled={isFinishing}
              className="px-4 py-2 text-xs font-semibold text-textSecondary hover:text-textPrimary hover:bg-surface-elevated/60 rounded-xl transition-colors cursor-pointer"
            >
              Skip
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={isFinishing}
              className={`px-5 py-2.5 text-xs font-semibold rounded-xl text-white flex items-center gap-2 shadow-lg transition-all duration-200 cursor-pointer ${
                isFinalStep
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/25 hover:shadow-emerald-500/40'
                  : 'btn-primary shadow-primary/25 hover:shadow-primary/40'
              }`}
            >
              {isFinalStep ? (
                <>
                  <span>Finish</span>
                  <Check size={14} />
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(portalContent, document.body);
};

export default OnboardingTour;

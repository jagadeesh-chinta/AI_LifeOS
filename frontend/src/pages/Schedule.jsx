import React, { useState, useEffect } from 'react';
import { 
  getSchedule, 
  generateSchedule, 
  saveSchedule, 
  deleteSchedule, 
  updateScheduleItem 
} from '../services/schedule.service';
import SlotAssistantPanel from '../components/schedule/SlotAssistantPanel';
import SlotTimingModal from '../components/schedule/SlotTimingModal';
import { 
  BrainCircuit, 
  Loader2, 
  Sparkles, 
  Calendar as CalendarIcon, 
  Clock, 
  ArrowRight, 
  Zap, 
  Check, 
  Save, 
  AlertCircle, 
  RefreshCw, 
  Lightbulb,
  CheckCircle2,
  Cpu,
  Trash2,
  XCircle,
  Undo2,
  ShieldAlert,
  FileQuestion,
  Download,
  CalendarDays,
  FileText,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  BookOpen,
  GraduationCap,
  Car,
  Utensils,
  Briefcase,
  Coffee,
  Heart,
  Smile,
  Target,
  Flame,
  CheckCircle,
  Lock,
  AlertTriangle,
  Bot,
  Circle,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Dynamic Date Helpers (avoids timezone shift)
const getTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTomorrowDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// 12-Hour AM/PM Time Formatters
const formatTimeToAMPM = (timeStr) => {
  if (!timeStr) return '';
  const str = String(timeStr).trim();
  if (/am|pm/i.test(str)) return str;
  const match = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return str;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

const formatTimeRange = (startStr, endStr) => {
  const s = formatTimeToAMPM(startStr);
  const e = formatTimeToAMPM(endStr);
  if (s && e) {
    if (s === e) return s;
    return `${s} – ${e}`;
  }
  return s || e || '';
};

const parseTimeToMinutes = (str) => {
  if (!str) return null;
  const s = String(str).trim();
  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const m = parseInt(m12[2], 10);
    const ampm = m12[3]?.toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  return null;
};

// Icon Selector for Schedule Items
const getPlanIcon = (title = '', type = '', category = '') => {
  const t = title.toLowerCase();
  const typ = (type || '').toLowerCase();
  const c = (category || '').toLowerCase();

  if (t.includes('wake') || t.includes('morning') || t.includes('freshen')) {
    return <Sunrise className="text-amber-400" size={18} />;
  }
  if (t.includes('interview') || t.includes('screening') || t.includes('star answer')) {
    return <Briefcase className="text-cyan-400" size={18} />;
  }
  if (t.includes('exam') || t.includes('test') || t.includes('quiz')) {
    return <GraduationCap className="text-purple-400" size={18} />;
  }
  if (t.includes('study') || t.includes('revise') || t.includes('revision') || t.includes('read') || t.includes('learn')) {
    return <BookOpen className="text-indigo-400" size={18} />;
  }
  if (t.includes('travel') || t.includes('commute') || t.includes('drive') || t.includes('center')) {
    return <Car className="text-cyan-400" size={18} />;
  }
  if (t.includes('breakfast') || t.includes('lunch') || t.includes('dinner') || t.includes('meal') || t.includes('eat')) {
    return <Utensils className="text-emerald-400" size={18} />;
  }
  if (t.includes('coffee') || t.includes('tea') || t.includes('snack')) {
    return <Coffee className="text-amber-500" size={18} />;
  }
  if (t.includes('rest') || t.includes('recover') || t.includes('break') || t.includes('relax') || typ === 'break') {
    return <Heart className="text-rose-400" size={18} />;
  }
  if (t.includes('sleep') || t.includes('bed') || t.includes('night') || t.includes('wind down')) {
    return <Moon className="text-blue-300" size={18} />;
  }
  if (t.includes('goal') || typ === 'goal' || c.includes('goal')) {
    return <Target className="text-cyan-400" size={18} />;
  }
  if (typ === 'habit' || c.includes('habit')) {
    return <Flame className="text-amber-500" size={18} />;
  }
  if (typ === 'task' || typ === 'work' || c.includes('work') || t.includes('code') || t.includes('program')) {
    return <Briefcase className="text-sky-400" size={18} />;
  }
  return <Sparkles className="text-accent" size={18} />;
};

const Schedule = () => {
  const [date, setDate] = useState(() => getTodayDate());
  const [scheduleData, setScheduleData] = useState(() => {
    try {
      const today = getTodayDate();
      const cached = localStorage.getItem(`ailifeos_schedule_draft_${today}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isProposal, setIsProposal] = useState(() => {
    try {
      const today = getTodayDate();
      const cached = localStorage.getItem(`ailifeos_schedule_draft_${today}`);
      return !!cached;
    } catch {
      return false;
    }
  });

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('Creating your personalized schedule…');

  const [saving, setSaving] = useState(false);
  const [unsaving, setUnsaving] = useState(false);
  const [showUnsaveModal, setShowUnsaveModal] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Interactive Slot & Chat State
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [timingModalSlot, setTimingModalSlot] = useState(null);

  // Live Current Time Tracking for Today
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTimeMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Date Selection Modal State
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedDateOption, setSelectedDateOption] = useState('today'); // 'today' | 'tomorrow' | 'custom'
  const [customDate, setCustomDate] = useState(() => getTodayDate());

  // Helper to retrieve cached draft proposal for a specific date
  const getCachedDraft = (targetDate) => {
    try {
      const raw = localStorage.getItem(`ailifeos_schedule_draft_${targetDate}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    fetchSchedule(date);
    setSelectedSlot(null);
  }, [date]);

  const fetchSchedule = async (targetDate) => {
    setLoading(true);
    setErrorMessage('');

    const cachedDraft = getCachedDraft(targetDate);
    if (cachedDraft) {
      setScheduleData(cachedDraft);
      setIsProposal(true);
    }

    try {
      const data = await getSchedule(targetDate);
      const hasDbItems = data && data.schedule_items && data.schedule_items.length > 0;

      if (cachedDraft) {
        setScheduleData(cachedDraft);
        setIsProposal(true);
      } else if (hasDbItems) {
        let meta = {};
        try {
          const rawMeta = localStorage.getItem(`ailifeos_schedule_meta_${targetDate}`);
          if (rawMeta) meta = JSON.parse(rawMeta);
        } catch {}

        setScheduleData({
          ...data,
          summary: data.summary || meta.summary,
          recommendations: data.recommendations || meta.recommendations,
          ai_provider: data.ai_provider || meta.ai_provider || (data.generated_by_ai ? 'gemini' : null)
        });
        setIsProposal(false);
      } else {
        setScheduleData(null);
        setIsProposal(false);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
      if (!cachedDraft) {
        setScheduleData(null);
        setIsProposal(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // Open Date Selection Modal
  const openDateSelector = () => {
    const today = getTodayDate();
    const tomorrow = getTomorrowDate();
    if (date === today) {
      setSelectedDateOption('today');
    } else if (date === tomorrow) {
      setSelectedDateOption('tomorrow');
    } else {
      setSelectedDateOption('custom');
      setCustomDate(date);
    }
    setShowDateModal(true);
  };

  const getModalTargetDate = () => {
    if (selectedDateOption === 'today') return getTodayDate();
    if (selectedDateOption === 'tomorrow') return getTomorrowDate();
    return customDate || getTodayDate();
  };

  // Trigger AI Generation with Animated Loading
  const handleConfirmDateAndGenerate = async () => {
    const targetDate = getModalTargetDate();
    setShowDateModal(false);
    setDate(targetDate);
    setSelectedSlot(null);

    setGenerating(true);
    setGenerationProgress(5);
    setGenerationStage('Calculating remaining available hours and tasks…');
    setErrorMessage('');
    setSaveSuccessMsg('');

    const apiPromise = generateSchedule(targetDate);

    // 5-second simulated progress animation (~5000ms)
    const startTime = Date.now();
    const totalDuration = 4500;

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / totalDuration) * 100), 96);
      setGenerationProgress(pct);

      if (pct < 25) {
        setGenerationStage('Retrieving tasks, commitments, and deadlines…');
      } else if (pct < 55) {
        setGenerationStage('Prioritizing actual tasks & pre-event prep windows…');
      } else if (pct < 85) {
        setGenerationStage('Optimizing breaks, buffers, and non-overlapping slots…');
      } else {
        setGenerationStage('Finalizing realistic plan from current time…');
      }
    }, 100);

    const delayPromise = new Promise(resolve => setTimeout(resolve, totalDuration));

    try {
      const [response] = await Promise.all([apiPromise, delayPromise]);
      clearInterval(progressInterval);
      setGenerationProgress(100);
      setGenerationStage('Schedule synthesized successfully!');

      await new Promise(r => setTimeout(r, 250));

      if (response && response.success && response.data) {
        const proposal = {
          ...response.data,
          generated_by_ai: response.generated_by_ai,
          ai_provider: response.ai_provider,
          date: targetDate
        };
        setScheduleData(proposal);
        setIsProposal(true);

        try {
          localStorage.setItem(`ailifeos_schedule_draft_${targetDate}`, JSON.stringify(proposal));
        } catch (e) {
          console.error('Failed to cache schedule draft:', e);
        }
      } else {
        setErrorMessage(response?.message || 'Failed to synthesize schedule.');
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Generation error:', error);
      const msg = error?.response?.data?.message || 'Error communicating with AI Planner service.';
      setErrorMessage(msg);
    } finally {
      setGenerating(false);
      setGenerationProgress(0);
    }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleData) return;
    setSaving(true);
    setErrorMessage('');
    try {
      const items = scheduleData.schedule || scheduleData.schedule_items || [];
      const savedSchedule = await saveSchedule({
        date: date,
        schedule_items: items,
        generated_by_ai: scheduleData.generated_by_ai ?? true
      });

      try {
        localStorage.setItem(`ailifeos_schedule_meta_${date}`, JSON.stringify({
          summary: scheduleData.summary,
          recommendations: scheduleData.recommendations,
          ai_provider: scheduleData.ai_provider
        }));
      } catch {}

      try {
        localStorage.removeItem(`ailifeos_schedule_draft_${date}`);
      } catch {}

      setScheduleData(savedSchedule || {
        ...scheduleData,
        schedule_items: items
      });
      setIsProposal(false);
      setSaveSuccessMsg('Schedule successfully approved and saved in MySQL!');
      setTimeout(() => setSaveSuccessMsg(''), 5000);
    } catch (error) {
      console.error('Error saving schedule:', error);
      setErrorMessage('Failed to save schedule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardProposal = () => {
    try {
      localStorage.removeItem(`ailifeos_schedule_draft_${date}`);
    } catch {}
    setIsProposal(false);
    setSelectedSlot(null);
    fetchSchedule(date);
    setSaveSuccessMsg('Unsaved proposal discarded.');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const handleUnsaveSchedule = async () => {
    setUnsaving(true);
    setErrorMessage('');
    try {
      await deleteSchedule(date);
      try {
        localStorage.removeItem(`ailifeos_schedule_draft_${date}`);
        localStorage.removeItem(`ailifeos_schedule_meta_${date}`);
      } catch {}
      setScheduleData(null);
      setIsProposal(false);
      setSelectedSlot(null);
      setShowUnsaveModal(false);
      setSaveSuccessMsg('Schedule unsaved and removed from your Calendar & Dashboard.');
      setTimeout(() => setSaveSuccessMsg(''), 5000);
    } catch (error) {
      console.error('Error unsaving schedule:', error);
      setErrorMessage('Failed to unsave schedule. Please try again.');
    } finally {
      setUnsaving(false);
    }
  };

  // Toggle Slot Completion (Direct in Table or in Assistant Panel)
  const handleToggleComplete = async (itemToToggle) => {
    const isNowCompleted = !itemToToggle.completed;
    const items = scheduleData.schedule || scheduleData.schedule_items || [];

    const updatedItems = items.map(item => {
      const match = (item.id && item.id === itemToToggle.id) ||
        (item.title === itemToToggle.title && (item.start_time === itemToToggle.start_time || item.start === itemToToggle.start));
      if (match) {
        return { 
          ...item, 
          completed: isNowCompleted, 
          status: isNowCompleted ? 'COMPLETED' : (item.status === 'COMPLETED' ? 'UPCOMING' : item.status) 
        };
      }
      return item;
    });

    const updatedSchedule = {
      ...scheduleData,
      schedule: updatedItems,
      schedule_items: updatedItems
    };
    setScheduleData(updatedSchedule);

    if (selectedSlot && ((selectedSlot.id && selectedSlot.id === itemToToggle.id) || selectedSlot.title === itemToToggle.title)) {
      setSelectedSlot({
        ...selectedSlot,
        completed: isNowCompleted,
        status: isNowCompleted ? 'COMPLETED' : 'UPCOMING'
      });
    }

    if (itemToToggle.id) {
      try {
        await updateScheduleItem(itemToToggle.id, { completed: isNowCompleted });
      } catch (err) {
        console.warn('Failed to persist completion toggle to MySQL:', err);
      }
    }
  };

  const handleSlotUpdated = (updatedItem) => {
    if (updatedItem) {
      setSelectedSlot(updatedItem);
    }
    fetchSchedule(date);
  };

  // PDF Generation Function
  const handleDownloadPDF = () => {
    if (!scheduleData || scheduleItemsList.length === 0) return;

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });

      const formattedDate = formatDisplayDate(date);
      const pageWidth = doc.internal.pageSize.getWidth();

      // Top Navy Header Banner
      doc.setFillColor(15, 23, 42); // #0f172a
      doc.rect(0, 0, pageWidth, 85, 'F');

      // Cyan Accent Strip
      doc.setFillColor(6, 182, 212); // #06b6d4
      doc.rect(0, 82, pageWidth, 3, 'F');

      // Header Brand
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('AI LifeOS', 40, 42);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(6, 182, 212);
      doc.text('INTELLIGENT SCHEDULE & TASK SYNTHESIS', 40, 58);

      // Date Header Right
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(formattedDate, pageWidth - 40, 48, { align: 'right' });

      let startY = 115;

      // AI Synthesis Summary Box
      if (scheduleData.summary) {
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(40, startY, pageWidth - 80, 46, 6, 6, 'F');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('DAILY FOCUS & COMMITMENT SYNOPSIS:', 50, startY + 16);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        const summaryLines = doc.splitTextToSize(scheduleData.summary, pageWidth - 105);
        doc.text(summaryLines, 50, startY + 28);

        startY += 55;
      }

      // Exactly Two Columns: Time | Plan
      const tableRows = scheduleItemsList.map(item => {
        const timeRange = formatTimeRange(item.start || item.start_time, item.end || item.end_time);
        let planText = item.title;
        if (item.is_fixed) planText += ' [LOCKED COMMITMENT]';
        if (item.completed) planText += ' (COMPLETED)';
        if (item.description && item.description.trim()) {
          planText += `\n${item.description.trim()}`;
        }
        return [timeRange, planText];
      });

      autoTable(doc, {
        startY: startY,
        head: [['Time', 'Plan']],
        body: tableRows,
        margin: { left: 40, right: 40, bottom: 50 },
        theme: 'grid',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10.5,
          halign: 'left',
          cellPadding: 10
        },
        columnStyles: {
          0: { cellWidth: 160, fontStyle: 'bold', textColor: [15, 23, 42] },
          1: { textColor: [51, 65, 85] }
        },
        bodyStyles: {
          fontSize: 9.5,
          cellPadding: 9,
          lineColor: [226, 232, 240],
          lineWidth: 0.75
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        didDrawPage: () => {
          const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
          const totalPages = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(
            `Generated by AI LifeOS  •  Page ${pageNumber} of ${totalPages}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 20,
            { align: 'center' }
          );
        }
      });

      doc.save(`AI_LifeOS_Schedule_${date}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setErrorMessage('Failed to generate PDF. Please try again.');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
  };

  const scheduleItemsList = scheduleData?.schedule || scheduleData?.schedule_items || [];
  const isToday = (date === getTodayDate());

  // Determine row status for presentation
  const getItemStatus = (item) => {
    if (item.completed) return 'COMPLETED';
    if (item.status) return item.status;
    if (isToday) {
      const sM = parseTimeToMinutes(item.start_time || item.start);
      const eM = parseTimeToMinutes(item.end_time || item.end);
      if (sM !== null && eM !== null) {
        if (currentTimeMinutes >= eM) return 'MISSED';
        if (currentTimeMinutes >= sM && currentTimeMinutes < eM) return 'IN_PROGRESS';
      }
    }
    return 'UPCOMING';
  };

  return (
    <motion.div 
      className="max-w-7xl mx-auto pb-20 px-3 sm:px-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 relative">
        <motion.div variants={itemVariants}>
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/30 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.15)]">
              <BrainCircuit className="text-accent" size={30} />
            </div>
            AI Planner
          </h1>
          <p className="text-textSecondary mt-2 text-base md:text-lg flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            Interactive Intelligent Schedule & Task Assistant.
          </p>
        </motion.div>
        
        {/* Date Selector & Action Pills */}
        <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
          <button
            onClick={openDateSelector}
            className="flex items-center gap-2.5 bg-surface hover:bg-surface-elevated border border-border hover:border-accent/40 rounded-2xl p-2.5 px-4 shadow-sm transition-all cursor-pointer group"
            title="Click to select Today, Tomorrow, or Choose a Date"
          >
            <CalendarIcon className="text-accent group-hover:scale-110 transition-transform" size={18} />
            <span className="text-textPrimary font-semibold text-sm">
              {formatShortDate(date)}
            </span>
            <span className="text-xs text-accent font-medium px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20">
              {date === getTodayDate() ? 'Today' : date === getTomorrowDate() ? 'Tomorrow' : 'Custom'}
            </span>
          </button>

          {scheduleData && !generating && (
            <button
              onClick={openDateSelector}
              disabled={generating}
              className="p-2.5 px-4 bg-surface-elevated hover:bg-surface-elevated/80 border border-border hover:border-accent/40 text-textPrimary rounded-2xl transition-all flex items-center gap-2 text-sm font-semibold cursor-pointer shadow-sm"
              title="Regenerate Plan from Current Time"
            >
              <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
              <span>Regenerate</span>
            </button>
          )}
        </motion.div>
      </div>

      {/* Notifications / Alerts */}
      <AnimatePresence>
        {saveSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-500 backdrop-blur-md shadow-lg"
          >
            <CheckCircle2 size={22} className="flex-shrink-0" />
            <span className="font-semibold text-sm md:text-base">{saveSuccessMsg}</span>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-500 backdrop-blur-md shadow-lg"
          >
            <AlertCircle size={22} className="flex-shrink-0" />
            <span className="font-semibold text-sm md:text-base">{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* 1. Blank Canvas State */}
        {!scheduleData && !generating && !loading && (
          <motion.div 
            key="empty"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3 }}
            className="relative group rounded-3xl overflow-hidden mt-4"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-purple-600/10 opacity-60 blur-3xl group-hover:opacity-90 transition-opacity duration-700" />
            <div className="relative bg-surface border border-border p-12 md:p-16 text-center flex flex-col items-center justify-center min-h-[460px] shadow-xl rounded-3xl">
              <div className="w-24 h-24 bg-gradient-to-br from-primary/20 via-accent/20 to-purple-600/20 rounded-3xl flex items-center justify-center mb-8 border border-border shadow-[0_0_35px_rgba(6,182,212,0.2)]">
                <Zap className="text-accent" size={44} />
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-textPrimary mb-4 tracking-tight">
                Your day is a blank canvas
              </h2>
              <p className="text-textSecondary mb-8 max-w-xl mx-auto text-base md:text-lg leading-relaxed">
                AI LifeOS plans your remaining hours today, prioritizing your actual tasks (interviews, exams, deadlines) with contextual AI assistants inside every slot.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button 
                  onClick={openDateSelector} 
                  className="btn-primary text-base font-bold px-9 py-4 shadow-xl hover:scale-[1.03] active:scale-[0.98] transition-all flex items-center gap-3 cursor-pointer"
                >
                  <BrainCircuit size={22} />
                  <span>Generate Intelligent Plan</span>
                </button>
              </div>

              <div className="mt-8 flex items-center gap-2 text-xs text-textSecondary font-medium">
                <CalendarDays size={15} className="text-accent" />
                <span>Selected Date: <strong>{formatDisplayDate(date)}</strong></span>
              </div>
            </div>
          </motion.div>
        )}

        {/* 2. Loading Experience */}
        {generating && (
          <motion.div 
            key="generating"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="relative bg-surface border border-primary/30 p-12 md:p-16 flex flex-col items-center justify-center min-h-[460px] rounded-3xl shadow-2xl overflow-hidden mt-4"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.12)_0%,rgba(99,102,241,0.08)_45%,transparent_75%)]" />
            
            <div className="relative mb-8">
              <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-accent/20 via-primary/20 to-purple-500/20 border border-accent/40 flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.35)] animate-pulse">
                <BrainCircuit size={52} className="text-accent drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]" />
              </div>
              <div className="absolute -inset-2 rounded-full border border-dashed border-accent/40 animate-spin" style={{ animationDuration: '8s' }} />
            </div>

            <motion.h3 
              animate={{ opacity: [0.75, 1, 0.75] }} 
              transition={{ repeat: Infinity, duration: 1.8 }}
              className="text-2xl md:text-3xl font-extrabold text-textPrimary mb-3 text-center tracking-tight"
            >
              Synthesizing your intelligent schedule…
            </motion.h3>

            <p className="text-textSecondary text-sm md:text-base mb-6 text-center max-w-md">
              {generationStage}
            </p>

            {/* Smooth Progress Bar */}
            <div className="w-full max-w-md bg-surface-elevated border border-border rounded-full h-3 overflow-hidden p-0.5 shadow-inner mb-3">
              <motion.div 
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-primary to-purple-500 shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                initial={{ width: '0%' }}
                animate={{ width: `${generationProgress}%` }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              />
            </div>

            <div className="flex items-center justify-between w-full max-w-md text-xs text-textSecondary font-mono px-1">
              <span>{formatDisplayDate(date)}</span>
              <span className="font-bold text-accent">{generationProgress}%</span>
            </div>
          </motion.div>
        )}

        {/* 3. Interactive Schedule Display */}
        {scheduleData && !generating && (
          <motion.div 
            key="schedule"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6 mt-4"
          >
            {/* Status & Unsaved Options Bar */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface border border-border p-4 md:p-5 rounded-2xl shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`text-xs uppercase font-extrabold px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
                  isProposal
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                }`}>
                  {isProposal ? (
                    <>
                      <Sparkles size={14} className="animate-pulse" /> Unsaved Proposal (Draft)
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Active & Saved in MySQL
                    </>
                  )}
                </span>

                <span className="text-xs text-textSecondary flex items-center gap-1.5">
                  <Cpu size={14} className="text-accent" />
                  {scheduleData.ai_provider?.includes('hybrid') 
                    ? 'AI LifeOS Hybrid Intelligence (OpenAI + Gemini)' 
                    : scheduleData.ai_provider?.includes('openai') 
                    ? 'OpenAI Intelligence' 
                    : scheduleData.ai_provider === 'gemini' 
                    ? 'Gemini Intelligence' 
                    : 'Deterministic Constraint Scheduler'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                {isProposal ? (
                  <>
                    <button
                      onClick={handleDiscardProposal}
                      className="btn-secondary text-xs sm:text-sm flex items-center gap-1.5 text-red-500 hover:text-red-600 cursor-pointer"
                      title="Discard unsaved proposal"
                    >
                      <XCircle size={15} /> Discard Unsaved Plan
                    </button>
                    <button
                      onClick={handleSaveSchedule}
                      disabled={saving}
                      className="btn-primary flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold shadow-lg cursor-pointer"
                    >
                      {saving ? (
                        <>
                          <Loader2 size={15} className="animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <Save size={15} /> Save & Apply Schedule
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setShowUnsaveModal(true)}
                      className="btn-secondary text-xs sm:text-sm flex items-center gap-1.5 text-red-500 hover:text-red-600 cursor-pointer"
                      title="Remove saved schedule from database"
                    >
                      <Undo2 size={15} /> Unsave Schedule
                    </button>
                    <button
                      onClick={openDateSelector}
                      className="btn-secondary text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw size={14} /> Regenerate New Plan
                    </button>
                  </>
                )}
              </div>
            </motion.div>

            {/* AI Summary Card */}
            {scheduleData.summary && (
              <motion.div variants={itemVariants} className="bg-surface border-l-4 border-accent border-y border-r border-border p-5 md:p-6 rounded-2xl shadow-sm">
                <h3 className="font-bold text-lg md:text-xl text-textPrimary mb-1.5 flex items-center gap-2">
                  <Sparkles className="text-accent" size={18} /> Daily Focus & Synthesis
                </h3>
                <p className="text-textSecondary text-sm md:text-base leading-relaxed">{scheduleData.summary}</p>
              </motion.div>
            )}

            {/* MAIN TWO-COLUMN SCHEDULE TABLE + SIDE PANEL LAYOUT */}
            <div className={`grid grid-cols-1 ${selectedSlot ? 'lg:grid-cols-12 gap-6' : ''}`}>
              
              {/* LEFT: SCHEDULE TABLE */}
              <div className={`${selectedSlot ? 'lg:col-span-7' : 'w-full'} space-y-6`}>
                <motion.div variants={itemVariants} className="bg-surface border border-border rounded-3xl overflow-hidden shadow-lg">
                  {/* Table Header */}
                  <div className="p-5 md:p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-surface via-surface-elevated/40 to-surface">
                    <div>
                      <div className="flex items-center gap-2 text-accent text-xs font-bold uppercase tracking-wider mb-1">
                        <Sparkles size={14} />
                        <span>AI LifeOS Interactive Schedule</span>
                      </div>
                      <h2 className="text-xl md:text-2xl font-extrabold text-textPrimary tracking-tight">
                        Schedule for {formatDisplayDate(date)}
                      </h2>
                      <p className="text-textSecondary text-xs mt-1">
                        Click any activity row to open its <strong>contextual AI assistant & checklist</strong>.
                      </p>
                    </div>

                    <button
                      onClick={handleDownloadPDF}
                      className="px-4 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-primary text-white font-bold text-xs md:text-sm shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer w-fit"
                      title="Download formatted schedule PDF"
                    >
                      <Download size={15} />
                      <span>Download PDF</span>
                    </button>
                  </div>

                  {/* Table View: Exactly Two Main Columns: TIME | PLAN */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-surface-elevated/70">
                          <th className="py-3.5 px-4 md:px-6 text-xs font-extrabold uppercase tracking-wider text-accent w-40 md:w-56">
                            Time
                          </th>
                          <th className="py-3.5 px-4 md:px-6 text-xs font-extrabold uppercase tracking-wider text-accent">
                            Plan
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {scheduleItemsList.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="py-12 px-6 text-center text-textSecondary text-base">
                              No schedule items generated for this date. Click <strong>Regenerate</strong> or choose another date.
                            </td>
                          </tr>
                        ) : (
                          scheduleItemsList.map((item, index) => {
                            const timeRange = formatTimeRange(item.start || item.start_time, item.end || item.end_time);
                            const isSelected = selectedSlot && (
                              (selectedSlot.id && selectedSlot.id === item.id) ||
                              (selectedSlot.title === item.title && selectedSlot.start_time === item.start_time)
                            );
                            const rowStatus = getItemStatus(item);

                            return (
                              <tr
                                key={item.id || index}
                                onClick={() => setSelectedSlot(item)}
                                className={`transition-all cursor-pointer group select-none ${
                                  isSelected
                                    ? 'bg-accent/10 border-l-4 border-l-accent'
                                    : 'hover:bg-surface-elevated/50'
                                } ${item.completed ? 'opacity-70' : ''}`}
                              >
                                {/* Column 1: Time */}
                                <td className="py-3.5 md:py-4 px-4 md:px-6 align-top">
                                  <div className={`inline-flex items-center gap-1.5 font-mono font-bold text-xs text-textPrimary px-2.5 py-1 rounded-xl border transition-all ${
                                    isSelected 
                                      ? 'bg-accent/20 border-accent/40 text-accent' 
                                      : 'bg-surface-elevated/90 border-border group-hover:border-accent/40'
                                  }`}>
                                    <Clock size={13} className="text-accent opacity-80" />
                                    <span>{timeRange}</span>
                                  </div>

                                  {/* Distinct Status Pill */}
                                  <div className="mt-2 flex items-center gap-1.5">
                                    {rowStatus === 'COMPLETED' ? (
                                      <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <CheckCircle2 size={11} /> Done
                                      </span>
                                    ) : rowStatus === 'IN_PROGRESS' ? (
                                      <span className="text-[10px] font-bold uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Current
                                      </span>
                                    ) : rowStatus === 'MISSED' ? (
                                      <span className="text-[10px] font-bold uppercase text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        Missed
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-medium text-textSecondary">
                                        Upcoming
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Column 2: Plan */}
                                <td className="py-3.5 md:py-4 px-4 md:px-6 align-top">
                                  <div className="flex items-start gap-3">
                                    {/* Completion Checkbox */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleComplete(item);
                                      }}
                                      className="mt-1 text-textSecondary hover:text-emerald-400 transition-colors flex-shrink-0 cursor-pointer"
                                      title={item.completed ? "Mark incomplete" : "Mark completed"}
                                    >
                                      {item.completed ? (
                                        <CheckCircle2 size={18} className="text-emerald-400" />
                                      ) : (
                                        <Circle size={18} className="hover:scale-110 transition-transform" />
                                      )}
                                    </button>

                                    {/* Icon */}
                                    <div className="w-8 h-8 rounded-xl bg-surface-elevated border border-border flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:border-accent/40 transition-all">
                                      {getPlanIcon(item.title, item.type || item.item_type, item.category)}
                                    </div>

                                    {/* Title & Metadata */}
                                    <div className="space-y-1 flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className={`text-sm md:text-base font-bold leading-snug group-hover:text-accent transition-colors ${
                                          item.completed ? 'line-through text-textSecondary' : 'text-textPrimary'
                                        }`}>
                                          {item.title}
                                        </span>

                                        {item.is_fixed && (
                                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                                            <Lock size={10} /> Fixed Commitment
                                          </span>
                                        )}

                                        {item.priority && (
                                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                                            item.priority.toLowerCase() === 'urgent'
                                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                              : item.priority.toLowerCase() === 'high'
                                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                          }`}>
                                            {item.priority}
                                          </span>
                                        )}
                                      </div>

                                      {item.description && (
                                        <p className="text-xs text-textSecondary leading-relaxed line-clamp-2">
                                          {item.description}
                                        </p>
                                      )}

                                      {/* Interactive Hint */}
                                      <div className="flex items-center gap-2 pt-1 text-[11px] text-accent font-medium">
                                        <Bot size={12} />
                                        <span>Click to open AI Chatbot & Checklist</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>

                {/* Recommendations */}
                {scheduleData.recommendations && scheduleData.recommendations.length > 0 && (
                  <motion.div variants={itemVariants} className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
                    <h4 className="text-sm font-bold text-textPrimary mb-3 flex items-center gap-2">
                      <Lightbulb className="text-amber-500" size={17} /> Strategic Focus Recommendations
                    </h4>
                    <ul className="space-y-2 text-xs md:text-sm text-textSecondary">
                      {scheduleData.recommendations.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </div>

              {/* RIGHT: INTERACTIVE DETAIL AND CONTEXTUAL AI ASSISTANT PANEL */}
              {selectedSlot && (
                <div className="lg:col-span-5 lg:sticky lg:top-4 mt-6 lg:mt-0">
                  <SlotAssistantPanel
                    slot={selectedSlot}
                    onClose={() => setSelectedSlot(null)}
                    onSlotUpdated={handleSlotUpdated}
                    onOpenTimingModal={(s) => setTimingModalSlot(s)}
                    onToggleComplete={handleToggleComplete}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TIMING ADJUSTMENT MODAL */}
      <AnimatePresence>
        {timingModalSlot && (
          <SlotTimingModal
            slot={timingModalSlot}
            onClose={() => setTimingModalSlot(null)}
            onUpdated={() => {
              setTimingModalSlot(null);
              fetchSchedule(date);
            }}
          />
        )}
      </AnimatePresence>

      {/* DATE SELECTION MODAL: Today | Tomorrow | Choose a Date */}
      <AnimatePresence>
        {showDateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="glass-card border border-border rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-accent/15 to-purple-600/10 blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/30 flex items-center justify-center text-accent shadow-sm">
                    <CalendarDays size={22} />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-textPrimary tracking-tight">
                      Generate Intelligent Plan
                    </h3>
                    <p className="text-xs text-textSecondary">
                      Synthesizes remaining hours from current time
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowDateModal(false)}
                  className="p-2 rounded-xl bg-surface border border-border text-textSecondary hover:text-textPrimary transition-colors"
                >
                  <XCircle size={18} />
                </button>
              </div>

              {/* Date Option Cards */}
              <div className="space-y-3 mb-6">
                {/* 1. Today */}
                <button
                  type="button"
                  onClick={() => setSelectedDateOption('today')}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    selectedDateOption === 'today'
                      ? 'bg-accent/10 border-accent shadow-md shadow-accent/10'
                      : 'bg-surface hover:bg-surface-elevated border-border'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      selectedDateOption === 'today' ? 'bg-accent text-black font-extrabold' : 'bg-surface-elevated text-textSecondary'
                    }`}>
                      NOW
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-textPrimary flex items-center gap-2">
                        <span>Today</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-accent/20 text-accent">Starts from current time</span>
                      </div>
                      <div className="text-xs text-textSecondary">
                        {formatDisplayDate(getTodayDate())}
                      </div>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    selectedDateOption === 'today' ? 'border-accent bg-accent' : 'border-border'
                  }`}>
                    {selectedDateOption === 'today' && <Check size={12} className="text-black font-bold" />}
                  </div>
                </button>

                {/* 2. Tomorrow */}
                <button
                  type="button"
                  onClick={() => setSelectedDateOption('tomorrow')}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    selectedDateOption === 'tomorrow'
                      ? 'bg-accent/10 border-accent shadow-md shadow-accent/10'
                      : 'bg-surface hover:bg-surface-elevated border-border'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      selectedDateOption === 'tomorrow' ? 'bg-accent text-black font-extrabold' : 'bg-surface-elevated text-textSecondary'
                    }`}>
                      TOM
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-textPrimary">Tomorrow</div>
                      <div className="text-xs text-textSecondary">
                        {formatDisplayDate(getTomorrowDate())}
                      </div>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    selectedDateOption === 'tomorrow' ? 'border-accent bg-accent' : 'border-border'
                  }`}>
                    {selectedDateOption === 'tomorrow' && <Check size={12} className="text-black font-bold" />}
                  </div>
                </button>

                {/* 3. Choose a Date */}
                <button
                  type="button"
                  onClick={() => setSelectedDateOption('custom')}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    selectedDateOption === 'custom'
                      ? 'bg-accent/10 border-accent shadow-md shadow-accent/10'
                      : 'bg-surface hover:bg-surface-elevated border-border'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      selectedDateOption === 'custom' ? 'bg-accent text-black font-extrabold' : 'bg-surface-elevated text-textSecondary'
                    }`}>
                      <CalendarIcon size={18} />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-textPrimary">Choose a Date</div>
                      <div className="text-xs text-textSecondary">
                        Plan any custom date ahead
                      </div>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    selectedDateOption === 'custom' ? 'border-accent bg-accent' : 'border-border'
                  }`}>
                    {selectedDateOption === 'custom' && <Check size={12} className="text-black font-bold" />}
                  </div>
                </button>
              </div>

              {/* Custom Date Input */}
              {selectedDateOption === 'custom' && (
                <div className="mb-6 p-4 rounded-2xl bg-surface-elevated border border-border">
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">
                    Pick Custom Date
                  </label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-accent"
                  />
                </div>
              )}

              {/* Confirm Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowDateModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-textSecondary text-sm font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDateAndGenerate}
                  className="btn-primary px-6 py-2.5 text-sm font-bold flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  <BrainCircuit size={18} />
                  <span>Generate Plan for {selectedDateOption === 'today' ? 'Today' : selectedDateOption === 'tomorrow' ? 'Tomorrow' : 'Date'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UNSAVE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showUnsaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-border rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
                <Trash2 size={24} />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-textPrimary">Unsave Schedule?</h3>
                <p className="text-textSecondary text-xs md:text-sm mt-1">
                  This will remove the schedule for <strong>{formatDisplayDate(date)}</strong> from your database, calendar, and dashboard.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowUnsaveModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-xs font-semibold text-textSecondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnsaveSchedule}
                  disabled={unsaving}
                  className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {unsaving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  <span>Unsave Schedule</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Schedule;

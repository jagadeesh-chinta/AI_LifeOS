import React, { useState, useEffect } from 'react';
import {
  CalendarRange, Clock, Sparkles, Users, FolderHeart, X, ArrowLeft,
  ArrowRight, CheckCircle2, ChevronLeft, Plus, RefreshCw
} from 'lucide-react';
import DailyLifeBuilder from '../timetable/DailyLifeBuilder';
import AIStudyBuilder from '../timetable/AIStudyBuilder';
import FacultyTimetableBuilder from '../timetable/FacultyTimetableBuilder';
import SavedTimetablesList from '../timetable/SavedTimetablesList';
import { getSavedTimetables } from '../../services/timetable.service';

const TimetableModal = ({ isOpen, onClose }) => {
  // activeTab: 'home' | 'daily' | 'ai_study' | 'faculty' | 'saved'
  const [activeTab, setActiveTab] = useState('home');
  const [activeTimetableData, setActiveTimetableData] = useState(null);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadSavedCount();
    }
  }, [isOpen]);

  const loadSavedCount = async () => {
    try {
      const data = await getSavedTimetables();
      setSavedCount(data ? data.length : 0);
    } catch (e) {
      // ignore
    }
  };

  const handleOpenMode = (mode) => {
    setActiveTimetableData(null);
    setActiveTab(mode);
  };

  const handleOpenSavedTimetable = (timetable) => {
    setActiveTimetableData(timetable);
    setActiveTab(timetable.type);
  };

  const handleSavedSuccess = () => {
    loadSavedCount();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 min-h-screen w-full bg-background text-textPrimary flex flex-col overflow-y-auto animate-fadeIn font-sans">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-xl border-b border-border/70 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Back button & Title */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-elevated/80 border border-border text-xs sm:text-sm font-semibold text-textSecondary hover:text-textPrimary transition-all group shadow-sm"
              title="Return to Dashboard"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform text-cyan-400" />
              <span>Back to Dashboard</span>
            </button>

            <div className="h-6 w-[1px] bg-border/60 hidden sm:block"></div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                <CalendarRange size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-textPrimary">
                    Timetable Builder
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    Planning Suite
                  </span>
                </div>
                <p className="text-[11px] text-textSecondary hidden sm:block">
                  Personal daily routines, AI study plans, and faculty teaching schedules.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Mode Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-surface-elevated rounded-2xl border border-border text-xs overflow-x-auto self-start md:self-auto">
            <button
              onClick={() => {
                setActiveTimetableData(null);
                setActiveTab('home');
              }}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                activeTab === 'home'
                  ? 'bg-purple-500 text-white font-bold shadow-sm'
                  : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => handleOpenMode('daily')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'daily'
                  ? 'bg-cyan-500 text-white font-bold shadow-sm'
                  : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              <Clock size={13} />
              <span>Daily Life</span>
            </button>
            <button
              onClick={() => handleOpenMode('ai_study')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'ai_study'
                  ? 'bg-purple-500 text-white font-bold shadow-sm'
                  : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              <Sparkles size={13} />
              <span>AI Study</span>
            </button>
            <button
              onClick={() => handleOpenMode('faculty')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'faculty'
                  ? 'bg-emerald-500 text-white font-bold shadow-sm'
                  : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              <Users size={13} />
              <span>Faculty</span>
            </button>
            <button
              onClick={() => {
                setActiveTimetableData(null);
                setActiveTab('saved');
              }}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'saved'
                  ? 'bg-purple-500 text-white font-bold shadow-sm'
                  : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              <FolderHeart size={13} />
              <span>Saved</span>
              {savedCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-bold">
                  {savedCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
        {/* OVERVIEW / HOME MODE */}
        {activeTab === 'home' && (
          <div className="space-y-8 py-4">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                Select Planning Engine
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-textPrimary">
                Choose Your Timetable Engine
              </h3>
              <p className="text-xs sm:text-sm text-textSecondary leading-relaxed">
                Design personal routines, generate smart academic study schedules with AI, or build conflict-free teaching timetables for faculty and schools.
              </p>
            </div>

            {/* 3 Selectable Mode Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* Mode 1: Daily Life */}
              <div
                onClick={() => handleOpenMode('daily')}
                className="glass-card p-6 sm:p-7 rounded-3xl border border-border/80 hover:border-cyan-500/50 transition-all flex flex-col justify-between group shadow-md hover:shadow-2xl cursor-pointer relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none"></div>
                <div>
                  <div className="w-13 h-13 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center mb-5 border border-cyan-500/30 group-hover:scale-110 transition-transform">
                    <Clock size={26} />
                  </div>
                  <div className="text-[11px] font-bold uppercase text-cyan-400 tracking-wider mb-1">
                    Mode 1
                  </div>
                  <h4 className="text-xl font-bold text-textPrimary mb-1.5">
                    Daily Life Timetable
                  </h4>
                  <p className="text-xs font-semibold text-cyan-300 mb-2.5">
                    “Build your personal weekly routine.”
                  </p>
                  <p className="text-xs text-textSecondary leading-relaxed">
                    Enter personal activities, meal windows, deep work, workout routines, and rest blocks for all seven days of the week with automatic overlap conflict detection.
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-border/50 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                    Personal Routines
                  </span>
                  <button className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5 shadow-md shadow-cyan-500/20">
                    Start Routine <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Mode 2: AI Study */}
              <div
                onClick={() => handleOpenMode('ai_study')}
                className="glass-card p-6 sm:p-7 rounded-3xl border border-border/80 hover:border-purple-500/50 transition-all flex flex-col justify-between group shadow-md hover:shadow-2xl cursor-pointer relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all pointer-events-none"></div>
                <div>
                  <div className="w-13 h-13 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-5 border border-purple-500/30 group-hover:scale-110 transition-transform">
                    <Sparkles size={26} />
                  </div>
                  <div className="text-[11px] font-bold uppercase text-purple-400 tracking-wider mb-1">
                    Mode 2
                  </div>
                  <h4 className="text-xl font-bold text-textPrimary mb-1.5">
                    AI Study Timetable
                  </h4>
                  <p className="text-xs font-semibold text-purple-300 mb-2.5">
                    “Let AI create a personalized study schedule.”
                  </p>
                  <p className="text-xs text-textSecondary leading-relaxed">
                    Share your target exams, subjects, proficiency, and commitments. AI synthesizes a balanced study schedule with spaced revision and breaks.
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-border/50 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">
                    AI Optimization
                  </span>
                  <button className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5 shadow-md shadow-purple-500/20">
                    Generate Schedule <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Mode 3: Faculty Timetable */}
              <div
                onClick={() => handleOpenMode('faculty')}
                className="glass-card p-6 sm:p-7 rounded-3xl border border-border/80 hover:border-emerald-500/50 transition-all flex flex-col justify-between group shadow-md hover:shadow-2xl cursor-pointer relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none"></div>
                <div>
                  <div className="w-13 h-13 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-5 border border-emerald-500/30 group-hover:scale-110 transition-transform">
                    <Users size={26} />
                  </div>
                  <div className="text-[11px] font-bold uppercase text-emerald-400 tracking-wider mb-1">
                    Mode 3
                  </div>
                  <h4 className="text-xl font-bold text-textPrimary mb-1.5">
                    Faculty Timetable Maker
                  </h4>
                  <p className="text-xs font-semibold text-emerald-300 mb-2.5">
                    “Create balanced teaching schedules for faculty.”
                  </p>
                  <p className="text-xs text-textSecondary leading-relaxed">
                    Configure faculty teaching loads, classes, classrooms, and lab periods. Constraint solver eliminates clashing periods and balances daily teaching.
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-border/50 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                    Constraint Solver
                  </span>
                  <button className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5 shadow-md shadow-emerald-500/20">
                    Build Timetable <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Saved Archives Card */}
            {savedCount > 0 && (
              <div className="p-5 rounded-2xl border border-border bg-surface-elevated/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400">
                    <FolderHeart size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-textPrimary">
                      You have {savedCount} saved timetable{savedCount > 1 ? 's' : ''} in MySQL
                    </h4>
                    <p className="text-xs text-textSecondary">
                      Reopen, duplicate, edit, or export any previous timetable as high-resolution PDF.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => switchTab('saved')}
                  className="px-4 py-2 rounded-xl border border-purple-500/40 text-purple-300 hover:bg-purple-500/10 text-xs font-semibold transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                >
                  View Saved Archives <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* MODE 1: DAILY LIFE BUILDER */}
        {activeTab === 'daily' && (
          <DailyLifeBuilder
            initialData={activeTimetableData}
            onSaved={handleSavedSuccess}
            onBackToModes={() => switchTab('home')}
          />
        )}

        {/* MODE 2: AI STUDY BUILDER */}
        {activeTab === 'ai_study' && (
          <AIStudyBuilder
            initialData={activeTimetableData}
            onSaved={handleSavedSuccess}
          />
        )}

        {/* MODE 3: FACULTY TIMETABLE BUILDER */}
        {activeTab === 'faculty' && (
          <FacultyTimetableBuilder
            initialData={activeTimetableData}
            onSaved={handleSavedSuccess}
          />
        )}

        {/* SAVED TIMETABLES ARCHIVE */}
        {activeTab === 'saved' && (
          <SavedTimetablesList
            onOpenTimetable={handleOpenSavedTimetable}
            onNewTimetable={handleOpenMode}
          />
        )}
      </main>
    </div>
  );
};

export default TimetableModal;

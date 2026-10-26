import React, { useState } from 'react';
import Sidebar from './Sidebar';
import OnboardingTour from '../tour/OnboardingTour';
import UniversalAssistantModal from '../assistant/UniversalAssistantModal';
import { Sparkles } from 'lucide-react';

const Layout = ({ children }) => {
  const [assistantOpen, setAssistantOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-textPrimary font-sans relative overflow-hidden transition-colors duration-200">
      {/* Dynamic Ambient Background: subtle in light mode, atmospheric in dark mode */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 dark:bg-primary/10 blur-[120px] transition-all duration-300" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/5 dark:bg-accent/10 blur-[120px] transition-all duration-300" />
      </div>

      <Sidebar />
      
      <main className="flex-1 ml-20 md:ml-64 p-6 md:p-10 h-screen overflow-y-auto relative z-10">
        {children}
      </main>

      {/* Floating Universal LifeOS AI Assistant Button */}
      <button
        onClick={() => setAssistantOpen(true)}
        className="fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group cursor-pointer border border-white/25 hover:shadow-cyan-500/20"
        title="Open Universal LifeOS AI Assistant"
      >
        <Sparkles size={20} className="animate-pulse" />
        <span className="hidden sm:inline text-xs font-bold tracking-wide pr-1">LifeOS Assistant</span>
      </button>

      {/* Universal Assistant Modal */}
      <UniversalAssistantModal
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
      />

      {/* Onboarding Tour for first-time users */}
      <OnboardingTour />
    </div>
  );
};

export default Layout;

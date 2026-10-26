import React from 'react';
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle Futuristic Decorative Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-blue-900/40 to-transparent blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tl from-indigo-900/40 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl text-center">
        <h1 className="text-5xl font-extrabold text-white mb-6">About AI LifeOS</h1>
        <p className="text-xl text-slate-300 leading-relaxed mb-10">
          AI LifeOS brings your tasks, goals, habits, schedules, and everyday commitments together in one intelligent system. 
          Instead of simply helping you manage a list of tasks, AI LifeOS understands how the different parts of your life connect 
          and turns them into a realistic plan for your day.
        </p>
        <Link 
          to="/" 
          className="inline-flex items-center justify-center bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-4 rounded-xl font-medium transition-all backdrop-blur-md shadow-lg"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default About;

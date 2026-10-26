import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, useScroll, useTransform, useMotionTemplate, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, CheckSquare, Target, Brain, Calendar, Clock, ArrowUp, Cpu, BookOpen } from 'lucide-react';
import FivePillarsCarousel from '../components/FivePillarsCarousel';
import ContactSection from '../components/ContactSection';
import ThreeBackground from '../components/ThreeBackground';

const AuthPage = ({ defaultMode = 'login' }) => {
  const [mode, setMode] = useState(defaultMode); 
  
  // Auth state
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // If already authenticated, redirect to /dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Video ref
  const videoRef = useRef(null);

  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  // Pillar Carousel state
  const [activePillarIndex, setActivePillarIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePillarIndex((prev) => (prev + 1) % 5);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Navbar theme: switches to light only when white section is under navbar
  const [navLight, setNavLight] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showThreeD, setShowThreeD] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 400);

      const whiteSection = document.getElementById('about-section');
      const highlightsSection = document.getElementById('highlights-section');
      const threeDSection = document.getElementById('three-d-section');

      if (threeDSection) {
        const threeDTop = threeDSection.getBoundingClientRect().top;
        // Activate 3D background when user scrolls towards or is in the 3D / contact section
        setShowThreeD(threeDTop <= window.innerHeight + 200);
      }

      if (whiteSection && highlightsSection) {
        const whiteTop = whiteSection.getBoundingClientRect().top;
        const highlightsBottom = highlightsSection.getBoundingClientRect().bottom;
        // Navbar is 80px tall. If white section is under navbar, navLight is true
        const isOverLight = whiteTop <= 80 && highlightsBottom > 80;
        setNavLight(isOverLight);
      } else {
        const threshold = window.innerHeight - 80;
        setNavLight(window.scrollY >= threshold);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Handle navigation to sign up form & focus first field
  const handleSignUpNavClick = () => {
    setMode('register');
    setError('');
    const target = document.getElementById('auth-form-card') || document.getElementById('about-section');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => {
      const nameInput = document.getElementById('name-input');
      if (nameInput) {
        nameInput.focus();
      }
    }, 450);
    setTimeout(() => {
      const nameInput = document.getElementById('name-input');
      if (nameInput && document.activeElement !== nameInput) {
        nameInput.focus();
      }
    }, 750);
  };



  // Handle form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (mode === 'login') {
        await login(formData.email, formData.password);
        navigate('/dashboard', { replace: true });
      } else {
        if (formData.password !== formData.confirmPassword) {
            throw new Error("Passwords do not match");
        }
        await register(formData.name, formData.email, formData.password);
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message || err.response?.data?.message || `Failed to ${mode}`);
    } finally {
      setLoading(false);
    }
  };

  // Scroll animations
  const { scrollY } = useScroll();
  const videoScale = useTransform(scrollY, [0, 800], [1, 1.05]);
  const videoOpacity = useTransform(scrollY, [0, 800], [1, 0.5]);
  const blurValue = useTransform(scrollY, [0, 800], [0, 4]);
  const videoFilter = useMotionTemplate`blur(${blurValue}px)`;
  
  const whiteSectionY = useTransform(scrollY, [0, 800], [60, 0]);

  // Pillar data
  const pillars = [
    { id: '01', title: 'TASKS', desc: 'Capture and organize what needs to be done.', icon: <CheckSquare size={16} /> },
    { id: '02', title: 'HABITS MONITOR', desc: 'Build consistency and track meaningful routines.', icon: <Target size={16} /> },
    { id: '03', title: 'AI PLANNER', desc: 'Let AI transform priorities into a personalized plan.', icon: <Brain size={16} /> },
    { id: '04', title: 'SCHEDULING LIFE', desc: 'Give every important activity its own time.', icon: <Clock size={16} /> },
    { id: '05', title: 'LIFE CALENDAR', desc: 'See your complete day in one connected view.', icon: <Calendar size={16} /> },
  ];

  return (
    <div className="relative bg-black min-h-screen font-sans selection:bg-blue-500/30">
      
      {/* 
        ==================================================
        SECTION 1: HERO VIDEO (Fixed Background)
        ==================================================
      */}
      <motion.div 
        className="fixed inset-0 w-full h-[100vh] z-0 overflow-hidden"
        style={{ scale: videoScale, opacity: videoOpacity, filter: videoFilter }}
      >
        <video 
          ref={videoRef}
          src="/myproject_video.mp4"
          autoPlay 
          loop 
          muted 
          playsInline
          className="w-full h-full object-cover"
        />
        {/* Overlay to ensure text readability on video if needed */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"></div>
        <div className="absolute inset-0 bg-cyan-500/10 mix-blend-overlay"></div>
      </motion.div>

      {/* 
        ==================================================
        FIXED 3D INTERACTIVE CANVAS (Screenshots 1, 2 & 4)
        Active and visible behind 3D sections & Contact
        ==================================================
      */}
      <div 
        className={`fixed inset-0 z-[1] pointer-events-none transition-opacity duration-700 ${
          showThreeD ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <ThreeBackground />
      </div>

      {/* Floating Navbar (Fixed) */}
      <nav className={`fixed top-0 w-full h-20 flex items-center justify-between px-6 lg:px-12 z-50 transition-all duration-500 ${
        navLight
          ? 'bg-white border-b border-slate-200 shadow-sm'
          : 'bg-[#0a0f1a] border-b border-white/10 shadow-lg shadow-black/30'
      }`}>
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="AI LifeOS Logo" className="h-10 object-contain drop-shadow-lg" />
          <span className={`text-2xl font-extrabold tracking-tight transition-colors duration-500 ${navLight ? 'text-[#0F172A]' : 'text-white'}`}>AI LifeOS</span>
        </Link>
        <div className="hidden md:flex items-center gap-1 lg:gap-2">
          <button 
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={`flex items-center justify-center px-5 py-2.5 rounded-lg font-medium transition-all duration-500 text-sm cursor-pointer ${
              navLight
                ? 'text-[#0F172A] hover:bg-slate-100'
                : 'text-white hover:bg-white/10'
            }`}
          >
            Home
          </button>
          <button 
            type="button"
            onClick={() => document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' })}
            className={`flex items-center justify-center px-5 py-2.5 rounded-lg font-medium transition-all duration-500 text-sm cursor-pointer ${
              navLight
                ? 'text-[#0F172A] hover:bg-slate-100'
                : 'text-white hover:bg-white/10'
            }`}
          >
            About
          </button>
          <button 
            type="button"
            onClick={() => document.getElementById('highlights-section')?.scrollIntoView({ behavior: 'smooth' })}
            className={`flex items-center justify-center px-4 py-2.5 rounded-lg font-medium transition-all duration-500 text-sm cursor-pointer ${
              navLight
                ? 'text-[#0F172A] hover:bg-slate-100'
                : 'text-white hover:bg-white/10'
            }`}
          >
            Explore
          </button>
          <button 
            type="button"
            onClick={() => document.getElementById('three-d-section')?.scrollIntoView({ behavior: 'smooth' })}
            className={`flex items-center justify-center px-4 py-2.5 rounded-lg font-medium transition-all duration-500 text-sm cursor-pointer ${
              navLight
                ? 'text-[#0F172A] hover:bg-slate-100'
                : 'text-white hover:bg-white/10'
            }`}
          >
            Architecture
          </button>
          <button 
            type="button"
            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            className={`flex items-center justify-center px-4 py-2.5 rounded-lg font-medium transition-all duration-500 text-sm cursor-pointer ${
              navLight
                ? 'text-[#0F172A] hover:bg-slate-100'
                : 'text-white hover:bg-white/10'
            }`}
          >
            Contact
          </button>
          <div className={`w-px h-6 mx-1 transition-colors duration-500 ${navLight ? 'bg-slate-200' : 'bg-white/20'}`} />
          <button 
            type="button"
            onClick={handleSignUpNavClick}
            className={`flex items-center justify-center px-5 py-2 rounded-lg font-semibold transition-all duration-500 text-sm cursor-pointer border ${
              navLight
                ? 'bg-[#0F172A] text-white border-[#0F172A] hover:bg-[#1e293b] shadow-sm'
                : 'bg-white/10 text-white border-white/20 hover:bg-white/20 shadow-sm'
            }`}
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* 
        ==================================================
        CONTENT WRAPPER (Scrollable)
        ==================================================
      */}
      <div className="relative z-10">
        
        {/* Spacer for Video Hero (100vh clear view of the video) */}
        <div className="h-[100vh] w-full pointer-events-none flex items-center justify-center">
        </div>

        {/* 
          ==================================================
          SECTION 2: WHITE ABOUT + AUTH SECTION
          ==================================================
        */}
        <motion.div 
          id="about-section"
          className="relative bg-[#F8FAFC] w-full rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.3)] overflow-hidden"
          style={{ y: whiteSectionY }}
        >
          {/* Subtle Futuristic Decorative Background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-blue-100/40 to-transparent blur-3xl" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tl from-indigo-100/40 to-transparent blur-3xl" />
            {/* Very subtle grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
          </div>

          <div className="max-w-[1400px] mx-auto px-6 lg:px-16 py-24 flex flex-col lg:flex-row items-start justify-between relative z-10 gap-16">
            
            {/* Left Side: About AI LifeOS (approx 55%) */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="w-full lg:w-[55%] flex flex-col"
            >
              <div className="mb-16">
                <span className="text-xs font-bold tracking-[0.2em] text-blue-600 uppercase mb-4 block">About AI LifeOS</span>
                <h2 className="text-5xl lg:text-7xl font-extrabold text-[#0F172A] leading-[1.1] tracking-tight mb-8">
                  Your Life.<br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Intelligently Organized.</span>
                </h2>
                <p className="text-xl text-[#475569] leading-relaxed max-w-xl mb-6">
                  AI LifeOS brings your tasks, goals, habits, schedules, and everyday commitments together in one intelligent system.
                </p>
                <p className="text-lg text-[#64748B] leading-relaxed max-w-xl mb-8">
                  Instead of simply helping you manage a list of tasks, AI LifeOS understands how the different parts of your life connect and turns them into a realistic plan for your day.
                </p>
                <div className="inline-flex items-center gap-3 bg-white px-5 py-3 rounded-full shadow-sm border border-slate-200">
                  <Brain className="text-indigo-500" size={20} />
                  <span className="text-sm font-semibold text-slate-700">Tasks + Goals + Habits + Deadlines + Time → <span className="text-blue-600">One Intelligent Plan</span></span>
                </div>
              </div>

              {/* Five Pillars Carousel */}
              <div className="relative h-[120px] w-full mb-8 mt-2">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={activePillarIndex}
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 flex items-start gap-6 bg-white shadow-[0_12px_40px_rgba(59,130,246,0.12)] border border-blue-100/80 p-6 rounded-2xl cursor-default"
                  >
                    <span className="text-sm font-bold text-blue-500 pt-1">
                      {pillars[activePillarIndex].id}
                    </span>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold tracking-widest text-[#0F172A] flex items-center gap-2 mb-2 uppercase">
                        {pillars[activePillarIndex].title}
                        <span className="text-blue-500">
                          {pillars[activePillarIndex].icon}
                        </span>
                      </h3>
                      <p className="text-slate-500 text-sm">{pillars[activePillarIndex].desc}</p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Carousel Dots */}
              <div className="flex gap-2 items-center pl-4">
                {pillars.map((_, idx) => (
                  <button 
                    key={idx}
                    type="button"
                    onClick={() => setActivePillarIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${activePillarIndex === idx ? 'w-6 bg-blue-500 shadow-md shadow-blue-500/40' : 'w-2 bg-slate-300 hover:bg-slate-400'}`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </motion.div>

            {/* Right Side: Authentication Glass Card (approx 45%) */}
            <motion.div 
              id="auth-form-card"
              initial={{ opacity: 0, x: 50, scale: 0.96 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="w-full lg:w-[45%] max-w-[500px]"
            >
              <div 
                className="relative overflow-hidden rounded-[28px] p-8 lg:p-10"
                style={{
                  background: 'rgba(255,255,255,0.65)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid rgba(15,23,42,0.08)',
                  boxShadow: '0 25px 70px rgba(15,23,42,0.10)'
                }}
              >
                {/* Subtle Moving Highlight */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-0 hover:opacity-100 transform -translate-x-full hover:translate-x-full transition-all duration-1000 ease-in-out" />

                {/* Header */}
                <div className="text-center mb-8 relative z-10">
                  <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 bg-[#0F172A] rounded-2xl flex items-center justify-center shadow-lg">
                      <img src="/logo.png" alt="Icon" className="w-8 h-8 object-contain" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-[#0F172A]">Welcome to AI LifeOS</h2>
                  <p className="text-[#64748B] mt-1">Plan smarter. Live better.</p>
                </div>

                {/* Segmented Control */}
                <div className="flex bg-slate-100/80 p-1 rounded-xl mb-8 relative z-10">
                  {['login', 'register'].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setMode(tab);
                        setError('');
                      }}
                      className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 relative cursor-pointer ${
                        mode === tab ? 'text-white' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {mode === tab && (
                        <motion.div 
                          layoutId="activeTab"
                          className="absolute inset-0 bg-[#0F172A] rounded-lg shadow-sm"
                          initial={false}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">{tab === 'login' ? 'LOGIN' : 'SIGN UP'}</span>
                    </button>
                  ))}
                </div>

                {location.state?.message && (
                  <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-xl mb-6 text-sm border border-emerald-200 relative z-10 flex items-center gap-2 font-medium shadow-sm">
                    <CheckSquare size={16} className="text-emerald-600 shrink-0" />
                    <span>{location.state.message}</span>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-sm border border-red-100 relative z-10">
                    {error}
                  </div>
                )}

                {/* Forms */}
                <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                  {mode === 'register' && (
                    <div>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          id="name-input"
                          type="text"
                          placeholder="Full Name"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full pl-11 pr-4 py-3.5 bg-slate-50/75 border border-slate-200/80 rounded-[14px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="email"
                        placeholder="Email Address"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50/75 border border-slate-200/80 rounded-[14px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full pl-11 pr-11 py-3.5 bg-slate-50/75 border border-slate-200/80 rounded-[14px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {mode === 'register' && (
                    <div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Confirm Password"
                          required
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                          className="w-full pl-11 pr-4 py-3.5 bg-slate-50/75 border border-slate-200/80 rounded-[14px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {mode === 'login' && (
                    <div className="flex items-center justify-between pt-1 pb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-slate-500">Remember me</span>
                      </label>
                      <button type="button" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <motion.button
                    whileHover={{ y: -2, boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.4)" }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full h-[54px] rounded-[14px] text-white font-semibold flex items-center justify-center bg-gradient-to-r from-[#0F172A] via-[#2563EB] to-[#6366F1] shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition-all relative overflow-hidden group cursor-pointer disabled:cursor-not-allowed"
                  >
                    <span className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                    )}
                  </motion.button>
                </form>
                
                {/* Footer Switcher */}
                <div className="mt-8 text-center relative z-10">
                  <p className="text-sm text-slate-500">
                    {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                    <button 
                      type="button" 
                      onClick={() => {
                        setMode(mode === 'login' ? 'register' : 'login');
                        setError('');
                      }}
                      className="font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                    >
                      {mode === 'login' ? 'Create account' : 'Sign In'}
                    </button>
                  </p>
                </div>

              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Five Pillars Section (Highlights - Screenshot 3) */}
        <FivePillarsCarousel />

        {/* 
          ==================================================
          3D INTERFACE SECTION (Screenshots 1, 2 & 4)
          Contains Hero + Three Core Pillars Architecture + Contact Section
          layered seamlessly on top of the interactive 3D Canvas
          ==================================================
        */}
        <div id="three-d-section" className="relative bg-transparent text-white">

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* 1. Hero Section (Screenshot 1) */}
            <div className="flex flex-col justify-center items-center text-center min-h-[80vh] pt-20 pb-20">
              <motion.h1 
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8 }}
                className="text-5xl md:text-7xl font-extrabold tracking-tight"
              >
                <span className="block text-white drop-shadow-md">Your life.</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mt-2 drop-shadow-lg">
                  Organized intelligently.
                </span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-white/80 drop-shadow-md font-medium px-4 leading-relaxed"
              >
                Plan your day. Achieve your goals. Let AI organize the rest. AI LifeOS transforms your tasks, goals, habits and commitments into a personalized daily plan.
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="mt-10 flex flex-col sm:flex-row justify-center gap-4"
              >
                <button 
                  onClick={handleSignUpNavClick}
                  className="btn-primary text-base md:text-lg px-8 py-3.5 shadow-[0_0_25px_rgba(99,102,241,0.6)] cursor-pointer"
                >
                  Start Your LifeOS
                </button>
                <a 
                  href="#architecture-section" 
                  className="btn-secondary text-base md:text-lg px-8 py-3.5 bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 cursor-pointer"
                >
                  Explore Architecture
                </a>
              </motion.div>
            </div>
            
            {/* 2. One OS. Three Core Pillars Architecture (Screenshot 2) */}
            <motion.div 
              id="architecture-section"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1 }}
              className="py-24"
            >
              <div className="text-center mb-20 px-4">
                <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">
                  One OS. <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Three Core Pillars.</span>
                </h2>
                <p className="mt-4 text-white/70 max-w-2xl mx-auto text-base md:text-lg">
                  Our intelligent architecture seamlessly connects your schedule, goals, and knowledge into one unified digital brain.
                </p>
              </div>
              
              <div className="relative max-w-5xl mx-auto">
                {/* Central Intelligence Core (Top Node) */}
                <div className="flex justify-center mb-16 relative z-10">
                  <div className="px-10 py-5 glass-card border-2 border-primary/60 shadow-[0_0_30px_rgba(99,102,241,0.5)] rounded-2xl text-center backdrop-blur-xl bg-[#0B0F19]/90 transform transition-transform hover:scale-105">
                     <div className="flex items-center justify-center gap-3 mb-2">
                       <Cpu className="text-primary" size={24} />
                       <h3 className="text-2xl font-bold text-white">AI LifeOS</h3>
                     </div>
                     <p className="text-xs text-primary font-bold uppercase tracking-widest">Central Intelligence Core</p>
                  </div>
                </div>

                {/* Connecting Lines (Desktop SVG) */}
                <div className="absolute top-20 left-0 w-full h-32 z-0 pointer-events-none hidden md:block">
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <path d="M50 0 C 50 60, 16.66 40, 16.66 100" fill="none" stroke="rgba(16, 185, 129, 0.6)" strokeWidth="0.8" strokeDasharray="3,3" />
                    <path d="M50 0 L 50 100" fill="none" stroke="rgba(6, 182, 212, 0.6)" strokeWidth="0.8" strokeDasharray="3,3" />
                    <path d="M50 0 C 50 60, 83.33 40, 83.33 100" fill="none" stroke="rgba(245, 158, 11, 0.6)" strokeWidth="0.8" strokeDasharray="3,3" />
                  </svg>
                </div>

                {/* Connecting Lines for Mobile (Vertical) */}
                <div className="absolute top-24 left-1/2 -translate-x-1/2 w-1 h-[600px] z-0 pointer-events-none md:hidden flex flex-col justify-between">
                    <div className="w-0.5 h-full bg-gradient-to-b from-primary via-cyan-500 to-amber-500 opacity-50 mx-auto border-l-2 border-dashed border-transparent" style={{ backgroundImage: 'linear-gradient(to bottom, transparent 50%, rgba(255,255,255,0.5) 50%)', backgroundSize: '2px 10px' }}></div>
                </div>

                {/* Three Pillars (Bottom Nodes) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 mt-8 md:mt-0">
                  {/* Pillar 1: Smart Schedule */}
                  <div className="p-8 glass-card border border-emerald-500/40 hover:border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] rounded-2xl backdrop-blur-xl bg-[#0B0F19]/80 transition-all duration-300 transform hover:-translate-y-2">
                    <div className="flex items-center gap-4 mb-4">
                       <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                          <Calendar size={24} />
                       </div>
                       <div>
                          <h4 className="text-xl font-bold text-white">Smart Schedule</h4>
                          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1">AI-Driven Routines</p>
                       </div>
                    </div>
                    <p className="text-white/70 leading-relaxed text-sm">
                      Dynamic time-blocking that automatically adapts to your changing priorities, habits, and available time blocks throughout the day.
                    </p>
                  </div>
                  
                  {/* Pillar 2: Goal Tracking */}
                  <div className="p-8 glass-card border border-cyan-500/40 hover:border-cyan-500/80 shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] rounded-2xl backdrop-blur-xl bg-[#0B0F19]/80 transition-all duration-300 transform hover:-translate-y-2">
                    <div className="flex items-center gap-4 mb-4">
                       <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                          <Target size={24} />
                       </div>
                       <div>
                          <h4 className="text-xl font-bold text-white">Goal Tracking</h4>
                          <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mt-1">Habits & Analytics</p>
                       </div>
                    </div>
                    <p className="text-white/70 leading-relaxed text-sm">
                      Transform grand ambitions into manageable daily habits. Get deep insights and analytics on your productivity trends over time.
                    </p>
                  </div>

                  {/* Pillar 3: Knowledge Base */}
                  <div className="p-8 glass-card border border-amber-500/40 hover:border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] rounded-2xl backdrop-blur-xl bg-[#0B0F19]/80 transition-all duration-300 transform hover:-translate-y-2">
                    <div className="flex items-center gap-4 mb-4">
                       <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                          <BookOpen size={24} />
                       </div>
                       <div>
                          <h4 className="text-xl font-bold text-white">Knowledge Base</h4>
                          <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mt-1">Notes & Ideas</p>
                       </div>
                    </div>
                    <p className="text-white/70 leading-relaxed text-sm">
                      A unified digital brain to instantly capture fleeting thoughts, save references, and outline complex project details securely.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* 3. SECTION: CONTACT SECTION & FOOTER with the same 3D Background (Screenshot 4) */}
          <div className="relative z-10">
            <ContactSection />
          </div>
        </div>

      </div>

      {/* Floating Back to Top button in bottom-right */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            key="floating-back-to-top"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.25 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 right-8 z-50 flex items-center gap-2 px-4 py-3 bg-[#0F172A] hover:bg-blue-600 text-white font-medium text-xs rounded-full shadow-2xl border border-white/20 backdrop-blur-md cursor-pointer transition-colors duration-300 group"
            aria-label="Back to top"
          >
            <ArrowUp size={16} className="transition-transform group-hover:-translate-y-0.5" />
            <span className="font-semibold tracking-wide">Back to top</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuthPage;

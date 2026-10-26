import React from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Target, 
  Activity, 
  Calendar, 
  BrainCircuit, 
  BookOpen, 
  Settings, 
  User
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Goals', path: '/goals', icon: Target },
    { name: 'Habits', path: '/habits', icon: Activity },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'AI Planner', path: '/schedule', icon: BrainCircuit },
    { name: 'Notes', path: '/notes', icon: BookOpen },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-20 md:w-64 h-screen bg-surface/90 backdrop-blur-2xl border-r border-border fixed left-0 top-0 flex flex-col pt-8 pb-4 overflow-y-auto z-50 transition-colors duration-200">
      <div className="px-4 md:px-8 mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent flex items-center justify-center md:justify-start gap-3">
          <BrainCircuit className="text-primary flex-shrink-0" size={28} />
          <span className="hidden md:inline tracking-tight font-extrabold text-textPrimary">LifeOS</span>
        </h2>
      </div>
      
      <nav className="flex-1 px-3 md:px-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          const navId = `tour-nav-${item.path.replace('/', '')}`;
          return (
            <NavLink
              key={item.name}
              id={navId}
              to={item.path}
              className={`relative flex items-center justify-center md:justify-start gap-3 px-3 md:px-4 py-3.5 rounded-xl transition-all duration-200 group data-[tour-active="true"]:ring-2 data-[tour-active="true"]:ring-cyan-400 data-[tour-active="true"]:bg-cyan-500/20 data-[tour-active="true"]:text-cyan-300 data-[tour-active="true"]:shadow-[0_0_25px_rgba(6,182,212,0.5)] ${
                isActive 
                  ? 'text-primary font-semibold' 
                  : 'text-textSecondary hover:text-textPrimary hover:bg-surface-elevated/70'
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-xl border border-primary/20 dark:border-primary/30 shadow-[0_0_15px_rgba(99,102,241,0.12)]"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon size={20} className={`flex-shrink-0 relative z-10 transition-colors ${isActive ? 'text-primary' : 'text-textSecondary group-hover:text-textPrimary'}`} />
              <span className="hidden md:inline relative z-10">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Avatar & Profile Card in Sidebar */}
      <div className="px-3 md:px-4 pt-3 border-t border-border/60 mt-auto">
        <Link
          to="/profile"
          className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-elevated/80 transition-all duration-200 group"
          title="View Profile"
        >
          <div className="relative shrink-0">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user?.name || 'User'}
                className="w-10 h-10 rounded-full object-cover border border-primary/30 shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-[1.5px] shadow-sm">
                <div className="w-full h-full bg-surface rounded-full flex items-center justify-center text-sm font-bold text-transparent bg-clip-text bg-gradient-to-tr from-cyan-400 to-purple-400">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-surface"></span>
          </div>

          <div className="hidden md:flex flex-col min-w-0 flex-1">
            <span className="text-sm font-semibold text-textPrimary truncate group-hover:text-primary transition-colors">
              {user?.name || 'LifeOS User'}
            </span>
            <span className="text-[11px] text-textSecondary truncate">
              {user?.email || 'View Profile'}
            </span>
          </div>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;

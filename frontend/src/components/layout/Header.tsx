import React from 'react';
import {
  Cpu, Zap, Flame, Award, Shield, Moon, Sun,
  Layers, Terminal, Users, Compass, ChevronRight
} from 'lucide-react';
import { Discipline } from '../../types';

interface HeaderProps {
  currentTab: 'challenges' | 'skill-tree' | 'badges' | 'leaderboard';
  setCurrentTab: (tab: 'challenges' | 'skill-tree' | 'badges' | 'leaderboard') => void;
  selectedDiscipline: Discipline;
  setSelectedDiscipline: (d: Discipline) => void;
  userXp: number;
  streakDays: number;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onOpenOnboarding: () => void;
  userRole: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  selectedDiscipline,
  setSelectedDiscipline,
  userXp,
  streakDays,
  isDarkMode,
  toggleDarkMode,
  onOpenOnboarding,
  userRole,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#223147] bg-[#0B0F17]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* Brand & EX Monogram Logo */}
        <div className="flex items-center space-x-4">
          <div
            onClick={() => setCurrentTab('challenges')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            {/* Animated EX Monogram */}
            <div className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#161F2E] to-[#0B0F17] border border-[#0066FF]/40 shadow-[0_0_15px_rgba(0,102,255,0.25)] group-hover:border-[#0066FF] transition-all">
              <svg className="w-6 h-6" viewBox="0 0 100 100" fill="none">
                {/* Microchip pins silhouette */}
                <rect x="15" y="15" width="70" height="70" rx="14" stroke="#223147" strokeWidth="3" />
                {/* Left Leg: Resistor wave pulse */}
                <path
                  d="M28 35 L40 50 L32 58 L44 65"
                  stroke="#0066FF"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Right Leg: Binary pulse arrow */}
                <path
                  d="M48 35 L68 50 L48 65"
                  stroke="#2ECC71"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="68" cy="50" r="4" fill="#A901DB" />
              </svg>
            </div>

            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-[#0066FF] transition-colors">
                  Engin<span className="text-[#0066FF]">X</span>
                </span>
                <span className="text-[10px] font-mono tracking-widest px-1.5 py-0.5 rounded bg-[#0066FF]/10 text-[#0066FF] border border-[#0066FF]/30 uppercase font-semibold">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block truncate max-w-[280px]">
                Hands-on Engineering Learning
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1">
          <button
            onClick={() => setCurrentTab('challenges')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-1.5 ${
              currentTab === 'challenges'
                ? 'bg-[#0066FF]/15 text-[#0066FF] border border-[#0066FF]/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Challenges</span>
          </button>

          <button
            onClick={() => setCurrentTab('skill-tree')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-1.5 ${
              currentTab === 'skill-tree'
                ? 'bg-[#2ECC71]/15 text-[#2ECC71] border border-[#2ECC71]/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Skill Tree</span>
          </button>

          <button
            onClick={() => setCurrentTab('badges')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-1.5 ${
              currentTab === 'badges'
                ? 'bg-[#A901DB]/15 text-[#A901DB] border border-[#A901DB]/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Badges</span>
          </button>

          <button
            onClick={() => setCurrentTab('leaderboard')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-1.5 ${
              currentTab === 'leaderboard'
                ? 'bg-[#0066FF]/15 text-[#0066FF] border border-[#0066FF]/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Leaderboard</span>
          </button>
        </nav>

        {/* Right Actions: XP, Streak, Role & Profile */}
        <div className="flex items-center space-x-3">
          {/* Streak Counter */}
          <div className="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-md bg-[#161F2E] border border-[#223147] text-amber-400 text-xs font-semibold">
            <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-500 animate-pulse" />
            <span>{streakDays}d Streak</span>
          </div>

          {/* XP Badge */}
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-md bg-[#161F2E] border border-[#0066FF]/30 text-white text-xs font-mono font-bold shadow-[0_0_10px_rgba(0,102,255,0.15)]">
            <Zap className="w-3.5 h-3.5 text-[#0066FF] fill-[#0066FF]" />
            <span>{userXp} <span className="text-[#0066FF]">XP</span></span>
          </div>

          {/* Role Badge / Switcher */}
          <button
            onClick={onOpenOnboarding}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#0066FF]/10 border border-[#0066FF]/30 hover:bg-[#0066FF]/20 text-xs font-medium text-slate-300 transition-colors"
            title="Change Track Role"
          >
            <Cpu className="w-3.5 h-3.5 text-[#2ECC71]" />
            <span className="font-semibold text-white">{userRole}</span>
            <ChevronRight className="w-3 h-3 text-slate-500" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

      </div>
    </header>
  );
};

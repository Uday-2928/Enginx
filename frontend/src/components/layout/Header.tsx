import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  Bot,
  Check,
  ChevronDown,
  Code2,
  Cpu,
  Flame,
  Layers3,
  LayoutDashboard,
  LogOut,
  Shield,
  Sparkles,
  Trophy,
  UserCheck,
  Zap,
} from 'lucide-react';
import { normalizeBranch, type EngineeringBranch } from '../../data/challengeFilters';

type AppTab =
  | 'ece-hub'
  | 'cyber-hub'
  | 'challenges'
  | 'skill-tree'
  | 'badges'
  | 'leaderboard';

interface HeaderProps {
  currentTab: AppTab;
  setCurrentTab: (tab: AppTab) => void;
  userXp: number | null;
  streakDays: number | null;
  onOpenOnboarding: () => void;
  onSignOut?: () => void;
  userRole?: string | null;
  onSelectBranch?: (branch: string) => void;
}

const BRANCH_OPTIONS: { id: EngineeringBranch; label: string; desc: string; icon: typeof Cpu }[] = [
  { id: 'ECE', label: 'ECE · Electrical & Computer', desc: 'Verilog, Embedded C, MATLAB & Digital Logic', icon: Cpu },
  { id: 'CSE', label: 'CSE · Computer Science', desc: 'Algorithms, Data Structures & Python', icon: Code2 },
  { id: 'AI', label: 'AI & Machine Learning', desc: 'Neural Networks & Model Inference', icon: Bot },
  { id: 'CYBER', label: 'Cybersecurity & CTF', desc: 'Cryptography & Vulnerability Challenges', icon: Shield },
  { id: 'ROBOTICS', label: 'Robotics & Control', desc: 'Kinematics & Multi-DOF Systems', icon: Bot },
  { id: 'HARDWARE', label: 'Hardware & Logic Gates', desc: 'Circuit Modeling & Combinational Logic', icon: Cpu },
  { id: 'ALL', label: 'All Branches (Unrestricted)', desc: 'View challenges across every engineering discipline', icon: Sparkles },
];

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  userXp,
  streakDays,
  onOpenOnboarding,
  onSignOut,
  userRole,
  onSelectBranch,
}) => {
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentBranchNorm = normalizeBranch(userRole);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsBranchDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsBranchDropdownOpen(false);
      }
    }

    if (isBranchDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isBranchDropdownOpen]);

  const navItems = [
    { id: 'ece-hub' as const, label: 'ECE Hub', icon: LayoutDashboard },
    { id: 'cyber-hub' as const, label: 'Cyber Hub', icon: Shield },
    { id: 'challenges' as const, label: 'Challenges', icon: Code2 },
    { id: 'skill-tree' as const, label: 'Skill tree', icon: Layers3 },
    { id: 'badges' as const, label: 'Badges', icon: Award },
    { id: 'leaderboard' as const, label: 'Leaderboard', icon: Trophy },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-teal-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-[4.5rem] w-full max-w-[1720px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <button
          type="button"
          onClick={() => setCurrentTab('challenges')}
          className="focus-ring group flex min-h-[44px] items-center gap-3 rounded-xl text-left"
          aria-label="EnginX home"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-enginx-primary transition-colors group-hover:border-teal-400 group-hover:bg-teal-100">
            <Cpu className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="flex items-center gap-2 font-extrabold tracking-tight text-slate-900">
              Engin<span className="text-enginx-primary">X</span>
              <span className="rounded-md bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-enginx-primary">
                v1.0
              </span>
            </span>
            <span className="hidden text-[11px] text-slate-500 sm:block">Hands-on engineering learning</span>
          </span>
        </button>

        {/* Navigation */}
        <nav
          aria-label="Primary navigation"
          className="order-3 -mx-1 flex w-[calc(100%+0.5rem)] items-center gap-1 overflow-x-auto pb-0.5 md:order-none md:mx-0 md:w-auto md:flex-1 md:justify-center"
        >
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = currentTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setCurrentTab(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`focus-ring flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-teal-200 bg-teal-50 text-enginx-primary'
                    : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Progress + profile actions */}
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden min-h-[44px] items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-800 sm:flex">
            <Flame className="h-4 w-4 text-enginx-cta" aria-hidden="true" />
            <span>{streakDays === null ? 'Streak unavailable' : `${streakDays} day streak`}</span>
          </div>
          <div className="flex min-h-[44px] items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 text-xs font-bold text-slate-800">
            <Zap className="h-4 w-4 text-enginx-primary" aria-hidden="true" />
            <span>{userXp === null ? 'XP unavailable' : <>{userXp} <span className="text-enginx-primary">XP</span></>}</span>
          </div>

          {/* Branch Selector Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsBranchDropdownOpen((prev) => !prev)}
              aria-haspopup="listbox"
              aria-expanded={isBranchDropdownOpen}
              aria-label={`Current branch: ${userRole || 'All'}`}
              className={`focus-ring flex min-h-[44px] items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                isBranchDropdownOpen
                  ? 'border-teal-500 bg-teal-50 text-teal-900 ring-2 ring-teal-500/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50'
              }`}
              title="Change engineering branch / domain"
            >
              <Cpu className="h-4 w-4 text-enginx-primary" aria-hidden="true" />
              <span>{userRole || 'Branch'}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isBranchDropdownOpen ? 'rotate-180 text-teal-600' : ''}`} aria-hidden="true" />
            </button>

            {isBranchDropdownOpen && (
              <div
                role="listbox"
                aria-label="Select engineering branch"
                className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-teal-100 bg-white p-2 shadow-2xl ring-1 ring-slate-900/5 animate-fade-in"
              >
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Select Engineering Branch</p>
                  <p className="text-xs text-slate-600">Filters challenges & topics to your domain</p>
                </div>

                <div className="my-1 max-h-80 overflow-y-auto space-y-0.5">
                  {BRANCH_OPTIONS.map(({ id, label, desc, icon: Icon }) => {
                    const isSelected = currentBranchNorm === id || (id === 'ALL' && userRole === 'ALL');
                    return (
                      <button
                        key={id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          if (onSelectBranch) {
                            onSelectBranch(id);
                          } else {
                            onOpenOnboarding();
                          }
                          setIsBranchDropdownOpen(false);
                        }}
                        className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
                          isSelected
                            ? 'bg-teal-50 text-teal-900 font-semibold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold leading-tight">{label}</span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-teal-600 shrink-0 ml-1" aria-hidden="true" />}
                          </div>
                          <span className="block text-[11px] text-slate-500 font-normal leading-snug truncate mt-0.5">{desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-slate-100 pt-1 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBranchDropdownOpen(false);
                      onOpenOnboarding();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-teal-700 transition-colors"
                  >
                    <UserCheck className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    <span>Edit full profile & degree...</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile / Onboarding button */}
          <button
            type="button"
            onClick={onOpenOnboarding}
            aria-label="Set up profile"
            title="Set up profile"
            className="focus-ring flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
          >
            <UserCheck className="h-4 w-4" aria-hidden="true" />
          </button>

          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              aria-label="Sign out"
              title="Sign out"
              className="focus-ring flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import {
  Award,
  ChevronDown,
  Code2,
  Cpu,
  Flame,
  Layers3,
  Trophy,
  Zap,
} from 'lucide-react';

interface HeaderProps {
  currentTab: 'challenges' | 'skill-tree' | 'badges' | 'leaderboard';
  setCurrentTab: (tab: 'challenges' | 'skill-tree' | 'badges' | 'leaderboard') => void;
  userXp: number;
  streakDays: number;
  onOpenOnboarding: () => void;
  userRole: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  userXp,
  streakDays,
  onOpenOnboarding,
  userRole,
}) => {
  const navItems = [
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
            <span>{streakDays} day streak</span>
          </div>
          <div className="flex min-h-[44px] items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 text-xs font-bold text-slate-800">
            <Zap className="h-4 w-4 text-enginx-primary" aria-hidden="true" />
            <span>{userXp} <span className="text-enginx-primary">XP</span></span>
          </div>
          <button
            type="button"
            onClick={onOpenOnboarding}
            className="focus-ring flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50"
            title="Change discipline track"
          >
            <Cpu className="h-4 w-4 text-enginx-primary" aria-hidden="true" />
            <span>{userRole}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
};

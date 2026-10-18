import React from 'react';
import {
  Bot,
  CheckCircle2,
  Code2,
  Cpu,
  Filter,
  Search,
  Shield,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Challenge, Discipline } from '../../types';

interface ChallengeListProps {
  challenges: Challenge[];
  selectedChallengeId: string;
  onSelectChallenge: (c: Challenge) => void;
  completedIds: string[];
  selectedDiscipline: Discipline;
  setSelectedDiscipline: (d: Discipline) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const ChallengeList: React.FC<ChallengeListProps> = ({
  challenges,
  selectedChallengeId,
  onSelectChallenge,
  completedIds,
  selectedDiscipline,
  setSelectedDiscipline,
  searchQuery,
  setSearchQuery,
}) => {
  const disciplines: { id: Discipline; label: string; icon: LucideIcon }[] = [
    { id: 'all', label: 'All tracks', icon: Sparkles },
    { id: 'cse', label: 'CSE', icon: Code2 },
    { id: 'ece-verilog', label: 'ECE · Verilog', icon: Cpu },
    { id: 'ece-embedded', label: 'Embedded C', icon: Terminal },
    { id: 'ai-ml', label: 'AI & ML', icon: Bot },
    { id: 'cybersecurity', label: 'Cybersecurity', icon: Shield },
    { id: 'robotics', label: 'Robotics', icon: Bot },
    { id: 'hardware', label: 'Hardware', icon: Cpu },
  ];

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">Easy</span>;
      case 'Medium':
        return <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800">Medium</span>;
      case 'Hard':
        return <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700">Hard</span>;
      default:
        return null;
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-teal-100 bg-white">
      <div className="space-y-4 border-b border-slate-200 bg-slate-50/80 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Practice queue</p>
            <h2 className="mt-1 text-base font-bold text-slate-900">Choose a challenge</h2>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
            {challenges.length} available
          </span>
        </div>

        <div className="relative">
          <input
            type="text"
            aria-label="Search challenges"
            placeholder="Search problems or topics"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="focus-ring min-h-[44px] w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors hover:border-teal-300"
          />
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" aria-label="Filter by discipline">
          <Filter className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          {disciplines.map(({ id, label, icon: Icon }) => {
            const isSelected = selectedDiscipline === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedDiscipline(id)}
                aria-pressed={isSelected}
                className={`focus-ring flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-xs font-semibold transition-colors ${
                  isSelected
                    ? 'border-teal-600 bg-teal-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {challenges.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-teal-200 bg-teal-50/50 p-8 text-center">
            <Search className="h-6 w-6 text-teal-600" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-800">No matching challenges</p>
            <p className="mt-1 text-xs text-slate-500">Try another track or a broader search term.</p>
          </div>
        ) : (
          challenges.map((challenge) => {
            const isSelected = selectedChallengeId === challenge.id;
            const isCompleted = completedIds.includes(challenge.id);

            return (
              <button
                key={challenge.id}
                type="button"
                onClick={() => onSelectChallenge(challenge)}
                aria-pressed={isSelected}
                className={`focus-ring w-full rounded-xl border p-3 text-left transition-colors ${
                  isSelected
                    ? 'border-teal-300 bg-teal-50'
                    : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="mt-0.5 shrink-0" aria-hidden="true">
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                        </span>
                      )}
                    </span>

                    <span className="min-w-0">
                      <span className={`block text-sm font-semibold leading-snug ${isSelected ? 'text-teal-800' : 'text-slate-800'}`}>
                        {challenge.title}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">{challenge.topic}</span>
                    </span>
                  </div>

                  <span className="flex shrink-0 flex-col items-end gap-1">
                    {getDifficultyBadge(challenge.difficulty)}
                    <span className="flex items-center gap-1 font-mono text-[10px] font-semibold text-slate-500">
                      <Zap className="h-3 w-3 text-enginx-cta" aria-hidden="true" />
                      <span>+{challenge.xp_reward} XP</span>
                    </span>
                  </span>
                </div>

                <span className="mt-3 flex items-center gap-2 overflow-hidden">
                  <span className="shrink-0 rounded-md border border-slate-200 bg-slate-100 px-1.5 py-1 text-[10px] font-mono uppercase text-slate-600">
                    {challenge.language}
                  </span>
                  {challenge.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="truncate text-[10px] text-slate-500">
                      {tag}
                    </span>
                  ))}
                </span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
};

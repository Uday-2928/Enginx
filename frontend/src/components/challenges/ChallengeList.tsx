import React from 'react';
import {
  Activity,
  Bot,
  CheckCircle2,
  Code2,
  Cpu,
  Filter,
  LayoutGrid,
  Search,
  Shield,
  Terminal,
  Radio,
  Zap,
  Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Challenge, ChallengeFilter } from '../../types';
import { getFilterOptionsForBranch } from '../../data/challengeFilters';
import { difficultyBadgeClasses } from '../tutorials/levelBadge';

interface ChallengeListProps {
  challenges: Challenge[];
  selectedChallengeId: string;
  onSelectChallenge: (c: Challenge) => void;
  completedIds: string[];
  selectedDiscipline: ChallengeFilter;
  setSelectedDiscipline: (d: ChallengeFilter) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  branch?: string;
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
  branch,
}) => {
  const iconForFilter = (id: ChallengeFilter): LucideIcon => {
    switch (id) {
      case 'all': return LayoutGrid;
      case 'cse': return Code2;
      case 'ece-verilog': return Cpu;
      case 'ece-embedded': return Terminal;
      case 'ece-matlab': return Waves;
      case 'ece-signals': return Waves;
      case 'ece-dsp': return Activity;
      case 'ece-communications': return Radio;
      case 'ai-ml': return Bot;
      case 'cybersecurity': return Shield;
      case 'robotics': return Bot;
      case 'hardware': return Cpu;
      default: return LayoutGrid;
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    if (difficulty === 'Easy' || difficulty === 'Medium' || difficulty === 'Hard') {
      return <span className={difficultyBadgeClasses(difficulty)}>{difficulty}</span>;
    }
    return null;
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="space-y-4 border-b border-slate-200 bg-slate-50/80 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Practice queue</p>
            <h2 className="mt-1 text-base font-semibold text-slate-900">Choose a challenge</h2>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
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
          {getFilterOptionsForBranch(branch).map(({ id, label, description }) => {
            const Icon = iconForFilter(id);
            const isSelected = selectedDiscipline === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedDiscipline(id)}
                aria-pressed={isSelected}
                title={description}
                className={`focus-ring flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-xs font-semibold transition-colors ${
                  isSelected
                    ? 'border-teal-300 bg-teal-50 text-teal-900'
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
          <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <Search className="h-6 w-6 text-slate-300" aria-hidden="true" />
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
                    <span className="flex items-center gap-1 text-[10px] font-semibold tabular-nums text-slate-500">
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

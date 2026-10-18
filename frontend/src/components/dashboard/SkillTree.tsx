import React from 'react';
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  Code2,
  Cpu,
  Lock,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Challenge, Discipline } from '../../types';

interface SkillTreeProps {
  challenges: Challenge[];
  completedIds: string[];
  onSelectChallenge: (c: Challenge) => void;
  selectedDiscipline: Discipline;
  setSelectedDiscipline: (d: Discipline) => void;
}

interface DisciplineTrack {
  id: Discipline;
  name: string;
  icon: LucideIcon;
  desc: string;
}

export const SkillTree: React.FC<SkillTreeProps> = ({
  challenges,
  completedIds,
  onSelectChallenge,
  selectedDiscipline,
  setSelectedDiscipline,
}) => {
  const disciplineTracks: DisciplineTrack[] = [
    { id: 'cse', name: 'Computer science', icon: Code2, desc: 'Arrays, hash maps, binary search and complexity' },
    { id: 'ece-verilog', name: 'ECE · Verilog HDL', icon: Cpu, desc: 'Digital logic, adders, flip-flops and FSMs' },
    { id: 'ece-embedded', name: 'Embedded C', icon: Terminal, desc: 'Register manipulation, GPIO and timer interrupts' },
    { id: 'ai-ml', name: 'AI & machine learning', icon: Bot, desc: 'Perceptrons, activations, tensors and model math' },
    { id: 'cybersecurity', name: 'Cybersecurity & CTF', icon: Lock, desc: 'Cryptography, exploits, XOR cracking and forensics' },
    { id: 'robotics', name: 'Robotics & control', icon: Bot, desc: 'Forward kinematics, PID controllers and transforms' },
    { id: 'hardware', name: 'Hardware & logic', icon: Cpu, desc: 'Multiplexers, decoders and circuit simulation' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-2xl space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Guided progression
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Build your engineering <span className="text-enginx-primary">skill tree</span>
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          Follow focused challenge paths across hardware and software disciplines. Complete nodes to build momentum, earn XP, and unlock the next concept.
        </p>
      </div>

      <div className="space-y-5">
        {disciplineTracks.map((track) => {
          const trackChallenges = challenges.filter((challenge) => challenge.discipline === track.id);
          if (trackChallenges.length === 0) return null;

          const completedCount = trackChallenges.filter((challenge) => completedIds.includes(challenge.id)).length;
          const progressPercent = Math.round((completedCount / trackChallenges.length) * 100);
          const Icon = track.icon;
          const isSelected = selectedDiscipline === track.id;

          return (
            <section
              key={track.id}
              className={`rounded-2xl border bg-white p-5 sm:p-6 ${isSelected ? 'border-teal-300' : 'border-teal-100'}`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedDiscipline(track.id)}
                  className="focus-ring flex min-h-[44px] min-w-0 items-center gap-3 rounded-xl text-left"
                  aria-pressed={isSelected}
                >
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${isSelected ? 'border-teal-300 bg-teal-50 text-enginx-primary' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2 text-base font-bold text-slate-900">
                      {track.name}
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {completedCount}/{trackChallenges.length} done
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">{track.desc}</span>
                  </span>
                </button>

                <div className="flex items-center gap-3 sm:w-64">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100" aria-label={`${progressPercent}% complete`}>
                    <div className="h-full rounded-full bg-enginx-primary transition-[width] duration-300" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <span className="w-10 text-right font-mono text-xs font-bold text-slate-600">{progressPercent}%</span>
                </div>
              </div>

              <div className="mt-6 flex gap-3 overflow-x-auto pb-2" aria-label={`${track.name} challenges`}>
                {trackChallenges.map((challenge, index) => {
                  const isDone = completedIds.includes(challenge.id);
                  const isUnlocked = index === 0 || completedIds.includes(trackChallenges[index - 1].id);

                  return (
                    <React.Fragment key={challenge.id}>
                      <button
                        type="button"
                        onClick={() => onSelectChallenge(challenge)}
                        aria-label={`${challenge.title}, ${isDone ? 'solved' : isUnlocked ? 'ready' : 'locked'}`}
                        className={`focus-ring group min-h-[146px] w-64 shrink-0 rounded-xl border p-4 text-left transition-colors ${
                          isDone
                            ? 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-400'
                            : isUnlocked
                              ? 'border-teal-200 bg-teal-50/40 hover:border-teal-400'
                              : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                            <span className={`h-2 w-2 rounded-full ${isDone ? 'bg-emerald-600' : isUnlocked ? 'bg-enginx-primary' : 'bg-slate-300'}`} />
                            Node {index + 1}
                          </span>
                          {isDone ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Solved
                            </span>
                          ) : isUnlocked ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-teal-800">
                              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                              Ready
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                              Locked
                            </span>
                          )}
                        </span>

                        <span className="mt-4 block truncate text-sm font-bold text-slate-800 group-hover:text-teal-800">{challenge.title}</span>
                        <span className="mt-1 block truncate text-xs text-slate-500">{challenge.topic}</span>

                        <span className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          <span>{challenge.language}</span>
                          <span className="flex items-center gap-1 font-mono normal-case tracking-normal text-teal-800">
                            <Zap className="h-3 w-3" aria-hidden="true" />
                            +{challenge.xp_reward} XP
                          </span>
                        </span>
                      </button>

                      {index < trackChallenges.length - 1 && (
                        <span className="flex shrink-0 items-center self-center text-slate-300" aria-hidden="true">
                          <span className={`h-px w-6 ${isDone ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

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
  Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Challenge, ChallengeFilter, Discipline, SkillTree as SkillTreeData, User, UserProgress, UserStats } from '../../types';

interface SkillTreeProps {
  challenges: Challenge[];
  completedIds: string[];
  onSelectChallenge: (c: Challenge) => void;
  selectedDiscipline: ChallengeFilter;
  setSelectedDiscipline: (d: ChallengeFilter) => void;
  profile?: User | null;
  stats?: UserStats | null;
  progress?: UserProgress | null;
  skillTree?: SkillTreeData | null;
}

interface DisciplineTrack {
  id: Discipline;
  name: string;
  icon: LucideIcon;
  desc: string;
}

const RECOMMENDED_SKILLS: Record<string, string[]> = {
  cse: ['Data structures', 'Complexity analysis', 'Problem solving'],
  it: ['Web systems', 'Databases', 'Cloud fundamentals'],
  ece: ['Digital logic', 'Embedded C', 'Hardware verification'],
  eee: ['Circuit analysis', 'Control systems', 'Power electronics'],
  'ai/ml': ['Python for ML', 'Linear algebra', 'Model evaluation'],
  'ai&ds': ['Statistics', 'Data preparation', 'Applied machine learning'],
  'data science': ['Statistics', 'Data visualization', 'Experiment design'],
  cybersecurity: ['Threat modeling', 'Cryptography', 'Secure coding'],
  vlsi: ['Verilog HDL', 'RTL design', 'Verification'],
  'embedded systems': ['C programming', 'Microcontrollers', 'Real-time systems'],
  robotics: ['Kinematics', 'Sensors', 'Control systems'],
  mechatronics: ['Actuators', 'Embedded control', 'Automation'],
};

function recommendedSkills(profile: User | null): string[] {
  if (!profile) return [];
  const key = (profile.branch || profile.primary_role || '').toLowerCase();
  return RECOMMENDED_SKILLS[key] || (profile.primary_role === 'AI'
    ? ['Python for ML', 'Linear algebra', 'Model evaluation']
    : profile.primary_role === 'ECE'
      ? ['Digital logic', 'Embedded C', 'Hardware verification']
      : profile.primary_role === 'CYBER'
        ? ['Threat modeling', 'Cryptography', 'Secure coding']
        : profile.primary_role === 'ROBOTICS'
          ? ['Kinematics', 'Sensors', 'Control systems']
          : profile.primary_role === 'CSE'
            ? ['Data structures', 'Complexity analysis', 'Problem solving']
            : []);
}

export const SkillTree: React.FC<SkillTreeProps> = ({
  challenges,
  completedIds,
  onSelectChallenge,
  selectedDiscipline,
  setSelectedDiscipline,
  profile = null,
  stats = null,
  progress = null,
  skillTree = null,
}) => {
  const disciplineTracks: DisciplineTrack[] = [
    { id: 'cse', name: 'Computer science', icon: Code2, desc: 'Arrays, hash maps, binary search and complexity' },
    { id: 'ece-verilog', name: 'ECE · Verilog HDL', icon: Cpu, desc: 'Digital logic, adders, flip-flops and FSMs' },
    { id: 'ece-embedded', name: 'Embedded C', icon: Terminal, desc: 'Register manipulation, GPIO and timer interrupts' },
    { id: 'ece-matlab', name: 'ECE · MATLAB', icon: Waves, desc: 'Signals, DSP, modulation and numerical experiments' },
    { id: 'ai-ml', name: 'AI & machine learning', icon: Bot, desc: 'Perceptrons, activations, tensors and model math' },
    { id: 'cybersecurity', name: 'Cybersecurity & CTF', icon: Lock, desc: 'Cryptography, exploits, XOR cracking and forensics' },
    { id: 'robotics', name: 'Robotics & control', icon: Bot, desc: 'Forward kinematics, PID controllers and transforms' },
    { id: 'hardware', name: 'Hardware & logic', icon: Cpu, desc: 'Multiplexers, decoders and circuit simulation' },
  ];

  const serverNodes = skillTree?.nodes || [];
  const serverNodeById = new Map(serverNodes.map((node) => [node.id, node]));
  const challengeById = new Map(challenges.map((challenge) => [challenge.id, challenge]));
  const nextNode = serverNodes.find((node) => node.status === 'in_progress')
    || serverNodes.find((node) => node.status !== 'completed');
  const fallbackNextChallenge = challenges.find((challenge, index) => {
    if (completedIds.includes(challenge.id)) return false;
    return index === 0 || completedIds.includes(challenges[index - 1].id);
  });
  const continueChallenge = (nextNode ? challengeById.get(nextNode.id) : undefined) || fallbackNextChallenge;
  const completedTitles = (progress?.completed_challenges || completedIds)
    .map((id) => challengeById.get(id)?.title || id)
    .slice(0, 3);
  const skills = recommendedSkills(profile);
  const branchLabel = profile?.branch || profile?.primary_role || 'your engineering branch';

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

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]" aria-label="Personalized learning summary">
        <div className="rounded-2xl border border-teal-200 bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="eyebrow">Personal roadmap</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">{profile ? `${branchLabel} learning path` : 'Connect your profile to personalize this path'}</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                {profile?.goal
                  ? `Focused on: ${profile.goal}`
                  : profile
                    ? 'Add a learning goal in your profile to make recommendations more specific.'
                    : 'Your saved branch, goal, and verified progress will appear here after the profile service responds.'}
              </p>
            </div>
            {stats && (
              <div className="grid grid-cols-2 gap-2 text-center text-xs sm:min-w-[180px]">
                <div className="rounded-xl border border-teal-100 bg-teal-50 p-2.5">
                  <p className="font-mono text-lg font-bold text-teal-800">{stats.completed_count}</p>
                  <p className="text-slate-500">verified complete</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-2.5">
                  <p className="font-mono text-lg font-bold text-amber-800">{stats.total_challenges}</p>
                  <p className="text-slate-500">catalogue items</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Continue learning</p>
              {continueChallenge ? (
                <button
                  type="button"
                  onClick={() => onSelectChallenge(continueChallenge)}
                  className="focus-ring mt-2 text-left text-sm font-bold text-teal-800 hover:text-teal-950"
                >
                  {continueChallenge.title}
                  <span className="mt-1 block text-xs font-medium text-slate-500">Open the next unlocked challenge →</span>
                </button>
              ) : (
                <p className="mt-2 text-sm text-slate-600">No persisted next step is available yet.</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Recommended skills</p>
              {skills.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {skills.map((skill) => <li key={skill} className="rounded-full border border-teal-100 bg-white px-2.5 py-1 text-xs font-semibold text-teal-800">{skill}</li>)}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-600">Recommendations will appear after a branch is saved.</p>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Recent verified activity</p>
            {completedTitles.length > 0 ? (
              <ul className="mt-2 grid gap-2 sm:grid-cols-3">
                {completedTitles.map((title) => <li key={title} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{title}</li>)}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-600">No completed challenges have been returned for this learner yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
          <p className="eyebrow">Data source</p>
          <h2 className="mt-1 text-base font-bold text-slate-900">Backend-confirmed progress</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Completion counts and roadmap states come from saved progress records. This view does not estimate scores or manufacture activity while the API is unavailable.
          </p>
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
            {skillTree ? `${skillTree.nodes.length} roadmap nodes loaded from the learning API.` : 'Roadmap node data is still loading or unavailable.'}
          </div>
        </div>
      </section>

      <div className="space-y-5">
        {disciplineTracks.map((track) => {
          const trackChallenges = challenges.filter((challenge) => challenge.discipline === track.id);
          if (trackChallenges.length === 0) return null;

          const completedCount = trackChallenges.filter((challenge) => {
            const node = serverNodeById.get(challenge.id);
            return node?.status === 'completed' || completedIds.includes(challenge.id);
          }).length;
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
                  const node = serverNodeById.get(challenge.id);
                  const isDone = node?.status === 'completed' || completedIds.includes(challenge.id);
                  const isUnlocked = node
                    ? node.status !== 'locked'
                    : index === 0 || completedIds.includes(trackChallenges[index - 1].id);

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

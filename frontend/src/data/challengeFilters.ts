import type { Challenge, ChallengeFilter, EceSignalDomain } from '../types';

export interface ChallengeFilterOption {
  id: ChallengeFilter;
  label: string;
  description: string;
}

/**
 * Keep the aggregate MATLAB discipline and the three ECE learning domains as
 * separate explorer controls.  The aggregate id remains compatible with the
 * existing API, while domain ids are resolved from the local content records.
 */
export const CHALLENGE_FILTER_OPTIONS: ChallengeFilterOption[] = [
  { id: 'all', label: 'All tracks', description: 'Every challenge in the catalogue.' },
  { id: 'cse', label: 'CSE', description: 'Algorithms and computer science.' },
  { id: 'ece-verilog', label: 'ECE · Verilog', description: 'RTL and HDL practice.' },
  { id: 'ece-embedded', label: 'Embedded C', description: 'Firmware and register reasoning.' },
  { id: 'ece-matlab', label: 'MATLAB', description: 'MATLAB-compatible ECE exercises.' },
  { id: 'ece-signals', label: 'ECE · Signals', description: 'Signals & Systems topics.' },
  { id: 'ece-dsp', label: 'ECE · DSP', description: 'Digital signal processing topics.' },
  { id: 'ece-communications', label: 'ECE · Communications', description: 'Communication systems topics.' },
  { id: 'ai-ml', label: 'AI & ML', description: 'Machine learning and model math.' },
  { id: 'cybersecurity', label: 'Cybersecurity', description: 'Security and CTF practice.' },
  { id: 'robotics', label: 'Robotics', description: 'Robotics and control.' },
  { id: 'hardware', label: 'Hardware', description: 'Hardware and logic.' },
];

export type EngineeringBranch = 'ECE' | 'CSE' | 'AI' | 'CYBER' | 'ROBOTICS' | 'HARDWARE' | 'ALL';

export const BRANCH_LABELS: Record<EngineeringBranch, string> = {
  ECE: 'ECE · Electrical & Computer',
  CSE: 'CSE · Computer Science',
  AI: 'AI · Artificial Intelligence',
  CYBER: 'Cyber · Cybersecurity',
  ROBOTICS: 'Robotics · Automation',
  HARDWARE: 'Hardware · Digital Systems',
  ALL: 'All Disciplines',
};

export const BRANCH_DISCIPLINES: Record<EngineeringBranch, string[]> = {
  ECE: ['ece-verilog', 'ece-embedded', 'ece-matlab', 'hardware'],
  CSE: ['cse'],
  AI: ['ai-ml'],
  CYBER: ['cybersecurity'],
  ROBOTICS: ['robotics'],
  HARDWARE: ['hardware', 'ece-verilog'],
  ALL: ['cse', 'ece-verilog', 'ece-embedded', 'ece-matlab', 'ai-ml', 'cybersecurity', 'robotics', 'hardware'],
};

export function normalizeBranch(roleOrBranch: string | null | undefined): EngineeringBranch {
  if (!roleOrBranch) return 'ECE';
  const norm = roleOrBranch.trim().toUpperCase();
  if (['ECE', 'EEE', 'VLSI', 'EMBEDDED', 'EMBEDDED SYSTEMS', 'INSTRUMENTATION'].includes(norm)) return 'ECE';
  if (['CSE', 'IT', 'COMPUTER SCIENCE'].includes(norm)) return 'CSE';
  if (['AI', 'AI/ML', 'AI&DS', 'DATA SCIENCE', 'DATA_SCIENCE', 'AIML'].includes(norm)) return 'AI';
  if (['CYBER', 'CYBERSECURITY', 'SECURITY'].includes(norm)) return 'CYBER';
  if (['ROBOTICS', 'MECHATRONICS'].includes(norm)) return 'ROBOTICS';
  if (['HARDWARE'].includes(norm)) return 'HARDWARE';
  if (['ALL', 'ALL TRACKS', 'ALL BRANCHES'].includes(norm)) return 'ALL';
  return 'ECE';
}

export function isChallengeInBranch(challenge: Challenge, branch: EngineeringBranch): boolean {
  if (branch === 'ALL') return true;
  const allowed = BRANCH_DISCIPLINES[branch] || [];
  return allowed.includes(challenge.discipline);
}

export const BRANCH_FILTER_OPTIONS: Record<EngineeringBranch, ChallengeFilterOption[]> = {
  ECE: [
    { id: 'all', label: 'All ECE tracks', description: 'Every ECE challenge (Verilog, Embedded C, MATLAB & Hardware)' },
    { id: 'ece-verilog', label: 'ECE · Verilog', description: 'RTL and HDL practice.' },
    { id: 'ece-embedded', label: 'Embedded C', description: 'Firmware and register reasoning.' },
    { id: 'ece-matlab', label: 'MATLAB', description: 'MATLAB-compatible ECE exercises.' },
    { id: 'ece-signals', label: 'ECE · Signals', description: 'Signals & Systems topics.' },
    { id: 'ece-dsp', label: 'ECE · DSP', description: 'Digital signal processing topics.' },
    { id: 'ece-communications', label: 'ECE · Communications', description: 'Communication systems topics.' },
    { id: 'hardware', label: 'Hardware & Logic', description: 'Hardware and digital logic.' },
  ],
  CSE: [
    { id: 'all', label: 'All CSE tracks', description: 'Every challenge in Computer Science.' },
    { id: 'cse', label: 'Algorithms & Data Structures', description: 'Arrays, search, and coding practice.' },
  ],
  AI: [
    { id: 'all', label: 'All AI & ML tracks', description: 'Every challenge in Artificial Intelligence.' },
    { id: 'ai-ml', label: 'Neural Networks & Models', description: 'Neural networks and forward pass.' },
  ],
  CYBER: [
    { id: 'all', label: 'All Cybersecurity tracks', description: 'Every challenge in Cybersecurity.' },
    { id: 'cybersecurity', label: 'Cryptography & CTF', description: 'Security and crypto puzzles.' },
  ],
  ROBOTICS: [
    { id: 'all', label: 'All Robotics tracks', description: 'Every challenge in Robotics.' },
    { id: 'robotics', label: 'Kinematics & Control', description: 'Arm kinematics and control systems.' },
  ],
  HARDWARE: [
    { id: 'all', label: 'All Hardware tracks', description: 'Every challenge in Digital Hardware.' },
    { id: 'hardware', label: 'Logic Gates & MUX', description: 'Digital gates and multiplexers.' },
    { id: 'ece-verilog', label: 'Verilog RTL', description: 'RTL and HDL practice.' },
  ],
  ALL: CHALLENGE_FILTER_OPTIONS,
};

export function getFilterOptionsForBranch(branch: EngineeringBranch | string | null | undefined): ChallengeFilterOption[] {
  const norm = normalizeBranch(branch);
  return BRANCH_FILTER_OPTIONS[norm] || BRANCH_FILTER_OPTIONS.ECE;
}

export function isSignalDomainFilter(value: string): value is `ece-${EceSignalDomain}` {
  return value === 'ece-signals' || value === 'ece-dsp' || value === 'ece-communications';
}

export function signalDomainForFilter(value: string): EceSignalDomain | null {
  if (!isSignalDomainFilter(value)) return null;
  return value.replace('ece-', '') as EceSignalDomain;
}

export function matchesChallengeFilter(challenge: Challenge, filter: string | undefined): boolean {
  const normalized = filter || 'all';
  if (normalized === 'all') return true;
  if (isSignalDomainFilter(normalized)) {
    return challenge.discipline === 'ece-matlab' && challenge.signalDomain === signalDomainForFilter(normalized);
  }
  return challenge.discipline === normalized;
}

export function filterChallenges(
  challenges: Challenge[],
  filter: string | undefined,
  search = '',
  difficulty = 'all',
  branch?: EngineeringBranch | string | null,
): Challenge[] {
  const query = search.trim().toLowerCase();
  const normalizedDifficulty = difficulty || 'all';
  const targetBranch = branch ? normalizeBranch(branch) : null;

  return challenges.filter((challenge) => {
    if (targetBranch && targetBranch !== 'ALL') {
      if (!isChallengeInBranch(challenge, targetBranch)) return false;
    }
    const matchesDifficulty = normalizedDifficulty === 'all' || challenge.difficulty === normalizedDifficulty;
    const matchesSearch = !query
      || challenge.title.toLowerCase().includes(query)
      || challenge.topic.toLowerCase().includes(query)
      || challenge.tags.some((tag) => tag.toLowerCase().includes(query));
    return matchesChallengeFilter(challenge, filter) && matchesDifficulty && matchesSearch;
  });
}

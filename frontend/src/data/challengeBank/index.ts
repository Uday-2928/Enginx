import type { Challenge, Discipline, Difficulty } from '../../types';

/**
 * HDL coding bank: Verilog HDL, SystemVerilog and RTL Design, five difficulty
 * tiers each. Records are authored as JSON (one file per track-difficulty
 * group) so the same files seed the backend's `challenges` table — the server
 * copy of `test_cases` is the grading authority, this module is the display
 * source. Bank ids are prefixed `bank-` so the classic challenge catalogue can
 * exclude them.
 */

export const BANK_ID_PREFIX = 'bank-';

export type BankTrackId = 'verilog' | 'systemverilog' | 'rtl';

export interface BankTrack {
  id: BankTrackId;
  label: string;
  discipline: Discipline;
  language: 'verilog' | 'systemverilog';
  description: string;
}

export const BANK_TRACKS: BankTrack[] = [
  {
    id: 'verilog',
    label: 'Verilog HDL',
    discipline: 'ece-verilog',
    language: 'verilog',
    description: 'Synthesizable Verilog-2001 design, debugging and checking practice.',
  },
  {
    id: 'systemverilog',
    label: 'SystemVerilog',
    discipline: 'ece-systemverilog',
    language: 'systemverilog',
    description: 'SystemVerilog design and verification constructs, graded with Icarus -g2012.',
  },
  {
    id: 'rtl',
    label: 'RTL Design',
    discipline: 'ece-rtl',
    language: 'verilog',
    description: 'Specification-to-RTL practice: datapaths, FSMs, FIFOs, arbiters and pipelines.',
  },
];

export const BANK_DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Extra Hard', 'Insane'];

interface BankGroupSource {
  trackId: BankTrackId;
  difficulty: Difficulty;
  records: unknown;
}

import verilogEasy from './verilog-easy.json';
import verilogMedium from './verilog-medium.json';
import verilogHard from './verilog-hard.json';
import verilogExtraHard from './verilog-extra-hard.json';
import verilogInsane from './verilog-insane.json';
import systemverilogEasy from './systemverilog-easy.json';
import systemverilogMedium from './systemverilog-medium.json';
import systemverilogHard from './systemverilog-hard.json';
import systemverilogExtraHard from './systemverilog-extra-hard.json';
import systemverilogInsane from './systemverilog-insane.json';
import rtlEasy from './rtl-easy.json';
import rtlMedium from './rtl-medium.json';
import rtlHard from './rtl-hard.json';
import rtlExtraHard from './rtl-extra-hard.json';
import rtlInsane from './rtl-insane.json';

const GROUP_SOURCES: BankGroupSource[] = [
  { trackId: 'verilog', difficulty: 'Easy', records: verilogEasy },
  { trackId: 'verilog', difficulty: 'Medium', records: verilogMedium },
  { trackId: 'verilog', difficulty: 'Hard', records: verilogHard },
  { trackId: 'verilog', difficulty: 'Extra Hard', records: verilogExtraHard },
  { trackId: 'verilog', difficulty: 'Insane', records: verilogInsane },
  { trackId: 'systemverilog', difficulty: 'Easy', records: systemverilogEasy },
  { trackId: 'systemverilog', difficulty: 'Medium', records: systemverilogMedium },
  { trackId: 'systemverilog', difficulty: 'Hard', records: systemverilogHard },
  { trackId: 'systemverilog', difficulty: 'Extra Hard', records: systemverilogExtraHard },
  { trackId: 'systemverilog', difficulty: 'Insane', records: systemverilogInsane },
  { trackId: 'rtl', difficulty: 'Easy', records: rtlEasy },
  { trackId: 'rtl', difficulty: 'Medium', records: rtlMedium },
  { trackId: 'rtl', difficulty: 'Hard', records: rtlHard },
  { trackId: 'rtl', difficulty: 'Extra Hard', records: rtlExtraHard },
  { trackId: 'rtl', difficulty: 'Insane', records: rtlInsane },
];

export interface BankGroupCount {
  trackId: BankTrackId;
  difficulty: Difficulty;
  count: number;
}

const toChallenge = (
  record: Record<string, unknown>,
  trackId: BankTrackId,
  difficulty: Difficulty,
  orderIndex: number,
): Challenge => {
  const track = BANK_TRACKS.find((candidate) => candidate.id === trackId) ?? BANK_TRACKS[0];
  return {
    id: String(record.id ?? ''),
    slug: String(record.slug ?? record.id ?? ''),
    title: String(record.title ?? ''),
    discipline: track.discipline,
    difficulty,
    topic: String(record.topic ?? ''),
    language: String(record.language ?? track.language),
    order_index: Number(record.order_index ?? orderIndex),
    xp_reward: Number(record.xp_reward ?? 50),
    tags: Array.isArray(record.tags) ? (record.tags as string[]) : [],
    description: String(record.description ?? ''),
    starter_code: String(record.starter_code ?? ''),
    test_cases: Array.isArray(record.test_cases) ? (record.test_cases as Challenge['test_cases']) : [],
    solution_hints: Array.isArray(record.solution_hints) ? (record.solution_hints as string[]) : [],
    time_limit_ms: 2000,
    memory_limit_mb: 128,
  };
};

export const CHALLENGE_BANK: Challenge[] = GROUP_SOURCES.flatMap((group) => {
  const records = Array.isArray(group.records) ? (group.records as Array<Record<string, unknown>>) : [];
  return records.map((record, index) => toChallenge(record, group.trackId, group.difficulty, index + 1));
});

export const BANK_GROUP_COUNTS: BankGroupCount[] = GROUP_SOURCES.map((group) => ({
  trackId: group.trackId,
  difficulty: group.difficulty,
  count: Array.isArray(group.records) ? group.records.length : 0,
}));

export const BANK_TOTAL = CHALLENGE_BANK.length;

/** Every one of the 15 groups has reached its 50-question target. */
export const BANK_AUTHORING_COMPLETE = BANK_GROUP_COUNTS.every((group) => group.count >= 50);

export const bankGroupCount = (trackId: BankTrackId, difficulty: Difficulty): number =>
  BANK_GROUP_COUNTS.find((group) => group.trackId === trackId && group.difficulty === difficulty)?.count ?? 0;

export const bankTrackTotal = (trackId: BankTrackId): number =>
  BANK_GROUP_COUNTS.filter((group) => group.trackId === trackId).reduce((sum, group) => sum + group.count, 0);

export const bankSolvedCount = (trackId: BankTrackId, completedIds: ReadonlySet<string>): number =>
  CHALLENGE_BANK.filter((challenge) => {
    const track = BANK_TRACKS.find((candidate) => candidate.discipline === challenge.discipline);
    return track?.id === trackId && completedIds.has(challenge.id);
  }).length;

export const bankTopicsForTrack = (trackId: BankTrackId): string[] => {
  const topics = new Set<string>();
  for (const challenge of CHALLENGE_BANK) {
    const track = BANK_TRACKS.find((candidate) => candidate.discipline === challenge.discipline);
    if (track?.id === trackId && challenge.topic) topics.add(challenge.topic);
  }
  return Array.from(topics).sort();
};

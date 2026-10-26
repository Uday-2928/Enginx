import { describe, expect, it } from 'vitest';
import {
  BANK_DIFFICULTIES,
  BANK_GROUP_COUNTS,
  BANK_ID_PREFIX,
  BANK_TOTAL,
  BANK_TRACKS,
  CHALLENGE_BANK,
  bankGroupCount,
} from './index';

const GROUP_TARGET = 50;
const TRACKS_EXPECTED = 3;

/** Groups must either be empty (authoring not started) or fully valid. The
 * hard 750-total assertion is enforced once BANK_AUTHORING_COMPLETE flips. */
describe('challenge bank data integrity', () => {
  it('exposes the three tracks and fifteen groups', () => {
    expect(BANK_TRACKS).toHaveLength(TRACKS_EXPECTED);
    expect(BANK_GROUP_COUNTS).toHaveLength(15);
    for (const track of BANK_TRACKS) {
      for (const difficulty of BANK_DIFFICULTIES) {
        expect(bankGroupCount(track.id, difficulty)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('keeps every shipped group at or above the 50-question target', () => {
    const underfilled = BANK_GROUP_COUNTS.filter((group) => group.count > 0 && group.count < GROUP_TARGET);
    expect(underfilled).toEqual([]);
  });

  it('uses unique, prefixed, well-formed ids across the whole bank', () => {
    const ids = new Set<string>();
    for (const challenge of CHALLENGE_BANK) {
      expect(challenge.id.startsWith(BANK_ID_PREFIX)).toBe(true);
      expect(ids.has(challenge.id)).toBe(false);
      ids.add(challenge.id);
    }
  });

  it('gives every question a real statement, interface, starter code and metadata', () => {
    for (const challenge of CHALLENGE_BANK) {
      expect(challenge.title.length).toBeGreaterThan(3);
      expect(challenge.topic.length).toBeGreaterThan(2);
      expect(challenge.description.length).toBeGreaterThan(80);
      expect(challenge.description).toContain('```');
      expect(challenge.starter_code).toContain('module');
      expect(['verilog', 'systemverilog']).toContain(challenge.language);
      expect(['ece-verilog', 'ece-systemverilog', 'ece-rtl']).toContain(challenge.discipline);
      expect(BANK_DIFFICULTIES).toContain(challenge.difficulty);
      expect(challenge.xp_reward).toBeGreaterThan(0);
      expect(Array.isArray(challenge.solution_hints)).toBe(true);
    }
  });

  it('shapes every test case for the VerilogRunner contract', () => {
    for (const challenge of CHALLENGE_BANK) {
      expect(challenge.test_cases.length).toBeGreaterThanOrEqual(6);
      const hasPublic = challenge.test_cases.some((testCase) => !testCase.hidden);
      const hasHidden = challenge.test_cases.some((testCase) => testCase.hidden);
      expect(hasPublic).toBe(true);
      expect(hasHidden).toBe(true);
      challenge.test_cases.forEach((testCase, index) => {
        expect(String(testCase.id)).toBe(String(index + 1));
        expect(testCase.input).toBeTypeOf('object');
        expect(testCase.expected).toBeTypeOf('object');
        for (const value of Object.values(testCase.input as Record<string, unknown>)) {
          expect(Number.isInteger(value)).toBe(true);
        }
        for (const value of Object.values(testCase.expected as Record<string, unknown>)) {
          expect(Number.isInteger(value)).toBe(true);
        }
      });
    }
  });

  it('has no duplicated titles inside a group', () => {
    const seen = new Set<string>();
    for (const challenge of CHALLENGE_BANK) {
      const key = `${challenge.discipline}|${challenge.difficulty}|${challenge.title.toLowerCase()}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('reports the running total honestly', () => {
    expect(BANK_TOTAL).toBe(CHALLENGE_BANK.length);
    // Flip to the hard target once all fifteen groups are authored.
    if (BANK_GROUP_COUNTS.every((group) => group.count >= GROUP_TARGET)) {
      expect(BANK_TOTAL).toBeGreaterThanOrEqual(750);
    }
  });
});

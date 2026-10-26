import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronRight, Search } from 'lucide-react';
import type { Challenge, Difficulty } from '../../types';
import { difficultyBadgeClasses } from '../tutorials/levelBadge';
import {
  BANK_AUTHORING_COMPLETE,
  BANK_DIFFICULTIES,
  BANK_TOTAL,
  BANK_TRACKS,
  bankGroupCount,
  bankSolvedCount,
  bankTopicsForTrack,
  bankTrackTotal,
  type BankTrackId,
} from '../../data/challengeBank';

interface ChallengeBankProps {
  completedIds: ReadonlySet<string>;
  onOpenChallenge: (challenge: Challenge) => void;
}

type StatusFilter = 'all' | 'unsolved' | 'solved';

const VISIBLE_STEP = 40;

/**
 * Browser for the JSON-authored HDL coding bank. The bank loads lazily so the
 * main bundle stays light; grading always happens server-side through the
 * existing submission flow, which receives the seeded copy of each question.
 */
export const ChallengeBank: React.FC<ChallengeBankProps> = ({ completedIds, onOpenChallenge }) => {
  const [bank, setBank] = useState<Challenge[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [trackId, setTrackId] = useState<BankTrackId>('verilog');
  const [difficulty, setDifficulty] = useState<Difficulty | 'All'>('All');
  const [topic, setTopic] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(VISIBLE_STEP);

  useEffect(() => {
    let active = true;
    import('../../data/challengeBank')
      .then((module) => {
        if (active) setBank(module.CHALLENGE_BANK);
      })
      .catch(() => {
        if (active) setLoadError('The coding bank could not be loaded. Refresh to try again.');
      });
    return () => {
      active = false;
    };
  }, []);

  const track = BANK_TRACKS.find((candidate) => candidate.id === trackId) ?? BANK_TRACKS[0];

  const topics = useMemo(() => (bank ? bankTopicsForTrack(trackId) : []), [bank, trackId]);

  const filtered = useMemo(() => {
    if (!bank) return [];
    const needle = query.trim().toLowerCase();
    return bank
      .filter((challenge) => {
        if (challenge.discipline !== track.discipline) return false;
        if (difficulty !== 'All' && challenge.difficulty !== difficulty) return false;
        if (topic && challenge.topic !== topic) return false;
        if (status === 'solved' && !completedIds.has(challenge.id)) return false;
        if (status === 'unsolved' && completedIds.has(challenge.id)) return false;
        if (needle && !(`${challenge.title} ${challenge.topic} ${challenge.tags.join(' ')}`.toLowerCase().includes(needle))) return false;
        return true;
      })
      .sort((a, b) => a.order_index - b.order_index);
  }, [bank, track.discipline, difficulty, topic, status, query, completedIds]);

  const solvedInTrack = bank ? bankSolvedCount(trackId, completedIds) : 0;
  const trackTotal = bankTrackTotal(trackId);
  const authoredTotal = BANK_AUTHORING_COMPLETE ? 750 : bank ? BANK_TOTAL : 0;

  const resetPaging = () => setVisibleCount(VISIBLE_STEP);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <header>
        <p className="eyebrow">Practice bank</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Coding tracks</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          LeetCode-style HDL practice across Verilog, SystemVerilog and RTL design. Every question is
          graded by the platform evaluator against server-owned test cases; drafts and solved state use
          your existing learner profile.
        </p>
      </header>

      {loadError && (
        <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700" role="alert">
          {loadError}
        </p>
      )}

      {!bank && !loadError && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-500">Loading the coding bank.</p>
        </div>
      )}

      {bank && (
        <>
          <div className="mt-6 grid gap-2 rounded-xl border border-slate-200 bg-white p-1 sm:grid-cols-3" role="tablist" aria-label="Coding track">
            {BANK_TRACKS.map((candidate) => {
              const selected = candidate.id === trackId;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => {
                    setTrackId(candidate.id);
                    setDifficulty('All');
                    setTopic(null);
                    setStatus('all');
                    setQuery('');
                    resetPaging();
                  }}
                  className={`focus-ring flex min-h-[44px] flex-col items-center justify-center rounded-lg px-3 py-1.5 text-center transition-colors ${
                    selected ? 'bg-slate-50 ring-1 ring-slate-200' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className={`text-sm font-semibold ${selected ? 'text-teal-800' : 'text-slate-600'}`}>
                    {candidate.label}
                  </span>
                  <span className="text-xs tabular-nums text-slate-500">
                    {bankTrackTotal(candidate.id)} questions · {bankSolvedCount(candidate.id, completedIds)} solved
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600">{track.description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Difficulty filter">
            <button
              type="button"
              onClick={() => {
                setDifficulty('All');
                resetPaging();
              }}
              className={`focus-ring min-h-[36px] rounded-full border px-3 text-xs font-semibold transition-colors ${
                difficulty === 'All' ? 'border-teal-300 bg-teal-50 text-teal-900' : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300'
              }`}
            >
              All difficulties
            </button>
            {BANK_DIFFICULTIES.map((tier) => {
              const count = bankGroupCount(trackId, tier);
              const selected = difficulty === tier;
              return (
                <button
                  key={tier}
                  type="button"
                  disabled={count === 0}
                  onClick={() => {
                    setDifficulty(tier);
                    resetPaging();
                  }}
                  title={count === 0 ? 'No questions authored in this group yet.' : undefined}
                  className={`focus-ring min-h-[36px] rounded-full border px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    selected ? difficultyBadgeClasses(tier) : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300'
                  }`}
                >
                  {tier} <span className="tabular-nums">({count})</span>
                </button>
              );
            })}
          </div>

          {topics.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2" aria-label="Topic filter">
              {topic && (
                <button
                  type="button"
                  onClick={() => {
                    setTopic(null);
                    resetPaging();
                  }}
                  className="focus-ring min-h-[36px] rounded-full border border-teal-300 bg-teal-50 px-3 text-xs font-semibold text-teal-900"
                >
                  {topic} · clear
                </button>
              )}
              {topics.filter((candidate) => candidate !== topic).slice(0, 8).map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  onClick={() => {
                    setTopic(candidate);
                    resetPaging();
                  }}
                  className="focus-ring min-h-[36px] rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:border-teal-300"
                >
                  {candidate}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  resetPaging();
                }}
                placeholder="Search titles, topics and tags"
                aria-label="Search the coding bank"
                className="focus-ring min-h-[44px] w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 hover:border-teal-300"
              />
            </div>
            <div className="flex gap-2" role="group" aria-label="Solved status filter">
              {(['all', 'unsolved', 'solved'] as StatusFilter[]).map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  onClick={() => {
                    setStatus(candidate);
                    resetPaging();
                  }}
                  className={`focus-ring min-h-[40px] rounded-lg border px-3 text-xs font-semibold capitalize transition-colors ${
                    status === candidate ? 'border-teal-300 bg-teal-50 text-teal-900' : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300'
                  }`}
                >
                  {candidate}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Showing <span className="tabular-nums">{filtered.length}</span> of{' '}
            <span className="tabular-nums">{trackTotal}</span> questions in this track ·{' '}
            <span className="tabular-nums">{solvedInTrack}</span> solved ·{' '}
            <span className="tabular-nums">{authoredTotal}</span> authored bank-wide
          </p>

          {filtered.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-sm font-semibold text-slate-700">No questions match these filters.</p>
              <p className="mt-1 text-sm text-slate-500">Clear the search or pick another difficulty.</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {filtered.slice(0, visibleCount).map((challenge) => {
                const solved = completedIds.has(challenge.id);
                return (
                  <li key={challenge.id}>
                    <button
                      type="button"
                      onClick={() => onOpenChallenge(challenge)}
                      className="focus-ring flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-teal-300"
                    >
                      <span className="flex min-w-0 flex-col gap-1.5">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={difficultyBadgeClasses(challenge.difficulty)}>{challenge.difficulty}</span>
                          <span className="truncate text-sm font-semibold text-slate-900">{challenge.title}</span>
                        </span>
                        <span className="truncate text-xs text-slate-500">
                          {challenge.topic} · {challenge.language} · <span className="tabular-nums">+{challenge.xp_reward} XP</span> on pass
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {solved && <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-label="Solved" />}
                        <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {filtered.length > visibleCount && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((current) => current + VISIBLE_STEP)}
                className="focus-ring btn-secondary"
              >
                Show more questions
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

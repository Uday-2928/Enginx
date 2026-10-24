import React from 'react';
import { Flame, Medal, Trophy, Users } from 'lucide-react';
import type { LeaderboardEntry } from '../../types';

interface LeaderboardProps {
  entries?: LeaderboardEntry[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ entries = [] }) => {
  const rankDisplay = (rank: number) => {
    if (rank === 1) return <Medal className="h-4 w-4 text-amber-600" aria-hidden="true" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-slate-500" aria-hidden="true" />;
    if (rank === 3) return <Medal className="h-4 w-4 text-orange-700" aria-hidden="true" />;
    return <span className="w-4 text-center text-slate-500">{rank}</span>;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-teal-100 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            Community momentum
          </span>
          <h1 className="mt-3 flex items-center gap-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Engineering leaderboard
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            See how learners are progressing through verified submissions, hardware simulations, and discipline badges.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 sm:self-auto">
          <Trophy className="h-4 w-4 text-enginx-cta" aria-hidden="true" />
          <span>Monthly rankings</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-teal-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <caption className="sr-only">Global engineering leaderboard</caption>
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-4 font-semibold">Rank</th>
                <th scope="col" className="px-4 py-4 font-semibold">Engineer</th>
                <th scope="col" className="px-4 py-4 font-semibold">Discipline</th>
                <th scope="col" className="px-4 py-4 text-center font-semibold">Completed</th>
                <th scope="col" className="px-4 py-4 text-center font-semibold">Streak</th>
                <th scope="col" className="px-4 py-4 text-right font-semibold">Total XP</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Trophy className="mx-auto h-7 w-7 text-teal-600" aria-hidden="true" />
                    <p className="mt-3 text-sm font-semibold text-slate-800">Leaderboard data is not available yet</p>
                    <p className="mt-1 text-xs text-slate-500">Connect to the backend to load verified learner rankings.</p>
                  </td>
                </tr>
              ) : entries.map((user) => {
                const isCurrentUser = user.name.toLowerCase().includes('(you)');
                return (
                  <tr
                    key={user.id}
                    className={`border-b border-slate-100 transition-colors last:border-b-0 hover:bg-teal-50/50 ${isCurrentUser ? 'bg-teal-50/70' : ''}`}
                  >
                    <td className="px-4 py-4 font-mono font-bold text-slate-700">
                      <span className="flex items-center gap-2">
                        {rankDisplay(user.rank)}
                        <span className="sr-only">Rank {user.rank}</span>
                      </span>
                    </td>
                    <th scope="row" className="px-4 py-4 font-medium">
                      <span className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-teal-200 bg-teal-50 text-xs font-bold text-teal-800" aria-hidden="true">
                          {user.name.charAt(0)}
                        </span>
                        <span className={isCurrentUser ? 'font-bold text-teal-800' : 'text-slate-800'}>{user.name}</span>
                      </span>
                    </th>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">{user.role}</span>
                    </td>
                    <td className="px-4 py-4 text-center font-mono text-slate-700">{user.completed_challenges}</td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1 font-mono font-semibold text-amber-700">
                        <Flame className="h-3.5 w-3.5 text-enginx-cta" aria-hidden="true" />
                        {user.streak_days}d
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-slate-800">
                      {user.xp} <span className="text-[10px] text-enginx-primary">XP</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

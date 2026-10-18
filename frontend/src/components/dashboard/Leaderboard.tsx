import React from 'react';
import { Trophy, Medal, Flame, Zap, Award, ExternalLink } from 'lucide-react';

interface LeaderboardUser {
  rank: number;
  id: string;
  name: string;
  role: string;
  xp: number;
  streak_days: number;
  completed_challenges: number;
  badges_count: number;
}

export const Leaderboard: React.FC = () => {
  const mockLeaderboard: LeaderboardUser[] = [
    { rank: 1, id: '1', name: 'Elena Rostova', role: 'ECE', xp: 1450, streak_days: 18, completed_challenges: 14, badges_count: 5 },
    { rank: 2, id: '2', name: 'Devon Vance', role: 'CYBER', xp: 1220, streak_days: 12, completed_challenges: 11, badges_count: 4 },
    { rank: 3, id: '3', name: 'Kai Takahashi', role: 'ROBOTICS', xp: 980, streak_days: 9, completed_challenges: 9, badges_count: 3 },
    { rank: 4, id: '4', name: 'Alex Rivera (You)', role: 'ECE', xp: 580, streak_days: 5, completed_challenges: 4, badges_count: 2 },
    { rank: 5, id: '5', name: 'Maya Patel', role: 'AI', xp: 520, streak_days: 4, completed_challenges: 4, badges_count: 2 },
    { rank: 6, id: '6', name: 'Liam O\'Connor', role: 'CSE', xp: 440, streak_days: 3, completed_challenges: 3, badges_count: 1 },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#223147]">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <Trophy className="w-6 h-6 text-amber-400" />
            <span>Global Engineering Leaderboard</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Top engineers ranked by verified problem submissions, hardware simulations, and circuit badges.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 bg-[#161F2E] px-3 py-1.5 rounded-lg border border-[#223147]">
          <span>Reset Cadence:</span>
          <span className="text-[#0066FF] font-bold">Monthly</span>
        </div>
      </div>

      {/* Leaderboard Table Card */}
      <div className="bg-[#111827] border border-[#223147] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161F2E] text-slate-400 uppercase font-mono border-b border-[#223147]">
              <tr>
                <th className="py-3 px-4 w-16">Rank</th>
                <th className="py-3 px-4">Engineer</th>
                <th className="py-3 px-4">Primary Discipline</th>
                <th className="py-3 px-4 text-center">Completed</th>
                <th className="py-3 px-4 text-center">Streak</th>
                <th className="py-3 px-4 text-right">Total XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#223147]">
              {mockLeaderboard.map((u) => {
                const isCurrentUser = u.name.includes('(You)');
                return (
                  <tr
                    key={u.id}
                    className={`hover:bg-[#161F2E]/60 transition-colors ${
                      isCurrentUser ? 'bg-[#0066FF]/10 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold">
                      {u.rank === 1 && <span className="text-amber-400 flex items-center space-x-1"><Medal className="w-4 h-4 fill-amber-400" /><span>#1</span></span>}
                      {u.rank === 2 && <span className="text-slate-300 flex items-center space-x-1"><Medal className="w-4 h-4 fill-slate-300" /><span>#2</span></span>}
                      {u.rank === 3 && <span className="text-amber-600 flex items-center space-x-1"><Medal className="w-4 h-4 fill-amber-600" /><span>#3</span></span>}
                      {u.rank > 3 && <span className="text-slate-400 pl-5">#{u.rank}</span>}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-white flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#161F2E] border border-slate-700 flex items-center justify-center text-[10px] font-bold text-[#0066FF]">
                        {u.name.charAt(0)}
                      </div>
                      <span className={isCurrentUser ? 'text-[#0066FF]' : 'text-slate-200'}>
                        {u.name}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                      {u.completed_challenges}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center space-x-1 text-amber-400 font-mono font-semibold">
                        <Flame className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{u.streak_days}d</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0066FF]">
                      <span className="text-white">{u.xp}</span> <span className="text-[10px]">XP</span>
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

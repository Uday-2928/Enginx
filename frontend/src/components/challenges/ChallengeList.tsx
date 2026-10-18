import React from 'react';
import {
  Code, Cpu, Shield, Bot, Terminal, CheckCircle2,
  Lock, ArrowRight, Zap, Sparkles
} from 'lucide-react';
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
  setSearchQuery
}) => {
  const disciplines: { id: Discipline; label: string; icon: any; color: string }[] = [
    { id: 'all', label: 'All Tracks', icon: Sparkles, color: '#0066FF' },
    { id: 'cse', label: 'CSE (Algorithms)', icon: Code, color: '#0066FF' },
    { id: 'ece-verilog', label: 'ECE (Verilog HDL)', icon: Cpu, color: '#2ECC71' },
    { id: 'ece-embedded', label: 'Embedded C', icon: Terminal, color: '#2ECC71' },
    { id: 'ai-ml', label: 'AI & Machine Learning', icon: Bot, color: '#A901DB' },
    { id: 'cybersecurity', label: 'Cybersecurity (CTF)', icon: Shield, color: '#A901DB' },
    { id: 'robotics', label: 'Robotics & Control', icon: Bot, color: '#0066FF' },
    { id: 'hardware', label: 'Hardware & Logic', icon: Cpu, color: '#2ECC71' },
  ];

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'Easy':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#2ECC71]/15 text-[#2ECC71] border border-[#2ECC71]/30">Easy</span>;
      case 'Medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">Medium</span>;
      case 'Hard':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">Hard</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#111827] border border-[#223147] rounded-xl overflow-hidden">
      {/* Search & Discipline Filter Bar */}
      <div className="p-4 bg-[#161F2E] border-b border-[#223147] space-y-3">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search problems, topics (e.g. Verilog, Adder, XOR)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3.5 py-2 pl-9 bg-[#0B0F17] border border-[#223147] rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#0066FF] transition-colors"
          />
          <Terminal className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>

        {/* Discipline Filter Chips */}
        <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          {disciplines.map((d) => {
            const Icon = d.icon;
            const isSelected = selectedDiscipline === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDiscipline(d.id)}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[#0066FF] text-white shadow-[0_0_10px_rgba(0,102,255,0.3)]'
                    : 'bg-[#0B0F17] text-slate-400 hover:text-white border border-[#223147]'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{d.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Challenge List Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#223147]/50 p-2 space-y-1">
        {challenges.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No challenges match the current filter criteria.
          </div>
        ) : (
          challenges.map((c) => {
            const isSelected = selectedChallengeId === c.id;
            const isCompleted = completedIds.includes(c.id);

            return (
              <div
                key={c.id}
                onClick={() => onSelectChallenge(c)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#161F2E] border border-[#0066FF]/60 shadow-[0_0_15px_rgba(0,102,255,0.15)]'
                    : 'hover:bg-[#161F2E]/60 border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2.5">
                    {/* Status Icon */}
                    <div className="mt-0.5">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-[#2ECC71] fill-[#2ECC71]/20" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className={`text-xs font-semibold leading-snug ${isSelected ? 'text-[#0066FF]' : 'text-slate-200'}`}>
                        {c.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {c.topic}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-1">
                    {getDifficultyBadge(c.difficulty)}
                    <span className="text-[10px] font-mono text-slate-400 flex items-center space-x-0.5">
                      <Zap className="w-2.5 h-2.5 text-[#0066FF]" />
                      <span>+{c.xp_reward} XP</span>
                    </span>
                  </div>
                </div>

                {/* Tags */}
                <div className="mt-2.5 flex items-center space-x-1.5 overflow-hidden">
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                    {c.language}
                  </span>
                  {c.tags.slice(0, 2).map((t, idx) => (
                    <span key={idx} className="text-[10px] text-slate-400 truncate">
                      • {t}
                    </span>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

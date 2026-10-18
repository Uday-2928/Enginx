import React from 'react';
import {
  Award, Zap, Cpu, CircuitBoard, Brain,
  ShieldCheck, Bot, CheckCircle2, Lock
} from 'lucide-react';
import { Badge } from '../../types';

interface BadgeCollectionProps {
  badges: Badge[];
}

export const BadgeCollection: React.FC<BadgeCollectionProps> = ({ badges }) => {
  const getIcon = (iconName: string, earned: boolean) => {
    const cls = `w-7 h-7 ${earned ? 'text-[#0066FF]' : 'text-slate-500'}`;
    switch (iconName) {
      case 'Zap': return <Zap className={cls} />;
      case 'Cpu': return <Cpu className={cls} />;
      case 'CircuitBoard': return <CircuitBoard className={cls} />;
      case 'Brain': return <Brain className={cls} />;
      case 'ShieldCheck': return <ShieldCheck className={cls} />;
      case 'Bot': return <Bot className={cls} />;
      default: return <Award className={cls} />;
    }
  };

  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#223147]">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <Award className="w-6 h-6 text-[#A901DB]" />
            <span>Circuit Badges & Achievements</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Proof of engineering mastery unlocked across real-world compiler, synthesis, and CTF challenges.
          </p>
        </div>

        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#161F2E] border border-[#223147] text-xs font-mono text-slate-300">
          <span>Unlocked:</span>
          <span className="font-bold text-[#0066FF]">{earnedCount}</span>
          <span>/</span>
          <span>{badges.length}</span>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {badges.map((b) => (
          <div
            key={b.id}
            className={`p-5 rounded-2xl border transition-all relative overflow-hidden ${
              b.earned
                ? 'bg-[#161F2E] border-[#0066FF]/40 shadow-[0_0_20px_rgba(0,102,255,0.15)]'
                : 'bg-[#111827] border-[#223147] opacity-60'
            }`}
          >
            {/* Background circuit trace pattern */}
            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 rounded-full border border-dashed border-[#223147]/60 pointer-events-none" />

            <div className="flex items-start space-x-4">
              {/* Badge Icon Emblem */}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                b.earned
                  ? 'bg-gradient-to-br from-[#161F2E] to-[#0B0F17] border-[#0066FF] shadow-[0_0_15px_rgba(0,102,255,0.3)]'
                  : 'bg-[#0B0F17] border-[#223147]'
              }`}>
                {getIcon(b.icon, b.earned)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className={`font-bold text-sm truncate ${b.earned ? 'text-white' : 'text-slate-400'}`}>
                    {b.name}
                  </h3>
                  {b.earned ? (
                    <span className="flex items-center space-x-1 text-[10px] font-bold text-[#2ECC71]">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Unlocked</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-[10px] text-slate-500">
                      <Lock className="w-3 h-3" />
                      <span>Locked</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-1 leading-snug">
                  {b.description}
                </p>

                <div className="mt-3 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500 uppercase text-[10px]">
                    Track: {b.discipline}
                  </span>
                  <span className="text-[#0066FF] font-semibold">
                    +{b.xp_bonus} XP
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

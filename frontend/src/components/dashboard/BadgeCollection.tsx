import React from 'react';
import {
  Award,
  Brain,
  Bot,
  CheckCircle2,
  CircuitBoard,
  Cpu,
  Lock,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Badge } from '../../types';

interface BadgeCollectionProps {
  badges: Badge[];
}

export const BadgeCollection: React.FC<BadgeCollectionProps> = ({ badges }) => {
  const getIcon = (iconName: string, earned: boolean) => {
    const className = `h-7 w-7 ${earned ? 'text-enginx-primary' : 'text-slate-400'}`;
    switch (iconName) {
      case 'Zap': return <Zap className={className} aria-hidden="true" />;
      case 'Cpu': return <Cpu className={className} aria-hidden="true" />;
      case 'CircuitBoard': return <CircuitBoard className={className} aria-hidden="true" />;
      case 'Brain': return <Brain className={className} aria-hidden="true" />;
      case 'ShieldCheck': return <ShieldCheck className={className} aria-hidden="true" />;
      case 'Bot': return <Bot className={className} aria-hidden="true" />;
      default: return <Award className={className} aria-hidden="true" />;
    }
  };

  const earnedCount = badges.filter((badge) => badge.earned).length;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow">Milestones</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Badges</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Badges awarded for verified challenge milestones.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 sm:self-auto">
          <span>Unlocked</span>
          <span className="tabular-nums text-enginx-primary">{earnedCount}</span>
          <span className="text-slate-300">/</span>
          <span className="tabular-nums">{badges.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {badges.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <Award className="mx-auto h-7 w-7 text-slate-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-800">Badge data is not available yet</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">Complete a verified challenge after the profile service is connected to see earned milestones here.</p>
          </div>
        ) : badges.map((badge) => (
          <article
            key={badge.id}
            className={`surface-card p-5 transition-colors ${
              badge.earned
                ? 'hover:border-teal-300'
                : ''
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${
                badge.earned
                  ? 'border-teal-200 bg-teal-50'
                  : 'border-slate-200 bg-white'
              }`}>
                {getIcon(badge.icon, badge.earned)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className={`truncate text-sm font-semibold ${badge.earned ? 'text-slate-900' : 'text-slate-500'}`}>
                    {badge.name}
                  </h2>
                  {badge.earned ? (
                    <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      Earned
                    </span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-slate-400">
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      Locked
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-600">{badge.description}</p>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-200 pt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <span>Track: {badge.discipline}</span>
                  <span className="tabular-nums normal-case tracking-normal text-teal-800">+{badge.xp_bonus} XP</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

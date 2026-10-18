import React from 'react';
import { CheckCircle2, Clock3, FileText, Gauge, Tag } from 'lucide-react';
import { Challenge } from '../../types';

interface ChallengeDetailsProps {
  challenge: Challenge;
  isCompleted: boolean;
}

export const ChallengeDetails: React.FC<ChallengeDetailsProps> = ({
  challenge,
  isCompleted,
}) => {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-teal-100 bg-white">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/80 p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-enginx-primary">
            <FileText className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="eyebrow">Challenge brief</p>
            <h1 className="mt-1 text-base font-bold leading-snug text-slate-900 sm:text-lg">{challenge.title}</h1>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {isCompleted && (
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Completed</span>
            </span>
          )}
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-mono text-xs font-bold text-amber-800">
            +{challenge.xp_reward} XP
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4 text-sm leading-relaxed text-slate-700 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
          <span className="text-xs font-semibold text-slate-500">Track</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase text-slate-700">
            {challenge.discipline}
          </span>
          <span className="hidden text-slate-300 sm:inline" aria-hidden="true">/</span>
          <span className="text-xs font-semibold text-slate-500">Topic</span>
          <span className="text-xs font-medium text-slate-800">{challenge.topic}</span>
          <span className="hidden text-slate-300 sm:inline" aria-hidden="true">/</span>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            {challenge.time_limit_ms}ms
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
            {challenge.memory_limit_mb}MB
          </span>
        </div>

        <div
          className="challenge-copy max-w-none"
          dangerouslySetInnerHTML={{ __html: formatMarkdown(challenge.description) }}
        />

        <div className="border-t border-slate-200 pt-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Tag className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Concepts &amp; tags</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {challenge.tags.map((tag) => (
              <span key={tag} className="rounded-lg border border-teal-100 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// The challenge catalogue uses a small, predictable markdown subset. Keeping
// formatting local lets the details panel stay dependency-free and fast.
function formatMarkdown(content: string): string {
  return content
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/```([a-zA-Z]*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

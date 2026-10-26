import React from 'react';
import { BookOpen, CheckCircle2, CircleAlert, Clock3, FileText, Gauge, Tag, Terminal } from 'lucide-react';
import type { Challenge } from '../../types';

interface ChallengeDetailsProps {
  challenge: Challenge;
  isCompleted: boolean;
  lessonId?: string;
  lessonCompleted?: boolean;
  isCompletingLesson?: boolean;
  lessonError?: string | null;
  onCompleteLesson?: () => void;
}

export const ChallengeDetails: React.FC<ChallengeDetailsProps> = ({
  challenge,
  isCompleted,
  lessonId,
  lessonCompleted = false,
  isCompletingLesson = false,
  lessonError = null,
  onCompleteLesson,
}) => {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/80 p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="icon-chip">
            <FileText className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="eyebrow">Challenge brief</p>
            <h1 className="mt-1 text-base font-semibold leading-snug text-slate-900">{challenge.title}</h1>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {isCompleted && (
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Completed</span>
            </span>
          )}
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-amber-800">
            +{challenge.xp_reward} XP
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4 text-sm leading-relaxed text-slate-700 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
          <span className="text-xs font-semibold text-slate-500">Track</span>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold uppercase text-slate-600">
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
              <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {challenge.execution && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950" role="status" aria-label="Execution availability">
            <div className="flex items-start gap-2">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-bold">Execution boundary</p>
                <p className="mt-1 font-semibold">{challenge.execution.runtimeLabel} · {executionStatusLabel(challenge.execution.status)}</p>
                <p className="mt-1">{challenge.execution.notes}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                  {challenge.starterVerified && <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-semibold text-emerald-800"><Terminal className="h-3 w-3" aria-hidden="true" />Starter syntax verified</span>}
                  <span className="rounded-full border border-amber-200 bg-white/70 px-2 py-1 font-semibold">Toolboxes: {challenge.execution.requiredToolboxes?.length ? challenge.execution.requiredToolboxes.join(', ') : 'none required'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {lessonId && onCompleteLesson && (
          <div className="border-t border-slate-200 pt-4">
            <div className="flex flex-col gap-3 rounded-xl border border-teal-100 bg-teal-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Lesson progress</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {lessonCompleted ? 'Saved to your learner profile. You can revisit this lesson any time.' : 'Mark this challenge lesson complete after reviewing the brief.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onCompleteLesson()}
                disabled={lessonCompleted || isCompletingLesson}
                className="focus-ring btn-primary shrink-0"
              >
                {isCompletingLesson ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-slate-600" aria-hidden="true" />
                ) : lessonCompleted ? (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                ) : null}
                <span>{isCompletingLesson ? 'Saving…' : lessonCompleted ? 'Completed' : 'Mark complete'}</span>
              </button>
            </div>
            {lessonError && <p className="mt-2 text-xs font-semibold text-rose-700" role="alert">{lessonError}</p>}
          </div>
        )}
      </div>
    </section>
  );
};

function executionStatusLabel(status: NonNullable<Challenge['execution']>['status']): string {
  switch (status) {
    case 'verified': return 'verified runtime result';
    case 'unavailable': return 'runtime unavailable';
    case 'unsupported': return 'unsupported in this evaluator';
    default: return 'not executed in the browser';
  }
}

// The challenge catalogue uses a small, predictable markdown subset. Keeping
// formatting local lets the details panel stay dependency-free and fast.
function formatMarkdown(content: string): string {
  return content
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^## (.*$)/gim, '<h3>$1</h3>')
    .replace(/^# (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/```([a-zA-Z]*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bullets become the • character on the same line; fenced code blocks are
    // matched first and passed through untouched so diffs keep their - markers.
    .replace(/(<pre><code>[\s\S]*?<\/pre><\/code>)|^- /gm, (match, preBlock) => (preBlock !== undefined ? preBlock : '• '));
}

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  ExternalLink,
  Lightbulb,
  ListChecks,
  Play,
} from 'lucide-react';
import type {
  TutorialCourse,
  TutorialDiagram,
  TutorialExercise,
  TutorialLesson,
  TutorialModule,
  TutorialTable,
} from '../../data/tutorials/types';
import { AssessmentQuiz } from './AssessmentQuiz';
import { TutorialCodeBlock } from './TutorialCodeBlock';
import { TutorialMarkdown } from './TutorialMarkdown';

export interface LessonViewProps {
  course: TutorialCourse;
  module: TutorialModule;
  lesson: TutorialLesson;
  prev: TutorialLesson | null;
  next: TutorialLesson | null;
  isComplete: boolean;
  onComplete: () => void;
  onBackToCourse: () => void;
  onOpenChallenge?: (challengeId: string) => void;
  onNavigateLesson?: (lessonId: string) => void;
}

const DIAGRAM_KIND_LABELS: Record<TutorialDiagram['kind'], string> = {
  ascii: 'ASCII diagram',
  waveform: 'Waveform',
  state: 'State diagram',
  block: 'Block diagram',
};

function SectionLabel({ icon: Icon, children }: { icon: typeof BookOpen; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-slate-800">
      <Icon className="h-4 w-4 text-enginx-primary" aria-hidden="true" />
      {children}
    </h2>
  );
}

const DiagramPanel: React.FC<{ diagram: TutorialDiagram }> = ({ diagram }) => (
  <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <figcaption className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2">
      <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-teal-800">
        {DIAGRAM_KIND_LABELS[diagram.kind]}
      </span>
      <span className="text-xs font-bold text-slate-800">{diagram.title}</span>
    </figcaption>
    <pre className="overflow-x-auto p-4 font-mono text-xs leading-6 text-slate-800">{diagram.content}</pre>
    {diagram.caption && (
      <p className="border-t border-slate-100 px-4 py-2 text-xs leading-5 text-slate-500">{diagram.caption}</p>
    )}
  </figure>
);

const TruthTable: React.FC<{ table: TutorialTable }> = ({ table }) => (
  <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="bg-slate-50">
            {table.headers.map((header, headerIndex) => (
              <th
                key={`th-${headerIndex}`}
                scope="col"
                className="whitespace-nowrap border-b border-slate-200 px-3 py-2 font-bold text-slate-800"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={`tr-${rowIndex}`} className={rowIndex % 2 === 1 ? 'bg-slate-50/60' : undefined}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`td-${rowIndex}-${cellIndex}`}
                  className={`whitespace-nowrap border-b border-slate-100 px-3 py-2 font-mono ${
                    cellIndex === 0 ? 'font-bold text-slate-700' : 'text-slate-600'
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {table.caption && <figcaption className="px-4 py-2 text-xs text-slate-500">{table.caption}</figcaption>}
  </figure>
);

interface ExerciseCardProps {
  exercise: TutorialExercise;
  index?: number;
  onOpenChallenge?: (challengeId: string) => void;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, index, onOpenChallenge }) => {
  if (!exercise || !exercise.title) return null;
  const challengeId = exercise.challengeId;
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-extrabold text-slate-900">
          {typeof index === 'number' ? `${index + 1}. `}
          {exercise.title}
        </h4>
        <Lightbulb className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-700">{exercise.brief}</p>
      {exercise.starterCode && (
        <div className="mt-3">
          <TutorialCodeBlock code={exercise.starterCode} language="text" title="Starter code" />
        </div>
      )}
      <p className="mt-3 text-xs leading-5 text-slate-600">
        <strong className="text-slate-800">Expected behavior:</strong> {exercise.expectedBehavior}
      </p>
      {exercise.hints.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {exercise.hints.map((hint, hintIndex) => (
            <li key={`hint-${hintIndex}`} className="flex items-start gap-2 text-xs leading-5 text-slate-600">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" />
              <span>{hint}</span>
            </li>
          ))}
        </ul>
      )}
      {challengeId && onOpenChallenge && (
        <button
          type="button"
          onClick={() => onOpenChallenge(challengeId)}
          className="focus-ring mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-teal-300 bg-teal-50 px-3 text-xs font-bold text-teal-900 hover:bg-teal-100"
        >
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
          Open linked challenge
        </button>
      )}
    </article>
  );
};

export const LessonView: React.FC<LessonViewProps> = ({
  course,
  module,
  lesson,
  prev,
  next,
  isComplete,
  onComplete,
  onBackToCourse,
  onOpenChallenge,
  onNavigateLesson,
}) => {
  const [quizPassed, setQuizPassed] = useState(false);

  // In-memory quiz state must not leak across lessons when the parent reuses
  // this component without a remount.
  useEffect(() => {
    setQuizPassed(false);
  }, [lesson.id]);

  const questionCount = lesson.assessment?.questions?.length ?? 0;
  const hasAssessment = questionCount > 0;
  // Requirement: no credit by click alone — lessons with assessment questions
  // stay locked until the in-memory quiz attempt passes.
  const assessmentLocked = hasAssessment && !quizPassed && !isComplete;

  const prevButton = prev ? (
    <button
      type="button"
      onClick={() => onNavigateLesson?.(prev.id)}
      disabled={!onNavigateLesson}
      className="focus-ring flex min-h-[44px] min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-slate-700 hover:border-teal-300 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={`Previous lesson: ${prev.title}`}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Previous</span>
        <span className="block max-w-[180px] truncate text-xs font-bold">{prev.title}</span>
      </span>
    </button>
  ) : (
    <span className="text-xs text-slate-400">Start of course</span>
  );

  const nextButton = next ? (
    <button
      type="button"
      onClick={() => onNavigateLesson?.(next.id)}
      disabled={!onNavigateLesson}
      className="focus-ring flex min-h-[44px] min-w-0 items-center justify-end gap-2 rounded-lg border border-slate-200 bg-white px-3 text-slate-700 hover:border-teal-300 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={`Next lesson: ${next.title}`}
    >
      <span className="min-w-0 text-right">
        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Next</span>
        <span className="block max-w-[180px] truncate text-xs font-bold">{next.title}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
    </button>
  ) : (
    <span className="text-xs text-slate-400">End of course</span>
  );

  const markCompleteButton = isComplete ? (
    <button
      type="button"
      disabled
      className="focus-ring inline-flex min-h-[44px] cursor-not-allowed items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-90"
    >
      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
      Lesson complete
    </button>
  ) : (
    <button
      type="button"
      onClick={onComplete}
      disabled={assessmentLocked}
      title={assessmentLocked ? 'Pass the assessment to mark this lesson complete' : undefined}
      className="focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-enginx-primary px-4 text-sm font-bold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
    >
      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
      Mark as completed
    </button>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pb-6 pt-5 sm:px-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
        <button
          type="button"
          onClick={onBackToCourse}
          className="focus-ring rounded font-bold text-teal-800 hover:text-teal-950"
        >
          {course.title}
        </button>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="font-semibold text-slate-600">{module.title}</span>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="truncate text-slate-500">{lesson.title}</span>
      </nav>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{module.title}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{lesson.title}</h1>
          {lesson.summary && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{lesson.summary}</p>}
        </div>
        {Number.isFinite(lesson.estimatedMinutes) && lesson.estimatedMinutes > 0 && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-900">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            ~{lesson.estimatedMinutes} min
          </span>
        )}
      </header>

      {isComplete && (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900" role="status">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          You have completed this lesson.
        </p>
      )}

      {lesson.whyItMatters && (
        <section className="mt-6 rounded-xl border border-teal-100 bg-white p-4 sm:p-5">
          <SectionLabel icon={BookOpen}>Why this matters</SectionLabel>
          <p className="mt-2 text-sm leading-7 text-slate-700">{lesson.whyItMatters}</p>
        </section>
      )}

      {lesson.prerequisites.length > 0 && (
        <section className="mt-4" aria-label="Prerequisites">
          <p className="eyebrow">Prerequisites</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {lesson.prerequisites.map((prerequisite) => (
              <span key={prerequisite} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                {prerequisite}
              </span>
            ))}
          </div>
        </section>
      )}

      {lesson.objectives.length > 0 && (
        <section className="mt-6" aria-label="Learning objectives">
          <SectionLabel icon={ListChecks}>Objectives</SectionLabel>
          <ul className="mt-3 space-y-2">
            {lesson.objectives.map((objective, objectiveIndex) => (
              <li key={`objective-${objectiveIndex}`} className="flex items-start gap-2 text-sm leading-6 text-slate-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
                <span>{objective}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {lesson.explanation && (
        <section className="mt-8" aria-label="Explanation">
          <SectionLabel icon={BookOpen}>Explanation</SectionLabel>
          <div className="mt-3">
            <TutorialMarkdown content={lesson.explanation} />
          </div>
        </section>
      )}

      {lesson.deepDive && (
        <section className="mt-8" aria-label="Deep dive">
          <SectionLabel icon={BookOpen}>Deep dive</SectionLabel>
          <div className="mt-3">
            <TutorialMarkdown content={lesson.deepDive} />
          </div>
        </section>
      )}

      {lesson.examples && lesson.examples.length > 0 && (
        <section className="mt-8" aria-label="Worked examples">
          <SectionLabel icon={BookOpen}>Worked examples</SectionLabel>
          <div className="mt-3 space-y-5">
            {lesson.examples.map((example, exampleIndex) => (
              <article key={`example-${exampleIndex}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                <h3 className="text-sm font-bold text-slate-900">
                  {exampleIndex + 1}. {example.title}
                </h3>
                <div className="mt-3">
                  <TutorialCodeBlock code={example.code} language={example.language} />
                </div>
                {example.explanation.length > 0 && (
                  <ol className="mt-3 ml-5 list-decimal space-y-1.5">
                    {example.explanation.map((line, lineIndex) => (
                      <li key={`example-${exampleIndex}-line-${lineIndex}`} className="text-xs leading-5 text-slate-600">
                        {line}
                      </li>
                    ))}
                  </ol>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {lesson.diagrams && lesson.diagrams.length > 0 && (
        <section className="mt-8" aria-label="Diagrams">
          <SectionLabel icon={BookOpen}>Diagrams</SectionLabel>
          <div className="mt-3 space-y-4">
            {lesson.diagrams.map((diagram, diagramIndex) => (
              <DiagramPanel key={`diagram-${diagramIndex}`} diagram={diagram} />
            ))}
          </div>
        </section>
      )}

      {lesson.tables && lesson.tables.length > 0 && (
        <section className="mt-8" aria-label="Reference tables">
          <SectionLabel icon={BookOpen}>Reference tables</SectionLabel>
          <div className="mt-3 space-y-4">
            {lesson.tables.map((table, tableIndex) => (
              <TruthTable key={`table-${tableIndex}`} table={table} />
            ))}
          </div>
        </section>
      )}

      {lesson.commonMistakes && lesson.commonMistakes.length > 0 && (
        <section className="mt-8" aria-label="Common mistakes">
          <SectionLabel icon={AlertTriangle}>Common mistakes</SectionLabel>
          <div className="mt-3 space-y-3">
            {lesson.commonMistakes.map((entry, mistakeIndex) => (
              <article key={`mistake-${mistakeIndex}`} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-950">
                  <strong className="font-extrabold">Mistake:</strong> {entry.mistake}
                </p>
                <p className="mt-2 text-sm leading-6 text-amber-900">
                  <strong className="font-extrabold">Fix:</strong> {entry.fix}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {lesson.guidedPractice && lesson.guidedPractice.title && (
        <section className="mt-8" aria-label="Guided practice">
          <SectionLabel icon={BookOpen}>Guided practice</SectionLabel>
          <div className="mt-3">
            <ExerciseCard exercise={lesson.guidedPractice} onOpenChallenge={onOpenChallenge} />
          </div>
        </section>
      )}

      {lesson.practiceExercises && lesson.practiceExercises.length > 0 && (
        <section className="mt-8" aria-label="Practice exercises">
          <SectionLabel icon={BookOpen}>Practice exercises</SectionLabel>
          <div className="mt-3 space-y-3">
            {lesson.practiceExercises.map((exercise, exerciseIndex) => (
              <ExerciseCard
                key={`practice-${exerciseIndex}`}
                exercise={exercise}
                index={exerciseIndex}
                onOpenChallenge={onOpenChallenge}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8" aria-label="Assessment">
        <SectionLabel icon={ListChecks}>Assessment</SectionLabel>
        {hasAssessment ? (
          <div className="mt-3">
            <AssessmentQuiz assessment={lesson.assessment} onPassed={() => setQuizPassed(true)} />
          </div>
        ) : (
          <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            This lesson has no assessment questions yet, so it can be marked complete directly.
          </p>
        )}
      </section>

      {lesson.keyTerms && lesson.keyTerms.length > 0 && (
        <section className="mt-8" aria-label="Key terms">
          <SectionLabel icon={BookOpen}>Key terms</SectionLabel>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {lesson.keyTerms.map((entry) => (
              <div key={entry.term} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <dt className="text-xs font-bold text-slate-900">{entry.term}</dt>
                <dd className="mt-1 text-xs leading-5 text-slate-600">{entry.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {lesson.revisionSummary && lesson.revisionSummary.length > 0 && (
        <section className="mt-8 rounded-xl border border-teal-100 bg-teal-50 p-4 sm:p-5" aria-label="Revision summary">
          <SectionLabel icon={BookOpen}>Revision summary</SectionLabel>
          <ul className="mt-3 space-y-1.5">
            {lesson.revisionSummary.map((point, pointIndex) => (
              <li key={`revision-${pointIndex}`} className="flex items-start gap-2 text-sm leading-6 text-teal-950">
                <Circle className="mt-1.5 h-2 w-2 shrink-0 fill-teal-600 text-teal-600" aria-hidden="true" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {lesson.furtherReading && lesson.furtherReading.length > 0 && (
        <section className="mt-8" aria-label="Further reading">
          <SectionLabel icon={ExternalLink}>Further reading</SectionLabel>
          <ul className="mt-3 space-y-2">
            {lesson.furtherReading.map((resource) => (
              <li key={resource.url}>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring inline-flex min-h-[40px] items-center gap-2 rounded-lg text-sm font-semibold text-teal-800 hover:text-teal-950 hover:underline"
                >
                  {resource.label}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav
        aria-label="Lesson navigation"
        className="sticky bottom-0 z-10 -mx-4 mt-10 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6"
      >
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          {prevButton}
          {markCompleteButton}
          {nextButton}
        </div>
      </nav>
    </div>
  );
};

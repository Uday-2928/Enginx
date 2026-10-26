import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Lightbulb, RotateCcw, XCircle } from 'lucide-react';
import type { TutorialAssessment, TutorialQuestion } from '../../data/tutorials/types';
import { TutorialCodeBlock } from './TutorialCodeBlock';

interface AssessmentQuizProps {
  assessment: TutorialAssessment;
  /** Called exactly once per completed attempt whose score meets passScore. */
  onPassed: () => void;
}

interface QuestionResult {
  missed: boolean;
  solved: boolean;
  firstTry: boolean;
}

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Short-answer/code-completion use a case-insensitive trimmed compare; for
 * code-completion the accepted answer may also be CONTAINED in the student's
 * code after whitespace normalization. */
function isAnswerCorrect(question: TutorialQuestion, value: string): boolean {
  if (question.kind === 'code-completion') {
    const candidate = normalizeAnswer(value);
    const accepted = normalizeAnswer(question.answer);
    return candidate.length > 0 && (candidate === accepted || candidate.includes(accepted));
  }
  return normalizeAnswer(value) === normalizeAnswer(question.answer);
}

/**
 * In-memory assessment player: one question at a time, immediate feedback,
 * hint on first miss, running first-try score and a retake that resets all
 * state. Attempt tracking is intentionally not persisted.
 */
export const AssessmentQuiz: React.FC<AssessmentQuizProps> = ({ assessment, onPassed }) => {
  const questions = assessment.questions;
  const total = questions.length;
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<QuestionResult[]>(() =>
    questions.map(() => ({ missed: false, solved: false, firstTry: false })),
  );
  const [inputValue, setInputValue] = useState('');
  const [wrongValue, setWrongValue] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  if (total === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        No assessment questions are configured for this lesson yet.
      </p>
    );
  }

  const current = questions[index] as TutorialQuestion;
  const currentResult = results[index];
  const firstTryCount = results.filter((result) => result.firstTry).length;
  const solved = Boolean(currentResult?.solved);

  const optionList: string[] | null =
    current.options && current.options.length > 0
      ? current.options
      : current.kind === 'true-false'
        ? ['True', 'False']
        : null;

  const submitAnswer = (value: string): void => {
    if (solved || !value.trim()) return;
    if (isAnswerCorrect(current, value)) {
      setResults((currentResults) =>
        currentResults.map((result, resultIndex) =>
          resultIndex === index ? { ...result, solved: true, firstTry: !result.missed } : result,
        ),
      );
      setWrongValue(null);
      setInputValue('');
    } else {
      setResults((currentResults) =>
        currentResults.map((result, resultIndex) =>
          resultIndex === index ? { ...result, missed: true } : result,
        ),
      );
      setWrongValue(value);
    }
  };

  const advance = (): void => {
    if (index < total - 1) {
      setIndex(index + 1);
      setWrongValue(null);
      setInputValue('');
      return;
    }
    const firstTry = results.filter((result) => result.firstTry).length;
    const score = Math.round((firstTry / total) * 100);
    setFinalScore(score);
    setFinished(true);
    if (score >= assessment.passScore) onPassed();
  };

  const retake = (): void => {
    setResults(questions.map(() => ({ missed: false, solved: false, firstTry: false })));
    setIndex(0);
    setInputValue('');
    setWrongValue(null);
    setFinished(false);
    setFinalScore(0);
  };

  if (finished) {
    const passed = finalScore >= assessment.passScore;
    return (
      <div
        className={`rounded-xl border p-5 ${passed ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}
        role="status"
      >
        <div className="flex items-center gap-2">
          {passed
            ? <CheckCircle2 className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            : <RotateCcw className="h-5 w-5 text-amber-700" aria-hidden="true" />}
          <p className={`text-sm font-semibold ${passed ? 'text-emerald-900' : 'text-amber-900'}`}>
            {passed ? 'Assessment passed' : 'Not passed yet'}
          </p>
        </div>
        <p className={`mt-3 text-3xl font-semibold tabular-nums ${passed ? 'text-emerald-900' : 'text-amber-900'}`}>
          {finalScore}%
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          {firstTryCount}/{total} answered correctly on the first try · pass mark {assessment.passScore}%.
        </p>
        {passed && (
          <p className="mt-2 text-xs font-semibold text-emerald-800">
            You can now mark this lesson complete below.
          </p>
        )}
        {!passed && (
          <p className="mt-2 text-xs leading-5 text-amber-800">
            Review the explanations above, then retake the assessment to mark this lesson complete.
          </p>
        )}
        <button
          type="button"
          onClick={retake}
          className="focus-ring mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-teal-300 hover:bg-teal-50"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Retake assessment
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Question {index + 1} of {total} · {assessment.title}
        </p>
        <p className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold tabular-nums text-slate-600">
          Score: {firstTryCount}/{total}
        </p>
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-900">{current.prompt}</p>

      {current.code && (
        <div className="mt-3">
          <TutorialCodeBlock code={current.code} language="text" />
        </div>
      )}

      {optionList ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2" role="group" aria-label="Answer options">
          {optionList.map((option) => (
            <button
              key={option}
              type="button"
              disabled={solved}
              onClick={() => submitAnswer(option)}
              className={`focus-ring min-h-[44px] rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                solved
                  ? 'border-slate-200 bg-slate-50 text-slate-400'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            submitAnswer(inputValue);
          }}
        >
          <label className="flex-1">
            <span className="sr-only">Your answer</span>
            <input
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              disabled={solved}
              className="focus-ring min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm text-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
              placeholder="Type your answer…"
            />
          </label>
          <button
            type="submit"
            disabled={solved}
            className="focus-ring btn-primary"
          >
            Check answer
          </button>
        </form>
      )}

      {wrongValue !== null && !solved && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3" role="alert">
          <p className="flex items-center gap-2 text-sm font-bold text-rose-800">
            <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Not quite — try again.
          </p>
          {current.hint && (
            <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-rose-700">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Hint: {current.hint}
            </p>
          )}
        </div>
      )}

      {solved && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3" role="status">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-900">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            Correct.
          </p>
          <p className="mt-1 text-xs leading-5 text-emerald-900">{current.explanation}</p>
          <button
            type="button"
            onClick={advance}
            className="focus-ring btn-primary mt-3"
          >
            {index < total - 1 ? 'Next question' : 'Finish attempt'}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Code2,
  Cpu,
  History as HistoryIcon,
  Lightbulb,
  Play,
  RotateCcw,
  Send,
  Terminal,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { Challenge, SubmissionResult } from '../../types';
import { editorLanguageLabel } from './monacoLanguage';
import { ProfessionalCodeEditor } from './ProfessionalCodeEditor';

/**
 * The API may add availability metadata without changing the editor's
 * existing evaluated-result shape. Keeping this presentation type local lets
 * the editor render an outage safely while existing callers continue to pass
 * `SubmissionResult` values unchanged.
 */
export interface SubmissionPresentationResult extends Omit<SubmissionResult, 'verdict' | 'status' | 'retryable'> {
  verdict: string;
  status?: string;
  retryable?: boolean;
}

export interface CodeEditorProps {
  challenge: Challenge;
  code: string;
  setCode: (c: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  isEvaluating: boolean;
  submissionResult: SubmissionPresentationResult | null;
  submissionHistory?: SubmissionResult[];
  submissionHistoryLoading?: boolean;
  submissionHistoryError?: string | null;
  onResetCode: () => void;
  submissionError?: string | null;
  /** Called when an unavailable, retryable submission asks to run again. */
  onRetry?: () => void;
  /** Alias for integrations that use a more explicit callback name. */
  onRetrySubmission?: () => void;
}

type EditorTab = 'editor' | 'testcases' | 'history' | 'output';

export const CodeEditor: React.FC<CodeEditorProps> = ({
  challenge,
  code,
  setCode,
  onRun,
  onSubmit,
  isEvaluating,
  submissionResult,
  submissionHistory = [],
  submissionHistoryLoading = false,
  submissionHistoryError = null,
  onResetCode,
  submissionError = null,
  onRetry,
  onRetrySubmission,
}) => {
  const [activeTab, setActiveTab] = useState<EditorTab>('editor');
  const [showHint, setShowHint] = useState(false);

  const normalizedVerdict = submissionResult?.verdict?.toUpperCase() ?? '';
  const normalizedStatus = submissionResult?.status?.toLowerCase() ?? '';
  const isUnavailable = normalizedVerdict === 'UNAVAILABLE'
    || normalizedVerdict === 'RETRY'
    || normalizedStatus === 'unavailable';
  const isAccepted = Boolean(submissionResult && !isUnavailable && normalizedVerdict === 'AC');
  const retryHandler = onRetry ?? onRetrySubmission;

  const tabs: { id: EditorTab; label: string }[] = [
    { id: 'editor', label: 'Code' },
    { id: 'testcases', label: `Test cases (${challenge.test_cases.length})` },
    { id: 'history', label: `History (${submissionHistory.length})` },
  ];

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white" aria-busy={isEvaluating}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="icon-chip">
              <Code2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="truncate text-xs font-semibold text-slate-700">{editorLanguageLabel(challenge.language)}</span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto" role="tablist" aria-label="Editor views">
            {tabs.map(({ id, label }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(id)}
                  className={`focus-ring min-h-[44px] shrink-0 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'border-teal-200 bg-teal-50 text-enginx-primary'
                      : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-800'
                  }`}
                >
                  {label}
                </button>
              );
            })}
            {submissionResult && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'output'}
                aria-label={`Submission result: ${isUnavailable ? 'evaluation unavailable' : isAccepted ? 'accepted' : normalizedVerdict}`}
                onClick={() => setActiveTab('output')}
                className={`focus-ring flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                  activeTab === 'output'
                    ? isUnavailable
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : isAccepted
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-800'
                  }`}
              >
                <span>Result</span>
                <span className={`h-2 w-2 rounded-full ${isUnavailable ? 'bg-amber-500' : isAccepted ? 'bg-emerald-600' : 'bg-rose-600'}`} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {challenge.solution_hints.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHint((visible) => !visible)}
              aria-pressed={showHint}
              className="focus-ring flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50"
              title="Show hint"
            >
              <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Hint</span>
            </button>
          )}
          <button
            type="button"
            onClick={onResetCode}
            className="focus-ring flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
            title="Reset to starter template"
            aria-label="Reset to starter template"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {showHint && challenge.solution_hints.length > 0 && (
        <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900" role="status">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-enginx-cta" aria-hidden="true" />
          <p>
            <span className="font-bold">Engineering hint: </span>
            {challenge.solution_hints[0]}
          </p>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeTab === 'editor' && (
          <div className="flex min-h-0 flex-1 overflow-hidden bg-slate-900">
            <ProfessionalCodeEditor
              value={code}
              onChange={setCode}
              language={challenge.language}
              path={challenge.id}
              ariaLabel={`Code editor for ${challenge.title}`}
              compilerOutput={submissionResult?.output}
              compilerVerdict={submissionResult?.verdict}
            />
          </div>
        )}

        {activeTab === 'testcases' && (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            <div>
              <p className="eyebrow">Verification suite</p>
              <h3 className="mt-1 text-sm font-semibold text-slate-900">Public and hidden test cases</h3>
            </div>
            {challenge.test_cases.map((testCase, index) => (
              <article key={testCase.id || index} className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800">Test case #{index + 1}</span>
                  {testCase.hidden ? (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">Hidden evaluation</span>
                  ) : (
                    <span className="rounded-full bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-800">Public</span>
                  )}
                </div>
                {!testCase.hidden ? (
                  <div className="mt-3 grid gap-3 text-slate-600 sm:grid-cols-2">
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-500">Input</span>
                      <pre className="mt-1 overflow-x-auto font-mono text-xs text-slate-800">{JSON.stringify(testCase.input)}</pre>
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-500">Expected</span>
                      <pre className="mt-1 overflow-x-auto font-mono text-xs text-teal-800">{JSON.stringify(testCase.expected)}</pre>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-slate-500">Evaluated during final submission verification.</p>
                )}
              </article>
            ))}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Saved attempts</p>
                <h3 className="mt-1 text-sm font-semibold text-slate-900">Recent submissions for this challenge</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">Attempts are loaded from your authenticated learner history. Source code is not shown here.</p>
              </div>
              <HistoryIcon className="mt-1 h-5 w-5 shrink-0 text-teal-700" aria-hidden="true" />
            </div>

            {submissionHistoryLoading && (
              <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs font-semibold text-slate-600" role="status">
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-teal-200 border-t-teal-700" aria-hidden="true" />
                Loading attempt history…
              </div>
            )}

            {!submissionHistoryLoading && submissionHistoryError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900" role="alert">
                <p className="font-bold">Attempt history could not be loaded</p>
                <p className="mt-1 leading-5">{submissionHistoryError}</p>
              </div>
            )}

            {!submissionHistoryLoading && !submissionHistoryError && submissionHistory.length === 0 && (
              <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                <HistoryIcon className="h-7 w-7 text-slate-300" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-slate-800">No attempts yet</p>
                <p className="mt-1 text-xs text-slate-500">Run or submit your solution to create the first saved attempt.</p>
              </div>
            )}

            {!submissionHistoryLoading && !submissionHistoryError && submissionHistory.map((attempt, index) => {
              const attemptVerdict = attempt.verdict.toUpperCase();
              const unavailable = attempt.status === 'unavailable' || attemptVerdict === 'UNAVAILABLE' || attemptVerdict === 'RETRY';
              const accepted = !unavailable && attemptVerdict === 'AC';
              const passedCount = attempt.test_results.filter((test) => test.passed).length;
              const attemptLabel = unavailable ? 'Evaluation unavailable' : accepted ? 'Accepted' : `Verdict: ${attemptVerdict}`;

              return (
                <article
                  key={`${attempt.id || 'attempt'}-${index}`}
                  className={`rounded-xl border bg-white p-4 ${unavailable ? 'border-amber-200' : accepted ? 'border-emerald-200' : 'border-rose-200'}`}
                  aria-label={`Attempt ${submissionHistory.length - index}: ${attemptLabel}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">Attempt {submissionHistory.length - index}</span>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${unavailable ? 'bg-amber-50 text-amber-800' : accepted ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {attemptLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">{formatSubmissionTimestamp(attempt.created_at)}</p>
                    </div>
                    <span className="text-[11px] tabular-nums text-slate-500">
                      {unavailable ? 'Not graded' : `${passedCount}/${attempt.test_results.length} tests passed`}
                    </span>
                  </div>
                  {attempt.output && (
                    <p className={`mt-3 rounded-lg p-2 text-xs leading-5 ${unavailable ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-600'}`}>
                      {attempt.output}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {activeTab === 'output' && (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
            {!submissionResult && isEvaluating && (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
                <span className="h-7 w-7 animate-spin rounded-full border-2 border-teal-200 border-t-teal-600" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-slate-800">Evaluating your solution…</p>
                <p className="mt-1 text-xs text-slate-500">Running the verification suite.</p>
              </div>
            )}

            {!submissionResult && !isEvaluating && submissionError && (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-6 text-center" role="alert" aria-live="assertive">
                <XCircle className="h-8 w-8 text-rose-600" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-rose-900">Submission could not be sent</p>
                <p className="mt-1 max-w-md text-xs leading-5 text-rose-800">{submissionError}</p>
                {retryHandler && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('output');
                      retryHandler();
                    }}
                    disabled={isEvaluating}
                    className="focus-ring mt-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Retry submission</span>
                  </button>
                )}
              </div>
            )}

            {submissionResult && (
              <>
                <div
                  className={`flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                    isUnavailable
                      ? 'border-amber-200 bg-amber-50 text-amber-950'
                      : isAccepted
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-rose-200 bg-rose-50 text-rose-900'
                  }`}
                  role={isUnavailable ? 'alert' : undefined}
                  aria-live={isUnavailable ? 'assertive' : undefined}
                >
                  <div className="flex items-center gap-3">
                    {isUnavailable ? (
                      <WifiOff className="h-8 w-8 shrink-0 text-amber-700" aria-hidden="true" />
                    ) : isAccepted ? (
                      <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-8 w-8 shrink-0 text-rose-600" aria-hidden="true" />
                    )}
                    <div>
                      <h3 className="text-lg font-semibold">
                        {isUnavailable ? 'Evaluation unavailable' : isAccepted ? 'Accepted' : `Verdict: ${submissionResult.verdict}`}
                      </h3>
                      <p className="mt-0.5 text-xs opacity-80">
                        {isUnavailable
                          ? submissionResult.output || 'The evaluation service is unavailable. Your code was not graded.'
                          : isAccepted
                          ? `Challenge completed. +${submissionResult.xp_awarded} XP awarded.`
                          : 'Logic test failed. Review the test case outputs below.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                    {isUnavailable ? (
                      <span className="text-xs font-semibold text-amber-800">No execution recorded</span>
                    ) : (
                      <div className="flex gap-4 text-xs tabular-nums text-slate-600 sm:flex-col sm:items-end sm:gap-1">
                        <span className="flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                          {submissionResult.execution_time_ms} ms
                        </span>
                        <span className="flex items-center gap-1">
                          <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
                          {submissionResult.memory_used_kb} KB
                        </span>
                      </div>
                    )}
                    {submissionResult.retryable && retryHandler && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('output');
                          retryHandler();
                        }}
                        disabled={isEvaluating}
                        className="focus-ring inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Retry evaluation</span>
                      </button>
                    )}
                  </div>
                </div>

                {isUnavailable ? (
                  <div className="rounded-xl border border-dashed border-amber-300 bg-white p-4 text-sm text-slate-600" role="status">
                    Evaluation did not run, so no test results, XP, or badges were recorded. Retry when the evaluation service is available.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="eyebrow">Execution breakdown</p>
                      <span className="text-xs font-semibold text-slate-500">
                        {submissionResult.test_results.filter((test) => test.passed).length}/{submissionResult.test_results.length} passed
                      </span>
                    </div>
                    {submissionResult.test_results.map((testResult, index) => (
                      <article
                        key={`${testResult.test_case_id}-${index}`}
                        className={`rounded-xl border bg-white p-3 text-xs ${
                          testResult.passed ? 'border-emerald-200' : 'border-rose-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-800">Test case #{testResult.test_case_id}</span>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                            testResult.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {testResult.passed ? 'Passed' : 'Failed'}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-3 font-mono sm:grid-cols-2">
                          <div className="min-w-0">
                            <span className="font-sans text-slate-500">Expected</span>
                            <pre className="mt-1 overflow-x-auto text-teal-800">{JSON.stringify(testResult.expected)}</pre>
                          </div>
                          <div className="min-w-0">
                            <span className="font-sans text-slate-500">Actual</span>
                            <pre className={`mt-1 overflow-x-auto ${testResult.passed ? 'text-teal-800' : 'text-rose-700'}`}>
                              {JSON.stringify(testResult.actual)}
                            </pre>
                          </div>
                        </div>
                        {testResult.message && (
                          <p className="mt-3 rounded-lg bg-rose-50 p-2 text-rose-700">{testResult.message}</p>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{editorLanguageLabel(challenge.language)} · ready for evaluation</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('output');
              onRun();
            }}
            disabled={isEvaluating}
            className="focus-ring btn-secondary"
          >
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            <span>Run code</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('output');
              onSubmit();
            }}
            disabled={isEvaluating}
            className="btn-charge focus-ring flex min-h-[44px] items-center gap-2 rounded-lg border border-enginx-cta bg-enginx-cta px-4 text-xs font-semibold text-white hover:border-amber-700 hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
          >
            {isEvaluating ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                <span>Evaluating…</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Submit solution</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};

function formatSubmissionTimestamp(value: string): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return 'Time unavailable';
  return new Date(timestamp).toLocaleString();
}

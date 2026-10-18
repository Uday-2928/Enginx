import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Code2,
  Cpu,
  Lightbulb,
  Play,
  RotateCcw,
  Send,
  Terminal,
  XCircle,
} from 'lucide-react';
import { Challenge, SubmissionResult } from '../../types';

interface CodeEditorProps {
  challenge: Challenge;
  code: string;
  setCode: (c: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  isEvaluating: boolean;
  submissionResult: SubmissionResult | null;
  onResetCode: () => void;
}

type EditorTab = 'editor' | 'testcases' | 'output';

export const CodeEditor: React.FC<CodeEditorProps> = ({
  challenge,
  code,
  setCode,
  onRun,
  onSubmit,
  isEvaluating,
  submissionResult,
  onResetCode,
}) => {
  const [activeTab, setActiveTab] = useState<EditorTab>('editor');
  const [showHint, setShowHint] = useState(false);

  const getLanguageLabel = (language: string) => {
    switch (language.toLowerCase()) {
      case 'verilog': return 'Verilog HDL · IEEE 1364';
      case 'c': return 'Embedded C · C99 / GCC';
      case 'python': return 'Python 3.11';
      default: return language.toUpperCase();
    }
  };

  const tabs: { id: EditorTab; label: string }[] = [
    { id: 'editor', label: 'Code' },
    { id: 'testcases', label: `Test cases (${challenge.test_cases.length})` },
  ];

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-teal-100 bg-white" aria-busy={isEvaluating}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-enginx-primary">
              <Code2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="truncate text-xs font-semibold text-slate-700">{getLanguageLabel(challenge.language)}</span>
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
                onClick={() => setActiveTab('output')}
                className={`focus-ring flex min-h-[40px] shrink-0 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                  activeTab === 'output'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-800'
                }`}
              >
                <span>Result</span>
                <span className={`h-2 w-2 rounded-full ${submissionResult.verdict === 'AC' ? 'bg-emerald-600' : 'bg-rose-600'}`} aria-hidden="true" />
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
              className="focus-ring flex min-h-[44px] items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
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
          <div className="flex min-h-0 flex-1 overflow-hidden bg-slate-50">
            <div className="w-11 shrink-0 select-none overflow-hidden border-r border-slate-200 bg-slate-100 py-4 pr-2 text-right font-mono text-xs leading-6 text-slate-400" aria-hidden="true">
              {code.split('\n').map((_, index) => (
                <div key={index}>{index + 1}</div>
              ))}
            </div>
            <label className="flex min-h-0 flex-1">
              <span className="sr-only">Code editor for {challenge.title}</span>
              <textarea
                value={code}
                onChange={(event) => setCode(event.target.value)}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                aria-label={`Code editor for ${challenge.title}`}
                className="min-h-0 w-full resize-none border-0 bg-slate-50 p-4 font-mono text-sm leading-6 text-slate-900 caret-teal-700 selection:bg-teal-200 focus:outline-none"
              />
            </label>
          </div>
        )}

        {activeTab === 'testcases' && (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            <div>
              <p className="eyebrow">Verification suite</p>
              <h3 className="mt-1 text-sm font-bold text-slate-900">Public and hidden test cases</h3>
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

        {activeTab === 'output' && (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
            {!submissionResult && isEvaluating && (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-teal-200 bg-white text-center">
                <span className="h-7 w-7 animate-spin rounded-full border-2 border-teal-200 border-t-teal-600" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-slate-800">Evaluating your solution…</p>
                <p className="mt-1 text-xs text-slate-500">Running the verification suite.</p>
              </div>
            )}

            {submissionResult && (
              <>
                <div className={`flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                  submissionResult.verdict === 'AC'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-rose-200 bg-rose-50 text-rose-900'
                }`}>
                  <div className="flex items-center gap-3">
                    {submissionResult.verdict === 'AC' ? (
                      <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-8 w-8 shrink-0 text-rose-600" aria-hidden="true" />
                    )}
                    <div>
                      <h3 className="text-lg font-bold">
                        {submissionResult.verdict === 'AC' ? 'Accepted' : `Verdict: ${submissionResult.verdict}`}
                      </h3>
                      <p className="mt-0.5 text-xs opacity-80">
                        {submissionResult.verdict === 'AC'
                          ? `Challenge completed! +${submissionResult.xp_awarded} XP earned.`
                          : 'Logic test failed. Review the test case outputs below.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 text-xs font-mono text-slate-600 sm:flex-col sm:items-end sm:gap-1">
                    <span className="flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                      {submissionResult.execution_time_ms} ms
                    </span>
                    <span className="flex items-center gap-1">
                      <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
                      {submissionResult.memory_used_kb} KB
                    </span>
                  </div>
                </div>

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
                        <span className="font-bold text-slate-800">Test case #{testResult.test_case_id}</span>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${
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
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
          <span>UTF-8 · local simulator ready</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('output');
              onRun();
            }}
            disabled={isEvaluating}
            className="focus-ring flex min-h-[44px] items-center gap-2 rounded-lg border border-teal-200 bg-white px-4 text-xs font-bold text-teal-800 transition-colors hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="btn-charge focus-ring flex min-h-[44px] items-center gap-2 rounded-lg border border-enginx-cta bg-enginx-cta px-4 text-xs font-bold text-white hover:border-amber-700 hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
          >
            {isEvaluating ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                <span>Simulating…</span>
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

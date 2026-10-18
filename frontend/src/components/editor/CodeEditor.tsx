import React, { useState } from 'react';
import {
  Play, Send, Lightbulb, RotateCcw, CheckCircle2,
  XCircle, Clock, Cpu, AlertTriangle, Terminal, Code2
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

export const CodeEditor: React.FC<CodeEditorProps> = ({
  challenge,
  code,
  setCode,
  onRun,
  onSubmit,
  isEvaluating,
  submissionResult,
  onResetCode
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'testcases' | 'output'>('editor');
  const [showHint, setShowHint] = useState(false);

  const getLanguageLabel = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'verilog': return 'Verilog HDL (IEEE 1364)';
      case 'c': return 'Embedded C (C99 / GCC)';
      case 'python': return 'Python 3.11';
      default: return lang.toUpperCase();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#111827] border border-[#223147] rounded-xl overflow-hidden shadow-2xl">
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161F2E] border-b border-[#223147]">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Code2 className="w-4 h-4 text-[#0066FF]" />
            <span className="text-xs font-mono font-medium text-slate-300">
              {getLanguageLabel(challenge.language)}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          {/* Quick Tabs for Mobile / Split View */}
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                activeTab === 'editor'
                  ? 'bg-[#0066FF]/20 text-[#0066FF] border border-[#0066FF]/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Code
            </button>
            <button
              onClick={() => setActiveTab('testcases')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                activeTab === 'testcases'
                  ? 'bg-[#0066FF]/20 text-[#0066FF] border border-[#0066FF]/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Test Cases ({challenge.test_cases.length})
            </button>
            {submissionResult && (
              <button
                onClick={() => setActiveTab('output')}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors flex items-center space-x-1 ${
                  activeTab === 'output'
                    ? 'bg-[#2ECC71]/20 text-[#2ECC71] border border-[#2ECC71]/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Result</span>
                <span className={`w-2 h-2 rounded-full ${submissionResult.verdict === 'AC' ? 'bg-[#2ECC71]' : 'bg-rose-500'}`} />
              </button>
            )}
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex items-center space-x-2">
          {challenge.solution_hints.length > 0 && (
            <button
              onClick={() => setShowHint(!showHint)}
              className="flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium text-amber-400 hover:bg-amber-400/10 border border-amber-400/20 transition-colors"
              title="Show Hint"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hint</span>
            </button>
          )}

          <button
            onClick={onResetCode}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reset to starter template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Optional Hint Banner */}
      {showHint && challenge.solution_hints.length > 0 && (
        <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/30 flex items-start space-x-2 text-xs text-amber-200">
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-300">Engineering Hint: </span>
            {challenge.solution_hints[0]}
          </div>
        </div>
      )}

      {/* Editor Body */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        {activeTab === 'editor' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Line Numbers Simulation */}
            <div className="w-10 py-3 bg-[#0B0F17]/60 border-r border-[#223147] select-none text-right pr-2 text-xs font-mono text-slate-600">
              {code.split('\n').map((_, i) => (
                <div key={i} className="leading-6">{i + 1}</div>
              ))}
            </div>

            {/* Editable Code Textarea */}
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              className="flex-1 p-3 bg-[#0B0F17] text-slate-100 font-mono text-sm leading-6 resize-none focus:outline-none focus:ring-0 selection:bg-[#0066FF]/40 border-none overflow-y-auto"
            />
          </div>
        )}

        {activeTab === 'testcases' && (
          <div className="flex-1 p-4 overflow-y-auto bg-[#0B0F17] space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Verification Test Suite
            </h4>
            {challenge.test_cases.map((tc, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-[#161F2E] border border-[#223147] text-xs font-mono">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-slate-300 font-semibold">Test Case #{idx + 1}</span>
                  {tc.hidden ? (
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">Hidden Evaluation</span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-[#0066FF]/10 text-[#0066FF] text-[10px]">Public</span>
                  )}
                </div>
                {!tc.hidden ? (
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>
                      <span className="text-slate-500">Input: </span>
                      <pre className="text-amber-300 mt-0.5 overflow-x-auto">{JSON.stringify(tc.input)}</pre>
                    </div>
                    <div>
                      <span className="text-slate-500">Expected: </span>
                      <pre className="text-[#2ECC71] mt-0.5 overflow-x-auto">{JSON.stringify(tc.expected)}</pre>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 italic">Evaluated during final submission verification.</p>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'output' && submissionResult && (
          <div className="flex-1 p-4 overflow-y-auto bg-[#0B0F17] space-y-4">
            {/* Verdict Card */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              submissionResult.verdict === 'AC'
                ? 'bg-[#2ECC71]/10 border-[#2ECC71]/40 text-[#2ECC71]'
                : 'bg-rose-500/10 border-rose-500/40 text-rose-400'
            }`}>
              <div className="flex items-center space-x-3">
                {submissionResult.verdict === 'AC' ? (
                  <CheckCircle2 className="w-8 h-8 text-[#2ECC71] fill-[#2ECC71]/20" />
                ) : (
                  <XCircle className="w-8 h-8 text-rose-500 fill-rose-500/20" />
                )}
                <div>
                  <h3 className="font-bold text-lg font-mono">
                    {submissionResult.verdict === 'AC' ? 'ACCEPTED (AC)' : `VERDICT: ${submissionResult.verdict}`}
                  </h3>
                  <p className="text-xs opacity-90">
                    {submissionResult.verdict === 'AC'
                      ? `Challenge completed! +${submissionResult.xp_awarded} XP earned.`
                      : 'Logic test failed. Check test case outputs below.'}
                  </p>
                </div>
              </div>

              <div className="text-right text-xs font-mono text-slate-400 space-y-0.5">
                <div className="flex items-center space-x-1 justify-end">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{submissionResult.execution_time_ms} ms</span>
                </div>
                <div className="flex items-center space-x-1 justify-end">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>{submissionResult.memory_used_kb} KB</span>
                </div>
              </div>
            </div>

            {/* Test Results Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Execution Breakdown ({submissionResult.test_results.filter(t => t.passed).length}/{submissionResult.test_results.length} Passed)
              </h4>
              {submissionResult.test_results.map((tr, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border text-xs font-mono ${
                    tr.passed
                      ? 'bg-[#161F2E] border-[#2ECC71]/30 text-slate-300'
                      : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold">Test Case #{tr.test_case_id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      tr.passed ? 'bg-[#2ECC71]/20 text-[#2ECC71]' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {tr.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <span className="text-slate-500">Expected:</span>
                      <pre className="text-[#2ECC71] mt-0.5 overflow-x-auto">{JSON.stringify(tr.expected)}</pre>
                    </div>
                    <div>
                      <span className="text-slate-500">Actual:</span>
                      <pre className={tr.passed ? "text-[#2ECC71] mt-0.5 overflow-x-auto" : "text-rose-400 mt-0.5 overflow-x-auto"}>
                        {JSON.stringify(tr.actual)}
                      </pre>
                    </div>
                  </div>
                  {tr.message && (
                    <p className="mt-2 text-xs text-rose-400 bg-rose-950/40 p-1.5 rounded">{tr.message}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Editor Footer / Action Buttons */}
      <div className="px-4 py-3 bg-[#161F2E] border-t border-[#223147] flex items-center justify-between">
        <div className="text-xs text-slate-400 flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-slate-500" />
          <span>Fira Code • UTF-8</span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Run Button */}
          <button
            onClick={() => {
              setActiveTab('output');
              onRun();
            }}
            disabled={isEvaluating}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 hover:border-slate-600 transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 text-slate-300 fill-slate-300" />
            <span>Run Code</span>
          </button>

          {/* Submit Button (Capacitor charge styling) */}
          <button
            onClick={() => {
              setActiveTab('output');
              onSubmit();
            }}
            disabled={isEvaluating}
            className="btn-charge flex items-center space-x-2 px-5 py-2 rounded-lg bg-[#0066FF] hover:bg-blue-600 text-white text-xs font-bold shadow-[0_0_15px_rgba(0,102,255,0.4)] transition-all disabled:opacity-50"
          >
            {isEvaluating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Simulating...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Submit Solution</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

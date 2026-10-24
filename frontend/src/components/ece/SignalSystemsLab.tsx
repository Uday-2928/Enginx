import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, CheckCircle2, Code2, Copy, FlaskConical, Play, RotateCcw, Save, Waves } from 'lucide-react';
import type { Challenge } from '../../types';
import type { MatlabScriptExecutionResult } from '../../types';
import { executeMatlabScript, ApiError } from '../../services/api';
import {
  DEFAULT_SIGNAL_LAB_STATE,
  loadSignalLabState,
  MATLAB_SIGNAL_STARTER_CODE,
  normalizeSignalLabState,
  runSignalExperiment,
  saveSignalLabState,
  type SignalExperiment,
  type SignalLabModule,
  type SignalLabState,
} from '../../data/signalLab';

export interface SignalSystemsLabProps {
  initialModule?: SignalLabModule;
  challenges: Challenge[];
  onOpenChallenge: (challenge: Challenge) => void;
}

const EXPERIMENTS: Array<{ id: SignalExperiment; label: string; module: SignalLabModule; description: string }> = [
  { id: 'sine', label: 'Sampled sinusoid', module: 'signals', description: 'Time-domain sampling and Nyquist reasoning.' },
  { id: 'square', label: 'Square wave', module: 'signals', description: 'Harmonics and discrete-time edge behavior.' },
  { id: 'impulse', label: 'Unit impulse', module: 'signals', description: 'LTI identity sequence and impulse response.' },
  { id: 'convolution', label: 'Discrete convolution', module: 'signals', description: 'Compute y[n] = x[n] * h[n].' },
  { id: 'spectrum', label: 'DFT spectrum', module: 'dsp', description: 'Bins, leakage and dominant frequency.' },
  { id: 'am', label: 'AM waveform', module: 'communications', description: 'Carrier, message and modulation index.' },
  { id: 'bpsk', label: 'BPSK symbols', module: 'communications', description: 'Binary symbols mapped to phase reversals.' },
];

const MODULE_COPY: Record<SignalLabModule, { label: string; title: string; description: string }> = {
  signals: {
    label: 'Signals & systems',
    title: 'Explore signals, systems and sampling',
    description: 'Change a measurable parameter, run the deterministic model, and connect the plot to the MATLAB expression you would write in a technical notebook.',
  },
  dsp: {
    label: 'Digital signal processing',
    title: 'Inspect spectra and discrete-time operations',
    description: 'Use the DFT and convolution views to reason about bin spacing, leakage, impulse responses and implementation trade-offs.',
  },
  communications: {
    label: 'Communication systems',
    title: 'See modulation before adding a channel',
    description: 'Compare an ideal AM envelope and BPSK phase mapping. The model is transparent about what it does not simulate yet.',
  },
};

function stateForModule(module: SignalLabModule, baseState = loadSignalLabState()): SignalLabState {
  const normalized = normalizeSignalLabState({ ...baseState, module });
  const firstExperiment = EXPERIMENTS.find((experiment) => experiment.module === module);

  return firstExperiment && !EXPERIMENTS.some((experiment) => experiment.module === module && experiment.id === normalized.experiment)
    ? { ...normalized, experiment: firstExperiment.id }
    : normalized;
}

export const SignalSystemsLab: React.FC<SignalSystemsLabProps> = ({ initialModule = 'signals', challenges, onOpenChallenge }) => {
  const [state, setState] = useState<SignalLabState>(() => stateForModule(initialModule));
  const [result, setResult] = useState(() => runSignalExperiment(stateForModule(initialModule)));
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scriptCode, setScriptCode] = useState(MATLAB_SIGNAL_STARTER_CODE);
  const [scriptRunState, setScriptRunState] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [scriptResult, setScriptResult] = useState<MatlabScriptExecutionResult | null>(null);
  const [scriptError, setScriptError] = useState<string | null>(null);

  useEffect(() => {
    const nextState = stateForModule(initialModule);
    setState(nextState);
    setResult(runSignalExperiment(nextState));
    setSaved(false);
  }, [initialModule]);

  const moduleCopy = MODULE_COPY[state.module];
  const availableExperiments = EXPERIMENTS.filter((experiment) => experiment.module === state.module);
  const selectedChallengeId = state.experiment === 'convolution'
    ? 'ece-matlab-02-convolution'
    : state.experiment === 'spectrum'
      ? 'ece-matlab-03-fft-spectrum'
      : state.module === 'communications'
        ? 'ece-matlab-04-bpsk-symbols'
        : 'ece-matlab-01-sampling';
  const selectedChallenge = challenges.find((challenge) => challenge.id === selectedChallengeId);
  const experiment = EXPERIMENTS.find((item) => item.id === state.experiment) || EXPERIMENTS[0];

  const runModel = () => {
    setResult(runSignalExperiment(state));
    setSaved(false);
  };

  const selectModule = (module: SignalLabModule) => {
    const nextState = stateForModule(module, state);
    setState(nextState);
    setResult(runSignalExperiment(nextState));
    setSaved(false);
  };

  const update = <K extends keyof SignalLabState>(key: K, value: SignalLabState[K]) => {
    setState((current) => normalizeSignalLabState({ ...current, [key]: value }));
    setSaved(false);
  };

  const selectExperiment = (experiment: SignalExperiment) => {
    const nextState = normalizeSignalLabState({ ...state, experiment });
    setState(nextState);
    setResult(runSignalExperiment(nextState));
    setSaved(false);
  };

  const reset = () => {
    const next = stateForModule(state.module, DEFAULT_SIGNAL_LAB_STATE);
    setState(next);
    setResult(runSignalExperiment(next));
    setSaved(false);
  };

  const save = () => {
    saveSignalLabState(state);
    setSaved(true);
  };

  const copyStarter = async () => {
    try {
      await navigator.clipboard.writeText(MATLAB_SIGNAL_STARTER_CODE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const runOctave = async () => {
    setScriptRunState('running');
    setScriptError(null);
    try {
      const result = await executeMatlabScript(scriptCode);
      setScriptResult(result);
      setScriptRunState(result.status === 'executed' && result.verdict === 'EXECUTED' ? 'success' : 'error');
      if (!(result.status === 'executed' && result.verdict === 'EXECUTED')) {
        setScriptError(result.error?.message || result.output || 'GNU Octave did not complete the script.');
      }
    } catch (error) {
      setScriptRunState('error');
      setScriptError(error instanceof ApiError ? error.message : 'GNU Octave execution failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className="eyebrow">MATLAB-compatible ECE laboratory</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{moduleCopy.title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{moduleCopy.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} className="focus-ring inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 text-xs font-bold text-teal-900 hover:bg-teal-100"><Save className="h-4 w-4" aria-hidden="true" />{saved ? 'Saved' : 'Save lab state'}</button>
          <button type="button" onClick={reset} className="focus-ring inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-teal-300 hover:bg-teal-50"><RotateCcw className="h-4 w-4" aria-hidden="true" />Reset</button>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950" role="status">
        <p className="font-bold">Execution boundary</p>
         <p className="mt-1">The plots below are deterministic browser-side learning models. The challenge runner uses GNU Octave only when that runtime is installed and enabled; MATLAB execution is not claimed, and no accepted result is inferred from this preview.</p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Signal laboratory modules">
        {(Object.keys(MODULE_COPY) as SignalLabModule[]).map((module) => (
          <button key={module} type="button" role="tab" aria-selected={state.module === module} onClick={() => update('module', module)} className={`focus-ring min-h-[44px] rounded-lg border px-3 text-xs font-bold ${state.module === module ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50'}`}>
            {MODULE_COPY[module].label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
        <aside className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" aria-label={`${moduleCopy.label} experiments`}>
          <div className="px-2 pb-2"><p className="eyebrow">Experiments</p><p className="mt-1 text-xs text-slate-500">Select a model, then change its parameters.</p></div>
          {availableExperiments.map((item) => (
            <button key={item.id} type="button" onClick={() => { update('experiment', item.id); setResult(runSignalExperiment({ ...state, experiment: item.id })); }} aria-pressed={state.experiment === item.id} className={`focus-ring w-full rounded-xl border p-3 text-left ${state.experiment === item.id ? 'border-teal-300 bg-teal-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}>
              <span className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-teal-700"><Waves className="h-4 w-4" aria-hidden="true" /></span>{item.label}</span>
              <span className="mt-2 block text-xs leading-5 text-slate-500">{item.description}</span>
            </button>
          ))}
        </aside>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Interactive model</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">{experiment.label}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{result.explanation}</p></div><span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-teal-800">{moduleCopy.label}</span></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <LabNumberField label="Sample rate (Hz)" value={state.sampleRate} onChange={(value) => update('sampleRate', value)} min={100} max={200000} />
              <LabNumberField label="Frequency (Hz)" value={state.frequency} onChange={(value) => update('frequency', value)} min={0} max={100000} />
              <LabNumberField label="Amplitude" value={state.amplitude} onChange={(value) => update('amplitude', value)} min={0} max={10} step={0.1} />
              <LabNumberField label="Duration (ms)" value={state.durationMs} onChange={(value) => update('durationMs', value)} min={1} max={1000} />
            </div>
            {state.module === 'communications' && <div className="mt-3 grid gap-3 sm:grid-cols-2"><LabNumberField label="Carrier (Hz)" value={state.carrierFrequency} onChange={(value) => update('carrierFrequency', value)} min={1} max={200000} /><LabNumberField label="Modulation index" value={state.modulationIndex} onChange={(value) => update('modulationIndex', value)} min={0} max={1} step={0.05} /></div>}
            <button type="button" onClick={runModel} className="focus-ring mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-enginx-primary px-4 text-sm font-bold text-white hover:bg-teal-700"><Play className="h-4 w-4 fill-current" aria-hidden="true" />Run browser model</button>
          </section>

           <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label={`${result.title} plot`}>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Visualization</p><h2 className="mt-1 text-base font-extrabold text-slate-900">{result.title}</h2></div><div className="flex items-center gap-2 text-xs text-slate-500"><Activity className="h-4 w-4 text-teal-700" aria-hidden="true" />Time-domain and magnitude preview</div></div>
            <SignalPlot points={result.signal} title="Signal" stroke="#0f766e" />
            <SignalPlot points={result.spectrum} title="Magnitude spectrum" stroke="#d97706" />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">{result.metrics.map((metric) => <div key={metric.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{metric.label}</p><p className="mt-1 font-mono text-lg font-bold text-slate-900">{metric.value}</p><p className="mt-1 text-xs leading-5 text-slate-500">{metric.detail}</p></div>)}</div>
           </section>

           <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="GNU Octave script execution">
             <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Real runtime</p><h2 className="mt-1 text-base font-extrabold text-slate-900">Run in GNU Octave</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-slate-600">This sends the editable MATLAB-compatible source to the authenticated evaluator. A browser preview is never presented as an Octave result.</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${scriptRunState === 'success' ? 'bg-emerald-100 text-emerald-800' : scriptRunState === 'running' ? 'bg-amber-100 text-amber-900' : scriptRunState === 'error' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'}`}>{scriptRunState === 'running' ? 'Running…' : scriptRunState}</span></div>
             <textarea value={scriptCode} onChange={(event) => setScriptCode(event.target.value)} spellCheck={false} aria-label="MATLAB-compatible script editor" className="focus-ring mt-4 min-h-56 w-full resize-y rounded-xl border border-slate-200 bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100" />
             <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={runOctave} disabled={scriptRunState === 'running'} className="focus-ring inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-enginx-cta px-3 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"><Play className="h-4 w-4" aria-hidden="true" />{scriptRunState === 'running' ? 'Running GNU Octave…' : 'Run GNU Octave'}</button>{scriptRunState === 'error' && <button type="button" onClick={runOctave} className="focus-ring min-h-[42px] rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:border-teal-300">Retry</button>}</div>
             {scriptError && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-900" role="alert">{scriptError}</p>}
             {scriptResult && <div className="mt-4 space-y-3" aria-live="polite"><div className="grid gap-2 sm:grid-cols-3"><div className="rounded-lg bg-slate-50 p-3 text-xs"><p className="font-bold text-slate-500">Runtime</p><p className="mt-1 font-semibold text-slate-900">{scriptResult.runtime}{scriptResult.runtime_version ? ` · ${scriptResult.runtime_version}` : ''}</p></div><div className="rounded-lg bg-slate-50 p-3 text-xs"><p className="font-bold text-slate-500">Status</p><p className="mt-1 font-semibold text-slate-900">{scriptResult.status}</p></div><div className="rounded-lg bg-slate-50 p-3 text-xs"><p className="font-bold text-slate-500">Duration</p><p className="mt-1 font-semibold text-slate-900">{scriptResult.total_time_ms} ms</p></div></div>{(scriptResult.stdout || scriptResult.stderr) && <pre className="max-h-48 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[11px] leading-5 text-emerald-300">{scriptResult.stdout}{scriptResult.stderr ? `\n[stderr]\n${scriptResult.stderr}` : ''}</pre>}{scriptResult.artifacts.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{scriptResult.artifacts.map((artifact) => artifact.data_uri ? <figure key={`${artifact.filename}-${artifact.data_uri.slice(-12)}`} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"><img src={artifact.data_uri} alt={artifact.filename || 'GNU Octave plot'} className="w-full" /><figcaption className="p-2 text-[11px] text-slate-600">{artifact.filename || 'Generated plot'} · {artifact.size_bytes || 0} bytes</figcaption></figure> : <p key={artifact.filename} className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{artifact.filename || 'Generated artifact'} returned without inline preview.</p>)}</div>}</div>}
           </section>

          <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
             <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-slate-100 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-300">MATLAB-compatible / GNU Octave starter</p><h2 className="mt-1 text-base font-extrabold">Translate the model to code</h2></div><button type="button" onClick={copyStarter} className="focus-ring inline-flex min-h-[36px] items-center gap-2 rounded-lg border border-slate-600 px-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800"><Copy className="h-3.5 w-3.5" aria-hidden="true" />{copied ? 'Copied' : 'Copy'}</button></div><pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap font-mono text-xs leading-6 text-slate-300">{result.matlabCode || MATLAB_SIGNAL_STARTER_CODE}</pre></div>
             <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5"><p className="eyebrow text-teal-800">Prove the concept</p><h2 className="mt-1 text-base font-extrabold text-teal-950">Open a MATLAB-compatible challenge</h2><p className="mt-2 text-sm leading-6 text-teal-900">The editor keeps this signal model, starter code and MATLAB tokenizer together. Evaluation is a GNU Octave capability when the evaluator runtime is available; the browser preview is not a graded MATLAB run.</p>{selectedChallenge ? <button type="button" onClick={() => onOpenChallenge(selectedChallenge)} className="focus-ring mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-teal-300 bg-white px-3 text-xs font-bold text-teal-900 hover:bg-teal-100"><Code2 className="h-4 w-4" aria-hidden="true" />{selectedChallenge.title}</button> : <p className="mt-4 text-xs font-semibold text-amber-800">MATLAB-compatible challenge records are not available from the current catalogue.</p>}<div className="mt-5 border-t border-teal-200 pt-4"><p className="text-xs font-bold uppercase tracking-wide text-teal-800">What to inspect</p><ul className="mt-2 space-y-2 text-xs leading-5 text-teal-950"><li>• Is the signal below the Nyquist limit?</li><li>• Does the dominant DFT bin match the configured tone?</li><li>• What assumptions would a physical measurement add?</li></ul></div></div>
          </section>
        </div>
      </div>
    </div>
  );
};

function LabNumberField({ label, value, onChange, min, max, step = 1 }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number; step?: number }) {
  return <label className="text-xs font-bold text-slate-700">{label}<input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} className="focus-ring mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900" /></label>;
}

function SignalPlot({ points, title, stroke }: { points: Array<{ x: number; y: number }>; title: string; stroke: string }) {
  const viewWidth = 760;
  const viewHeight = 210;
  const pad = 28;
  const maxX = points[points.length - 1]?.x || 1;
  const maxAbsY = Math.max(1, ...points.map((point) => Math.abs(point.y)));
  const path = points.map((point, index) => {
    const x = pad + ((point.x / maxX) * (viewWidth - pad * 2));
    const y = viewHeight / 2 - ((point.y / maxAbsY) * (viewHeight / 2 - pad));
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
  return <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"><BarChart3 className="h-4 w-4 text-teal-700" aria-hidden="true" />{title}</div><svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} role="img" aria-label={`${title} plot`} className="block h-48 w-full"><line x1={pad} x2={viewWidth - pad} y1={viewHeight / 2} y2={viewHeight / 2} stroke="#cbd5e1" strokeWidth="1" /><line x1={pad} x2={pad} y1={pad / 2} y2={viewHeight - pad} stroke="#cbd5e1" strokeWidth="1" /><path d={path} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>;
}

export default SignalSystemsLab;

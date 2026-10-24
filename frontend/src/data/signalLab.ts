import type { ChallengeExecutionMetadata } from '../types';

export type SignalLabModule = 'signals' | 'dsp' | 'communications';
export type SignalExperiment = 'sine' | 'square' | 'impulse' | 'convolution' | 'spectrum' | 'am' | 'bpsk';

export interface SignalLabState {
  module: SignalLabModule;
  experiment: SignalExperiment;
  sampleRate: number;
  frequency: number;
  amplitude: number;
  durationMs: number;
  carrierFrequency: number;
  modulationIndex: number;
  noiseDb: number;
}

export interface PlotPoint {
  x: number;
  y: number;
}

export interface SignalLabExperimentResult {
  time: PlotPoint[];
  signal: PlotPoint[];
  spectrum: PlotPoint[];
  metrics: Array<{ label: string; value: string; detail: string }>;
  title: string;
  explanation: string;
  matlabCode: string;
}

export const SIGNAL_LAB_STORAGE_KEY = 'enginx.ece.signal-lab.state';

/**
 * The browser lab is deterministic and does not contain a MATLAB runtime.
 * The evaluator's supported runtime is GNU Octave when the deployment image
 * provides it; proprietary MATLAB is never implied by these records.
 */
export const MATLAB_CHALLENGE_EXECUTION: ChallengeExecutionMetadata = {
  runtime: 'gnu-octave',
  runtimeLabel: 'GNU Octave · MATLAB-compatible syntax',
  status: 'not-run',
  availability: 'partial',
  runtimeAvailable: false,
  requiredToolboxes: [],
  toolboxAvailability: 'not-required',
  notes: 'The browser editor does not execute MATLAB. The evaluator may run GNU Octave when it is installed and enabled; otherwise the result is reported as unavailable.',
};

export const DEFAULT_SIGNAL_LAB_STATE: SignalLabState = {
  module: 'signals',
  experiment: 'sine',
  sampleRate: 8000,
  frequency: 1000,
  amplitude: 1,
  durationMs: 8,
  carrierFrequency: 10000,
  modulationIndex: 0.7,
  noiseDb: 12,
};

export const MATLAB_SIGNAL_STARTER_CODE = `%% EnginX Signals & Systems Lab
% Change the parameters, run the experiment, and compare the plot.
fs = 8000;              % sampling frequency (Hz)
f0 = 1000;              % sinusoid frequency (Hz)
duration = 0.008;       % seconds
t = 0:1/fs:duration-1/fs;
x = sin(2*pi*f0*t);

subplot(2,1,1);
plot(t, x, 'LineWidth', 1.4);
xlabel('Time (s)'); ylabel('Amplitude');
title('Sampled sinusoid'); grid on;

X = abs(fft(x));
f = (0:length(x)-1) * fs / length(x);
subplot(2,1,2);
stem(f, X, '.');
xlabel('Frequency (Hz)'); ylabel('|X(f)|');
title('Magnitude spectrum'); grid on;
`;

export const MATLAB_LAB_SNIPPETS: Record<SignalExperiment, string> = {
  sine: `fs = 8000; f0 = 1000;\nt = 0:1/fs:0.008-1/fs;\nx = sin(2*pi*f0*t);\nplot(t, x); grid on;`,
  square: `fs = 8000; f0 = 500;\nt = 0:1/fs:0.01-1/fs;\nx = sign(sin(2*pi*f0*t));\nstem(t, x); grid on;`,
  impulse: `n = -10:10;\nx = double(n == 0);\nstem(n, x, 'filled'); grid on;`,
  convolution: `x = [1 2 1]; h = [1 -1 2];\ny = conv(x, h);\nstem(0:length(y)-1, y, 'filled');`,
  spectrum: `fs = 8000; f0 = 1200; N = 64;\nt = (0:N-1)/fs;\nx = sin(2*pi*f0*t);\nX = abs(fft(x));\nf = (0:N-1)*fs/N; stem(f, X);`,
  am: `fs = 100000; fc = 10000; fm = 1000; mu = 0.7;\nt = (0:fs/1000-1)/fs;\nx = (1 + mu*cos(2*pi*fm*t)).*cos(2*pi*fc*t);\nplot(t, x);`,
  bpsk: `bits = [1 0 1 1 0]; Tb = 1e-3; fc = 5000;\n% Map 1 -> +1 and 0 -> -1, then modulate.\nsymbols = 2*bits - 1;`,
};

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export function loadSignalLabState(): SignalLabState {
  if (typeof window === 'undefined') return DEFAULT_SIGNAL_LAB_STATE;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SIGNAL_LAB_STORAGE_KEY) || '{}') as Partial<SignalLabState>;
    return normalizeSignalLabState({ ...DEFAULT_SIGNAL_LAB_STATE, ...parsed });
  } catch {
    return DEFAULT_SIGNAL_LAB_STATE;
  }
}

export function saveSignalLabState(state: SignalLabState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SIGNAL_LAB_STORAGE_KEY, JSON.stringify(normalizeSignalLabState(state)));
  } catch {
    // Lab state is a convenience; a storage failure must not block exploration.
  }
}

export function normalizeSignalLabState(state: SignalLabState): SignalLabState {
  const allowedExperiments: SignalExperiment[] = ['sine', 'square', 'impulse', 'convolution', 'spectrum', 'am', 'bpsk'];
  return {
    ...state,
    module: state.module === 'dsp' || state.module === 'communications' ? state.module : 'signals',
    experiment: allowedExperiments.includes(state.experiment) ? state.experiment : 'sine',
    sampleRate: Math.round(Math.min(200000, Math.max(100, finite(state.sampleRate, DEFAULT_SIGNAL_LAB_STATE.sampleRate)))),
    frequency: Math.min(100000, Math.max(0, finite(state.frequency, DEFAULT_SIGNAL_LAB_STATE.frequency))),
    amplitude: Math.min(10, Math.max(0, finite(state.amplitude, DEFAULT_SIGNAL_LAB_STATE.amplitude))),
    durationMs: Math.min(1000, Math.max(1, finite(state.durationMs, DEFAULT_SIGNAL_LAB_STATE.durationMs))),
    carrierFrequency: Math.min(200000, Math.max(1, finite(state.carrierFrequency, DEFAULT_SIGNAL_LAB_STATE.carrierFrequency))),
    modulationIndex: Math.min(1, Math.max(0, finite(state.modulationIndex, DEFAULT_SIGNAL_LAB_STATE.modulationIndex))),
    noiseDb: Math.min(60, Math.max(0, finite(state.noiseDb, DEFAULT_SIGNAL_LAB_STATE.noiseDb))),
  };
}

export function timeVector(sampleRate: number, durationMs: number, maxSamples = 256): number[] {
  const count = Math.max(8, Math.min(maxSamples, Math.round(sampleRate * durationMs / 1000)));
  return Array.from({ length: count }, (_, index) => index / sampleRate);
}

export function sineSignal(time: number[], frequency: number, amplitude = 1, phase = 0): number[] {
  return time.map((t) => amplitude * Math.sin(2 * Math.PI * frequency * t + phase));
}

export function squareSignal(time: number[], frequency: number, amplitude = 1): number[] {
  return time.map((t) => Math.sin(2 * Math.PI * frequency * t) >= 0 ? amplitude : -amplitude);
}

export function impulseSignal(length: number, index = 0): number[] {
  return Array.from({ length }, (_, current) => current === index ? 1 : 0);
}

export function discreteConvolution(left: number[], right: number[]): number[] {
  return Array.from({ length: left.length + right.length - 1 }, (_, index) => (
    left.reduce((sum, value, leftIndex) => sum + value * (right[index - leftIndex] || 0), 0)
  ));
}

export function dftMagnitude(values: number[], sampleRate: number): PlotPoint[] {
  const n = values.length;
  const bins = Math.max(1, Math.floor(n / 2));
  return Array.from({ length: bins }, (_, k) => {
    let real = 0;
    let imaginary = 0;
    values.forEach((value, index) => {
      const angle = (2 * Math.PI * k * index) / n;
      real += value * Math.cos(angle);
      imaginary -= value * Math.sin(angle);
    });
    return { x: (k * sampleRate) / n, y: (2 * Math.sqrt(real ** 2 + imaginary ** 2)) / n };
  });
}

export function aliasFrequency(sampleRate: number, frequency: number): number {
  const wrapped = ((frequency + sampleRate / 2) % sampleRate + sampleRate) % sampleRate - sampleRate / 2;
  return Math.abs(wrapped);
}

function points(values: number[], xValues: number[]): PlotPoint[] {
  return values.map((value, index) => ({ x: xValues[index] ?? index, y: value }));
}

function formatHz(value: number): string {
  return `${value >= 1000 ? (value / 1000).toFixed(2) : value.toFixed(1)} ${value >= 1000 ? 'kHz' : 'Hz'}`;
}

export function runSignalExperiment(rawState: SignalLabState): SignalLabExperimentResult {
  const state = normalizeSignalLabState(rawState);
  const time = timeVector(state.sampleRate, state.durationMs);
  let values: number[];
  let xValues = time;
  let title = 'Sampled sinusoid';
  let explanation = 'A continuous-time sinusoid becomes a sequence after sampling. The sample rate must be high enough to represent the highest frequency component.';
  let code = MATLAB_SIGNAL_STARTER_CODE;

  if (state.experiment === 'square') {
    values = squareSignal(time, state.frequency, state.amplitude);
    title = 'Two-state square wave';
    explanation = 'A square wave contains a fundamental and odd harmonics. Increasing the sample rate gives a more faithful edge representation.';
    code = MATLAB_LAB_SNIPPETS.square;
  } else if (state.experiment === 'impulse') {
    values = impulseSignal(Math.min(32, time.length), Math.floor(Math.min(32, time.length) / 2));
    xValues = values.map((_, index) => index - Math.floor(values.length / 2));
    title = 'Discrete unit impulse';
    explanation = 'The unit impulse is the identity element for convolution and a compact way to inspect an LTI system response.';
    code = MATLAB_LAB_SNIPPETS.impulse;
  } else if (state.experiment === 'convolution') {
    const left = [1, 2, 1];
    const right = [1, -1, 2];
    values = discreteConvolution(left, right);
    xValues = values.map((_, index) => index);
    title = 'Discrete convolution';
    explanation = 'Convolution combines an input sequence with an impulse response. For an LTI system, y[n] = x[n] * h[n].';
    code = MATLAB_LAB_SNIPPETS.convolution;
  } else if (state.experiment === 'am') {
    values = time.map((t) => (1 + state.modulationIndex * Math.cos(2 * Math.PI * state.frequency * t)) * Math.cos(2 * Math.PI * state.carrierFrequency * t));
    title = 'Amplitude modulation';
    explanation = 'AM places a low-frequency message in sidebands around a carrier. The modulation index controls envelope depth in this ideal model.';
    code = MATLAB_LAB_SNIPPETS.am;
  } else if (state.experiment === 'bpsk') {
    const bitPattern = [1, 0, 1, 1, 0];
    const symbolSamples = Math.max(4, Math.floor(time.length / bitPattern.length));
    values = time.map((_, index) => {
      const bit = bitPattern[Math.min(bitPattern.length - 1, Math.floor(index / symbolSamples))];
      return (bit ? 1 : -1) * Math.cos(2 * Math.PI * state.carrierFrequency * time[index]);
    });
    title = 'BPSK carrier phase reversal';
    explanation = 'Binary phase-shift keying maps symbols to opposite carrier phases. The model shows the sign reversal; a real link also needs pulse shaping, timing and a channel model.';
    code = MATLAB_LAB_SNIPPETS.bpsk;
  } else {
    values = sineSignal(time, state.frequency, state.amplitude);
    if (state.experiment === 'spectrum') {
      title = 'DFT magnitude spectrum';
      explanation = 'The DFT samples the frequency response on bins separated by fs/N. A frequency that falls between bins leaks into neighboring bins.';
      code = MATLAB_LAB_SNIPPETS.spectrum;
    }
  }

  const spectrum = dftMagnitude(values, state.sampleRate);
  const peak = spectrum.reduce((best, current) => current.y > best.y ? current : best, spectrum[0] || { x: 0, y: 0 });
  const nyquist = state.sampleRate / 2;
  const metrics = [
    { label: 'Samples', value: String(values.length), detail: `fs = ${formatHz(state.sampleRate)}` },
    { label: 'Nyquist limit', value: formatHz(nyquist), detail: state.frequency < nyquist ? 'Configured tone is below Nyquist.' : 'Aliasing risk: tone is at or above Nyquist.' },
    { label: 'Dominant bin', value: formatHz(peak.x), detail: `Magnitude ${peak.y.toFixed(3)}` },
  ];

  return { time: points(values, xValues), signal: points(values, xValues), spectrum, metrics, title, explanation, matlabCode: code };
}

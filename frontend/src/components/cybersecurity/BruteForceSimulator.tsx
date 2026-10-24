import React, { useState, useMemo } from 'react';
import { Search, Pause, Play, BarChart2, Info } from 'lucide-react';

export const BruteForceSimulator: React.FC = () => {
  const [target, setTarget] = useState('1234');
  const [speed, setSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [isRunning, setIsRunning] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [found, setFound] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  const charsetSizes = {
    '4 digits': 10000,
    '6 digits': 1_000_000,
    '4 chars (alpha)': 26 ** 4,
    '4 chars (alnum)': 36 ** 4,
    '6 chars (alnum)': 36 ** 6,
    '8 chars (alnum)': 36 ** 8,
  };

  const currentSize = useMemo(() => {
    const key = target.length === 4 && /^\d+$/.test(target) ? '4 digits' :
      target.length === 6 && /^\d+$/.test(target) ? '6 digits' :
      target.length === 4 && /^[A-Za-z]+$/.test(target) ? '4 chars (alpha)' :
      target.length === 4 ? '4 chars (alnum)' :
      target.length === 6 ? '6 chars (alnum)' : '8+ chars (alnum)';
    return { key, size: charsetSizes[key as keyof typeof charsetSizes] || 36 ** 8 };
  }, [target]);

  const speeds = {
    slow: 50,
    medium: 20,
    fast: 5,
  };

  return (
    <div className="space-y-6 rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
          <Search className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Brute-Force Simulator</h2>
          <p className="text-xs text-slate-500">Educational - shows how key space and speed affect cracking time.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowExplanation(!showExplanation)}
          className="ml-auto rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50"
          aria-label={showExplanation ? 'Hide explanation' : 'Show explanation'}
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      {showExplanation && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-bold text-amber-900">How this works</p>
          <p className="mt-1 text-xs leading-5 text-amber-950">
            A brute-force attack tries every possible combination. The key space is determined by
            the charset size and password length. Doubling the length multiplies the key space
            exponentially. Real attackers use GPU clusters; this simulator runs locally to show
            the scale without any network activity.<br /><br />
            A longer password with mixed character types grows the key space astronomically,
            making brute-force impractical even for powerful hardware.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-bold text-slate-700">Target (4-8 digits or characters)</label>
            <input
              type="text"
              value={target}
              onChange={(e) => {
                setTarget(e.target.value.slice(0, 8));
                setFound(false);
                setAttempt(0);
                setTimeElapsed(0);
              }}
              className="focus-ring mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm"
              maxLength={8}
              pattern="[A-Za-z0-9]*"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700">Search Speed</label>
            <div className="mt-1 flex gap-2">
              {(Object.keys(speeds) as Array<keyof typeof speeds>).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold ${
                    speed === s
                      ? 'border-teal-500 bg-teal-50 text-teal-900'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-2">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className={`text-xs font-mono ${
                  i === attempt
                    ? 'text-teal-600'
                    : 'text-slate-400'
                }`}
              >
                {`Attempt ${i}: ${String(i).padStart(4, '0')}`}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-2 rounded-xl bg-slate-50 p-4" aria-label="key space estimate">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600">Key space (charsetⁿ):</span>
            <span className="font-mono font-bold text-slate-900">
              {currentSize.size.toLocaleString()}
            </span>
          </div>
          <BarChart2 className="h-4 w-4 text-slate-400" />
        </div>

        <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-100">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Learning Objective</p>
          <p className="mt-1 text-xs leading-5 text-emerald-900">
            This simulator runs locally in your browser. No computation leaves your machine.
            It demonstrates WHY length + charset diversity defeats brute-force, and WHY slow
            hashing (bcrypt, Argon2id) matters on real credential stores.
          </p>
        </div>
      </div>
    </div>
  );
};

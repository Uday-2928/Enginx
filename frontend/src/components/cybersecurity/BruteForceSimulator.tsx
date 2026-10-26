import React, { useState, useMemo } from 'react';
import { Search, Info } from 'lucide-react';

export const BruteForceSimulator: React.FC = () => {
  const [target, setTarget] = useState('1234');
  const [speed, setSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');
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
    <div className="surface-card space-y-6 p-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="icon-chip">
          <Search className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Brute-Force Simulator</h2>
          <p className="text-xs text-slate-500">Shows how key-space size and guess rate affect crack time.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowExplanation(!showExplanation)}
          className="focus-ring ml-auto rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50"
          aria-label={showExplanation ? 'Hide explanation' : 'Show explanation'}
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      {showExplanation && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">How this works</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            A brute-force attack tries every possible combination. The key space is determined by
            the charset size and password length. Doubling the length multiplies the key space
            exponentially. Real attackers use GPU clusters; this simulator runs locally to show
            the scale without any network activity.
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-600">
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
              onChange={(e) => setTarget(e.target.value.slice(0, 8))}
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
                  className={`focus-ring flex min-h-[40px] flex-1 items-center justify-center rounded-lg border px-2 py-1.5 text-[11px] font-bold ${
                    speed === s
                      ? 'border-teal-300 bg-teal-50 text-teal-900'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          Key-space estimate updates as you type.
        </div>

        <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-label="key space estimate">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600">Key space (charsetⁿ):</span>
            <span className="font-bold tabular-nums text-slate-900">
              {currentSize.size.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-100">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800">Learning objective</p>
          <p className="mt-1 text-xs leading-5 text-emerald-900">
            This simulator runs locally in your browser. No computation leaves your machine.
            It demonstrates why length + charset diversity defeats brute-force, and why slow
            hashing (bcrypt, Argon2id) matters on real credential stores.
          </p>
        </div>
      </div>
    </div>
  );
};

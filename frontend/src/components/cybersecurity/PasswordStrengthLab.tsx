import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

export const PasswordStrengthLab: React.FC = () => {
  const [password, setPassword] = useState('');
  const [strength, setStrength] = useState({
    score: 0,
    feedback: 'Enter a password to begin',
    color: 'bg-slate-200',
    requirements: [
      { id: 'length', label: 'At least 12 characters', met: false },
      { id: 'upper', label: 'Uppercase letters', met: false },
      { id: 'lower', label: 'Lowercase letters', met: false },
      { id: 'number', label: 'Numbers', met: false },
      { id: 'special', label: 'Special characters', met: false },
    ]
  });

  useEffect(() => {
    if (!password) {
      setStrength({
        score: 0,
        feedback: 'Enter a password to begin',
        color: 'bg-slate-200',
        requirements: strength.requirements.map(r => ({ ...r, met: false }))
      });
      return;
    }

    const requirements = [
      { id: 'length', label: 'At least 12 characters', met: password.length >= 12 },
      { id: 'upper', label: 'Uppercase letters', met: /[A-Z]/.test(password) },
      { id: 'lower', label: 'Lowercase letters', met: /[a-z]/.test(password) },
      { id: 'number', label: 'Numbers', met: /[0-9]/.test(password) },
      { id: 'special', label: 'Special characters', met: /[^A-Za-z0-9]/.test(password) },
    ];

    const metCount = requirements.filter(r => r.met).length;
    let score = metCount * 20;

    // Penalize common patterns
    if (/^[A-Z][a-z]+[0-9]{1,4}$/.test(password)) score -= 20; // Word + numbers
    if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters

    let feedback = 'Weak';
    let color = 'bg-rose-500';

    if (score >= 80) {
      feedback = 'Very Strong';
      color = 'bg-emerald-500';
    } else if (score >= 60) {
      feedback = 'Strong';
      color = 'bg-teal-500';
    } else if (score >= 40) {
      feedback = 'Moderate';
      color = 'bg-amber-500';
    }

    setStrength({ score: Math.max(0, score), feedback, color, requirements });
  }, [password]);

  return (
    <div className="surface-card space-y-6 p-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="icon-chip">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Password Strength Analyzer</h2>
          <p className="text-xs text-slate-500">Measure entropy and complexity in real-time.</p>
        </div>
      </div>

      <div className="space-y-4">
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="focus-ring block w-full rounded-lg border border-slate-200 bg-white px-4 py-3 font-mono text-sm placeholder:font-sans placeholder:text-slate-400"
          placeholder="Type a password to test..."
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-600">Strength</span>
            <span className="text-slate-900">{strength.feedback}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${strength.color}`}
              style={{ width: `${strength.score}%` }}
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {strength.requirements.map((req) => (
            <div key={req.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              {req.met ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-slate-300" />
              )}
              <span className={`text-[11px] font-semibold ${req.met ? 'text-slate-900' : 'text-slate-500'}`}>
                {req.label}
              </span>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-amber-50 p-4 border border-amber-100">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800">Security tip</p>
          <p className="mt-1 text-xs leading-5 text-amber-900">
            Length beats complexity. A long phrase like correct-horse-battery-staple is often
            harder to crack than a short password padded with symbols and numbers.
          </p>
        </div>
      </div>
    </div>
  );
};

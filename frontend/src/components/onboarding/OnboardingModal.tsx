import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Code2,
  Cpu,
  Shield,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (role: string, name: string) => void;
  currentRole: string;
}

interface RoleOption {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onSelectRole,
  currentRole,
}) => {
  const [selected, setSelected] = useState(currentRole);
  const [userName, setUserName] = useState('Engineer Alex');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setSelected(currentRole);
  }, [currentRole]);

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => nameInputRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const roles: RoleOption[] = [
    {
      id: 'CSE',
      title: 'Computer science & engineering',
      desc: 'Algorithms, data structures, complexity analysis, and coding practice.',
      icon: Code2,
    },
    {
      id: 'ECE',
      title: 'Electrical & computer engineering',
      desc: 'Verilog HDL, digital logic, and bare-metal embedded C firmware.',
      icon: Cpu,
    },
    {
      id: 'AI',
      title: 'Artificial intelligence & ML',
      desc: 'Neural networks, matrix math, forward passes, and activations.',
      icon: Bot,
    },
    {
      id: 'CYBER',
      title: 'Cybersecurity & CTF',
      desc: 'Cryptography, reverse engineering, exploit payloads, and flags.',
      icon: Shield,
    },
    {
      id: 'ROBOTICS',
      title: 'Robotics & control systems',
      desc: 'Kinematics, coordinate transforms, actuators, and simulation.',
      icon: Bot,
    },
    {
      id: 'HARDWARE',
      title: 'General hardware & gates',
      desc: 'Truth tables, logic synthesis, multiplexers, and circuit design.',
      icon: Cpu,
    },
  ];

  const handleConfirm = () => {
    onSelectRole(selected, userName.trim() || 'Engineer Alex');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm animate-fade-in" role="presentation">
      <div
        ref={dialogRef}
        className="flex max-h-[min(760px,calc(100vh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-teal-100 bg-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
      >
        <div className="border-b border-slate-200 bg-slate-50/80 p-5 text-center sm:p-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Welcome to EnginX
          </span>
          <h2 id="onboarding-title" className="mt-3 text-xl font-extrabold text-slate-900 sm:text-2xl">Choose your primary discipline</h2>
          <p id="onboarding-description" className="mx-auto mt-2 max-w-lg text-sm leading-5 text-slate-600">
            Pick a starting track. You can explore and solve challenges across every discipline at any time.
          </p>
        </div>

        <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
          <div>
            <label htmlFor="display-name" className="mb-2 block text-sm font-semibold text-slate-800">Display name</label>
            <input
              ref={nameInputRef}
              id="display-name"
              type="text"
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              className="focus-ring min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 hover:border-teal-300"
              placeholder="Your name or handle"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label="Discipline options">
            {roles.map(({ id, title, desc, icon: Icon }) => {
              const isSelected = selected === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelected(id)}
                  aria-pressed={isSelected}
                  className={`focus-ring flex min-h-[118px] items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                    isSelected
                      ? 'border-teal-400 bg-teal-50'
                      : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50'
                  }`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${isSelected ? 'border-teal-300 bg-white text-enginx-primary' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-bold leading-5 text-slate-900">{title}</span>
                      {isSelected && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-enginx-primary" aria-hidden="true" />}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-600">{desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="focus-ring min-h-[44px] rounded-lg px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="btn-charge focus-ring flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-enginx-cta bg-enginx-cta px-5 text-sm font-bold text-white hover:border-amber-700 hover:bg-amber-700"
          >
            <span>Start learning</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

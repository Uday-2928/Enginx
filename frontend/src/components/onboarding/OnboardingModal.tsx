import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Code2,
  Cpu,
  GraduationCap,
  Shield,
  Sparkles,
  Target,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type OnboardingStatus = 'idle' | 'loading' | 'success' | 'error';

export type OnboardingField =
  | 'role'
  | 'branch'
  | 'specialization'
  | 'degree'
  | 'year'
  | 'learningGoal'
  | 'weeklyHours'
  | 'displayName';

export type OnboardingValidationErrors = Partial<Record<OnboardingField, string>>;

/**
 * Values emitted by the profile-aware onboarding callback.
 *
 * `role` and `branch` intentionally both remain in the payload. Existing
 * callers use the role id to filter challenges, while the profile API stores
 * the selected engineering branch separately.
 */
export interface OnboardingFormValues {
  role: string;
  branch: string;
  otherBranch: string;
  primaryRole: string;
  specialization: string;
  degree: string;
  year: number | null;
  goal: string;
  learningGoal: string;
  weeklyHours: number | null;
  displayName: string;
  name: string;
}

type OnboardingSubmitHandler = (values: OnboardingFormValues) => void | Promise<void>;

export interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Legacy role callback. It remains optional so a profile-only integration can be used. */
  onSelectRole?: (role: string, name: string) => void;
  currentRole?: string;
  currentBranch?: string | null;
  /** Profile-aware callback used by the onboarding API integration. */
  onSubmit?: OnboardingSubmitHandler;
  /** Alias for integrations that call the final onboarding action `onComplete`. */
  onComplete?: OnboardingSubmitHandler;
  /** Alias for integrations that call the final onboarding action `onSave`. */
  onSave?: OnboardingSubmitHandler;
  onSuccess?: (values: OnboardingFormValues) => void;
  onError?: (error: Error, values: OnboardingFormValues) => void;
  onValidationError?: (errors: OnboardingValidationErrors, values: OnboardingFormValues) => void;
  /** Controlled status props are optional; without them the component manages async state locally. */
  status?: OnboardingStatus;
  submissionState?: OnboardingStatus;
  isLoading?: boolean;
  isSubmitting?: boolean;
  submitSuccess?: boolean;
  error?: string | null;
  errorMessage?: string | null;
  submitError?: string | null;
  successMessage?: string;
  validationErrors?: OnboardingValidationErrors;
}

interface RoleOption {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  primaryRole: string;
  branch: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    id: 'CSE',
    title: 'Computer science & engineering',
    desc: 'Algorithms, data structures, complexity analysis, and coding practice.',
    icon: Code2,
    primaryRole: 'CSE',
    branch: 'CSE',
  },
  {
    id: 'IT',
    title: 'Information technology',
    desc: 'Software systems, platforms, databases, and practical development workflows.',
    icon: Code2,
    primaryRole: 'CSE',
    branch: 'IT',
  },
  {
    id: 'ECE',
    title: 'Electrical & computer engineering',
    desc: 'Verilog HDL, digital logic, and bare-metal embedded C firmware.',
    icon: Cpu,
    primaryRole: 'ECE',
    branch: 'ECE',
  },
  {
    id: 'EEE',
    title: 'Electrical & electronics engineering',
    desc: 'Circuits, power, control, electronics, and hardware fundamentals.',
    icon: Cpu,
    primaryRole: 'ECE',
    branch: 'EEE',
  },
  {
    id: 'AI/ML',
    title: 'Artificial intelligence & ML',
    desc: 'Neural networks, matrix math, forward passes, and activations.',
    icon: Bot,
    primaryRole: 'AI',
    branch: 'AI/ML',
  },
  {
    id: 'AI&DS',
    title: 'AI & data science',
    desc: 'Applied machine learning, statistics, data preparation, and modeling.',
    icon: Bot,
    primaryRole: 'AI',
    branch: 'AI&DS',
  },
  {
    id: 'DATA_SCIENCE',
    title: 'Data science',
    desc: 'Analytics, experimentation, visualization, and data-driven decisions.',
    icon: Bot,
    primaryRole: 'AI',
    branch: 'Data Science',
  },
  {
    id: 'CYBERSECURITY',
    title: 'Cybersecurity & CTF',
    desc: 'Cryptography, reverse engineering, exploit payloads, and flags.',
    icon: Shield,
    primaryRole: 'CYBER',
    branch: 'Cybersecurity',
  },
  {
    id: 'VLSI',
    title: 'VLSI design',
    desc: 'Digital design, HDL, verification, and integrated-circuit workflows.',
    icon: Cpu,
    primaryRole: 'ECE',
    branch: 'VLSI',
  },
  {
    id: 'EMBEDDED',
    title: 'Embedded systems',
    desc: 'Microcontrollers, firmware, real-time systems, and device interfaces.',
    icon: Cpu,
    primaryRole: 'ECE',
    branch: 'Embedded Systems',
  },
  {
    id: 'ROBOTICS',
    title: 'Robotics & control systems',
    desc: 'Kinematics, coordinate transforms, actuators, and simulation.',
    icon: Bot,
    primaryRole: 'ROBOTICS',
    branch: 'Robotics',
  },
  {
    id: 'MECHATRONICS',
    title: 'Mechatronics',
    desc: 'Mechanical systems, electronics, sensors, and automation together.',
    icon: Bot,
    primaryRole: 'ROBOTICS',
    branch: 'Mechatronics',
  },
  {
    id: 'CIVIL',
    title: 'Civil engineering',
    desc: 'Structures, infrastructure, materials, and the built environment.',
    icon: Sparkles,
    primaryRole: 'OTHER',
    branch: 'Civil',
  },
  {
    id: 'MECHANICAL',
    title: 'Mechanical engineering',
    desc: 'Mechanics, design, manufacturing, thermodynamics, and machines.',
    icon: Sparkles,
    primaryRole: 'OTHER',
    branch: 'Mechanical',
  },
  {
    id: 'CHEMICAL',
    title: 'Chemical engineering',
    desc: 'Process design, transport phenomena, reaction systems, and materials.',
    icon: Sparkles,
    primaryRole: 'OTHER',
    branch: 'Chemical',
  },
  {
    id: 'AEROSPACE',
    title: 'Aerospace engineering',
    desc: 'Aircraft, spacecraft, aerodynamics, propulsion, and flight systems.',
    icon: Sparkles,
    primaryRole: 'OTHER',
    branch: 'Aerospace',
  },
  {
    id: 'BIOMEDICAL',
    title: 'Biomedical engineering',
    desc: 'Engineering methods for medical devices, biology, and healthcare.',
    icon: Sparkles,
    primaryRole: 'OTHER',
    branch: 'Biomedical',
  },
  {
    id: 'BIOTECHNOLOGY',
    title: 'Biotechnology',
    desc: 'Biological systems, bioprocessing, computation, and laboratory methods.',
    icon: Sparkles,
    primaryRole: 'OTHER',
    branch: 'Biotechnology',
  },
  {
    id: 'ENVIRONMENTAL',
    title: 'Environmental engineering',
    desc: 'Water, climate, waste, sustainability, and environmental systems.',
    icon: Sparkles,
    primaryRole: 'OTHER',
    branch: 'Environmental',
  },
  {
    id: 'INDUSTRIAL',
    title: 'Industrial engineering',
    desc: 'Operations, quality, optimization, supply chains, and human systems.',
    icon: Sparkles,
    primaryRole: 'OTHER',
    branch: 'Industrial',
  },
  {
    id: 'AGRICULTURAL',
    title: 'Agricultural engineering',
    desc: 'Agri-tech, machinery, irrigation, sensing, and sustainable production.',
    icon: Sparkles,
    primaryRole: 'OTHER',
    branch: 'Agricultural',
  },
  {
    id: 'MARINE',
    title: 'Marine engineering',
    desc: 'Marine vessels, propulsion, offshore systems, and ocean technology.',
    icon: Sparkles,
    primaryRole: 'OTHER',
    branch: 'Marine',
  },
  {
    id: 'TEXTILE',
    title: 'Textile engineering',
    desc: 'Fibres, materials, production processes, and textile technology.',
    icon: Sparkles,
    primaryRole: 'OTHER',
    branch: 'Textile',
  },
  {
    id: 'INSTRUMENTATION',
    title: 'Instrumentation engineering',
    desc: 'Measurement, sensors, automation, process control, and calibration.',
    icon: Cpu,
    primaryRole: 'OTHER',
    branch: 'Instrumentation',
  },
  {
    id: 'ENGINEERING_PHYSICS',
    title: 'Engineering physics',
    desc: 'Physics-led engineering, modeling, optics, energy, and materials.',
    icon: Sparkles,
    primaryRole: 'OTHER',
    branch: 'Engineering Physics',
  },
  {
    id: 'HARDWARE',
    title: 'General hardware & gates',
    desc: 'Truth tables, logic synthesis, multiplexers, and circuit design.',
    icon: Cpu,
    primaryRole: 'HARDWARE',
    branch: 'Hardware',
  },
  {
    id: 'OTHER',
    title: 'Other engineering branch',
    desc: 'Choose another engineering path and tell us what you are exploring.',
    icon: Sparkles,
    primaryRole: 'OTHER',
    branch: '',
  },
];

const DEGREE_OPTIONS = [
  { value: 'B.Tech', label: 'B.Tech' },
  { value: 'B.E.', label: 'B.E.' },
  { value: 'B.Sc', label: 'B.Sc' },
  { value: 'M.Tech', label: 'M.Tech' },
  { value: 'M.E.', label: 'M.E.' },
  { value: 'M.Sc', label: 'M.Sc' },
  { value: 'Diploma', label: 'Diploma' },
  { value: 'Other', label: 'Other degree' },
];

const YEAR_OPTIONS = [
  { value: '1', label: '1st year' },
  { value: '2', label: '2nd year' },
  { value: '3', label: '3rd year' },
  { value: '4', label: '4th year' },
  { value: '5', label: '5th year or postgraduate' },
];

const LEARNING_GOAL_OPTIONS = [
  { value: 'Build practical projects', label: 'Build practical projects' },
  { value: 'Strengthen fundamentals', label: 'Strengthen engineering fundamentals' },
  { value: 'Prepare for interviews', label: 'Prepare for interviews' },
  { value: 'Explore a new field', label: 'Explore a new engineering field' },
  { value: 'Earn certifications', label: 'Prepare for certifications' },
];

function validateProfile(values: OnboardingFormValues): OnboardingValidationErrors {
  const errors: OnboardingValidationErrors = {};

  if (!values.role) errors.role = 'Choose an engineering branch to continue.';
  if (!values.branch) {
    errors.branch = 'Tell us which engineering branch you are exploring.';
  }
  if (values.weeklyHours !== null && (values.weeklyHours < 1 || values.weeklyHours > 168)) {
    errors.weeklyHours = 'Enter between 1 and 168 hours per week.';
  }
  if (!values.displayName) errors.displayName = 'Add a display name to continue.';

  return errors;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onSelectRole,
  currentRole = 'CSE',
  currentBranch,
  onSubmit,
  onComplete,
  onSave,
  onSuccess,
  onError,
  onValidationError,
  status,
  submissionState,
  isLoading = false,
  isSubmitting = false,
  submitSuccess = false,
  error,
  errorMessage,
  submitError,
  successMessage = 'Your engineering profile is ready. Welcome to EnginX!',
  validationErrors,
}) => {
  const [selected, setSelected] = useState(currentRole);
  const [userName, setUserName] = useState('Engineer Alex');
  const [otherBranch, setOtherBranch] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [degree, setDegree] = useState('');
  const [year, setYear] = useState('');
  const [learningGoal, setLearningGoal] = useState('');
  const [weeklyHours, setWeeklyHours] = useState('');
  const [localStatus, setLocalStatus] = useState<OnboardingStatus>('idle');
  const [localError, setLocalError] = useState<string | null>(null);
  const [localValidationErrors, setLocalValidationErrors] = useState<OnboardingValidationErrors>({});
  const nameInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const submitHandler = onSubmit ?? onComplete ?? onSave;
  const externallyControlledStatus = submissionState ?? status;
  const effectiveStatus: OnboardingStatus = isLoading || isSubmitting
    ? 'loading'
    : externallyControlledStatus ?? (submitSuccess ? 'success' : localStatus);
  const busy = effectiveStatus === 'loading';
  const externalError = errorMessage ?? error ?? submitError;
  const displayedError = externalError ?? localError;
  const displayedValidationErrors = {
    ...localValidationErrors,
    ...validationErrors,
  };
  const hasValidationErrors = Object.keys(displayedValidationErrors).length > 0;

  useEffect(() => {
    const branchMatch = currentBranch
      ? ROLE_OPTIONS.find((option) => option.branch.toLowerCase() === currentBranch.toLowerCase())
      : undefined;
    const roleMatch = ROLE_OPTIONS.find((option) => option.id === currentRole)
      || ROLE_OPTIONS.find((option) => option.primaryRole === currentRole);
    setSelected(branchMatch?.id || roleMatch?.id || currentRole || 'CSE');
  }, [currentBranch, currentRole]);

  useEffect(() => {
    if (!isOpen) return;

    setLocalStatus('idle');
    setLocalError(null);
    setLocalValidationErrors({});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => nameInputRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
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

  const updateField = <T extends OnboardingField>(field: T, update: () => void) => {
    update();
    setLocalValidationErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    if (localStatus === 'error') {
      setLocalStatus('idle');
      setLocalError(null);
    }
  };

  const getFormValues = (): OnboardingFormValues => {
    const trimmedName = userName.trim();
    const trimmedOtherBranch = otherBranch.trim();
    const trimmedSpecialization = specialization.trim();
    const trimmedGoal = learningGoal.trim();
    const selectedOption = ROLE_OPTIONS.find((option) => option.id === selected);
    const selectedPrimaryRole = selectedOption?.primaryRole || selected;
    const selectedBranch = selected === 'OTHER'
      ? trimmedOtherBranch
      : selectedOption?.branch || selected;

    return {
      role: selectedPrimaryRole,
      branch: selectedBranch,
      otherBranch: trimmedOtherBranch,
      primaryRole: selectedPrimaryRole,
      specialization: trimmedSpecialization,
      degree,
      year: year ? Number(year) : null,
      goal: trimmedGoal,
      learningGoal: trimmedGoal,
      weeklyHours: weeklyHours ? Number(weeklyHours) : null,
      displayName: trimmedName,
      name: trimmedName,
    };
  };

  const handleConfirm = async () => {
    if (busy) return;

    const values = getFormValues();
    if (!submitHandler) {
      onSelectRole?.(values.role, values.displayName || 'Engineer Alex');
      onClose();
      return;
    }

    const errors = validateProfile(values);
    setLocalValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      setLocalStatus('error');
      onValidationError?.(errors, values);
      return;
    }

    setLocalStatus('loading');
    setLocalError(null);
    try {
      onSelectRole?.(values.role, values.displayName);
      await submitHandler(values);
      setLocalStatus('success');
      onSuccess?.(values);
    } catch (cause) {
      const submissionError = cause instanceof Error ? cause : new Error('Unable to save your profile.');
      setLocalStatus('error');
      setLocalError(submissionError.message);
      onError?.(submissionError, values);
    }
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleConfirm();
  };

  const fieldError = (field: OnboardingField) => displayedValidationErrors[field];
  const submitLabel = busy
    ? 'Saving profile…'
    : effectiveStatus === 'success'
      ? 'Profile saved'
      : submitHandler
        ? 'Save profile'
        : 'Start learning';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm animate-fade-in" role="presentation">
      <div
        ref={dialogRef}
        className="flex max-h-[min(820px,calc(100vh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-teal-100 bg-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
        aria-busy={busy}
      >
        <div className="border-b border-slate-200 bg-slate-50/80 p-5 text-center sm:p-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Welcome to EnginX
          </span>
          <h2 id="onboarding-title" className="mt-3 text-xl font-extrabold text-slate-900 sm:text-2xl">Build your engineering profile</h2>
          <p id="onboarding-description" className="mx-auto mt-2 max-w-lg text-sm leading-5 text-slate-600">
            Choose a starting branch and tell us how you want to learn. You can explore every discipline at any time.
          </p>
        </div>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleFormSubmit} noValidate>
          <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
            {effectiveStatus === 'success' && (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status" aria-live="polite">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>{successMessage}</span>
              </div>
            )}

            {displayedError && effectiveStatus === 'error' && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert" aria-live="assertive">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                <span>{displayedError}</span>
              </div>
            )}

            {hasValidationErrors && effectiveStatus === 'error' && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="alert" aria-live="assertive">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                <span>Please complete the highlighted profile fields before continuing.</span>
              </div>
            )}

            <div>
              <label htmlFor="display-name" className="mb-2 block text-sm font-semibold text-slate-800">Display name</label>
              <input
                ref={nameInputRef}
                id="display-name"
                type="text"
                value={userName}
                onChange={(event) => updateField('displayName', () => setUserName(event.target.value))}
                className={`focus-ring min-h-[44px] w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 hover:border-teal-300 ${fieldError('displayName') ? 'border-rose-300' : 'border-slate-200'}`}
                placeholder="Your name or handle"
                aria-invalid={Boolean(fieldError('displayName'))}
                aria-describedby={fieldError('displayName') ? 'display-name-error' : undefined}
                disabled={busy}
              />
              {fieldError('displayName') && <p id="display-name-error" className="mt-1.5 text-xs text-rose-700">{fieldError('displayName')}</p>}
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <Code2 className="h-4 w-4 text-enginx-primary" aria-hidden="true" />
                <p id="branch-label" className="text-sm font-semibold text-slate-800">Engineering branch</p>
              </div>
              <p className="mb-3 text-xs text-slate-500">Pick the branch that best matches the skills you want to build.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-labelledby="branch-label">
                {ROLE_OPTIONS.map(({ id, title, desc, icon: Icon }) => {
                  const isSelected = selected === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => updateField('branch', () => setSelected(id))}
                      aria-pressed={isSelected}
                      className={`focus-ring flex min-h-[112px] items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                        isSelected
                          ? 'border-teal-400 bg-teal-50'
                          : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50'
                      }`}
                      disabled={busy}
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

            {selected === 'OTHER' && (
              <div>
                <label htmlFor="other-branch" className="mb-2 block text-sm font-semibold text-slate-800">Other engineering branch</label>
                <input
                  id="other-branch"
                  type="text"
                  value={otherBranch}
                  onChange={(event) => updateField('branch', () => setOtherBranch(event.target.value))}
                  className={`focus-ring min-h-[44px] w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 hover:border-teal-300 ${fieldError('branch') ? 'border-rose-300' : 'border-slate-200'}`}
                  placeholder="For example, chemical, civil, or biomedical engineering"
                  aria-invalid={Boolean(fieldError('branch'))}
                  aria-describedby={fieldError('branch') ? 'other-branch-error' : undefined}
                  disabled={busy}
                />
                {fieldError('branch') && <p id="other-branch-error" className="mt-1.5 text-xs text-rose-700">{fieldError('branch')}</p>}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="specialization" className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Target className="h-4 w-4 text-enginx-primary" aria-hidden="true" />
                  Specialization
                </label>
                <input
                  id="specialization"
                  type="text"
                  value={specialization}
                  onChange={(event) => updateField('specialization', () => setSpecialization(event.target.value))}
                  className={`focus-ring min-h-[44px] w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 hover:border-teal-300 ${fieldError('specialization') ? 'border-rose-300' : 'border-slate-200'}`}
                  placeholder="For example, embedded systems"
                  aria-invalid={Boolean(fieldError('specialization'))}
                  aria-describedby={fieldError('specialization') ? 'specialization-error' : undefined}
                  disabled={busy}
                />
                {fieldError('specialization') && <p id="specialization-error" className="mt-1.5 text-xs text-rose-700">{fieldError('specialization')}</p>}
              </div>

              <div>
                <label htmlFor="degree" className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <GraduationCap className="h-4 w-4 text-enginx-primary" aria-hidden="true" />
                  Degree or program
                </label>
                <select
                  id="degree"
                  value={degree}
                  onChange={(event) => updateField('degree', () => setDegree(event.target.value))}
                  className={`focus-ring min-h-[44px] w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 hover:border-teal-300 ${fieldError('degree') ? 'border-rose-300' : 'border-slate-200'}`}
                  aria-invalid={Boolean(fieldError('degree'))}
                  aria-describedby={fieldError('degree') ? 'degree-error' : undefined}
                  disabled={busy}
                >
                  <option value="">Select your degree</option>
                  {DEGREE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                {fieldError('degree') && <p id="degree-error" className="mt-1.5 text-xs text-rose-700">{fieldError('degree')}</p>}
              </div>

              <div>
                <label htmlFor="year" className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <BookOpen className="h-4 w-4 text-enginx-primary" aria-hidden="true" />
                  Current year
                </label>
                <select
                  id="year"
                  value={year}
                  onChange={(event) => updateField('year', () => setYear(event.target.value))}
                  className={`focus-ring min-h-[44px] w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 hover:border-teal-300 ${fieldError('year') ? 'border-rose-300' : 'border-slate-200'}`}
                  aria-invalid={Boolean(fieldError('year'))}
                  aria-describedby={fieldError('year') ? 'year-error' : undefined}
                  disabled={busy}
                >
                  <option value="">Select your year</option>
                  {YEAR_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                {fieldError('year') && <p id="year-error" className="mt-1.5 text-xs text-rose-700">{fieldError('year')}</p>}
              </div>

              <div>
                <label htmlFor="weekly-hours" className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Clock3 className="h-4 w-4 text-enginx-primary" aria-hidden="true" />
                  Weekly learning hours
                </label>
                <input
                  id="weekly-hours"
                  type="number"
                  min="1"
                  max="168"
                  step="1"
                  inputMode="numeric"
                  value={weeklyHours}
                  onChange={(event) => updateField('weeklyHours', () => setWeeklyHours(event.target.value))}
                  className={`focus-ring min-h-[44px] w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 hover:border-teal-300 ${fieldError('weeklyHours') ? 'border-rose-300' : 'border-slate-200'}`}
                  placeholder="Hours per week"
                  aria-invalid={Boolean(fieldError('weeklyHours'))}
                  aria-describedby={fieldError('weeklyHours') ? 'weekly-hours-error' : undefined}
                  disabled={busy}
                />
                {fieldError('weeklyHours') && <p id="weekly-hours-error" className="mt-1.5 text-xs text-rose-700">{fieldError('weeklyHours')}</p>}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="learning-goal" className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Target className="h-4 w-4 text-enginx-primary" aria-hidden="true" />
                  Learning goal
                </label>
                <select
                  id="learning-goal"
                  value={learningGoal}
                  onChange={(event) => updateField('learningGoal', () => setLearningGoal(event.target.value))}
                  className={`focus-ring min-h-[44px] w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 hover:border-teal-300 ${fieldError('learningGoal') ? 'border-rose-300' : 'border-slate-200'}`}
                  aria-invalid={Boolean(fieldError('learningGoal'))}
                  aria-describedby={fieldError('learningGoal') ? 'learning-goal-error' : undefined}
                  disabled={busy}
                >
                  <option value="">Select your main goal</option>
                  {LEARNING_GOAL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                {fieldError('learningGoal') && <p id="learning-goal-error" className="mt-1.5 text-xs text-rose-700">{fieldError('learningGoal')}</p>}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="focus-ring min-h-[44px] rounded-lg px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={busy || effectiveStatus === 'success'}
              className="btn-charge focus-ring flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-enginx-cta bg-enginx-cta px-5 text-sm font-bold text-white hover:border-amber-700 hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}
              {effectiveStatus === 'success' && <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              <span>{submitLabel}</span>
              {!busy && effectiveStatus !== 'success' && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

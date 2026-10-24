import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Award,
  Box,
  BookOpen,
  Bookmark,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleAlert,
  CircuitBoard,
  ClipboardCheck,
  Code2,
  Cpu,
  ExternalLink,
  FileCode2,
  FlaskConical,
  FolderKanban,
  GraduationCap,
  Layers3,
  LayoutDashboard,
  Library,
  LockKeyhole,
  Map as MapIcon,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Radio,
  RotateCcw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Terminal,
  Timer,
  Trophy,
  Waves,
  X,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  Challenge,
  EceLevel,
  EcePreferences,
  SkillTree,
  User,
  UserProgress,
  UserStats,
} from '../../types';
import {
  DEFAULT_ECE_PREFERENCES,
  ECE_HARDWARE,
  ECE_INTERESTS,
  ECE_LEVELS,
  ECE_NAV_ITEMS,
  ECE_PROJECTS,
  ECE_QUICK_TOOLS,
  ECE_RESOURCES,
  ECE_ROADMAPS,
  ECE_ROLES,
  ECE_SUBJECTS,
  ECE_LABS,
  preferencesForUser,
  type EceHubSection,
  type EceNavItem,
  type EceRoadmap,
  type EceRoadmapNode,
  type EceProject,
  type EceSubject,
} from '../../data/eceHub';
import { ECE_LESSONS, type EceLesson } from '../../data/eceLessons';
import { HARDWARE_FUNDAMENTALS_LESSONS, type HardwareFundamentalsLesson } from '../../data/hardwareFundamentals';
import { TUTORIAL_COMPLETION_PREFIX, TUTORIAL_COURSES } from '../../data/tutorials/registry';
import type { TutorialCourse, TutorialLesson } from '../../data/tutorials/types';
import { LogicGatePlayground } from './LogicGatePlayground';
import { SignalSystemsLab } from './SignalSystemsLab';
import { VirtualHardwareLab } from './VirtualHardwareLab';
import { TutorialHub } from '../tutorials/TutorialHub';

interface EceHubProps {
  user: User | null;
  stats: UserStats | null;
  progress: UserProgress | null;
  completedLessonIds: string[];
  skillTree: SkillTree | null;
  challenges: Challenge[];
  onOpenChallenge: (challenge: Challenge) => void;
  onOpenProfile: () => void;
  onSavePreferences: (preferences: EcePreferences) => Promise<void>;
  onCompleteLesson?: (lessonId: string) => Promise<void>;
  isSavingPreferences?: boolean;
  preferencesError?: string | null;
  isCompletingLesson?: boolean;
  lessonError?: string | null;
}

type IconName = EceNavItem['icon'];
type NodeStatus = 'completed' | 'in_progress' | 'available' | 'locked';

const NAV_GROUP_LABELS: Record<EceNavItem['group'], string> = {
  workspace: 'Workspace',
  disciplines: 'Engineering domains',
  practice: 'Practice & labs',
  career: 'Career layer',
  account: 'Your EnginX',
};

const ICONS: Record<IconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  roadmap: MapIcon,
  graduation: GraduationCap,
  chip: Cpu,
  cpu: Cpu,
  logic: CircuitBoard,
  wave: Waves,
  layers: Layers3,
  code: Code2,
  board: CircuitBoard,
  check: ShieldCheck,
  layout: Layers3,
  signal: Activity,
  radio: Radio,
  antenna: Radio,
  field: Waves,
  control: SlidersHorizontal,
  sensor: Activity,
  network: Network,
  debug: Terminal,
  calculator: Calculator,
  lab: FlaskConical,
  'hardware-lab': Box,
  assessment: ClipboardCheck,
  trophy: Trophy,
  interview: GraduationCap,
  library: Library,
  career: Target,
  skills: Award,
  portfolio: FolderKanban,
  community: Network,
  bookmark: Bookmark,
  settings: Settings2,
};

function formatLevel(level: EceLevel): string {
  return ECE_LEVELS.find((option) => option.value === level)?.label || 'New to this';
}

function statusTone(status: NodeStatus): string {
  switch (status) {
    case 'completed': return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'in_progress': return 'border-teal-200 bg-teal-50 text-teal-800';
    case 'available': return 'border-slate-200 bg-white text-slate-700';
    default: return 'border-slate-200 bg-slate-50 text-slate-400';
  }
}

function statusLabel(status: NodeStatus): string {
  return status === 'in_progress' ? 'In progress' : status.charAt(0).toUpperCase() + status.slice(1);
}

function nodeStatus(
  node: EceRoadmapNode,
  completedIds: Set<string>,
  completedLessonIds: Set<string>,
  activatedNodeId: string | null,
  roadmapNodes: EceRoadmapNode[] = [],
): NodeStatus {
  const completedNodeIds = new Set(roadmapNodes.filter((candidate) => completedLessonIds.has(`lesson-${candidate.id}`) || (candidate.challengeId && completedIds.has(candidate.challengeId))).map((candidate) => candidate.id));
  if (completedNodeIds.has(node.id) || completedIds.has(node.id)) return 'completed';
  const prerequisitesComplete = node.prerequisites.every((id) => completedNodeIds.has(id) || completedIds.has(id) || completedLessonIds.has(`lesson-${id}`));
  if (!prerequisitesComplete) return 'locked';
  return activatedNodeId === node.id ? 'in_progress' : 'available';
}

function subjectProgress(subject: EceSubject, completedIds: Set<string>): number | null {
  if (subject.challengeIds.length === 0) return null;
  return Math.round((subject.challengeIds.filter((id) => completedIds.has(id)).length / subject.challengeIds.length) * 100);
}

function metricValue(value: number | null | undefined, suffix = ''): string {
  return value === null || value === undefined ? '—' : `${value}${suffix}`;
}

function getPreferredRoadmap(preferences: EcePreferences): string {
  const signals = [...preferences.target_roles, ...preferences.career_interests].join(' ').toLowerCase();
  if (signals.includes('embedded') || signals.includes('firmware') || signals.includes('iot') || signals.includes('automotive')) return 'embedded-firmware';
  if (signals.includes('signal') || signals.includes('dsp') || signals.includes('communication') || signals.includes('control')) return 'ece-systems';
  return 'vlsi-engineer';
}

function levelBadge(level: EceSubject['level'] | EceProject['level']): string {
  if (level === 'Foundation' || level === 'Starter') return 'bg-emerald-50 text-emerald-800';
  if (level === 'Intermediate') return 'bg-teal-50 text-teal-800';
  return 'bg-amber-50 text-amber-800';
}

export const EceHub: React.FC<EceHubProps> = ({
  user,
  stats,
  progress,
  completedLessonIds,
  skillTree,
  challenges,
  onOpenChallenge,
  onOpenProfile,
  onSavePreferences,
  onCompleteLesson,
  isSavingPreferences = false,
  preferencesError = null,
  isCompletingLesson = false,
  lessonError = null,
}) => {
  const [activeSection, setActiveSection] = useState<EceHubSection>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarQuery, setSidebarQuery] = useState('');
  const [draftPreferences, setDraftPreferences] = useState<EcePreferences>(() => preferencesForUser(user));
  const [showPreferences, setShowPreferences] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState('verilog-digital-logic');
  const [showLessonSolution, setShowLessonSolution] = useState(false);
  const [showAssessmentAnswer, setShowAssessmentAnswer] = useState(false);
  const [selectedFundamentalsLessonId, setSelectedFundamentalsLessonId] = useState(() => {
    if (typeof window === 'undefined') return 'fundamentals-electrical-basics';
    return window.localStorage.getItem('enginx.ece.fundamentals-current-lesson') || 'fundamentals-electrical-basics';
  });
  const [showFundamentalsAnswer, setShowFundamentalsAnswer] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [calculator, setCalculator] = useState<'ohm' | 'rc' | 'sampling'>('ohm');
  const [calculatorInputs, setCalculatorInputs] = useState({ voltage: '5', current: '0.02', resistance: '250', r: '1000', c: '0.000001', sampleRate: '8000', samples: '1024', frequency: '1000' });

  useEffect(() => {
    setDraftPreferences(preferencesForUser(user));
  }, [user]);

  const completedIds = useMemo(() => new Set(progress?.completed_challenges || []), [progress]);
  const completedLessonSet = useMemo(() => new Set(completedLessonIds), [completedLessonIds]);
  const preferences = useMemo(() => preferencesForUser(user), [user]);
  const preferredRoadmapId = getPreferredRoadmap(preferences);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState(preferredRoadmapId);
  useEffect(() => {
    setSelectedRoadmapId(preferredRoadmapId);
  }, [preferredRoadmapId]);
  const selectedRoadmap = ECE_ROADMAPS.find((roadmap) => roadmap.id === selectedRoadmapId) || ECE_ROADMAPS[0];
  const roadmapLessons = ECE_LESSONS.filter((lesson) => lesson.roadmapId === selectedRoadmap.id);
  const selectedLesson = roadmapLessons.find((lesson) => lesson.id === selectedLessonId) || roadmapLessons[0];
  const selectedFundamentalsLesson = HARDWARE_FUNDAMENTALS_LESSONS.find((lesson) => lesson.id === selectedFundamentalsLessonId) || HARDWARE_FUNDAMENTALS_LESSONS[0];
  useEffect(() => {
    try {
      window.localStorage.setItem('enginx.ece.fundamentals-current-lesson', selectedFundamentalsLessonId);
    } catch {
      // Current lesson persistence is best effort when browser storage is blocked.
    }
  }, [selectedFundamentalsLessonId]);
  useEffect(() => {
    if (roadmapLessons.length > 0 && !roadmapLessons.some((lesson) => lesson.id === selectedLessonId)) {
      setSelectedLessonId(roadmapLessons[0].id);
      setShowLessonSolution(false);
      setShowAssessmentAnswer(false);
    }
  }, [roadmapLessons, selectedLessonId]);
  const selectedRoadmapNodes = selectedRoadmap.nodes;
  const activatedNodeId = selectedRoadmapNodes.find((node) => nodeStatus(node, completedIds, completedLessonSet, null, selectedRoadmapNodes) === 'available')?.id || null;
  const filteredNav = useMemo(() => {
    const query = sidebarQuery.trim().toLowerCase();
    if (!query) return ECE_NAV_ITEMS;
    return ECE_NAV_ITEMS.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(query));
  }, [sidebarQuery]);
  const eceChallenges = useMemo(() => challenges.filter((challenge) => challenge.discipline === 'ece-verilog' || challenge.discipline === 'ece-embedded' || challenge.discipline === 'ece-matlab'), [challenges]);
  const attemptedCount = progress ? Object.keys(progress.progress_map || {}).length : null;
  const completedNodeCount = selectedRoadmapNodes.filter((node) => nodeStatus(node, completedIds, completedLessonSet, null, selectedRoadmapNodes) === 'completed').length;
  const currentNav = ECE_NAV_ITEMS.find((item) => item.id === activeSection) || ECE_NAV_ITEMS[0];

  const selectSection = (section: EceHubSection) => {
    setActiveSection(section);
    if (section === 'settings') setShowPreferences(true);
  };

  const openFundamentalsLesson = (lessonId: string) => {
    if (HARDWARE_FUNDAMENTALS_LESSONS.some((lesson) => lesson.id === lessonId)) setSelectedFundamentalsLessonId(lessonId);
    setShowFundamentalsAnswer(false);
    setActiveSection('fundamentals');
  };

  const setPreference = <K extends keyof EcePreferences>(key: K, value: EcePreferences[K]) => {
    setDraftPreferences((current) => ({ ...current, [key]: value }));
    setSaveMessage(null);
  };

  const togglePreferenceValue = (key: 'career_interests' | 'target_roles' | 'available_hardware', value: string) => {
    const values = draftPreferences[key];
    setPreference(key, values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  const savePreferences = async () => {
    setSaveMessage(null);
    await onSavePreferences(draftPreferences);
    setSaveMessage('ECE preferences saved. Recommendations will use them on the next refresh.');
  };

  const updateCalculatorInput = (key: keyof typeof calculatorInputs, value: string) => {
    setCalculatorInputs((current) => ({ ...current, [key]: value }));
  };

  const calculatorResult = useMemo(() => {
    const number = (key: keyof typeof calculatorInputs) => Number(calculatorInputs[key]);
    if (calculator === 'ohm') {
      const voltage = number('voltage');
      const current = number('current');
      const resistance = number('resistance');
      if (voltage > 0 && current > 0) return { label: 'Computed resistance', value: `${(voltage / current).toFixed(3)} Ω`, note: 'V / I using the values above.' };
      if (voltage > 0 && resistance > 0) return { label: 'Computed current', value: `${(voltage / resistance).toFixed(6)} A`, note: 'V / R using the values above.' };
      if (current > 0 && resistance > 0) return { label: 'Computed voltage', value: `${(current * resistance).toFixed(3)} V`, note: 'I × R using the values above.' };
      return { label: 'Add two positive values', value: '—', note: 'The calculator will not infer missing or invalid measurements.' };
    }
    if (calculator === 'rc') {
      const r = number('r');
      const c = number('c');
      return r > 0 && c > 0
        ? { label: 'Time constant', value: `${(r * c * 1000).toFixed(3)} ms`, note: 'τ = R × C. This is a first-order ideal model.' }
        : { label: 'Add R and C', value: '—', note: 'Use positive resistance in Ω and capacitance in F.' };
    }
    const sampleRate = number('sampleRate');
    const samples = number('samples');
    const frequency = number('frequency');
    if (sampleRate > 0 && samples > 0 && frequency >= 0) {
      const nyquist = sampleRate / 2;
      return { label: 'FFT bin spacing', value: `${(sampleRate / samples).toFixed(3)} Hz`, note: `${frequency < nyquist ? 'Frequency is below' : 'Warning: frequency is at or above'} the ${nyquist.toFixed(1)} Hz Nyquist limit.` };
    }
    return { label: 'Add sampling values', value: '—', note: 'Use positive sample rate and sample count.' };
  }, [calculator, calculatorInputs]);

  const renderIcon = (name: IconName, className = 'h-4 w-4') => {
    const Icon = ICONS[name] || Cpu;
    return <Icon className={className} aria-hidden="true" />;
  };

  return (
    <div className="flex min-h-[calc(100vh-4.5rem)] bg-slate-50">
      <aside className={`${collapsed ? 'w-[4.5rem]' : 'w-72'} hidden shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 lg:block`} aria-label="ECE Engineering Hub navigation">
        <div className="sticky top-[4.5rem] flex h-[calc(100vh-4.5rem)] flex-col">
          <div className="flex min-h-[4.25rem] items-center justify-between border-b border-slate-100 px-3">
            {!collapsed && <div className="min-w-0 px-2"><p className="eyebrow">EnginX workspace</p><p className="truncate text-sm font-extrabold text-slate-900">ECE Engineering Hub</p></div>}
            <button type="button" onClick={() => setCollapsed((value) => !value)} className="focus-ring flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900" aria-label={collapsed ? 'Expand ECE navigation' : 'Collapse ECE navigation'} title={collapsed ? 'Expand navigation' : 'Collapse navigation'}>
              {collapsed ? <PanelLeftOpen className="h-4 w-4" aria-hidden="true" /> : <PanelLeftClose className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
          {!collapsed && (
            <label className="mx-3 mt-3 flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-500">
              <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="sr-only">Search ECE sections</span>
              <input value={sidebarQuery} onChange={(event) => setSidebarQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" placeholder="Search hub" />
            </label>
          )}
          <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 pt-3">
            {(['workspace', 'disciplines', 'practice', 'career', 'account'] as EceNavItem['group'][]).map((group) => {
              const groupItems = filteredNav.filter((item) => item.group === group);
              if (groupItems.length === 0) return null;
              return (
                <div key={group} className="mb-4">
                  {!collapsed && <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{NAV_GROUP_LABELS[group]}</p>}
                  <div className="space-y-0.5">
                    {groupItems.map((item) => {
                      const active = activeSection === item.id;
                      return (
                        <button key={item.id} type="button" onClick={() => selectSection(item.id)} className={`focus-ring flex min-h-[42px] w-full items-center gap-3 rounded-lg px-3 text-left text-xs font-semibold transition-colors ${active ? 'bg-teal-50 text-teal-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`} aria-current={active ? 'page' : undefined} title={collapsed ? `${item.label}: ${item.description}` : item.description}>
                          <span className={`shrink-0 ${active ? 'text-enginx-primary' : 'text-slate-400'}`}>{renderIcon(item.icon)}</span>
                          {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                          {!collapsed && active && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-teal-500" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
          {!collapsed && <div className="border-t border-slate-100 p-3"><div className="rounded-xl border border-teal-100 bg-teal-50 p-3"><p className="text-xs font-bold text-teal-900">Learn. Build. Prove.</p><p className="mt-1 text-[11px] leading-5 text-teal-800">Only backend-confirmed evaluations change your verified progress.</p></div></div>}
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500"><span className="font-semibold text-teal-700">EnginX</span><ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /><span className="font-semibold text-slate-700">ECE Engineering Hub</span><ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /><span className="truncate">{currentNav.label}</span></div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => selectSection('settings')} className="focus-ring flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-teal-300 hover:bg-teal-50"><Settings2 className="h-4 w-4 text-teal-700" aria-hidden="true" /><span className="hidden sm:inline">ECE preferences</span></button>
              <button type="button" onClick={onOpenProfile} className="focus-ring flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-teal-300 hover:bg-teal-50"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-[10px] font-extrabold text-teal-800">{(user?.name || 'E').slice(0, 1).toUpperCase()}</span><span className="hidden max-w-[120px] truncate sm:inline">{user?.name || 'Learner'}</span></button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
           {activeSection === 'dashboard' && renderDashboard({ user, stats, progress, completedLessonIds, skillTree, preferences, selectedRoadmap, completedNodeCount, attemptedCount, eceChallenges, onOpenChallenge, onOpenProfile, selectSection })}
           {activeSection === 'roadmaps' && renderRoadmaps({ selectedRoadmap, selectedRoadmapId, setSelectedRoadmapId, completedIds, completedLessonSet, activatedNodeId, challenges, onOpenChallenge, selectSection, roadmapLessons, selectedLesson, selectedLessonId, setSelectedLessonId, showLessonSolution, setShowLessonSolution, showAssessmentAnswer, setShowAssessmentAnswer, onCompleteLesson, isCompletingLesson, lessonError })}
           {activeSection === 'tutorials' && (
             <TutorialHub
               user={user}
               completedLessonIds={completedLessonIds}
               onCompleteLesson={onCompleteLesson}
               onOpenChallenge={(challengeId) => {
                 const linkedChallenge = challenges.find((candidate) => candidate.id === challengeId);
                 if (linkedChallenge) onOpenChallenge(linkedChallenge);
               }}
             />
           )}
           {activeSection === 'fundamentals' && renderFundamentals({ completedLessonSet, selectedLesson: selectedFundamentalsLesson, selectedLessonId: selectedFundamentalsLessonId, setSelectedLessonId: (id) => { setSelectedFundamentalsLessonId(id); setShowFundamentalsAnswer(false); }, showAnswer: showFundamentalsAnswer, setShowAnswer: setShowFundamentalsAnswer, onCompleteLesson, isCompletingLesson, lessonError, openPlayground: () => selectSection('playground'), challenges: eceChallenges, onOpenChallenge })}
           {activeSection === 'playground' && <LogicGatePlayground onOpenLesson={openFundamentalsLesson} onOpenChallenge={onOpenChallenge} halfAdderChallenge={eceChallenges.find((challenge) => challenge.id === 'ece-04-half-adder')} />}
           {activeSection === 'calculations' && renderCalculations({ calculator, setCalculator, calculatorInputs, updateCalculatorInput, calculatorResult })}
           {['signals', 'dsp', 'communications'].includes(activeSection) && <SignalSystemsLab initialModule={activeSection as 'signals' | 'dsp' | 'communications'} challenges={eceChallenges} onOpenChallenge={onOpenChallenge} />}
            {activeSection === 'labs' && renderLabs({ selectSection })}
            {activeSection === 'virtual-lab' && <VirtualHardwareLab userId={user?.id || 'anonymous'} onBack={() => selectSection('dashboard')} />}
          {activeSection === 'challenges' && renderPractice({ eceChallenges, completedIds, onOpenChallenge })}
          {activeSection === 'settings' && renderPreferences({ draftPreferences, setPreference, togglePreferenceValue, savePreferences, isSavingPreferences, preferencesError, saveMessage, showPreferences, setShowPreferences, user })}
          {activeSection === 'resources' && renderResources()}
          {activeSection === 'portfolio' && renderPortfolio({ completedIds, eceChallenges })}
             {!['dashboard', 'roadmaps', 'tutorials', 'fundamentals', 'playground', 'calculations', 'signals', 'dsp', 'communications', 'labs', 'virtual-lab', 'challenges', 'settings', 'resources', 'portfolio'].includes(activeSection) && renderSectionOverview(activeSection, { selectSection, eceChallenges, completedIds, onOpenChallenge })}
        </div>
      </main>
    </div>
  );
};

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ eyebrow, title, description, action }) => (
  <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
    <div className="max-w-3xl">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
    {action}
  </div>
);

const DataNotice: React.FC<{ children: React.ReactNode; tone?: 'info' | 'warning' }> = ({ children, tone = 'info' }) => (
  <div className={`flex items-start gap-2 rounded-xl border p-3 text-xs leading-5 ${tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50 text-slate-600'}`} role="status">
    {tone === 'warning' ? <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" /> : <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />}
    <span>{children}</span>
  </div>
);

const MetricCard: React.FC<{ label: string; value: string; detail: string; icon: LucideIcon }> = ({ label, value, detail, icon: Icon }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><Icon className="h-4 w-4 text-teal-700" aria-hidden="true" /></div>
    <p className="mt-3 font-mono text-2xl font-bold text-slate-900">{value}</p>
    <p className="mt-1 text-xs text-slate-500">{detail}</p>
  </div>
);

interface DashboardRenderProps {
  user: User | null;
  stats: UserStats | null;
  progress: UserProgress | null;
  completedLessonIds: string[];
  skillTree: SkillTree | null;
  preferences: EcePreferences;
  selectedRoadmap: EceRoadmap;
  completedNodeCount: number;
  attemptedCount: number | null;
  eceChallenges: Challenge[];
  onOpenChallenge: (challenge: Challenge) => void;
  onOpenProfile: () => void;
  selectSection: (section: EceHubSection) => void;
}

function renderDashboard({
  user,
  stats,
  progress,
  completedLessonIds,
  skillTree,
  preferences,
  selectedRoadmap,
  completedNodeCount,
  attemptedCount,
  eceChallenges,
  onOpenChallenge,
  onOpenProfile,
  selectSection,
}: DashboardRenderProps) {
  const completedIds = new Set(progress?.completed_challenges || []);
  const nextNode = selectedRoadmap.nodes.find((node) => nodeStatus(node, completedIds, new Set(completedLessonIds), null, selectedRoadmap.nodes) === 'available')
    || selectedRoadmap.nodes.find((node) => nodeStatus(node, completedIds, new Set(completedLessonIds), null, selectedRoadmap.nodes) === 'in_progress');
  const nextChallenge = nextNode?.challengeId ? eceChallenges.find((challenge) => challenge.id === nextNode.challengeId) : undefined;
  const recommendedSubject = ECE_SUBJECTS.find((subject) => subject.id === nextNode?.subjectId) || ECE_SUBJECTS[0];
  const hasVerifiedData = Boolean(stats && progress);
  const interests = preferences.career_interests.slice(0, 3);
  const tutorialCompletedCount = completedLessonIds.filter((id) => id.startsWith(TUTORIAL_COMPLETION_PREFIX)).length;
  let tutorialContinueTarget: { course: TutorialCourse; lesson: TutorialLesson } | null = null;
  for (const tutorialCourse of TUTORIAL_COURSES) {
    for (const tutorialModule of tutorialCourse.modules) {
      const nextLesson = tutorialModule.lessons.find(
        (candidate) => !completedLessonIds.includes(TUTORIAL_COMPLETION_PREFIX + candidate.id),
      );
      if (nextLesson) {
        tutorialContinueTarget = { course: tutorialCourse, lesson: nextLesson };
        break;
      }
    }
    if (tutorialContinueTarget) break;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="ECE Engineering Hub · Learn. Build. Prove."
        title={user ? `Good to see you, ${user.name.split(' ')[0]}.` : 'Build your ECE engineering path.'}
        description="A practical workspace for digital design, VLSI, embedded firmware, signals and hardware projects. Progress shown here is evidence returned by EnginX services, not a fabricated score."
        action={<button type="button" onClick={onOpenProfile} className="focus-ring flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-enginx-cta px-4 text-sm font-bold text-white hover:bg-amber-700"><Settings2 className="h-4 w-4" aria-hidden="true" />{user?.ece_preferences ? 'Tune profile' : 'Set ECE profile'}</button>}
      />

      {!user?.ece_preferences && <DataNotice tone="warning">Your ECE preferences are not saved yet. Set your study level, career interests and hardware access so the roadmap can recommend a sensible next step. You never need physical hardware to start.</DataNotice>}

      <section className="grid gap-4 xl:grid-cols-[1.45fr_0.55fr]" aria-label="Continue learning and career snapshot">
        <div className="rounded-2xl border border-teal-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="eyebrow">Continue learning</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">{selectedRoadmap.title}</h2><p className="mt-1 text-sm text-slate-600">{selectedRoadmap.role}</p></div>
            <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-800">{completedNodeCount}/{selectedRoadmap.nodes.length} milestones</span>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Next evidence checkpoint</p>
              <p className="mt-1 text-base font-bold text-slate-900">{nextNode?.title || 'Choose a roadmap to begin'}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">{nextNode?.evidence || 'Your first available milestone will appear after the profile and roadmap are selected.'}</p>
            </div>
            {nextChallenge ? <button type="button" onClick={() => onOpenChallenge(nextChallenge)} className="focus-ring flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-teal-300 bg-teal-50 px-4 text-sm font-bold text-teal-900 hover:bg-teal-100"><Play className="h-4 w-4" aria-hidden="true" />Open challenge</button> : <button type="button" onClick={() => selectSection('roadmaps')} className="focus-ring flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:border-teal-300 hover:bg-teal-50">View roadmap <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">{interests.length > 0 ? interests.map((interest) => <span key={interest} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">{interest}</span>) : <span className="text-xs text-slate-500">Choose career interests in ECE profile settings.</span>}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-300">Recommended next skill</p>
          <h2 className="mt-2 text-lg font-extrabold">{recommendedSubject.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{recommendedSubject.description}</p>
          <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Next after this</p><p className="mt-1 text-sm font-bold text-teal-200">{recommendedSubject.nextSkill}</p></div>
          <button type="button" onClick={() => selectSection(recommendedSubject.section)} className="focus-ring mt-4 flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-bold text-slate-900 hover:bg-teal-50">Open subject <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
        </div>
      </section>

      <section aria-label="Verified learner statistics">
        <div className="mb-3 flex items-end justify-between gap-3"><div><p className="eyebrow">Evidence ledger</p><h2 className="mt-1 text-lg font-extrabold text-slate-900">Your verified learning statistics</h2></div><span className="text-xs text-slate-500">{hasVerifiedData ? 'Loaded from the backend' : 'Waiting for backend confirmation'}</span></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Challenges attempted" value={metricValue(attemptedCount)} detail="Saved progress entries" icon={Code2} />
          <MetricCard label="Challenges passed" value={metricValue(stats?.completed_count)} detail="Backend-confirmed complete" icon={CheckCircle2} />
          <MetricCard label="Lessons completed" value={metricValue(completedLessonIds.length)} detail={completedLessonIds.length ? 'Durable completion records' : 'No completion records yet'} icon={BookOpen} />
          <MetricCard label="Weekly target" value={metricValue(preferences.weekly_hours, ' h')} detail="From your ECE profile" icon={Timer} />
        </div>
      </section>

      <section className="rounded-2xl border border-teal-200 bg-white p-5 shadow-sm sm:p-6" aria-label="Engineering tutorials">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">Structured courses</p>
            <h2 className="mt-1 text-lg font-extrabold text-slate-900">Engineering Tutorials</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              {TUTORIAL_COURSES.length} assessment-gated courses from digital logic to firmware and VLSI.
              {tutorialCompletedCount > 0
                ? ` You have saved ${tutorialCompletedCount} tutorial lesson${tutorialCompletedCount === 1 ? '' : 's'}.`
                : ' No tutorial lessons saved yet.'}
            </p>
            {tutorialContinueTarget && (
              <p className="mt-2 text-xs font-semibold text-teal-800">
                Continue where you left off: {tutorialContinueTarget.course.title} — {tutorialContinueTarget.lesson.title}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => selectSection('tutorials')}
            className="focus-ring flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg bg-enginx-primary px-4 text-sm font-bold text-white hover:bg-teal-700"
          >
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            Open tutorials
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><p className="eyebrow">Daily practice</p><h2 className="mt-1 text-lg font-extrabold text-slate-900">Pick one small proof task</h2></div><button type="button" onClick={() => selectSection('challenges')} className="focus-ring text-xs font-bold text-teal-800 hover:text-teal-950">View all <ArrowRight className="ml-1 inline h-3.5 w-3.5" aria-hidden="true" /></button></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {eceChallenges.slice(0, 2).map((challenge) => <button key={challenge.id} type="button" onClick={() => onOpenChallenge(challenge)} className="focus-ring rounded-xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-teal-300 hover:bg-teal-50"><div className="flex items-start justify-between gap-2"><span className="text-sm font-bold text-slate-900">{challenge.title}</span><span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-500">{challenge.difficulty}</span></div><p className="mt-2 text-xs text-slate-600">{challenge.topic} · {challenge.language}</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-teal-800">Start proof <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></span></button>)}
            {eceChallenges.length === 0 && <DataNotice>ECE challenge records are unavailable. Open the Practice section after the API or bundled catalogue responds.</DataNotice>}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="eyebrow">System status</p><h2 className="mt-1 text-lg font-extrabold text-slate-900">What is genuinely live?</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /><span><strong className="text-slate-900">Profile and progress</strong><span className="block text-xs text-slate-500">Persisted through authenticated FastAPI routes.</span></span></li>
            <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /><span><strong className="text-slate-900">C and HDL evaluation</strong><span className="block text-xs text-slate-500">Uses the existing evaluator when reachable.</span></span></li>
            <li className="flex gap-2"><Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" /><span><strong className="text-slate-900">Waveforms and physical hardware</strong><span className="block text-xs text-slate-500">Not claimed as available without configured tools.</span></span></li>
          </ul>
          {skillTree && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{skillTree.nodes.length} server roadmap nodes are available to the current learner.</p>}
        </div>
      </section>
    </div>
  );
}

interface RoadmapRenderProps {
  selectedRoadmap: EceRoadmap;
  selectedRoadmapId: string;
  setSelectedRoadmapId: (id: string) => void;
  completedIds: Set<string>;
  completedLessonSet: Set<string>;
  activatedNodeId: string | null;
  challenges: Challenge[];
  onOpenChallenge: (challenge: Challenge) => void;
  selectSection: (section: EceHubSection) => void;
  roadmapLessons: EceLesson[];
  selectedLesson?: EceLesson;
  selectedLessonId: string;
  setSelectedLessonId: (id: string) => void;
  showLessonSolution: boolean;
  setShowLessonSolution: (show: boolean) => void;
  showAssessmentAnswer: boolean;
  setShowAssessmentAnswer: (show: boolean) => void;
  onCompleteLesson?: (lessonId: string) => Promise<void>;
  isCompletingLesson: boolean;
  lessonError: string | null;
}

function renderRoadmaps({ selectedRoadmap, selectedRoadmapId, setSelectedRoadmapId, completedIds, completedLessonSet, activatedNodeId, challenges, onOpenChallenge, selectSection, roadmapLessons, selectedLesson, selectedLessonId, setSelectedLessonId, showLessonSolution, setShowLessonSolution, showAssessmentAnswer, setShowAssessmentAnswer, onCompleteLesson, isCompletingLesson, lessonError }: RoadmapRenderProps) {
  const challengeById = new Map(challenges.map((challenge) => [challenge.id, challenge]));
  const phaseCount = new Map(selectedRoadmap.phases.map((phase) => [phase, selectedRoadmap.nodes.filter((node) => node.phase === phase).length]));
  const selectedLessonCompletionId = selectedLesson ? `lesson-content-${selectedLesson.id}` : '';
  const selectedLessonCompleted = selectedLesson ? completedLessonSet.has(selectedLessonCompletionId) : false;
  const lessonChallenge = selectedLesson?.challengeId ? challengeById.get(selectedLesson.challengeId) : undefined;
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Dependency-aware curriculum" title="Learning roadmaps" description="Milestones unlock from prerequisites and durable evidence. Opening a lesson is not completion; a challenge, assessment or explicit completion record is required." action={<div className="rounded-xl border border-teal-100 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-900">{selectedRoadmap.nodes.length} milestones · {selectedRoadmap.phases.length} phases</div>} />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          {ECE_ROADMAPS.map((roadmap) => {
            const selected = roadmap.id === selectedRoadmapId;
            return <button key={roadmap.id} type="button" onClick={() => setSelectedRoadmapId(roadmap.id)} className={`focus-ring w-full rounded-xl border p-4 text-left transition-colors ${selected ? 'border-teal-300 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-200'}`} aria-pressed={selected}><p className="text-sm font-bold text-slate-900">{roadmap.title}</p><p className="mt-1 text-xs leading-5 text-slate-600">{roadmap.role}</p><span className="mt-3 inline-flex rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-500">{roadmap.nodes.length} milestones</span></button>;
          })}
          <DataNotice>Locked stages explain their prerequisite instead of pretending to be runnable.</DataNotice>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">{selectedRoadmap.title}</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">{selectedRoadmap.role}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{selectedRoadmap.description}</p></div><button type="button" onClick={() => selectSection('settings')} className="focus-ring flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:border-teal-300 hover:bg-teal-50"><Settings2 className="h-4 w-4" aria-hidden="true" />Tune path</button></div>
          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">{selectedRoadmap.phases.map((phase, index) => <div key={phase} className="flex min-w-[150px] flex-1 items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">{index + 1}</span><span className="min-w-0"><span className="block truncate text-xs font-bold text-slate-800">{phase}</span><span className="text-[10px] text-slate-500">{phaseCount.get(phase)} milestones</span></span>{index < selectedRoadmap.phases.length - 1 && <span className="hidden h-px flex-1 bg-slate-200 sm:block" aria-hidden="true" />}</div>)}</div>
           <div className="mt-6 space-y-3">
            {selectedRoadmap.nodes.map((node, index) => {
              const status = nodeStatus(node, completedIds, completedLessonSet, activatedNodeId, selectedRoadmap.nodes);
              const challenge = node.challengeId ? challengeById.get(node.challengeId) : undefined;
              return <div key={node.id} className={`rounded-xl border p-4 ${statusTone(status)}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-start"><div className="flex min-w-0 flex-1 gap-3"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-white/70 text-xs font-bold">{status === 'completed' ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : status === 'locked' ? <LockKeyhole className="h-4 w-4" aria-hidden="true" /> : index + 1}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-slate-900">{node.title}</p><span className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-bold uppercase tracking-wide">{statusLabel(status)}</span></div><p className="mt-1 text-xs leading-5 text-slate-600">{node.description}</p><p className="mt-2 text-[11px] font-semibold text-slate-500">Evidence: {node.evidence} · {Math.round(node.estimatedMinutes / 60)}h estimate</p>{status === 'locked' && <p className="mt-2 text-[11px] font-bold text-slate-500">Requires: {node.prerequisites.join(', ')}</p>}</div></div>{challenge && status !== 'locked' ? <button type="button" onClick={() => onOpenChallenge(challenge)} className="focus-ring flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded-lg border border-teal-300 bg-white/80 px-3 text-xs font-bold text-teal-900 hover:bg-white"><Play className="h-3.5 w-3.5" aria-hidden="true" />Practice</button> : <span className="hidden shrink-0 text-[11px] font-semibold text-slate-500 sm:block">{node.subjectId}</span>}</div></div>;
           })}
           </div>
           <div className="mt-8 border-t border-slate-200 pt-6">
             <div className="flex flex-wrap items-end justify-between gap-3">
               <div><p className="eyebrow">Real learning content</p><h3 className="mt-1 text-lg font-extrabold text-slate-900">{selectedRoadmap.id === 'vlsi-engineer' ? 'Verilog learning path' : 'Embedded C learning path'}</h3><p className="mt-1 text-sm text-slate-600">Read the explanation, inspect the worked example, attempt the task, then save completion to your authenticated profile.</p></div>
               <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-800">{roadmapLessons.filter((lesson) => completedLessonSet.has(`lesson-content-${lesson.id}`)).length}/{roadmapLessons.length} lessons saved</span>
             </div>
             <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
               <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-2" aria-label="Lesson sequence">
                 {roadmapLessons.map((lesson, index) => {
                   const isSelected = lesson.id === selectedLessonId;
                   const isComplete = completedLessonSet.has(`lesson-content-${lesson.id}`);
                   return <button key={lesson.id} type="button" onClick={() => { setSelectedLessonId(lesson.id); setShowLessonSolution(false); setShowAssessmentAnswer(false); }} className={`focus-ring flex min-h-[56px] w-full items-start gap-3 rounded-lg px-3 py-2 text-left ${isSelected ? 'bg-white text-teal-900 shadow-sm ring-1 ring-teal-200' : 'text-slate-600 hover:bg-white'}`} aria-current={isSelected ? 'step' : undefined}><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${isComplete ? 'bg-emerald-100 text-emerald-800' : isSelected ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-500'}`}>{isComplete ? '✓' : index + 1}</span><span className="min-w-0"><span className="block text-xs font-bold">{lesson.title}</span><span className="mt-0.5 block text-[10px] text-slate-500">{lesson.phase}</span></span></button>;
                 })}
               </div>
               {selectedLesson ? <article className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">{selectedLesson.phase}</p><h4 className="mt-1 text-xl font-extrabold text-slate-900">{selectedLesson.title}</h4><p className="mt-2 text-sm leading-6 text-slate-600">{selectedLesson.summary}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${selectedLessonCompleted ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{selectedLessonCompleted ? 'Completed' : 'Study + prove'}</span></div><div className="mt-5 grid gap-5 xl:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Objectives</p><ul className="mt-2 space-y-2 text-sm text-slate-700">{selectedLesson.objectives.map((objective) => <li key={objective} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" /><span>{objective}</span></li>)}</ul><p className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-500">Explanation</p><p className="mt-2 text-sm leading-6 text-slate-700">{selectedLesson.explanation}</p></div><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Worked example</p><pre className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-slate-900 p-4 font-mono text-xs leading-6 text-slate-100">{selectedLesson.workedExample}</pre></div></div><div className="mt-5 rounded-xl border border-teal-200 bg-teal-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-teal-800">Practice task</p><p className="mt-2 text-sm leading-6 text-teal-950">{selectedLesson.exercise}</p><div className="mt-3 flex flex-wrap gap-2">{selectedLesson.hints.map((hint) => <span key={hint} className="rounded-lg border border-teal-200 bg-white px-2.5 py-1.5 text-xs text-teal-900">Hint: {hint}</span>)}</div></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setShowLessonSolution(!showLessonSolution)} className="focus-ring min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-teal-300 hover:bg-teal-50">{showLessonSolution ? 'Hide solution' : 'Show worked solution'}</button>{lessonChallenge && <button type="button" onClick={() => onOpenChallenge(lessonChallenge)} className="focus-ring flex min-h-[40px] items-center gap-2 rounded-lg border border-teal-300 bg-teal-50 px-3 text-xs font-bold text-teal-900 hover:bg-teal-100"><Play className="h-3.5 w-3.5" aria-hidden="true" />Open evaluated challenge</button>}</div>{showLessonSolution && <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700"><p className="font-bold text-slate-900">Solution approach</p><p className="mt-1 whitespace-pre-line">{selectedLesson.solution}</p></div>}<div className="mt-4 rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Checkpoint</p><button type="button" onClick={() => setShowAssessmentAnswer(!showAssessmentAnswer)} className="focus-ring min-h-[36px] rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:border-teal-300">{showAssessmentAnswer ? 'Hide answer' : 'Reveal answer'}</button></div><p className="mt-2 text-sm font-semibold text-slate-900">{selectedLesson.assessment.question}</p>{showAssessmentAnswer && <div className="mt-2 rounded-lg bg-emerald-50 p-3 text-sm leading-6 text-emerald-900"><strong>Answer: </strong>{selectedLesson.assessment.answer}<p className="mt-1 text-xs">{selectedLesson.assessment.explanation}</p></div>}</div><div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">{lessonError && <p className="text-xs font-semibold text-rose-700" role="alert">{lessonError}</p>}{onCompleteLesson && <button type="button" onClick={() => void onCompleteLesson(selectedLessonCompletionId)} disabled={selectedLessonCompleted || isCompletingLesson} className="focus-ring flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-enginx-primary px-4 text-sm font-bold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-emerald-600">{isCompletingLesson ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}{selectedLessonCompleted ? 'Lesson saved' : 'Save lesson complete'}</button>}</div>{selectedLesson.nextLessonId && <button type="button" onClick={() => { setSelectedLessonId(selectedLesson.nextLessonId!); setShowLessonSolution(false); setShowAssessmentAnswer(false); }} className="focus-ring mt-4 flex min-h-[40px] items-center gap-2 text-xs font-bold text-teal-800 hover:text-teal-950">Next lesson: {roadmapLessons.find((lesson) => lesson.id === selectedLesson.nextLessonId)?.title || 'Continue'} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></button>}</article> : <DataNotice>No lesson content is configured for this roadmap yet.</DataNotice>}
             </div>
           </div>
         </div>
      </div>
    </div>
  );
}

interface FundamentalsRenderProps {
  completedLessonSet: Set<string>;
  selectedLesson: HardwareFundamentalsLesson;
  selectedLessonId: string;
  setSelectedLessonId: (id: string) => void;
  showAnswer: boolean;
  setShowAnswer: (show: boolean) => void;
  onCompleteLesson?: (lessonId: string) => Promise<void>;
  isCompletingLesson: boolean;
  lessonError: string | null;
  openPlayground: () => void;
  challenges: Challenge[];
  onOpenChallenge: (challenge: Challenge) => void;
}

function renderFundamentals({ completedLessonSet, selectedLesson, selectedLessonId, setSelectedLessonId, showAnswer, setShowAnswer, onCompleteLesson, isCompletingLesson, lessonError, openPlayground, challenges, onOpenChallenge }: FundamentalsRenderProps) {
  const completionId = `lesson-content-${selectedLesson.id}`;
  const selectedCompleted = completedLessonSet.has(completionId);
  const completedCount = HARDWARE_FUNDAMENTALS_LESSONS.filter((lesson) => completedLessonSet.has(`lesson-content-${lesson.id}`)).length;
  const hasPlaygroundLink = ['fundamentals-logic-gates', 'fundamentals-not-gate', 'fundamentals-and-gate', 'fundamentals-or-gate', 'fundamentals-universal-gates', 'fundamentals-half-adder'].includes(selectedLesson.id);
  const linkedChallenge = selectedLesson.challengeId ? challenges.find((challenge) => challenge.id === selectedLesson.challengeId) : undefined;

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Hardware fundamentals roadmap" title="From electrical signals to logic gates" description="A shared, low-voltage-safe foundation for both the Verilog/RTL and Embedded C tracks. Complete the evidence-backed lessons, then use the gate playground to verify the truth tables yourself." action={<span className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-900">{completedCount}/{HARDWARE_FUNDAMENTALS_LESSONS.length} lessons saved</span>} />
      <DataNotice tone="warning">This learning path models ideal logic and uses safe low-voltage examples. It does not authorize mains-voltage experiments or claim physical electrical measurements.</DataNotice>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Hardware fundamentals lesson sequence">
          {HARDWARE_FUNDAMENTALS_LESSONS.map((lesson, index) => {
            const complete = completedLessonSet.has(`lesson-content-${lesson.id}`);
            const selected = lesson.id === selectedLessonId;
            return <button key={lesson.id} type="button" onClick={() => { setSelectedLessonId(lesson.id); setShowAnswer(false); }} className={`focus-ring flex min-h-[58px] w-full items-start gap-3 rounded-xl px-3 py-2 text-left ${selected ? 'bg-teal-50 text-teal-950 ring-1 ring-teal-200' : 'text-slate-600 hover:bg-slate-50'}`} aria-current={selected ? 'step' : undefined}><span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${complete ? 'bg-emerald-100 text-emerald-800' : selected ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-500'}`}>{complete ? '✓' : index + 1}</span><span className="min-w-0"><span className="block text-xs font-bold">{lesson.title}</span><span className="mt-0.5 block text-[10px] text-slate-500">{lesson.module}</span></span></button>;
          })}
        </div>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">{selectedLesson.module}</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">{selectedLesson.title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{selectedLesson.summary}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${selectedCompleted ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{selectedCompleted ? 'Completed' : 'Study + prove'}</span></div>
          <div className="mt-5 grid gap-4 xl:grid-cols-2"><div className="space-y-4"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Why it matters</p><p className="mt-2 text-sm leading-6 text-slate-700">{selectedLesson.whyItMatters}</p></div><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Prerequisites</p><p className="mt-2 text-sm text-slate-700">{selectedLesson.prerequisites.length ? selectedLesson.prerequisites.join(' · ') : 'None — this is a starting point.'}</p></div><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Explanation</p><p className="mt-2 text-sm leading-6 text-slate-700">{selectedLesson.explanation}</p></div></div><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Diagram / model</p><pre className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-slate-900 p-4 font-mono text-xs leading-6 text-slate-100">{selectedLesson.diagram}</pre><p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Worked example</p><p className="mt-2 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-teal-950">{selectedLesson.example}</p></div></div>
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-amber-800">Practice exercise</p><p className="mt-2 text-sm leading-6 text-amber-950">{selectedLesson.exercise}</p></div>
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Knowledge check</p><p className="mt-2 text-sm font-bold text-slate-900">{selectedLesson.check.question}</p></div><button type="button" onClick={() => setShowAnswer(!showAnswer)} className="focus-ring min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:border-teal-300 hover:bg-teal-50">{showAnswer ? 'Hide answer' : 'Reveal answer'}</button></div>{showAnswer && <p className="mt-3 rounded-lg bg-white p-3 text-sm leading-6 text-teal-900" role="status"><strong>Answer:</strong> {selectedLesson.check.answer}</p>}</div>
          <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => onCompleteLesson?.(completionId)} disabled={selectedCompleted || isCompletingLesson || !onCompleteLesson} className="focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-teal-700 bg-teal-50 px-4 text-xs font-bold text-teal-900 hover:bg-teal-100 disabled:cursor-not-allowed disabled:border-emerald-300 disabled:bg-emerald-50 disabled:text-emerald-700">{selectedCompleted ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}{isCompletingLesson ? 'Saving…' : selectedCompleted ? 'Lesson complete' : 'Save lesson complete'}</button>{hasPlaygroundLink && <button type="button" onClick={openPlayground} className="focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 hover:border-teal-300 hover:bg-teal-50"><CircuitBoard className="h-4 w-4 text-teal-700" aria-hidden="true" />Open logic playground</button>}{linkedChallenge && <button type="button" onClick={() => onOpenChallenge(linkedChallenge)} className="focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-teal-300 bg-white px-4 text-xs font-bold text-teal-900 hover:bg-teal-50"><Code2 className="h-4 w-4" aria-hidden="true" />Open Verilog challenge</button>}</div>
          {lessonError && <p className="mt-2 text-xs font-semibold text-rose-700" role="alert">{lessonError}</p>}
          <div className="mt-5 border-t border-slate-200 pt-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">References and next step</p><ul className="mt-2 space-y-1 text-xs text-slate-600">{selectedLesson.references.map((reference) => <li key={reference}>• {reference}</li>)}</ul>{selectedLesson.nextLessonId && <button type="button" onClick={() => setSelectedLessonId(selectedLesson.nextLessonId || '')} className="focus-ring mt-3 inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 text-xs font-bold text-teal-900 hover:bg-teal-100">Next lesson <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></button>}</div>
        </article>
      </div>
    </div>
  );
}

interface CalculatorRenderProps {
  calculator: 'ohm' | 'rc' | 'sampling';
  setCalculator: (calculator: 'ohm' | 'rc' | 'sampling') => void;
  calculatorInputs: { voltage: string; current: string; resistance: string; r: string; c: string; sampleRate: string; samples: string; frequency: string };
  updateCalculatorInput: (key: 'voltage' | 'current' | 'resistance' | 'r' | 'c' | 'sampleRate' | 'samples' | 'frequency', value: string) => void;
  calculatorResult: { label: string; value: string; note: string };
}

function renderCalculations({ calculator, setCalculator, calculatorInputs, updateCalculatorInput, calculatorResult }: CalculatorRenderProps) {
  const reset = () => {
    updateCalculatorInput('voltage', '5'); updateCalculatorInput('current', '0.02'); updateCalculatorInput('resistance', '250'); updateCalculatorInput('r', '1000'); updateCalculatorInput('c', '0.000001'); updateCalculatorInput('sampleRate', '8000'); updateCalculatorInput('samples', '1024'); updateCalculatorInput('frequency', '1000');
  };
  const fields = calculator === 'ohm'
    ? [{ key: 'voltage' as const, label: 'Voltage (V)', value: calculatorInputs.voltage }, { key: 'current' as const, label: 'Current (A)', value: calculatorInputs.current }, { key: 'resistance' as const, label: 'Resistance (Ω)', value: calculatorInputs.resistance }]
    : calculator === 'rc'
      ? [{ key: 'r' as const, label: 'Resistance (Ω)', value: calculatorInputs.r }, { key: 'c' as const, label: 'Capacitance (F)', value: calculatorInputs.c }]
      : [{ key: 'sampleRate' as const, label: 'Sample rate (Hz)', value: calculatorInputs.sampleRate }, { key: 'samples' as const, label: 'Sample count', value: calculatorInputs.samples }, { key: 'frequency' as const, label: 'Signal frequency (Hz)', value: calculatorInputs.frequency }];
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Engineering tools" title="Calculations with assumptions" description="These calculators expose the formula and units so a learner can inspect the model. They are learning aids, not signoff analysis." action={<button type="button" onClick={reset} className="focus-ring flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-teal-300"><RotateCcw className="h-4 w-4" aria-hidden="true" />Reset</button>} />
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="space-y-2">{([{ id: 'ohm', label: "Ohm's law", description: 'V, I and R' }, { id: 'rc', label: 'RC time constant', description: 'τ = R × C' }, { id: 'sampling', label: 'Sampling & FFT', description: 'Nyquist and bins' }] as const).map((item) => <button key={item.id} type="button" onClick={() => setCalculator(item.id)} className={`focus-ring w-full rounded-xl border p-3 text-left ${calculator === item.id ? 'border-teal-300 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-200'}`} aria-pressed={calculator === item.id}><p className="text-sm font-bold text-slate-900">{item.label}</p><p className="mt-1 text-xs text-slate-500">{item.description}</p></button>)}</div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="grid gap-5 md:grid-cols-[1fr_0.8fr]"><div><p className="eyebrow">Inputs</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{fields.map((field) => <label key={field.key} className="text-xs font-bold text-slate-700">{field.label}<input type="number" inputMode="decimal" value={field.value} onChange={(event) => updateCalculatorInput(field.key, event.target.value)} className="focus-ring mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900" /></label>)}</div></div><div className="rounded-xl border border-teal-200 bg-teal-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-teal-800">{calculatorResult.label}</p><p className="mt-2 font-mono text-2xl font-bold text-teal-950">{calculatorResult.value}</p><p className="mt-2 text-xs leading-5 text-teal-900">{calculatorResult.note}</p></div></div><div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600"><strong className="text-slate-900">Assumptions:</strong> values are idealized, units must be explicit, and the result is not a substitute for SPICE, RF, timing signoff or calibrated measurement.</div></div>
      </div>
    </div>
  );
}

function renderLabs({ selectSection }: { selectSection: (section: EceHubSection) => void }) {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Projects and virtual labs" title="Experiment without pretending" description="Each lab states whether it is a calculation, code execution or guided activity. Hardware and third-party simulator requirements are shown instead of hidden." />
       <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{ECE_LABS.map((lab) => <article key={lab.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-teal-800">{lab.mode}</span><FlaskConical className="h-5 w-5 text-teal-700" aria-hidden="true" /></div><h2 className="mt-4 text-base font-extrabold text-slate-900">{lab.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{lab.teaches}</p><dl className="mt-4 space-y-2 text-xs"><div><dt className="font-bold text-slate-800">Inputs</dt><dd className="text-slate-500">{lab.inputs}</dd></div><div><dt className="font-bold text-slate-800">Expected observation</dt><dd className="text-slate-500">{lab.observation}</dd></div><div><dt className="font-bold text-slate-800">Limitation</dt><dd className="text-amber-800">{lab.limitation}</dd></div></dl><button type="button" onClick={() => selectSection(lab.id === 'logic-lab' ? 'playground' : lab.id === 'sampling-lab' || lab.id === 'matlab-signal-lab' ? 'signals' : lab.mode === 'calculation' ? 'calculations' : lab.mode === 'code' ? 'challenges' : 'roadmaps')} className="focus-ring mt-5 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:border-teal-300 hover:bg-teal-50">Open guided activity <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></button></article>)}</div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"><p className="font-bold">Tooling boundary</p><p className="mt-1 text-xs leading-5">The signal lab's browser model is always available. MATLAB-compatible code execution uses GNU Octave only when the evaluator environment provides it; MATLAB execution, physical acquisition, RF measurement and hardware timing are not claimed.</p></div>
    </div>
  );
}

function renderPractice({ eceChallenges, completedIds, onOpenChallenge }: { eceChallenges: Challenge[]; completedIds: Set<string>; onOpenChallenge: (challenge: Challenge) => void }) {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="LeetCode-style ECE practice" title="Practice challenges" description="Start from a real challenge record. Submissions use the existing backend evaluator and preserve UNAVAILABLE as an infrastructure state." action={<span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">{eceChallenges.length} ECE challenges loaded</span>} />
      {eceChallenges.length === 0 ? <DataNotice tone="warning">No ECE challenge records are available from the backend or local catalogue yet. This view does not fabricate challenge cards.</DataNotice> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{eceChallenges.map((challenge) => { const done = completedIds.has(challenge.id); return <article key={challenge.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${levelBadge(challenge.difficulty === 'Easy' ? 'Starter' : challenge.difficulty === 'Medium' ? 'Intermediate' : 'Advanced')}`}>{challenge.difficulty}</span>{done ? <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-label="Completed" /> : <Code2 className="h-5 w-5 text-teal-700" aria-hidden="true" />}</div><h2 className="mt-4 text-base font-extrabold text-slate-900">{challenge.title}</h2><p className="mt-2 text-xs text-slate-500">{challenge.topic} · {challenge.language} · {challenge.xp_reward} XP when accepted</p><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{challenge.description.replace(/[#`*_]/g, '').slice(0, 190)}…</p><button type="button" onClick={() => onOpenChallenge(challenge)} className="focus-ring mt-auto flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-enginx-primary px-3 text-sm font-bold text-white hover:bg-teal-700">{done ? 'Review challenge' : 'Open challenge'} <ArrowRight className="h-4 w-4" aria-hidden="true" /></button></article>; })}</div>}
    </div>
  );
}

interface PreferenceRenderProps {
  draftPreferences: EcePreferences;
  setPreference: <K extends keyof EcePreferences>(key: K, value: EcePreferences[K]) => void;
  togglePreferenceValue: (key: 'career_interests' | 'target_roles' | 'available_hardware', value: string) => void;
  savePreferences: () => Promise<void>;
  isSavingPreferences: boolean;
  preferencesError: string | null;
  saveMessage: string | null;
  showPreferences: boolean;
  setShowPreferences: (show: boolean) => void;
  user: User | null;
}

function PreferenceChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-pressed={selected} className={`focus-ring min-h-[36px] rounded-full border px-3 text-xs font-semibold transition-colors ${selected ? 'border-teal-300 bg-teal-50 text-teal-900' : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200'}`}>{selected && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />}{label}</button>;
}

function renderPreferences({ draftPreferences, setPreference, togglePreferenceValue, savePreferences, isSavingPreferences, preferencesError, saveMessage, showPreferences, setShowPreferences, user }: PreferenceRenderProps) {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Personalization" title="ECE profile settings" description="Tell EnginX where to start and what role you are aiming for. These signals customize recommendations; they do not grant mastery or alter evaluation." action={<button type="button" onClick={() => setShowPreferences(!showPreferences)} className="focus-ring flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-teal-300">{showPreferences ? <X className="h-4 w-4" aria-hidden="true" /> : <Settings2 className="h-4 w-4" aria-hidden="true" />}{showPreferences ? 'Close editor' : 'Edit preferences'}</button>} />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Current learner profile</p><h2 className="mt-1 text-lg font-extrabold text-slate-900">{user?.name || 'ECE learner'}</h2><p className="mt-1 text-sm text-slate-600">{draftPreferences.preferred_learning_mode} mode · {draftPreferences.weekly_hours ? `${draftPreferences.weekly_hours} hours/week` : 'weekly target not set'}</p></div><span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800">{draftPreferences.target_roles[0] || 'Choose a target role'}</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Year</p><p className="mt-1 text-sm font-bold text-slate-900">{draftPreferences.current_year || 'Not set'}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Semester</p><p className="mt-1 text-sm font-bold text-slate-900">{draftPreferences.current_semester || 'Not set'}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Digital level</p><p className="mt-1 text-sm font-bold text-slate-900">{formatLevel(draftPreferences.digital_electronics_level)}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Simulation</p><p className="mt-1 text-sm font-bold text-slate-900">{formatLevel(draftPreferences.simulation_experience)}</p></div></div></div>
      {showPreferences && <div className="rounded-2xl border border-teal-200 bg-white p-5 shadow-sm sm:p-6"><div className="grid gap-5 lg:grid-cols-2"><div><p className="eyebrow">Study context</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-700">Current year<select value={draftPreferences.current_year || ''} onChange={(event) => setPreference('current_year', event.target.value ? Number(event.target.value) : null)} className="focus-ring mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900"><option value="">Choose</option>{[1, 2, 3, 4, 5].map((year) => <option key={year} value={year}>{year}{year === 5 ? ' · postgraduate' : year === 1 ? ' · first' : ' · year'}</option>)}</select></label><label className="text-xs font-bold text-slate-700">Current semester<select value={draftPreferences.current_semester || ''} onChange={(event) => setPreference('current_semester', event.target.value ? Number(event.target.value) : null)} className="focus-ring mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900"><option value="">Choose</option>{Array.from({ length: 8 }, (_, index) => index + 1).map((semester) => <option key={semester} value={semester}>Semester {semester}</option>)}</select></label><label className="text-xs font-bold text-slate-700">Weekly hours<input type="number" min="1" max="168" value={draftPreferences.weekly_hours || ''} onChange={(event) => setPreference('weekly_hours', event.target.value ? Number(event.target.value) : null)} className="focus-ring mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-900" placeholder="e.g. 6" /></label><label className="text-xs font-bold text-slate-700">Preferred mode<select value={draftPreferences.preferred_learning_mode} onChange={(event) => setPreference('preferred_learning_mode', event.target.value as EcePreferences['preferred_learning_mode'])} className="focus-ring mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-900"><option value="guided">Guided lessons</option><option value="practice">Practice first</option><option value="projects">Project first</option><option value="mixed">Mixed</option></select></label></div></div><div><p className="eyebrow">Knowledge baseline</p><div className="mt-3 space-y-3">{([['electronics_level', 'Electronics'], ['c_programming_level', 'C programming'], ['mathematics_level', 'Mathematics'], ['digital_electronics_level', 'Digital electronics'], ['simulation_experience', 'Simulation experience']] as Array<[keyof EcePreferences, string]>).map(([key, label]) => <label key={key} className="flex items-center justify-between gap-3 text-xs font-bold text-slate-700"><span>{label}</span><select value={draftPreferences[key] as string} onChange={(event) => setPreference(key, event.target.value as EceLevel)} className="focus-ring min-h-[38px] w-44 rounded-lg border border-slate-200 bg-white px-2 text-xs font-normal text-slate-900">{ECE_LEVELS.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}</select></label>)}</div></div></div><div className="mt-6 grid gap-5 lg:grid-cols-3"><div><p className="text-xs font-bold text-slate-800">Career interests</p><div className="mt-2 flex flex-wrap gap-2">{ECE_INTERESTS.map((interest) => <PreferenceChip key={interest} label={interest} selected={draftPreferences.career_interests.includes(interest)} onClick={() => togglePreferenceValue('career_interests', interest)} />)}</div></div><div><p className="text-xs font-bold text-slate-800">Target roles</p><div className="mt-2 flex flex-wrap gap-2">{ECE_ROLES.map((role) => <PreferenceChip key={role} label={role} selected={draftPreferences.target_roles.includes(role)} onClick={() => togglePreferenceValue('target_roles', role)} />)}</div></div><div><p className="text-xs font-bold text-slate-800">Available hardware</p><div className="mt-2 flex flex-wrap gap-2">{ECE_HARDWARE.map((hardware) => <PreferenceChip key={hardware} label={hardware} selected={draftPreferences.available_hardware.includes(hardware)} onClick={() => togglePreferenceValue('available_hardware', hardware)} />)}</div></div></div><div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">{preferencesError ? <p className="text-xs font-semibold text-rose-700" role="alert">{preferencesError}</p> : saveMessage ? <p className="text-xs font-semibold text-emerald-700" role="status">{saveMessage}</p> : <p className="text-xs text-slate-500">Preferences are saved to your authenticated profile.</p>}<button type="button" onClick={() => void savePreferences()} disabled={isSavingPreferences} className="focus-ring flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-enginx-primary px-4 text-sm font-bold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">{isSavingPreferences ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}Save ECE preferences</button></div></div>}
    </div>
  );
}

function renderResources() {
  return (
    <div className="space-y-6"><SectionHeader eyebrow="Trusted references" title="Resources & documentation" description="Links are labeled with their provider and purpose. EnginX does not present an external resource as an official curriculum or invent access to paid material." /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{ECE_RESOURCES.map((resource) => <article key={resource.url} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{resource.subject}</span><ExternalLink className="h-4 w-4 text-teal-700" aria-hidden="true" /></div><h2 className="mt-4 text-sm font-extrabold text-slate-900">{resource.title}</h2><p className="mt-1 text-xs font-semibold text-teal-800">{resource.provider}</p><p className="mt-3 text-xs leading-5 text-slate-600">{resource.note}</p><a href={resource.url} target="_blank" rel="noreferrer" className="focus-ring mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:border-teal-300 hover:bg-teal-50">Open official docs <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a></article>)}</div></div>
  );
}

function renderPortfolio({ completedIds, eceChallenges }: { completedIds: Set<string>; eceChallenges: Challenge[] }) {
  const completedChallenges = eceChallenges.filter((challenge) => completedIds.has(challenge.id));
  return (
    <div className="space-y-6"><SectionHeader eyebrow="Demonstrable work" title="Project portfolio" description="This first release surfaces evidence you have actually completed. Project uploads and rubric review remain separate work until a backend record and authorization model are configured." action={<span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">{completedChallenges.length} verified challenge artifacts</span>} /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{ECE_PROJECTS.map((project) => <article key={project.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-teal-800">{project.track}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${levelBadge(project.level)}`}>{project.level}</span></div><h2 className="mt-4 text-base font-extrabold text-slate-900">{project.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{project.summary}</p><p className="mt-3 text-xs font-semibold text-slate-500">Prerequisites: {project.prerequisites.join(' · ')}</p><div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs"><p className="font-bold text-slate-800">Deliverables</p><ul className="mt-1 list-disc space-y-1 pl-4 text-slate-600">{project.deliverables.map((item) => <li key={item}>{item}</li>)}</ul></div><p className="mt-auto pt-4 text-xs leading-5 text-amber-800"><strong>Hardware alternative:</strong> {project.hardwareAlternative}</p></article>)}</div></div>
  );
}

interface SectionOverviewProps {
  selectSection: (section: EceHubSection) => void;
  eceChallenges: Challenge[];
  completedIds: Set<string>;
  onOpenChallenge: (challenge: Challenge) => void;
}

function renderSectionOverview(section: EceHubSection, { selectSection, eceChallenges, completedIds, onOpenChallenge }: SectionOverviewProps) {
  const navItem = ECE_NAV_ITEMS.find((item) => item.id === section) || ECE_NAV_ITEMS[0];
  const subjects = ECE_SUBJECTS.filter((subject) => subject.section === section || (section === 'vlsi' && ['vlsi-foundations', 'verilog-rtl', 'verification'].includes(subject.id)) || (section === 'embedded' && ['embedded-c', 'microcontrollers', 'protocols'].includes(subject.id)));
  const relevantChallenges = eceChallenges.filter((challenge) => subjects.some((subject) => subject.challengeIds.includes(challenge.id)));
  const isUnavailable = ['rf', 'antennas', 'electromagnetics', 'physical-design', 'contests', 'community'].includes(section);
  return (
    <div className="space-y-6"><SectionHeader eyebrow="ECE Engineering Hub" title={navItem.label} description={navItem.description} /><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-teal-700"><Cpu className="h-5 w-5" aria-hidden="true" /></span><div><h2 className="text-lg font-extrabold text-slate-900">A shared, data-driven subject surface</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">This area uses the same subject, roadmap, challenge and resource records as the rest of the hub. It avoids creating a disconnected placeholder page for every domain.</p></div></div>{isUnavailable && <div className="mt-5"><DataNotice tone="warning">No compatible simulator or contest backend is configured for this surface yet. EnginX shows the learning scope and requirements without claiming execution.</DataNotice></div>}</div>{subjects.length > 0 && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{subjects.map((subject) => { const progress = subjectProgress(subject, completedIds); return <article key={subject.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${levelBadge(subject.level)}`}>{subject.level}</span>{progress === null ? <span className="text-[10px] font-semibold text-slate-400">No challenge evidence yet</span> : <span className="text-[10px] font-semibold text-teal-800">{progress}% verified</span>}</div><p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-teal-700">{subject.eyebrow}</p><h2 className="mt-1 text-base font-extrabold text-slate-900">{subject.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{subject.description}</p><p className="mt-3 text-xs text-slate-500">{subject.lessons} lessons · ~{subject.estimatedHours}h · next: {subject.nextSkill}</p><button type="button" onClick={() => selectSection(subject.challengeIds.length > 0 ? 'challenges' : 'roadmaps')} className="focus-ring mt-4 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:border-teal-300 hover:bg-teal-50">{subject.challengeIds.length > 0 ? 'Open linked practice' : 'Open roadmap context'} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></button></article>; })}</div>}{relevantChallenges.length > 0 && <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5"><p className="eyebrow">Linked practice</p><div className="mt-3 flex flex-wrap gap-2">{relevantChallenges.map((challenge) => <button key={challenge.id} type="button" onClick={() => onOpenChallenge(challenge)} className="focus-ring rounded-lg border border-teal-200 bg-white px-3 py-2 text-xs font-bold text-teal-900 hover:bg-teal-100">{completedIds.has(challenge.id) ? '✓ ' : ''}{challenge.title}</button>)}</div></div>}</div>
  );
}

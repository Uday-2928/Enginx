import React, { useState } from 'react';
import {
  Activity,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Code2,
  Cpu,
  FlaskConical,
  LayoutDashboard,
  Library,
  Map as MapIcon,
  ShieldCheck,
  Trophy,
  ArrowRight,
  Settings2,
  Save,
  X,
  CircleAlert,
  Timer,
  Play,
  Zap,
  Lock,
  Unlock,
  Key,
  Terminal,
  ExternalLink,
  ChevronDown,
  Info,
  Check,
  AlertTriangle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  CybersecurityCourse,
  CybersecurityLab,
  CybersecurityCTFChallenge,
  CybersecurityProgress,
  User,
  CybersecurityLesson,
} from '../../types';
import {
  CYBER_COURSES,
  CYBER_NAV_ITEMS,
  CYBER_LABS,
  CTF_CHALLENGES,
  CYBER_BADGES,
  CYBER_RESOURCES,
} from '../../data/cyberHub';
import { PasswordStrengthLab } from './PasswordStrengthLab';
import { BruteForceSimulator } from './BruteForceSimulator';

interface CyberHubProps {
  user: User | null;
  progress: CybersecurityProgress | null;
  courses: CybersecurityCourse[];
  labs: CybersecurityLab[];
  ctfChallenges: CybersecurityCTFChallenge[];
  onOpenCourse?: (course: CybersecurityCourse) => void;
  onOpenLab?: (lab: CybersecurityLab) => void;
  onOpenCTF?: (challenge: CybersecurityCTFChallenge) => void;
}

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  book: BookOpen,
  lab: FlaskConical,
  flag: Trophy,
  chart: Activity,
  library: Library,
};

export const CyberHub: React.FC<CyberHubProps> = ({
  user,
  progress,
  courses,
  labs,
  ctfChallenges,
  onOpenCourse,
  onOpenLab,
  onOpenCTF,
}) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CybersecurityCourse | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<CybersecurityLesson | null>(null);
  const [selectedLab, setSelectedLab] = useState<CybersecurityLab | null>(null);
  const [selectedCTF, setSelectedCTF] = useState<CybersecurityCTFChallenge | null>(null);
  const [userFlagInput, setUserFlagInput] = useState('');
  const [ctfResult, setCtfResult] = useState<{ success: boolean; message: string } | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [lessonAnswerInput, setLessonAnswerInput] = useState('');
  const [lessonFeedback, setLessonFeedback] = useState<{ correct: boolean; message: string } | null>(null);

  const displayCourses = courses.length > 0 ? courses : CYBER_COURSES;
  const displayLabs = labs.length > 0 ? labs : CYBER_LABS;
  const displayCTFs = ctfChallenges.length > 0 ? ctfChallenges : CTF_CHALLENGES;

  const handleLessonComplete = (lessonId: string) => {
    if (!completedLessonIds.includes(lessonId)) {
      setCompletedLessonIds([...completedLessonIds, lessonId]);
    }
  };

  const handleCheckLessonAnswer = (checkAnswer: string) => {
    if (lessonAnswerInput.trim().toLowerCase() === checkAnswer.trim().toLowerCase()) {
      setLessonFeedback({ correct: true, message: 'Correct! Well done.' });
      if (selectedLesson) {
        handleLessonComplete(selectedLesson.id);
      }
    } else {
      setLessonFeedback({ correct: false, message: 'Incorrect. Check the explanation and try again.' });
    }
  };

  const handleCTFSubmit = (expectedFlag?: string) => {
    if (!expectedFlag) return;
    if (userFlagInput.trim() === expectedFlag.trim()) {
      setCtfResult({ success: true, message: 'Flag captured! +XP awarded to your profile.' });
    } else {
      setCtfResult({ success: false, message: 'Incorrect flag format or value. Keep hunting!' });
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4.5rem)] bg-slate-50">
      {/* Sidebar Navigation */}
      <aside className={`${collapsed ? 'w-[4.5rem]' : 'w-72'} hidden shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 lg:block`}>
        <div className="sticky top-[4.5rem] flex h-[calc(100vh-4.5rem)] flex-col">
          <div className="flex min-h-[4.25rem] items-center justify-between border-b border-slate-100 px-3">
            {!collapsed && (
              <div className="min-w-0 px-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-600">EnginX Defense</p>
                <p className="truncate text-sm font-extrabold text-slate-900">Cyber Hub</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 rotate-180" />}
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {CYBER_NAV_ITEMS.map((item) => {
              const Icon = ICONS[item.icon] || LayoutDashboard;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    setSelectedCourse(null);
                    setSelectedLesson(null);
                    setSelectedLab(null);
                    setSelectedCTF(null);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                    active ? 'bg-teal-50 text-teal-900 font-bold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-teal-700' : 'text-slate-400'}`} />
                  {!collapsed && item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header Banner */}
          <header className="rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-900 via-slate-900 to-slate-900 p-6 text-white shadow-md">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-teal-400" />
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight">Cybersecurity & Ethical Hacking Hub</h1>
                <p className="mt-1 text-xs text-teal-200">
                  Defensive engineering, OWASP security, cryptography & offensive CTF methodology.
                </p>
              </div>
            </div>
          </header>

          {/* Detailed Views or Section Dashboards */}

          {/* Lesson View */}
          {selectedLesson && (
            <div className="space-y-6 rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="rounded-md bg-teal-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-teal-700">
                    {selectedLesson.level} · {selectedLesson.duration_minutes || selectedLesson.durationMinutes || 30} mins
                  </span>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">{selectedLesson.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedLesson(null)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed">
                <p className="font-semibold text-slate-900">{selectedLesson.summary}</p>
                <div className="mt-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Lesson Material</h4>
                  <p className="whitespace-pre-wrap">{selectedLesson.body}</p>
                </div>

                {selectedLesson.code_sample || selectedLesson.codeSample && (
                  <div className="mt-4 rounded-xl bg-slate-900 p-4 text-slate-100 font-mono text-xs overflow-x-auto">
                    <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-2">// Code Example / Artifact</div>
                    <pre>{selectedLesson.code_sample || selectedLesson.codeSample}</pre>
                  </div>
                )}

                {selectedLesson.exercise && (
                  <div className="mt-4 rounded-xl bg-teal-50 p-4 border border-teal-100">
                    <h4 className="text-xs font-bold uppercase text-teal-900 mb-1">Practical Exercise</h4>
                    <p className="text-xs text-teal-950">{selectedLesson.exercise}</p>
                    {selectedLesson.hint && (
                      <p className="mt-2 text-[11px] text-teal-700 italic">Hint: {selectedLesson.hint}</p>
                    )}
                  </div>
                )}

                {/* Knowledge Check */}
                {(selectedLesson.check || selectedLesson.assessment) && (
                  <div className="mt-6 border-t border-slate-100 pt-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Knowledge Check</h4>
                    <p className="text-xs font-medium text-slate-800">
                      {selectedLesson.check?.question || selectedLesson.assessment?.question}
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={lessonAnswerInput}
                        onChange={(e) => setLessonAnswerInput(e.target.value)}
                        placeholder="Type your answer..."
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono"
                      />
                      <button
                        onClick={() => handleCheckLessonAnswer(selectedLesson.check?.answer || selectedLesson.assessment?.answer || '')}
                        className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700"
                      >
                        Verify
                      </button>
                    </div>
                    {lessonFeedback && (
                      <div className={`p-3 rounded-lg text-xs font-medium ${lessonFeedback.correct ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'}`}>
                        {lessonFeedback.message}
                        {lessonFeedback.correct && (
                          <p className="mt-1 text-[11px] text-emerald-800">
                            {selectedLesson.check?.explanation || selectedLesson.assessment?.explanation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interactive Lab View */}
          {selectedLab && (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedLab(null)}
                className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700"
              >
                ← Back to Labs
              </button>
              {selectedLab.id === 'lab-password-strength' && <PasswordStrengthLab />}
              {selectedLab.id === 'lab-hash-cracker' && <BruteForceSimulator />}
              {selectedLab.id !== 'lab-password-strength' && selectedLab.id !== 'lab-hash-cracker' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900">{selectedLab.title}</h3>
                  <p className="mt-2 text-xs text-slate-600">{selectedLab.summary}</p>
                  <div className="mt-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Objectives</h4>
                    <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                      {selectedLab.objectives.map((obj, i) => (
                        <li key={i}>{obj}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CTF Challenge View */}
          {selectedCTF && (
            <div className="space-y-6 rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    {selectedCTF.category} · {selectedCTF.difficulty}
                  </span>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">{selectedCTF.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedCTF(null)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-xs text-slate-800">
                  <h4 className="font-bold uppercase text-slate-500 mb-1">Briefing</h4>
                  <p>{selectedCTF.briefing || selectedCTF.summary}</p>
                </div>

                {selectedCTF.hints && selectedCTF.hints.length > 0 && (
                  <div className="rounded-xl bg-amber-50 p-4 border border-amber-100 text-xs text-amber-900">
                    <h4 className="font-bold uppercase text-amber-800 mb-1">Hints</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedCTF.hints.map((hint, i) => (
                        <li key={i}>{hint}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Flag Submission Box */}
                <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase text-teal-900">Submit Flag</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={userFlagInput}
                      onChange={(e) => setUserFlagInput(e.target.value)}
                      placeholder="ENGINX{...}"
                      className="flex-1 rounded-lg border border-teal-200 px-3 py-2 text-xs font-mono"
                    />
                    <button
                      onClick={() => handleCTFSubmit(selectedCTF.flag)}
                      className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700"
                    >
                      Submit
                    </button>
                  </div>
                  {ctfResult && (
                    <div className={`p-3 rounded-lg text-xs font-medium ${ctfResult.success ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'}`}>
                      {ctfResult.message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section: Dashboard */}
          {activeSection === 'dashboard' && !selectedLesson && !selectedLab && !selectedCTF && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Curriculum Progress</h3>
                  <p className="mt-2 text-2xl font-extrabold text-slate-900">{progress?.completion_percentage || 0}%</p>
                  <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-teal-500" style={{ width: `${progress?.completion_percentage || 0}%` }} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">CTF Challenges</h3>
                  <p className="mt-2 text-2xl font-extrabold text-slate-900">{displayCTFs.length} Available</p>
                  <p className="mt-1 text-xs text-slate-500">Across 4 domain categories</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Interactive Labs</h3>
                  <p className="mt-2 text-2xl font-extrabold text-slate-900">{displayLabs.length} Labs</p>
                  <p className="mt-1 text-xs text-slate-500">100% browser-isolated</p>
                </div>
              </div>

              {/* Quick Course Pickers */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Featured Learning Paths</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {displayCourses.slice(0, 3).map((course) => (
                    <article key={course.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <span className="rounded-md bg-teal-50 px-2 py-1 text-[10px] font-bold uppercase text-teal-700">
                        {course.level}
                      </span>
                      <h4 className="mt-3 font-bold text-slate-900">{course.title}</h4>
                      <p className="mt-2 text-xs text-slate-600 line-clamp-2">{course.summary}</p>
                      <button
                        onClick={() => {
                          setSelectedCourse(course);
                          if (course.lessons && course.lessons.length > 0) {
                            setSelectedLesson(course.lessons[0] as CybersecurityLesson);
                          }
                        }}
                        className="mt-4 flex w-full items-center justify-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-xs font-bold text-white hover:bg-teal-700"
                      >
                        Start Learning <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section: Courses / Learning Paths */}
          {activeSection === 'courses' && !selectedLesson && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {displayCourses.map((course) => (
                <article key={course.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-teal-50 px-2 py-1 text-[10px] font-bold uppercase text-teal-700">
                      {course.level}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{course.estimatedHours || 6}h</span>
                  </div>
                  <h4 className="font-bold text-slate-900">{course.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{course.summary}</p>

                  {course.lessons && course.lessons.length > 0 && (
                    <div className="border-t border-slate-100 pt-3 space-y-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Lessons ({course.lessons.length})</p>
                      {course.lessons.map((lesson) => (
                        <button
                          key={lesson.id}
                          onClick={() => setSelectedLesson(lesson as CybersecurityLesson)}
                          className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 text-left"
                        >
                          <span className="truncate">{lesson.title}</span>
                          <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          {/* Section: Hands-on Labs */}
          {activeSection === 'labs' && !selectedLab && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {displayLabs.map((lab) => (
                <article key={lab.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase text-amber-700">
                    {lab.difficulty}
                  </span>
                  <h4 className="font-bold text-slate-900">{lab.title}</h4>
                  <p className="text-xs text-slate-600">{lab.summary}</p>
                  <button
                    onClick={() => setSelectedLab(lab)}
                    className="mt-4 w-full rounded-lg bg-teal-600 px-3 py-2 text-xs font-bold text-white hover:bg-teal-700"
                  >
                    Launch Lab
                  </button>
                </article>
              ))}
            </div>
          )}

          {/* Section: CTF Challenges */}
          {activeSection === 'ctf' && !selectedCTF && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {displayCTFs.map((challenge) => (
                <article key={challenge.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase text-amber-700">
                      {challenge.category} · {challenge.difficulty}
                    </span>
                    <span className="text-xs font-bold text-teal-600">+{challenge.xpReward || 50} XP</span>
                  </div>
                  <h4 className="font-bold text-slate-900">{challenge.title}</h4>
                  <p className="text-xs text-slate-600">{challenge.summary}</p>
                  <button
                    onClick={() => setSelectedCTF(challenge)}
                    className="mt-4 w-full rounded-lg bg-teal-600 px-3 py-2 text-xs font-bold text-white hover:bg-teal-700"
                  >
                    Attempt Challenge
                  </button>
                </article>
              ))}
            </div>
          )}

          {/* Section: Progress & Badges */}
          {activeSection === 'progress' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Badges & Achievements</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {CYBER_BADGES.map((badge) => (
                    <div key={badge.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <Award className="h-8 w-8 text-teal-600 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{badge.name}</h4>
                        <p className="text-[11px] text-slate-500">{badge.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section: Resources */}
          {activeSection === 'resources' && (
            <div className="grid gap-4 md:grid-cols-2">
              {CYBER_RESOURCES.map((resource, i) => (
                <a
                  key={i}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-300 transition-colors block"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-teal-600">{resource.provider}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <h4 className="mt-2 font-bold text-slate-900">{resource.title}</h4>
                  <p className="mt-1 text-xs text-slate-600">{resource.note}</p>
                </a>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Info,
  LayoutDashboard,
  Library,
  X,
} from 'lucide-react';
import { domainIcon } from './domainIcons';
import type { LucideIcon } from 'lucide-react';
import type { DomainEntry } from '../../data/domains/registry';
import { DOMAIN_COMPLETION_PREFIX } from '../../data/domains/registry';
import type { DomainContentBundle, DomainCourse, DomainLesson } from '../../data/domains/types';

interface DomainHubProps {
  domain: DomainEntry;
  content: DomainContentBundle;
  completedLessonIds: string[];
  onCompleteLesson?: (lessonId: string) => Promise<void>;
}

type DomainHubSection = 'dashboard' | 'paths' | 'career' | 'resources';

const NAV_ITEMS: { id: DomainHubSection; label: string; icon: LucideIcon; blurb: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, blurb: 'Where you stand and what to open next.' },
  { id: 'paths', label: 'Learning paths', icon: BookOpen, blurb: 'Ordered courses with worked examples.' },
  { id: 'career', label: 'Career paths', icon: Briefcase, blurb: 'Roles, skills and the projects that prove them.' },
  { id: 'resources', label: 'Resources', icon: Library, blurb: 'Official references worth keeping open.' },
];

function lessonComplete(lesson: DomainLesson, completedLessonIds: string[]): boolean {
  return completedLessonIds.includes(DOMAIN_COMPLETION_PREFIX + lesson.id);
}

function courseProgressPercent(course: DomainCourse, completedLessonIds: string[]): number {
  if (course.lessons.length === 0) return 0;
  const done = course.lessons.filter((lesson) => lessonComplete(lesson, completedLessonIds)).length;
  return Math.round((done / course.lessons.length) * 100);
}

export const DomainHub: React.FC<DomainHubProps> = ({
  domain,
  content,
  completedLessonIds,
  onCompleteLesson,
}) => {
  const [activeSection, setActiveSection] = useState<DomainHubSection>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [openCourseId, setOpenCourseId] = useState<string | null>(null);
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);
  const [answerInput, setAnswerInput] = useState('');
  const [checkFeedback, setCheckFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [isMarking, setIsMarking] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);

  const BannerIcon = domainIcon(domain.icon);

  const openCourse = useMemo(
    () => content.courses.find((course) => course.id === openCourseId) ?? null,
    [content.courses, openCourseId],
  );
  const openLesson = useMemo(() => {
    for (const course of content.courses) {
      const lesson = course.lessons.find((item) => item.id === openLessonId);
      if (lesson) return { course, lesson };
    }
    return null;
  }, [content.courses, openLessonId]);

  const totalLessons = content.courses.reduce((sum, course) => sum + course.lessons.length, 0);
  const doneLessons = useMemo(() => {
    let done = 0;
    for (const course of content.courses) {
      for (const lesson of course.lessons) {
        if (lessonComplete(lesson, completedLessonIds)) done += 1;
      }
    }
    return done;
  }, [content.courses, completedLessonIds]);
  const overallPercent = totalLessons === 0 ? 0 : Math.round((doneLessons / totalLessons) * 100);

  const openLessonIn = (courseId: string, lessonId: string) => {
    setOpenCourseId(courseId);
    setOpenLessonId(lessonId);
    setAnswerInput('');
    setCheckFeedback(null);
    setMarkError(null);
  };

  const closeLesson = () => {
    setOpenLessonId(null);
    setAnswerInput('');
    setCheckFeedback(null);
    setMarkError(null);
  };

  const markComplete = async (lesson: DomainLesson) => {
    if (!onCompleteLesson) return;
    setIsMarking(true);
    setMarkError(null);
    try {
      await onCompleteLesson(DOMAIN_COMPLETION_PREFIX + lesson.id);
    } catch {
      setMarkError('The completion could not be saved. Check your connection and try again.');
    } finally {
      setIsMarking(false);
    }
  };

  const verifyAnswer = (lesson: DomainLesson) => {
    const expected = lesson.check.answer.trim().toLowerCase();
    if (answerInput.trim().toLowerCase() === expected) {
      setCheckFeedback({ correct: true, message: 'Correct. The explanation is below.' });
      void markComplete(lesson);
    } else {
      setCheckFeedback({ correct: false, message: 'Not yet - re-read the section the question points at and try again.' });
    }
  };

  const neighbors = useMemo(() => {
    if (!openLesson) return { prev: null as DomainLesson | null, next: null as DomainLesson | null };
    const flat = openLesson.course.lessons;
    const index = flat.findIndex((item) => item.id === openLesson.lesson.id);
    return {
      prev: index > 0 ? flat[index - 1] : null,
      next: index >= 0 && index < flat.length - 1 ? flat[index + 1] : null,
    };
  }, [openLesson]);

  const switchSection = (section: DomainHubSection) => {
    setActiveSection(section);
    closeLesson();
    setOpenCourseId(null);
  };

  const openCourseView = (course: DomainCourse) => {
    setOpenCourseId(course.id);
    setOpenLessonId(null);
  };

  return (
    <div className="flex min-h-[calc(100vh-4.5rem)] bg-slate-50">
      {/* Sidebar navigation (desktop) */}
      <aside className={`${collapsed ? 'w-[4.5rem]' : 'w-72'} hidden shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 lg:block`}>
        <div className="sticky top-[4.5rem] flex h-[calc(100vh-4.5rem)] flex-col">
          <div className="flex min-h-[4.25rem] items-center justify-between border-b border-slate-100 px-3">
            {!collapsed && (
              <div className="min-w-0 px-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-600">EnginX Domains</p>
                <p className="truncate text-sm font-extrabold text-slate-900">{domain.shortName} Hub</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50"
            >
              <ChevronRight className={`h-4 w-4 ${collapsed ? '' : 'rotate-180'}`} />
            </button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-2" aria-label={`${domain.shortName} sections`}>
            {NAV_ITEMS.map((item) => {
              const active = activeSection === item.id && !openLesson;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => switchSection(item.id)}
                  title={item.blurb}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                    active ? 'bg-teal-50 font-bold text-teal-900' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${active ? 'text-teal-700' : 'text-slate-400'}`} />
                  {!collapsed && item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Section switcher (mobile) */}
          <nav className="flex gap-1 overflow-x-auto pb-1 lg:hidden" aria-label={`${domain.shortName} sections`}>
            {NAV_ITEMS.map((item) => {
              const active = activeSection === item.id && !openLesson;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => switchSection(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`focus-ring flex min-h-[40px] shrink-0 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                    active
                      ? 'border-teal-200 bg-teal-50 text-teal-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:bg-teal-50'
                  }`}
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Header banner */}
          <header className="rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-900 via-slate-900 to-slate-900 p-6 text-white shadow-md">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-teal-700 bg-teal-800/60">
                <BannerIcon className="h-6 w-6 text-teal-300" aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight">{domain.name}</h1>
                <p className="mt-1 text-xs text-teal-200">{domain.tagline}</p>
              </div>
            </div>
          </header>

          {/* Honest status note - always visible, never dressed up */}
          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
            <span>{domain.statusNote}</span>
          </div>

          {/* Lesson view replaces the section body while a lesson is open */}
          {openLesson ? (
            <LessonView
              key={openLesson.lesson.id}
              lesson={openLesson.lesson}
              courseTitle={openLesson.course.title}
              isComplete={lessonComplete(openLesson.lesson, completedLessonIds)}
              answerInput={answerInput}
              onAnswerChange={setAnswerInput}
              feedback={checkFeedback}
              onVerify={() => verifyAnswer(openLesson.lesson)}
              onMarkComplete={() => void markComplete(openLesson.lesson)}
              isMarking={isMarking}
              markError={markError}
              canPersist={Boolean(onCompleteLesson)}
              onClose={closeLesson}
              onOpenLesson={(lessonId) => openLessonIn(openLesson.course.id, lessonId)}
              prev={neighbors.prev}
              next={neighbors.next}
            />
          ) : openCourse ? (
            <CourseLessonsView
              course={openCourse}
              completedLessonIds={completedLessonIds}
              onOpenLesson={(lessonId) => openLessonIn(openCourse.id, lessonId)}
              onBack={() => setOpenCourseId(null)}
            />
          ) : (
            <>
              {activeSection === 'dashboard' && (
                <div className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Lesson progress</h3>
                      <p className="mt-2 text-2xl font-extrabold text-slate-900">{overallPercent}%</p>
                      <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-teal-500 transition-[width]" style={{ width: `${overallPercent}%` }} />
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500">{doneLessons} of {totalLessons} lessons completed</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Learning paths</h3>
                      <p className="mt-2 text-2xl font-extrabold text-slate-900">{content.courses.length}</p>
                      <p className="mt-1 text-xs text-slate-500">{totalLessons} lessons with worked examples</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Career paths</h3>
                      <p className="mt-2 text-2xl font-extrabold text-slate-900">{content.careerPaths.length}</p>
                      <p className="mt-1 text-xs text-slate-500">Skills, tools and portfolio projects per role</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900">Pick up where it makes sense</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {content.courses.map((course) => {
                        const percent = courseProgressPercent(course, completedLessonIds);
                        return (
                          <article key={course.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="rounded-md bg-teal-50 px-2 py-1 text-[10px] font-bold uppercase text-teal-700">
                                {course.level}
                              </span>
                              <span className="text-xs font-bold text-slate-400">{course.estimatedHours}h</span>
                            </div>
                            <h4 className="mt-3 font-bold text-slate-900">{course.title}</h4>
                            <p className="mt-2 line-clamp-2 text-xs text-slate-600">{course.summary}</p>
                            <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
                              <div className="h-1.5 rounded-full bg-teal-500" style={{ width: `${percent}%` }} />
                            </div>
                            <p className="mt-1 text-[11px] text-slate-500">{percent}% of {course.lessons.length} lessons</p>
                            <button
                              type="button"
                              onClick={() => openCourseView(course)}
                              className="mt-4 flex w-full items-center justify-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-xs font-bold text-white hover:bg-teal-700"
                            >
                              {percent > 0 ? 'Continue' : 'Start learning'} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'paths' && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {content.courses.map((course) => (
                    <article key={course.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-teal-50 px-2 py-1 text-[10px] font-bold uppercase text-teal-700">
                          {course.level}
                        </span>
                        <span className="text-xs font-bold text-slate-400">{course.estimatedHours}h</span>
                      </div>
                      <h4 className="font-bold text-slate-900">{course.title}</h4>
                      <p className="text-xs leading-relaxed text-slate-600">{course.summary}</p>
                      <div className="border-t border-slate-100 pt-3">
                        <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Covers</p>
                        <p className="text-xs text-slate-600">{course.topics.join(' · ')}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openCourseView(course)}
                        className="mt-2 w-full rounded-lg bg-teal-600 px-3 py-2 text-xs font-bold text-white hover:bg-teal-700"
                      >
                        Open path ({course.lessons.length} lessons)
                      </button>
                    </article>
                  ))}
                </div>
              )}

              {activeSection === 'career' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600">
                    Skill maps for roles this domain leads to. Completing EnginX material prepares you for these
                    paths; it does not by itself guarantee a job or replace employer assessments.
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {content.careerPaths.map((path) => (
                      <article key={path.id} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-900">{path.title}</h4>
                            <Award className="h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">{path.summary}</p>
                        </div>
                        <CareerList label="Skills to build" items={path.skills} />
                        <CareerList label="Tools worth learning" items={path.tools} />
                        <CareerList label="Portfolio projects" items={path.projects} />
                        <CareerList label="Interview focus" items={path.interviewFocus} />
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'resources' && (
                <div className="grid gap-4 md:grid-cols-2">
                  {content.resources.map((resource) => (
                    <a
                      key={resource.url}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-teal-300"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-teal-600">{resource.provider}</span>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      </div>
                      <h4 className="mt-2 font-bold text-slate-900">{resource.title}</h4>
                      <p className="mt-1 text-xs text-slate-600">{resource.note}</p>
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

interface CareerListProps {
  label: string;
  items: string[];
}

const CareerList: React.FC<CareerListProps> = ({ label, items }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
    <h5 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</h5>
    <ul className="list-inside list-disc space-y-1 text-xs text-slate-600">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  </div>
);

interface CourseLessonsViewProps {
  course: DomainCourse;
  completedLessonIds: string[];
  onOpenLesson: (lessonId: string) => void;
  onBack: () => void;
}

/** Course outline: every lesson listed with its completion state. */
const CourseLessonsView: React.FC<CourseLessonsViewProps> = ({
  course,
  completedLessonIds,
  onOpenLesson,
  onBack,
}) => (
  <div className="space-y-4">
    <button
      type="button"
      onClick={onBack}
      className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700"
    >
      &larr; Back to paths
    </button>
    <div className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-teal-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-teal-700">
          {course.level} · {course.estimatedHours} hours
        </span>
      </div>
      <h2 className="mt-2 text-xl font-bold text-slate-900">{course.title}</h2>
      <p className="mt-2 text-sm text-slate-600">{course.summary}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <h5 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">You will be able to</h5>
          <ul className="list-inside list-disc space-y-1 text-xs text-slate-600">
            {course.outcomes.map((outcome) => (
              <li key={outcome}>{outcome}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <h5 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Lessons ({course.lessons.length})</h5>
          <div className="space-y-1">
            {course.lessons.map((lesson, index) => {
              const done = lessonComplete(lesson, completedLessonIds);
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => onOpenLesson(lesson.id)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-white"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-4 shrink-0 text-right font-mono text-[10px] text-slate-400">{index + 1}.</span>
                    <span className="truncate">{lesson.title}</span>
                  </span>
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600" aria-label="Completed" />
                  ) : (
                    <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  </div>
);

interface LessonViewProps {
  lesson: DomainLesson;
  courseTitle: string;
  isComplete: boolean;
  answerInput: string;
  onAnswerChange: (value: string) => void;
  feedback: { correct: boolean; message: string } | null;
  onVerify: () => void;
  onMarkComplete: () => void;
  isMarking: boolean;
  markError: string | null;
  canPersist: boolean;
  onClose: () => void;
  onOpenLesson: (lessonId: string) => void;
  prev: DomainLesson | null;
  next: DomainLesson | null;
}

/** Single lesson reader: material, worked example, exercise, knowledge check. */
const LessonView: React.FC<LessonViewProps> = ({
  lesson,
  courseTitle,
  isComplete,
  answerInput,
  onAnswerChange,
  feedback,
  onVerify,
  onMarkComplete,
  isMarking,
  markError,
  canPersist,
  onClose,
  onOpenLesson,
  prev,
  next,
}) => (
  <div className="space-y-6 rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
      <div className="min-w-0">
        <span className="rounded-md bg-teal-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-teal-700">
          {courseTitle} · {lesson.level} · {lesson.durationMinutes} mins
        </span>
        <h2 className="mt-2 text-xl font-bold text-slate-900">{lesson.title}</h2>
        {isComplete && (
          <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-teal-700">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Completed
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close lesson"
        className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>

    <div className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700">
      <p className="font-semibold text-slate-900">{lesson.summary}</p>

      <div className="mt-4 whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-4">
        <h4 className="mb-2 text-xs font-bold uppercase text-slate-500">Lesson material</h4>
        {lesson.body}
      </div>

      <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50 p-4">
        <h4 className="mb-2 text-xs font-bold uppercase text-teal-900">Key points</h4>
        <ul className="list-inside list-disc space-y-1 text-xs text-teal-950">
          {lesson.keyPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>

      {lesson.workedExample && (
        <div className="mt-4 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Worked example: {lesson.workedExample.title}
          </h4>
          <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-800">
            <span className="font-bold uppercase text-slate-500">Problem · </span>
            {lesson.workedExample.problem}
          </p>
          <div className="overflow-x-auto rounded-xl bg-slate-900 p-4 font-mono text-xs text-slate-100">
            <div className="mb-2 text-[10px] uppercase tracking-wider text-slate-400">Solution - every step shown</div>
            <pre className="whitespace-pre-wrap">{lesson.workedExample.solution}</pre>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50 p-4">
        <h4 className="mb-1 text-xs font-bold uppercase text-teal-900">Try it yourself</h4>
        <p className="text-xs text-teal-950">{lesson.exercise}</p>
        <p className="mt-2 text-[11px] italic text-teal-700">Hint: {lesson.hint}</p>
      </div>

      <div className="mt-6 space-y-3 border-t border-slate-100 pt-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Knowledge check</h4>
        <p className="text-xs font-medium text-slate-800">{lesson.check.question}</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={answerInput}
            onChange={(event) => onAnswerChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onVerify();
            }}
            placeholder="Type your answer..."
            aria-label="Knowledge check answer"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
          />
          <button
            type="button"
            onClick={onVerify}
            className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700"
          >
            Verify
          </button>
        </div>
        {feedback && (
          <div className={`rounded-lg p-3 text-xs font-medium ${feedback.correct ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'}`}>
            {feedback.message}
            {feedback.correct && (
              <p className="mt-1 text-[11px] text-emerald-800">{lesson.check.explanation}</p>
            )}
          </div>
        )}
        {markError && (
          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900" role="alert">
            {markError}
          </div>
        )}
      </div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
      {prev ? (
        <button
          type="button"
          onClick={() => onOpenLesson(prev.id)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          &larr; {prev.title}
        </button>
      ) : (
        <span />
      )}
      {canPersist && !isComplete && (
        <button
          type="button"
          onClick={onMarkComplete}
          disabled={isMarking}
          className="flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 disabled:opacity-60"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          {isMarking ? 'Saving…' : 'Mark as complete'}
        </button>
      )}
      {next ? (
        <button
          type="button"
          onClick={() => onOpenLesson(next.id)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          {next.title} &rarr;
        </button>
      ) : (
        <span />
      )}
    </div>
  </div>
);

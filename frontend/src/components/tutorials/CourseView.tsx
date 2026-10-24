import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  ExternalLink,
  FlaskConical,
  Layers3,
  Play,
} from 'lucide-react';
import type { TutorialCourse, TutorialProject } from '../../data/tutorials/types';
import { courseProgress, getTutorialCourse, isTutorialLessonComplete } from '../../data/tutorials/registry';

export interface CourseViewProps {
  course: TutorialCourse;
  completedLessonIds: string[];
  onOpenLesson: (lessonId: string) => void;
  onBackToCatalogue: () => void;
  onOpenChallenge: (challengeId: string) => void;
  onOpenCourse?: (courseId: string) => void;
}

const LEVEL_BADGE: Record<TutorialCourse['level'], string> = {
  beginner: 'bg-emerald-50 text-emerald-800',
  intermediate: 'bg-teal-50 text-teal-800',
  advanced: 'bg-amber-50 text-amber-800',
};

const ProjectCard: React.FC<{ project: TutorialProject; onOpenChallenge: (challengeId: string) => void }> = ({
  project,
  onOpenChallenge,
}) => {
  const challengeId = project.challengeId;
  return (
    <article className="surface-card p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-extrabold text-slate-900">{project.title}</h3>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${LEVEL_BADGE[project.level]}`}>
          {project.level}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{project.summary}</p>
      {project.useCase && (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          <strong className="text-slate-700">Use case:</strong> {project.useCase}
        </p>
      )}
      {project.learningOutcomes.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Learning outcomes</p>
          <ul className="mt-1 space-y-1">
            {project.learningOutcomes.map((outcome, outcomeIndex) => (
              <li key={`outcome-${outcomeIndex}`} className="flex items-start gap-2 text-xs leading-5 text-slate-600">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-700" aria-hidden="true" />
                <span>{outcome}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">
        {project.steps.length} steps
        {project.hardwareDependencies ? ` · hardware: ${project.hardwareDependencies}` : ' · software-only friendly'}
      </p>
      {challengeId && (
        <button
          type="button"
          onClick={() => onOpenChallenge(challengeId)}
          className="focus-ring mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-teal-300 bg-teal-50 px-3 text-xs font-bold text-teal-900 hover:bg-teal-100"
        >
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
          Open linked challenge
        </button>
      )}
    </article>
  );
};

export const CourseView: React.FC<CourseViewProps> = ({
  course,
  completedLessonIds,
  onOpenLesson,
  onBackToCatalogue,
  onOpenChallenge,
  onOpenCourse,
}) => {
  const firstIncompleteModuleId = useMemo(() => {
    for (const module of course.modules) {
      if (module.lessons.some((lesson) => !isTutorialLessonComplete(lesson.id, completedLessonIds))) {
        return module.id;
      }
    }
    return course.modules.length > 0 ? course.modules[0].id : null;
  }, [course, completedLessonIds]);

  const [expandedModuleIds, setExpandedModuleIds] = useState<Set<string>>(
    () => new Set(firstIncompleteModuleId ? [firstIncompleteModuleId] : []),
  );

  const progress = courseProgress(course, completedLessonIds);
  const isDraft = course.status === 'draft';

  const toggleModule = (moduleId: string): void => {
    setExpandedModuleIds((current) => {
      const next = new Set(current);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pb-10 pt-5 sm:px-6">
      <button
        type="button"
        onClick={onBackToCatalogue}
        className="focus-ring inline-flex min-h-[40px] items-center gap-2 rounded-lg text-sm font-bold text-teal-800 hover:text-teal-950"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All tutorials
      </button>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${LEVEL_BADGE[course.level]}`}>
            {course.level}
          </span>
          {isDraft && (
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
              Draft
            </span>
          )}
          {course.domains.map((domain) => (
            <span key={domain} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500">
              {domain}
            </span>
          ))}
        </div>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{course.title}</h1>
        <p className="mt-1 text-sm font-semibold text-teal-800">{course.tagline}</p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{course.description}</p>
      </header>

      {isDraft && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900" role="note">
          This course is a draft. Module structure and metadata are final, but lessons and projects are still being
          authored — progress bars will fill in as lessons are published.
        </p>
      )}

      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="surface-card p-4">
          <dt className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
            <Clock className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
            Estimated hours
          </dt>
          <dd className="mt-1 font-mono text-xl font-bold text-slate-900">~{course.estimatedHours} h</dd>
        </div>
        <div className="surface-card p-4">
          <dt className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
            <Layers3 className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
            Modules
          </dt>
          <dd className="mt-1 font-mono text-xl font-bold text-slate-900">{course.modules.length}</dd>
        </div>
        <div className="surface-card p-4">
          <dt className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
            <CheckCircle2 className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
            Your progress
          </dt>
          <dd className="mt-1 font-mono text-xl font-bold text-slate-900">{progress.percent}%</dd>
        </div>
      </dl>

      <div className="mt-4" aria-label="Course progress">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>
            {progress.completedLessons}/{progress.totalLessons} lessons complete
          </span>
          <span>{progress.percent}%</span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-enginx-primary transition-[width]" style={{ width: `${progress.percent}%` }} />
        </div>
      </div>

      {course.prerequisites.length > 0 && (
        <section className="mt-5" aria-label="Course prerequisites">
          <p className="eyebrow">Prerequisites</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {course.prerequisites.map((prerequisiteId) => {
              const prerequisiteCourse = getTutorialCourse(prerequisiteId);
              if (prerequisiteCourse && onOpenCourse) {
                return (
                  <button
                    key={prerequisiteId}
                    type="button"
                    onClick={() => onOpenCourse(prerequisiteId)}
                    className="focus-ring min-h-[36px] rounded-full border border-teal-200 bg-teal-50 px-3 text-xs font-bold text-teal-900 hover:bg-teal-100"
                    title={`Open ${prerequisiteCourse.title}`}
                  >
                    <BookOpen className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
                    {prerequisiteCourse.title}
                  </button>
                );
              }
              return (
                <span
                  key={prerequisiteId}
                  className="inline-flex min-h-[36px] items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-500"
                  title={prerequisiteCourse ? prerequisiteCourse.title : prerequisiteId}
                >
                  {prerequisiteCourse ? prerequisiteCourse.title : prerequisiteId}
                </span>
              );
            })}
          </div>
        </section>
      )}

      {course.skills.length > 0 && (
        <section className="mt-4" aria-label="Skills gained">
          <p className="eyebrow">Skills you will build</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {course.skills.map((skill) => (
              <span key={skill} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8" aria-label="Modules and lessons">
        <h2 className="text-lg font-extrabold text-slate-900">Modules</h2>
        {course.modules.length === 0 ? (
          <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Modules for this course are still being planned. Check back soon.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {course.modules.map((module, moduleIndex) => {
              const expanded = expandedModuleIds.has(module.id);
              const moduleCompleted = module.lessons.filter((lesson) =>
                isTutorialLessonComplete(lesson.id, completedLessonIds),
              ).length;
              return (
                <article key={module.id} className="surface-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleModule(module.id)}
                    aria-expanded={expanded}
                    className="focus-ring flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-extrabold text-slate-900">
                        {moduleIndex + 1}. {module.title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-600">{module.summary}</span>
                      <span className="mt-1 block text-[11px] font-semibold text-slate-400">
                        {module.lessons.length} lessons · {moduleCompleted} complete
                      </span>
                    </span>
                    <ChevronDown
                      className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                  {expanded && (
                    <div className="border-t border-slate-100 px-2 py-2">
                      {module.lessons.length === 0 ? (
                        <p className="px-2 py-2 text-xs text-slate-500">
                          Lessons for this module are being authored and will appear here.
                        </p>
                      ) : (
                        <ul className="space-y-1">
                          {module.lessons.map((lesson, lessonIndex) => {
                            const complete = isTutorialLessonComplete(lesson.id, completedLessonIds);
                            return (
                              <li key={lesson.id}>
                                <button
                                  type="button"
                                  onClick={() => onOpenLesson(lesson.id)}
                                  className="focus-ring flex min-h-[56px] w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-teal-50"
                                >
                                  {complete ? (
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-label="Lesson complete" />
                                  ) : (
                                    <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" aria-hidden="true" />
                                  )}
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-bold text-slate-900">
                                      {moduleIndex + 1}.{lessonIndex + 1} {lesson.title}
                                    </span>
                                    {lesson.summary && (
                                      <span className="mt-0.5 block truncate text-xs text-slate-500">{lesson.summary}</span>
                                    )}
                                  </span>
                                  {lesson.estimatedMinutes > 0 && (
                                    <span className="mt-0.5 shrink-0 text-[11px] font-semibold text-slate-400">
                                      ~{lesson.estimatedMinutes} min
                                    </span>
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-8" aria-label="Projects">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
          <FlaskConical className="h-5 w-5 text-teal-700" aria-hidden="true" />
          Projects
        </h2>
        {course.projects.length === 0 ? (
          <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Guided projects for this course are still being designed. They will appear here with requirements,
            starter code and a test plan.
          </p>
        ) : (
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {course.projects.map((project) => (
              <ProjectCard key={project.id} project={project} onOpenChallenge={onOpenChallenge} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8" aria-label="Resources">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
          <ExternalLink className="h-5 w-5 text-teal-700" aria-hidden="true" />
          Resources
        </h2>
        {course.resources.length === 0 ? (
          <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Curated references for this course are being reviewed before publication.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {course.resources.map((resource) => (
              <li key={resource.url}>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring inline-flex min-h-[40px] items-center gap-2 rounded-lg text-sm font-semibold text-teal-800 hover:text-teal-950 hover:underline"
                >
                  {resource.label}
                  {resource.kind && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                      {resource.kind}
                    </span>
                  )}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

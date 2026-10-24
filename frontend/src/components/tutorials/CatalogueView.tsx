import React, { useMemo, useState } from 'react';
import { BookOpen, CircleAlert, Clock, Layers3, Search, X } from 'lucide-react';
import type { TutorialCourse } from '../../data/tutorials/types';
import { courseProgress } from '../../data/tutorials/registry';

export interface CatalogueViewProps {
  courses: TutorialCourse[];
  branchLabel: string;
  completedLessonIds: string[];
  onOpenCourse: (courseId: string) => void;
}

const LEVEL_BADGE: Record<TutorialCourse['level'], string> = {
  beginner: 'bg-emerald-50 text-emerald-800',
  intermediate: 'bg-teal-50 text-teal-800',
  advanced: 'bg-amber-50 text-amber-800',
};

const LEVEL_FILTERS: Array<'all' | TutorialCourse['level']> = ['all', 'beginner', 'intermediate', 'advanced'];

export const CatalogueView: React.FC<CatalogueViewProps> = ({ courses, branchLabel, completedLessonIds, onOpenCourse }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | TutorialCourse['level']>('all');
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const course of courses) {
      for (const tag of course.trackTags) tags.add(tag);
    }
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return courses.filter((course) => {
      if (levelFilter !== 'all' && course.level !== levelFilter) return false;
      if (activeTags.length > 0 && !activeTags.some((tag) => course.trackTags.includes(tag))) return false;
      if (!query) return true;
      const haystack = [course.title, course.tagline, ...course.skills].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [courses, searchQuery, levelFilter, activeTags]);

  const toggleTag = (tag: string): void => {
    setActiveTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-5 sm:px-6">
      <header>
        <p className="eyebrow">EnginX workspace · Engineering tutorials</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Structured engineering courses
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Assessment-gated lessons with durable completion records, guided practice and projects. Showing tutorials for
          your branch: <strong className="font-bold text-slate-800">{branchLabel}</strong>. Change your branch in the
          header selector to see other disciplines.
        </p>
      </header>

      <div className="mt-5 space-y-3">
        <label className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-teal-400">
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="sr-only">Search tutorials</span>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="Search by title, tagline or skill…"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="focus-ring rounded p-1 text-slate-400 hover:text-slate-700"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </label>

        <div className="flex flex-wrap items-center gap-2" aria-label="Difficulty filter">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Level</span>
          {LEVEL_FILTERS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setLevelFilter(level)}
              aria-pressed={levelFilter === level}
              className={`focus-ring min-h-[36px] rounded-full border px-3 text-xs font-semibold capitalize transition-colors ${
                levelFilter === level
                  ? 'border-teal-300 bg-teal-50 text-teal-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200'
              }`}
            >
              {level === 'all' ? 'All levels' : level}
            </button>
          ))}
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" aria-label="Track filter">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Tracks</span>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                aria-pressed={activeTags.includes(tag)}
                className={`focus-ring min-h-[36px] rounded-full border px-3 text-xs font-semibold transition-colors ${
                  activeTags.includes(tag)
                    ? 'border-teal-300 bg-teal-50 text-teal-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredCourses.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center" role="status">
          <CircleAlert className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm font-bold text-slate-800">No tutorials match your filters</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {courses.length === 0
              ? 'No courses are published for your branch yet — new tracks are being authored.'
              : 'Try clearing the search box or removing a track or level filter.'}
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {filteredCourses.map((course) => {
            const progress = courseProgress(course, completedLessonIds);
            return (
              <li key={course.id}>
                <article className="surface-card flex h-full flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${LEVEL_BADGE[course.level]}`}>
                      {course.level}
                    </span>
                    {course.status === 'draft' && (
                      <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                        Draft
                      </span>
                    )}
                    {course.domains.map((domain) => (
                      <span key={domain} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">
                        {domain}
                      </span>
                    ))}
                  </div>
                  <h2 className="mt-3 text-base font-extrabold text-slate-900">{course.title}</h2>
                  <p className="mt-1 text-sm text-teal-800">{course.tagline}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />~{course.estimatedHours} h
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
                      {course.modules.length} modules
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      {progress.completedLessons}/{progress.totalLessons} lessons
                    </span>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                    <div className="h-full rounded-full bg-enginx-primary" style={{ width: `${progress.percent}%` }} />
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenCourse(course.id)}
                    className="focus-ring mt-4 flex min-h-[44px] w-full items-center justify-center rounded-lg bg-enginx-primary px-4 text-sm font-bold text-white hover:bg-teal-700"
                  >
                    {progress.totalLessons > 0 && progress.completedLessons > 0 ? 'Continue course' : 'Open course'}
                  </button>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

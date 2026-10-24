import { afterEach, describe, expect, it } from 'vitest';
import { GOLDEN_LESSON } from './_example/goldenLesson';
import {
  courseProgress,
  coursesForBranch,
  findLesson,
  getTutorialCourse,
  isTutorialLessonComplete,
  lessonNeighbor,
  TUTORIAL_COMPLETION_PREFIX,
  TUTORIAL_COURSES,
} from './registry';
import type { TutorialCourse } from './types';

const FIXTURE_COURSE_ID = 'registry-test-course';

function courseWithGoldenLesson(): TutorialCourse {
  return {
    id: FIXTURE_COURSE_ID,
    title: 'Registry fixture course',
    tagline: 'Injected test fixture',
    description: 'A minimal course injected by the registry tests. Never part of the real catalogue.',
    level: 'beginner',
    status: 'draft',
    domains: ['ALL'],
    trackTags: ['Test'],
    estimatedHours: 1,
    prerequisites: [],
    skills: [],
    modules: [
      { id: 'm01', title: 'Module one', summary: 'Holds the golden lesson.', lessons: [GOLDEN_LESSON] },
      {
        id: 'm02',
        title: 'Module two',
        summary: 'Holds a second lesson so prev/next can be exercised.',
        lessons: [{ ...GOLDEN_LESSON, id: 'fixture-second-lesson', title: 'Second fixture lesson' }],
      },
    ],
    projects: [],
    resources: [],
  };
}

describe('tutorial registry', () => {
  afterEach(() => {
    const injected = TUTORIAL_COURSES.findIndex((course) => course.id === FIXTURE_COURSE_ID);
    if (injected >= 0) TUTORIAL_COURSES.splice(injected, 1);
  });

  it('exposes the fifteen course skeletons in the agreed order', () => {
    expect(TUTORIAL_COURSES.map((course) => course.id)).toEqual([
      'digital-electronics',
      'c-programming',
      'verilog-hdl',
      'rtl-design',
      'embedded-c',
      'systemverilog',
      'fpga-design',
      'vlsi-design',
      'static-timing-analysis',
      'digital-verification',
      'computer-architecture',
      'microcontrollers',
      'dsp-fundamentals',
      'pcb-fundamentals',
      'communication-systems',
    ]);

    const seenIds = new Set<string>();
    for (const course of TUTORIAL_COURSES) {
      expect(seenIds.has(course.id)).toBe(false);
      seenIds.add(course.id);
      expect(course.status).toBe('draft');
      expect(course.domains.length).toBeGreaterThan(0);
      expect(course.modules.length).toBeGreaterThan(0);
      for (const module of course.modules) {
        expect(module.lessons).toEqual([]);
      }
    }
  });

  it('resolves courses by id and filters safely by branch', () => {
    expect(getTutorialCourse('verilog-hdl')?.title).toContain('Verilog');
    expect(getTutorialCourse('not-a-course')).toBeUndefined();

    expect(coursesForBranch('ECE')).toHaveLength(15);
    expect(coursesForBranch('ALL')).toHaveLength(15);
    expect(coursesForBranch('CSE').map((course) => course.id)).toEqual(['computer-architecture']);
    expect(coursesForBranch('ROBOTICS')).toEqual([]);
    // Empty input is empty-safe: it normalizes to the platform default (ECE).
    expect(coursesForBranch('')).toHaveLength(15);
  });

  it('uses a stable tutorial completion prefix', () => {
    expect(TUTORIAL_COMPLETION_PREFIX).toBe('tutorial-');
  });

  it('finds injected lessons with module and lesson indexes', () => {
    TUTORIAL_COURSES.push(courseWithGoldenLesson());

    const location = findLesson(FIXTURE_COURSE_ID, GOLDEN_LESSON.id);
    expect(location).toBeDefined();
    expect(location?.course.id).toBe(FIXTURE_COURSE_ID);
    expect(location?.module.id).toBe('m01');
    expect(location?.lesson.id).toBe(GOLDEN_LESSON.id);
    expect(location?.moduleIndex).toBe(0);
    expect(location?.lessonIndex).toBe(0);

    const secondLocation = findLesson(FIXTURE_COURSE_ID, 'fixture-second-lesson');
    expect(secondLocation?.moduleIndex).toBe(1);
    expect(secondLocation?.lessonIndex).toBe(0);

    expect(findLesson(FIXTURE_COURSE_ID, 'missing-lesson')).toBeUndefined();
    expect(findLesson('missing-course', GOLDEN_LESSON.id)).toBeUndefined();
  });

  it('returns neighbors across module boundaries and nulls for unknown ids', () => {
    TUTORIAL_COURSES.push(courseWithGoldenLesson());

    const goldenNeighbors = lessonNeighbor(FIXTURE_COURSE_ID, GOLDEN_LESSON.id);
    expect(goldenNeighbors.prev).toBeNull();
    expect(goldenNeighbors.next?.id).toBe('fixture-second-lesson');

    const secondNeighbors = lessonNeighbor(FIXTURE_COURSE_ID, 'fixture-second-lesson');
    expect(secondNeighbors.prev?.id).toBe(GOLDEN_LESSON.id);
    expect(secondNeighbors.next).toBeNull();

    expect(lessonNeighbor('missing-course', GOLDEN_LESSON.id)).toEqual({ prev: null, next: null });
    expect(lessonNeighbor(FIXTURE_COURSE_ID, 'missing-lesson')).toEqual({ prev: null, next: null });
  });

  it('computes progress and completion from prefixed lesson ids', () => {
    TUTORIAL_COURSES.push(courseWithGoldenLesson());

    expect(courseProgress(getTutorialCourse(FIXTURE_COURSE_ID)!, [])).toEqual({
      completedLessons: 0,
      totalLessons: 2,
      percent: 0,
    });

    const halfDone = courseProgress(getTutorialCourse(FIXTURE_COURSE_ID)!, [
      `${TUTORIAL_COMPLETION_PREFIX}fixture-second-lesson`,
    ]);
    expect(halfDone).toEqual({ completedLessons: 1, totalLessons: 2, percent: 50 });

    const allDone = courseProgress(getTutorialCourse(FIXTURE_COURSE_ID)!, [
      `${TUTORIAL_COMPLETION_PREFIX}${GOLDEN_LESSON.id}`,
      `${TUTORIAL_COMPLETION_PREFIX}fixture-second-lesson`,
      'unrelated-completion-id',
    ]);
    expect(allDone).toEqual({ completedLessons: 2, totalLessons: 2, percent: 100 });

    // An empty course must report 0 percent, never NaN.
    const emptyCourse: TutorialCourse = { ...courseWithGoldenLesson(), modules: [] };
    expect(courseProgress(emptyCourse, [])).toEqual({ completedLessons: 0, totalLessons: 0, percent: 0 });

    expect(isTutorialLessonComplete(GOLDEN_LESSON.id, [`${TUTORIAL_COMPLETION_PREFIX}${GOLDEN_LESSON.id}`])).toBe(true);
    expect(isTutorialLessonComplete(GOLDEN_LESSON.id, [])).toBe(false);
    expect(isTutorialLessonComplete(GOLDEN_LESSON.id, [GOLDEN_LESSON.id])).toBe(false);
  });
});

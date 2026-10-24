import type { TutorialCourse, TutorialLesson, TutorialModule } from './types';
import { normalizeBranch, type EngineeringBranch } from '../challengeFilters';
import { course as communicationSystems } from './communication-systems';
import { course as computerArchitecture } from './computer-architecture';
import { course as cProgramming } from './c-programming';
import { course as digitalElectronics } from './digital-electronics';
import { course as digitalVerification } from './digital-verification';
import { course as dspFundamentals } from './dsp-fundamentals';
import { course as embeddedC } from './embedded-c';
import { course as fpgaDesign } from './fpga-design';
import { course as microcontrollers } from './microcontrollers';
import { course as pcbFundamentals } from './pcb-fundamentals';
import { course as rtlDesign } from './rtl-design';
import { course as staticTimingAnalysis } from './static-timing-analysis';
import { course as systemverilog } from './systemverilog';
import { course as verilogHdl } from './verilog-hdl';
import { course as vlsiDesign } from './vlsi-design';

/** Every tutorial lesson completion is stored as `tutorial-` + lesson.id so
 * tutorial progress keys stay stable and never collide with other lesson
 * namespaces (for example the ECE hub's `lesson-content-` prefix). */
export const TUTORIAL_COMPLETION_PREFIX = 'tutorial-';

/**
 * The catalogue order is part of the product contract: foundation courses
 * first, then the HDL/VLSI specializations, then the standalone tracks.
 */
export const TUTORIAL_COURSES: TutorialCourse[] = [
  digitalElectronics,
  cProgramming,
  verilogHdl,
  rtlDesign,
  embeddedC,
  systemverilog,
  fpgaDesign,
  vlsiDesign,
  staticTimingAnalysis,
  digitalVerification,
  computerArchitecture,
  microcontrollers,
  dspFundamentals,
  pcbFundamentals,
  communicationSystems,
];

export function getTutorialCourse(courseId: string): TutorialCourse | undefined {
  return TUTORIAL_COURSES.find((course) => course.id === courseId);
}

/**
 * Branch-aware catalogue visibility. A course is shown when it declares the
 * normalized branch (or the wildcard 'ALL') in its `domains` list, or when the
 * learner is on the 'ALL' branch. Unknown or empty input normalizes through
 * `normalizeBranch`, so this helper never throws and never returns null.
 */
export function coursesForBranch(branch: string): TutorialCourse[] {
  const normalized: EngineeringBranch = normalizeBranch(branch);
  return TUTORIAL_COURSES.filter((course) => {
    if (course.domains.includes('ALL')) return true;
    if (normalized === 'ALL') return true;
    return course.domains.includes(normalized);
  });
}

export interface TutorialLessonLocation {
  course: TutorialCourse;
  module: TutorialModule;
  lesson: TutorialLesson;
  moduleIndex: number;
  lessonIndex: number;
}

export function findLesson(courseId: string, lessonId: string): TutorialLessonLocation | undefined {
  const course = getTutorialCourse(courseId);
  if (!course) return undefined;
  for (let moduleIndex = 0; moduleIndex < course.modules.length; moduleIndex += 1) {
    const module: TutorialModule = course.modules[moduleIndex];
    const lessonIndex = module.lessons.findIndex((lesson) => lesson.id === lessonId);
    if (lessonIndex >= 0) {
      return { course, module, lesson: module.lessons[lessonIndex], moduleIndex, lessonIndex };
    }
  }
  return undefined;
}

export function lessonNeighbor(courseId: string, lessonId: string): { prev: TutorialLesson | null; next: TutorialLesson | null } {
  const course = getTutorialCourse(courseId);
  if (!course) return { prev: null, next: null };
  const flatLessons: TutorialLesson[] = [];
  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      flatLessons.push(lesson);
    }
  }
  const index = flatLessons.findIndex((lesson) => lesson.id === lessonId);
  if (index < 0) return { prev: null, next: null };
  return {
    prev: index > 0 ? flatLessons[index - 1] : null,
    next: index < flatLessons.length - 1 ? flatLessons[index + 1] : null,
  };
}

export function isTutorialLessonComplete(lessonId: string, completedLessonIds: string[]): boolean {
  return completedLessonIds.includes(TUTORIAL_COMPLETION_PREFIX + lessonId);
}

export function courseProgress(
  course: TutorialCourse,
  completedLessonIds: string[],
): { completedLessons: number; totalLessons: number; percent: number } {
  let totalLessons = 0;
  let completedLessons = 0;
  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      totalLessons += 1;
      if (completedLessonIds.includes(TUTORIAL_COMPLETION_PREFIX + lesson.id)) {
        completedLessons += 1;
      }
    }
  }
  const percent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
  return { completedLessons, totalLessons, percent };
}

import React, { useMemo, useState } from 'react';
import type { User } from '../../types';
import { BRANCH_LABELS, normalizeBranch } from '../../data/challengeFilters';
import {
  coursesForBranch,
  findLesson,
  getTutorialCourse,
  isTutorialLessonComplete,
  lessonNeighbor,
  TUTORIAL_COMPLETION_PREFIX,
} from '../../data/tutorials/registry';
import { CatalogueView } from './CatalogueView';
import { CourseView } from './CourseView';
import { LessonView } from './LessonView';

export interface TutorialHubProps {
  user: User | null;
  completedLessonIds: string[];
  onCompleteLesson?: (lessonId: string) => Promise<void>;
  onOpenChallenge?: (challengeId: string) => void;
}

type TutorialView =
  | { kind: 'catalogue' }
  | { kind: 'course'; courseId: string }
  | { kind: 'lesson'; courseId: string; lessonId: string };

/**
 * Root surface for the Engineering Tutorials section inside the ECE Hub.
 * Owns only the catalogue -> course -> lesson navigation state; lesson
 * completion flows through the existing backend lesson-completion callback
 * using the stable `tutorial-` prefix, and challenge links are delegated to
 * the platform challenge workspace.
 */
export const TutorialHub: React.FC<TutorialHubProps> = ({
  user,
  completedLessonIds,
  onCompleteLesson,
  onOpenChallenge,
}) => {
  const [view, setView] = useState<TutorialView>({ kind: 'catalogue' });

  const branchSignal = user?.branch || user?.primary_role || '';
  const branch = useMemo(() => normalizeBranch(branchSignal), [branchSignal]);
  const branchLabel = BRANCH_LABELS[branch];
  const courses = useMemo(() => coursesForBranch(branchSignal), [branchSignal]);

  const markComplete = (lessonId: string): void => {
    if (!onCompleteLesson) return;
    void onCompleteLesson(TUTORIAL_COMPLETION_PREFIX + lessonId);
  };

  const catalogue = (
    <CatalogueView
      courses={courses}
      branchLabel={branchLabel}
      completedLessonIds={completedLessonIds}
      onOpenCourse={(courseId) => setView({ kind: 'course', courseId })}
    />
  );

  if (view.kind === 'lesson') {
    const location = findLesson(view.courseId, view.lessonId);
    if (location) {
      const neighbors = lessonNeighbor(view.courseId, view.lessonId);
      return (
        <LessonView
          // Remount per lesson so in-memory quiz state resets when navigating.
          key={location.lesson.id}
          course={location.course}
          module={location.module}
          lesson={location.lesson}
          prev={neighbors.prev}
          next={neighbors.next}
          isComplete={isTutorialLessonComplete(location.lesson.id, completedLessonIds)}
          onComplete={() => markComplete(location.lesson.id)}
          onBackToCourse={() => setView({ kind: 'course', courseId: view.courseId })}
          onOpenChallenge={(challengeId) => onOpenChallenge?.(challengeId)}
          onNavigateLesson={(lessonId) => setView({ kind: 'lesson', courseId: view.courseId, lessonId })}
        />
      );
    }
    // Unknown lesson id: degrade to the course when it exists, else catalogue.
    const fallbackCourse = getTutorialCourse(view.courseId);
    if (fallbackCourse && courses.includes(fallbackCourse)) {
      return (
        <CourseView
          course={fallbackCourse}
          completedLessonIds={completedLessonIds}
          onOpenLesson={(lessonId) => setView({ kind: 'lesson', courseId: view.courseId, lessonId })}
          onBackToCatalogue={() => setView({ kind: 'catalogue' })}
          onOpenChallenge={(challengeId) => onOpenChallenge?.(challengeId)}
          onOpenCourse={(courseId) => setView({ kind: 'course', courseId })}
        />
      );
    }
    return catalogue;
  }

  if (view.kind === 'course') {
    const course = getTutorialCourse(view.courseId);
    if (course && courses.includes(course)) {
      return (
        <CourseView
          course={course}
          completedLessonIds={completedLessonIds}
          onOpenLesson={(lessonId) => setView({ kind: 'lesson', courseId: view.courseId, lessonId })}
          onBackToCatalogue={() => setView({ kind: 'catalogue' })}
          onOpenChallenge={(challengeId) => onOpenChallenge?.(challengeId)}
          onOpenCourse={(courseId) => setView({ kind: 'course', courseId })}
        />
      );
    }
    // Unknown or branch-hidden course id: never blank, fall back to catalogue.
    return catalogue;
  }

  return catalogue;
};

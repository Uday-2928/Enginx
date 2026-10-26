/**
 * Shared content types for the multi-domain learning layer.
 *
 * Every hub rendered under the Domains tab is driven by the same bundle shape
 * defined here, so adding a branch later means writing a data file - not a new
 * lesson viewer.  The lesson shape intentionally mirrors the Cyber Hub's local
 * curriculum (summary / body / key points / worked example / knowledge check)
 * because that is the reading rhythm learners already know.
 */

export type DomainLevel = 'Foundation' | 'Intermediate' | 'Advanced';

/** A single self-contained lesson inside a domain course. */
export interface DomainLesson {
  id: string;
  title: string;
  durationMinutes: number;
  level: DomainLevel;
  summary: string;
  body: string;
  keyPoints: string[];
  /** Optional numeric worked example with the full arithmetic shown. */
  workedExample?: {
    title: string;
    problem: string;
    solution: string;
  };
  exercise: string;
  hint: string;
  check: {
    question: string;
    answer: string;
    explanation: string;
  };
}

/** An ordered learning path (course) inside a domain. */
export interface DomainCourse {
  id: string;
  title: string;
  eyebrow: string;
  level: DomainLevel;
  estimatedHours: number;
  summary: string;
  topics: string[];
  outcomes: string[];
  lessons: DomainLesson[];
}

/** Job-oriented pathway attached to a domain. */
export interface DomainCareerPath {
  id: string;
  title: string;
  summary: string;
  skills: string[];
  tools: string[];
  projects: string[];
  interviewFocus: string[];
}

/** Curated external reference; only official primary sources belong here. */
export interface DomainResource {
  provider: string;
  title: string;
  url: string;
  note: string;
}

/** Everything a domain hub needs beyond its registry metadata. */
export interface DomainContentBundle {
  courses: DomainCourse[];
  careerPaths: DomainCareerPath[];
  resources: DomainResource[];
}

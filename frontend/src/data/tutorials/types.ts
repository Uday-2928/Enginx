export type TutorialLevel = 'beginner' | 'intermediate' | 'advanced';
export type PublicationStatus = 'published' | 'draft';
export type TutorialCodeLanguage = 'verilog' | 'systemverilog' | 'c' | 'cpp' | 'octave' | 'text';
export type TutorialDiagramKind = 'ascii' | 'waveform' | 'state' | 'block';

export interface TutorialResource {
  label: string;
  url: string;
  kind?: 'docs' | 'standard' | 'tool' | 'article';
}

export interface TutorialCodeSample {
  title: string;
  language: TutorialCodeLanguage;
  code: string;
  explanation?: string[];
}

export interface TutorialTable {
  caption?: string;
  headers: string[];
  rows: string[][];
}

export interface TutorialDiagram {
  kind: TutorialDiagramKind;
  title: string;
  content: string;
  caption?: string;
}

export type TutorialQuestionKind =
  | 'multiple-choice'
  | 'true-false'
  | 'output-prediction'
  | 'bug-identification'
  | 'code-completion'
  | 'short-answer';

export interface TutorialQuestion {
  id: string;
  kind: TutorialQuestionKind;
  prompt: string;
  code?: string;
  options?: string[];
  answer: string;
  explanation: string;
  hint?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface TutorialAssessment {
  title: string;
  passScore: number; // 0..100
  questions: TutorialQuestion[];
}

export interface TutorialExercise {
  title: string;
  brief: string;
  starterCode?: string;
  expectedBehavior: string;
  hints: string[];
  challengeId?: string;
}

export interface TutorialLesson {
  id: string;
  title: string;
  summary: string;
  objectives: string[];
  whyItMatters: string;
  prerequisites: string[];
  explanation: string;
  deepDive: string;
  examples: TutorialCodeSample[];
  diagrams?: TutorialDiagram[];
  tables?: TutorialTable[];
  commonMistakes: { mistake: string; fix: string }[];
  guidedPractice: TutorialExercise;
  practiceExercises: TutorialExercise[];
  assessment: TutorialAssessment;
  keyTerms: { term: string; definition: string }[];
  revisionSummary: string[];
  furtherReading: TutorialResource[];
  estimatedMinutes: number;
}

export interface TutorialModule {
  id: string;
  title: string;
  summary: string;
  lessons: TutorialLesson[];
}

export interface TutorialProjectStep {
  title: string;
  detail: string;
  code?: string;
}

export interface TutorialProject {
  id: string;
  title: string;
  level: TutorialLevel;
  summary: string;
  useCase: string;
  requirements: string[];
  learningOutcomes: string[];
  prerequisites: string[];
  architecture: string;
  steps: TutorialProjectStep[];
  starterCode?: TutorialCodeSample;
  testPlan: string[];
  expectedResults: string;
  troubleshooting: Array<string | { title: string; detail: string }>;
  hardwareDependencies?: string;
  challengeId?: string;
  synthesisConsiderations?: string;
}

export interface TutorialCourse {
  id: string;
  title: string;
  tagline: string;
  description: string;
  level: TutorialLevel;
  status: PublicationStatus;
  domains: string[];
  trackTags: string[];
  estimatedHours: number;
  prerequisites: string[];
  skills: string[];
  modules: TutorialModule[];
  projects: TutorialProject[];
  resources: TutorialResource[];
}

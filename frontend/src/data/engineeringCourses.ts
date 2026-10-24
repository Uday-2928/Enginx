export type EngineeringDomain =
  | 'vlsi'
  | 'embedded'
  | 'digital'
  | 'analog'
  | 'signals'
  | 'communications'
  | 'control'
  | 'rf'
  | 'pcb'
  | 'instrumentation'
  | 'semiconductor'
  | 'verification'
  | 'fpga'
  | 'dsp'
  | 'electromagnetics'
  | 'antennas'
  | 'iot'
  | 'interview';

export type DifficultyLevel = 'Foundation' | 'Intermediate' | 'Advanced';
export type CourseStatus = 'not-started' | 'in-progress' | 'completed' | 'locked';
export type LessonStatus = 'not-started' | 'in-progress' | 'completed' | 'skipped';
export type AssessmentType = 'quiz' | 'coding' | 'design' | 'simulation' | 'written';
export type ProjectType = 'rtl' | 'firmware' | 'simulation' | 'analysis' | 'hardware' | 'research';

export interface CoursePrerequisite {
  courseId: string;
  title: string;
  required: boolean;
  minScore?: number;
}

export interface CourseProgress {
  courseId: string;
  status: CourseStatus;
  startedAt?: string;
  completedAt?: string;
  overallProgress: number;
  moduleProgress: ModuleProgress[];
  timeSpentMinutes: number;
  lastAccessedAt?: string;
}

export interface ModuleProgress {
  moduleId: string;
  status: CourseStatus;
  lessonProgress: LessonProgress[];
  completedLessons: number;
  totalLessons: number;
}

export interface LessonProgress {
  lessonId: string;
  status: LessonStatus;
  startedAt?: string;
  completedAt?: string;
  timeSpentMinutes: number;
  assessmentScore?: number;
  attempts: number;
}

export interface Assessment {
  id: string;
  lessonId: string;
  type: AssessmentType;
  title: string;
  description: string;
  questions: AssessmentQuestion[];
  passingScore: number;
  timeLimitMinutes?: number;
  maxAttempts: number;
  weight: number;
}

export interface AssessmentQuestion {
  id: string;
  type: 'multiple-choice' | 'code' | 'numeric' | 'text' | 'circuit';
  prompt: string;
  options?: string[];
  correctAnswer: string | number | boolean;
  explanation: string;
  points: number;
  difficulty: DifficultyLevel;
  tags: string[];
}

export interface Project {
  id: string;
  courseId: string;
  moduleId?: string;
  title: string;
  description: string;
  type: ProjectType;
  difficulty: DifficultyLevel;
  estimatedHours: number;
  prerequisites: string[];
  deliverables: ProjectDeliverable[];
  rubric: ProjectRubricItem[];
  hardwareRequired: boolean;
  hardwareAlternatives: string[];
  evaluator: 'backend' | 'manual' | 'peer' | 'unavailable';
  tags: string[];
}

export interface ProjectDeliverable {
  id: string;
  title: string;
  description: string;
  required: boolean;
  fileTypes?: string[];
  maxSizeMB?: number;
}

export interface ProjectRubricItem {
  id: string;
  criterion: string;
  description: string;
  maxPoints: number;
  weight: number;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  summary: string;
  objectives: string[];
  content: LessonContent;
  estimatedMinutes: number;
  difficulty: DifficultyLevel;
  prerequisites: string[];
  assessmentId?: string;
  challengeId?: string;
  nextLessonId?: string;
  tags: string[];
  resources: LessonResource[];
}

export interface LessonContent {
  explanation: string;
  workedExamples: WorkedExample[];
  exercises: Exercise[];
  keyTakeaways: string[];
  commonMistakes: string[];
}

export interface WorkedExample {
  title: string;
  description: string;
  code: string;
  language: string;
  explanation: string;
}

export interface Exercise {
  id: string;
  prompt: string;
  hints: string[];
  solution: string;
  difficulty: DifficultyLevel;
  estimatedMinutes: number;
}

export interface LessonResource {
  title: string;
  type: 'documentation' | 'video' | 'article' | 'tool' | 'reference';
  url: string;
  description: string;
}

export interface Module {
  id: string;
  courseId: string;
  phase: string;
  title: string;
  description: string;
  order: number;
  estimatedHours: number;
  prerequisites: string[];
  lessonIds: string[];
  assessmentId?: string;
  projectId?: string;
  evidence: string;
}

export interface Course {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  domain: EngineeringDomain;
  subdomain: string;
  difficulty: DifficultyLevel;
  estimatedHours: number;
  prerequisites: CoursePrerequisite[];
  learningOutcomes: string[];
  careerRelevance: string[];
  targetRoles: string[];
  phases: string[];
  modules: Module[];
  lessons: Lesson[];
  assessments: Assessment[];
  projects: Project[];
  tags: string[];
  version: string;
  lastUpdated: string;
  author: string;
  enrollmentCount: number;
  completionRate: number;
  averageRating: number;
}

export interface CourseCatalog {
  courses: Course[];
  domains: { id: EngineeringDomain; name: string; description: string }[];
  difficultyLevels: { value: DifficultyLevel; label: string; color: string }[];
  totalCourses: number;
  totalHours: number;
}

export interface UserCourseEnrollment {
  userId: string;
  courseId: string;
  enrolledAt: string;
  progress: CourseProgress;
  currentModuleId?: string;
  currentLessonId?: string;
  completedModules: string[];
  completedLessons: string[];
  completedAssessments: string[];
  completedProjects: string[];
  earnedBadges: string[];
  certificateId?: string;
}

export interface CourseRecommendation {
  courseId: string;
  reason: 'prerequisite' | 'career-goal' | 'interest-match' | 'skill-gap' | 'popular' | 'new';
  confidence: number;
  explanation: string;
}

export const ENGINEERING_DOMAINS: { id: EngineeringDomain; name: string; description: string; icon: string }[] = [
  { id: 'vlsi', name: 'VLSI Engineering', description: 'RTL design, verification, synthesis, and physical implementation', icon: 'chip' },
  { id: 'embedded', name: 'Embedded Systems', description: 'Bare-metal C, peripherals, protocols, and RTOS', icon: 'cpu' },
  { id: 'digital', name: 'Digital Electronics', description: 'Boolean logic, timing analysis, and state machines', icon: 'logic' },
  { id: 'analog', name: 'Analog Electronics', description: 'Devices, amplifiers, filters, and power circuits', icon: 'wave' },
  { id: 'signals', name: 'Signals & Systems', description: 'LTI systems, transforms, and sampling theory', icon: 'wave' },
  { id: 'communications', name: 'Communications', description: 'Modulation, BER analysis, and channel models', icon: 'radio' },
  { id: 'control', name: 'Control Systems', description: 'Stability, PID, state-space, and feedback design', icon: 'control' },
  { id: 'rf', name: 'RF & Microwave', description: 'Transmission lines, matching, and S-parameters', icon: 'antenna' },
  { id: 'pcb', name: 'PCB Design', description: 'Schematic, layout, DRC, and manufacturing', icon: 'board' },
  { id: 'instrumentation', name: 'Instrumentation', description: 'Sensors, signal conditioning, and acquisition', icon: 'sensor' },
  { id: 'semiconductor', name: 'Semiconductor Devices', description: 'PN junctions, MOSFETs, and CMOS foundations', icon: 'layers' },
  { id: 'verification', name: 'Design Verification', description: 'Testbenches, assertions, and coverage', icon: 'check' },
  { id: 'fpga', name: 'FPGA Development', description: 'Constraints, resources, and hardware flow', icon: 'board' },
  { id: 'dsp', name: 'Digital Signal Processing', description: 'DFT, FFT, filters, and fixed-point', icon: 'signal' },
  { id: 'electromagnetics', name: 'Electromagnetics', description: 'Fields, waves, and Maxwell equations', icon: 'field' },
  { id: 'antennas', name: 'Antennas & Propagation', description: 'Radiation, link budgets, and propagation', icon: 'antenna' },
  { id: 'iot', name: 'IoT & Connected Devices', description: 'Telemetry, identity, power, and recovery', icon: 'network' },
  { id: 'interview', name: 'Interview Preparation', description: 'Role-specific technical revision', icon: 'interview' },
];

export const DIFFICULTY_LEVELS: { value: DifficultyLevel; label: string; color: string; order: number }[] = [
  { value: 'Foundation', label: 'Foundation', color: '#10b981', order: 1 },
  { value: 'Intermediate', label: 'Intermediate', color: '#f59e0b', order: 2 },
  { value: 'Advanced', label: 'Advanced', color: '#ef4444', order: 3 },
];

export const ASSESSMENT_TYPES: { value: AssessmentType; label: string; description: string }[] = [
  { value: 'quiz', label: 'Quiz', description: 'Multiple choice and short answer questions' },
  { value: 'coding', label: 'Coding Challenge', description: 'Write and submit code for evaluation' },
  { value: 'design', label: 'Design Exercise', description: 'Create a design artifact or diagram' },
  { value: 'simulation', label: 'Simulation Task', description: 'Run and analyze simulation results' },
  { value: 'written', label: 'Written Response', description: 'Explain concepts or analyze a problem' },
];

export const PROJECT_TYPES: { value: ProjectType; label: string; description: string }[] = [
  { value: 'rtl', label: 'RTL Design', description: 'Synthesizable Verilog/SystemVerilog modules' },
  { value: 'firmware', label: 'Firmware', description: 'Embedded C/C++ for microcontrollers' },
  { value: 'simulation', label: 'Simulation', description: 'Testbenches and verification environments' },
  { value: 'analysis', label: 'Analysis', description: 'Signal processing, circuit, or system analysis' },
  { value: 'hardware', label: 'Hardware Build', description: 'PCB, FPGA, or physical prototype' },
  { value: 'research', label: 'Research', description: 'Literature review or novel investigation' },
];

export function getDomainInfo(domain: EngineeringDomain) {
  return ENGINEERING_DOMAINS.find(d => d.id === domain);
}

export function getDifficultyInfo(level: DifficultyLevel) {
  return DIFFICULTY_LEVELS.find(d => d.value === level);
}

export function getAssessmentTypeInfo(type: AssessmentType) {
  return ASSESSMENT_TYPES.find(a => a.value === type);
}

export function getProjectTypeInfo(type: ProjectType) {
  return PROJECT_TYPES.find(p => p.value === type);
}

export function calculateCourseProgress(enrollment: UserCourseEnrollment, course: Course): number {
  const totalLessons = course.lessons.length;
  if (totalLessons === 0) return 0;
  return Math.round((enrollment.completedLessons.length / totalLessons) * 100);
}

export function isCourseUnlocked(course: Course, completedCourseIds: string[]): boolean {
  return course.prerequisites.every(prereq => {
    if (!prereq.required) return true;
    return completedCourseIds.includes(prereq.courseId);
  });
}

export function getNextLesson(course: Course, enrollment: UserCourseEnrollment): Lesson | null {
  if (enrollment.currentLessonId) {
    const currentLesson = course.lessons.find(l => l.id === enrollment.currentLessonId);
    if (currentLesson && currentLesson.nextLessonId) {
      return course.lessons.find(l => l.id === currentLesson.nextLessonId) || null;
    }
  }

  for (const lesson of course.lessons) {
    if (!enrollment.completedLessons.includes(lesson.id)) {
      return lesson;
    }
  }
  return null;
}

export function getAvailableCourses(
  catalog: CourseCatalog,
  completedCourseIds: string[],
  userInterests?: EngineeringDomain[],
  targetRoles?: string[]
): Course[] {
  return catalog.courses
    .filter(course => isCourseUnlocked(course, completedCourseIds))
    .filter(course => {
      if (userInterests && userInterests.length > 0) {
        return userInterests.includes(course.domain);
      }
      return true;
    })
    .filter(course => {
      if (targetRoles && targetRoles.length > 0) {
        return course.targetRoles.some(role => targetRoles.includes(role));
      }
      return true;
    })
    .sort((a, b) => {
      const aDiff = DIFFICULTY_LEVELS.find(d => d.value === a.difficulty)?.order || 0;
      const bDiff = DIFFICULTY_LEVELS.find(d => d.value === b.difficulty)?.order || 0;
      return aDiff - bDiff;
    });
}
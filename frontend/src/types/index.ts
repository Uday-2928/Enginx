/** Shared API and UI types for EnginX. */

export type Discipline =
  | 'all'
  | 'cse'
  | 'ece-verilog'
  | 'ece-systemverilog'
  | 'ece-rtl'
  | 'ece-embedded'
  | 'ece-matlab'
  | 'ai-ml'
  | 'cybersecurity'
  | 'robotics'
  | 'hardware';

/** Focused ECE domains used by the challenge explorer without changing the
 * backend's existing aggregate `ece-matlab` discipline. */
export type EceSignalDomain = 'signals' | 'dsp' | 'communications';
export type ChallengeFilter = Discipline | `ece-${EceSignalDomain}`;

export type ChallengeExecutionStatus = 'verified' | 'unavailable' | 'unsupported' | 'not-run';
export type ChallengeRuntime = 'gnu-octave' | 'matlab' | 'browser-model';

/**
 * Runtime facts are part of the content record so the UI can distinguish a
 * MATLAB-compatible starter from an actually executable MATLAB/Octave run.
 */
export interface ChallengeExecutionMetadata {
  runtime: ChallengeRuntime;
  runtimeLabel: string;
  status: ChallengeExecutionStatus;
  availability: 'available' | 'unavailable' | 'partial';
  runtimeAvailable: boolean;
  requiredToolboxes: string[];
  toolboxAvailability: 'not-required' | 'available' | 'unavailable' | 'unknown';
  notes: string;
}

export type PrimaryRole = 'CSE' | 'ECE' | 'AI' | 'CYBER' | 'ROBOTICS' | 'HARDWARE';

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Extra Hard' | 'Insane';

export interface TestCase {
  id: string;
  input: unknown;
  expected: unknown;
  description?: string;
  entry_point?: string;
  hidden?: boolean;
}

export interface TestCaseResult {
  test_case_id: string;
  passed: boolean;
  input: unknown;
  expected: unknown;
  actual: unknown;
  execution_time_ms: number;
  message?: string;
  hidden?: boolean;
}

/** Fields returned by GET /api/challenges. */
export interface ChallengeSummary {
  id: string;
  slug: string;
  title: string;
  discipline: Discipline;
  signalDomain?: EceSignalDomain;
  difficulty: Difficulty;
  topic: string;
  language: string;
  xp_reward: number;
  tags: string[];
  order_index: number;
  execution?: ChallengeExecutionMetadata;
  starterVerified?: boolean;
}

/** Full challenge returned by GET /api/challenges/{id}. */
export interface ChallengeDetail extends ChallengeSummary {
  description: string;
  starter_code: string;
  test_cases: TestCase[];
  solution_hints: string[];
  time_limit_ms: number;
  memory_limit_mb: number;
}

/**
 * The existing editor consumes full challenge details.  The service layer
 * hydrates catalogue summaries with the local detail cache when possible so
 * this remains safe for the current component contract.
 */
export type Challenge = ChallengeDetail;

export interface ChallengeFilters {
  discipline?: ChallengeFilter | string;
  difficulty?: Difficulty | string;
  search?: string;
  q?: string;
}

// ---------------------------------------------------------------------------
// User, profile, and onboarding
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  name: string;
  primary_role: string;
  branch?: string | null;
  specialization?: string | null;
  degree?: string | null;
  year?: number | null;
  goal?: string | null;
  weekly_hours?: number | null;
  avatar_url?: string | null;
  xp: number;
  streak_days: number;
  created_at: string;
  ece_preferences?: EcePreferences | null;
}

export type EceLevel = 'new' | 'working' | 'confident';

/** Optional personalization data used by the ECE Engineering Hub. */
export interface EcePreferences {
  current_year: number | null;
  current_semester: number | null;
  electronics_level: EceLevel;
  c_programming_level: EceLevel;
  mathematics_level: EceLevel;
  digital_electronics_level: EceLevel;
  simulation_experience: EceLevel;
  weekly_hours: number | null;
  preferred_learning_mode: 'guided' | 'practice' | 'projects' | 'mixed';
  career_interests: string[];
  target_roles: string[];
  available_hardware: string[];
}

/** The first-party bearer session returned by the auth endpoints. */
export interface AuthSession {
  access_token: string;
  token_type: string;
  user: User;
}

/** POST /api/auth/login and POST /api/auth/signup response contract. */
export type AuthResponse = AuthSession;

export interface ProfileUpdate {
  name?: string;
  primary_role?: string;
  branch?: string | null;
  specialization?: string | null;
  degree?: string | null;
  year?: number | null;
  goal?: string | null;
  weekly_hours?: number | null;
  avatar_url?: string | null;
  ece_preferences?: EcePreferences | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** Fields sent to POST /api/auth/signup. */
export interface SignupRequest {
  email: string;
  name: string;
  password: string;
}

export interface OnboardingRequest {
  role: string;
  name?: string;
  branch?: string | null;
  specialization?: string | null;
  degree?: string | null;
  year?: number | null;
  goal?: string | null;
  weekly_hours?: number | null;
}

export interface OnboardingResponse {
  success: boolean;
  message: string;
  user: User;
}

// ---------------------------------------------------------------------------
// Progress, stats, and skill tree
// ---------------------------------------------------------------------------

export interface ChallengeProgress {
  completed: boolean;
  attempts: number;
  best_time_ms: number | null;
  xp_awarded: number;
}

export interface UserProgress {
  completed_challenges: string[];
  progress_map: Record<string, ChallengeProgress>;
}

export type ProgressResponse = UserProgress;

export interface DisciplineProgress {
  completed: number;
  total: number;
  percentage: number;
}

export interface UserStats {
  user_id: string;
  name: string;
  role: string;
  xp: number;
  streak_days: number;
  completed_count: number;
  total_challenges: number;
  discipline_breakdown: Record<string, DisciplineProgress>;
}

export type StatsResponse = UserStats;

export type SkillTreeNodeStatus = 'completed' | 'in_progress' | 'locked';

export interface SkillTreeNode {
  id: string;
  title: string;
  discipline: Discipline;
  topic: string;
  difficulty: Difficulty;
  xp: number;
  status: SkillTreeNodeStatus;
  order: number;
  x?: number;
  y?: number;
}

export interface SkillTreeLink {
  source: string;
  target: string;
  active: boolean;
}

export interface SkillTree {
  nodes: SkillTreeNode[];
  links: SkillTreeLink[];
}

export type SkillTreeResponse = SkillTree;

// ---------------------------------------------------------------------------
// Badges and leaderboard
// ---------------------------------------------------------------------------

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  discipline: Discipline;
  xp_bonus: number;
  earned: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  role: string;
  avatar_url?: string | null;
  xp: number;
  streak_days: number;
  completed_challenges: number;
  badges_count: number;
}

export type LeaderboardUser = LeaderboardEntry;

export type LeaderboardResponse = LeaderboardEntry[];

// ---------------------------------------------------------------------------
// Lessons and submissions
// ---------------------------------------------------------------------------

export interface LessonCompletionResponse {
  lesson_id: string;
  completed: boolean;
  completed_at: string;
  already_completed: boolean;
}

export interface CompletedLessonsResponse {
  lesson_ids: string[];
}

export interface SubmissionRequest {
  challenge_id: string;
  code: string;
  language: string;
}

export type SubmissionVerdict = 'AC' | 'WA' | 'TLE' | 'CE' | 'RE' | 'UNAVAILABLE' | 'RETRY';

export type SubmissionStatus = 'evaluated' | 'unavailable';

export interface SubmissionResult {
  id: string;
  challenge_id: string;
  language: string;
  verdict: SubmissionVerdict;
  status: SubmissionStatus;
  retryable: boolean;
  execution_time_ms: number;
  memory_used_kb: number;
  output?: string | null;
  test_results: TestCaseResult[];
  xp_awarded: number;
  new_badges: string[];
  created_at: string;
}

export interface SubmissionHistoryItem {
  id: string;
  challenge_id: string;
  language: string;
  verdict: string;
  status: SubmissionStatus;
  retryable: boolean;
  execution_time_ms: number;
  memory_used_kb: number;
  output?: string | null;
  test_results: TestCaseResult[];
  created_at: string;
}

export interface SubmissionHistoryResponse {
  items: SubmissionHistoryItem[];
}

// ---------------------------------------------------------------------------
// Virtual Hardware Lab projects
// ---------------------------------------------------------------------------

export interface VirtualHardwareProjectSummary {
  id: string;
  title: string;
  description: string;
  board_profile: string;
  project_version: number;
  created_at: string;
  updated_at: string;
}

export interface VirtualHardwareProject extends VirtualHardwareProjectSummary {
  graph: Record<string, unknown>;
  code: string;
  guided_step: string;
  completed_steps: string[];
  simulation_config: Record<string, unknown>;
}

export interface VirtualHardwareProjectListResponse {
  items: VirtualHardwareProjectSummary[];
}

export interface VirtualHardwareProjectInput {
  title: string;
  description?: string;
  board_profile: string;
  project_version?: number;
  graph: Record<string, unknown>;
  code: string;
  guided_step?: string;
  completed_steps?: string[];
  simulation_config?: Record<string, unknown>;
}

export interface MatlabScriptExecutionResult {
  verdict: string;
  status: string;
  mode: 'script' | string;
  runtime: string;
  runtime_version?: string | null;
  total_time_ms: number;
  stdout: string;
  stderr: string;
  output: string;
  warnings: string[];
  artifacts: Array<{ kind?: string; filename?: string; mime_type?: string; data_uri?: string; size_bytes?: number }>;
  error?: { kind?: string; message?: string } | null;
}

// ---------------------------------------------------------------------------
// Cybersecurity Hub
// ---------------------------------------------------------------------------

export type CybersecurityLevel = 'Foundation' | 'Intermediate' | 'Advanced';

export interface CybersecurityAssessment {
  question: string;
  answer: string;
  explanation: string;
}

export interface CybersecurityLesson {
  id: string;
  title: string;
  slug?: string;
  duration_minutes?: number;
  durationMinutes?: number;
  level: CybersecurityLevel;
  summary: string;
  body: string;
  key_points?: string[];
  keyPoints?: string[];
  code_sample?: string;
  codeSample?: string;
  exercise?: string;
  hint?: string;
  assessment?: CybersecurityAssessment;
  check?: CybersecurityAssessment | { question: string; answer: string; explanation: string };
  challenge_id?: string | null;
  challengeId?: string | null;
}

export interface CybersecurityCourse {
  id: string;
  title: string;
  slug?: string;
  eyebrow?: string;
  level: CybersecurityLevel;
  estimated_hours?: number;
  estimatedHours?: number;
  summary: string;
  topics: string[];
  outcomes?: string[];
  lessons: CybersecurityLesson[];
  xp_reward?: number;
  xpReward?: number;
}

export interface CybersecurityLab {
  id: string;
  title: string;
  difficulty: Difficulty | string;
  duration_minutes?: number;
  durationMinutes?: number;
  environment: string;
  summary: string;
  objectives: string[];
  prerequisites: string[];
  challenge_id?: string | null;
  challengeId?: string | null;
  hands_on?: boolean;
  execution?: { kind: string; label: string; challengeId?: string };
}

export interface CybersecurityCTFChallenge {
  id: string;
  title: string;
  slug?: string;
  difficulty: Difficulty | string;
  category: string;
  category_detail?: string;
  categoryDetail?: string;
  summary: string;
  challenge_id?: string | null;
  challengeId?: string | null;
  xp_reward?: number;
  xpReward?: number;
  tags: string[];
  solved?: boolean;
  briefing?: string;
  hints?: string[];
  flag?: string;
}

export interface CybersecurityLessonProgress {
  id: string;
  title: string;
  completed: boolean;
}

export interface CybersecurityCourseProgress {
  id: string;
  title: string;
  level: CybersecurityLevel;
  lesson_count: number;
  completed_count: number;
  completion_percentage: number;
  xp_awarded: number;
  lessons: CybersecurityLessonProgress[];
}

export interface CybersecurityProgress {
  user_id: string;
  name: string;
  completed_lessons: string[];
  total_lessons: number;
  completed_count: number;
  completion_percentage: number;
  courses: CybersecurityCourseProgress[];
  current_streak_days: number;
}

export interface CybersecurityStats {
  user_id: string;
  name: string;
  role: string;
  xp: number;
  total_lessons: number;
  completed_lessons: number;
  completion_percentage: number;
  ctf_solved: number;
  ctf_total: number;
  xp_from_courses: number;
  badges_earned: string[];
  completed_by_course: Record<string, number>;
  completed_by_level: Record<string, number>;
  last_completed_at: string | null;
}

export interface CybersecurityLessonSummary {
  id: string;
  title: string;
  duration_minutes: number;
  level: CybersecurityLevel;
  summary: string;
  challenge_id: string | null;
  completed: boolean;
}

export interface CybersecurityCourseListResponse {
  items: Array<CybersecurityCourse & { lesson_count: number; lessons?: CybersecurityLessonSummary[] }>;
}

export interface CybersecurityLabListResponse {
  items: CybersecurityLab[];
}

export interface CybersecurityCTFListResponse {
  items: CybersecurityCTFChallenge[];
}

export interface CybersecurityLessonCompleteResponse {
  lesson_id: string;
  completed: boolean;
  completed_at: string;
  already_completed: boolean;
  xp_awarded: number;
  badges_earned: string[];
  course_progress: {
    course_id: string;
    title: string;
    completed_count: number;
    lesson_count: number;
    completion_percentage: number;
    course_complete: boolean;
  } | null;
}

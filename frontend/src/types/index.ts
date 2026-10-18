export type Discipline =
  | 'all'
  | 'cse'
  | 'ece-verilog'
  | 'ece-embedded'
  | 'ai-ml'
  | 'cybersecurity'
  | 'robotics'
  | 'hardware';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface TestCase {
  id: string;
  input: any;
  expected: any;
  description?: string;
  entry_point?: string;
  hidden?: boolean;
}

export interface TestCaseResult {
  test_case_id: string;
  passed: boolean;
  input: any;
  expected: any;
  actual: any;
  execution_time_ms: number;
  message?: string;
  hidden?: boolean;
}

export interface Challenge {
  id: string;
  slug: string;
  title: string;
  discipline: Discipline;
  difficulty: Difficulty;
  topic: string;
  description: string;
  starter_code: string;
  language: string;
  test_cases: TestCase[];
  solution_hints: string[];
  time_limit_ms: number;
  memory_limit_mb: number;
  tags: string[];
  xp_reward: number;
  order_index: number;
}

export interface SubmissionResult {
  id: string;
  challenge_id: string;
  language: string;
  verdict: 'AC' | 'WA' | 'TLE' | 'CE' | 'RE';
  execution_time_ms: number;
  memory_used_kb: number;
  output?: string;
  test_results: TestCaseResult[];
  xp_awarded: number;
  new_badges: string[];
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  primary_role: string;
  avatar_url?: string;
  xp: number;
  streak_days: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  discipline: string;
  xp_bonus: number;
  earned: boolean;
}

export interface SkillTreeNode {
  id: string;
  title: string;
  discipline: Discipline;
  topic: string;
  difficulty: Difficulty;
  xp: number;
  status: 'completed' | 'in_progress' | 'locked';
  order: number;
}

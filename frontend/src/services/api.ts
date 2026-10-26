import type {
  Badge,
  Challenge,
  ChallengeDetail,
  ChallengeFilters,
  ChallengeProgress,
  ChallengeSummary,
  CompletedLessonsResponse,
  Difficulty,
  AuthResponse,
  AuthSession,
  LeaderboardEntry,
  LessonCompletionResponse,
  LoginRequest,
  OnboardingRequest,
  OnboardingResponse,
  ProfileUpdate,
  SignupRequest,
  SkillTree,
  SubmissionHistoryResponse,
  SubmissionRequest,
  SubmissionResult,
  SubmissionVerdict,
  TestCaseResult,
  User,
  UserProgress,
  UserStats,
  VirtualHardwareProject,
  VirtualHardwareProjectInput,
  VirtualHardwareProjectListResponse,
  VirtualHardwareProjectSummary,
  MatlabScriptExecutionResult,
  CybersecurityCourse,
  CybersecurityLab,
  CybersecurityCTFChallenge,
  CybersecurityLesson,
  CybersecurityLessonProgress,
  CybersecurityCourseProgress,
  CybersecurityProgress,
  CybersecurityStats,
  CybersecurityLessonCompleteResponse,
  CybersecurityCourseListResponse,
  CybersecurityLabListResponse,
  CybersecurityCTFListResponse,
} from '../types';
import { INITIAL_CHALLENGES } from '../data/challenges';
import { filterChallenges, isSignalDomainFilter } from '../data/challengeFilters';

/** Use the frontend's origin by default; an explicit API origin still wins. */
export const API_BASE = import.meta.env.VITE_API_URL?.trim() || '';

/** Namespaced browser-storage key for the first-party bearer session. */
export const AUTH_STORAGE_KEY = 'enginx.auth.session';
export const AUTH_SESSION_EVENT = 'enginx:auth-session-changed';

export interface ApiErrorOptions {
  code?: string;
  recoverable?: boolean;
  details?: unknown;
  cause?: unknown;
}

/** A typed error for transport, HTTP, and invalid API responses. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly recoverable: boolean;
  readonly details?: unknown;
  readonly cause?: unknown;

  constructor(message: string, status: number, options: ApiErrorOptions | boolean = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;

    const normalizedOptions = typeof options === 'boolean' ? { recoverable: options } : options;
    this.code = normalizedOptions.code || (status === 0 ? 'NETWORK_ERROR' : 'API_ERROR');
    this.recoverable = normalizedOptions.recoverable ?? isRecoverableStatus(status);
    this.details = normalizedOptions.details;
    this.cause = normalizedOptions.cause;

    // Required when targeting older JavaScript runtimes while extending Error.
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

function isRecoverableStatus(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function browserStorages(): Storage[] {
  if (typeof window === 'undefined') return [];

  const storages: Storage[] = [];
  for (const getStorage of [
    () => window.localStorage,
    () => window.sessionStorage,
  ]) {
    try {
      const storage = getStorage();
      if (storage && !storages.includes(storage)) storages.push(storage);
    } catch {
      // Storage can be disabled by a browser privacy policy.
    }
  }
  return storages;
}

function isStoredAuthSession(value: unknown): value is AuthSession {
  if (!isRecord(value)) return false;
  if (typeof value.access_token !== 'string' || !value.access_token.trim()) return false;
  if (typeof value.token_type !== 'string' || !value.token_type.trim()) return false;
  return isRecord(value.user)
    && typeof value.user.id === 'string'
    && typeof value.user.email === 'string'
    && typeof value.user.name === 'string';
}

/** Read a persisted session, tolerating malformed or unavailable storage. */
export function getAuthSession(): AuthSession | null {
  for (const storage of browserStorages()) {
    try {
      const raw = storage.getItem(AUTH_STORAGE_KEY);
      if (!raw) continue;
      const parsed: unknown = JSON.parse(raw);
      if (isStoredAuthSession(parsed)) return parsed;
      storage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Treat malformed JSON or inaccessible storage as signed out.
    }
  }

  return null;
}

/** Persist the complete typed session in the namespaced browser key. */
export function setAuthSession(session: AuthSession): void {
  if (!isStoredAuthSession(session)) {
    throw new ApiError('The authentication response was invalid.', 502, {
      code: 'INVALID_AUTH_RESPONSE',
      recoverable: true,
      details: session,
    });
  }

  const serialized = JSON.stringify(session);
  for (const storage of browserStorages()) {
    try {
      storage.setItem(AUTH_STORAGE_KEY, serialized);
    } catch {
      // Continue so another available store can keep the session usable.
    }
  }

  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}

/** Clear both supported browser stores after sign-out or an expired token. */
export function clearAuthSession(): void {
  for (const storage of browserStorages()) {
    try {
      storage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Ignore unavailable storage while clearing the session.
    }
  }

  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}

/** Subscribe to same-tab and cross-tab session changes. */
export function subscribeToAuthSession(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key === AUTH_STORAGE_KEY || event.key === null) listener();
  };

  window.addEventListener(AUTH_SESSION_EVENT, listener);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(AUTH_SESSION_EVENT, listener);
    window.removeEventListener('storage', handleStorage);
  };
}

// Explicit aliases keep the storage boundary easy to consume from tests and UI.
export const getStoredAuthSession = getAuthSession;
export const setStoredAuthSession = setAuthSession;
export const clearStoredAuthSession = clearAuthSession;

function readErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload.trim()) return payload;

  if (isRecord(payload)) {
    const detail = payload.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (isRecord(detail) && typeof detail.msg === 'string' && detail.msg.trim()) return detail.msg;
    if (typeof payload.message === 'string' && payload.message.trim()) return payload.message;
    if (typeof payload.error === 'string' && payload.error.trim()) return payload.error;
  }

  return fallback;
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;

  try {
    return await response.json();
  } catch {
    // A non-JSON body should still become a typed ApiError below.  Successful
    // empty bodies are represented as undefined and are handled by callers.
    return undefined;
  }
}

function apiUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const base = API_BASE.replace(/\/$/, '');
  const search = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });

  const query = search.toString();
  return `${base}${path}${query ? `?${query}` : ''}`;
}

interface RequestOptions {
  authenticated?: boolean;
}

function withBearerAuth(init: RequestInit, session: AuthSession): RequestInit {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  return { ...init, headers };
}

async function requestJson<T>(url: string, init: RequestInit = {}, options: RequestOptions = {}): Promise<T> {
  const storedSession = getAuthSession();
  const session = options.authenticated ? storedSession : null;
  if (options.authenticated && !session) {
    throw new ApiError('Sign in to access your learner data.', 401, {
      code: 'AUTH_REQUIRED',
      recoverable: false,
    });
  }

  const isGuest = storedSession?.access_token === 'guest-offline-token';
  const authSessionToAttach = session || (!options.authenticated && storedSession && !isGuest ? storedSession : null);
  const requestInit = authSessionToAttach ? withBearerAuth(init, authSessionToAttach) : (session ? withBearerAuth(init, session) : init);

  try {
    const response = await fetch(url, requestInit);
    const payload = await readResponseBody(response);

    if (!response.ok) {
      if (response.status === 401 && options.authenticated && !isGuest) {
        clearAuthSession();
      }
      throw new ApiError(
        readErrorMessage(payload, `EnginX API request failed with HTTP ${response.status}.`),
        response.status,
        {
          code: `HTTP_${response.status}`,
          recoverable: isRecoverableStatus(response.status),
          details: payload,
        },
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    throw new ApiError('Unable to reach the EnginX API.', 0, {
      code: 'NETWORK_ERROR',
      recoverable: true,
      cause: error,
    });
  }
}

function requestJsonBody<T>(
  url: string,
  method: 'POST' | 'PATCH' | 'PUT',
  body: unknown,
  options: RequestOptions = {},
): Promise<T> {
  return requestJson<T>(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, options);
}

function requestJsonDelete<T>(url: string, options: RequestOptions = {}): Promise<T> {
  return requestJson<T>(url, { method: 'DELETE' }, options);
}

function requireRecord<T>(payload: unknown, message: string): T {
  if (!isRecord(payload)) {
    throw new ApiError(message, 502, {
      code: 'INVALID_RESPONSE',
      recoverable: true,
      details: payload,
    });
  }

  return payload as T;
}

function requireArray<T>(payload: unknown, message: string): T[] {
  if (!Array.isArray(payload)) {
    throw new ApiError(message, 502, {
      code: 'INVALID_RESPONSE',
      recoverable: true,
      details: payload,
    });
  }

  return payload as T[];
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function challengeFilters(
  disciplineOrFilters?: string | ChallengeFilters,
  search?: string,
  difficulty?: string,
): Required<Pick<ChallengeFilters, 'discipline' | 'search' | 'difficulty'>> {
  if (typeof disciplineOrFilters === 'object' && disciplineOrFilters !== null) {
    return {
      discipline: disciplineOrFilters.discipline || 'all',
      search: disciplineOrFilters.search ?? disciplineOrFilters.q ?? '',
      difficulty: disciplineOrFilters.difficulty || 'all',
    };
  }

  return {
    discipline: disciplineOrFilters || 'all',
    search: search || '',
    difficulty: difficulty || 'all',
  };
}

function localChallengeSummary(challenge: Challenge): ChallengeSummary {
  return {
    id: challenge.id,
    slug: challenge.slug,
    title: challenge.title,
    discipline: challenge.discipline,
    signalDomain: challenge.signalDomain,
    difficulty: challenge.difficulty,
    topic: challenge.topic,
    language: challenge.language,
    xp_reward: challenge.xp_reward,
    tags: challenge.tags,
    order_index: challenge.order_index,
    execution: challenge.execution,
    starterVerified: challenge.starterVerified,
  };
}

function filterLocalChallenges(filters: ChallengeFilters): ChallengeSummary[] {
  return filterChallenges(
    INITIAL_CHALLENGES,
    filters.discipline,
    filters.search || filters.q || '',
    filters.difficulty,
  ).map(localChallengeSummary);
}

function hydrateChallenge(value: ChallengeSummary | ChallengeDetail): Challenge {
  const record = value as Partial<Challenge>;
  const cached = INITIAL_CHALLENGES.find((challenge) => challenge.id === record.id || challenge.slug === record.slug);

  if (cached) {
    // A detail response wins over the local copy; catalogue summaries only
    // replace the summary fields and retain the editor-safe detail fields.
    return {
      ...cached,
      ...record,
      signalDomain: record.signalDomain ?? cached.signalDomain,
      execution: record.execution ?? cached.execution,
      starterVerified: record.starterVerified ?? cached.starterVerified,
    } as Challenge;
  }

  return {
    id: stringValue(record.id),
    slug: stringValue(record.slug),
    title: stringValue(record.title),
    discipline: stringValue(record.discipline, 'all') as Challenge['discipline'],
    difficulty: stringValue(record.difficulty, 'Easy') as Challenge['difficulty'],
    topic: stringValue(record.topic),
    language: stringValue(record.language),
    xp_reward: numberValue(record.xp_reward),
    tags: Array.isArray(record.tags) ? record.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    order_index: numberValue(record.order_index),
    signalDomain: record.signalDomain === 'signals' || record.signalDomain === 'dsp' || record.signalDomain === 'communications'
      ? record.signalDomain
      : undefined,
    execution: isRecord(record.execution) ? record.execution as Challenge['execution'] : undefined,
    starterVerified: record.starterVerified === true,
    description: stringValue(record.description),
    starter_code: stringValue(record.starter_code),
    test_cases: Array.isArray(record.test_cases) ? record.test_cases as Challenge['test_cases'] : [],
    solution_hints: Array.isArray(record.solution_hints)
      ? record.solution_hints.filter((hint): hint is string => typeof hint === 'string')
      : [],
    time_limit_ms: numberValue(record.time_limit_ms),
    memory_limit_mb: numberValue(record.memory_limit_mb),
  };
}

/**
 * Read-only catalogue calls retain the original local-catalogue fallback.  A
 * backend result is preferred, while a failed catalogue request never blocks
 * the editor from displaying the bundled curriculum.
 */
export async function fetchChallengeSummaries(
  disciplineOrFilters?: string | ChallengeFilters,
  search?: string,
  difficulty?: Difficulty | string,
): Promise<ChallengeSummary[]> {
  const filters = challengeFilters(disciplineOrFilters, search, difficulty);
  const params: Record<string, string | undefined> = {};

  if (filters.discipline !== 'all') params.discipline = String(filters.discipline);
  if (filters.difficulty !== 'all') params.difficulty = String(filters.difficulty);
  if (filters.search) params.q = filters.search;

  // The backend currently indexes the aggregate `ece-matlab` discipline. The
  // Signals/DSP/Communications sub-filters are local content metadata, so do
  // not send an unsupported discipline value and accidentally accept an empty
  // successful response as a valid catalogue.
  if (isSignalDomainFilter(filters.discipline)) {
    return filterLocalChallenges(filters);
  }

  try {
    const payload = await requestJson<unknown>(apiUrl('/api/challenges', params));
    return requireArray<ChallengeSummary>(payload, 'The challenge catalogue returned an invalid response.');
  } catch (error) {
    console.warn('Backend API unavailable, using the bundled challenge catalogue.', error);
    return filterLocalChallenges(filters);
  }
}

export async function fetchChallenges(
  disciplineOrFilters?: string | ChallengeFilters,
  search?: string,
  difficulty?: Difficulty | string,
): Promise<Challenge[]> {
  const summaries = await fetchChallengeSummaries(disciplineOrFilters, search, difficulty);
  return summaries.map(hydrateChallenge);
}

export async function fetchChallengeById(id: string): Promise<Challenge | null> {
  try {
    const payload = await requestJson<unknown>(apiUrl(`/api/challenges/${encodeURIComponent(id)}`));
    return hydrateChallenge(requireRecord<ChallengeDetail>(payload, 'The challenge response was invalid.'));
  } catch (error) {
    console.warn('Backend API unavailable, falling back to the bundled challenge.', error);
    return INITIAL_CHALLENGES.find((challenge) => challenge.id === id || challenge.slug === id) || null;
  }
}

// ---------------------------------------------------------------------------
// User/profile/onboarding
// ---------------------------------------------------------------------------

export async function fetchCurrentUser(): Promise<User> {
  const payload = await requestJson<unknown>(apiUrl('/api/auth/me'), {}, { authenticated: true });
  return requireRecord<User>(payload, 'The current-user response was invalid.');
}

function parseAuthResponse(payload: unknown): AuthSession {
  const response = requireRecord<AuthResponse>(payload, 'The authentication response was invalid.');
  if (typeof response.access_token !== 'string' || !response.access_token.trim()) {
    throw new ApiError('The authentication response did not include an access token.', 502, {
      code: 'INVALID_AUTH_RESPONSE',
      recoverable: true,
      details: payload,
    });
  }
  if (typeof response.token_type !== 'string' || !response.token_type.trim()) {
    throw new ApiError('The authentication response did not include a token type.', 502, {
      code: 'INVALID_AUTH_RESPONSE',
      recoverable: true,
      details: payload,
    });
  }
  const user = requireRecord<User>(response.user, 'The authentication response did not include a user.');
  const session: AuthSession = {
    access_token: response.access_token,
    token_type: response.token_type,
    user,
  };
  setAuthSession(session);
  return session;
}

export async function login(credentials: LoginRequest): Promise<AuthSession> {
  const payload = await requestJsonBody<unknown>(apiUrl('/api/auth/login'), 'POST', {
    email: credentials.email,
    password: credentials.password,
  });
  return parseAuthResponse(payload);
}

export async function signup(credentials: SignupRequest): Promise<AuthSession> {
  const payload = await requestJsonBody<unknown>(apiUrl('/api/auth/signup'), 'POST', {
    name: credentials.name,
    email: credentials.email,
    password: credentials.password,
  });
  return parseAuthResponse(payload);
}

export async function fetchUserProfile(): Promise<User> {
  const payload = await requestJson<unknown>(apiUrl('/api/user/profile'), {}, { authenticated: true });
  return requireRecord<User>(payload, 'The profile response was invalid.');
}

export async function updateUserProfile(changes: ProfileUpdate): Promise<User> {
  const payload = await requestJsonBody<unknown>(apiUrl('/api/user/profile'), 'PATCH', changes, { authenticated: true });
  return requireRecord<User>(payload, 'The updated profile response was invalid.');
}

export async function completeOnboarding(input: OnboardingRequest): Promise<OnboardingResponse> {
  const payload = await requestJsonBody<unknown>(apiUrl('/api/auth/onboarding'), 'POST', input, { authenticated: true });
  return requireRecord<OnboardingResponse>(payload, 'The onboarding response was invalid.');
}

// ---------------------------------------------------------------------------
// Progress, stats, skill tree, badges, leaderboard, and lessons
// ---------------------------------------------------------------------------

export async function fetchProgress(): Promise<UserProgress> {
  const payload = await requestJson<unknown>(apiUrl('/api/user/progress'), {}, { authenticated: true });
  return requireRecord<UserProgress>(payload, 'The progress response was invalid.');
}

export async function fetchStats(): Promise<UserStats> {
  const payload = await requestJson<unknown>(apiUrl('/api/user/stats'), {}, { authenticated: true });
  return requireRecord<UserStats>(payload, 'The stats response was invalid.');
}

export async function fetchSkillTree(discipline: string = 'all'): Promise<SkillTree> {
  const payload = await requestJson<unknown>(apiUrl('/api/user/skill-tree', {
    discipline: discipline || 'all',
  }), {}, { authenticated: true });
  return requireRecord<SkillTree>(payload, 'The skill-tree response was invalid.');
}

export async function fetchBadges(): Promise<Badge[]> {
  const payload = await requestJson<unknown>(apiUrl('/api/badges'), {}, { authenticated: true });
  return requireArray<Badge>(payload, 'The badges response was invalid.');
}

export async function fetchLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const payload = await requestJson<unknown>(apiUrl('/api/leaderboard', { limit }), {}, { authenticated: true });
  return requireArray<LeaderboardEntry>(payload, 'The leaderboard response was invalid.');
}

export async function completeLesson(lessonId: string): Promise<LessonCompletionResponse> {
  const payload = await requestJson<unknown>(apiUrl(`/api/user/lessons/${encodeURIComponent(lessonId)}/complete`), {
    method: 'POST',
  }, { authenticated: true });
  return requireRecord<LessonCompletionResponse>(payload, 'The lesson-completion response was invalid.');
}

export async function fetchCompletedLessons(): Promise<string[]> {
  const payload = await requestJson<unknown>(apiUrl('/api/user/lessons/completed'), {}, { authenticated: true });
  const response = requireRecord<CompletedLessonsResponse>(payload, 'The completed-lessons response was invalid.');
  if (!Array.isArray(response.lesson_ids)) {
    throw new ApiError('The completed-lessons response was invalid.', 502, {
      code: 'INVALID_RESPONSE',
      recoverable: true,
      details: payload,
    });
  }
  return response.lesson_ids.filter((lessonId): lessonId is string => typeof lessonId === 'string');
}

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

function normalizeTestCaseResult(value: unknown, index: number): TestCaseResult {
  const record = isRecord(value) ? value : {};
  const result: TestCaseResult = {
    test_case_id: stringValue(record.test_case_id, String(index + 1)),
    passed: record.passed === true,
    input: record.input ?? null,
    expected: record.expected ?? null,
    actual: record.actual ?? null,
    execution_time_ms: numberValue(record.execution_time_ms),
  };

  if (typeof record.message === 'string') result.message = record.message;
  if ('hidden' in record) result.hidden = record.hidden === true;
  return result;
}

/**
 * Convert a backend result into a safe, UI-ready result.  In particular, an
 * unavailable/retry response can never be represented as AC or award XP even
 * if a partial or malformed payload contains those fields.
 */
export function normalizeSubmissionResult(
  payload: unknown,
  defaults: Pick<SubmissionRequest, 'challenge_id' | 'language'> = { challenge_id: '', language: '' },
): SubmissionResult {
  const record = isRecord(payload) ? payload : {};
  const rawVerdict = typeof record.verdict === 'string' ? record.verdict.toUpperCase() : '';
  const rawStatus = typeof record.status === 'string' ? record.status.toLowerCase() : '';
  const declaredRetryable = record.retryable === true;
  const unavailable = !rawVerdict
    || rawVerdict === 'UNAVAILABLE'
    || rawVerdict === 'RETRY'
    || rawStatus === 'unavailable'
    || declaredRetryable;

  const testResults = Array.isArray(record.test_results)
    ? record.test_results.map(normalizeTestCaseResult)
    : [];
  const output = typeof record.output === 'string'
    ? record.output
    : unavailable
      ? 'Evaluation service unavailable; retry your submission.'
      : null;

  return {
    id: stringValue(record.id),
    challenge_id: stringValue(record.challenge_id, defaults.challenge_id),
    language: stringValue(record.language, defaults.language),
    verdict: unavailable ? 'UNAVAILABLE' : rawVerdict as SubmissionVerdict,
    status: unavailable ? 'unavailable' : 'evaluated',
    retryable: unavailable ? true : false,
    execution_time_ms: numberValue(record.execution_time_ms ?? record.total_time_ms),
    memory_used_kb: numberValue(record.memory_used_kb),
    output,
    test_results: testResults,
    xp_awarded: unavailable ? 0 : Math.max(0, numberValue(record.xp_awarded)),
    new_badges: unavailable
      ? []
      : Array.isArray(record.new_badges)
        ? record.new_badges.filter((badge): badge is string => typeof badge === 'string')
        : [],
    created_at: stringValue(record.created_at),
  };
}

export async function submitSolution(
  challenge: Pick<Challenge, 'id' | 'language'> | string,
  code: string,
  language?: string,
): Promise<SubmissionResult> {
  const challengeId = typeof challenge === 'string' ? challenge : challenge.id;
  const submissionLanguage = language || (typeof challenge === 'string' ? '' : challenge.language);

  if (!challengeId || !submissionLanguage) {
    throw new ApiError('A challenge id and language are required to submit code.', 400, {
      code: 'INVALID_SUBMISSION',
      recoverable: false,
    });
  }

  const payload = await requestJsonBody<unknown>(
    apiUrl('/api/submissions'),
    'POST',
    {
      challenge_id: challengeId,
      code,
      language: submissionLanguage,
    },
    { authenticated: true },
  );

  // There is deliberately no client-side evaluator fallback here.  A result
  // is meaningful only when it comes from the backend/evaluation service.
  return normalizeSubmissionResult(payload, {
    challenge_id: challengeId,
    language: submissionLanguage,
  });
}

export async function fetchSubmissionHistory(challengeId?: string, limit = 20): Promise<SubmissionResult[]> {
  const payload = await requestJson<unknown>(apiUrl('/api/submissions/history', {
    challenge_id: challengeId,
    limit,
  }), {}, { authenticated: true });
  const response = requireRecord<SubmissionHistoryResponse>(payload, 'The submission history response was invalid.');
  if (!Array.isArray(response.items)) {
    throw new ApiError('The submission history response was invalid.', 502, {
      code: 'INVALID_RESPONSE',
      recoverable: true,
      details: payload,
    });
  }

  return response.items.map((item) => normalizeSubmissionResult(item, {
    challenge_id: challengeId || '',
    language: '',
  }));
}

// ---------------------------------------------------------------------------
// Authenticated Virtual Hardware Lab persistence
// ---------------------------------------------------------------------------

function normalizeVirtualHardwareSummary(value: unknown): VirtualHardwareProjectSummary {
  const record = requireRecord<Record<string, unknown>>(value, 'The virtual hardware project response was invalid.');
  return {
    id: stringValue(record.id),
    title: stringValue(record.title, 'Untitled hardware project'),
    description: stringValue(record.description),
    board_profile: stringValue(record.board_profile),
    project_version: numberValue(record.project_version, 1),
    created_at: stringValue(record.created_at),
    updated_at: stringValue(record.updated_at),
  };
}

function normalizeVirtualHardwareProject(value: unknown): VirtualHardwareProject {
  const record = requireRecord<Record<string, unknown>>(value, 'The virtual hardware project response was invalid.');
  const summary = normalizeVirtualHardwareSummary(record);
  if (!isRecord(record.graph) || typeof record.code !== 'string') {
    throw new ApiError('The virtual hardware project payload was invalid.', 502, { code: 'INVALID_RESPONSE', recoverable: true, details: value });
  }
  return {
    ...summary,
    graph: record.graph,
    code: record.code,
    guided_step: stringValue(record.guided_step, 'build'),
    completed_steps: Array.isArray(record.completed_steps) ? record.completed_steps.filter((item): item is string => typeof item === 'string') : [],
    simulation_config: isRecord(record.simulation_config) ? record.simulation_config : {},
  };
}

export async function createVirtualHardwareProject(input: VirtualHardwareProjectInput): Promise<VirtualHardwareProject> {
  const payload = await requestJsonBody<unknown>(apiUrl('/api/virtual-hardware/projects'), 'POST', input, { authenticated: true });
  return normalizeVirtualHardwareProject(payload);
}

export async function fetchVirtualHardwareProjects(limit = 50): Promise<VirtualHardwareProjectSummary[]> {
  const payload = await requestJson<unknown>(apiUrl('/api/virtual-hardware/projects', { limit }), {}, { authenticated: true });
  const response = requireRecord<VirtualHardwareProjectListResponse>(payload, 'The virtual hardware project list was invalid.');
  if (!Array.isArray(response.items)) throw new ApiError('The virtual hardware project list was invalid.', 502, { code: 'INVALID_RESPONSE', recoverable: true, details: payload });
  return response.items.map(normalizeVirtualHardwareSummary);
}

export async function fetchVirtualHardwareProject(projectId: string): Promise<VirtualHardwareProject> {
  const payload = await requestJson<unknown>(apiUrl(`/api/virtual-hardware/projects/${encodeURIComponent(projectId)}`), {}, { authenticated: true });
  return normalizeVirtualHardwareProject(payload);
}

export async function updateVirtualHardwareProject(projectId: string, input: Partial<VirtualHardwareProjectInput>): Promise<VirtualHardwareProject> {
  const payload = await requestJsonBody<unknown>(apiUrl(`/api/virtual-hardware/projects/${encodeURIComponent(projectId)}`), 'PATCH', input, { authenticated: true });
  return normalizeVirtualHardwareProject(payload);
}

export async function duplicateVirtualHardwareProject(projectId: string): Promise<VirtualHardwareProject> {
  const payload = await requestJsonBody<unknown>(apiUrl(`/api/virtual-hardware/projects/${encodeURIComponent(projectId)}/duplicate`), 'POST', {}, { authenticated: true });
  return normalizeVirtualHardwareProject(payload);
}

export async function deleteVirtualHardwareProject(projectId: string): Promise<void> {
  await requestJsonDelete<unknown>(apiUrl(`/api/virtual-hardware/projects/${encodeURIComponent(projectId)}`), { authenticated: true });
}

export async function executeMatlabScript(code: string, timeLimitMs = 5000): Promise<MatlabScriptExecutionResult> {
  if (!code.trim()) throw new ApiError('Add MATLAB-compatible source code before running GNU Octave.', 400, { code: 'EMPTY_SCRIPT', recoverable: false });
  const payload = await requestJsonBody<unknown>(apiUrl('/api/evaluation/matlab/script'), 'POST', { code, time_limit_ms: timeLimitMs }, { authenticated: true });
  const record = requireRecord<Record<string, unknown>>(payload, 'The GNU Octave execution response was invalid.');
  return {
    verdict: stringValue(record.verdict),
    status: stringValue(record.status),
    mode: stringValue(record.mode, 'script'),
    runtime: stringValue(record.runtime, 'GNU Octave'),
    runtime_version: typeof record.runtime_version === 'string' ? record.runtime_version : null,
    total_time_ms: numberValue(record.total_time_ms),
    stdout: stringValue(record.stdout),
    stderr: stringValue(record.stderr),
    output: stringValue(record.output),
    warnings: Array.isArray(record.warnings) ? record.warnings.filter((item): item is string => typeof item === 'string') : [],
    artifacts: Array.isArray(record.artifacts) ? record.artifacts.filter(isRecord).map((artifact) => ({
      kind: typeof artifact.kind === 'string' ? artifact.kind : undefined,
      filename: typeof artifact.filename === 'string' ? artifact.filename : undefined,
      mime_type: typeof artifact.mime_type === 'string' ? artifact.mime_type : undefined,
      data_uri: typeof artifact.data_uri === 'string' ? artifact.data_uri : undefined,
      size_bytes: numberValue(artifact.size_bytes),
    })) : [],
    error: isRecord(record.error) ? { kind: stringValue(record.error.kind), message: stringValue(record.error.message) } : null,
  };
}

// Small aliases keep the service easy to consume while retaining the original
// fetch* names used by the existing React application.
export const getCurrentUser = fetchCurrentUser;
export const fetchProfile = fetchUserProfile;
export const getProfile = fetchUserProfile;
export const updateProfile = updateUserProfile;
export const onboardUser = completeOnboarding;
export const getProgress = fetchProgress;
export const getStats = fetchStats;
export const getSkillTree = fetchSkillTree;
export const getBadges = fetchBadges;
export const getLeaderboard = fetchLeaderboard;
export const markLessonComplete = completeLesson;
export const getCompletedLessons = fetchCompletedLessons;
export const getSubmissionHistory = fetchSubmissionHistory;
export const listVirtualHardwareProjects = fetchVirtualHardwareProjects;
export const getVirtualHardwareProject = fetchVirtualHardwareProject;
export const runMatlabScript = executeMatlabScript;
export const getChallenges = fetchChallenges;
export const getChallengeById = fetchChallengeById;

// ---------------------------------------------------------------------------
// Cybersecurity Hub API
// ---------------------------------------------------------------------------

export async function fetchCyberCourses(
  level?: string,
  search?: string,
  limit = 50,
): Promise<CybersecurityCourseListResponse> {
  const params: Record<string, string | undefined> = {};
  if (level) params.level = level;
  if (search) params.q = search;
  if (limit) params.limit = String(limit);

  const payload = await requestJson<unknown>(apiUrl('/api/cybersecurity/courses', params));
  return requireRecord<CybersecurityCourseListResponse>(payload, 'The cybersecurity courses response was invalid.');
}

export async function fetchCyberCourse(courseId: string): Promise<CybersecurityCourse> {
  const payload = await requestJson<unknown>(apiUrl(`/api/cybersecurity/courses/${encodeURIComponent(courseId)}`));
  return requireRecord<CybersecurityCourse>(payload, 'The cybersecurity course response was invalid.');
}

export async function fetchCyberLesson(lessonId: string): Promise<CybersecurityLesson> {
  const payload = await requestJson<unknown>(apiUrl(`/api/cybersecurity/lessons/${encodeURIComponent(lessonId)}`));
  return requireRecord<CybersecurityLesson>(payload, 'The cybersecurity lesson response was invalid.');
}

export async function completeCyberLesson(lessonId: string): Promise<CybersecurityLessonCompleteResponse> {
  const payload = await requestJsonBody<unknown>(
    apiUrl(`/api/cybersecurity/lessons/${encodeURIComponent(lessonId)}/complete`),
    'POST',
    {},
    { authenticated: true },
  );
  return requireRecord<CybersecurityLessonCompleteResponse>(payload, 'The lesson completion response was invalid.');
}

export async function fetchCyberLabs(
  difficulty?: string,
  handsOn?: boolean,
): Promise<CybersecurityLabListResponse> {
  const params: Record<string, string | undefined> = {};
  if (difficulty) params.difficulty = difficulty;
  if (handsOn !== undefined) params.hands_on = String(handsOn);

  const payload = await requestJson<unknown>(apiUrl('/api/cybersecurity/labs', params));
  return requireRecord<CybersecurityLabListResponse>(payload, 'The cybersecurity labs response was invalid.');
}

export async function fetchCyberCTFChallenges(
  difficulty?: string,
  category?: string,
  limit = 50,
): Promise<CybersecurityCTFListResponse> {
  const params: Record<string, string | undefined> = {};
  if (difficulty) params.difficulty = difficulty;
  if (category) params.category = category;
  if (limit) params.limit = String(limit);

  const payload = await requestJson<unknown>(apiUrl('/api/cybersecurity/ctf-challenges', params));
  return requireRecord<CybersecurityCTFListResponse>(payload, 'The CTF challenges response was invalid.');
}

export async function fetchCyberProgress(): Promise<CybersecurityProgress> {
  const payload = await requestJson<unknown>(apiUrl('/api/cybersecurity/progress'), {}, { authenticated: true });
  return requireRecord<CybersecurityProgress>(payload, 'The cybersecurity progress response was invalid.');
}

export async function fetchCyberStats(): Promise<CybersecurityStats> {
  const payload = await requestJson<unknown>(apiUrl('/api/cybersecurity/stats'), {}, { authenticated: true });
  return requireRecord<CybersecurityStats>(payload, 'The cybersecurity stats response was invalid.');
}

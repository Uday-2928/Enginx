import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from './components/layout/Header';
import { AuthScreen } from './components/auth/AuthScreen';
import { ChallengeList } from './components/challenges/ChallengeList';
import { ChallengeDetails } from './components/challenges/ChallengeDetails';
import { CodeEditor } from './components/editor/CodeEditor';
import { SkillTree } from './components/dashboard/SkillTree';
import { BadgeCollection } from './components/dashboard/BadgeCollection';
import { Leaderboard } from './components/dashboard/Leaderboard';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { CyberHub } from './components/cybersecurity/CyberHub';
import { EceHub } from './components/ece/EceHub';
import { DomainsPage } from './components/domains/DomainsPage';
import type { OnboardingFormValues } from './components/onboarding/OnboardingModal';
import type {
  Badge,
  AuthSession,
  Challenge,
  ChallengeFilter,
  CybersecurityCourse,
  CybersecurityCTFChallenge,
  CybersecurityLab,
  CybersecurityProgress,
  CybersecurityStats,
  Discipline,
  EcePreferences,
  LeaderboardEntry,
  SubmissionResult,
  SkillTree as SkillTreeData,
  User,
  UserProgress,
  UserStats,
} from './types';
import { INITIAL_CHALLENGES } from './data/challenges';
import { filterChallenges, normalizeBranch, type EngineeringBranch } from './data/challengeFilters';
import { CYBER_COURSES, CYBER_LABS, CTF_CHALLENGES } from './data/cyberHub';
import {
  ApiError,
  clearAuthSession,
  completeLesson,
  completeOnboarding,
  fetchBadges,
  fetchChallenges,
  fetchCompletedLessons,
  fetchCyberCourses,
  fetchCyberCTFChallenges,
  fetchCyberLabs,
  fetchCyberProgress,
  fetchCyberStats,
  fetchLeaderboard,
  fetchProgress,
  fetchSubmissionHistory,
  fetchSkillTree,
  fetchStats,
  fetchUserProfile,
  getAuthSession,
  subscribeToAuthSession,
  submitSolution,
  updateUserProfile,
} from './services/api';

type AppTab = 'ece-hub' | 'cyber-hub' | 'domains' | 'challenges' | 'skill-tree' | 'badges' | 'leaderboard';
type EvaluationAction = 'run' | 'submit';

const VALID_TABS: AppTab[] = ['ece-hub', 'cyber-hub', 'domains', 'challenges', 'skill-tree', 'badges', 'leaderboard'];
const ACTIVE_TAB_STORAGE_KEY = 'enginx.active.tab';

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

const EDITOR_DRAFT_PREFIX = 'enginx.editor.draft';

function editorDraftKey(userId: string | undefined, challengeId: string): string {
  return `${EDITOR_DRAFT_PREFIX}.${userId || 'anonymous'}.${challengeId}`;
}

function loadEditorDraft(userId: string | undefined, challenge: Challenge): string {
  if (typeof window === 'undefined') return challenge.starter_code;
  try {
    return window.localStorage.getItem(editorDraftKey(userId, challenge.id)) ?? challenge.starter_code;
  } catch {
    return challenge.starter_code;
  }
}

function saveEditorDraft(userId: string | undefined, challengeId: string, code: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(editorDraftKey(userId, challengeId), code);
  } catch {
    // Draft persistence is best-effort and must never block editing.
  }
}

function clearEditorDraft(userId: string | undefined, challengeId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(editorDraftKey(userId, challengeId));
  } catch {
    // Draft persistence is best-effort and must never block reset.
  }
}

function disciplineForRole(role: string | null | undefined): Discipline {
  switch ((role || '').toUpperCase()) {
    case 'CSE':
    case 'IT':
      return 'cse';
    case 'ECE':
    case 'EEE':
    case 'VLSI':
    case 'EMBEDDED':
      return 'ece-verilog';
    case 'AI':
    case 'AI/ML':
    case 'AI&DS':
    case 'DATA_SCIENCE':
      return 'ai-ml';
    case 'CYBER':
    case 'CYBERSECURITY':
      return 'cybersecurity';
    case 'ROBOTICS':
    case 'MECHATRONICS':
      return 'robotics';
    case 'HARDWARE':
      return 'hardware';
    default:
      return 'all';
  }
}

function disciplineForProfile(profile: Pick<User, 'primary_role' | 'branch'>): Discipline {
  const branch = (profile.branch || '').toUpperCase();
  if (branch === 'EMBEDDED SYSTEMS') return 'ece-embedded';
  return disciplineForRole(profile.primary_role);
}

function isEceLearner(user: Pick<User, 'primary_role' | 'branch'> | null | undefined): boolean {
  const role = (user?.primary_role || '').toUpperCase();
  const branch = (user?.branch || '').toUpperCase();
  return role === 'ECE' || ['ECE', 'EEE', 'VLSI', 'EMBEDDED SYSTEMS', 'INSTRUMENTATION'].includes(branch);
}

function isCyberLearner(user: Pick<User, 'primary_role' | 'branch'> | null | undefined): boolean {
  const role = (user?.primary_role || '').toUpperCase();
  const branch = (user?.branch || '').toUpperCase();
  return role === 'CYBER' || role === 'CYBERSECURITY' || branch === 'CYBER' || branch === 'CYBERSECURITY';
}

export function App() {
  const [session, setSession] = useState<AuthSession | null>(() => getAuthSession());
  const [currentTab, setCurrentTab] = useState<AppTab>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY) as AppTab | null;
        if (saved && VALID_TABS.includes(saved)) return saved;
      } catch {}
    }
    const user = getAuthSession()?.user;
    if (isCyberLearner(user)) return 'cyber-hub';
    return isEceLearner(user) ? 'ece-hub' : 'challenges';
  });

  const handleTabChange = useCallback((tab: AppTab) => {
    setCurrentTab(tab);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tab);
      } catch {}
    }
  }, []);
  const [catalogueChallenges, setCatalogueChallenges] = useState<Challenge[]>(INITIAL_CHALLENGES);
  const [selectedDiscipline, setSelectedDiscipline] = useState<ChallengeFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeBranch, setActiveBranch] = useState<EngineeringBranch>(() =>
    normalizeBranch(getAuthSession()?.user?.branch || getAuthSession()?.user?.primary_role || 'ECE')
  );

  const challenges = useMemo(() => {
    return filterChallenges(catalogueChallenges, selectedDiscipline, searchQuery, 'all', activeBranch);
  }, [catalogueChallenges, selectedDiscipline, searchQuery, activeBranch]);

  const [selectedChallenge, setSelectedChallenge] = useState<Challenge>(() => {
    const initialBranch = normalizeBranch(getAuthSession()?.user?.branch || getAuthSession()?.user?.primary_role || 'ECE');
    const branchInitial = filterChallenges(INITIAL_CHALLENGES, 'all', '', 'all', initialBranch);
    return branchInitial[0] || INITIAL_CHALLENGES[0];
  });
  const [code, setCode] = useState<string>(() => {
    const initialBranch = normalizeBranch(getAuthSession()?.user?.branch || getAuthSession()?.user?.primary_role || 'ECE');
    const branchInitial = filterChallenges(INITIAL_CHALLENGES, 'all', '', 'all', initialBranch);
    return (branchInitial[0] || INITIAL_CHALLENGES[0]).starter_code;
  });

  useEffect(() => {
    // Bank challenges live outside the classic branch-filtered catalogue, so a
    // bank selection must survive catalogue updates instead of resetting.
    if (selectedChallenge.id.startsWith('bank-')) return;
    if (challenges.length > 0 && !challenges.some((c) => c.id === selectedChallenge.id)) {
      setSelectedChallenge(challenges[0]);
    }
  }, [challenges, selectedChallenge.id]);

  // Persisted learner state.  Empty/null values mean the backend has not
  // confirmed data yet; they are intentionally not replaced with demo stats.
  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [skillTree, setSkillTree] = useState<SkillTreeData | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [profileState, setProfileState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [learningStateError, setLearningStateError] = useState<string | null>(null);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [isLoadingChallenges, setIsLoadingChallenges] = useState(false);
  const [isLoadingLearningState, setIsLoadingLearningState] = useState(false);

  // Cybersecurity Hub state
  const [cyberCourses, setCyberCourses] = useState<CybersecurityCourse[]>([]);
  const [cyberLabs, setCyberLabs] = useState<CybersecurityLab[]>([]);
  const [cyberCTFChallenges, setCyberCTFChallenges] = useState<CybersecurityCTFChallenge[]>([]);
  const [cyberProgress, setCyberProgress] = useState<CybersecurityProgress | null>(null);
  const [cyberStats, setCyberStats] = useState<CybersecurityStats | null>(null);
  const [isLoadingCyberData, setIsLoadingCyberData] = useState(false);
  const [cyberDataError, setCyberDataError] = useState<string | null>(null);

  // Evaluation state
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [submissionHistory, setSubmissionHistory] = useState<SubmissionResult[]>([]);
  const [isLoadingSubmissionHistory, setIsLoadingSubmissionHistory] = useState(false);
  const [submissionHistoryError, setSubmissionHistoryError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [lastEvaluationAction, setLastEvaluationAction] = useState<EvaluationAction>('submit');

  // Modal state
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isCompletingLesson, setIsCompletingLesson] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [isSavingEcePreferences, setIsSavingEcePreferences] = useState(false);
  const [ecePreferencesError, setEcePreferencesError] = useState<string | null>(null);

  const applyUser = useCallback((nextUser: User) => {
    setUser(nextUser);
    const branchNorm = normalizeBranch(nextUser.branch || nextUser.primary_role);
    setActiveBranch(branchNorm);
    setSelectedDiscipline('all');
  }, []);

  const handleSelectBranch = useCallback((branch: string) => {
    const normalized = normalizeBranch(branch);
    setActiveBranch(normalized);
    setSelectedDiscipline('all');
    setSearchQuery('');

    if (user) {
      setUser((prev) => prev ? {
        ...prev,
        primary_role: normalized === 'ALL' ? prev.primary_role : (normalized as any),
        branch: branch,
      } : null);
    }

    if (session) {
      void updateUserProfile({
        primary_role: normalized === 'ALL' ? undefined : (normalized as any),
        branch: branch,
      }).catch(() => {});
    }

    if (normalized !== 'ECE' && currentTab === 'ece-hub') {
      handleTabChange('challenges');
    }
    if (normalized === 'CYBER' && currentTab !== 'cyber-hub') {
      handleTabChange('cyber-hub');
    }
    if (normalized !== 'CYBER' && currentTab === 'cyber-hub') {
      handleTabChange('challenges');
    }
  }, [currentTab, handleTabChange, session, user]);

  const loadLearningState = useCallback(async () => {
    setIsLoadingLearningState(true);
    const [profileResult, progressResult, statsResult, badgesResult, leaderboardResult, lessonsResult, skillTreeResult] = await Promise.allSettled([
      fetchUserProfile(),
      fetchProgress(),
      fetchStats(),
      fetchBadges(),
      fetchLeaderboard(),
      fetchCompletedLessons(),
      fetchSkillTree('all'),
    ]);
    const failures: string[] = [];

    if (profileResult.status === 'fulfilled') {
      applyUser(profileResult.value);
      setProfileState('ready');
    } else {
      setProfileState('error');
      failures.push(`Profile: ${errorMessage(profileResult.reason, 'profile data could not be loaded.')}`);
    }

    if (progressResult.status === 'fulfilled') setProgress(progressResult.value);
    else failures.push(`Progress: ${errorMessage(progressResult.reason, 'saved progress could not be loaded.')}`);

    if (statsResult.status === 'fulfilled') setStats(statsResult.value);
    else failures.push(`Stats: ${errorMessage(statsResult.reason, 'learner statistics could not be loaded.')}`);

    if (badgesResult.status === 'fulfilled') setBadges(badgesResult.value);
    else failures.push(`Badges: ${errorMessage(badgesResult.reason, 'badge data could not be loaded.')}`);

    if (leaderboardResult.status === 'fulfilled') setLeaderboard(leaderboardResult.value);
    else failures.push(`Leaderboard: ${errorMessage(leaderboardResult.reason, 'leaderboard data could not be loaded.')}`);

    if (lessonsResult.status === 'fulfilled') {
      // A completion can finish while this parallel bootstrap request is still
      // in flight.  Merge the server snapshot with the local confirmed result
      // instead of allowing an older empty response to roll it back.
      setCompletedLessonIds((current) => Array.from(new Set([...current, ...lessonsResult.value])));
    }
    else failures.push(`Lessons: ${errorMessage(lessonsResult.reason, 'lesson completion data could not be loaded.')}`);

    if (skillTreeResult.status === 'fulfilled') setSkillTree(skillTreeResult.value);
    else failures.push(`Roadmap: ${errorMessage(skillTreeResult.reason, 'roadmap data could not be loaded.')}`);

    setLearningStateError(failures.length > 0 ? failures.join(' ') : null);
    setIsLoadingLearningState(false);
  }, [applyUser]);

  // Load cybersecurity hub data
  const loadCyberData = useCallback(async () => {
    if (!session?.user) return;
    setIsLoadingCyberData(true);
    setCyberDataError(null);
    try {
      const [coursesResult, labsResult, ctfResult, progressResult, statsResult] = await Promise.allSettled([
        fetchCyberCourses(),
        fetchCyberLabs(),
        fetchCyberCTFChallenges(),
        fetchCyberProgress(),
        fetchCyberStats(),
      ]);

      if (coursesResult.status === 'fulfilled') {
        setCyberCourses(coursesResult.value.items);
      } else {
        console.warn('Cybersecurity courses API failed, using local fallback:', coursesResult.reason);
        setCyberCourses(CYBER_COURSES);
      }

      if (labsResult.status === 'fulfilled') {
        setCyberLabs(labsResult.value.items);
      } else {
        console.warn('Cybersecurity labs API failed, using local fallback:', labsResult.reason);
        setCyberLabs(CYBER_LABS);
      }

      if (ctfResult.status === 'fulfilled') {
        setCyberCTFChallenges(ctfResult.value.items);
      } else {
        console.warn('Cybersecurity CTF API failed, using local fallback:', ctfResult.reason);
        setCyberCTFChallenges(CTF_CHALLENGES);
      }

      if (progressResult.status === 'fulfilled') {
        setCyberProgress(progressResult.value);
      }

      if (statsResult.status === 'fulfilled') {
        setCyberStats(statsResult.value);
      }
    } catch (error) {
      setCyberDataError(errorMessage(error, 'Cybersecurity data could not be loaded.'));
      // Fallback to local data
      setCyberCourses(CYBER_COURSES);
      setCyberLabs(CYBER_LABS);
      setCyberCTFChallenges(CTF_CHALLENGES);
    } finally {
      setIsLoadingCyberData(false);
    }
  }, [session?.user]);

  useEffect(() => subscribeToAuthSession(() => setSession(getAuthSession())), []);

  useEffect(() => {
    if (session) void loadLearningState();
  }, [loadLearningState, session]);

  // Load cybersecurity data when session is available
  useEffect(() => {
    if (session) void loadCyberData();
  }, [loadCyberData, session]);

  // Sync editor state when the selected challenge changes.
  useEffect(() => {
    let active = true;
    const challengeId = selectedChallenge.id;
    setCode(loadEditorDraft(session?.user.id, selectedChallenge));
    setSubmissionResult(null);
    setSubmissionHistory([]);
    setIsLoadingSubmissionHistory(true);
    setSubmissionHistoryError(null);
    setSubmissionError(null);
    setLessonError(null);

    fetchSubmissionHistory(challengeId)
      .then((history) => {
        if (active) setSubmissionHistory(history);
      })
      .catch((error) => {
        if (active) {
          setSubmissionHistoryError(errorMessage(error, 'Saved attempt history could not be loaded.'));
        }
      })
      .finally(() => {
        if (active) setIsLoadingSubmissionHistory(false);
      });

    return () => {
      active = false;
    };
  }, [selectedChallenge, session?.user.id]);

  // Populate the challenge catalogue from the backend (with read-only fallback).
  useEffect(() => {
    let active = true;
    setIsLoadingChallenges(true);
    setChallengeError(null);

    fetchChallenges('all')
      .then((data) => {
        if (!active) return;
        // The HDL coding bank has its own browser inside the ECE hub; keep
        // bank records out of the classic challenge workspace.
        setCatalogueChallenges(data.filter((challenge) => !challenge.id.startsWith('bank-')));
      })
      .catch((error) => {
        if (active) setChallengeError(errorMessage(error, 'Challenges could not be loaded.'));
      })
      .finally(() => {
        if (active) setIsLoadingChallenges(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const runEvaluation = useCallback(async (action: EvaluationAction) => {
    setLastEvaluationAction(action);
    setIsEvaluating(true);
    setSubmissionError(null);
    try {
      const result = await submitSolution(selectedChallenge, code, selectedChallenge.language);
      setSubmissionResult(result);
      setSubmissionHistory((current) => {
        const withoutCurrentResult = result.id
          ? current.filter((attempt) => attempt.id !== result.id)
          : current;
        return [result, ...withoutCurrentResult].slice(0, 20);
      });

      // The backend is the only source of truth for progress, XP, and badges.
      // A retryable/unavailable result deliberately refreshes nothing locally.
      if (result.status === 'evaluated' && result.verdict === 'AC') {
        await loadLearningState();
      }
    } catch (error) {
      setSubmissionResult(null);
      setSubmissionError(errorMessage(error, 'The submission service could not be reached.'));
    } finally {
      setIsEvaluating(false);
    }
  }, [code, loadLearningState, selectedChallenge]);

  const handleRunCode = () => {
    void runEvaluation('run');
  };

  const handleSubmitCode = () => {
    void runEvaluation('submit');
  };

  const handleCodeChange = useCallback((nextCode: string) => {
    setCode(nextCode);
    saveEditorDraft(session?.user.id, selectedChallenge.id, nextCode);
  }, [selectedChallenge.id, session?.user.id]);

  const handleResetCode = useCallback(() => {
    clearEditorDraft(session?.user.id, selectedChallenge.id);
    setCode(selectedChallenge.starter_code);
  }, [selectedChallenge, session?.user.id]);

  const handleCompleteLesson = async (lessonId = `lesson-${selectedChallenge.id}`) => {
    const completionId = typeof lessonId === 'string' && lessonId.trim()
      ? lessonId
      : `lesson-${selectedChallenge.id}`;
    setIsCompletingLesson(true);
    setLessonError(null);
    try {
      const result = await completeLesson(completionId);
      if (result.completed) {
        setCompletedLessonIds((current) => current.includes(result.lesson_id) ? current : [...current, result.lesson_id]);
      }
    } catch (error) {
      setLessonError(errorMessage(error, 'Lesson completion could not be saved.'));
    } finally {
      setIsCompletingLesson(false);
    }
  };

  // Cybersecurity Hub handlers
  // CyberHub manages its own internal navigation state (selectedLesson,
  // selectedLab, selectedCTF). The callbacks below are no-ops kept for
  // prop-contract compatibility with the component interface.

  const handleOpenCyberCourse = (_course: CybersecurityCourse): void => {
    // Course selection is owned by CyberHub's internal navigation state.
  };

  const handleOpenCyberLab = (_lab: CybersecurityLab): void => {
    // Lab selection is owned by CyberHub's internal navigation state.
  };

  const handleOpenCyberCTF = (_challenge: CybersecurityCTFChallenge): void => {
    // CTF selection is owned by CyberHub's internal navigation state.
  };

  const handleOnboardingSubmit = async (values: OnboardingFormValues) => {
    if (user) {
      const updatedUser = await updateUserProfile({
        name: values.name || undefined,
        primary_role: values.role,
        branch: values.branch || null,
        specialization: values.specialization || null,
        degree: values.degree || null,
        year: values.year,
        goal: values.goal || null,
        weekly_hours: values.weeklyHours,
      });
      applyUser(updatedUser);
    } else {
      const response = await completeOnboarding({
        role: values.role,
        name: values.name || undefined,
        branch: values.branch || null,
        specialization: values.specialization || null,
        degree: values.degree || null,
        year: values.year,
        goal: values.goal || null,
        weekly_hours: values.weeklyHours,
      });
      applyUser(response.user);
    }
    setLearningStateError(null);
    await loadLearningState();
  };

  const handleAuthenticated = (nextSession: AuthSession) => {
    setSession(nextSession);
    applyUser(nextSession.user);
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY) as AppTab | null;
        if (saved && VALID_TABS.includes(saved)) {
          handleTabChange(saved);
          setLearningStateError(null);
          return;
        }
      } catch {}
    }
    if (isCyberLearner(nextSession.user)) {
      handleTabChange('cyber-hub');
    } else if (isEceLearner(nextSession.user)) {
      handleTabChange('ece-hub');
    } else {
      handleTabChange('challenges');
    }
    setLearningStateError(null);
  };

  const handleSaveEcePreferences = async (preferences: EcePreferences) => {
    if (!user) return;
    setIsSavingEcePreferences(true);
    setEcePreferencesError(null);
    try {
      const updatedUser = await updateUserProfile({ ece_preferences: preferences });
      applyUser(updatedUser);
    } catch (error) {
      const message = errorMessage(error, 'ECE preferences could not be saved.');
      setEcePreferencesError(message);
      throw error;
    } finally {
      setIsSavingEcePreferences(false);
    }
  };

  const handleSignOut = () => {
    clearAuthSession();
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(ACTIVE_TAB_STORAGE_KEY);
      } catch {}
    }
    setSession(null);
    setUser(null);
    setProgress(null);
    setStats(null);
    setSkillTree(null);
    setBadges([]);
    setLeaderboard([]);
    setCompletedLessonIds([]);
    setSubmissionHistory([]);
    setSubmissionResult(null);
    setIsOnboardingOpen(false);
  };

  const completedIds = progress?.completed_challenges || [];
  const currentLessonId = `lesson-${selectedChallenge.id}`;
  const currentRole = user?.primary_role || 'CSE';
  const currentBranch = user?.branch || null;

  if (!session) return <AuthScreen onAuthenticated={handleAuthenticated} />;

  return (
    <div className="min-h-screen flex flex-col bg-enginx-canvas text-slate-900">
      {/* Platform Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={handleTabChange}
        userXp={user?.xp ?? null}
        streakDays={user?.streak_days ?? null}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        onSignOut={handleSignOut}
        userRole={activeBranch}
        onSelectBranch={handleSelectBranch}
      />

      {(isLoadingLearningState || isLoadingChallenges || learningStateError || challengeError) && (
        <div className="mx-auto flex w-full max-w-[1720px] flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-6 lg:px-8" aria-live="polite">
          {isLoadingLearningState && (
            <div className="flex items-center gap-2 rounded-lg border border-teal-100 bg-white px-3 py-2 text-xs font-semibold text-slate-600" role="status">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-200 border-t-teal-700" aria-hidden="true" />
              Loading saved learner state…
            </div>
          )}
          {isLoadingChallenges && !isLoadingLearningState && (
            <div className="flex items-center gap-2 rounded-lg border border-teal-100 bg-white px-3 py-2 text-xs font-semibold text-slate-600" role="status">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-200 border-t-teal-700" aria-hidden="true" />
              Loading challenges…
            </div>
          )}
          {(learningStateError || challengeError) && (
            <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900" role="alert">
              <span>{challengeError || learningStateError}</span>
              <button
                type="button"
                onClick={() => void loadLearningState()}
                className="focus-ring btn-secondary"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex min-h-0 flex-1 flex-col">
        {currentTab === 'ece-hub' && (
          <div className="flex-1">
            <EceHub
              user={user}
              stats={stats}
              progress={progress}
              completedLessonIds={completedLessonIds}
              skillTree={skillTree}
              challenges={catalogueChallenges}
              onOpenChallenge={(challenge) => {
                setSelectedChallenge(challenge);
                handleTabChange('challenges');
              }}
              onOpenProfile={() => setIsOnboardingOpen(true)}
              onSavePreferences={handleSaveEcePreferences}
              onCompleteLesson={handleCompleteLesson}
              isSavingPreferences={isSavingEcePreferences}
              preferencesError={ecePreferencesError}
              isCompletingLesson={isCompletingLesson}
              lessonError={lessonError}
            />
          </div>
        )}
        {currentTab === 'cyber-hub' && (
          <div className="flex-1">
            <CyberHub
              user={user}
              progress={cyberProgress}
              courses={cyberCourses}
              labs={cyberLabs}
              ctfChallenges={cyberCTFChallenges}
              onOpenCourse={handleOpenCyberCourse}
              onOpenLab={handleOpenCyberLab}
              onOpenCTF={handleOpenCyberCTF}
            />
          </div>
        )}
        {currentTab === 'domains' && (
          <DomainsPage
            completedLessonIds={completedLessonIds}
            onCompleteLesson={handleCompleteLesson}
            onOpenEceHub={() => handleTabChange('ece-hub')}
            onOpenCyberHub={() => handleTabChange('cyber-hub')}
          />
        )}
        {currentTab === 'challenges' && (
          <div className="mx-auto grid w-full max-w-[1720px] flex-1 grid-cols-1 gap-4 px-4 py-4 sm:px-6 lg:h-[calc(100vh-7.5rem)] lg:grid-cols-[minmax(250px,0.82fr)_minmax(320px,1.12fr)_minmax(360px,1.45fr)] lg:gap-5 lg:px-8 lg:py-5">
            {/* Left Column: Challenge Navigator (3 cols) */}
            <div className="min-h-[520px] min-w-0 lg:h-full lg:min-h-0">
              <ChallengeList
                challenges={challenges}
                selectedChallengeId={selectedChallenge.id}
                onSelectChallenge={(c) => setSelectedChallenge(c)}
                completedIds={completedIds}
                selectedDiscipline={selectedDiscipline}
                setSelectedDiscipline={setSelectedDiscipline}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                branch={activeBranch}
              />
            </div>

            {/* Middle Column: Problem Statement & Specs (4 cols) */}
            <div className="min-h-[520px] min-w-0 lg:h-full lg:min-h-0">
              <ChallengeDetails
                challenge={selectedChallenge}
                isCompleted={completedIds.includes(selectedChallenge.id)}
                lessonId={currentLessonId}
                lessonCompleted={completedLessonIds.includes(currentLessonId)}
                isCompletingLesson={isCompletingLesson}
                lessonError={lessonError}
                onCompleteLesson={handleCompleteLesson}
              />
            </div>

            {/* Right Column: Code Editor & Simulation Output (5 cols) */}
            <div className="min-h-[580px] min-w-0 lg:h-full lg:min-h-0">
              <CodeEditor
                challenge={selectedChallenge}
                code={code}
                 setCode={handleCodeChange}
                onRun={handleRunCode}
                onSubmit={handleSubmitCode}
                isEvaluating={isEvaluating}
                submissionResult={submissionResult}
                submissionHistory={submissionHistory}
                submissionHistoryLoading={isLoadingSubmissionHistory}
                submissionHistoryError={submissionHistoryError}
                submissionError={submissionError}
                onRetry={() => void runEvaluation(lastEvaluationAction)}
                 onResetCode={handleResetCode}
              />
            </div>
          </div>
        )}

        {currentTab === 'skill-tree' && (
          <div className="flex-1 overflow-y-auto">
            <SkillTree
              challenges={catalogueChallenges}
              completedIds={completedIds}
              onSelectChallenge={(c) => {
                setSelectedChallenge(c);
                handleTabChange('challenges');
              }}
              selectedDiscipline={selectedDiscipline}
              setSelectedDiscipline={setSelectedDiscipline}
              profile={user}
              stats={stats}
              progress={progress}
              skillTree={skillTree}
            />
          </div>
        )}

        {currentTab === 'badges' && (
          <div className="flex-1 overflow-y-auto">
            <BadgeCollection badges={badges} />
          </div>
        )}

        {currentTab === 'leaderboard' && (
          <div className="flex-1 overflow-y-auto">
            <Leaderboard entries={leaderboard} />
          </div>
        )}
      </main>

      {/* Onboarding / Role Selection Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSubmit={handleOnboardingSubmit}
        currentRole={currentRole}
        currentBranch={currentBranch}
      />
    </div>
  );
}

export default App;

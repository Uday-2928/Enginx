import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { INITIAL_CHALLENGES } from './data/challenges';
import type { AuthSession } from './types';
import { clearAuthSession, setAuthSession } from './services/api';

const TEST_SESSION: AuthSession = {
  access_token: 'test-access-token',
  token_type: 'bearer',
  user: {
    id: 'test-user',
    email: 'learner@example.com',
    name: 'Authenticated Learner',
    primary_role: 'CSE',
    branch: 'CSE',
    specialization: 'Algorithms',
    degree: 'B.Tech',
    year: 3,
    goal: 'Strengthen fundamentals',
    weekly_hours: 6,
    avatar_url: null,
    xp: 0,
    streak_days: 0,
    created_at: '2026-01-01T00:00:00Z',
  },
};

describe('EnginX light UI', () => {
  afterEach(() => {
    cleanup();
    clearAuthSession();
    window.localStorage.removeItem('enginx.editor.draft.test-user.cse-01-two-sum');
    window.localStorage.removeItem('enginx.editor.draft.test-user.ece-matlab-01-sampling');
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    setAuthSession(TEST_SESSION);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('API unavailable')));
  });

  it('renders the light challenge workspace with accessible controls', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /choose a challenge/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /search challenges/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enginx home/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /set up profile/i })).toBeInTheDocument();
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('switches to the skill tree from primary navigation', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /^skill tree$/i }));

    expect(await screen.findByRole('heading', { name: /build your engineering skill tree/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /computer science/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('restores a saved lesson completion after a reload', async () => {
    const user = userEvent.setup();
    const completedLessons = new Set<string>();
    const profile = {
      id: 'demo-user',
      email: 'student@enginx.dev',
      name: 'Alex Rivera',
      primary_role: 'CSE',
      branch: 'CSE',
      specialization: 'Algorithms',
      degree: 'B.Tech',
      year: 3,
      goal: 'Strengthen fundamentals',
      weekly_hours: 6,
      avatar_url: null,
      xp: 0,
      streak_days: 0,
      created_at: '2026-01-01T00:00:00Z',
    };
    const summaries = INITIAL_CHALLENGES.map((challenge) => ({
      id: challenge.id,
      slug: challenge.slug,
      title: challenge.title,
      discipline: challenge.discipline,
      difficulty: challenge.difficulty,
      topic: challenge.topic,
      language: challenge.language,
      xp_reward: challenge.xp_reward,
      tags: challenge.tags,
      order_index: challenge.order_index,
    }));
    const skillTree = {
      nodes: INITIAL_CHALLENGES.map((challenge) => ({
        id: challenge.id,
        title: challenge.title,
        discipline: challenge.discipline,
        topic: challenge.topic,
        difficulty: challenge.difficulty,
        xp: challenge.xp_reward,
        status: 'in_progress',
        order: challenge.order_index,
      })),
      links: [],
    };
    const json = (body: unknown) => new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method || 'GET';

      if (method === 'POST' && url.includes('/api/user/lessons/')) {
        const lessonId = decodeURIComponent(url.split('/api/user/lessons/')[1].replace('/complete', ''));
        completedLessons.add(lessonId);
        return json({
          lesson_id: lessonId,
          completed: true,
          completed_at: '2026-01-01T00:00:00Z',
          already_completed: false,
        });
      }
      if (url.includes('/api/user/lessons/completed')) return json({ lesson_ids: [...completedLessons] });
      if (url.includes('/api/user/profile')) return json(profile);
      if (url.includes('/api/user/progress')) return json({ completed_challenges: [], progress_map: {} });
      if (url.includes('/api/user/stats')) return json({
        user_id: profile.id,
        name: profile.name,
        role: profile.primary_role,
        xp: profile.xp,
        streak_days: profile.streak_days,
        completed_count: 0,
        total_challenges: INITIAL_CHALLENGES.length,
        discipline_breakdown: {},
      });
      if (url.includes('/api/user/skill-tree')) return json(skillTree);
      if (url.includes('/api/badges')) return json([]);
      if (url.includes('/api/leaderboard')) return json([]);
      if (url.includes('/api/submissions/history')) return json({ items: [] });
      if (url.includes('/api/challenges')) return json(summaries);
      return json({});
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    const markComplete = await screen.findByRole('button', { name: /mark complete/i });
    await user.click(markComplete);
    expect(await screen.findByRole('button', { name: /lesson complete/i })).toBeDisabled();

    cleanup();
    render(<App />);
    expect(await screen.findByRole('button', { name: /lesson complete/i })).toBeDisabled();
    expect(fetchMock.mock.calls.some(([input, init]) => (
      String(input).includes('/api/user/lessons/lesson-cse-01-two-sum/complete')
      && init?.method === 'POST'
    ))).toBe(true);
  }, 15000);

  it('restores an unfinished challenge draft after the workspace remounts', async () => {
    const user = userEvent.setup();
    render(<App />);

    const editor = await screen.findByRole('textbox', { name: /code editor for/i });
    await user.clear(editor);
    await user.type(editor, 'draft solution');

    cleanup();
    render(<App />);

    expect(await screen.findByRole('textbox', { name: /code editor for/i })).toHaveValue('draft solution');
  }, 15000);

  it('keeps drafts scoped to the user and challenge while switching into MATLAB', async () => {
    const user = userEvent.setup();
    render(<App />);

    const cseEditor = await screen.findByRole('textbox', { name: /code editor for two sum/i });
    await user.clear(cseEditor);
    await user.type(cseEditor, 'draft cse solution');

    // Switch branch to ECE to access MATLAB
    await user.click(screen.getByRole('button', { name: /current branch:/i }));
    await user.click(screen.getByRole('option', { name: /ece · electrical & computer/i }));

    await user.click(await screen.findByRole('button', { name: /^matlab$/i }));
    const matlabEditor = await screen.findByRole('textbox', { name: /code editor for matlab sampling: calculate the alias frequency/i });
    expect(matlabEditor).not.toHaveValue('draft cse solution');

    // Switch branch back to CSE to restore Two Sum
    await user.click(screen.getByRole('button', { name: /current branch:/i }));
    await user.click(screen.getByRole('option', { name: /cse · computer science/i }));
    await user.click(await screen.findByRole('button', { name: /two sum: hash map optimization/i }));
    expect(await screen.findByRole('textbox', { name: /code editor for two sum/i })).toHaveValue('draft cse solution');
  }, 15000);

  it('strictly isolates challenges and domain filters by selected engineering branch', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Initially in CSE branch:
    expect(screen.getByRole('button', { name: /all cse tracks/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /two sum: hash map optimization/i })).toBeInTheDocument();
    // ECE and other branch challenges should not be visible
    expect(screen.queryByRole('button', { name: /4-bit ripple carry adder/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /single-layer perceptron/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ece · verilog/i })).not.toBeInTheDocument();

    // Switch to ECE branch:
    await user.click(screen.getByRole('button', { name: /current branch:/i }));
    await user.click(screen.getByRole('option', { name: /ece · electrical & computer/i }));

    // Now only ECE tracks and challenges are visible
    expect(await screen.findByRole('button', { name: /all ece tracks/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ece · verilog/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^matlab$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /4-bit ripple carry adder/i })).toBeInTheDocument();

    // CSE and AI challenges are completely excluded
    expect(screen.queryByRole('button', { name: /two sum: hash map optimization/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /single-layer perceptron/i })).not.toBeInTheDocument();
  }, 15000);
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  clearAuthSession,
  createVirtualHardwareProject,
  deleteVirtualHardwareProject,
  duplicateVirtualHardwareProject,
  executeMatlabScript,
  fetchVirtualHardwareProject,
  fetchVirtualHardwareProjects,
  fetchCompletedLessons,
  fetchSubmissionHistory,
  normalizeSubmissionResult,
  setAuthSession,
  submitSolution,
  updateVirtualHardwareProject,
  updateUserProfile,
} from './api';
import type { AuthSession } from '../types';

const TEST_SESSION: AuthSession = {
  access_token: 'test-access-token',
  token_type: 'bearer',
  user: {
    id: 'user-1',
    email: 'learner@example.com',
    name: 'Learner',
    primary_role: 'CSE',
    xp: 0,
    streak_days: 0,
    created_at: '2026-01-01T00:00:00Z',
  },
};

afterEach(() => {
  clearAuthSession();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  setAuthSession(TEST_SESSION);
});

describe('EnginX API contracts', () => {
  it('preserves an explicitly configured API origin', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.test/');
    vi.resetModules();
    const configuredApi = await import('./api');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ lesson_ids: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(configuredApi.fetchCompletedLessons()).resolves.toEqual([]);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.test/api/user/lessons/completed');
  });

  it('keeps unavailable evaluation results neutral and retryable', () => {
    const result = normalizeSubmissionResult(
      {
        id: 'submission-1',
        challenge_id: 'cse-01-two-sum',
        language: 'python',
        verdict: 'AC',
        status: 'unavailable',
        retryable: true,
        xp_awarded: 50,
        new_badges: ['First Pulse'],
      },
      { challenge_id: 'cse-01-two-sum', language: 'python' },
    );

    expect(result.verdict).toBe('UNAVAILABLE');
    expect(result.status).toBe('unavailable');
    expect(result.retryable).toBe(true);
    expect(result.xp_awarded).toBe(0);
    expect(result.new_badges).toEqual([]);
  });

  it('reads durable lesson ids from the explicit completion read endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ lesson_ids: ['lesson-cse-1'] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchCompletedLessons()).resolves.toEqual(['lesson-cse-1']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe('/api/user/lessons/completed');
    expect(new Headers(requestInit.headers).get('Authorization')).toBe('Bearer test-access-token');
  });

  it('reads authenticated submission history without exposing source code', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        items: [{
          id: 'submission-1',
          challenge_id: 'cse-01-two-sum',
          language: 'python',
          verdict: 'UNAVAILABLE',
          status: 'unavailable',
          retryable: true,
          execution_time_ms: 0,
          memory_used_kb: 0,
          output: 'Evaluator offline',
          test_results: [],
          created_at: '2026-01-01T00:00:00Z',
        }],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchSubmissionHistory('cse-01-two-sum', 5)).resolves.toMatchObject([{
      id: 'submission-1',
      verdict: 'UNAVAILABLE',
      status: 'unavailable',
      retryable: true,
    }]);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe('/api/submissions/history?challenge_id=cse-01-two-sum&limit=5');
    expect(new Headers(requestInit.headers).get('Authorization')).toBe('Bearer test-access-token');
  });

  it('uses the persisted profile endpoint and never simulates a failed submission locally', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          id: 'user-1',
          email: 'learner@example.com',
          name: 'Learner',
          primary_role: 'CSE',
          xp: 0,
          streak_days: 0,
          created_at: '2026-01-01T00:00:00Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }),
      )
      .mockRejectedValueOnce(new Error('evaluator offline'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(updateUserProfile({ branch: 'IT' })).resolves.toMatchObject({ id: 'user-1' });
    await expect(submitSolution('cse-01-two-sum', 'def two_sum(): pass', 'python')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      recoverable: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('clears an expired session after a 401 response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Authentication required.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchCompletedLessons()).rejects.toMatchObject({ status: 401 });
    expect(localStorage.getItem('enginx.auth.session')).toBeNull();
    expect(sessionStorage.getItem('enginx.auth.session')).toBeNull();
  });

  it('uses authenticated project persistence and keeps the circuit payload intact', async () => {
    const project = {
      id: 'project-1',
      title: 'LED bench',
      description: '',
      board_profile: 'arduino-uno-r3',
      project_version: 2,
      graph: { boardId: 'arduino-uno-r3', components: [], wires: [] },
      code: 'void setup() {}',
      guided_step: 'build',
      completed_steps: ['build'],
      simulation_config: {},
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(project), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [project] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(createVirtualHardwareProject({ title: 'LED bench', board_profile: 'arduino-uno-r3', graph: project.graph, code: project.code })).resolves.toMatchObject({ id: 'project-1', graph: project.graph });
    await expect(fetchVirtualHardwareProjects()).resolves.toHaveLength(1);
    expect(new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers).get('Authorization')).toBe('Bearer test-access-token');
  });

  it('covers authenticated project retrieve, update, duplicate and delete contracts', async () => {
    const project = {
      id: 'project-1',
      title: 'LED bench',
      description: 'private',
      board_profile: 'arduino-uno-r3',
      project_version: 2,
      graph: { boardId: 'arduino-uno-r3', components: [], wires: [] },
      code: 'void setup() {}',
      guided_step: 'program',
      completed_steps: ['build', 'validate'],
      simulation_config: { runtime: 'restricted Arduino educational runtime' },
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    };
    const duplicate = { ...project, id: 'project-2', title: 'LED bench copy' };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(project), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(project), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(duplicate), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchVirtualHardwareProject('project-1')).resolves.toMatchObject({ id: 'project-1', completed_steps: ['build', 'validate'] });
    await expect(updateVirtualHardwareProject('project-1', { title: 'Renamed' })).resolves.toMatchObject({ title: 'LED bench' });
    await expect(duplicateVirtualHardwareProject('project-1')).resolves.toMatchObject({ id: 'project-2' });
    await expect(deleteVirtualHardwareProject('project-1')).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[1][0]).toContain('/api/virtual-hardware/projects/project-1');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'PATCH' });
    expect(fetchMock.mock.calls[2][0]).toContain('/duplicate');
    expect(fetchMock.mock.calls[3][1]).toMatchObject({ method: 'DELETE' });
  });

  it('normalizes confirmed GNU Octave script responses and generated artifacts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      verdict: 'EXECUTED', status: 'executed', mode: 'script', runtime: 'GNU Octave', total_time_ms: 12,
      stdout: 'ok', stderr: '', output: 'ok', warnings: [], artifacts: [{ filename: 'plot.png', data_uri: 'data:image/png;base64,abc' }], error: null,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    await expect(executeMatlabScript('disp(1);')).resolves.toMatchObject({ verdict: 'EXECUTED', runtime: 'GNU Octave', artifacts: [{ filename: 'plot.png' }] });
  });
});

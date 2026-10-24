import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthScreen } from './AuthScreen';
import { clearAuthSession } from '../../services/api';

afterEach(() => {
  cleanup();
  clearAuthSession();
  vi.unstubAllGlobals();
});

const authResponse = {
  access_token: 'signed-token',
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

describe('authentication screen', () => {
  it('signs in with backend credentials and returns the persisted session', async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(authResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<AuthScreen onAuthenticated={onAuthenticated} />);
    await user.type(screen.getByLabelText(/email address/i), 'learner@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'correct-password');
    await user.click(screen.getAllByRole('button', { name: /^sign in$/i }).find((button) => button.getAttribute('type') === 'submit')!);

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(expect.objectContaining({
      access_token: 'signed-token',
      token_type: 'bearer',
    })));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(localStorage.getItem('enginx.auth.session')).toContain('signed-token');
  });

  it('shows a recoverable credential error without leaving a partial session', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Incorrect email or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<AuthScreen onAuthenticated={vi.fn()} />);
    await user.type(screen.getByLabelText(/email address/i), 'learner@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'wrong-password');
    await user.click(screen.getAllByRole('button', { name: /^sign in$/i }).find((button) => button.getAttribute('type') === 'submit')!);

    expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect email or password/i);
    expect(localStorage.getItem('enginx.auth.session')).toBeNull();
  });
});

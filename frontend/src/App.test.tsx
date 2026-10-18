import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

describe('EnginX light UI', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('API unavailable')));
  });

  it('renders the light challenge workspace with accessible controls', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /choose a challenge/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /search challenges/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enginx home/i })).toBeInTheDocument();
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('switches to the skill tree from primary navigation', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /^skill tree$/i }));

    expect(await screen.findByRole('heading', { name: /build your engineering skill tree/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /computer science/i })).toHaveAttribute('aria-pressed', 'false');
  });
});

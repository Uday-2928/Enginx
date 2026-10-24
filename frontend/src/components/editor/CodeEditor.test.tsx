import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { INITIAL_CHALLENGES } from '../../data/challenges';
import { CodeEditor } from './CodeEditor';

describe('submission outage handling', () => {
  it('never presents an unavailable backend result as accepted and offers retry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const challenge = INITIAL_CHALLENGES[0];

    render(
      <CodeEditor
        challenge={challenge}
        code={challenge.starter_code}
        setCode={vi.fn()}
        onRun={vi.fn()}
        onSubmit={vi.fn()}
        isEvaluating={false}
        submissionResult={{
          id: 'submission-1',
          challenge_id: challenge.id,
          language: challenge.language,
          verdict: 'UNAVAILABLE',
          status: 'unavailable',
          retryable: true,
          execution_time_ms: 0,
          memory_used_kb: 0,
          output: 'Evaluator offline',
          test_results: [],
          xp_awarded: 0,
          new_badges: [],
          created_at: '2026-01-01T00:00:00Z',
        }}
        onRetry={onRetry}
        onResetCode={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('tab', { name: /evaluation unavailable/i }));
    expect(screen.getByText(/evaluation unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText('Accepted')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /retry evaluation/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders persisted attempts in a separate history view', async () => {
    const user = userEvent.setup();
    const challenge = INITIAL_CHALLENGES[0];

    render(
      <CodeEditor
        challenge={challenge}
        code={challenge.starter_code}
        setCode={vi.fn()}
        onRun={vi.fn()}
        onSubmit={vi.fn()}
        isEvaluating={false}
        submissionResult={null}
        submissionHistory={[{
          id: 'submission-history-1',
          challenge_id: challenge.id,
          language: challenge.language,
          verdict: 'WA',
          status: 'evaluated',
          retryable: false,
          execution_time_ms: 12,
          memory_used_kb: 64,
          output: 'Review the failed test case.',
          test_results: [],
          xp_awarded: 0,
          new_badges: [],
          created_at: '2026-01-01T00:00:00Z',
        }]}
        onResetCode={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('tab', { name: /history \(1\)/i }));
    expect(screen.getByRole('heading', { name: /recent submissions for this challenge/i })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: /attempt 1: verdict: wa/i })).toBeInTheDocument();
    expect(screen.getByText(/review the failed test case/i)).toBeInTheDocument();
  });
});

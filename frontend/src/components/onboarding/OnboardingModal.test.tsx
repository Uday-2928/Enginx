import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OnboardingModal } from './OnboardingModal';

afterEach(() => cleanup());

describe('profile onboarding', () => {
  it('offers the extended engineering branch catalogue and submits the exact profile fields', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <OnboardingModal
        isOpen
        onClose={vi.fn()}
        currentRole="CSE"
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByRole('button', { name: /information technology/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /engineering physics/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /other engineering branch/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /civil engineering/i }));
    await user.type(screen.getByLabelText(/specialization/i), 'Structural design');
    await user.selectOptions(screen.getByLabelText(/degree or program/i), 'B.Tech');
    await user.selectOptions(screen.getByLabelText(/current year/i), '3');
    await user.selectOptions(screen.getByLabelText(/learning goal/i), 'Build practical projects');
    await user.clear(screen.getByLabelText(/weekly learning hours/i));
    await user.type(screen.getByLabelText(/weekly learning hours/i), '6');
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      role: 'OTHER',
      branch: 'Civil',
      specialization: 'Structural design',
      degree: 'B.Tech',
      year: 3,
      goal: 'Build practical projects',
      weeklyHours: 6,
    }));
  }, 15000);

  it('shows validation feedback for a custom branch before calling the API', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <OnboardingModal
        isOpen
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole('button', { name: /other engineering branch/i }));
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    expect(screen.getAllByText(/tell us which engineering branch/i).length).toBeGreaterThan(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

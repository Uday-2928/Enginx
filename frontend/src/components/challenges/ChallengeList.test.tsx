import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { INITIAL_CHALLENGES } from '../../data/challenges';
import type { ChallengeFilter } from '../../types';
import { ChallengeList } from './ChallengeList';

describe('ChallengeList MATLAB and ECE filters', () => {
  it('exposes aggregate MATLAB plus Signals, DSP and Communications controls', async () => {
    const user = userEvent.setup();
    const setFilter = vi.fn<(filter: ChallengeFilter) => void>();

    render(
      <ChallengeList
        challenges={INITIAL_CHALLENGES}
        selectedChallengeId={INITIAL_CHALLENGES[0].id}
        onSelectChallenge={vi.fn()}
        completedIds={[]}
        selectedDiscipline="all"
        setSelectedDiscipline={setFilter}
        searchQuery=""
        setSearchQuery={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /^matlab$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ece · signals/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ece · dsp/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ece · communications/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ece · dsp/i }));
    expect(setFilter).toHaveBeenCalledWith('ece-dsp');
  });
});

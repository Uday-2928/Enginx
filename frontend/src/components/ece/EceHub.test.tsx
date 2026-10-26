import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Challenge, EcePreferences, User } from '../../types';
import { INITIAL_CHALLENGES } from '../../data/challenges';
import { DEFAULT_ECE_PREFERENCES } from '../../data/eceHub';
import { EceHub } from './EceHub';

afterEach(cleanup);

const ECE_USER: User = {
  id: 'ece-user',
  email: 'ece@example.com',
  name: 'ECE Learner',
  primary_role: 'ECE',
  branch: 'VLSI',
  specialization: 'RTL design',
  degree: 'B.Tech',
  year: 3,
  goal: 'Build a verification portfolio',
  weekly_hours: 8,
  avatar_url: null,
  xp: 0,
  streak_days: 0,
  created_at: '2026-01-01T00:00:00Z',
  ece_preferences: DEFAULT_ECE_PREFERENCES,
};

const ECE_CHALLENGES = INITIAL_CHALLENGES.filter((challenge) => challenge.discipline.startsWith('ece-'));

function renderHub(
  onSavePreferences = vi.fn<(preferences: EcePreferences) => Promise<void>>().mockResolvedValue(undefined),
  onCompleteLesson = vi.fn<(lessonId: string) => Promise<void>>().mockResolvedValue(undefined),
) {
  return render(
    <EceHub
      user={ECE_USER}
      stats={{ user_id: ECE_USER.id, name: ECE_USER.name, role: 'ECE', xp: 0, streak_days: 0, completed_count: 0, total_challenges: ECE_CHALLENGES.length, discipline_breakdown: {} }}
      progress={{ completed_challenges: [], progress_map: {} }}
      completedLessonIds={[]}
      skillTree={null}
      challenges={ECE_CHALLENGES as Challenge[]}
      onOpenChallenge={vi.fn()}
      onOpenProfile={vi.fn()}
      onSavePreferences={onSavePreferences}
      onCompleteLesson={onCompleteLesson}
    />,
  );
}

describe('ECE Engineering Hub', () => {
  it('renders an evidence-aware dashboard and navigates to the roadmap', async () => {
    const user = userEvent.setup();
    const onCompleteLesson = vi.fn<(lessonId: string) => Promise<void>>().mockResolvedValue(undefined);
    renderHub(undefined, onCompleteLesson);

    expect(screen.getByRole('heading', { name: /ece's ece workspace/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /your verified learning statistics/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^learning roadmaps/i }));
    expect(screen.getByRole('heading', { name: /learning roadmaps/i })).toBeInTheDocument();
    expect(screen.getAllByText('VLSI design engineer').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /from truth tables to rtl/i })).toBeInTheDocument();
    expect(screen.getByText(/translate a boolean requirement/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /mark complete/i }));
    expect(onCompleteLesson).toHaveBeenCalledWith('lesson-content-verilog-digital-logic');
    expect(screen.getByText(/locked stages list the prerequisite/i)).toBeInTheDocument();
  });

  it('calculates a unit-aware RC time constant and persists preference edits', async () => {
    const user = userEvent.setup();
    const onSavePreferences = vi.fn<(preferences: EcePreferences) => Promise<void>>().mockResolvedValue(undefined);
    renderHub(onSavePreferences);

    await user.click(screen.getByRole('button', { name: /^engineering calculations/i }));
    await user.click(screen.getByRole('button', { name: /rc time constant/i }));
    expect(screen.getByText('Time constant')).toBeInTheDocument();
    expect(screen.getByText(/1.000 ms/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ece preferences/i }));
    await user.selectOptions(screen.getByLabelText(/current year/i), '4');
    await user.click(screen.getByRole('button', { name: /save ece preferences/i }));

    expect(onSavePreferences).toHaveBeenCalledWith(expect.objectContaining({ current_year: 4 }));
  });

  it('opens the hardware fundamentals roadmap and saves a gate lesson', async () => {
    const user = userEvent.setup();
    const onCompleteLesson = vi.fn<(lessonId: string) => Promise<void>>().mockResolvedValue(undefined);
    renderHub(undefined, onCompleteLesson);

    await user.click(screen.getByRole('button', { name: /^hardware fundamentals/i }));
    expect(screen.getByRole('heading', { name: /from electrical signals to logic gates/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /and gate: all conditions must be true/i }));
    await user.click(screen.getByRole('button', { name: /mark complete/i }));
    expect(onCompleteLesson).toHaveBeenCalledWith('lesson-content-fundamentals-and-gate');
  });

  it('changes modeled outputs in the half-adder playground', async () => {
    const user = userEvent.setup();
    renderHub();

    await user.click(screen.getByRole('button', { name: /^logic gate playground/i }));
    await user.selectOptions(screen.getByLabelText(/starter circuit/i), 'half-adder');
    expect(screen.getByText(/outputs: sum=0 · carry=0/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /toggle input a/i }));
    await user.click(screen.getByRole('button', { name: /toggle input b/i }));
    expect(screen.getByText(/outputs: sum=0 · carry=1/i)).toBeInTheDocument();
  });

  it('opens the integrated Signals & Systems lab with an honest runtime boundary', async () => {
    const user = userEvent.setup();
    renderHub();

    await user.click(screen.getByRole('button', { name: /^signals & systems$/i }));

    expect(screen.getByRole('heading', { name: /explore signals, systems and sampling/i })).toBeInTheDocument();
    expect(screen.getByText(/challenge runner uses gnu octave only/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /matlab sampling: calculate the alias frequency/i })).toBeInTheDocument();
  });

  it('opens the connection-first Virtual Hardware Lab without claiming arbitrary firmware execution', async () => {
    const user = userEvent.setup();
    renderHub();

    await user.click(screen.getByRole('button', { name: /virtual hardware lab/i }));

    expect(screen.getByRole('heading', { name: /build circuits\. connect hardware\. write firmware\. see it work/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /light an led/i })).toBeInTheDocument();
    expect(screen.getByText(/does not claim arbitrary arduino/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check connections/i })).toBeInTheDocument();
  });
});

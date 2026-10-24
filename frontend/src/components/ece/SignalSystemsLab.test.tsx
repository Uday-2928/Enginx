import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_CHALLENGES } from '../../data/challenges';
import { SIGNAL_LAB_STORAGE_KEY } from '../../data/signalLab';
import { SignalSystemsLab } from './SignalSystemsLab';
import * as api from '../../services/api';

vi.mock('../../services/api', async () => {
  const actual = await vi.importActual<typeof import('../../services/api')>('../../services/api');
  return { ...actual, executeMatlabScript: vi.fn() };
});

afterEach(() => {
  cleanup();
  window.localStorage.removeItem(SIGNAL_LAB_STORAGE_KEY);
});

describe('SignalSystemsLab', () => {
  it('updates the deterministic plot model and preserves the lab state', async () => {
    const user = userEvent.setup();
    render(<SignalSystemsLab challenges={INITIAL_CHALLENGES} onOpenChallenge={vi.fn()} />);

    const frequency = screen.getByLabelText(/frequency \(hz\)/i);
    await user.clear(frequency);
    await user.type(frequency, '2000');
    await user.click(screen.getByRole('button', { name: /run browser model/i }));
    await user.click(screen.getByRole('button', { name: /save lab state/i }));

    expect(screen.getByText(/saved/i)).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(SIGNAL_LAB_STORAGE_KEY) || '{}')).toMatchObject({ frequency: 2000 });
    expect(screen.getByRole('img', { name: /signal plot/i })).toBeInTheDocument();
  });

  it('switches into the DSP module and exposes the FFT challenge when available', async () => {
    const user = userEvent.setup();
    const onOpenChallenge = vi.fn();
    const challenges = INITIAL_CHALLENGES.filter((challenge) => challenge.id === 'ece-matlab-03-fft-spectrum');
    render(<SignalSystemsLab initialModule="dsp" challenges={challenges} onOpenChallenge={onOpenChallenge} />);

    expect(screen.getByRole('heading', { name: /inspect spectra and discrete-time operations/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /matlab dsp: fft bin spacing/i }));
    expect(screen.getByRole('button', { name: /matlab dsp: fft bin spacing/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /matlab dsp: fft bin spacing/i }));
    expect(onOpenChallenge).toHaveBeenCalledWith(expect.objectContaining({ id: 'ece-matlab-03-fft-spectrum' }));
  });

  it('shows confirmed GNU Octave output and generated plot artifacts only after the execution service returns', async () => {
    const user = userEvent.setup();
    vi.mocked(api.executeMatlabScript).mockResolvedValue({
      verdict: 'EXECUTED',
      status: 'executed',
      mode: 'script',
      runtime: 'GNU Octave',
      runtime_version: 'GNU Octave, version 8.4.0',
      total_time_ms: 18,
      stdout: 'actual output',
      stderr: '',
      output: 'actual output',
      warnings: [],
      artifacts: [{ kind: 'plot', filename: 'plot.png', mime_type: 'image/png', data_uri: 'data:image/png;base64,abc', size_bytes: 3 }],
      error: null,
    });
    render(<SignalSystemsLab challenges={INITIAL_CHALLENGES} onOpenChallenge={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /run gnu octave/i }));

    expect(await screen.findByText(/gnu octave, version 8\.4\.0/i)).toBeInTheDocument();
    expect(screen.getByText('actual output')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /plot\.png/i })).toBeInTheDocument();
    expect(api.executeMatlabScript).toHaveBeenCalledWith(expect.stringContaining('fs = 8000'));
  });
});

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthSession, VirtualHardwareProject, VirtualHardwareProjectSummary } from '../../types';
import { VirtualHardwareLab } from './VirtualHardwareLab';
import * as api from '../../services/api';

vi.mock('../../services/api', async () => {
  const actual = await vi.importActual<typeof import('../../services/api')>('../../services/api');
  return {
    ...actual,
    getAuthSession: vi.fn(),
    fetchVirtualHardwareProjects: vi.fn(),
    fetchVirtualHardwareProject: vi.fn(),
    createVirtualHardwareProject: vi.fn(),
    updateVirtualHardwareProject: vi.fn(),
    duplicateVirtualHardwareProject: vi.fn(),
    deleteVirtualHardwareProject: vi.fn(),
  };
});

const SESSION: AuthSession = {
  access_token: 'server-token',
  token_type: 'bearer',
  user: {
    id: 'server-user',
    email: 'server@example.com',
    name: 'Server User',
    primary_role: 'ECE',
    xp: 0,
    streak_days: 0,
    created_at: '2026-01-01T00:00:00Z',
  },
};

const SUMMARY: VirtualHardwareProjectSummary = {
  id: 'project-1',
  title: 'Saved LED bench',
  description: 'private',
  board_profile: 'arduino-uno-r3',
  project_version: 2,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

const PROJECT: VirtualHardwareProject = {
  ...SUMMARY,
  graph: { boardId: 'arduino-uno-r3', components: [], wires: [], selectedId: null },
  code: 'void setup() {}\nvoid loop() {}',
  guided_step: 'build',
  completed_steps: [],
  simulation_config: { runtime: 'restricted Arduino educational runtime' },
};

describe('Virtual Hardware Lab authenticated persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(api.getAuthSession).mockReturnValue(SESSION);
    vi.mocked(api.fetchVirtualHardwareProjects).mockResolvedValue([SUMMARY]);
    vi.mocked(api.fetchVirtualHardwareProject).mockResolvedValue(PROJECT);
    vi.mocked(api.createVirtualHardwareProject).mockResolvedValue(PROJECT);
    vi.mocked(api.updateVirtualHardwareProject).mockResolvedValue(PROJECT);
    vi.mocked(api.duplicateVirtualHardwareProject).mockResolvedValue({ ...PROJECT, id: 'project-2', title: 'Saved LED bench copy' });
    vi.mocked(api.deleteVirtualHardwareProject).mockResolvedValue();
  });

  afterEach(() => cleanup());

  it('saves to the authenticated API, then supports rename, duplicate and delete', async () => {
    const user = userEvent.setup();
    render(<VirtualHardwareLab userId="server-user" />);

    await waitFor(() => expect(api.fetchVirtualHardwareProjects).toHaveBeenCalled());
    const saveButton = screen.getByRole('button', { name: /save project/i });
    await waitFor(() => expect(saveButton).not.toBeDisabled());
    await user.click(saveButton);
    await waitFor(() => expect(api.createVirtualHardwareProject).toHaveBeenCalledWith(expect.objectContaining({ board_profile: 'arduino-uno-r3', completed_steps: [] })));
    expect(screen.getByText(/authenticated enginx account/i)).toBeInTheDocument();

    const title = screen.getByRole('textbox', { name: /project name/i });
    await user.clear(title);
    await user.type(title, 'Renamed LED bench');
    await waitFor(() => expect(screen.getByRole('button', { name: /^rename$/i })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /^rename$/i }));
    await waitFor(() => expect(api.updateVirtualHardwareProject).toHaveBeenCalledWith('project-1', { title: 'Renamed LED bench' }));

    await user.click(screen.getByRole('button', { name: /duplicate/i }));
    await waitFor(() => expect(api.duplicateVirtualHardwareProject).toHaveBeenCalledWith('project-1'));
    await user.click(screen.getByRole('button', { name: /delete server copy/i }));
    await waitFor(() => expect(api.deleteVirtualHardwareProject).toHaveBeenCalledWith('project-2'));
  });

  it('loads an account project and updates the local fallback for offline continuity', async () => {
    const user = userEvent.setup();
    render(<VirtualHardwareLab userId="server-user" />);

    await waitFor(() => expect(screen.getByRole('combobox', { name: /load an account project/i })).toBeInTheDocument());
    await user.selectOptions(screen.getByRole('combobox', { name: /load an account project/i }), 'project-1');
    await waitFor(() => expect(api.fetchVirtualHardwareProject).toHaveBeenCalledWith('project-1'));
    expect(screen.getByText(/loaded saved led bench from your account/i)).toBeInTheDocument();
    expect(window.localStorage.getItem('enginx.virtual-hardware.project.server-user')).toContain('Saved LED bench');
  });
});

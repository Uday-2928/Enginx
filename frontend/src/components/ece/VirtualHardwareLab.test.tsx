import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VirtualHardwareLab } from './VirtualHardwareLab';

async function connectStarterLed(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /connect led anode/i }));
  await user.click(screen.getByRole('button', { name: /connect resistor terminal 1/i }));
  await user.click(screen.getByRole('button', { name: /connect resistor terminal 2/i }));
  await user.click(screen.getByRole('button', { name: /connect board d8/i }));
  await user.click(screen.getByRole('button', { name: /connect led cathode/i }));
  await user.click(screen.getByRole('button', { name: /connect board gnd/i }));
}

describe('Virtual Hardware Lab', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('opens with the non-WebGL fallback and exposes the accessible connection surface', () => {
    render(<VirtualHardwareLab userId="anonymous" />);

    expect(screen.getByRole('heading', { name: /build circuits\. connect hardware/i })).toBeInTheDocument();
    expect(screen.getByText(/3d preview unavailable in this browser/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect board d8/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check connections/i })).toBeInTheDocument();
  });

  it('places components, switches boards and clears wires to protect pin mappings', async () => {
    const user = userEvent.setup();
    render(<VirtualHardwareLab userId="anonymous" />);

    await user.click(screen.getByRole('button', { name: /add led/i }));
    expect(screen.getByText(/4 components · 0 wires/i)).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: /board profile/i }), 'esp32-devkit-v1');
    expect(screen.getByText(/existing wires were cleared/i)).toBeInTheDocument();
    expect(screen.getByText(/esp32 devkit v1 · 4 components · 0 wires/i)).toBeInTheDocument();
  });

  it('exposes a defined button-input control instead of treating the button as decorative', async () => {
    const user = userEvent.setup();
    render(<VirtualHardwareLab userId="anonymous" />);

    await user.click(screen.getByRole('button', { name: /add push button/i }));
    await user.click(screen.getByRole('button', { name: /press button-1/i }));
    expect(screen.getByText(/pressed button-1/i)).toBeInTheDocument();
  });

  it('creates and validates the guided circuit, then makes LED output code-dependent', async () => {
    const user = userEvent.setup();
    render(<VirtualHardwareLab userId="anonymous" />);

    await connectStarterLed(user);
    await user.click(screen.getByRole('button', { name: /check connections/i }));
    expect(screen.getByText(/circuit validated/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /run simulation/i }));
    expect(screen.getByText(/on · d8 high/i)).toBeInTheDocument();

    const editor = screen.getByRole('textbox', { name: /virtual hardware firmware editor/i });
    await user.clear(editor);
    fireEvent.change(editor, { target: { value: 'void setup() { pinMode(8, OUTPUT); }\nvoid loop() { digitalWrite(8, LOW); }' } });
    await user.click(screen.getByRole('button', { name: /run simulation/i }));
    const console = screen.getByText(/simulation console/i).closest('section');
    expect(console).not.toBeNull();
    expect(within(console as HTMLElement).getByText(/^off$/i)).toBeInTheDocument();
  });

  it('reconnects an existing wire through the accessible workbench controls', async () => {
    const user = userEvent.setup();
    render(<VirtualHardwareLab userId="anonymous" />);

    await connectStarterLed(user);
    await user.click(screen.getByRole('button', { name: /reconnect wire anode to 1/i }));
    expect(screen.getByText(/reconnect started from anode/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /connect board d7/i }));

    expect(screen.getByText(/reconnected anode to d7/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reconnect wire anode to d7/i })).toBeInTheDocument();
  });

  it('restores saved validation state so a persisted project can run again', async () => {
    const user = userEvent.setup();
    const first = render(<VirtualHardwareLab userId="restore-user" />);

    await connectStarterLed(user);
    await user.click(screen.getByRole('button', { name: /check connections/i }));
    const title = screen.getByRole('textbox', { name: /project name/i });
    await user.clear(title);
    await user.type(title, 'Persisted LED bench');
    await user.click(screen.getByRole('button', { name: /save project/i }));

    first.unmount();
    render(<VirtualHardwareLab userId="restore-user" />);
    await waitFor(() => expect(screen.getByText(/restored your saved virtual workbench/i)).toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: /project name/i })).toHaveValue('Persisted LED bench');
    expect(screen.getByRole('button', { name: /run simulation/i })).not.toBeDisabled();
  });

  it('supports keyboard cancellation and local save/restore without claiming a server save', async () => {
    const user = userEvent.setup();
    const first = render(<VirtualHardwareLab userId="offline-user" />);

    await user.click(screen.getByRole('button', { name: /connect led anode/i }));
    expect(screen.getByText(/wire from anode/i)).toBeInTheDocument();
    fireEvent.keyDown(screen.getByLabelText(/three-dimensional virtual electronics workbench/i), { key: 'Escape' });
    expect(screen.getByText(/select a pin to wire/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /save project/i }));
    expect(screen.getByText(/saved locally on this device/i)).toBeInTheDocument();

    first.unmount();
    render(<VirtualHardwareLab userId="offline-user" />);
    await waitFor(() => expect(screen.getByText(/restored your saved virtual workbench/i)).toBeInTheDocument());
  });
});

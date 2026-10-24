import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EDITOR_SETTINGS_STORAGE_KEY } from './monacoLanguage';
import { ProfessionalCodeEditor } from './ProfessionalCodeEditor';

describe('ProfessionalCodeEditor', () => {
  beforeEach(() => {
    window.localStorage.removeItem(EDITOR_SETTINGS_STORAGE_KEY);
  });

  afterEach(() => {
    cleanup();
    window.localStorage.removeItem(EDITOR_SETTINGS_STORAGE_KEY);
  });

  it('keeps the challenge language synchronized with the editor tokenizer', () => {
    const { rerender } = render(
      <ProfessionalCodeEditor
        value={'int main(void) { return 0; }'}
        onChange={() => undefined}
        language="c"
        path="c-challenge"
        ariaLabel="C code editor"
      />,
    );

    expect(screen.getByRole('textbox', { name: /c code editor/i })).toHaveAttribute('data-editor-language', 'c');

    rerender(
      <ProfessionalCodeEditor
        value={'module demo(input wire a, output wire y); assign y = a; endmodule'}
        onChange={() => undefined}
        language="systemverilog"
        path="sv-challenge"
        ariaLabel="SystemVerilog code editor"
      />,
    );

    expect(screen.getByRole('textbox', { name: /systemverilog code editor/i })).toHaveAttribute('data-editor-language', 'systemverilog');
  });

  it('persists theme, wrapping and font-size settings for the next editor session', async () => {
    const user = userEvent.setup();
    render(
      <ProfessionalCodeEditor
        value="// preserve my draft"
        onChange={() => undefined}
        language="verilog"
        path="verilog-challenge"
        ariaLabel="Verilog code editor"
      />,
    );

    await user.selectOptions(screen.getByRole('combobox', { name: /editor theme/i }), 'enginx-light');
    await user.click(screen.getByRole('button', { name: /toggle word wrap/i }));
    await user.click(screen.getByRole('button', { name: /increase editor font size/i }));

    const saved = JSON.parse(window.localStorage.getItem(EDITOR_SETTINGS_STORAGE_KEY) || '{}') as Record<string, unknown>;
    expect(saved.theme).toBe('enginx-light');
    expect(saved.wordWrap).toBe('on');
    expect(saved.fontSize).toBe(15);
  });
});

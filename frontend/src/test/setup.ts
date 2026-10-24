import '@testing-library/jest-dom/vitest';
import React from 'react';
import { vi } from 'vitest';

// Monaco relies on browser workers and layout APIs that jsdom does not provide.
// Keep the production editor intact while giving component tests a controlled,
// accessible editing surface with the same value/change contract.
vi.mock('@monaco-editor/react', () => ({
  default: (props: { value?: string; language?: string; onChange?: (value: string) => void; options?: { ariaLabel?: string } }) => React.createElement('textarea', {
    value: props.value ?? '',
    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => props.onChange?.(event.target.value),
    'aria-label': props.options?.ariaLabel ?? 'Monaco code editor',
    'data-editor-language': props.language,
    spellCheck: false,
  }),
  loader: { config: vi.fn() },
}));

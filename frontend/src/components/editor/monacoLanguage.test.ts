import { describe, expect, it, vi } from 'vitest';
import { configureMonaco, parseCompilerMarkers } from './monacoLanguage';

function createMonacoProbe() {
  const tokenProviders = new Map<string, any>();
  const monaco = {
    languages: {
      getLanguages: () => [],
      register: vi.fn(),
      setMonarchTokensProvider: (id: string, configuration: unknown) => tokenProviders.set(id, configuration),
      setLanguageConfiguration: vi.fn(),
      registerCompletionItemProvider: vi.fn(),
      registerHoverProvider: vi.fn(),
      CompletionItemKind: { Keyword: 17, TypeParameter: 24, Variable: 4, Function: 1 },
      IndentAction: { Indent: 1, Outdent: 2 },
    },
    editor: {
      defineTheme: vi.fn(),
      setModelMarkers: vi.fn(),
    },
    Range: class {
      constructor(public startLineNumber: number, public startColumn: number, public endLineNumber: number, public endColumn: number) {}
    },
  };
  return { monaco, tokenProviders };
}

describe('EnginX Monaco language configuration', () => {
  it('registers distinct C, Verilog and SystemVerilog grammars', () => {
    const { monaco, tokenProviders } = createMonacoProbe();
    configureMonaco(monaco as never);

    expect(tokenProviders.get('c').types).toContain('uint32_t');
    expect(tokenProviders.get('c').tokenizer.root.some((rule: unknown[]) => String(rule[1]).includes('directive'))).toBe(true);
    expect(tokenProviders.get('verilog').keywords).toContain('always_ff');
    expect(tokenProviders.get('verilog').keywords).not.toContain('interface');
    expect(tokenProviders.get('systemverilog').keywords).toEqual(expect.arrayContaining(['logic', 'interface', 'assert', 'class']));
    expect(tokenProviders.get('matlab').keywords).toEqual(expect.arrayContaining(['function', 'end', 'if', 'for', 'switch', 'classdef']));
    expect(tokenProviders.get('matlab').builtins).toEqual(expect.arrayContaining(['fft', 'conv', 'plot', 'stem', 'linspace']));
    expect(monaco.editor.defineTheme).toHaveBeenCalledWith('enginx-dark', expect.anything());
    expect(monaco.editor.defineTheme).toHaveBeenCalledWith('enginx-light', expect.anything());

    // Validate that every language's brackets array strictly adheres to Monaco's Monarch contract:
    // { open: string, close: string, token: string }
    ['c', 'cpp', 'embedded-c', 'verilog', 'systemverilog', 'matlab'].forEach((lang) => {
      const config = tokenProviders.get(lang);
      expect(config).toBeDefined();
      if (config.brackets) {
        expect(Array.isArray(config.brackets)).toBe(true);
        config.brackets.forEach((bracket: any) => {
          expect(typeof bracket.open).toBe('string');
          expect(typeof bracket.close).toBe('string');
          expect(typeof bracket.token).toBe('string');
          expect(bracket.open.length).toBeGreaterThan(0);
          expect(bracket.close.length).toBeGreaterThan(0);
          expect(bracket.token.length).toBeGreaterThan(0);
        });
      }
    });
  });

  it('only creates markers from compiler diagnostics that include a source location', () => {
    expect(parseCompilerMarkers('dut.v:12:7: syntax error near "end"', 'CE')).toEqual([
      expect.objectContaining({ startLineNumber: 12, startColumn: 7, severity: 8 }),
    ]);
    expect(parseCompilerMarkers('Evaluation failed without a source location', 'WA')).toEqual([]);
  });
});

import type { Monaco } from '@monaco-editor/react';

export type EditorTheme = 'enginx-dark' | 'enginx-light';
export type EditorWordWrap = 'off' | 'on';

export interface EditorSettings {
  theme: EditorTheme;
  fontSize: number;
  tabSize: number;
  wordWrap: EditorWordWrap;
  minimap: boolean;
}

export const EDITOR_SETTINGS_STORAGE_KEY = 'enginx.editor.settings';

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  theme: 'enginx-dark',
  fontSize: 14,
  tabSize: 4,
  wordWrap: 'off',
  minimap: false,
};

export type EditorLanguage = 'c' | 'cpp' | 'python' | 'javascript' | 'typescript' | 'verilog' | 'systemverilog' | 'matlab' | 'plaintext';

export function editorLanguageForChallenge(language: string): EditorLanguage {
  switch (language.trim().toLowerCase()) {
    case 'c':
    case 'embedded-c':
    case 'embedded c':
      return 'c';
    case 'cpp':
    case 'c++':
      return 'cpp';
    case 'systemverilog':
    case 'system-verilog':
    case 'sv':
      return 'systemverilog';
    case 'verilog':
    case 'verilog-hdl':
      return 'verilog';
    case 'python':
    case 'py':
      return 'python';
    case 'javascript':
    case 'js':
      return 'javascript';
    case 'typescript':
    case 'ts':
      return 'typescript';
    case 'matlab':
    case 'octave':
    case 'm':
      return 'matlab';
    default:
      return 'plaintext';
  }
}

export function editorLanguageLabel(language: string): string {
  switch (editorLanguageForChallenge(language)) {
    case 'c': return 'Embedded C · C99 / GCC';
    case 'cpp': return 'C++ · C++20';
    case 'python': return 'Python · 3.x';
    case 'javascript': return 'JavaScript · ES2022';
    case 'typescript': return 'TypeScript · 5.x';
    case 'systemverilog': return 'SystemVerilog · IEEE 1800';
    case 'verilog': return 'Verilog HDL · IEEE 1364';
    case 'matlab': return 'MATLAB syntax · GNU Octave when available';
    case 'plaintext': return language.toUpperCase();
  }
}

export function loadEditorSettings(): EditorSettings {
  if (typeof window === 'undefined') return DEFAULT_EDITOR_SETTINGS;
  try {
    const raw = window.localStorage.getItem(EDITOR_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_EDITOR_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<EditorSettings>;
    return {
      ...DEFAULT_EDITOR_SETTINGS,
      ...parsed,
      theme: parsed.theme === 'enginx-light' ? 'enginx-light' : 'enginx-dark',
      fontSize: clampFontSize(parsed.fontSize ?? DEFAULT_EDITOR_SETTINGS.fontSize),
      tabSize: [2, 4, 8].includes(parsed.tabSize ?? DEFAULT_EDITOR_SETTINGS.tabSize)
        ? parsed.tabSize as number
        : DEFAULT_EDITOR_SETTINGS.tabSize,
      wordWrap: parsed.wordWrap === 'on' ? 'on' : 'off',
      minimap: parsed.minimap === true,
    };
  } catch {
    return DEFAULT_EDITOR_SETTINGS;
  }
}

export function saveEditorSettings(settings: EditorSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(EDITOR_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be disabled by a browser privacy mode; editor settings are optional.
  }
}

export function clampFontSize(fontSize: number): number {
  return Math.min(24, Math.max(11, Math.round(fontSize)));
}

const C_KEYWORDS = [
  'if', 'else', 'while', 'do', 'for', 'switch', 'case', 'default', 'break', 'continue',
  'return', 'goto', 'sizeof', 'typedef', 'struct', 'union', 'enum', 'const', 'volatile',
  'static', 'extern', 'inline', 'register', 'restrict', 'signed', 'unsigned', 'short',
  'long', 'auto', 'sizeof', '_Alignas', '_Alignof', '_Atomic', '_Generic', '_Noreturn',
  '_Static_assert', '_Thread_local', 'namespace', 'using', 'class', 'public', 'private',
  'protected', 'template', 'constexpr', 'nullptr', 'new', 'delete', 'this', 'try', 'catch',
  'throw', 'virtual', 'override', 'final', 'operator', 'true', 'false',
];

const C_TYPES = [
  'void', 'char', 'wchar_t', 'char8_t', 'char16_t', 'char32_t', 'bool', 'int', 'float',
  'double', 'size_t', 'ptrdiff_t', 'int8_t', 'int16_t', 'int32_t', 'int64_t', 'uint8_t',
  'uint16_t', 'uint32_t', 'uint64_t', 'intptr_t', 'uintptr_t', 'FILE', 'NULL',
];

const C_CONSTANTS = ['NULL', 'EOF', 'EXIT_SUCCESS', 'EXIT_FAILURE', 'true', 'false'];

const VERILOG_KEYWORDS = [
  'module', 'endmodule', 'input', 'output', 'inout', 'wire', 'tri', 'wand', 'wor', 'reg',
  'logic', 'assign', 'always', 'always_comb', 'always_ff', 'always_latch', 'initial',
  'posedge', 'negedge', 'begin', 'end', 'if', 'else', 'case', 'casex', 'casez', 'endcase',
  'for', 'forever', 'while', 'repeat', 'generate', 'endgenerate', 'genvar', 'parameter',
  'localparam', 'function', 'endfunction', 'task', 'endtask', 'integer', 'time', 'real',
  'event', 'wait', 'fork', 'join', 'disable', 'or', 'and', 'not', 'buf', 'nand', 'nor',
  'xor', 'xnor', 'pullup', 'pulldown', 'specify', 'endspecify', 'primitive', 'endprimitive',
  'table', 'endtable', 'force', 'release', 'deassign', 'assign', 'deassign', 'macromodule',
];

const SYSTEMVERILOG_KEYWORDS = [
  ...VERILOG_KEYWORDS,
  'bit', 'byte', 'shortint', 'longint', 'int', 'integer', 'typedef', 'enum', 'struct',
  'union', 'interface', 'endinterface', 'modport', 'program', 'endprogram', 'package',
  'endpackage', 'import', 'export', 'class', 'endclass', 'extends', 'virtual', 'pure',
  'rand', 'randc', 'constraint', 'solve', 'before', 'assert', 'assume', 'cover', 'property',
  'endproperty', 'sequence', 'endsequence', 'clocking', 'endclocking', 'bins', 'illegal_bins',
  'ignore_bins', 'cross', 'with', 'dist', 'inside', 'unique', 'priority', 'return', 'this',
  'super', 'new', 'null', 'logic', 'always_comb', 'always_ff', 'always_latch',
];

const MATLAB_KEYWORDS = [
  'if', 'else', 'elseif', 'end', 'for', 'while', 'parfor', 'switch', 'case', 'otherwise',
  'try', 'catch', 'return', 'break', 'continue', 'function', 'global', 'persistent',
  'classdef', 'properties', 'methods', 'events', 'enumeration', 'arguments', 'import',
  'spmd', 'true', 'false',
];

const MATLAB_TYPES = ['double', 'single', 'logical', 'char', 'string', 'int8', 'int16', 'int32', 'int64', 'uint8', 'uint16', 'uint32', 'uint64'];

const MATLAB_BUILTINS = [
  'abs', 'angle', 'conv', 'cos', 'diff', 'disp', 'exp', 'fft', 'fftshift', 'filter', 'find',
  'ifft', 'ifftshift', 'imshow', 'impulse', 'length', 'linspace', 'log10', 'mean', 'meshgrid',
  'ones', 'plot', 'stem', 'subplot', 'title', 'xlabel', 'ylabel', 'legend', 'grid', 'hold',
  'rand', 'randi', 'real', 'imag', 'reshape', 'roots', 'sin', 'size', 'sqrt', 'sum', 'text',
  'xlim', 'ylim', 'zeros', 'zplane', 'freqz', 'hamming', 'hann', 'rectwin', 'erfc', 'bitand',
  'bitshift', 'mod', 'round', 'floor', 'ceil',
];

const MATLAB_CONSTANTS = ['pi', 'Inf', 'NaN', 'eps', 'i', 'j', 'true', 'false'];

function identifierBeforeCallPattern(words: string[]): RegExp {
  const escapedWords = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return new RegExp(`(?!(?:${escapedWords})\\b)[a-zA-Z_]\\w*(?=\\s*\\()`);
}

const C_FUNCTION_PATTERN = identifierBeforeCallPattern([...C_KEYWORDS, ...C_TYPES]);
const VERILOG_FUNCTION_PATTERN = identifierBeforeCallPattern(SYSTEMVERILOG_KEYWORDS);
const MATLAB_FUNCTION_PATTERN = identifierBeforeCallPattern([...MATLAB_KEYWORDS, ...MATLAB_TYPES]);

const C_LANGUAGE_CONFIGURATION = {
  defaultToken: 'identifier',
  tokenPostfix: '.c',
  brackets: [
    { open: '{', close: '}', token: 'delimiter.curly' },
    { open: '[', close: ']', token: 'delimiter.square' },
    { open: '(', close: ')', token: 'delimiter.parenthesis' },
  ],
  keywords: C_KEYWORDS,
  types: C_TYPES,
  constants: C_CONSTANTS,
  tokenizer: {
    root: [
      [/[ \t\r\n]+/, 'white'],
      [/\/\/.*$/, 'comment'],
      [/\/\*/, 'comment', '@comment'],
      [/#\s*define\b/, 'keyword.directive', '@macroDeclaration'],
      [/#\s*[a-zA-Z_]\w*/, 'keyword.directive'],
      [C_FUNCTION_PATTERN, 'function'],
      [/[a-zA-Z_]\w*/, { cases: { '@keywords': 'keyword', '@types': 'type', '@constants': 'constant', '@default': 'identifier' } }],
      [/(0[xX][0-9a-fA-F']+|0[bB][01']+|0[0-7']+|[0-9']+(?:\.[0-9']+)?(?:[eE][+-]?[0-9']+)?[uUlLfF]*)/, 'number'],
      [/["].*?[^\\]["]/, 'string'],
      [/'([^'\\]|\\.)*'/, 'string'],
      [/[{}()[\]]/, '@brackets'],
      [/[;,.]/, 'delimiter'],
      [/[?:]/, 'delimiter'],
      [/[~!%^&*+\-=|<>\/]+/, 'operator'],
    ],
    comment: [
      [/[^/*]+/, 'comment'],
      [/\/\*/, 'comment', '@push'],
      ["\\*/", 'comment', '@pop'],
      [/[/*]/, 'comment'],
    ],
    macroDeclaration: [
      [/[ \t]+/, 'white'],
      [/[a-zA-Z_]\w*/, 'constant', '@pop'],
      [/./, 'keyword.directive', '@pop'],
    ],
  },
};

const VERILOG_LANGUAGE_CONFIGURATION = {
  defaultToken: 'identifier',
  tokenPostfix: '.verilog',
  brackets: [
    { open: '{', close: '}', token: 'delimiter.curly' },
    { open: '[', close: ']', token: 'delimiter.square' },
    { open: '(', close: ')', token: 'delimiter.parenthesis' },
  ],
  keywords: VERILOG_KEYWORDS,
  tokenizer: {
    root: [
      [/[ \t\r\n]+/, 'white'],
      [/\/\/.*$/, 'comment'],
      [/\/\*/, 'comment', '@comment'],
      [/`define\b/, 'keyword.directive', '@macroDeclaration'],
      [/`[a-zA-Z_]\w*/, 'keyword.directive'],
      [/\bmodule\b/, 'keyword', '@moduleDeclaration'],
      [VERILOG_FUNCTION_PATTERN, 'function'],
      [/[a-zA-Z_]\w*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
      [/(\d+)?'[sS]?[bBoOdDhHxXzZ][0-9a-fA-F_xXzZ?]+/, 'number.hex'],
      [/\$[a-zA-Z_]\w*/, 'predefined'],
      [/#\s*\d+(?:\.\d+)?[munpf]?s?/, 'number'],
      [/[0-9]+(?:\.[0-9]+)?/, 'number'],
      [/["].*?[^\\]["]/, 'string'],
      [/[{}()[\]]/, '@brackets'],
      [/[;,.]/, 'delimiter'],
      [/[?:]/, 'delimiter'],
      [/[~!%^&*+\-=|<>\/]+/, 'operator'],
    ],
    moduleDeclaration: [
      [/[ \t]+/, 'white'],
      [/[a-zA-Z_]\w*/, 'type.identifier', '@pop'],
      [/./, 'keyword', '@pop'],
    ],
    macroDeclaration: [
      [/[ \t]+/, 'white'],
      [/[a-zA-Z_]\w*/, 'constant', '@pop'],
      [/./, 'keyword.directive', '@pop'],
    ],
    comment: [
      [/[^/*]+/, 'comment'],
      [/\/\*/, 'comment', '@push'],
      ["\\*/", 'comment', '@pop'],
      [/[/*]/, 'comment'],
    ],
  },
};

const MATLAB_LANGUAGE_CONFIGURATION = {
  defaultToken: 'identifier',
  tokenPostfix: '.matlab',
  brackets: [
    { open: '{', close: '}', token: 'delimiter.curly' },
    { open: '[', close: ']', token: 'delimiter.square' },
    { open: '(', close: ')', token: 'delimiter.parenthesis' },
  ],
  keywords: MATLAB_KEYWORDS,
  types: MATLAB_TYPES,
  builtins: MATLAB_BUILTINS,
  constants: MATLAB_CONSTANTS,
  tokenizer: {
    root: [
      [/[ \t\r\n]+/, 'white'],
      [/%\{/, 'comment', '@blockComment'],
      [/%.*$/, 'comment'],
      [/[a-zA-Z_]\w*(?=\s*=)/, 'variable'],
      [MATLAB_FUNCTION_PATTERN, 'function'],
      [/[a-zA-Z_]\w*/, { cases: { '@keywords': 'keyword', '@types': 'type', '@builtins': 'predefined', '@constants': 'constant', '@default': 'identifier' } }],
      [/(\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/, 'number'],
      [/["].*?[^\\]["]/, 'string'],
      [/'([^'\\]|\\.)*'/, 'string'],
      [/[{}()[\]]/, '@brackets'],
      [/[;,.:]/, 'delimiter'],
      [/[~!%^&*+\-=|<>\/\\]+/, 'operator'],
    ],
    blockComment: [
      [/%\}/, 'comment', '@pop'],
      [/[^%]+/, 'comment'],
      [/%/, 'comment'],
    ],
  },
};

export const EDITOR_THEME_COLORS = {
  dark: {
    background: '1E1E1E',
    foreground: 'D4D4D4',
    keyword: '569CD6',
    type: '4EC9B0',
    function: 'DCDCAA',
    string: 'CE9178',
    number: 'B5CEA8',
    comment: '6A9955',
    directive: 'C586C0',
    constant: '4FC1FF',
    operator: 'D4D4D4',
    lineNumber: '858585',
    lineHighlight: '2A2D2E',
    selection: '264F78',
  },
  light: {
    background: 'F8FAFC',
    foreground: '24292F',
    keyword: '005CC5',
    type: '267F99',
    function: '795E26',
    string: 'A31515',
    number: '098658',
    comment: '008000',
    directive: 'AF00DB',
    constant: '0070C1',
    operator: '393A34',
    lineNumber: '6B7280',
    lineHighlight: 'E2E8F0',
    selection: 'BFDBFE',
  },
} as const;

const configuredMonacoInstances = new WeakSet<object>();

export function configureMonaco(monaco: Monaco): void {
  if (configuredMonacoInstances.has(monaco)) return;
  configuredMonacoInstances.add(monaco);

  registerLanguage(monaco, 'c', C_LANGUAGE_CONFIGURATION);
  registerLanguage(monaco, 'cpp', C_LANGUAGE_CONFIGURATION);
  registerLanguage(monaco, 'embedded-c', C_LANGUAGE_CONFIGURATION);
  registerLanguage(monaco, 'verilog', VERILOG_LANGUAGE_CONFIGURATION);
  registerLanguage(monaco, 'systemverilog', {
    ...VERILOG_LANGUAGE_CONFIGURATION,
    keywords: SYSTEMVERILOG_KEYWORDS,
  });
  registerLanguage(monaco, 'matlab', MATLAB_LANGUAGE_CONFIGURATION);

  defineTheme(monaco, 'enginx-dark', EDITOR_THEME_COLORS.dark, 'vs-dark');
  defineTheme(monaco, 'enginx-light', EDITOR_THEME_COLORS.light, 'vs');

  ['c', 'cpp', 'embedded-c', 'verilog', 'systemverilog', 'matlab'].forEach((language: string) => {
    monaco.languages.registerCompletionItemProvider(language, {
      triggerCharacters: ['.', '#', '$'],
      provideCompletionItems: (model: any, position: any) => provideCompletionItems(monaco, model, position, language),
    });
    monaco.languages.registerHoverProvider(language, {
      provideHover: (model: any, position: any) => provideHover(monaco, model, position, language),
    });
  });
}

function registerLanguage(monaco: Monaco, id: string, configuration: object): void {
  if (!monaco.languages.getLanguages().some((language: { id: string }) => language.id === id)) {
    monaco.languages.register({ id });
  }
  const isVerilogLanguage = id === 'verilog' || id === 'systemverilog';
  const isMatlabLanguage = id === 'matlab';
  monaco.languages.setMonarchTokensProvider(id, configuration);
  monaco.languages.setLanguageConfiguration(id, {
    comments: isMatlabLanguage ? { lineComment: '%' } : { lineComment: '//', blockComment: ['/*', '*/'] },
    brackets: [['{', '}'], ['[', ']'], ['(', ')']],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    folding: { markers: { start: /^\s*\/\/\s*#?region\b/, end: /^\s*\/\/\s*#?endregion\b/ } },
    indentationRules: {
      increaseIndentPattern: isMatlabLanguage
        ? /^(?!\s*(?:end|else|elseif|case|otherwise|catch)\b).*\b(?:if|for|while|switch|try|function|classdef|properties|methods|parfor)\b.*$/
        : isVerilogLanguage ? /^(?!\s*(?:end|endmodule|endcase|endfunction|endtask|endgenerate)\b).*\b(?:begin|case|fork|module|function|task|generate)\b.*$/ : /^(?!\s*\}).*\{[^}"']*$/,
      decreaseIndentPattern: isMatlabLanguage
        ? /^\s*(?:end|else|elseif|case|otherwise|catch)\b/
        : isVerilogLanguage ? /^\s*(?:end|endmodule|endcase|endfunction|endtask|endgenerate)\b/ : /^\s*\}/,
    },
    onEnterRules: isMatlabLanguage
      ? [
        { beforeText: /^\s*(?:if|for|while|switch|try|function|classdef|properties|methods|parfor)\b.*$/, action: { indentAction: monaco.languages.IndentAction.Indent } },
        { beforeText: /^\s*(?:end|else|elseif|case|otherwise|catch)\b.*$/, action: { indentAction: monaco.languages.IndentAction.Outdent } },
      ]
      : isVerilogLanguage
      ? [
        { beforeText: /^\s*(?:begin|case|fork|module|function|task|generate)\b.*$/, action: { indentAction: monaco.languages.IndentAction.Indent } },
        { beforeText: /^\s*(?:end|endmodule|endcase|endfunction|endtask|endgenerate)\b.*$/, action: { indentAction: monaco.languages.IndentAction.Outdent } },
      ]
      : [
        { beforeText: /^.*\{\s*$/, action: { indentAction: monaco.languages.IndentAction.Indent } },
        { beforeText: /^\s*\}.*$/, action: { indentAction: monaco.languages.IndentAction.Outdent } },
      ],
  });
}

function defineTheme(
  monaco: Monaco,
  themeName: EditorTheme,
  colors: (typeof EDITOR_THEME_COLORS)[keyof typeof EDITOR_THEME_COLORS],
  base: 'vs' | 'vs-dark',
): void {
  monaco.editor.defineTheme(themeName, {
    base,
    inherit: true,
    rules: [
      { token: 'keyword', foreground: colors.keyword },
      { token: 'type', foreground: colors.type },
      { token: 'function', foreground: colors.function },
      { token: 'identifier', foreground: colors.foreground },
      { token: 'string', foreground: colors.string },
      { token: 'number', foreground: colors.number },
      { token: 'number.hex', foreground: colors.number },
      { token: 'comment', foreground: colors.comment, fontStyle: 'italic' },
      { token: 'keyword.directive', foreground: colors.directive },
      { token: 'constant', foreground: colors.constant },
      { token: 'predefined', foreground: colors.constant },
      { token: 'operator', foreground: colors.operator },
      { token: 'delimiter', foreground: colors.operator },
    ],
    colors: {
      'editor.background': `#${colors.background}`,
      'editor.foreground': `#${colors.foreground}`,
      'editorLineNumber.foreground': `#${colors.lineNumber}`,
      'editorLineNumber.activeForeground': `#${colors.foreground}`,
      'editor.lineHighlightBackground': `#${colors.lineHighlight}`,
      'editor.selectionBackground': `#${colors.selection}`,
      'editor.inactiveSelectionBackground': `#${colors.selection}99`,
      'editorCursor.foreground': `#${colors.function}`,
      'editorIndentGuide.background1': base === 'vs-dark' ? '#333333' : '#E5E7EB',
      'editorIndentGuide.activeBackground1': base === 'vs-dark' ? '#555555' : '#CBD5E1',
      'editorWidget.background': base === 'vs-dark' ? '#252526' : '#FFFFFF',
      'editorWidget.border': base === 'vs-dark' ? '#3F3F46' : '#CBD5E1',
      'editorSuggestWidget.background': base === 'vs-dark' ? '#252526' : '#FFFFFF',
      'editorSuggestWidget.border': base === 'vs-dark' ? '#3F3F46' : '#CBD5E1',
    },
  });
}

function provideCompletionItems(monaco: Monaco, model: any, position: any, language: string) {
  const word = model.getWordUntilPosition(position);
  const range = {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endColumn: word.endColumn,
  };
  const source = model.getValue();
  const isVerilog = language === 'verilog' || language === 'systemverilog';
  const isMatlab = language === 'matlab';
  const keywords = isMatlab ? MATLAB_KEYWORDS : isVerilog ? (language === 'systemverilog' ? SYSTEMVERILOG_KEYWORDS : VERILOG_KEYWORDS) : C_KEYWORDS;
  const types = isMatlab ? MATLAB_TYPES : isVerilog ? ['wire', 'reg', 'logic', 'bit', 'integer', 'parameter', 'localparam'] : C_TYPES;
  const declarations = isMatlab
    ? Array.from(source.matchAll(/\b(?:function\s+)?(?:\[[^\]]+\]|[A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*)/g) as Iterable<RegExpMatchArray>).map((match) => match[1])
    : isVerilog
    ? Array.from(source.matchAll(/\b(?:input|output|inout|wire|reg|logic|bit|parameter|localparam)\s+(?:\[[^\]]+\]\s+)?([A-Za-z_]\w*)/g) as Iterable<RegExpMatchArray>).map((match) => match[1])
    : Array.from(source.matchAll(/\b(?:void|char|short|int|long|float|double|bool|uint\d+_t|int\d+_t|size_t)\s+([A-Za-z_]\w*)/g) as Iterable<RegExpMatchArray>).map((match) => match[1]);
  const functions = Array.from(source.matchAll(/\b([A-Za-z_]\w*)\s*\(/g) as Iterable<RegExpMatchArray>).map((match) => match[1]);
  const unique = (items: string[]) => Array.from(new Set(items));
  const suggestions = [
    ...unique(keywords).map((label) => ({ label, kind: monaco.languages.CompletionItemKind.Keyword, insertText: label, range })),
    ...unique(types).map((label) => ({ label, kind: monaco.languages.CompletionItemKind.TypeParameter, insertText: label, range })),
    ...unique(declarations).map((label) => ({ label, kind: monaco.languages.CompletionItemKind.Variable, insertText: label, range })),
    ...unique(functions).map((label) => ({ label, kind: monaco.languages.CompletionItemKind.Function, insertText: label, range })),
  ];
  return { suggestions };
}

function provideHover(monaco: Monaco, model: any, position: any, language: string) {
  const word = model.getWordAtPosition(position);
  if (!word) return null;
  const isVerilog = language === 'verilog' || language === 'systemverilog';
  const isMatlab = language === 'matlab';
  const docs: Record<string, string> = isMatlab
    ? {
      fft: 'Fast Fourier Transform. For a sampled signal, the bin spacing is fs/N.',
      conv: 'Linear convolution; for LTI systems, y = conv(x, h) models the output sequence.',
      plot: 'Create a 2-D line plot. In the EnginX lab, plots are previewed with a deterministic SVG model.',
      stem: 'Plot discrete-time samples as stems.',
      linspace: 'Create a linearly spaced vector between two endpoints.',
      erfc: 'Complementary error function used in analytical BPSK BER expressions.',
      end: 'Closes the nearest MATLAB block such as if, for, while, function or switch.',
    }
    : isVerilog
    ? {
      always_ff: 'SystemVerilog procedural block intended for edge-triggered sequential logic.',
      always_comb: 'SystemVerilog procedural block for combinational logic with inferred sensitivity.',
      assign: 'Continuous assignment: drives a net from a combinational expression.',
      logic: 'Four-state SystemVerilog variable type; use it for signals driven by one procedural or continuous source.',
      posedge: 'Positive edge event control used for clocked sequential logic.',
      parameter: 'Module parameter used to configure a design at elaboration time.',
    }
    : {
      volatile: 'Tells the compiler that a value may change outside the current flow, common for memory-mapped registers.',
      uint32_t: 'Unsigned integer type with exactly 32 value bits from <stdint.h>.',
      static: 'Controls storage duration or translation-unit visibility depending on the declaration context.',
      const: 'Prevents modification through the declared object or pointer view.',
    };
  const documentation = docs[word.word];
  if (!documentation) return null;
  return {
    range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
    contents: [{ value: `**${word.word}**` }, { value: documentation }],
  };
}

export function parseCompilerMarkers(output: string | null | undefined, verdict: string | null | undefined): Array<{ startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number; message: string; severity: number }> {
  if (!output || !verdict || !['CE', 'COMPILATION_ERROR', 'COMPILE_ERROR'].includes(verdict.toUpperCase())) return [];
  const markers: Array<{ startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number; message: string; severity: number }> = [];
  const pattern = /(?:^|\n).*?(?:\.v|\.sv|\.c|\.h)?(?::|\(|\sline\s+)(\d+)(?:[:;,\s]+(?:column\s+)?(\d+))?[^\n]*?(?:error|warning)[^\n]*/gi;
  for (const match of output.matchAll(pattern)) {
    const line = Number(match[1]);
    const column = Number(match[2] || 1);
    const message = match[0].trim();
    markers.push({
      startLineNumber: line,
      startColumn: column,
      endLineNumber: line,
      endColumn: column + 1,
      message,
      severity: /warning/i.test(message) ? 2 : 8,
    });
  }
  return markers;
}

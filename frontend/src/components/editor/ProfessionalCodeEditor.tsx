import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor, { loader, type OnMount } from '@monaco-editor/react';
import {
  ChevronDown,
  Minus,
  Plus,
  Settings2,
  WrapText,
} from 'lucide-react';
import {
  clampFontSize,
  configureMonaco,
  editorLanguageForChallenge,
  editorLanguageLabel,
  loadEditorSettings,
  parseCompilerMarkers,
  saveEditorSettings,
  type EditorSettings,
} from './monacoLanguage';

export interface ProfessionalCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  path: string;
  ariaLabel: string;
  compilerOutput?: string | null;
  compilerVerdict?: string | null;
}

type MonacoEditorInstance = Parameters<OnMount>[0];
type MonacoNamespace = Parameters<OnMount>[1];

const isTestEnvironment = import.meta.env.MODE === 'test';

export const ProfessionalCodeEditor: React.FC<ProfessionalCodeEditorProps> = ({
  value,
  onChange,
  language,
  path,
  ariaLabel,
  compilerOutput = null,
  compilerVerdict = null,
}) => {
  const [settings, setSettings] = useState<EditorSettings>(() => loadEditorSettings());
  const [monacoReady, setMonacoReady] = useState(isTestEnvironment);
  const [loaderError, setLoaderError] = useState<string | null>(null);
  const [markerCount, setMarkerCount] = useState(0);
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const monacoRef = useRef<MonacoNamespace | null>(null);
  const editorLanguage = useMemo(() => editorLanguageForChallenge(language), [language]);

  useEffect(() => {
    if (isTestEnvironment) return undefined;
    let active = true;
    import('monaco-editor')
      .then((monaco) => {
        loader.config({ monaco });
        if (active) setMonacoReady(true);
      })
      .catch(() => {
        if (active) setLoaderError('The local code editor could not be loaded. You can still edit in the recovery editor below.');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    saveEditorSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<EditorSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    configureMonaco(monaco);
    editor.focus();
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!editor || !monaco || !model) return undefined;
    const markers = parseCompilerMarkers(compilerOutput, compilerVerdict);
    monaco.editor.setModelMarkers(model, 'enginx-evaluator', markers);
    setMarkerCount(markers.length);
    return () => {
      monaco.editor.setModelMarkers(model, 'enginx-evaluator', []);
    };
  }, [compilerOutput, compilerVerdict, editorLanguage]);

  const editorOptions = useMemo(() => ({
    automaticLayout: true,
    ariaLabel,
    bracketPairColorization: { enabled: true },
    cursorBlinking: 'smooth' as const,
    detectIndentation: false,
    folding: true,
    fontFamily: '"JetBrains Mono", "Cascadia Code", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
    fontLigatures: true,
    fontSize: settings.fontSize,
    guides: { bracketPairs: true, indentation: true, highlightActiveIndentation: true },
    insertSpaces: true,
    lineNumbers: 'on' as const,
    minimap: { enabled: settings.minimap },
    padding: { top: 12, bottom: 16 },
    renderLineHighlight: 'all' as const,
    renderWhitespace: 'selection' as const,
    scrollbar: { useShadows: false, verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
    smoothScrolling: true,
    tabSize: settings.tabSize,
    wordWrap: settings.wordWrap,
    wordWrapColumn: 100,
  }), [ariaLabel, settings]);

  const editor = monacoReady && !loaderError ? (
    <Editor
      height="100%"
      width="100%"
      path={`enginx://challenge/${path}`}
      language={editorLanguage}
      theme={settings.theme}
      value={value}
      onChange={(nextValue) => onChange(nextValue ?? '')}
      beforeMount={configureMonaco}
      onMount={handleMount}
      options={editorOptions}
      loading={<EditorLoadingState />}
    />
  ) : loaderError ? (
    <RecoveryEditor value={value} onChange={onChange} ariaLabel={ariaLabel} />
  ) : (
    <EditorLoadingState />
  );

  return (
    <div className={`professional-editor professional-editor--${settings.theme} flex min-h-0 flex-1 flex-col overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 bg-slate-900 px-3 py-2 text-xs text-slate-300">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-semibold text-slate-100">{editorLanguageLabel(language)}</span>
          <span className="hidden rounded-md border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-400 sm:inline">{settings.theme === 'enginx-dark' ? 'Dark' : 'Light'} tokens</span>
          {markerCount > 0 && (
            <span className="rounded-md border border-rose-400/40 bg-rose-500/10 px-2 py-1 text-[10px] font-semibold text-rose-200" role="status">
              {markerCount} compiler marker{markerCount === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <label className="sr-only" htmlFor="editor-theme">Editor theme</label>
          <select
            id="editor-theme"
            value={settings.theme}
            onChange={(event) => updateSettings({ theme: event.target.value as EditorSettings['theme'] })}
            className="focus-ring min-h-[32px] rounded-md border border-slate-700 bg-slate-800 px-2 text-[11px] font-semibold text-slate-200"
            aria-label="Editor theme"
          >
            <option value="enginx-dark">Dark theme</option>
            <option value="enginx-light">Light theme</option>
          </select>
          <div className="flex items-center rounded-md border border-slate-700 bg-slate-800" aria-label="Editor font size">
            <button
              type="button"
              className="focus-ring flex min-h-[32px] min-w-[32px] items-center justify-center text-slate-300 hover:bg-slate-700"
              onClick={() => updateSettings({ fontSize: clampFontSize(settings.fontSize - 1) })}
              aria-label="Decrease editor font size"
            >
              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <span className="min-w-[34px] text-center text-[11px] font-mono text-slate-300">{settings.fontSize}px</span>
            <button
              type="button"
              className="focus-ring flex min-h-[32px] min-w-[32px] items-center justify-center text-slate-300 hover:bg-slate-700"
              onClick={() => updateSettings({ fontSize: clampFontSize(settings.fontSize + 1) })}
              aria-label="Increase editor font size"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <label className="sr-only" htmlFor="editor-tab-size">Editor tab size</label>
          <select
            id="editor-tab-size"
            value={settings.tabSize}
            onChange={(event) => updateSettings({ tabSize: Number(event.target.value) })}
            className="focus-ring min-h-[32px] rounded-md border border-slate-700 bg-slate-800 px-2 text-[11px] font-semibold text-slate-200"
            aria-label="Editor tab size"
          >
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
            <option value={8}>8 spaces</option>
          </select>
          <button
            type="button"
            className={`focus-ring flex min-h-[32px] items-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold transition-colors ${settings.wordWrap === 'on' ? 'border-teal-400/60 bg-teal-500/20 text-teal-100' : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            onClick={() => updateSettings({ wordWrap: settings.wordWrap === 'on' ? 'off' : 'on' })}
            aria-pressed={settings.wordWrap === 'on'}
            aria-label="Toggle word wrap"
          >
            <WrapText className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden md:inline">Wrap</span>
          </button>
          <label className="hidden items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2 text-[11px] font-semibold text-slate-300 lg:flex">
            <input
              type="checkbox"
              checked={settings.minimap}
              onChange={(event) => updateSettings({ minimap: event.target.checked })}
              className="accent-teal-500"
              aria-label="Toggle editor minimap"
            />
            Minimap
          </label>
          <span className="ml-1 hidden text-slate-500 xl:inline" title="Editor settings persist on this device">
            <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <ChevronDown className="hidden h-3 w-3 text-slate-500 xl:inline" aria-hidden="true" />
        </div>
      </div>
      <div className={`min-h-0 flex-1 ${settings.theme === 'enginx-dark' ? 'bg-[#1E1E1E]' : 'bg-[#F8FAFC]'}`}>
        {editor}
      </div>
    </div>
  );
};

function EditorLoadingState() {
  return (
    <div className="flex h-full min-h-48 items-center justify-center bg-[#1E1E1E] text-xs font-semibold text-slate-400" role="status">
      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-teal-400" aria-hidden="true" />
      Loading local code editor…
    </div>
  );
}

function RecoveryEditor({ value, onChange, ariaLabel }: { value: string; onChange: (value: string) => void; ariaLabel: string }) {
  return (
    <div className="flex h-full min-h-48 flex-col bg-[#1E1E1E] p-3">
      <p className="mb-2 text-[11px] text-amber-200">Advanced editor unavailable; recovery editing mode is active.</p>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        aria-label={ariaLabel}
        className="min-h-0 flex-1 resize-none border-0 bg-transparent font-mono text-sm leading-6 text-slate-200 caret-teal-300 outline-none"
      />
    </div>
  );
}

export default ProfessionalCodeEditor;

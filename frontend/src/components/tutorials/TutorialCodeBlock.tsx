import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface TutorialCodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

/**
 * Dark editor-style code panel with a language badge and a copy button.
 * Uses navigator.clipboard when available and falls back to a temporary
 * textarea so the copy action keeps working in restricted environments.
 */
export const TutorialCodeBlock: React.FC<TutorialCodeBlockProps> = ({ code, language, title }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const badge = (language && language.trim() ? language.trim() : 'code').toUpperCase();

  return (
    <figure className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 px-4 py-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded bg-teal-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-300">
            {badge}
          </span>
          {title && <span className="min-w-0 truncate text-xs font-semibold text-slate-300">{title}</span>}
        </span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="focus-ring flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg border border-slate-600 px-2.5 text-xs font-semibold text-slate-200 transition-colors hover:border-teal-400 hover:text-teal-200"
          aria-label={copied ? 'Code copied to clipboard' : `Copy ${title || badge} code to clipboard`}
        >
          {copied
            ? <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
          <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </figcaption>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-6 text-slate-100">
        <code>{code}</code>
      </pre>
    </figure>
  );
};

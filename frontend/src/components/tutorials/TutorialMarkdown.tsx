import React from 'react';
import { TutorialCodeBlock } from './TutorialCodeBlock';

/**
 * Tiny deterministic renderer for the markdown subset used inside tutorial
 * lesson text: #/##/### headings, **bold**, *italic*, inline `code`, fenced
 * code blocks with an optional language tag, "- " bullet lists, "1. " numbered
 * lists and paragraphs. Everything renders as React nodes — no
 * dangerouslySetInnerHTML.
 */

type InlineToken =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'italic'; value: string }
  | { kind: 'code'; value: string };

type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'numbers'; items: string[] }
  | { kind: 'code'; language: string; code: string };

function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  // Bold is tried before italic; italic requires a non-space character right
  // after the opening asterisk so arithmetic like "2 * 3" never matches.
  const pattern = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) tokens.push({ kind: 'text', value: text.slice(lastIndex, match.index) });
    const token = match[0];
    if (token.startsWith('**')) tokens.push({ kind: 'bold', value: token.slice(2, -2) });
    else if (token.startsWith('`')) tokens.push({ kind: 'code', value: token.slice(1, -1) });
    else tokens.push({ kind: 'italic', value: token.slice(1, -1) });
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) tokens.push({ kind: 'text', value: text.slice(lastIndex) });
  return tokens;
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  return parseInline(text).map((token, index) => {
    const key = `${keyPrefix}-i${index}`;
    if (token.kind === 'bold') {
      return <strong key={key} className="font-bold text-slate-900">{token.value}</strong>;
    }
    if (token.kind === 'italic') {
      return <em key={key} className="italic">{token.value}</em>;
    }
    if (token.kind === 'code') {
      return (
        <code key={key} className="rounded-md border border-teal-100 bg-teal-50 px-1.5 py-0.5 font-mono text-[0.85em] font-semibold text-teal-800">
          {token.value}
        </code>
      );
    }
    return <React.Fragment key={key}>{token.value}</React.Fragment>;
  });
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let bullets: string[] = [];
  let numbers: string[] = [];

  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
      paragraph = [];
    }
  };
  const flushBullets = (): void => {
    if (bullets.length > 0) {
      blocks.push({ kind: 'bullets', items: bullets });
      bullets = [];
    }
  };
  const flushNumbers = (): void => {
    if (numbers.length > 0) {
      blocks.push({ kind: 'numbers', items: numbers });
      numbers = [];
    }
  };
  const flushAll = (): void => {
    flushParagraph();
    flushBullets();
    flushNumbers();
  };

  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    const fenceMatch = /^```(\w*)\s*$/.exec(trimmed);
    if (fenceMatch) {
      flushAll();
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index].trim())) {
        codeLines.push(lines[index]);
        index += 1;
      }
      index += 1; // skip the closing fence (or run past the end)
      blocks.push({ kind: 'code', language: fenceMatch[1] || 'text', code: codeLines.join('\n') });
      continue;
    }
    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (headingMatch) {
      flushAll();
      blocks.push({ kind: 'heading', level: headingMatch[1].length as 1 | 2 | 3, text: headingMatch[2].trim() });
      index += 1;
      continue;
    }
    const bulletMatch = /^[-*]\s+(.*)$/.exec(trimmed);
    if (bulletMatch) {
      flushParagraph();
      flushNumbers();
      bullets.push(bulletMatch[1].trim());
      index += 1;
      continue;
    }
    const numberMatch = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (numberMatch) {
      flushParagraph();
      flushBullets();
      numbers.push(numberMatch[1].trim());
      index += 1;
      continue;
    }
    if (trimmed === '') {
      flushAll();
      index += 1;
      continue;
    }
    flushBullets();
    flushNumbers();
    paragraph.push(trimmed);
    index += 1;
  }
  flushAll();
  return blocks;
}

export const TutorialMarkdown: React.FC<{ content: string }> = ({ content }) => {
  if (!content || content.trim() === '') return null;
  const blocks = parseBlocks(content);
  return (
    <div className="space-y-4 text-sm leading-7 text-slate-700">
      {blocks.map((block, index) => {
        const key = `md-${index}`;
        switch (block.kind) {
          case 'heading':
            if (block.level === 1) {
              return <h2 key={key} className="pt-2 text-xl font-extrabold text-slate-900">{renderInline(block.text, key)}</h2>;
            }
            if (block.level === 2) {
              return <h3 key={key} className="pt-2 text-lg font-extrabold text-slate-900">{renderInline(block.text, key)}</h3>;
            }
            return <h4 key={key} className="pt-1 text-base font-bold text-slate-900">{renderInline(block.text, key)}</h4>;
          case 'paragraph':
            return <p key={key}>{renderInline(block.text, key)}</p>;
          case 'bullets':
            return (
              <ul key={key} className="ml-5 list-disc space-y-1.5">
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>{renderInline(item, `${key}-${itemIndex}`)}</li>
                ))}
              </ul>
            );
          case 'numbers':
            return (
              <ol key={key} className="ml-5 list-decimal space-y-1.5">
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>{renderInline(item, `${key}-${itemIndex}`)}</li>
                ))}
              </ol>
            );
          case 'code':
            return <TutorialCodeBlock key={key} code={block.code} language={block.language} />;
          default:
            return null;
        }
      })}
    </div>
  );
};

import React from 'react';
import {
  FileText, CheckCircle2, AlertCircle, BookOpen,
  Share2, MessageSquare, Zap, Tag
} from 'lucide-react';
import { Challenge } from '../../types';

interface ChallengeDetailsProps {
  challenge: Challenge;
  isCompleted: boolean;
}

export const ChallengeDetails: React.FC<ChallengeDetailsProps> = ({
  challenge,
  isCompleted
}) => {
  return (
    <div className="flex flex-col h-full bg-[#111827] border border-[#223147] rounded-xl overflow-hidden">
      {/* Title Header */}
      <div className="p-4 bg-[#161F2E] border-b border-[#223147] flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <FileText className="w-4 h-4 text-[#0066FF]" />
          <h2 className="text-sm font-bold text-white font-mono">
            {challenge.title}
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          {isCompleted && (
            <span className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#2ECC71]/15 text-[#2ECC71] border border-[#2ECC71]/30 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed</span>
            </span>
          )}
          <span className="px-2.5 py-1 rounded bg-[#0066FF]/10 text-[#0066FF] border border-[#0066FF]/30 text-xs font-mono font-bold">
            +{challenge.xp_reward} XP
          </span>
        </div>
      </div>

      {/* Description & Problem Specs */}
      <div className="flex-1 p-6 overflow-y-auto space-y-5 text-slate-300 text-sm leading-relaxed">
        {/* Topic & Metadata breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-[#223147]">
          <span className="text-xs text-slate-400 font-mono">Track:</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-white uppercase font-mono">
            {challenge.discipline}
          </span>
          <span className="text-xs text-slate-400 font-mono">• Topic:</span>
          <span className="text-xs text-slate-200 font-medium">
            {challenge.topic}
          </span>
          <span className="text-xs text-slate-400 font-mono">• Time Limit:</span>
          <span className="text-xs text-slate-300 font-mono">
            {challenge.time_limit_ms}ms
          </span>
        </div>

        {/* Formatted Markdown Content */}
        <div className="prose prose-invert max-w-none text-slate-300">
          <div
            className="whitespace-pre-line leading-relaxed space-y-4"
            dangerouslySetInnerHTML={{
              __html: formatMarkdown(challenge.description)
            }}
          />
        </div>

        {/* Tags */}
        <div className="pt-4 border-t border-[#223147]">
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-2">
            <Tag className="w-3.5 h-3.5" />
            <span>Concepts & Tags:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {challenge.tags.map((t, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-md bg-[#161F2E] border border-[#223147] text-xs font-mono text-slate-300"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Lightweight markdown formatter for problem statements
function formatMarkdown(content: string): string {
  return content
    .replace(/^### (.*$)/gim, '<h3 class="text-base font-bold text-white mt-4 mb-2 font-mono">$1</h3>')
    .replace(/^#### (.*$)/gim, '<h4 class="text-sm font-semibold text-slate-200 mt-3 mb-1 font-mono">$1</h4>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-[#161F2E] text-[#0066FF] border border-[#223147] font-mono text-xs font-medium">$1</code>')
    .replace(/```([a-zA-Z]*)\n([\s\S]*?)```/g, '<pre class="p-3 my-3 bg-[#0B0F17] border border-[#223147] rounded-lg overflow-x-auto text-xs font-mono text-slate-200 leading-5"><code>$2</code></pre>');
}

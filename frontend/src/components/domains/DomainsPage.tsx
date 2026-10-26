import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Search, X } from 'lucide-react';
import {
  CATEGORY_LABELS,
  getDomain,
  searchDomains,
  type DomainCategory,
  type DomainEntry,
} from '../../data/domains/registry';
import { EEE_CONTENT } from '../../data/domains/eeeHub';
import type { DomainContentBundle } from '../../data/domains/types';
import { DomainHub } from './DomainHub';
import { domainIcon } from './domainIcons';

/**
 * Domain content bundles available today.  A domain without an entry here
 * renders its overview page (subjects, careers, honest status) instead of a
 * half-built hub - never a blank screen.
 */
const DOMAIN_CONTENT: Record<string, DomainContentBundle> = {
  eee: EEE_CONTENT,
};

interface DomainsPageProps {
  completedLessonIds: string[];
  onCompleteLesson?: (lessonId: string) => Promise<void>;
  /** ECE and Cybersecurity already have dedicated hubs - deep-link, never duplicate. */
  onOpenEceHub: () => void;
  onOpenCyberHub: () => void;
}

/** Category display order; anything unlisted sorts alphabetically at the end. */
const CATEGORY_ORDER: DomainCategory[] = [
  'core-hubs',
  'electrical',
  'computing',
  'civil-mechanical',
  'aerospace-auto',
  'chemical-bio',
  'healthcare',
  'sciences',
  'professional',
];

export const DomainsPage: React.FC<DomainsPageProps> = ({
  completedLessonIds,
  onCompleteLesson,
  onOpenEceHub,
  onOpenCyberHub,
}) => {
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const selectedDomain = selectedDomainId ? getDomain(selectedDomainId) : null;
  const selectedContent = selectedDomainId ? DOMAIN_CONTENT[selectedDomainId] : undefined;

  const grouped = useMemo(() => {
    const filtered = searchDomains(query);
    const groups = new Map<DomainCategory, DomainEntry[]>();
    for (const domain of filtered) {
      const list = groups.get(domain.category) ?? [];
      list.push(domain);
      groups.set(domain.category, list);
    }
    return Array.from(groups.entries()).sort(
      (a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0]),
    );
  }, [query]);

  const openDomain = (domain: DomainEntry) => {
    if (domain.id === 'ece') {
      onOpenEceHub();
      return;
    }
    if (domain.id === 'cybersecurity') {
      onOpenCyberHub();
      return;
    }
    setSelectedDomainId(domain.id);
    window.scrollTo({ top: 0 });
  };

  if (selectedDomain) {
    const content = selectedContent;
    if (content) {
      return (
        <DomainHub
          domain={selectedDomain}
          content={content}
          completedLessonIds={completedLessonIds}
          onCompleteLesson={onCompleteLesson}
        />
      );
    }
    return (
      <DomainOverview
        domain={selectedDomain}
        onBack={() => setSelectedDomainId(null)}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        {/* Catalog header */}
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">Catalogue</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Learning domains</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              All engineering branches in one catalogue. Progress is shared across domains.
            </p>
          </div>
          <span className="icon-chip" aria-hidden="true">
            <BookOpen className="h-5 w-5" />
          </span>
        </header>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search domains or subjects"
            aria-label="Search learning domains"
            className="focus-ring min-h-[44px] w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder:text-slate-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {grouped.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-sm font-semibold text-slate-900">No domain matches "{query}"</p>
            <p className="mt-1 text-xs text-slate-500">
              Try a broader subject term, or clear the search.
            </p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="focus-ring btn-secondary mt-4"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Grouped catalog */}
        {grouped.map(([category, domains]) => (
          <section key={category} className="space-y-3">
            <h2 className="eyebrow">
              {CATEGORY_LABELS[category]}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {domains.map((domain) => {
                const Icon = domainIcon(domain.icon);
                const isExternalHub = domain.id === 'ece' || domain.id === 'cybersecurity';
                const ctaLabel = isExternalHub
                  ? domain.id === 'ece' ? 'Open ECE Hub' : 'Open Cyber Hub'
                  : DOMAIN_CONTENT[domain.id] ? 'Enter hub' : 'View roadmap';
                return (
                  <article
                    key={domain.id}
                    className="flex flex-col surface-card p-5 transition-colors hover:border-teal-300"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-100 bg-teal-50 text-teal-700">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                          domain.status === 'live'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-white text-slate-500'
                        }`}
                      >
                        {domain.status === 'live' ? 'Live' : 'Catalog'}
                      </span>
                    </div>
                    <h3 className="mt-3 font-bold leading-snug text-slate-900">{domain.shortName}</h3>
                    <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-600">{domain.tagline}</p>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{domain.statusNote}</p>
                    <button
                      type="button"
                      onClick={() => openDomain(domain)}
                      className="focus-ring btn-secondary mt-4 w-full"
                    >
                      {ctaLabel} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        <p className="pb-2 text-center text-[11px] text-slate-400">
          Domains marked "Catalog" list their full subject and career map now; their lesson batches are being
          written course by course. Nothing here replaces the ECE and Cyber hubs - those stay exactly where they are.
        </p>
      </div>
    </div>
  );
};

interface DomainOverviewProps {
  domain: DomainEntry;
  onBack: () => void;
}

/**
 * Roadmap view for domains whose lesson batches are still being written.
 * States plainly what exists (subjects, careers) and what does not (lessons).
 */
const DomainOverview: React.FC<DomainOverviewProps> = ({ domain, onBack }) => {
  const Icon = domainIcon(domain.icon);
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="focus-ring inline-flex min-h-[44px] items-center gap-1 rounded-lg text-xs font-semibold text-teal-600 hover:text-teal-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> All domains
        </button>

        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">Domain</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{domain.name}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{domain.tagline}</p>
          </div>
          <span className="icon-chip" aria-hidden="true">
            <Icon className="h-5 w-5" />
          </span>
        </header>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
          {domain.statusNote}
        </div>

        <section className="surface-card p-6">
          <h2 className="eyebrow">Subject catalog</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {domain.subjects.map((subject) => (
              <span
                key={subject}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700"
              >
                {subject}
              </span>
            ))}
          </div>
        </section>

        <section className="surface-card p-6">
          <h2 className="eyebrow">Career directions</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {domain.careerRoles.map((role) => (
              <span
                key={role}
                className="rounded-lg border border-teal-100 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-800"
              >
                {role}
              </span>
            ))}
          </div>
        </section>

        <section className="surface-card p-6">
          <h2 className="text-lg font-semibold text-slate-900">What is happening with this domain</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            The subject and career map above is final scope. Interactive lessons, worked examples and assessments
            are being added course by course, starting with the subjects most courses assume you already know.
            While the lessons are written, the Challenges workspace already carries coded problems for several of
            these disciplines - switch to the Challenges tab to practice there.
          </p>
        </section>
      </div>
    </div>
  );
};

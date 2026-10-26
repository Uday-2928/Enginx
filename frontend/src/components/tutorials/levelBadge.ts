export type BadgeLevel = 'beginner' | 'intermediate' | 'advanced';

const LEVEL_BADGE_STYLES: Record<BadgeLevel, string> = {
  beginner: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  intermediate: 'border-amber-200 bg-amber-50 text-amber-800',
  advanced: 'border-rose-200 bg-rose-50 text-rose-700',
};

const DIFFICULTY_TO_LEVEL: Record<string, BadgeLevel> = {
  Easy: 'beginner',
  Medium: 'intermediate',
  Hard: 'advanced',
};

const BADGE_BASE =
  'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold';

/** Tiers beyond "Hard" keep the outlined system: Extra Hard deepens the rose
 * family; Insane is the single solid-dark pill in the app. */
const EXTRA_DIFFICULTY_STYLES: Record<string, string> = {
  'Extra Hard': 'border-rose-300 bg-rose-50 text-rose-800',
  Insane: 'border-slate-900 bg-slate-900 text-white',
};

const badgeFor = (level: BadgeLevel): string => `${BADGE_BASE} ${LEVEL_BADGE_STYLES[level]}`;

export const levelBadgeClasses = (level: BadgeLevel): string => badgeFor(level);

export const difficultyBadgeClasses = (difficulty: 'Easy' | 'Medium' | 'Hard' | 'Extra Hard' | 'Insane'): string => {
  const extra = EXTRA_DIFFICULTY_STYLES[difficulty];
  if (extra) return `${BADGE_BASE} ${extra}`;
  const level = DIFFICULTY_TO_LEVEL[difficulty] ?? 'beginner';
  return badgeFor(level);
};

/** Canonical difficulty ordering for sorts and progress summaries. */
export const DIFFICULTY_ORDER: Array<'Easy' | 'Medium' | 'Hard' | 'Extra Hard' | 'Insane'> = [
  'Easy',
  'Medium',
  'Hard',
  'Extra Hard',
  'Insane',
];

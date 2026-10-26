import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Atom,
  Bot,
  Brain,
  Briefcase,
  Car,
  Code2,
  Cpu,
  Dna,
  Factory,
  FlaskConical,
  Gauge,
  HardHat,
  Leaf,
  Mountain,
  Network,
  Plane,
  ShieldCheck,
  Sprout,
  Stethoscope,
  Wrench,
  Zap,
} from 'lucide-react';

/**
 * Resolves a domain registry icon key to its Lucide component.  The catalog
 * cards and the hub banner share this map so a domain's identity stays
 * visually identical in both places.  Unknown keys fall back to Cpu.
 */
export const DOMAIN_ICONS: Record<string, LucideIcon> = {
  cpu: Cpu,
  shield: ShieldCheck,
  zap: Zap,
  code: Code2,
  chart: Activity,
  brain: Brain,
  network: Network,
  bot: Bot,
  helmet: HardHat,
  wrench: Wrench,
  factory: Factory,
  flask: FlaskConical,
  dna: Dna,
  leaf: Leaf,
  sprout: Sprout,
  plane: Plane,
  car: Car,
  stethoscope: Stethoscope,
  gauge: Gauge,
  mountain: Mountain,
  atom: Atom,
  briefcase: Briefcase,
};

export function domainIcon(iconKey: string): LucideIcon {
  return DOMAIN_ICONS[iconKey] ?? Cpu;
}

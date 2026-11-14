import {
  Bone, Brain, Droplet, Dna, Dumbbell, FlaskConical, Fingerprint, HeartPulse, ShieldCheck, Utensils,
  Waypoints, Wind, type LucideIcon,
} from 'lucide-react'
import { systemById, type SystemId } from '../data/anatomy'

// systems.json stores an icon *name*; this is the only place that maps names to components.
const ICONS: Record<string, LucideIcon> = {
  Skin: Fingerprint, Bone, Dumbbell, Brain, Flask: FlaskConical, HeartPulse, Waypoints, ShieldCheck,
  Wind, Utensils, Droplet, Dna,
}

export function SystemIcon({ id, className = 'h-4 w-4' }: { id: SystemId; className?: string }) {
  const Icon = ICONS[systemById.get(id)?.icon ?? ''] ?? Dna
  return <Icon className={className} aria-hidden />
}

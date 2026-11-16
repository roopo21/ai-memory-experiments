import { Bone, Dumbbell, type LucideIcon } from 'lucide-react'
import { systemById, type SystemId } from '../data/anatomy'
const ICONS: Record<string, LucideIcon> = { Bone, Dumbbell }
export function SystemIcon({ id, className = 'h-4 w-4' }: { id: SystemId; className?: string }) {
  const Icon = ICONS[systemById.get(id)?.icon ?? ''] ?? Bone
  return <Icon className={className} aria-hidden />
}

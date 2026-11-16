import StructureBrowser from './StructureBrowser'
import { ChevronUp, RotateCcw } from 'lucide-react'
import { useAnatomyStore } from '../store/useAnatomyStore'
import LayerControls from './LayerControls'
import SearchBox from './SearchBox'
import SystemList from './SystemList'
import { useIsMobile } from './useIsMobile'

export default function SidePanel() {
  const expanded = useAnatomyStore((s) => s.panelExpanded)
  const setExpanded = useAnatomyStore((s) => s.setPanelExpanded)
  const reset = useAnatomyStore((s) => s.reset)
  const activeCount = useAnatomyStore(
    (s) => Object.values(s.layers).filter((layer) => layer.visible).length,
  )
  const mobile = useIsMobile()
  const collapsed = mobile && !expanded

  return (
    <aside
      aria-label="Body systems panel"
      className="glass fixed inset-x-0 bottom-0 z-20 flex max-h-[85dvh] flex-col rounded-t-2xl pb-[env(safe-area-inset-bottom)] transition-[height] md:inset-auto md:bottom-4 md:left-4 md:top-4 md:max-h-none md:w-[20.5rem] md:rounded-2xl md:pb-0"
    >
      {/* Mobile bottom-sheet handle */}
      <button
        className="flex w-full flex-col items-center gap-1 pt-2 md:hidden"
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse systems panel' : 'Expand systems panel'}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="h-1 w-10 rounded-full bg-white/25" />
        <ChevronUp
          className={`h-4 w-4 text-[var(--muted)] transition-transform ${expanded ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      <header className="flex items-center justify-between gap-2 px-4 pb-2 pt-1 md:pt-4">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Anatomy Explorer</h1>
          <p className="text-xs text-[var(--muted)]">
            {activeCount
              ? `${activeCount} system${activeCount > 1 ? 's' : ''} visible`
              : 'All systems hidden'}
          </p>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-[var(--text)] hover:bg-white/10"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
        </button>
      </header>

      <div className="px-4 pb-2">
        <SearchBox />
      </div>

      <div
        // `inert` keeps the collapsed sheet's controls out of the tab order.
        inert={collapsed}
        className={`min-h-0 overflow-y-auto px-3 transition-[height] duration-300 md:h-auto md:flex-1 ${collapsed ? 'h-0' : 'h-[50dvh]'}`}
      >
        <SystemList />
        <div className="my-3">
          <LayerControls />
        </div>
        <StructureBrowser />
      </div>

      <footer className="border-t border-white/10 px-4 py-2 text-center text-[11px] text-[var(--muted)]">
        For education only, not medical advice.
      </footer>
    </aside>
  )
}

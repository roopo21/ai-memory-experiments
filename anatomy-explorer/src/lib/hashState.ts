import { useAnatomyStore } from '../store/useAnatomyStore'

/**
 * Keeps guide state in the URL hash so a stretch or glide can be shared, e.g.
 * `#mode=stretch&parts=hamstrings,adductors&exercise=supine-hamstring`.
 */
function apply() {
  const params = new URLSearchParams(window.location.hash.slice(1))
  const mode = params.get('mode')
  const store = useAnatomyStore.getState()
  if (mode === 'stretch' || mode === 'glide')
    store.startGuide(
      mode,
      (params.get('parts') ?? '').split(',').filter(Boolean),
      params.get('exercise') ?? undefined,
    )
  else if (store.mode !== 'explore') store.setMode('explore')
}

function write() {
  const { mode, guideGroups, activeExercise } = useAnatomyStore.getState()
  let hash = ''
  if (mode !== 'explore') {
    hash = `#mode=${mode}`
    if (guideGroups.length) hash += `&parts=${guideGroups.join(',')}`
    if (activeExercise) hash += `&exercise=${activeExercise}`
  }
  if (hash === window.location.hash) return
  // replaceState does not fire hashchange, so writing never loops back into apply().
  history.replaceState(null, '', hash || window.location.pathname + window.location.search)
}

export function syncHash() {
  if (window.location.hash) apply()
  window.addEventListener('hashchange', apply)
  useAnatomyStore.subscribe((s, prev) => {
    if (
      s.mode !== prev.mode ||
      s.guideGroups !== prev.guideGroups ||
      s.activeExercise !== prev.activeExercise
    )
      write()
  })
}

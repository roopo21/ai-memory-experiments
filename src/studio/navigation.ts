import type { ClipId } from './clips'
let opener: HTMLElement | null = null
export function enterStudio(id: ClipId) {
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const url = new URL(location.href)
  url.searchParams.set('studio', id)
  url.searchParams.set('figure', 'anatomy')
  history.pushState({ studioEntry: true }, '', url)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
export function leaveStudio() {
  if (history.state?.studioEntry) history.back()
  else {
    const url = new URL(location.href)
    for (const key of ['studio', 'figure', 'side', 'capture']) url.searchParams.delete(key)
    history.replaceState(null, '', url)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
  const label = opener?.textContent
  opener = null
  if (label)
    requestAnimationFrame(() =>
      [...document.querySelectorAll('button')].find((b) => b.textContent === label)?.focus(),
    )
}

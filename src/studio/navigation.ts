import type { ClipId } from './clips'
let opener: HTMLElement | null = null
export function studioUrl(id: ClipId) {
  const url = new URL(location.href)
  url.searchParams.set('studio', id)
  url.searchParams.set('figure', 'anatomy')
  return url
}
export function enterStudio(id: ClipId) {
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  history.pushState({ studioEntry: true }, '', studioUrl(id))
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
      [...document.querySelectorAll<HTMLElement>('button, a[href]')]
        .find((b) => b.textContent === label)
        ?.focus(),
    )
}

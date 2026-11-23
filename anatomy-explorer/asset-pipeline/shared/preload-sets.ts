import {
  DEFAULT_VISIBLE_SYSTEMS,
  mountedLayerSources,
  type SystemId,
} from '../../src/anatomy/catalogue'
import { guideLayers, type LayerState } from '../../src/state/useAnatomyStore'

const visibleIn = (layers: Record<SystemId, LayerState>) => (id: SystemId) => layers[id].visible

/**
 * Layer GLBs on screen when the viewer opens in each mode. A shared guide link
 * (`#mode=glide&...`) opens straight into its mode, so index.html preloads that mode's previews.
 * Derived from the store, so a change to a mode's layers shows up as a stale previews.json.
 */
export const preloadSets = () => ({
  explore: mountedLayerSources((id) => DEFAULT_VISIBLE_SYSTEMS.includes(id)).map((l) => l.url),
  stretch: mountedLayerSources(visibleIn(guideLayers('stretch'))).map((l) => l.url),
  glide: mountedLayerSources(visibleIn(guideLayers('glide'))).map((l) => l.url),
})

import { dracoPath, versions } from 'virtual:anatomy-assets'
import previewData from '../anatomy/generated/previews.json'

export const DRACO_PATH = dracoPath

/** Content-versioned URL. Any change to the file yields a new URL, so it can be cached forever. */
export const assetUrl = (url: string) => (versions[url] ? `${url}?v=${versions[url]}` : url)

const previews = previewData.previews as Record<string, { url: string } | undefined>
/** Lightweight stand-in for a layer GLB (see asset-pipeline/build/build-previews.ts), if one was built. */
export const previewUrlOf = (url: string): string | undefined => previews[url]?.url

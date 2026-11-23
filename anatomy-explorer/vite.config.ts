import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { defineConfig, type HtmlTagDescriptor, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** The WASM decoder pair DRACOLoader fetches; the pure-JS fallback is never used by modern browsers. */
const DRACO_FILES = ['draco_wasm_wrapper.js', 'draco_decoder.wasm']
const VIRTUAL_ID = 'virtual:anatomy-assets'

const shortHash = (...buffers: Buffer[]) => {
  const hash = createHash('sha256')
  for (const buffer of buffers) hash.update(buffer)
  return hash.digest('hex').slice(0, 10)
}
const listGlbs = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? listGlbs(join(dir, entry.name))
      : entry.name.endsWith('.glb')
        ? [join(dir, entry.name)]
        : [],
  )

/**
 * Makes model delivery cacheable and parallel:
 * - `virtual:anatomy-assets` maps every GLB URL to a content hash. The app requests
 *   `url?v=<hash>`, so a URL changes exactly when its bytes do and the CDN can mark it immutable.
 * - The Draco decoder is emitted under a content-hashed directory for the same reason.
 * - index.html preloads the decoder, the lazily imported 3D chunks and the previews of the mode the
 *   page opens in (src/data/previews.json; a shared `#mode=glide` link opens in that guide), so they
 *   download alongside the app bundle instead of after it.
 */
function anatomyAssets(): Plugin {
  let publicDir = 'public'
  let root = '.'
  let isBuild = false
  let versions: Record<string, string> = {}
  let dracoHash = ''
  const dracoPath = () => (isBuild ? `/draco/${dracoHash}/` : '/draco/')
  const versioned = (url: string) => (versions[url] ? `${url}?v=${versions[url]}` : url)

  return {
    name: 'anatomy-assets',
    configResolved(config) {
      ;({ publicDir, root } = config)
      isBuild = config.command === 'build'
      versions = Object.fromEntries(
        listGlbs(join(publicDir, 'models'))
          .sort()
          .map((file) => [
            '/' + relative(publicDir, file).split(sep).join('/'),
            shortHash(readFileSync(file)),
          ]),
      )
      dracoHash = shortHash(...DRACO_FILES.map((f) => readFileSync(join(publicDir, 'draco', f))))
    },
    resolveId: (id) => (id === VIRTUAL_ID ? '\0' + VIRTUAL_ID : undefined),
    load(id) {
      if (id !== '\0' + VIRTUAL_ID) return
      return (
        `export const dracoPath = ${JSON.stringify(dracoPath())}\n` +
        `export const versions = ${JSON.stringify(versions)}\n`
      )
    },
    generateBundle() {
      for (const file of DRACO_FILES)
        this.emitFile({
          type: 'asset',
          fileName: `draco/${dracoHash}/${file}`,
          source: readFileSync(join(publicDir, 'draco', file)),
        })
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const { preload, previews } = JSON.parse(
          readFileSync(join(root, 'src/data/previews.json'), 'utf8'),
        ) as { preload: Record<string, string[]>; previews: Record<string, { url: string }> }
        const fetchPreload = (href: string): HtmlTagDescriptor => ({
          tag: 'link',
          // `crossorigin` matches the CORS-mode fetch three.js issues, so the preload is reused.
          attrs: { rel: 'preload', href, as: 'fetch', crossorigin: 'anonymous' },
          injectTo: 'head',
        })
        const sets = Object.fromEntries(
          Object.entries(preload).map(([mode, urls]) => [
            mode,
            urls.map((url) => versioned(previews[url].url)),
          ]),
        )
        // Parses the hash like src/lib/hashState.ts, before any other script runs.
        const pickPreviews =
          `(function(){var s=${JSON.stringify(sets)};` +
          `var m=new URLSearchParams(location.hash.slice(1)).get('mode');(` +
          `({}).hasOwnProperty.call(s,m)?s[m]:s.explore).forEach(function(u){var l=document.createElement('link');` +
          `l.rel='preload';l.as='fetch';l.crossOrigin='anonymous';l.href=u;document.head.appendChild(l)})})()`
        const tags: HtmlTagDescriptor[] = [
          ...DRACO_FILES.map((file) => fetchPreload(dracoPath() + file)),
          { tag: 'script', children: pickPreviews, injectTo: 'head' },
        ]
        // The 3D code is a lazy chunk (so the shell paints first); start fetching it immediately.
        const bundle = ctx.bundle
        const entry = bundle && Object.values(bundle).find((c) => c.type === 'chunk' && c.isEntry)
        if (bundle && entry?.type === 'chunk') {
          const loadedByEntry = new Set([entry.fileName, ...entry.imports])
          const lazy = new Set<string>()
          const visit = (fileName: string) => {
            const chunk = bundle[fileName]
            if (chunk?.type !== 'chunk' || lazy.has(fileName) || loadedByEntry.has(fileName)) return
            lazy.add(fileName)
            chunk.imports.forEach(visit)
          }
          entry.dynamicImports.forEach(visit)
          for (const fileName of lazy)
            tags.push({
              tag: 'link',
              attrs: { rel: 'modulepreload', crossorigin: true, href: `/${fileName}` },
              injectTo: 'head',
            })
        }
        return tags
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), anatomyAssets()],
})

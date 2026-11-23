// Copies the Draco decoder out of three.js so the app never needs a CDN at runtime.
// Only the WebAssembly pair is copied: every supported browser has WebAssembly, so the
// pure-JavaScript fallback decoder is never requested (see DRACO_FILES in vite.config.ts).
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'

const src = 'node_modules/three/examples/jsm/libs/draco/gltf'
if (existsSync(src)) {
  mkdirSync('public/draco', { recursive: true })
  for (const file of ['draco_wasm_wrapper.js', 'draco_decoder.wasm'])
    copyFileSync(`${src}/${file}`, `public/draco/${file}`)
}

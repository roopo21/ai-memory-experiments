// Copies the Draco decoder out of three.js so the app never needs a CDN at runtime.
import { cpSync, mkdirSync, existsSync } from 'node:fs'
const src = 'node_modules/three/examples/jsm/libs/draco/gltf'
if (existsSync(src)) {
  mkdirSync('public/draco', { recursive: true })
  cpSync(src, 'public/draco', { recursive: true })
}

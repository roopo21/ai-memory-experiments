/**
 * Writes public/models/{male,female}.glb from the procedural placeholder body.
 * Run: npm run gen:models
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { Scene } from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { buildPlaceholderBody } from '../src/scene/placeholderBody'

// GLTFExporter's binary path uses FileReader, which Node lacks.
class NodeFileReader {
  result: ArrayBuffer | null = null
  onloadend: null | (() => void) = null
  onerror: null | ((e: unknown) => void) = null
  readAsArrayBuffer(blob: Blob) {
    blob.arrayBuffer().then((b) => { this.result = b; this.onloadend?.() }, (e) => this.onerror?.(e))
  }
}
;(globalThis as unknown as { FileReader: unknown }).FileReader = NodeFileReader

mkdirSync('public/models', { recursive: true })
for (const sex of ['male', 'female'] as const) {
  const scene = new Scene()
  scene.add(buildPlaceholderBody(sex))
  const glb = (await new GLTFExporter().parseAsync(scene, { binary: true })) as ArrayBuffer
  writeFileSync(`public/models/${sex}.glb`, Buffer.from(glb))
  console.log(`public/models/${sex}.glb  ${(glb.byteLength / 1024).toFixed(0)} KB`)
}

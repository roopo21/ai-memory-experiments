import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
export async function motionRevision() {
  const hash = createHash('sha256')
  for (const file of [
    ...(await Promise.all(
      ['src/studio/choreography', 'src/motion/studio/guides'].map(async (folder) =>
        (await readdir(folder)).sort().map((name) => join(folder, name)),
      ),
    ).then((rows) => rows.flat())),
    'src/motion/distalJoints.ts',
    'src/motion/studio/handOrientation.ts',
    'src/motion/joints.ts',
    'src/motion/movementRig.ts',
    'src/motion/studio/sample.ts',
    'src/motion/studio/anchors.ts',
    'src/motion/studio/figure.ts',
    'src/motion/studio/StudioScene.tsx',
    'src/motion/studio/renderStage.ts',
    'src/studio/clips.ts',
    'src/studio/pins.ts',
    'src/anatomy/generated/previews.json',
    'src/motion/studio/assets/performer.glb',
  ])
    hash.update(await readFile(file))
  return hash.digest('hex')
}

import { Vector3 } from 'three'
import { createMovementRig } from '../src/motion/movementRig'
import { sampleStudio } from '../src/motion/studio/sample'
import { newProject } from '../src/studio/project'
import { palmPad } from '../src/motion/studio/anchors'
import { measure } from '../src/motion/anatomy'
const r = createMovementRig(),
  p = newProject()
const [id, ...ts] = process.argv.slice(2)
for (const t of ts.map(Number)) {
  sampleStudio(r, id as any, t, 'left', p)
  const sh = r.bones[6].getWorldPosition(new Vector3()),
    palm = r.bones[8].localToWorld(palmPad(1)),
    m = measure(r)
  console.log(
    t,
    'root',
    r.root.position
      .toArray()
      .map((v) => v.toFixed(2))
      .join(','),
    'shoulder',
    sh
      .toArray()
      .map((v) => v.toFixed(2))
      .join(','),
    'palm',
    palm
      .toArray()
      .map((v) => v.toFixed(2))
      .join(','),
    'shElev',
    m['L.shoulder.elevation'].toFixed(0),
    'elbow',
    m['L.elbow.flexion'].toFixed(0),
    'wrist',
    m['L.wrist.extension'].toFixed(0),
    'trunk',
    m['trunk.flexion']?.toFixed(0),
  )
}

import { createMovementRig } from '../src/motion/movementRig'
import { clips, isClip, clipInfo, type Side } from '../src/studio/clips'
import { sampleStudio } from '../src/motion/studio/sample'
import { newProject } from '../src/studio/project'
const r = createMovementRig(),
  p = newProject()
for (const id of Object.keys(clips).filter(isClip)) {
  const info = clipInfo(id)
  const bad = new Set<string>()
  for (const side of (info.unilateral ? ['left', 'right'] : ['left']) as Side[]) {
    let prev: any
    for (let n = 0; n <= Math.ceil(info.seconds * 60); n++) {
      const t = Math.min(n / 60, info.seconds)
      sampleStudio(r, id, t, side, p)
      const q = r.bones.map((b) => b.quaternion.clone())
      if (prev)
        q.forEach((x, i) => {
          if (x.angleTo(prev[i]) >= 0.82) bad.add(r.bones[i].name + '@' + t.toFixed(2))
        })
      prev = q
    }
  }
  if (bad.size) console.log(id, [...bad].join(' '))
}

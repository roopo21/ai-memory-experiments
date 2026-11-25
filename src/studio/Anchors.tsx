import { useState } from 'react'
import type { Triple } from '../motion/joints'
import type { Project } from './project'
import { limbs, type AnchorSpace, type EndJoint, type Pin } from './pins'
import { useStudio } from './store'

export default function Anchors({
  project,
  time,
  save,
}: {
  project: Project
  time: number
  save: (p: Project, t: number) => void
}) {
  const [limb, setLimb] = useState<EndJoint>('leftHand'),
    [space, setSpace] = useState<AnchorSpace>('world'),
    [toe, setToe] = useState(false)
  const author = useStudio((s) => s.author),
    hand = limb.endsWith('Hand'),
    pins = project.pins ?? [],
    pin = pins.find((p) => p.limb === limb)
  function replace(p?: Pin) {
    const rest = pins.filter((existing) => existing.limb !== limb)
    save({ ...project, pins: p ? [...rest, p] : rest }, time)
  }
  return (
    <details>
      <summary>Hand and foot anchors · {pins.length}</summary>
      <label>
        Limb
        <select
          aria-label="Anchor limb"
          value={limb}
          onChange={(e) => {
            setLimb(e.target.value as EndJoint)
            setSpace('world')
          }}
        >
          {limbs.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </label>
      {pin ? (
        <>
          <p>
            {pin.point} attached to {pin.space}
          </p>
          <div className="studio-axes">
            {['X', 'Y', 'Z'].map((axis, i) => (
              <label key={axis}>
                {axis} (m)
                <input
                  aria-label={'Anchor ' + axis}
                  type="number"
                  step=".01"
                  min="-5"
                  max="5"
                  value={Number(pin.at[i].toFixed(4))}
                  onChange={(e) => {
                    const n = e.target.valueAsNumber
                    if (!Number.isFinite(n) || Math.abs(n) > 5) return
                    const at: Triple = [...pin.at]
                    at[i] = n
                    replace({ ...pin, at })
                  }}
                />
              </label>
            ))}
          </div>
          <div className="studio-row">
            <label>
              Lock from (s)
              <input
                aria-label="Lock from"
                type="number"
                step=".05"
                min={0}
                max={pin.until ?? project.frames.at(-1)!.time}
                value={pin.from ?? 0}
                onChange={(e) => {
                  const n = e.target.valueAsNumber
                  if (n >= 0 && n < (pin.until ?? project.frames.at(-1)!.time))
                    replace({ ...pin, from: n })
                }}
              />
            </label>
            <label>
              Until (s)
              <input
                aria-label="Lock until"
                type="number"
                step=".05"
                min={pin.from ?? 0}
                max={project.frames.at(-1)!.time}
                value={pin.until ?? project.frames.at(-1)!.time}
                onChange={(e) => {
                  const n = e.target.valueAsNumber
                  if (n > (pin.from ?? 0) && n <= project.frames.at(-1)!.time)
                    replace({ ...pin, until: n })
                }}
              />
            </label>
          </div>
          <button onClick={() => replace()}>Release anchor</button>
        </>
      ) : (
        <>
          <label>
            Attach to
            <select
              aria-label="Anchor space"
              value={space}
              onChange={(e) => setSpace(e.target.value as AnchorSpace)}
            >
              {(hand ? ['world', 'pelvis', 'leftThigh', 'rightThigh'] : ['world', 'pelvis']).map(
                (k) => (
                  <option key={k}>{k}</option>
                ),
              )}
            </select>
          </label>
          {!hand && (
            <label className="studio-check">
              <input type="checkbox" checked={toe} onChange={(e) => setToe(e.target.checked)} />{' '}
              Lock toe tip
            </label>
          )}
          <button
            disabled={!author || (!hand && project.plantFeet)}
            onClick={() => {
              if (author)
                replace(
                  author.pin(project, time, limb, space, hand ? 'palm' : toe ? 'toe' : 'sole'),
                )
            }}
          >
            Lock at this pose
          </button>
        </>
      )}
    </details>
  )
}

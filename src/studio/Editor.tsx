import { maxProjectBytes } from './project'
import Anchors from './Anchors'
import { useRef, useState } from 'react'
import { joints, type Joint, type Triple } from '../motion/joints'
import { groups } from '../guides/library/groups'
import { applyCue, putPose, readProject, type KeyPose, type Project } from './project'
import { saveProject, seek, useStudio } from './store'
import { download, safeName } from './files'

export default function Editor() {
  const p = useStudio((s) => s.project),
    [selected, select] = useState(0),
    [joint, setJoint] = useState<Joint>('leftForearm'),
    [cmd, setCmd] = useState('At 2s bend both elbows 85'),
    [error, fail] = useState(''),
    [addTime, setAdd] = useState('6')
  const author = useStudio((s) => s.author),
    [report, setReport] = useState(''),
    [reviewed, setReviewed] = useState<Project | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const pose = p.frames.find((f) => f.time === selected) ?? p.frames[0]
  const apply = (project: Project, time: number) => {
    try {
      project = readProject(JSON.stringify(project))
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e))
      return
    }
    saveProject(project, time)
    select(time)
    fail('')
  }
  const attempt = (fn: () => void) => {
    try {
      fn()
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e))
    }
  }
  const edit = (patch: Partial<KeyPose>) =>
    attempt(() => apply(putPose(p, { ...pose, ...patch }), pose.time))
  const coordinate = (key: 'root' | 'angle', i: number, n: number) => {
    if (!Number.isFinite(n)) return
    const v: Triple = [...(key === 'root' ? pose.root : (pose.angles[joint] ?? [0, 0, 0]))]
    v[i] = n
    edit(key === 'root' ? { root: v } : { angles: { ...pose.angles, [joint]: v } })
  }
  return (
    <section className="studio-fields editor">
      <h2>Pose editor</h2>
      <label>
        Motion name
        <input
          aria-label="Motion name"
          maxLength={80}
          value={p.name}
          onChange={(e) => apply({ ...p, name: e.target.value || 'My movement' }, pose.time)}
        />
      </label>
      <label>
        Keyframe
        <select
          aria-label="Edit keyframe"
          value={pose.time}
          onChange={(e) => {
            const t = Number(e.target.value)
            select(t)
            seek(t)
          }}
        >
          {p.frames.map((f) => (
            <option key={f.time} value={f.time}>
              {f.time}s · {f.label}
            </option>
          ))}
        </select>
      </label>
      <div className="studio-row">
        <label>
          New time (s)
          <input
            type="number"
            min="0.05"
            max="60"
            step=".05"
            value={addTime}
            onChange={(e) => setAdd(e.target.value)}
          />
        </label>
        <button
          onClick={() =>
            attempt(() => {
              const t = Number(addTime)
              if (!addTime || p.frames.some((f) => f.time === t)) throw Error('Choose a new time.')
              apply(putPose(p, { ...structuredClone(pose), label: 'Pose', time: t }), t)
              setAdd(String(Math.min(60, t + 2)))
            })
          }
        >
          Add pose
        </button>
        <button
          disabled={pose.time === 0 || p.frames.length <= 2}
          onClick={() => apply({ ...p, frames: p.frames.filter((f) => f !== pose) }, 0)}
        >
          Delete
        </button>
      </div>
      <label>
        Joint
        <select
          aria-label="Joint"
          value={joint}
          onChange={(e) => setJoint(e.target.value as Joint)}
        >
          {joints.map(([k]) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </label>
      <div className="studio-axes">
        {(['X', 'Y', 'Z'] as const).map((a, i) => (
          <label key={a}>
            {a} (°)
            <input
              aria-label={'Joint ' + a + ' degrees'}
              type="number"
              min={-180}
              max={180}
              value={pose.angles[joint]?.[i] ?? 0}
              onChange={(e) => coordinate('angle', i, e.target.valueAsNumber)}
            />
          </label>
        ))}
      </div>
      <details>
        <summary>Root position and support</summary>
        <div className="studio-axes">
          {['X', 'Y', 'Z'].map((a, i) => (
            <label key={a}>
              {a} (m)
              <input
                type="number"
                step=".01"
                min={-2}
                max={2}
                value={pose.root[i]}
                onChange={(e) => coordinate('root', i, e.target.valueAsNumber)}
              />
            </label>
          ))}
        </div>
        <label className="studio-check">
          <input
            type="checkbox"
            disabled={Boolean(p.pins?.some((pin) => pin.limb.endsWith('Foot')))}
            checked={p.plantFeet}
            onChange={(e) => apply({ ...p, plantFeet: e.target.checked }, pose.time)}
          />{' '}
          Plant both feet at standing marks
        </label>
      </details>
      <Anchors project={p} time={pose.time} save={apply} />
      <label>
        Support prop
        <select
          aria-label="Support prop"
          value={p.prop ?? ''}
          onChange={(e) => {
            const v = e.target.value
            apply({ ...p, prop: v === 'mat' || v === 'chair' ? v : undefined }, pose.time)
          }}
        >
          <option value="">Floor</option>
          <option value="mat">Mat and head pad</option>
          <option value="chair">Chair</option>
        </select>
      </label>
      <label>
        Highlight
        <select
          aria-label="Highlight"
          value={
            p.target
              ? p.target.kind + '/' + p.target.id
              : p.target === undefined && p.base
                ? 'preset'
                : ''
          }
          onChange={(e) => {
            const [kind, id] = e.target.value.split('/')
            apply(
              {
                ...p,
                target:
                  kind === 'stretch' || kind === 'glide'
                    ? { kind, id }
                    : kind === 'preset'
                      ? undefined
                      : null,
              },
              pose.time,
            )
          }}
        >
          {p.base && <option value="preset">Original movement targets</option>}
          <option value="">Skeleton only</option>
          {(['stretch', 'glide'] as const).map((k) => (
            <optgroup label={k === 'stretch' ? 'Muscles' : 'Nerves'} key={k}>
              {groups[k].map((g) => (
                <option key={g.id} value={k + '/' + g.id}>
                  {g.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          attempt(() => {
            const v = applyCue(p, cmd)
            apply(v.project, v.time)
          })
        }}
      >
        <label>
          Motion cue
          <input value={cmd} onChange={(e) => setCmd(e.target.value)} maxLength={160} />
        </label>
        <button>Apply cue</button>
      </form>
      <details>
        <summary>Cue examples</summary>
        {[
          'At 2s bend left knee 60',
          'At 2s rotate chest y 25',
          'At 2s move root 0 -0.2 0',
          'At 3s hold',
          'At 4s return to start',
        ].map((c) => (
          <button key={c} onClick={() => setCmd(c)}>
            {c}
          </button>
        ))}
      </details>
      <div className="studio-row">
        <button
          onClick={() =>
            download(
              new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' }),
              safeName(p.name) + '.motion.json',
            )
          }
        >
          Download motion
        </button>
        <button onClick={() => file.current?.click()}>Import motion</button>
        <input
          ref={file}
          type="file"
          aria-label="Motion JSON"
          accept=".json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            try {
              if (f.size > maxProjectBytes) throw Error('The file exceeds 1.6 MB.')
              apply(readProject(await f.text()), 0)
            } catch (err) {
              fail(String(err))
            }
          }}
        />
      </div>
      <button
        disabled={!author}
        onClick={() => {
          if (author) {
            setReport(author.check(p))
            setReviewed(p)
          }
        }}
      >
        Check floor and foot locks
      </button>
      {report && reviewed === p && <p role="status">{report}</p>}
      <details>
        <summary>Previous draft</summary>
        <button
          onClick={() =>
            attempt(() => {
              const text = localStorage.getItem('anatomy-explorer.motion.previous')
              if (!text) throw Error('No earlier keyframe copy was saved.')
              const old = readProject(text)
              localStorage.setItem('anatomy-explorer.motion.previous', JSON.stringify(p))
              apply(old, 0)
            })
          }
        >
          Swap with previous draft
        </button>
      </details>
      {error && <p role="alert">{error}</p>}
    </section>
  )
}

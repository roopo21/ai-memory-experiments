import { Component, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, Focus, Maximize, Pause, Play, RotateCcw, Video } from 'lucide-react'
import { groupById } from '../guides/library/groups'
import { clips, clipInfo, motionTargets, type Angle, type ClipId } from './clips'
import {
  chooseClip,
  chooseFigure,
  chooseSide,
  initialSession,
  lengthOf,
  saveProject,
  seek,
  togglePlay,
  useStudio,
} from './store'
import { leaveStudio } from './navigation'
import { useRecording } from './useRecording'
import Editor from './Editor'
import RequestField from './RequestField'
import './studio.css'

class StageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    useStudio.setState({
      playing: false,
      ready: false,
      clean: false,
      error: 'The 3D stage could not load. Check your connection and reload the studio.',
    })
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}
function Transport() {
  const time = useStudio((s) => s.time),
    end = useStudio(lengthOf),
    phases = useStudio((s) => (s.clip === 'custom' ? s.project.frames : clips[s.clip].phases)),
    playing = useStudio((s) => s.playing),
    ready = useStudio((s) => s.ready),
    speed = useStudio((s) => s.speed),
    loop = useStudio((s) => s.loop)
  const marks = phases.map((p) => ('time' in p ? ([p.time, p.label] as const) : p))
  const active = [...marks].reverse().find((p) => p[0] <= time) ?? marks[0]
  const project = useStudio((s) => s.project),
    id = useStudio((s) => s.clip)
  const loopable =
    id !== 'custom' ||
    (JSON.stringify(project.frames[0].angles) === JSON.stringify(project.frames.at(-1)!.angles) &&
      JSON.stringify(project.frames[0].root) === JSON.stringify(project.frames.at(-1)!.root))
  return (
    <section aria-label="Playback" className="studio-transport">
      <div className="studio-playrow">
        <button
          aria-label={playing ? 'Pause' : 'Play'}
          className="play"
          disabled={!ready}
          onClick={togglePlay}
        >
          {playing ? <Pause size={17} /> : <Play size={17} />}
        </button>
        <button aria-label="Go to start" className="icon" onClick={() => seek(0)}>
          <RotateCcw size={15} />
        </button>
        <span className="studio-clock">
          {time.toFixed(2)} / {end.toFixed(2)} s
        </span>
        <input
          aria-label="Timeline"
          aria-valuetext={time.toFixed(2) + ' seconds, ' + active[1]}
          type="range"
          min={0}
          max={end}
          step=".01"
          value={time}
          onChange={(e) => seek(Number(e.target.value))}
        />
        <select
          aria-label="Playback speed"
          value={speed}
          onChange={(e) => useStudio.setState({ speed: Number(e.target.value) })}
        >
          {[0.25, 0.5, 1, 1.5, 2].map((v) => (
            <option value={v} key={v}>
              {v}×
            </option>
          ))}
        </select>
        <label className="studio-check">
          <input
            type="checkbox"
            disabled={!loopable}
            checked={loop}
            onChange={(e) => useStudio.setState({ loop: e.target.checked })}
          />{' '}
          Loop
        </label>
      </div>
      <div className="studio-phases" aria-label="Movement phases">
        {marks.map(([t, label]) => (
          <button
            key={t}
            aria-current={active[0] === t ? 'step' : undefined}
            onClick={() => seek(t)}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  )
}
export default function Studio({ children }: { children: ReactNode }) {
  const [boot, booted] = useState(false)
  useLayoutEffect(() => {
    useStudio.setState(initialSession(new URLSearchParams(location.search)))
    booted(true)
    return () => useStudio.setState({ ready: false, playing: false, clean: false })
  }, [])
  return boot ? <Workspace>{children}</Workspace> : null
}
function Workspace({ children }: { children: ReactNode }) {
  const clip = useStudio((s) => s.clip),
    info = clipInfo(clip),
    figure = useStudio((s) => s.figure),
    side = useStudio((s) => s.side),
    angle = useStudio((s) => s.angle),
    clean = useStudio((s) => s.clean),
    ready = useStudio((s) => s.ready),
    detail = useStudio((s) => s.detail),
    error = useStudio((s) => s.error),
    project = useStudio((s) => s.project)
  const { kind, primary, secondary } = motionTargets(clip, project.target, project.base)
  const author = useStudio((s) => s.author)
  const stage = useRef<HTMLDivElement>(null),
    cleanButton = useRef<HTMLButtonElement>(null)
  const { recording, record, cancel } = useRecording()
  const cleanAction = useRef(() => {})
  function exitClean() {
    if (recording) cancel()
    useStudio.setState({ clean: false })
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    requestAnimationFrame(() => cleanButton.current?.focus())
  }
  cleanAction.current = exitClean
  function enterClean() {
    useStudio.setState({ clean: true })
    stage.current?.focus({ preventScroll: true })
    const full = document.documentElement.requestFullscreen?.()
    void full?.catch(() => {})
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const s = useStudio.getState()
      if (e.key === 'Escape' && s.clean) {
        e.preventDefault()
        cleanAction.current()
        return
      }
      if (
        recording ||
        e.altKey ||
        e.metaKey ||
        e.ctrlKey ||
        (!s.clean &&
          e.target instanceof HTMLElement &&
          e.target.closest('input,select,textarea,button,summary,[contenteditable]'))
      )
        return
      if (e.code === 'Space') {
        e.preventDefault()
        togglePlay()
      }
      if (e.key === 'Home') {
        e.preventDefault()
        seek(0)
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
        seek(s.time + (e.key === 'ArrowRight' ? 1 : -1) / 30)
      }
    }
    const hidden = () => {
      if (document.hidden) useStudio.setState({ playing: false })
    }
    const pref = matchMedia('(prefers-reduced-motion: reduce)')
    const reduced = () => {
      if (pref.matches) useStudio.setState({ playing: false, loop: false })
    }
    const fullscreen = () => {
      if (!document.fullscreenElement && useStudio.getState().clean) cleanAction.current()
    }
    window.addEventListener('keydown', key)
    document.addEventListener('visibilitychange', hidden)
    document.addEventListener('fullscreenchange', fullscreen)
    pref.addEventListener('change', reduced)
    return () => {
      window.removeEventListener('keydown', key)
      document.removeEventListener('visibilitychange', hidden)
      document.removeEventListener('fullscreenchange', fullscreen)
      pref.removeEventListener('change', reduced)
    }
  }, [recording])
  const tap = useRef(0)
  return (
    <main
      className={'studio' + (clean ? ' studio-clean' : '')}
      aria-label="Motion Lab"
      data-ready={ready}
      data-clean={clean}
      data-recording={recording}
    >
      <header hidden={clean} className="studio-header">
        <button onClick={leaveStudio}>
          <ArrowLeft size={15} /> Anatomy Explorer
        </button>
        <h1>Motion Lab</h1>
      </header>
      <div
        ref={stage}
        className="studio-stage"
        tabIndex={-1}
        aria-label="Figure preview"
        onDoubleClick={() => {
          if (clean) exitClean()
        }}
        onTouchEnd={() => {
          const t = performance.now()
          if (clean && t - tap.current < 350) exitClean()
          tap.current = t
        }}
      >
        <StageBoundary>{children}</StageBoundary>
        {!ready && !error && !clean && (
          <span role="status" className="stage-status">
            Loading figure…
          </span>
        )}
      </div>
      <aside hidden={clean} aria-label="Studio controls" className="studio-panel">
        <div className="studio-fields">
          <h2>Movement</h2>
          <RequestField />
          <label>
            Clip
            <select
              aria-label="Clip"
              value={clip}
              onChange={(e) => chooseClip(e.target.value as ClipId)}
            >
              {(['Movements', 'Stretches', 'Nerve glides'] as const).map((group, i) => (
                <optgroup key={group} label={group}>
                  {Object.entries(clips)
                    .filter(([, c]) => c.kind === [undefined, 'stretch', 'glide'][i])
                    .sort(([, a], [, b]) => a.name.localeCompare(b.name))
                    .map(([id, c]) => (
                      <option key={id} value={id}>
                        {c.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          {clip !== 'custom' && (
            <button
              disabled={!ready}
              onClick={() => {
                if (!author) return
                try {
                  localStorage.setItem('anatomy-explorer.motion.previous', JSON.stringify(project))
                } catch {
                  useStudio.setState({
                    error: 'Download your existing custom motion before making a copy.',
                  })
                  return
                }
                saveProject(author.copy(), 0)
              }}
            >
              Edit a keyframe copy
            </button>
          )}
          {info.unilateral && (
            <fieldset>
              <legend>Performer’s side</legend>
              <div className="studio-segment">
                {(['left', 'right'] as const).map((s) => (
                  <button key={s} aria-pressed={side === s} onClick={() => chooseSide(s)}>
                    {s === 'left' ? 'Left' : 'Right'}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        </div>
        {clip === 'custom' && <Editor />}
        <div className="studio-fields">
          <h2>Figure</h2>
          <div className="studio-segment" aria-label="Figure appearance">
            {(['anatomy', 'bones', 'human', 'pair'] as const).map((v, i) => (
              <button key={v} aria-pressed={figure === v} onClick={() => chooseFigure(v)}>
                {['Targets', 'Skeleton', 'Human', 'Both'][i]}
              </button>
            ))}
          </div>
          {primary.length > 0 && (
            <div className={'studio-legend ' + kind}>
              {[primary, secondary].map(
                (ids, i) =>
                  ids.length > 0 && (
                    <p key={i}>
                      <i data-role={i ? 'secondary' : 'primary'} />
                      <span>
                        {i ? 'Secondary' : 'Primary'} ·{' '}
                        {ids.map((k) => groupById[kind].get(k)?.name).join(', ')}
                      </span>
                    </p>
                  ),
              )}
            </div>
          )}
          <label className="studio-check">
            <input
              type="checkbox"
              checked={detail}
              onChange={(e) =>
                useStudio.setState({ detail: e.target.checked, ready: false, playing: false })
              }
            />{' '}
            Full-resolution anatomy
          </label>
        </div>
        <div className="studio-fields">
          <h2>Camera</h2>
          <div className="studio-row">
            <label>
              View
              <select
                aria-label="Camera angle"
                value={angle}
                onChange={(e) => useStudio.setState({ angle: e.target.value as Angle })}
              >
                {['Teaching', 'Side', 'Front', 'Back', 'Overhead'].map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
            <button
              aria-label="Frame movement"
              onClick={() => useStudio.setState((s) => ({ resetCamera: s.resetCamera + 1 }))}
            >
              <Focus size={15} /> Frame
            </button>
          </div>
        </div>
        <div className="studio-fields">
          <h2>Capture</h2>
          <button
            ref={cleanButton}
            className="studio-primary"
            disabled={!ready}
            onClick={enterClean}
          >
            <Maximize size={16} /> Clean view
          </button>
          {typeof MediaRecorder !== 'undefined' &&
            typeof HTMLCanvasElement.prototype.captureStream === 'function' && (
              <button
                disabled={!ready}
                onClick={() => {
                  const canvas = stage.current?.querySelector('canvas')
                  if (canvas) record(canvas)
                }}
              >
                <Video size={16} /> Record one take
              </button>
            )}
          <p>Space plays or pauses. Escape or double-tap brings controls back.</p>
        </div>
        {error && (
          <p role="alert" className="studio-error">
            {error} {!ready && <button onClick={() => location.reload()}>Reload studio</button>}
          </p>
        )}
        <details className="studio-notes">
          <summary>About these motions</summary>
          <p>
            These are authoring previews. Highlighted structures are selected targets. Joint
            animation is an approximation. Guide movements await clinical review.
          </p>
          <a href="/models/ATTRIBUTION.md" target="_blank" rel="noreferrer">
            Model credits
          </a>
        </details>
      </aside>
      {!clean && <Transport />}
    </main>
  )
}

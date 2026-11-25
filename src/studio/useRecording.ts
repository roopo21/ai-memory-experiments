import { useEffect, useRef, useState } from 'react'
import { download, safeName } from './files'
import { lengthOf, seek, useStudio } from './store'

/** Record the stage canvas only. Interrupted takes are discarded; a retry starts at zero. */
export function useRecording() {
  const [recording, setRecording] = useState(false),
    handle = useRef<MediaRecorder | null>(null)
  const cancel = useRef<() => void>(() => {})
  useEffect(() => () => cancel.current(), [])
  function record(canvas: HTMLCanvasElement) {
    if (handle.current || !useStudio.getState().ready) return
    const s = useStudio.getState(),
      chunks: Blob[] = []
    let cancelled = false,
      done = false,
      unsub = () => {},
      tail: ReturnType<typeof setTimeout> | undefined,
      stream: MediaStream | undefined
    const original = { speed: s.speed, loop: s.loop, clean: s.clean }
    try {
      const mime = [
        'video/mp4;codecs=avc1.42001E',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
      ].find((t) => MediaRecorder.isTypeSupported(t))
      if (!mime)
        throw Error(
          'This browser has no supported video encoder. Use Clean view with your screen recorder.',
        )
      stream = canvas.captureStream(30)
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8000000 })
      const stop = () => {
        if (rec.state !== 'inactive') rec.stop()
      }
      const interrupted = () => {
        if (document.hidden) cancel.current()
      }
      cancel.current = () => {
        cancelled = true
        done = false
        if (rec.state === 'inactive') rec.onstop?.(new Event('stop'))
        else stop()
      }
      handle.current = rec
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data)
      }
      rec.onstop = () => {
        clearTimeout(tail)
        unsub()
        document.removeEventListener('visibilitychange', interrupted)
        stream?.getTracks().forEach((t) => t.stop())
        handle.current = null
        setRecording(false)
        cancel.current = () => {}
        useStudio.setState({ ...original, playing: false })
        if (done && chunks.length)
          download(
            new Blob(chunks, { type: mime }),
            safeName(
              (s.clip === 'custom' ? s.project.name : s.clip) + '-' + s.figure + '-' + s.side,
            ) + (mime.includes('mp4') ? '.mp4' : '.webm'),
          )
      }
      rec.onerror = () => {
        useStudio.setState({
          error: 'The video encoder stopped. Retry or use Clean view with your screen recorder.',
        })
        cancel.current()
      }
      seek(0)
      useStudio.setState({ clean: true, speed: 1, loop: false })
      setRecording(true)
      document.addEventListener('visibilitychange', interrupted)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (handle.current !== rec || cancelled) return
          try {
            rec.start()
            useStudio.setState({ playing: true })
            unsub = useStudio.subscribe((next) => {
              if (!next.ready) {
                cancel.current()
                return
              }
              if (!next.playing && !tail) {
                done = next.time === lengthOf(next)
                tail = setTimeout(stop, 65)
              }
            })
          } catch {
            rec.onstop?.(new Event('stop'))
            useStudio.setState({ error: 'The video encoder could not start.' })
          }
        }),
      )
    } catch (e) {
      stream?.getTracks().forEach((t) => t.stop())
      useStudio.setState({ error: e instanceof Error ? e.message : String(e) })
    }
  }
  return { recording, record, cancel: () => cancel.current() }
}

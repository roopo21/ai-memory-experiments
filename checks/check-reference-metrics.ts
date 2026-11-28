/**
 * Signal metrics for the reference-envelope check. This is the TypeScript twin of
 * scripts/reference/common.py: the same low-pass, derivatives, log dimensionless jerk, phase
 * timing and coupling, so a guide is measured with the estimator its reference was measured with.
 * Change one, change the other, and re-derive (docs/reference/motion-reference/README.md).
 */
export const FS = 30
export const CUTOFF = 5

/** Second-order Butterworth low-pass, as scipy.signal.butter(2, fc / (fs / 2)). */
function butter2(fc: number, fs: number) {
  const K = Math.tan((Math.PI * fc) / fs),
    s2 = Math.SQRT2,
    norm = 1 / (1 + s2 * K + K * K)
  const b0 = K * K * norm
  return { b: [b0, 2 * b0, b0], a: [1, 2 * (K * K - 1) * norm, (1 - s2 * K + K * K) * norm] }
}

/** Direct-form II transposed filter with initial state, as scipy.signal.lfilter. */
function lfilter(b: number[], a: number[], x: number[], zi: [number, number]) {
  let z0 = zi[0],
    z1 = zi[1]
  const y = new Array<number>(x.length)
  for (let n = 0; n < x.length; n++) {
    const yn = b[0] * x[n] + z0
    z0 = b[1] * x[n] - a[1] * yn + z1
    z1 = b[2] * x[n] - a[2] * yn
    y[n] = yn
  }
  return y
}

/** Steady-state initial condition for a unit step, as scipy.signal.lfilter_zi. */
function lfilterZi(b: number[], a: number[]): [number, number] {
  // Solve (I - A) z = B - a[1:] * b[0] with A = [[-a1, 1], [-a2, 0]].
  const m00 = 1 + a[1],
    m01 = -1,
    m10 = a[2],
    m11 = 1
  const r0 = b[1] - a[1] * b[0],
    r1 = b[2] - a[2] * b[0]
  const det = m00 * m11 - m01 * m10
  return [(r0 * m11 - m01 * r1) / det, (m00 * r1 - m10 * r0) / det]
}

/** Zero-phase low-pass with odd-extension padding, as scipy.signal.filtfilt. */
export function smooth(x: number[], fs = FS, cutoff = CUTOFF): number[] {
  const n = x.length
  if (n < 4) return x.slice()
  const pad = Math.min(n - 1, 15),
    { b, a } = butter2(cutoff, fs)
  const ext: number[] = []
  for (let i = pad; i >= 1; i--) ext.push(2 * x[0] - x[i])
  ext.push(...x)
  for (let i = 1; i <= pad; i++) ext.push(2 * x[n - 1] - x[n - 1 - i])
  const zi = lfilterZi(b, a)
  const fwd = lfilter(b, a, ext, [zi[0] * ext[0], zi[1] * ext[0]])
  const rev = fwd.reverse()
  const bwd = lfilter(b, a, rev, [zi[0] * rev[0], zi[1] * rev[0]]).reverse()
  return bwd.slice(pad, pad + n)
}

/** Central differences with one-sided ends, as numpy.gradient. */
export function gradient(x: number[], dt: number): number[] {
  const n = x.length
  if (n < 2) return x.map(() => 0)
  return x.map((_, i) =>
    i === 0
      ? (x[1] - x[0]) / dt
      : i === n - 1
        ? (x[n - 1] - x[n - 2]) / dt
        : (x[i + 1] - x[i - 1]) / (2 * dt),
  )
}

/** Angular velocity, acceleration and jerk of an already smoothed series (deg/s, /s², /s³). */
export function derivs(x: number[], fs = FS) {
  const v = gradient(x, 1 / fs),
    a = gradient(v, 1 / fs)
  return { v, a, j: gradient(a, 1 / fs) }
}

/** Share of peak speed that starts and ends a stroke, as ONSET in common.py. */
const ONSET = 0.05

/**
 * Log dimensionless jerk of one movement (Balasubramanian 2015); more negative is jerkier. Taken
 * over the span where speed exceeds 5 percent of its peak, so a joint that idles for part of a
 * segment is judged on the stroke it makes.
 */
export function ldlj(x: number[], fs = FS): number | undefined {
  const { v, j } = derivs(x, fs),
    vp = Math.max(...v.map(Math.abs))
  if (vp < 1e-6) return undefined
  const idx = v.flatMap((q, i) => (Math.abs(q) > ONSET * vp ? [i] : [])),
    a = idx[0],
    b = idx[idx.length - 1] + 1
  if (b - a < 6) return undefined
  const T = (b - a - 1) / fs,
    sum = j.slice(a, b).reduce((s, q) => s + q * q, 0)
  return -Math.log(((T ** 3 / vp ** 2) * sum) / fs)
}

export const range = (x: number[]) => Math.max(...x) - Math.min(...x)

/** Linear-interpolation percentile, as numpy.percentile. */
export function percentile(values: number[], p: number): number {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!v.length) return NaN
  const k = ((v.length - 1) * p) / 100,
    f = Math.floor(k),
    c = Math.min(v.length - 1, f + 1)
  return v[f] + (v[c] - v[f]) * (k - f)
}

/** Linear coupling of series b on series a: slope (b per a) and |r|; undefined if a barely moves. */
export function coupling(a: number[], b: number[]) {
  if (range(a) < 5) return undefined
  const n = a.length,
    ma = a.reduce((s, q) => s + q, 0) / n,
    mb = b.reduce((s, q) => s + q, 0) / n
  let sab = 0,
    saa = 0,
    sbb = 0
  for (let i = 0; i < n; i++) {
    sab += (a[i] - ma) * (b[i] - mb)
    saa += (a[i] - ma) ** 2
    sbb += (b[i] - mb) ** 2
  }
  return { slope: sab / saa, r: sbb > 0 ? Math.abs(sab / Math.sqrt(saa * sbb)) : 0 }
}

/**
 * Phase timing of one rise-and-return movement: rise (10 to 90 percent of its range), dwell
 * (above 90 percent) and fall, in seconds. Same definition as `timing` in common.py.
 */
export function timing(x: number[], fs = FS) {
  const lo = Math.min(...x),
    hi = Math.max(...x),
    rng = hi - lo
  if (rng < 1e-6) return undefined
  const n = x.map((q) => (q - lo) / rng),
    k = n.indexOf(1)
  const first = (pred: (q: number) => boolean, from: number, to: number) => {
    for (let i = from; i <= to; i++) if (pred(n[i])) return i
    return -1
  }
  const last = (pred: (q: number) => boolean, from: number, to: number) => {
    for (let i = to; i >= from; i--) if (pred(n[i])) return i
    return -1
  }
  const t10u = first((q) => q >= 0.1, 0, k),
    t90u = first((q) => q >= 0.9, 0, k),
    t90d = last((q) => q >= 0.9, k, n.length - 1),
    t10d = last((q) => q >= 0.1, k, n.length - 1)
  if ([t10u, t90u, t90d, t10d].some((i) => i < 0)) return undefined
  return {
    rise: (t90u - t10u) / fs,
    dwell: (t90d - t90u) / fs,
    fall: (t10d - t90d) / fs,
  }
}

"""Signal handling and statistics shared by the UI-PRMD and AddBiomechanics derivations.

Both sources are reduced to the same thing: joint-angle series in the app's convention (degrees,
zero in the standing neutral pose, see docs/reference/motion-reference/README.md) resampled to
30 Hz, which is the rate `checks/check-form.ts` and `checks/check-reference.ts` sample the guides
at. The same estimator (`smooth`, `derivs`, `ldlj`) is implemented again in
`checks/reference/metrics.ts`; keep them in step.
"""

import numpy as np
from scipy import signal

FS = 30.0  # Hz, the analysis rate
ONSET = 0.05  # share of peak speed that starts and ends a stroke
CUTOFF = 5.0  # Hz, low-pass applied before differentiating; removes marker and IK noise
PCT = (1, 5, 25, 50, 75, 95, 99)


def resample(x, fs_in, fs_out=FS):
    """Low-pass at the output Nyquist and resample to `fs_out`. Rows are frames; any columns."""
    x = np.asarray(x, float)
    n_out = int(round(len(x) * fs_out / fs_in))
    t_in = np.arange(len(x)) / fs_in
    t_out = np.arange(n_out) / fs_out
    b, a = signal.butter(2, 0.45 * fs_out / (fs_in / 2))
    y = signal.filtfilt(b, a, x, axis=0, padlen=min(len(x) - 1, 3 * max(len(a), len(b))))
    if y.ndim == 1:
        return np.interp(t_out, t_in, y)
    return np.stack([np.interp(t_out, t_in, y[:, c]) for c in range(y.shape[1])], axis=1)


def smooth(x, fs=FS, cutoff=CUTOFF):
    b, a = signal.butter(2, cutoff / (fs / 2))
    return signal.filtfilt(b, a, x, padlen=min(len(x) - 1, 15))


def derivs(x, fs=FS):
    """Angular velocity, acceleration and jerk of an already smoothed series (deg/s, /s², /s³)."""
    v = np.gradient(x, 1 / fs)
    a = np.gradient(v, 1 / fs)
    j = np.gradient(a, 1 / fs)
    return v, a, j


def ldlj(x, fs=FS):
    """Log dimensionless jerk of one movement (Balasubramanian 2015), more negative is jerkier.

    -ln( T^3 / vpeak^2 * integral(jerk^2) dt ), over the span where speed exceeds 5 percent of its
    peak, so a joint that idles for part of a segment is judged on the stroke it makes. Scale-free,
    so squats and arm raises compare.
    """
    v, _, j = derivs(x, fs)
    vp = np.max(np.abs(v))
    if vp < 1e-6:
        return None
    moving = np.flatnonzero(np.abs(v) > ONSET * vp)
    a, b = moving[0], moving[-1] + 1
    if b - a < 6:
        return None
    T = (b - a - 1) / fs
    return float(-np.log(T**3 / vp**2 * np.sum(j[a:b] ** 2) / fs))


def pct(values, ps=(5, 50, 95)):
    v = np.asarray([x for x in values if x is not None and np.isfinite(x)], float)
    if len(v) == 0:
        return None
    return {f'p{p}': round(float(np.percentile(v, p)), 2) for p in ps}


def pct_full(values):
    return pct(values, PCT)


def reps(x, fs=FS, min_range=0.0, prominence=0.4, min_gap_s=1.0):
    """Split a many-repetition trial into single repetitions of a primary signal.

    A repetition runs between the signal's lows on either side of a high that rises at least
    `prominence` of the trial's range above them. Returns (start, end) frame pairs.
    """
    x = smooth(np.asarray(x, float), fs, 3.0)
    rng = np.ptp(x)
    if rng < max(min_range, 1e-6):
        return []
    peaks, _ = signal.find_peaks(x, prominence=prominence * rng, distance=int(min_gap_s * fs))
    if len(peaks) == 0:
        return []
    lows = [int(np.argmin(x[a:b])) + a for a, b in zip(peaks[:-1], peaks[1:])]
    first = int(np.argmin(x[: peaks[0]])) if peaks[0] > 0 else 0
    last = int(np.argmin(x[peaks[-1] :])) + peaks[-1]
    edges = [first] + lows + [last]
    return [(a, b) for a, b in zip(edges[:-1], edges[1:]) if b - a >= int(0.6 * fs)]


def timing(x, fs=FS):
    """Phase timing of one repetition of a single-peak movement, from a series that starts and
    ends near the start posture: rise (10 to 90 percent of its range), dwell (above 90 percent)
    and fall (90 to 10 percent), in seconds, plus when peak speed occurs as a fraction of the rise.
    """
    lo, hi = np.min(x), np.max(x)
    rng = hi - lo
    if rng < 1e-6:
        return None
    n = (x - lo) / rng
    k = int(np.argmax(n))
    up = n[: k + 1]
    down = n[k:]
    try:
        t10u = np.where(up >= 0.1)[0][0]
        t90u = np.where(up >= 0.9)[0][0]
        t90d = k + np.where(down >= 0.9)[0][-1]
        t10d = k + np.where(down >= 0.1)[0][-1]
    except IndexError:
        return None
    v = np.gradient(smooth(x, fs), 1 / fs)
    rise = slice(t10u, max(t90u, t10u + 2))
    pk = np.argmax(np.abs(v[rise])) / max(1, (t90u - t10u))
    return {
        'rise_s': (t90u - t10u) / fs,
        'dwell_s': (t90d - t90u) / fs,
        'fall_s': (t10d - t90d) / fs,
        'peak_speed_at': float(pk),
        'duration_s': (t10d - t10u) / fs,
    }


def coupling(a, b):
    """Linear coupling of series b on series a over a repetition: slope (b per a) and |r|."""
    a, b = np.asarray(a, float), np.asarray(b, float)
    if np.ptp(a) < 5:
        return None
    s, _ = np.polyfit(a, b, 1)
    r = np.corrcoef(a, b)[0, 1]
    return {'slope': float(s), 'r': float(abs(r))}

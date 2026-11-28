"""Derive compact natural-movement statistics from UI-PRMD and AddBiomechanics.

    sh scripts/reference/run.sh                # download into the git-ignored cache, then derive
    sh scripts/reference/run.sh --no-fetch     # derive from files already in the cache
    sh scripts/reference/run.sh --limit 2      # two subjects per source, for a quick trial

Writes docs/reference/motion-reference/data/envelopes.json. Only that file and this script are
committed; the raw data stays in `.cache/motion-reference/` (git-ignored, see .gitignore). The
JSON holds percentiles and ratios across at least five subjects per entry, never a trajectory.
"""

import argparse
import collections
import contextlib
import datetime
import hashlib
import json
import os
import sys
import zipfile

import numpy as np

import common
import fetch
import ui_prmd

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CACHE = os.path.join(ROOT, '.cache', 'motion-reference')
OUT = os.path.join(ROOT, 'docs', 'reference', 'motion-reference', 'data', 'envelopes.json')
SOURCES = json.load(open(os.path.join(os.path.dirname(__file__), 'sources.json')))
MIN_SUBJECTS = 5

# One entry per reference movement. `primary` drives repetition splitting, timing and smoothness.
# `sided` movements are done with one limb: the side with the larger primary range is the working
# side ('hip.flexion') and the other is 'other.hip.flexion'. `couple` lists (driver, driven) pairs.
LOWER = ['hip.flexion', 'hip.abduction', 'knee.flexion', 'ankle.plantarflexion']
TRUNK = ['pelvis.tilt', 'trunk.inclination', 'trunk.flexion']
SQUATLIKE = [('hip.flexion', 'knee.flexion'), ('knee.flexion', 'ankle.plantarflexion'),
             ('hip.flexion', 'pelvis.tilt'), ('trunk.inclination', 'hip.flexion')]
FAMILIES = {
    'ui-prmd/deep-squat': dict(src='ui-prmd', mv=1, primary='knee.flexion', sided=False,
                               joints=LOWER + TRUNK, couple=SQUATLIKE, lumbopelvic=True),
    'ui-prmd/hurdle-step': dict(src='ui-prmd', mv=2, primary='hip.flexion', sided=True,
                                joints=LOWER + TRUNK, couple=[('hip.flexion', 'knee.flexion')]),
    'ui-prmd/inline-lunge': dict(src='ui-prmd', mv=3, primary='knee.flexion', sided=False,
                                 joints=LOWER + TRUNK, couple=SQUATLIKE),
    'ui-prmd/side-lunge': dict(src='ui-prmd', mv=4, primary='hip.abduction', sided=True,
                               joints=LOWER + TRUNK, couple=[('hip.flexion', 'knee.flexion')]),
    'ui-prmd/sit-to-stand': dict(src='ui-prmd', mv=5, primary='knee.flexion', sided=False,
                                 joints=LOWER + TRUNK, couple=SQUATLIKE, lumbopelvic=True),
    'ui-prmd/standing-leg-raise': dict(src='ui-prmd', mv=6, primary='hip.flexion', sided=True,
                                       joints=LOWER + TRUNK, couple=[('hip.flexion', 'pelvis.tilt')]),
    'ui-prmd/shoulder-abduction': dict(src='ui-prmd', mv=7, primary='shoulder.elevation', sided=True,
                                       joints=['shoulder.elevation', 'shoulder.plane', 'elbow.flexion', 'trunk.inclination'],
                                       couple=[]),
    'ui-prmd/shoulder-extension': dict(src='ui-prmd', mv=8, primary='shoulder.elevation', sided=True,
                                       joints=['shoulder.elevation', 'shoulder.plane', 'elbow.flexion', 'trunk.inclination'],
                                       couple=[]),
    'ui-prmd/shoulder-scaption': dict(src='ui-prmd', mv=10, primary='shoulder.elevation', sided=True,
                                      joints=['shoulder.elevation', 'shoulder.plane', 'elbow.flexion', 'trunk.inclination'],
                                      couple=[]),
    'addbiomechanics/squat': dict(src='addbiomechanics', mv='squat', primary='knee.flexion', sided=False,
                                  joints=LOWER + TRUNK + ['trunk.lateral', 'trunk.rotation'], couple=SQUATLIKE,
                                  lumbopelvic=True),
    'addbiomechanics/sit-to-stand': dict(src='addbiomechanics', mv='sit-to-stand', primary='knee.flexion',
                                         sided=False, joints=LOWER + TRUNK, couple=SQUATLIKE, lumbopelvic=True),
    'addbiomechanics/walk': dict(src='addbiomechanics', mv='walk', primary=None, sided=False,
                                 joints=LOWER + TRUNK + ['trunk.lateral', 'trunk.rotation', 'elbow.flexion',
                                                         'shoulder.elevation'],
                                 couple=[('hip.flexion', 'knee.flexion')]),
    'addbiomechanics/run': dict(src='addbiomechanics', mv='run', primary=None, sided=False,
                                joints=LOWER + TRUNK + ['elbow.flexion', 'shoulder.elevation'],
                                couple=[('hip.flexion', 'knee.flexion')]),
}
CLASSES = {  # joint class for the generic speed and acceleration envelopes
    'hip': ['hip.flexion', 'hip.abduction'], 'knee': ['knee.flexion'],
    'ankle': ['ankle.plantarflexion'], 'shoulder': ['shoulder.elevation'],  # rotation is ill-conditioned near full elevation
    'elbow': ['elbow.flexion'], 'trunk': ['trunk.flexion', 'trunk.inclination', 'trunk.lateral',
                                           'trunk.rotation'], 'pelvis': ['pelvis.tilt'],
}
CLASS_OF = {j: c for c, js in CLASSES.items() for j in js}


@contextlib.contextmanager
def quiet_stderr():
    """nimblephysics prints one warning per missing mesh to stderr from C++."""
    sys.stdout.flush()
    saved = os.dup(2)
    os.dup2(os.open(os.devnull, os.O_WRONLY), 2)
    try:
        yield
    finally:
        os.dup2(saved, 2)
        os.close(saved)


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(1 << 20), b''):
            h.update(block)
    return h.hexdigest()


# ---------------------------------------------------------------------------------------------
# Fetching
# ---------------------------------------------------------------------------------------------
def fetch_ui_prmd():
    src = SOURCES['ui-prmd']
    dest = os.path.join(CACHE, 'ui-prmd', 'segmented.zip')
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.exists(dest) and sha256(dest) == src['archive']['sha256']:
        return dest
    for url in src['archive']['urls']:
        try:
            print('UI-PRMD: downloading', url)
            size, ranges = fetch.head(url)
            data = fetch.ranged_get(url, 0, size, workers=16) if ranges else None
            if data and hashlib.sha256(data).hexdigest() == src['archive']['sha256']:
                open(dest, 'wb').write(data)
                return dest
            print('  checksum mismatch, trying the next URL')
        except Exception as e:  # the origin host currently refuses scripted requests
            print('  failed:', e)
    raise SystemExit('Could not fetch a UI-PRMD archive matching the pinned checksum.')


def fetch_addbio():
    src = SOURCES['addbiomechanics']
    folder = os.path.join(CACHE, 'addbiomechanics')
    os.makedirs(folder, exist_ok=True)
    remote = None
    paths = []
    for m in src['members']:
        dest = os.path.join(folder, m['name'].replace('/', '__'))
        paths.append((m, dest))
        if os.path.exists(dest) and os.path.getsize(dest) == m['size']:
            continue
        remote = remote or fetch.RemoteZip(src['archive']['url'])
        print('AddBiomechanics: extracting', m['name'])
        info = remote.extract(m['name'], dest + '.part')
        print('  done', flush=True)
        assert info.CRC == m['crc32'], 'archive changed under us: ' + m['name']
        os.replace(dest + '.part', dest)
    return paths


# ---------------------------------------------------------------------------------------------
# Per-item metrics
# ---------------------------------------------------------------------------------------------
class Family:
    def __init__(self, name, cfg):
        self.name, self.cfg = name, cfg
        self.subjects, self.items = set(), 0
        self.frames = collections.defaultdict(list)  # joint -> arrays of smoothed frames
        self.rep = collections.defaultdict(lambda: collections.defaultdict(list))
        self.timing = collections.defaultdict(list)
        self.smooth = collections.defaultdict(list)
        self.couple = collections.defaultdict(lambda: collections.defaultdict(list))
        self.contact = collections.defaultdict(list)

    def add(self, subject, series, feet, rng):
        """Add one repetition (or one cyclic trial). `series` has our joint names, working side
        first for sided families; `feet` maps 'L'/'R' to (heel, toe) position arrays."""
        cfg = self.cfg
        self.subjects.add(subject)
        self.items += 1
        for j in cfg['joints']:
            if j not in series:
                continue
            x = common.smooth(series[j])
            self.frames[j].append(x)
            self.rep[j]['min'].append(float(x.min()))
            self.rep[j]['max'].append(float(x.max()))
            self.rep[j]['rom'].append(float(np.ptp(x)))
            v, a, _ = common.derivs(x)
            cls = CLASS_OF.get(j)
            if cls:
                self.smooth['speed:' + cls].append(np.abs(v))
                self.smooth['accel:' + cls].append(np.abs(a))
        p = cfg['primary']
        if p and p in series and len(series[p]) >= 8:
            x = common.smooth(series[p])
            t = common.timing(x)
            if t:
                for k, val in t.items():
                    self.timing[k].append(val)
            lj = common.ldlj(x)
            if lj is not None:
                self.smooth['ldlj'].append(lj)
            v, a, _ = common.derivs(x)
            self.smooth['peak_speed_dps'].append(float(np.max(np.abs(v))))
            self.smooth['peak_accel_dps2'].append(float(np.max(np.abs(a))))
        for a_name, b_name in cfg['couple']:
            if a_name in series and b_name in series:
                c = common.coupling(common.smooth(series[a_name]), common.smooth(series[b_name]))
                if c:
                    self.couple[f'{a_name}->{b_name}']['slope'].append(c['slope'])
                    self.couple[f'{a_name}->{b_name}']['r'].append(c['r'])
        if cfg.get('lumbopelvic') and 'trunk.inclination' in series and 'trunk.flexion' in series:
            incl = common.smooth(series['trunk.inclination'])
            k = int(np.argmax(incl))
            if incl[k] > 15:
                flex = common.smooth(series['trunk.flexion'])
                self.couple['lumbar-share-of-trunk-lean']['share'].append(float(flex[k] / incl[k]))
        if feet:
            self.add_feet(feet)

    def add_feet(self, feet):
        """Heel and toe contact from height above each foot's own lowest point (15 mm band).

        `feet` maps a side to (heel, toe, up axis, metres per unit): AddBiomechanics is y up in
        metres, Vicon is z up in millimetres.
        """
        for side, (heel, toe, up, scale) in feet.items():
            h = (heel[:, up] - np.percentile(heel[:, up], 2)) * scale
            t = (toe[:, up] - np.percentile(toe[:, up], 2)) * scale
            flat = (h < 0.015) & (t < 0.015)
            self.contact['flat_frac'].append(float(flat.mean()))
            self.contact['heel_up_frac'].append(float(((h >= 0.015) & (t < 0.015)).mean()))
            self.contact['toe_up_frac'].append(float(((h < 0.015) & (t >= 0.015)).mean()))
            # Drift of the heel over each flat run: planted feet do not slide.
            horiz = [i for i in range(3) if i != up]
            starts = np.flatnonzero(np.diff(np.r_[0, flat.astype(int)]) == 1)
            ends = np.flatnonzero(np.diff(np.r_[flat.astype(int), 0]) == -1)
            for s, e in zip(starts, ends):
                if e - s >= 6:
                    d = np.linalg.norm((heel[e, horiz] - heel[s, horiz]) * scale)
                    self.contact['flat_drift_m'].append(float(d))

    def summary(self):
        out = {
            'subjects': len(self.subjects),
            'items': self.items,
            'primary': self.cfg['primary'],
            'sided': self.cfg['sided'],
            'angles': {},
        }
        for j, arrs in self.frames.items():
            allv = np.concatenate(arrs)
            out['angles'][j] = {
                'frames': common.pct_full(allv),
                'min': common.pct(self.rep[j]['min']),
                'max': common.pct(self.rep[j]['max']),
                'rom': common.pct(self.rep[j]['rom']),
            }
        if self.timing:
            out['timing'] = {k: common.pct(v) for k, v in self.timing.items()}
        sm = {}
        for k in ('ldlj', 'peak_speed_dps', 'peak_accel_dps2'):
            if self.smooth.get(k):
                sm[k] = common.pct(self.smooth[k])
        if sm:
            out['smoothness'] = sm
        if self.couple:
            out['coupling'] = {k: {m: common.pct(v) for m, v in d.items()} for k, d in self.couple.items()}
        if self.contact:
            out['contact'] = {k: common.pct(v) for k, v in self.contact.items()}
        return out


def sided_view(series, primary):
    """Rename L./R. series to working side (no prefix) and 'other.' by the larger primary range."""
    rng = {s: np.ptp(series[f'{s}.{primary}']) for s in 'LR' if f'{s}.{primary}' in series}
    work = max(rng, key=rng.get)
    other = 'R' if work == 'L' else 'L'
    out = {k: v for k, v in series.items() if not k[:2] in ('L.', 'R.')}
    for k, v in series.items():
        if k.startswith(work + '.'):
            out[k[2:]] = v
        elif k.startswith(other + '.'):
            out['other.' + k[2:]] = v
    return out, work


def both_sides(series):
    """Pool left and right as two independent items with side-free names."""
    for s in 'LR':
        yield s, {(k[2:] if k.startswith(s + '.') else k): v for k, v in series.items()
                  if not (k[:2] in ('L.', 'R.') and not k.startswith(s + '.'))}


# ---------------------------------------------------------------------------------------------
# Sources
# ---------------------------------------------------------------------------------------------
def run_ui_prmd(zip_path, fams, limit):
    by_mv = {cfg['mv']: name for name, cfg in FAMILIES.items() if cfg['src'] == 'ui-prmd'}
    for mv, sub, ep, series, feet in ui_prmd.episodes(zip_path):
        if limit and sub > limit or mv not in by_mv:
            continue
        name = by_mv[mv]
        cfg = FAMILIES[name]
        if cfg['sided']:
            view, work = sided_view(series, cfg['primary'])
            fams[name].add(f'ui{sub}', view, {work: (*feet[work], 2, 0.001)}, None)
        else:
            for s, view in both_sides(series):
                fams[name].add(f'ui{sub}', view, {s: (*feet[s], 2, 0.001)}, None)


def run_addbio(paths, fams, limit):
    import nimblephysics as nimble

    import addbio

    taken = collections.Counter()
    for m, path in paths:
        key = m['group']
        if limit and taken[key] >= limit:
            continue
        taken[key] += 1
        with quiet_stderr():
            trials = list(addbio.load(path, nimble))
        for mv, trial, fs, series, feet, _meta in trials:
            name = f'addbiomechanics/{mv}'
            cfg = FAMILIES[name]
            sid = f"{m['group']}:{m['subject']}"
            series = {k: common.resample(v, fs) for k, v in series.items()}
            feet = {s: (common.resample(h, fs), common.resample(t, fs)) for s, (h, t) in feet.items()}
            if cfg['primary']:
                lead = (series['L.' + cfg['primary']] + series['R.' + cfg['primary']]) / 2
                for a, b in common.reps(lead):
                    for s, view in both_sides({k: v[a:b] for k, v in series.items()}):
                        fams[name].add(sid, view, {s: (feet[s][0][a:b], feet[s][1][a:b], 1, 1.0)}, None)
            else:  # gait and running: one cyclic trial per side
                for s, view in both_sides(series):
                    fams[name].add(sid, view, {s: (*feet[s], 1, 1.0)}, None)


def generic(fams):
    """Speed, acceleration and smoothness over every reference movement, by joint class."""
    out = {'speed_dps': {}, 'accel_dps2': {}}
    for cls in CLASSES:
        for key, dest in (('speed', 'speed_dps'), ('accel', 'accel_dps2')):
            arrs = [a for f in fams.values() for a in f.smooth.get(f'{key}:{cls}', [])]
            if arrs:
                v = np.concatenate(arrs)
                out[dest][cls] = {f'p{p}': round(float(np.percentile(v, p)), 1) for p in (50, 95, 99, 99.9)}
    lj = [x for f in fams.values() for x in f.smooth.get('ldlj', [])]
    out['ldlj'] = common.pct(lj, (1, 5, 25, 50, 75, 95))
    # Share of the trunk's forward lean that is lumbar (the rest is pelvic tilt), at peak lean.
    # Kept per source: UI-PRMD's pelvis comes from skin markers over the ASIS and PSIS and is noisy.
    out['lumbar_share'] = {}
    for src in ('addbiomechanics', 'ui-prmd'):
        v = [x for n, f in fams.items() if n.startswith(src)
             for x in f.couple.get('lumbar-share-of-trunk-lean', {}).get('share', [])]
        if v:
            out['lumbar_share'][src] = common.pct(v, (5, 25, 50, 75, 95))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--no-fetch', action='store_true')
    ap.add_argument('--limit', type=int, default=0, help='subjects per source/group, for trials')
    ap.add_argument('--only', default='', help='ui-prmd or addbiomechanics')
    args = ap.parse_args()
    fams = {n: Family(n, c) for n, c in FAMILIES.items()}
    used = []
    if args.only in ('', 'ui-prmd'):
        z = os.path.join(CACHE, 'ui-prmd', 'segmented.zip') if args.no_fetch else fetch_ui_prmd()
        run_ui_prmd(z, fams, args.limit)
        used.append('ui-prmd')
    if args.only in ('', 'addbiomechanics'):
        paths = ([(m, os.path.join(CACHE, 'addbiomechanics', m['name'].replace('/', '__')))
                  for m in SOURCES['addbiomechanics']['members']]
                 if args.no_fetch else fetch_addbio())
        paths = [(m, p) for m, p in paths if os.path.exists(p)]
        run_addbio(paths, fams, args.limit)
        used.append('addbiomechanics')
    summaries = {}
    for name, f in fams.items():
        if f.items == 0:
            continue
        s = f.summary()
        if s['subjects'] < MIN_SUBJECTS and not args.limit:
            print(f'skipped {name}: only {s["subjects"]} subjects (minimum {MIN_SUBJECTS})')
            continue
        summaries[name] = s
        print(f'{name}: {s["subjects"]} subjects, {s["items"]} repetitions')
    doc = {
        'schema': 1,
        'generated': datetime.date.today().isoformat(),
        'rate_hz': common.FS,
        'low_pass_hz': common.CUTOFF,
        'sources': {k: SOURCES[k]['provenance'] for k in used},
        'excluded': {'ui-prmd episodes with an occluded marker': len(ui_prmd.DROPPED)} if 'ui-prmd' in used else {},
        'generic': generic(fams),
        'families': summaries,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(doc, open(OUT, 'w'), indent=1, sort_keys=False)
    print('wrote', os.path.relpath(OUT, ROOT))


if __name__ == '__main__':
    main()

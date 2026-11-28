"""UI-PRMD (University of Idaho Physical Rehabilitation Movements Data set) to joint angles.

Uses the Vicon *positions* of the 39 reflective markers, not the supplied angle files: the angle
files are three Euler values per joint in an undocumented YXZ convention whose zero and segment
frames differ from ours, while marker positions can be turned into angles with definitions we
control. Marker names and order are Table 2 of Vakanski et al. 2018; units are millimetres, 100 Hz.

Axes: Vicon lab frame, z up. The subject's forward and left axes come from the pelvis markers in
the first (calibration) frame. All angles are relative to the calibration posture, which is quiet
standing: the first frames of an episode, or the last frames for sit to stand.
"""

import io
import re
import zipfile

import numpy as np

import common

MARKERS = (
    'LFHD RFHD LBHD RBHD C7 T10 CLAV STRN RBAK LSHO LUPA LELB LFRM LWRA LWRB LFIN RSHO RUPA RELB '
    'RFRM RWRA RWRB RFIN LASI RASI LPSI RPSI LTHI LKNE LTIB LANK LHEE LTOE RTHI RKNE RTIB RANK '
    'RHEE RTOE'
).split()
IDX = {m: i for i, m in enumerate(MARKERS)}
FS_IN = 100.0
MOVEMENTS = {
    1: 'deep-squat',
    2: 'hurdle-step',
    3: 'inline-lunge',
    4: 'side-lunge',
    5: 'sit-to-stand',
    6: 'standing-leg-raise',
    7: 'shoulder-abduction',
    8: 'shoulder-extension',
    9: 'shoulder-rotation',  # not derived: axial rotation is not recoverable from these markers
    10: 'shoulder-scaption',
}
USED = (
    'C7 LASI RASI LPSI RPSI LKNE RKNE LANK RANK LHEE RHEE LTOE RTOE LSHO RSHO LELB RELB LWRA '
    'LWRB RWRA RWRB'
).split()
DROPPED = []
FILE = re.compile(r'Vicon/Positions/m(\d\d)_s(\d\d)_e(\d\d)_positions\.txt$')


def _unit(v):
    return v / np.linalg.norm(v, axis=-1, keepdims=True)


def _angle(u, v):
    return np.degrees(np.arccos(np.clip((_unit(u) * _unit(v)).sum(-1), -1, 1)))


def _swing(vec, fwd, up):
    """Signed angle (deg) of `vec` from straight down toward `fwd` in the sagittal plane."""
    return np.degrees(np.arctan2((vec * fwd).sum(-1), -(vec * up).sum(-1)))


def angles(p, calibrate='start'):
    """Joint angles, both sides, from marker positions `p` (frames, 39, 3), mm.

    Returns {name: array} with names like 'L.hip.flexion' and the whole-body 'pelvis.tilt',
    'trunk.inclination', 'trunk.flexion'. Zero is the calibration posture.
    """
    m = lambda n: p[:, IDX[n]]
    n0 = slice(0, 8) if calibrate == 'start' else slice(-8, None)
    up = np.array([0.0, 0.0, 1.0])
    left0 = m('LASI')[n0].mean(0) - m('RASI')[n0].mean(0)
    left0 = _unit(left0 - up * (left0 @ up))
    fwd = np.cross(left0, up)
    mid_asis = (m('LASI') + m('RASI')) / 2
    mid_psis = (m('LPSI') + m('RPSI')) / 2
    out = {}
    # Pelvis: anterior tilt is the ASIS dropping below the PSIS, seen from the side.
    pv = mid_asis - mid_psis
    tilt = np.degrees(np.arctan2(-(pv * up).sum(-1), (pv * fwd).sum(-1)))
    out['pelvis.tilt'] = tilt
    # Trunk lean from the vertical: pelvis centre to C7, forward positive.
    trunk_up = m('C7') - (mid_asis + mid_psis) / 2
    incl = np.degrees(np.arctan2((trunk_up * fwd).sum(-1), (trunk_up * up).sum(-1)))
    out['trunk.inclination'] = incl
    out['trunk.flexion'] = incl - tilt
    width = np.linalg.norm(m('LASI') - m('RASI'), axis=-1)
    depth = np.linalg.norm(mid_asis - mid_psis, axis=-1)
    for side, s in (('L', 1), ('R', -1)):
        k = lambda n: m(side + n)
        # Hip joint centre (Harrington et al. 2007) in the pelvis' own frame: lateral axis through
        # the ASIS, anterior axis toward the ASIS from the PSIS, superior axis perpendicular.
        lat = _unit(m('LASI') - m('RASI'))
        ant = _unit(pv - lat * (pv * lat).sum(-1, keepdims=True))
        sup = _unit(np.cross(ant, lat))
        hjc = (
            mid_asis
            + ant * (-0.24 * depth[:, None] - 9.9)
            - sup * (0.30 * width[:, None] + 10.9)
            + s * lat * (0.33 * width[:, None] + 7.3)
        )
        thigh = k('KNE') - hjc
        shank = k('ANK') - k('KNE')
        # Hip: thigh swing plus pelvic tilt, so it is relative to the pelvis as in the rig.
        out[f'{side}.hip.flexion'] = _swing(thigh, fwd, up) + tilt
        out[f'{side}.hip.abduction'] = s * np.degrees(
            np.arcsin(np.clip((_unit(thigh) * left0).sum(-1), -1, 1))
        )
        out[f'{side}.knee.flexion'] = 180 - _angle(-thigh, shank)
        foot = k('TOE') - k('HEE')
        out[f'{side}.ankle.plantarflexion'] = -_angle(shank, foot)
        # Shoulder: humerus against the trunk's down axis; plane from the trunk frame.
        sho, elb, wri = k('SHO'), k('ELB'), (k('WRA') + k('WRB')) / 2
        arm = elb - sho
        trunk_down = -_unit(trunk_up)
        out[f'{side}.shoulder.elevation'] = _angle(arm, trunk_down)
        lat_out = s * left0
        out[f'{side}.shoulder.plane'] = np.degrees(
            np.arctan2((arm * fwd).sum(-1), (arm * lat_out).sum(-1))
        )
        out[f'{side}.elbow.flexion'] = 180 - _angle(sho - elb, wri - elb)
    # Calibrate: subtract the standing posture so zero is the rig's neutral. Elevation and
    # rotation keep their calibration offset too (the arm hangs at the side at the start).
    for key, v in out.items():
        if key.endswith('shoulder.plane'):
            continue
        out[key] = v - np.median(v[n0])
    # Knee flexion is positive flexed; at the calibration posture it is within a few degrees of
    # straight, so removing the offset is safe. Ankle sign: the angle between shank and foot
    # shrinks as the foot plantarflexes, hence the minus above.
    return out


def episodes(zip_path):
    """Yield (movement id, subject, episode, {name: series at 30 Hz}) for every Vicon episode."""
    with zipfile.ZipFile(zip_path) as z:
        for info in sorted(z.infolist(), key=lambda i: i.filename):
            mt = FILE.search(info.filename)
            if not mt:
                continue
            mv, sub, ep = (int(x) for x in mt.groups())
            raw = np.loadtxt(io.BytesIO(z.read(info.filename)), delimiter=',')
            p = raw.reshape(len(raw), 39, 3)
            # Vicon writes an occluded marker as 0,0,0. Drop an episode that loses a marker the
            # angle definitions use rather than interpolate across it.
            if (np.abs(p[:, [IDX[m] for m in USED]]).sum(2) == 0).any():
                DROPPED.append(info.filename)
                continue
            a = angles(p, 'end' if mv == 5 else 'start')
            # Feet for contact: heel and toe markers.
            feet = {
                s: (p[:, IDX[s + 'HEE']], p[:, IDX[s + 'TOE']]) for s in ('L', 'R')
            }
            series = {k: common.resample(v, FS_IN) for k, v in a.items()}
            yield mv, sub, ep, series, {s: (common.resample(h, FS_IN), common.resample(t, FS_IN)) for s, (h, t) in feet.items()}

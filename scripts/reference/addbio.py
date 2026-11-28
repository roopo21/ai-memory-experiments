"""AddBiomechanics (.b3d) to joint angles in the app's convention.

Each subject file holds OpenSim (Rajagopal 2016 style) coordinates per trial, already inverse
kinematics-solved and low-pass filtered (processing pass 1), plus world joint centres per frame.
Signs below were checked against the data, not assumed: knee flexion is positive, ankle angle is
positive in dorsiflexion, pelvis tilt is positive posterior (so anterior tilt is its negative), and
`trunk.inclination` from the joint centres equals anterior tilt plus lumbar flexion to within 1 degree.

Reads with `nimblephysics`, whose C++ layer prints mesh warnings to stderr; the driver silences them.
"""

import re

import numpy as np

import common

PASS = 1  # LOW_PASS_FILTER kinematics
JOINTS = (
    'ground_pelvis hip_r walker_knee_r ankle_r subtalar_r mtp_r hip_l walker_knee_l ankle_l '
    'subtalar_l mtp_l back acromial_r elbow_r radioulnar_r radius_hand_r acromial_l elbow_l '
    'radioulnar_l radius_hand_l'
).split()
# Trial name to movement. Modified or simulated-impairment trials (asymmetric squats, weak legs,
# trunk sway) are not natural movement and are left out.
RULES = [
    ('squat', re.compile(r'^squats\d+_segment')),
    ('sit-to-stand', re.compile(r'^STS_?\d+_segment')),
    ('walk', re.compile(r'^(walking\d+|Gait_\d+)_segment')),
    ('run', re.compile(r'^run\d+_segment')),
]


def movement_of(trial_name):
    for name, rx in RULES:
        if rx.match(trial_name):
            return name
    return None


def load(path, nimble):
    """Yield (movement, trial name, fs, series, feet) for each natural-movement trial of a file."""
    s = nimble.biomechanics.SubjectOnDisk(path)
    sk = s.readSkel(PASS, ignoreGeometry=True)
    dofs = [sk.getDofByIndex(i).getName() for i in range(sk.getNumDofs())]
    meta = {'sex': str(s.getBiologicalSex()), 'height_m': s.getHeightM(), 'mass_kg': s.getMassKg()}
    for t in range(s.getNumTrials()):
        mv = movement_of(s.getTrialName(t))
        if not mv:
            continue
        n = s.getTrialLength(t)
        fs = 1.0 / s.getTrialTimestep(t)
        frames = s.readFrames(t, 0, n, includeSensorData=False, includeProcessingPasses=True)
        pos = np.degrees(np.array([f.processingPasses[PASS].pos for f in frames]))
        jc = np.array([np.array(f.processingPasses[PASS].jointCenters).reshape(-1, 3) for f in frames])
        yield mv, s.getTrialName(t), fs, *convert(pos, jc, dofs), meta


def convert(pos, jc, dofs):
    col = lambda k: pos[:, dofs.index(k)]
    j = lambda k: jc[:, JOINTS.index(k)]
    up = np.array([0.0, 1.0, 0.0])
    out = {}
    out['pelvis.tilt'] = -col('pelvis_tilt')  # anterior positive
    out['trunk.flexion'] = -col('lumbar_extension')
    out['trunk.inclination'] = out['pelvis.tilt'] + out['trunk.flexion']
    # Magnitudes only: the rig's sign for these two is not the model's.
    out['trunk.lateral'] = np.abs(col('lumbar_bending'))
    out['trunk.rotation'] = np.abs(col('lumbar_rotation'))
    mid = (j('acromial_r') + j('acromial_l')) / 2
    trunk_up = mid - j('back')
    trunk_up /= np.linalg.norm(trunk_up, axis=1, keepdims=True)
    right = j('acromial_r') - j('acromial_l')
    fwd_t = np.cross(trunk_up, right)
    fwd_t /= np.linalg.norm(fwd_t, axis=1, keepdims=True)
    for s in 'lr':
        side = s.upper()
        out[f'{side}.hip.flexion'] = col(f'hip_flexion_{s}')
        out[f'{side}.hip.abduction'] = -col(f'hip_adduction_{s}')
        out[f'{side}.knee.flexion'] = col(f'knee_angle_{s}')
        out[f'{side}.ankle.plantarflexion'] = -col(f'ankle_angle_{s}')
        out[f'{side}.elbow.flexion'] = col(f'elbow_flex_{s}')
        sign = 1 if s == 'r' else -1
        arm = j(f'elbow_{s}') - j(f'acromial_{s}')
        arm_u = arm / np.linalg.norm(arm, axis=1, keepdims=True)
        out[f'{side}.shoulder.elevation'] = np.degrees(
            np.arccos(np.clip(-(arm_u * trunk_up).sum(1), -1, 1))
        )
        out[f'{side}.shoulder.plane'] = np.degrees(
            np.arctan2((arm_u * fwd_t).sum(1), sign * (arm_u * right).sum(1) / np.linalg.norm(right, axis=1))
        )
    # No calibration: the model's zero is already upright standing within a few degrees.
    return out, feet(jc)


def feet(jc):
    """Heel and toe world positions (subtalar and metatarsophalangeal joint centres), metres."""
    j = lambda k: jc[:, JOINTS.index(k)]
    return {'R': (j('subtalar_r'), j('mtp_r')), 'L': (j('subtalar_l'), j('mtp_l'))}

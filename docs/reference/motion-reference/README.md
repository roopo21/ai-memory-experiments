# Natural-movement reference

`npm run check:reference` asks of every guide, "is this how people move?". `check:form` and
`check:physics` ask whether a pose is possible. This asks whether it is typical, using statistics
from two open datasets. It reports; it does not break the build (see [Status](#status)).

Licences, URLs and versions: [LICENSES.md](LICENSES.md). Which guide is held against which
movement: [guide-map.md](guide-map.md). The numbers: [data/envelopes.json](data/envelopes.json).
How to rebuild them: [scripts/reference/README.md](../../../scripts/reference/README.md).

## What was derived

| Source                                        | Subjects     | Movements used                                                                                                               |
| --------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| UI-PRMD (Vicon markers)                       | 10, 100 reps | deep squat, hurdle step, inline lunge, side lunge, sit to stand, standing leg raise, shoulder abduction, extension, scaption |
| AddBiomechanics 1.0 (6 + 7 + 6 subject files) | 6 to 12      | OpenCap squats and sit to stand (Uhlrich 2023), walking (Uhlrich 2023, Falisse), running (Hamner 2013)                       |

Not derived, and why: UI-PRMD shoulder internal and external rotation (axial rotation cannot be
recovered from the arm markers: the proxy wrapped through 360°); AddBiomechanics jumps and stairs
(none in the subject files chosen; the archive has them in other sources we did not download);
anything that is a stretch. **No reference exists here for any stretch, nerve glide, floor posture
(supine, prone, side-lying, all fours, sphinx) or hand grip.** Healthy adults moving casually do not
reach stretch end range, so those numbers would need a recorded session of our own.

Per movement the JSON holds, as percentiles across repetitions and subjects (never a trajectory):

- **Joint envelopes** per angle: p1 to p99 of all frames, and p5, p50, p95 of each repetition's
  minimum, maximum and range.
- **Coupling** between joints per repetition: slope and |r| of hip against knee, knee against
  ankle, hip against pelvic tilt, trunk lean against hip, and the **lumbar share of trunk lean** at
  peak lean (lumbopelvic rhythm).
- **Angular speed, acceleration and smoothness**: peak speed and acceleration of the primary joint
  per repetition, log dimensionless jerk (LDLJ), and speed and acceleration percentiles by joint
  class over all movement (the generic envelopes).
- **Timing**: rise, dwell and fall of each repetition (10 to 90 percent of its range) and when peak
  speed occurs. These are _transitions_. Neither source has a held pose, so there is no reference
  for how long a person holds a stretch or how still; hold timing stays with `check:physics`.
- **Foot contact**: share of frames flat, heel up or toes up (15 mm band over each foot's own lowest
  point) and heel drift across each flat spell.

Every entry has at least 5 subjects behind it (`derive.py` refuses fewer).

## Joint mapping and axis conventions

Angles are in degrees, zero in upright standing, in the naming of `measure()` in
`src/motion/anatomy.ts` (`L.hip.flexion`, …). Reference angles drop the side: both sides pooled for
two-legged movements (squat, lunge, sit to stand, gait), working side only for one-limbed ones (leg
raise, hurdle step, side lunge, shoulder). The rig faces +z, left is +x, up is +y.

| Our angle (positive is)            | Rig, `measure()`                                       | AddBiomechanics (Rajagopal 2016 OpenSim model)               | UI-PRMD (marker positions, our definition)                       |
| ---------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| `hip.flexion` (thigh forward)      | femur against the pelvis                               | `hip_flexion_r/l`                                            | thigh (hip centre to knee) swing from vertical plus pelvic tilt  |
| `hip.abduction` (knee outward)     | femur against the pelvis                               | `-hip_adduction`                                             | thigh against the pelvis' sagittal plane                         |
| `knee.flexion` (shin back)         | shin hinge                                             | `knee_angle` (positive flexed in this data)                  | 180° minus the angle between thigh and shank                     |
| `ankle.plantarflexion` (toes down) | foot against shin                                      | `-ankle_angle` (the model's is positive dorsiflexed)         | minus the angle between shank and heel-to-toe, against standing  |
| `pelvis.tilt` (top forward)        | `hip.flexion` minus the thigh's own swing in the world | `-pelvis_tilt` (the model's is positive posterior)           | ASIS dropping below PSIS in the sagittal plane, against standing |
| `trunk.flexion` (lumbar to chest)  | sum of the three spine bones against the pelvis        | `-lumbar_extension`                                          | trunk lean minus pelvic tilt                                     |
| `trunk.inclination` (from upright) | `pelvis.tilt` plus `trunk.flexion`                     | the same sum; matches the joint-centre lean within 1°        | pelvis centre to C7 from vertical                                |
| `shoulder.elevation`               | humerus against the thorax's down axis                 | acromial to elbow joint centre against the torso's down axis | shoulder to elbow marker against the trunk's down axis           |
| `shoulder.plane`                   | 0 abduction, +90 flexion, -90 extension                | the same from joint centres                                  | the same from markers                                            |
| `elbow.flexion`                    | ulna hinge                                             | `elbow_flex`                                                 | 180° minus shoulder-elbow-wrist angle                            |

Checked, not assumed. In AddBiomechanics the derived pelvic tilt plus lumbar flexion equals the
trunk lean taken from joint centres to within 1° in squats and sit to stand, which fixes the signs.
In UI-PRMD, a deep squat gives hip 105°, knee 110° and ankle dorsiflexion 27° (medians of peaks),
a standing leg raise hip 80°, sit to stand hip 94°: all in the ranges the literature reports for
these tasks.

**Not compared:** hip rotation (the model's sign convention is not the rig's and has not been
verified), trunk lateral bend and rotation (kept as magnitudes only), anything at the wrist or
hand, the scapula (the Rajagopal model has no scapula, and UI-PRMD has no scapular marker, so
**scapulohumeral rhythm cannot be checked against reference**; the rig's 2:1 rule in
`scapularRhythm` stands on its own), and neck and jaw.

## How a guide is compared

Each guide is sampled at 30 Hz, left side (the right is its mirror), and 75 angles are measured with
`measure()`, plus pelvic tilt and trunk lean from the rig. Guides are analytic and noise free, so
they are measured raw; the reference was low-passed at 5 Hz to remove sensor noise. The same code
computes LDLJ, timing and coupling on both sides (`scripts/reference/common.py` and
`checks/check-reference-metrics.ts`); `selfTest()` pins them to each other.

**Generic, every guide**

| Kind          | Rule                                                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `speed`       | Peak angular speed of a joint beyond the reference p99.9 for its joint class warns (×1) and fails (×1.5). Classes: hip, knee, ankle, shoulder, elbow, trunk, pelvis |
| `accel`       | The same for angular acceleration                                                                                                                                   |
| `jerk`        | Each move between two beats, for each joint that moves 10° or more in it: LDLJ below the reference p1 warns, 2 below that fails                                     |
| `lumbopelvic` | In an upright posture with 15° or more of trunk lean, the lumbar share of the lean outside the AddBiomechanics p5 to p95 widened by 0.25 warns (0.5 fails)          |

Pelvic tilt is a world angle, so it is skipped for lying postures.

**Mapped guides** ([guide-map.md](guide-map.md))

- `same`: the guide is the reference movement. Joint extremes more than 10° beyond the pooled
  reference extreme warn, 25° fail (`range`). Coupling slopes outside the reference p5 to p95,
  widened by max(0.15, 30% of its width), warn (`coupling`). Moving faster than 60% of the
  quickest reference repetitions warns (`timing`). Heels up more than the reference plus 15% of
  the clip warns (`contact`).
- `similar`: the same joints in a related posture or a passive stretch. Joint extremes get a
  **30° passive allowance** on top of the tolerances. Coupling only if the map opts in.

The 30° is an assumption. Nothing here measures passive end range, so it is the number to challenge.

## Reading the report

```
WARN deep-squat-hold  (same: ui-prmd/deep-squat, addbiomechanics/squat)
  warn range L.knee.flexion 147.3 at 1.90 s (frame 57); expected 125° (reference high extreme)
```

Each non-passing guide lists its kind, the joint on the working or named side, the value, the time
and 30 Hz frame of the worst moment, and the limit with its source. `[known]` marks a guide whose
kind is in `checks/check-reference-known.json`. A **warn** says "unusual compared with these
people", not "wrong"; a **fail** is far beyond them. Look at stills (`motion-qa`) at the named time
before changing a pose. `--report out.json` also writes the peak speed and acceleration per joint
class for every guide, so a margin can be read even when nothing is flagged.

Common causes and what they mean:

- `lumbopelvic` with value 1.0: the whole trunk lean is in the spine and the pelvis never tilts. A
  seated or kneeling fold with a flat pelvis. The rig supports pelvic tilt (`pelvis` in a pose).
- `speed` or `accel` on one frame near the end of a clip: the pose changes in a single frame, a pop,
  usually the loop's return beat.
- `jerk` on shoulder or elbow at a beat boundary: the arm, which lags the body by design, makes a
  second small stroke. The joint is smooth but the beat structure is visible in it.
- `range` on a `same` guide beyond the reference: the guide goes deeper than the people measured.

## Status

A reporting check, with one hard guard: it **fails regardless of `--strict`** if `envelopes.json` names a source outside the licence allowlist (CC BY 4.0, PDDL, CC0), has an entry with fewer than 5 subjects, or if any tracked file has a raw-motion extension (`.bvh .amc .c3d .fbx .npz .pkl .mot .osim .b3d` and the like). That is the licence quarantine, not a quality finding.

Otherwise it reports. It exits 0 unless `--strict` is given, and then only guides or kinds absent from
the known list fail. `npm run check:reference:strict` is the tightened form and is not in
`npm run check` yet. To tighten: fix a finding, run `npm run check:reference -- --write-known` to
shrink the list, and review the diff (never let it grow without a written reason), then add the
strict form to `check:studio`. Re-derive (`npm run reference:derive`) after changing a family or an
estimator, then re-run `--write-known` and `--write-map`.

## What is uncertain

- **Small, healthy, casual.** 6 to 12 adults per movement, healthy adult volunteers in labs, not people with
  limited mobility. Envelopes show typical, not possible.
- **Squats here are shallower than a mobility deep squat.** Reference knee flexion peaks at 82 to
  125°; the supported deep squat hold goes to 147°. The skill's own "knee 140 to 150" for a deep
  squat is beyond the 95th percentile (125°) of the 260 reference squats. The warning is correct about the data and says nothing
  about whether 147° is wrong for a flexible person.
- **UI-PRMD angles are ours, from skin markers.** Hip centre by regression, ±5° or more. Its pelvic
  tilt is noisier than the model-based AddBiomechanics one, so the lumbar share uses only
  AddBiomechanics (UI-PRMD's median is 0.78, AddBiomechanics' 0.46).
- **UI-PRMD's origin page was unreachable** on 2026-11-28; data came from the Internet Archive copy
  checked against a pinned SHA-256 ([LICENSES.md](LICENSES.md)).
- **Few subjects per AddBiomechanics source** because the archive serves about 1 MB/s. Raising the
  subject lists in `scripts/reference/pin_sources.py` is free of any other change.
- **No stretch reference at all.** The generic checks cover smoothness and rhythm; a captured
  session of our own (research note, section 6) is the only fix.
- **Health claims.** Nothing here is clinical (AGENTS.md rule 6). Do not describe the app as
  "validated against motion capture" without wording approved by a lawyer.

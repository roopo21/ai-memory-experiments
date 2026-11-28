---
name: biomechanics-physics
description: Rules and numbers for making Anatomy Explorer demonstrations obey real physics and real joints - support contact, balance, joint ranges, joint rhythms, easing and jitter. Use whenever you author or change a stretch, nerve glide, studio clip or the rig solvers, before you call any pose done.
---

# Biomechanics and physics for the rig

The owner's rule: naturalness and anatomical accuracy for every exercise, at any cost. A pose that
looks fine from one angle but floats, sinks, falls over, bends a joint backwards or twitches is a
bug. Everything below is enforced by `npm run check:physics` (tolerances live in
`src/motion/physics/policy.ts`, quote that file, never copy numbers into new code).

## 1. Support: nothing floats, nothing sinks

- The root height is **derived from contact**, never typed. Guides ground themselves in
  `src/motion/studio/guides/ground.ts` (`groundGuide`); free-form Motion Lab clips use
  `restOnFloor`. A custom clip that really leaves the floor (jump, hang, rest on a roller or bed)
  sets `airborne: true`.
- Tolerances: the lowest point of the performer rests within **15 mm** of its support and sinks no
  more than **5 mm** (20 mm for free-form clips); a seat cushion may be pressed **20 mm**.
- Name what the posture rests on (`RESTS_ON` in policy.ts): sit bones and thighs for floor sits,
  back and pelvis for supine, chest and pelvis for prone, shins for kneeling. At least one of those
  segments must be within **40 mm** of the floor (skin over bone). A body held up by a heel or a
  toe while its sit bones hover is **not seated**; a body on its toes while its shins hover is not
  kneeling.
- The bare atlas figure has no skin or fat, so its tissue should rest within about 12 mm plus the
  15 mm contact band (`atlas-floating` in the check).
- When a limb would pass through the floor, lift it with a few degrees of hip turn
  (`clearFloorFeet`, `clearFloorHands`), then rest the body on it if that is not enough. Never
  re-centre or rescale a structure to hide a gap (AGENTS.md rule 4).
- Props: chair seat top, mat, roller, step heights come from the prop code (`chairSeat`,
  `supports`, `equipment.ts`). Check against those, not against guessed numbers. A guide with a
  roller, pillow, ball, bed or step is judged against the prop's height field in
  `src/motion/physics/props.ts`; change both when a prop changes.

## 2. Balance

- Centre of mass: `centreOfMass(rig)` in `src/motion/physics/body.ts` (de Leva segment masses).
  Project it on the floor; it must lie inside the convex hull of the support points (feet, knees,
  hands, pelvis on the floor or seat) with at most **20 mm** outside.
- Hands on a fixed frame, bar, post or wall with straight arms let it sit up to **120 mm** further
  outside (a supported squat leans on the frame). Hands never replace feet.
- Standing poses: feet share the load; single-leg poses need the COM over the stance foot, so shift
  the pelvis (`shift` in the recipe) toward it.
- Planted feet do not slide: **15 mm** drift at most while a foot is flat, heel-down or toe-down.
  Intentional sliding (inchworm, wall-walk, the 90/90 switch) is listed in `TRAVELLING`.

## 3. Joint ranges (degrees, `LIMITS` in `src/motion/anatomy.ts`, enforced by `check:form`)

Shoulder elevation 0-182, rotation -95..100; elbow -10..155; forearm pronation -8..172;
wrist extension -88..90, radial -38..22 (a weight-bearing wrist rarely above 80); hip flexion
-36..152, abduction -45..55, rotation -55..78 (about 45 is typical in the hip flexed 90);
knee -6..165; ankle plantarflexion -46..62 (a deep squat needs 25-35 dorsiflexion); trunk flexion
-45..100, rotation +-60, lateral +-42; neck flexion -75..65, rotation +-82.
Fingers: MCP -45..95, PIP -8..110, DIP -15..90 (see `hand-grip-poses` for grips).
Joints are limited on every frame, not only at the beats. Between two beats, quaternions slerp the
shortest arc, which can leave the range even when both ends are inside it; if a hip moves far (legs
swapping roles), add an intermediate beat or opt the guide into `ANGLE_HIPS` in `sampleGuide.ts`
(moves the hip by flexion/abduction/rotation instead, see the 90/90).

## 4. Rhythms (never move one joint alone)

- **Scapulohumeral**: above ~30 degrees of arm elevation the shoulder blade rotates about 1 degree
  per 2 degrees of humeral elevation (`scapularRhythm` in anatomy.ts, up to 24). Arm raises must
  go through `setArm`, never rotate the arm bone alone.
- **Lumbopelvic**: in a forward bend or squat the pelvis tips and the spine flexes together,
  roughly 40 percent spine to 60 percent hips, with the trunk shares in `sampleGuide.poseAt`
  (lumbar 0.36, spine 0.38, chest 0.26). A deep fold with a flat pelvis is wrong.
- **Squat**: heels stay down; knee tracks over the second toe (turn the toes out 15-25 degrees and
  the knee follows, `TOE_OUT` in supports.ts); hips back so the COM stays over the feet or over the
  frame being held; torso leans only as far as the hips need, spine long. Typical deep squat hip
  flexion 110-125, knee 140-150, ankle dorsiflexion 25-35.
- **Floor sit with the back leg of a 90/90**: the back shin only lies flat if the hip turns in as
  far as it goes and the pelvis tilts toward the front leg; do not invent more rotation.
- **Gravity timing**: a weight lowers slower than it rises; use smooth ease in and ease out
  (smoothstep) on every beat, never a linear ramp, never a constant-speed stop.

## 5. Smoothness

Every guide is baked once at 60 Hz and low-passed lightly (`bake` in `sampleGuide.ts`), after the
edge of every beat has been carried away, so a solver flip no longer shows as a pop. Do not rely on
that to hide a limb at the end of its range: a pronation or humeral rotation near its limit still
shows as a flicker the filter cannot remove (fix the hand's aim or the elbow's direction).

Measured at 60 Hz on the head, trunk, elbows, wrists, knees and ankles (`TOL` in policy.ts):

- A point may not jump more than about **11 mm** in one frame (acceleration < **40 m/s²**).
- A joint angular acceleration stays under **400 rad/s²**; a 6 degree single-frame step is a pop.
- In a **hold** nothing moves faster than **0.03 m/s**; breathing micro-motion only, a couple of
  millimetres at most.
- Pops come from solver branch flips (an elbow or knee swivelling while the hand or foot stays
  put), hands asked to face a way the wrist and forearm cannot reach, humeral rotation at its
  limit, and beats whose joints are far apart. Fix the pose (reachable target, in-range joint
  angles, an intermediate beat), not the symptom.

## 6. Commands

```bash
npm run check:physics                       # fails on any guide or kind of failure not in checks/physics-known.json
npm run check:physics:all                   # every failure, known included
npx tsx checks/check-physics.ts --only deep-squat-hold,ninety-ninety
npx tsx checks/check-physics.ts --report /tmp/physics.json   # every number per guide
npm run check:form                          # joint ranges at 30 Hz
npm run check:studio:geometry               # skinned floor penetration, all tiers
```

Never add an exercise to `checks/physics-known.json` to make a check pass; fix it, or write the
exact reason in the PR. Run `--write-known` only to **remove** entries after fixing them.

## 7. Checklist before you call a pose done

1. Name its supports; run `check:physics --only <id>`; no floating, penetration, balance or slide.
2. `check:form --only <id>`: every joint in range at every frame.
3. Hold is still; beats ease; no pop findings.
4. Render stills with the `motion-qa` skill and look at them from side, front and overhead.
5. Hands and feet land where the guide's text says (`hand-grip-poses` for grips and palms,
   `nerve-glide-views` for what to show).

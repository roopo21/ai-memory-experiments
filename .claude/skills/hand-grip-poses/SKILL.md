---
name: hand-grip-poses
description: Pose hands, wrists, fingers and grips in Anatomy Explorer's Motion Lab. Use when adding or changing any stretch, nerve glide or movement that involves a hand holding, pressing or resting on something, a wrist angle, or a finger shape. Gives the joint ranges, grip types, contact tolerances, the check to run and how to review close-up stills.
---

# Hand, wrist and grip poses

A hand that looks wrong ruins an otherwise good exercise. Wrists bent past their range, fingers
bent backwards, claws, fingers through a handle or a palm hovering above the floor are the
failures the owner reported. Follow this skill for every new or changed exercise that shows a
hand. The numbers below are enforced by `npm run check:hands` and `npm run check:form`.

## Where the code is

| Job                                  | File                                                         |
| ------------------------------------ | ------------------------------------------------------------ |
| Finger presets (`open`, `grip`, ...) | `src/studio/choreography/types.ts`                           |
| Resting cascade, `handShape`, ranges | `src/motion/anatomy.ts` (`RELAXED_HAND`, `LIMITS`)           |
| Which hand shape a contact gets      | `src/motion/studio/guides/contacts.ts` (`contactShape`)      |
| Wrapping fingers round a handle      | `src/motion/studio/guides/grips.ts` (`wrapHandle`)           |
| Grip point on the hand               | `src/motion/studio/anchors.ts` (`gripPoint`, `worldGrip`)    |
| Hand lag between beats               | `src/motion/studio/guides/sampleGuide.ts` (`sampleGuide`)    |
| Props the hands hold                 | `src/motion/studio/guides/equipment.ts`, `src/studio/props/` |

## Joint ranges (degrees)

Extension is positive at the wrist. Flexion of a finger joint is positive.

| Joint             | Comfortable (aim here) | Enforced by `check:form` (`LIMITS`)      |
| ----------------- | ---------------------- | ---------------------------------------- |
| Wrist extension   | 0 to 70                | up to 90                                 |
| Wrist flexion     | 0 to 75                | up to 88                                 |
| Radial deviation  | 0 to 15                | up to 22                                 |
| Ulnar deviation   | 0 to 30                | up to 38                                 |
| Forearm pronation | 0 to 80 from neutral   | -8 to 172                                |
| Finger MCP        | 0 to 90 flexion        | -45 to 95; `check:hands` stops below -30 |
| Finger PIP        | 0 to 100 flexion       | -8 to 110; `check:hands` stops below -1  |
| Finger DIP        | 0 to 80 flexion        | -15 to 90; `check:hands` stops below -1  |
| Thumb MCP / IP    | 0 to 55 / 0 to 80      | -25 to 65 / -25 to 85                    |

The shared limits are generous passive ends of range. Aim for the comfortable column; stay
above it only at the passive end of a stretch, and say so in the exercise.

- **Resting hand**: use `RELAXED_HAND` (the default when a pose sets no fingers). The cascade is
  index least bent to little most bent: MCP 20/25/30/36, PIP 28/34/38/40, DIP 10/12/14/15.
- **Straight fingers** (`open`, or a number tuple with all zeros) still keep about 1.5 degrees
  more per finger from index to little, so the hand never looks splinted. Do not author negative
  MCP, PIP or DIP angles to "pull the fingers back"; the screenshot of the hyperextended wrist
  with backward fingers was exactly that. Draw the fingers back by moving the wrist (up to about
  70 to 80) with the fingers straight, or by a second hand that pushes them.
- **Fingers flex as a unit**: when MCP bends, PIP and DIP follow (a fist is about 90/100/60).
  Do not author MCP flexed with PIP and DIP straight except for `tabletop` and `straightFist`,
  which are real named hand shapes.
- **Thumb**: opposition brings the pad to the fingers. In a grip it sits on the wrist side of
  the handle; in a fist it sits across the fingers or inside the curl, not behind them.
- **Wrist budget**: a weight-bearing floor palm with the forearm vertical needs about 85 to
  90 degrees of wrist extension, which is past comfort. Real people lean the forearm forward
  (hands slightly ahead of the shoulders), which needs the trunk lower. That is a body-pose
  fix, not a hand fix. Never solve it by bending the hand backwards.

## Grip types: pick one per contact

| Grip       | Use for                                      | Preset / code                                   | Fingers                                                   |
| ---------- | -------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------- |
| Power grip | Bar, stick, towel, chair-back, band handle   | `grip`, then `wrapHandle` closes to the surface | All four wrap, thumb opposes on the wrist side            |
| Hook grip  | Band or strap loop, towel end, doorframe lip | `loopGrip`                                      | Fingers hook (MCP 26-38, PIP 89-96), thumb outside        |
| Flat palm  | Floor, wall, table, chair seat top           | `onFloor` or `flat`                             | Fingers straight, spread 2 to 6, palm flat                |
| Drape      | Own thigh, knee, shin                        | `contactShape` for `ownThigh` / `ownKnee`       | Relaxed, MCP 12, PIP 16; the hand rests, it does not grip |
| Pinch      | Small objects (ball, strap end)              | `pinch` in `precision.ts`                       | Thumb and index pads touch                                |

Rules for any grip:

1. Fingers touch the object. Contact gap per finger is within -4 mm (pad compression) and +6 mm
   (the `check:hands` limit, measured on the rendered prop, index to little). No gap, no
   interpenetration.
2. The grip holds through the motion: `refitCarriedShaft` re-wraps a carried shaft each frame,
   and band handles follow `worldGrip`. If you add a new prop, give it a mesh named
   `grip-shaft` (or `left-grip-shaft` / `right-grip-shaft`) so the check can measure it.
3. Handle radius sets the closure: `bar` 16 mm, `stick` 11 mm, `towel` 15 mm, `seat` rail 9 mm,
   strap loop 4 mm (hook) or 12 mm (handle). A bigger handle makes a looser fist.
4. A handle crosses the proximal pads obliquely, from the higher index knuckle to the lower
   little knuckle (`gripPoint`). Do not put it through the palm centre.

## Floor and surface contact

- The palm pad (`palmPad`) lies within 25 mm of the surface and not more than 4 mm into it.
- Palm normal faces the surface within about 32 degrees (`check:hands` requires cos >= 0.85).
- Fingers spread a little (2 to 6 degrees) and straight; fingertips do not dig into the floor
  (`lowestHandBone` clears them).
- Floor hands in quadruped, prone, side-lying and seated-behind poses use `onFloor`. Set the
  contact with a mark and offset, for example `ga: ['floor', 0.08, 0, -0.15]`, and turn the
  hand with `ha`. Use `ea` to place the elbow when the default swivel looks wrong.
- If the arm is straight (or the shoulder at the end of its range) and the palm is still above
  the floor, the trunk is too high or too far back. Do **not** stretch the arm or move the hand
  alone. Add the exercise to `PHYSICS_PENDING` in `checks/check-hands.ts` with a note and fix
  the body pose (root, spine, pelvis) in that area of the code.

## Nerve glide hands

Hand pose is part of the glide's definition. Use these positions and keep each between beats
smooth.

| Glide  | Wrist                                             | Fingers and thumb                                           | Forearm   |
| ------ | ------------------------------------------------- | ----------------------------------------------------------- | --------- |
| Median | Extension 50 to 60                                | Fingers straight, thumb out (`thumbOut`)                    | Supinated |
| Ulnar  | Extension about 55 with ulnar side toward the ear | OK sign, or fingers extended and ring and little drawn back | Pronated  |
| Radial | Flexion 45 to 50, ulnar deviation                 | Loose fist with the thumb inside (`radialCurl`)             | Pronated  |

Never use a negative finger angle to show "fingers back" in a nerve glide.

## Motion over time

- A free hand follows the arm with a lag of up to 45 ms, settling into each beat
  (`sampleGuide`). A hand that holds a contact does not lag; it stays on the contact.
- Fingers must not snap between presets. If two beats use very different shapes, keep beats
  at least 0.8 s apart or add an intermediate shape.
- No static claw: a hand never keeps one finger preset through a whole movement unless it is
  holding something.

## Procedure

1. Choose the grip type from the table. Author the contact (`ga` / `gb`) and orientation
   (`ha` / `hb`) and the finger shape (`f` / `g`) in the choreography file.
2. Run the checks. They take about 2.5 minutes together:
   ```bash
   npm run check:hands          # finger and wrist limits, grip contact, floor palms (189 guides)
   npm run check:form           # 75 joint angles on every guide
   npm run check:studio:geometry
   ```
3. Look at the hand. Render close-up stills (stills only, never video):
   ```bash
   npm run stills:guides -- --only <id>,<id> --hand left --times 0,1.7 \
     --width 350 --height 255 --rows 20 --output <folder>
   ```
   `--hand left|right` frames the chosen hand from the thumb side. Compare against the
   previous behaviour by rendering the same ids from a checkout of `main`.
4. Review every beat of every new exercise against the checklist, with both hands.

## Checklist

- [ ] No wrist past the table limits; only weight-bearing palms and passive stretch ends go above 75.
- [ ] No finger joint bent backwards; no spread greater than about 10 degrees.
- [ ] Resting fingers use the cascade, not parallel straight sticks or a tight claw.
- [ ] Thumb is in a sensible place: opposed in a grip, across or inside a fist, beside the
      index on a flat hand.
- [ ] Every held object touches all four fingers; no finger passes through it.
- [ ] The grip stays the same through the whole motion and both hands hold their objects.
- [ ] Floor palms are flat and on the floor, or the exercise is in `PHYSICS_PENDING`.
- [ ] Nerve glide hand shape matches the table.
- [ ] Hand motion between beats is smooth, with no snap and no frozen claw.
- [ ] `npm run check:hands` and `npm run check:form` pass; close-up stills reviewed.

Health content is education only and not clinically reviewed. Do not claim clinical accuracy
for hand positions in descriptions.

---
name: exercise-authoring
description: End-to-end procedure for adding or changing a stretch or nerve glide in Anatomy Explorer so it follows real physics and real anatomy - guide text, choreography, supports, hands, views, checks and stills. Use whenever you create or edit an exercise, a Motion Lab clip or an artifact that shows body movement.
---

# Authoring an exercise

Follow in order. Do not skip a step because the change is small. Other skills this one calls:
`biomechanics-physics` (the rules and numbers), `motion-qa` (stills and checks), `hand-grip-poses`
(grips, palms and hands on contacts) and `nerve-glide-views` (what the camera and layers show for
glides). Read `docs/reference/exercise-guides.md` for the guide data and citations.

## 1. Write the guide entry (`src/guides/library/*.ts`)

`id`, `name`, `type`, `position`, `equipment`, `primary`/`secondary` target groups, `steps`,
`feel`, `dose`. Steps must describe exactly the pose you will animate: which leg is in front, knee
angles, where the hands go. Health content is education only (AGENTS.md rule 6): no medical claims;
`npm run check:guides` enforces targets and citations.

## 2. Choose the posture and supports

Pick the `Posture` in `src/studio/choreography/types.ts` that matches how the body rests. Decide
what carries the weight (see `biomechanics-physics` section 1): feet, knees, pelvis, back, chair,
wall, frame. Props (`gear`) are drawn by `equipment.ts` and located by `fixturePoint` in
`contacts.ts`; a grip height must be one a person can reach from the starting pose (hand within
30 mm of its mark at every beat, `reach` in `check:physics`).

## 3. Author the beats (`src/studio/choreography/*.ts`)

- `stretch(posture, setup, label, pose, options)` is one position held; `sequence` is several
  beats. Beats accumulate: a contact (`ga`/`gb`) stays in force until you change it, so reset hands
  when the body moves away from them.
- Angles: `Arm` is `[forward, out, elbow, forearmTurn, wristBack, humeralRoll, wristSide]`; `Leg` is
  `[hipFlex, out, knee, plantarFlex, hipRoll, soleOut]`; `spine`/`neck`/`pelvis` are
  `[flexion, rotation, lateral]`; all degrees, `shift` is metres. For floor-based postures legs
  are written in the world frame (the pelvis turning does not turn the legs) except the 90/90.
- Think about **each limb separately**, then the whole: write the target angles from the written
  steps, check them against the ranges in `biomechanics-physics` section 3, and keep neighbouring
  beats close together. A beat that swaps two legs needs intermediate beats; the interpolation
  moves every joint at once.
- Squats and anything standing: leg angles decide the depth (the root height is derived from the
  feet), `shift` moves the pelvis back or forward over the feet, `spine` leans the trunk. Feet are
  locked to their starting marks; set `TOE_OUT` in `supports.ts` for turned-out toes.
- Hold timing: a held stretch gets a `Hold` beat automatically; breathing is `breath: 1`.

## 4. Hands and feet

Hand contact orientation (`ha`/`hb` aims), grips, palms on the floor, finger shapes: use the
`hand-grip-poses` skill. Do not leave a hand 'free' while the text says it holds something. Feet:
flat feet rest with the sole on the floor; toe-down or heel-down are separate beats.

## 5. Nerve glides

Which structures show, how muscles fade outside the working region, camera angle presets: use
`nerve-glide-views`. A slider and a tensioner differ in which end loads; author both ends
explicitly and keep the nerve bed lengths as the guide data states.

## 6. Verify (commands in `motion-qa`)

`check:reference` compares the guide with how real people move (`biomechanics-physics` section 8:
how to read it, and which guides have a reference at all). Run it with the others.

```bash
npm run check:guides
npx tsx checks/check-physics.ts --only <id>
npx tsx checks/check-form.ts --only <id>
npx tsx checks/check-reference.ts --only <id>   # typical of natural movement? reports only
npm run stills:guides -- --output $TMPDIR/sheets --only <id> --angles Side,Front,Overhead --figure human
npm run check            # before you call it done; also npm run format:check
```

New exercises must pass `check:physics` outright: do not add them to
`checks/physics-known.json`. Do not add a finding to `checks/check-reference-known.json` either: fix
it, or write why it is right (a deep squat deeper than the reference people, a stretch past free
movement). If a generated asset depends on the pose (`tissue-contacts.json`),
rerun `npx tsx asset-pipeline/motion/build-guide-contacts.ts`; never hand-edit generated files.

## 7. Done means

No floating or sinking; centre of mass supported; planted feet still; every joint in range at
every frame; smooth with a still hold; no new `check:reference` finding (or a written reason);
hands where the text says; stills from side, front and
overhead reviewed; the 189-guide count and both sides unchanged unless you added one on purpose;
`check` and `format:check` pass. Report what you were unsure about anatomically.

# Body rig and exercise form

2026-11-25 · Active · The guide demonstrations move on a rig fitted to the source bones, with every
joint solved in anatomical terms and held inside its normal range, and the 189 stretches and nerve
glides are authored to their written steps. This plan records what the pass covers, how it is
checked, and what is still open.

## What changed

- **Rig.** 81 joints. Shoulder, elbow, wrist, hip, knee, ankle and digit pivots are fitted to the
  articular surfaces of the source bones; the ulna hinges with the forearm. Limbs are posed by
  anatomical angles (flexion, abduction, rotation, pronation, wrist extension and deviation) and
  solved by an arm and a leg solver that keep the elbow and knee hinges, the forearm turning only
  about its pronation axis, and the shoulder blade protracting only as far as its range when a hand
  must reach further.
- **Hands.** Finger chains, a thumb on its own axes, named hand shapes, contact-specific grips, and
  a flat palm measured from the skeleton: a palm on a floor, seat or wall lies on the plane through
  the heel of the hand and the knuckles, which dips about 8 degrees toward the fingers, with the
  fingers flat and the thumb level with the palm.
- **Continuity.** Beats are solved in full; between beats each limb continues from the
  interpolated pose, so no joint jumps from one frame to the next, and a take ends exactly where it
  began.
- **Form.** Contacts reach what the guide names: quadriceps holds take the front of the ankle, the
  floor-seated poses sit on the floor, the chair hamstring keeps both feet down, hands rest on the
  thighs where the floor is out of reach.

## How it is checked

- `npm run check:form` measures 75 anatomical angles on every guide at 30 Hz, both sides, against
  normal ranges (AAOS, widened a little for the passive end of a stretch).
- `npm run check:studio` requires no joint to turn more than 0.82 rad between 60 Hz frames, exact
  seams, mirrored sides and contact landmarks.
- `npm run stills:guides` renders labelled contact sheets of chosen guides for review.

## Open

- `npm run check:studio:geometry` still finds floor penetration in about 16 guides, mainly fingers
  of hands planted on the floor, the long toe flexor tendon in deep ankle dorsiflexion, and the
  performer's coarse hands and feet. It already failed after the rig was refitted.
- Ninety-ninety still lifts the pelvis: with an upright pelvis the back shin cannot lie flat within
  the hip's internal rotation range.
- Some held contacts remain a few centimetres off their mark where the arm cannot reach them within
  its ranges, for example the hands on the floor in the lunges and the knee hold in figure-four
  variations, which now rest the near hand instead.
- The performer's hands are rigid mittens with curled fingers; re-skinning them would let the human
  figure show the hand shapes the skeleton already makes.
- Clinical review of every demonstration remains open, as for the guides themselves.

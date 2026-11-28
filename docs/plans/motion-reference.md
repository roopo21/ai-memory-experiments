# Natural-movement reference

2026-11-28 · Active · Motion Lab's checks say a pose is possible; this plan adds "and typical of how
people move", using two open datasets the owner approved on 2026-11-28 (UI-PRMD, public domain;
AddBiomechanics, CC BY 4.0). It records what was built, what it found and what comes next. Research
and licence analysis for every dataset considered: the motion capture research note (not in the
repo); the two used are recorded in [LICENSES.md](../reference/motion-reference/LICENSES.md).

## Built

- **`scripts/reference/`**: a reproducible derivation. Downloads into a git-ignored cache, keeps
  only percentiles, ratios and counts. Nothing recorded is committed.
- **`docs/reference/motion-reference/`**: licences and provenance, the joint mapping and axis
  conventions, the guide-to-movement map, and `data/envelopes.json`.
- **`npm run check:reference`** (`checks/check-reference*.ts`): compares every guide, sampled at 30 Hz,
  with the envelopes and prints pass, warn or fail per guide with the joint, time, frame and value.
  Reporting only; `checks/check-reference-known.json` records today's findings, and
  `npm run check:reference:strict` fails on anything not in it.
- **Skills**: `biomechanics-physics` and `exercise-authoring` tell authors to run it and how to read it.

## First report

53 of 189 guides have findings, none blocking: see the PR for the numbers and the guides the
physics work should look at first. The 35 guides with a reference movement and the 154 without
are in the [guide map](../reference/motion-reference/guide-map.md).

## Next

1. Fix findings, shrink the known list, then add `check:reference:strict` to `check:studio`.
2. A recorded session of our own for stretches, floor work and nerve glides. Public data has none,
   so those guides get only the generic checks until then (research note, section 6).
3. More AddBiomechanics subjects and activities (jumps, stairs, reaching) by extending
   `scripts/reference/pin_sources.py`; more subjects narrows every envelope.
4. A scapulohumeral reference, if a licensed source with a scapula appears. None here has one.
5. Lawyer review before any copy says "checked against motion capture" (research note, question 15).

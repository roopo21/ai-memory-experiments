# Plan: pose visuals for all 163 stretches and 26 nerve glides (v2, after review)

Drafted 2026-11-20 for `anatomy-explorer` (React + three.js, static hosting, male BodyParts3D body, no backend). App facts were read from the checkout at `/Users/roopo/orca/ai-memory-experiments/anatomy-explorer` (branch `main`, commit 835925a). Nothing in that checkout was changed. v1 of this plan was attacked by a reviewer on a different model tier; its objections and my responses are in section 12 and `REVIEW-1.md`.

## 1. Decision in one paragraph

Do **not** generate videos. Give each of the 189 exercises a small **pose spec** (joint angles per keyframe, about 1 KB) and render it live with a procedural mannequin inside the existing exercise card. **Build the pose editor first and hand-author a pilot set**, time it, and only then decide how much the LLM drafts. A deterministic validator and a review queue sit between authoring and approval, and approval is bound to a hash of everything that determines what the user sees. The approved spec is the durable asset; the same intent can later drive the real skeleton and muscles, after re-solving and re-review. v1 needs no GPU. Realistic effort is **4 to 6 weeks**, not the 2 to 3 I first wrote.

## 2. Where the app is today (from the repo)

- `src/data/guides/` holds 163 stretches (128 static, 35 dynamic) and 26 glides (14 sliders, 7 tensioners, 5 sequences). Each has `position` (standing 55+11, seated 50+8, lying 33+7, kneeling 13, floor 12), `equipment` (chair 20, wall 16, doorway 7, table 5, 11 other kinds), `primary` and `secondary` group ids, about 3 steps, `feel`, `dose`, an optional `caution` (**only 38 of 189 have one**), and an optional source link (28 stretches, 7 glides).
- 93 of 189 exercises name a side or say "each side", so left/right correctness is a first-class requirement.
- The only visual is the highlighted target tissue (`guideView.ts`). `ROADMAP.md` already lists a pose visual and a named clinical review record as open.
- Anatomy meshes are baked world-coordinate surfaces with no rig or skinning. Bones are separate left/right meshes with individual vertebrae and ribs, so rigid posing is possible later. Muscles ship as regional overviews plus per-muscle detail; nerves as five regional files.
- No backend; manual Netlify deploys; `npm run check:guides` validates the data; headless-Chrome rendering over the CDP pipe is already worked out (software rendering by default, GPU via the Metal flag).
- All content is labelled "education only, not clinically reviewed".

## 3. Options considered

| Option | Verdict | Why |
|---|---|---|
| AI video clips per exercise | No (as primary) | Cheap (Rs4.7 to 47 per clip at today's prices, so Rs900 to 8,800 for one pass), but a clip can only be regenerated, not edited; it cannot show target tissue; a wrong limb angle cannot be fixed deterministically; 189 clips are roughly 60 to 190 MB (my estimate) against about 200 KB of specs. A 10-clip, Rs500 pilot is the only experiment that would change my mind. |
| Text-to-motion models | No | T2MBench (2026) reports weak fine-grained accuracy and plausibility out of distribution; floor stretches with props are exactly that. |
| Film a real person, extract pose | Fallback for hard cases | Highest fidelity, but monocular extraction is noisy on floor and lying poses. |
| **Pose spec on a procedural mannequin, human-authored in an editor, LLM optional first draft, validator-checked, human-approved** | **Chosen** | Editable, diffable, tiny, deterministic, checkable by code. |
| Pose the real anatomy in v1 | Not in v1 | Needs a rig and muscle deformation; staged as v2 and v3. |

**Why a procedural mannequin, not a downloaded character.** A CC0 rigged character exists (Quaternius), but a third-party guide warns that pack licences vary, and I found no evidence it retargets cleanly in three.js 0.187. A capsule mannequin on our own rig has no licence exposure, no retargeting, collision geometry for the validator, and an abstract look that does not imply a particular person. It can be swapped later without touching any spec. **Left and right are colour-coded in every render** so reviewers and critics cannot confuse sides.

## 4. Architecture: separate what is approved from what renders it

```
exercise text + targets --> pose spec (editor, optional LLM draft) --> validator --> review queue --> approved
                                                                                          |
                                                      +-----------------------------------+-----------+
                                                      v                                   v           v
                                              v1 mannequin player        v2 posed skeleton     v3 deforming muscles
```

**Rig conventions (frozen before any LLM call).** About 24 joints in ISB-style clinical degrees with a stated rotation order for the shoulder (the plane-of-elevation, elevation, axial-rotation decomposition, to avoid Codman's paradox), left/right sign conventions defined once, and **per-joint unit tests that prove signs and ranges on both sides**. Joints: pelvis, lumbar, thoracic, cervical (each three DOF, with coupling rules for slump-type positions), scapula, shoulder, elbow, forearm, wrist, a finger-curl scalar and thumb opposition per hand, hip, knee, ankle, toes.

**Pose spec.** Per exercise: `side`, `loop` (hold, pingpong, sequence), `tempo`, `props`, `view`, and keyframes with labelled joint angles, a `base` posture, and an **allowed-contact list**. No pelvis coordinates are authored.

```json
{ "id": "supine-hamstring", "rig": 1, "side": "left", "loop": "hold", "tempo": "slow",
  "keyframes": [
    { "t": 0, "label": "Lie flat", "base": "supine", "joints": { "hip.L.flex": 0, "knee.L.flex": 0 } },
    { "t": 1, "label": "Raise the leg", "base": "supine",
      "joints": { "hip.L.flex": 80, "knee.L.flex": 5, "ankle.L.dorsi": 10 },
      "contacts": ["back:floor", "right-leg:floor"], "allowedOverlap": [] } ],
  "view": "side" }
```

**Root placement is an optimisation, not a snap.** Each base posture (standing, chair-seated, long-sit, supine, prone, side-lying, quadruped, half-kneeling, kneeling, wall-lean, doorway) has an analytic root placement; a weighted least-squares solve adjusts pelvis position and tilt for the remaining contacts; a two-bone IK reaches hand-to-foot and hand-to-wall targets. Over-specified or conflicting contacts are reported rather than silently compromised. Capsule collision uses the allowed-contact list so legitimate touching (thigh to chest, hand on knee, thigh on seat) is not flagged.

**Muscle and nerve action table** (new, clinician-reviewed once). For each of 49 muscle groups and 11 nerve groups: which joint motions lengthen it, with **angle-dependent signs** where the role flips (for example piriformis above about 90 degrees of hip flexion, gastrocnemius versus soleus by knee state, nerve tension resolved against `side`). It powers the screening check in section 7 and also audits the existing `primary` and `secondary` data.

## 5. Authoring flow (editor first)

1. **Build the editor and the evaluator** (rig, solver, player). Joint sliders with live preview, base-posture picker, contact toggles, left/right colouring, a side-by-side view of the exercise text.
2. **Hand-author the 10 gold specs**, then **20 more** (30 total, stratified by position, region, equipment, type, and six glides). Time every one. With base postures most specs should be three to six joint changes.
3. **Decide the LLM's role from the timings.** If hand-authoring averages under about 5 minutes, all 189 take about 16 hours, and the LLM is an optional first-draft button inside the editor. If it is much slower, the LLM drafts everything under a JSON schema and the editor is for repair.
4. **LLM draft step (if used).** Opus drafts from the exercise record, schema, ROM table, base postures and the gold specs as cached examples; the validator returns machine-readable errors for up to three repair rounds; a different-tier model critiques a colour-coded contact sheet as a filter only.
5. Specs are written to `src/data/guides/poses/<id>.json`, so every change is a git diff.

## 6. Approval flow

**Three things are approved, by different people.**
- **Pose fidelity** (the author): does the figure do what the steps say, on the right side?
- **Clinical sign-off covers the rendered motion itself**, not only the text: target, range, tempo, dose, cautions, contraindications. A physio watches the loop, because the animation is the instruction. Cautions exist on only 38 of 189 entries today, so adding them is part of this review.
- **Range**: for stretches the clinician approves the displayed range (default cap 80% of normal, shown with a caption). For **tensioners and sequences the end range is the point**, so no blanket cap applies and **nothing is animated until a clinician approves it**.

**Status model:** `none, drafted, auto-passed, in-review, changes-requested, fidelity-approved, clinically-approved, stale`.

**What the approval hash covers:** the spec, the rig version, the solver version, the **solved keyframe angles** (after IK and contact solving, because those change what is shown), and the exercise's steps and targets. Any change makes the status `stale` automatically, including a solver or rig upgrade.

**Review surface and record.** The review queue is a built route (`#review`) deployed as a **password-protected Netlify preview**, so a clinician needs no dev setup. Keys: `A` approve, `R` request changes with a note, `E` open the editor, `N` next. The clinician's decision is committed as an append-only `reviews/<id>.jsonl` entry through a GitHub pull-request review (reviewer identity is their GitHub account) or, if they will not use GitHub, a signed-in export with credentials declared once. **What counts as an adequate record for liability is a question for a lawyer, not this plan.**

**Publishing rules.**
- The card plays an animation only when pose fidelity is approved (and, for tensioners and sequences, clinically approved); otherwise it keeps today's highlight-only view.
- The "Reviewed by" badge appears only with clinical approval; everything else says "Illustration, education only".
- `npm run check:poses` fails CI if an approved hash no longer matches, an exercise has neither an approved pose nor an explicit `noVisual` reason, or any validator check regresses.

## 7. Validator checks (deterministic, no LLM)

| Check | Catches |
|---|---|
| Schema, rig version | malformed specs |
| Joint range against normal and passive limits | impossible angles |
| Contact satisfaction and conflict report | floating, sinking, feet through floor, over-specified contacts |
| Capsule collision with allowed-contact list | limbs through body, chair or wall |
| Side consistency (spec side against name and steps; mirror test) | the commonest silent error, relevant to 93 of 189 |
| Pacing and loop closure (tempo, jumps, minimum duration) | dynamic stretches and sequences that look wrong; 35 + 5 exercises |
| **Target-lengthening screen**, stretches only: primary groups' angle-dependent action score rises by a threshold from start to end | a pose that does not stretch what the card claims; also audits existing `primary` data |
| **Order-of-moves check** for sliders and sequences | replaces the lengthening screen, which is wrong for a slider (one end tightens while the other slackens, so net length stays flat) |
| Solved-angle and 2D-landmark diff against stored values | regressions after rig or solver changes. Image diffs are only a human aid, because software rendering makes pixel diffs flaky |

The lengthening screen is a **screening heuristic from a reviewed table, not a measurement**. It is calibrated on **30 stretches whose answer is known**, not 10, and I removed my first rule that a primary group must out-lengthen non-targets, since a hamstring stretch also lengthens gluteus maximus. v3 replaces it with path lengths on the real meshes.

## 8. Cost and effort (estimates; Claude prices are third-party reports, unconfirmed against Anthropic's page)

- **Model calls (only if the LLM drafts)**: Opus 5.5 reported at $4 / $20 per million input / output tokens; I assume 25k in and 6k out per exercise across draft, repairs and critic, about $0.22 or Rs20 at Rs93 per dollar. All 189: about **Rs3,900**; a 3x overrun: about **Rs12,000**. Sonnet 5.5 ($2 / $10) halves it. Not a deciding cost.
- **Compute**: laptop headless Chrome. No GPU, so this task does not need the GPU research.
- **Human time (assumptions, measured in the pilot)**: hand-authoring about 16 h if 5 min each; fidelity review 189 x 45 s is about 2.4 h; **editor repair time for hard cases** (I now assume 20 to 30% at 5 to 15 min each, so 4 to 12 h); clinical review of the *motion* plus cautions plausibly 5 min each, about 16 h of physio time. **Physio time has no price in this plan; it is the largest unknown cost.**
- **Build effort (one developer, my estimate)**: rig plus conventions plus tests 3 to 5 days; mannequin, evaluator and solver **1.5 to 2 weeks** (the reviewer is right that I understated it); editor 3 to 5 days; validator and review queue 1 week; card integration, accessibility and mobile 3 to 5 days. About **4 to 6 weeks to v1**. v2 about a week after that; v3 two to four weeks, uncertain.

## 9. Milestones, each with a go/no-go gate

| # | Milestone | Gate |
|---|---|---|
| M0 | Freeze rig conventions, rotation orders, DOF table, base postures, spec schema; per-joint sign unit tests pass on both sides | Tests green |
| M1 | Mannequin, evaluator (FK, root optimisation, IK, props), editor, player behind a flag | The 10 gold specs are expressible without hacks, including a slump, a quadruped and a doorway pose |
| M2 | Author 30 specs by hand and **time them**; a clinician joins this pilot to set the clinical bar on motion, range and cautions | Average authoring time and the clinician's first verdict recorded |
| M3 | Validator, colour-coded contact-sheet renderer, review queue, action table drafted and clinician-reviewed; lengthening screen calibrated on 30 known stretches | Screen agrees with the known answers on at least 27 of 30 |
| M4 | Decide the LLM's role from M2 timings; produce all 189 by body area; hard cases via the editor or filmed reference | Every exercise has an approved pose or an explicit `noVisual` |
| M5 | Card integration: deep link `&pose=`, `prefers-reduced-motion` shows start and end stills, keyboard-operable player, mobile layout, text alternative from the steps; `check:poses` in CI; README and attribution | `npm run check` plus new checks green; headless run on desktop and at 390 px |
| M6 | Clinical review loop; badge; stale handling | First clinician-approved batch live |
| M7 (v2) | Pose the real skeleton by rigid segments using joint centres computed from bone landmarks | Carried-over poses are **re-solved and re-reviewed**; visual QA on the gold set |
| M8 (v3) | Deform muscles and nerves; measured lengthening; research nerve strain for slider and tensioner | Go/no-go on visual quality |

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| LLM spatial errors | Editor-first, contacts and IK instead of raw coordinates, base postures, validator repair loop, mandatory human approval |
| Rig cannot express hands or fine glide positions | Minimal finger scalar and thumb opposition; accept schematic hands; test in M1 on three glide golds |
| A picture reads as more authoritative than text | Caption, "illustration" label, clinical badge only when earned, tensioners withheld until clinically approved |
| Reviewer fatigue and rubber-stamping | Contact sheets, 100% review in the pilot, seeded known-bad specs to measure catch rate |
| Content or solver drift after approval | Hash includes solved angles and solver version; automatic `stale` |
| Wrong side | Colour-coded sides, side check, mirror test |
| Critic shares the author's blind spots | Filter only; validator and humans decide; different model tier |
| Carry-forward to the real body or a female body | Only contacts and intent carry; IK targets are proportion-specific, so re-solve and re-review |
| Legal adequacy of the review record | Out of scope for this plan; needs a lawyer |
| Scope creep into anatomy posing | v2 and v3 are separate milestones with their own gates |

## 11. Decisions I need, with my defaults

1. **Who is the clinical reviewer, and what do they cost?** Default: ship fidelity-approved stretch animations labelled "Illustration, education only" and withhold tensioners and sequences until clinically approved. If no animation may ship before clinical review, M6 moves before M5.
2. **v1 renders on a mannequin, not the anatomical body.** Default: yes.
3. **Is filming a real person acceptable for the hard cases?** Default: yes, for those only.
4. **Female body.** Default: the rig is sex-agnostic; poses are re-solved when a female body exists.

## 12. Review log

Reviewer pass 1 (Opus, no web; `REVIEW-1.md`): six objections and four overclaims.

| Objection | Response |
|---|---|
| Lengthening screen rejects correct sliders and ignores angle-dependent roles | Adopted: stretches only, order-of-moves for sliders, angle-dependent table, 30-stretch calibration, dropped the "more than non-targets" rule |
| Nobody clinically approves the motion; capping tensioners misrepresents them | Adopted: clinical sign-off covers the rendered loop; tensioners and sequences withheld until approved; clinician-approved range |
| Hash binds the wrong thing | Adopted: includes rig, solver and solved angles |
| Contact solving is optimisation; M1 estimate was fiction | Adopted: weighted least squares, allowed-contact list, M1 re-baselined to 1.5 to 2 weeks |
| Rig breaks on first hard cases | Adopted: ISB-style conventions, rotation order, sign unit tests before any LLM call |
| Approval record is not a record | Partly adopted: built review route on a protected preview, GitHub identity; legal adequacy flagged as outside this plan |
| Biggest change: editor first, hand-author, LLM optional | **Adopted as the core of the plan** |
| "Data has no cautions field" | Not quite: the field exists but only 38 of 189 entries use it. The conclusion stands and is now an explicit task |
| Overclaims (carry-forward, golden images, critic, human time, 10 to 15 days) | All adopted: re-solve and re-review, angle diffs not pixel diffs, colour-coded sides, editor and physio time added, 4 to 6 weeks |

**Not independently checked.** The reviewer shares a model family with the author, and I have not built or tested the rig, solver or action table; every estimate above is a judgment until the M2 pilot produces timings.

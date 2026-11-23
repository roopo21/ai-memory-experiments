## 1. Six objections, ranked by impact

**1. The lengthening screen will reject correct sliders.** A slider deliberately lengthens the nerve at one end while slackening it at the other, so net length stays roughly flat. That fails "rises by at least a threshold" every time. The rule also misses three things:
- Lengthening depends on angle. Piriformis switches its rotation role above about 90° of hip flexion.
- Gastrocnemius and soleus are told apart only by knee state.
- A hamstring stretch also lengthens glute max, which breaks the "more than non-targets" rule.

*Fix:* store angle-dependent moment-arm signs, skip sliders (check the order of moves instead), and validate on 30 known stretches, not 10.

**2. Nobody clinically approves the motion itself.** You, a non-clinician, approve the pose, and it ships. The physio reviews "targets, dose, cautions", which is text. But the animation is the instruction. The data listed has no cautions or contraindications field at all. "80% of normal range" is not defined for hypermobile or post-op users. For a tensioner, the end range is the whole point, so capping it misrepresents the exercise.
*Fix:* clinical sign-off covers the rendered loop, and tensioners and sequences show nothing until a clinician approves them.

**3. The hash binds the wrong thing.** IK and contact solving change the joint angles, so the spec no longer describes what is shown. A solver or rig change alters every rendered pose and marks nothing stale.
*Fix:* hash the spec, rig version, solver version and the solved keyframe angles.

**4. Contact solving is optimisation, not "ground-snap".** Some poses have several contacts at once: supine with back and leg on the floor, quadruped, half-kneeling, seated on a chair with feet down. Each needs root position and pelvic tilt solved together, and over-specified contacts will fight each other. Capsule collision will also flag legitimate contact as errors: knee-hug thigh against chest, hand on knee, thigh on seat. M1 at 2 to 3 days is fiction; it is 1.5 to 2 weeks.
*Fix:* weighted least-squares root solve, an allowed-contact list per pose, and re-baseline M1.

**5. The rig breaks on its first hard cases.** Shoulder angles depend on the order of rotations (Codman's paradox), which is undefined in the plan. The internal/external rotation sign flips between left and right. "Contralateral neck side flexion" has to be resolved against `side`. A slump needs neck, thoracic and lumbar flexion working together, not one joint each.
*Fix:* adopt ISB joint-angle conventions with a stated rotation order, plus sign unit tests per joint, before any LLM call.

**6. The approval record is not a record.** A dev-only Vite route means the clinician can't use it. "Export JSON and you import it" means reviewer identity is just a name the developer types in, which is worthless for liability.
*Fix:* ship the review queue as a password-protected Netlify preview whose signed exports are committed by the clinician, or have them approve via a GitHub PR review.

## 2. Wrong or overclaimed

- **"Specs carry forward to v2 and the female body."** Not as written. IK targets authored for mannequin proportions won't reach on different segment lengths. Only the contacts carry forward, and every carried-over pose needs re-solving and re-review.
- **"Automated renders cost nothing."** ◪ Earlier notes say headless runs use software rendering, and processes left running between tool calls are starved of CPU. Golden-image diffs on software rendering will be flaky; diff the joint angles instead.
- **The critic model.** On an abstract capsule figure it will read left and right badly. Colour the left and right sides differently in every render.
- **Human time is undercounted.** 45 s × 189 leaves out editor time for reds (likely 20 to 30% at 5 to 15 min each). Paid physio time (9.5 h+) has no budget line. 3 min is optimistic once the motion is also reviewed.
- **Dynamic stretches and sequences** (35 + 5) need tempo and many keyframes. The schema has `t`, but nothing checks pacing.
- **10 to 15 days to v1** is closer to 4 to 6 weeks with the editor, review build, solver and accessibility work.

## 3. The single biggest improvement

Build the pose editor first, then hand-author the 10 gold specs plus 20 more, and time it. With base postures, most specs are 3 to 6 joint changes. If hand-authoring takes under 5 minutes each, all 189 take about 16 hours, which is less than building and debugging the generate/repair/critic pipeline. Then the LLM becomes an optional first draft inside the editor, not the system. Put the clinician in that same pilot, so the clinical bar is set before scale-up rather than after.

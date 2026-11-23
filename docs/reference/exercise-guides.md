# Exercise guides: stretches and nerve glides

## How the guides work

Switch modes at the top of the panel. **Stretches** shows muscle over bone. **Nerve glides** shows nerves inside a ghosted skeleton.

- **Picking.** Hovering names the group. A click adds or removes it. A double-click adds it and frames it. The body-area chips and the search box do the same from the panel.
- **Results.** Exercises aimed at the selection come first, then exercises that also reach it. Filters cover position, type and equipment.
- **Exercise card.** It lists steps, where to feel it, dose, tips, cautions and the source. The main targets glow in the bright colour and other reached tissue in the second colour. The camera turns to the side that shows them.
- **Links.** The detail card of any muscle or nerve links to its exercises. Guide state lives in the URL hash, so `#mode=stretch&parts=hamstrings&exercise=supine-hamstring` opens that stretch directly.

## Library

| Library      | Exercises | With a published handout | Target groups    | Structures covered            |
| ------------ | --------- | ------------------------ | ---------------- | ----------------------------- |
| Stretches    | 163       | 28                       | 49 muscle groups | 393 of 435 muscle structures  |
| Nerve glides | 26        | 7                        | 11 nerve groups  | 200 of 380 nervous structures |

Muscles with no stretch in the library, such as facial expression muscles and the inguinal ligament, are dimmed and cannot be picked. So are nerves with no self-performed glide: cranial, autonomic, trunk, obturator and musculocutaneous nerves, and the brain.

## Sources and review

Entries that link a source follow that handout's movement and paraphrase its steps. A dose that names a source quotes it. The sources are AAOS OrthoInfo, NHS, HealthLinkBC, East Kent Hospitals, Royal Wolverhampton, South Tees Hospitals and Physitrack. The other entries were written for this guide: stretch doses default to the ACSM 2011 position stand, and glides follow the slider and tensioner model of Coppieters and Butler (2008). Full citations are in `src/guides/library/references.ts` and `public/models/ATTRIBUTION.md`.

No clinician has reviewed the library. Every exercise card says it is for education only.

## Adding or changing an exercise

1. Add the entry to the matching file in `src/guides/library/`: stretches by body area, glides in `glides.ts`.
2. Target group ids from `src/guides/library/groups.ts`. A group is defined by a pattern over catalogue names, so new muscles join automatically when their names match.
3. Use full sentences for steps, feel, tips and cautions.
4. If the dose comes from a handout, name it in the dose and set `ref` to that source.
5. Run `npm run check:guides`. It fails on unknown groups, unfinished steps, a dose that names a source the entry does not cite, a group with no exercise, or a group with unequal left and right structures.

## Code

| File                      | Role                                                          |
| ------------------------- | ------------------------------------------------------------- |
| `src/guides/library/`     | The exercises, target groups, sources and default doses       |
| `src/guides/exercises.ts` | Lookup, ranking and filters                                   |
| `src/guides/highlight.ts` | How each surface is coloured while a guide is open            |
| `src/guides/ui/`          | Mode switch, guide panel, exercise card and detail-card links |
| `src/state/hashState.ts`  | Keeps the guide state in the URL so it can be shared          |

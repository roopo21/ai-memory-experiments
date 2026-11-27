# Checks

Automated checks. `npm run check` builds the app, then runs every one of these. Each can also run alone, such as `npm run check:guides`.

| Check            | File                | Verifies                                                                                        |
| ---------------- | ------------------- | ----------------------------------------------------------------------------------------------- |
| `check:models`   | `check-models.ts`   | Model files and the catalogue list the same structures; triangle counts and file sizes match    |
| `check:skeleton` | `check-skeleton.ts` | Skeleton selection, search, geometry bounds, left and right sides, no lost triangles            |
| `check:viewer`   | `check-viewer.ts`   | Layer visibility, search, regions, hiding, reset, picking, preview, overview and detail order   |
| `check:organs`   | `check-organs.ts`   | BodyParts3D nervous system: structures, layers, detail files and the shared transform           |
| `check:nerves`   | `check-nerves.ts`   | Nerve registration against 99 bones, bounds, left and right sides, search and state             |
| `check:guides`   | `check-guides.ts`   | Exercise targets, cited sources, ranking, picking on the body and mode switching                |
| `check:previews` | `check-previews.ts` | Previews match their layers, stay in place, and each mode's first paint stays under 2.5 MB      |
| `check:pose`     | `check-pose.ts`     | Movements: floor contacts, head clearance, rigid bones, landing and return to the standing pose |

The build also runs `check:studio` for deterministic pose, contact, project-file, state and decoded-mesh checks. `npm run check:studio:surfaces` samples every pilot at 60 Hz on both anatomy tiers and the human. `npm run check:studio:browser` starts a local server and tests the visible controls and recorder in Chrome.

The Node checks import app code from `src/` directly and run in Node with `tsx`, so they need no browser.

`check:physics` (`check-physics.ts`) samples every guide at 60 Hz and checks floor and seat contact, the resting segments, centre of mass over the base of support, planted feet, smoothness, still holds and hand reach. `physics-known.json` lists guides that still fail; new failures break the check. `npm run check:physics:all` lists everything; see [the plan](../docs/plans/motion-physics.md). It runs inside `check:studio`.

`check:studio` includes `check:form` (`check-form.ts`), which measures 75 anatomical joint angles on every guide at 30 Hz and holds them inside normal ranges. `check:hands` (`check-hands.ts`) holds wrists and fingers in range with no backward fingers, measures every grip on the rendered prop (fingers within -4 to +6 mm of a bar, stick, towel, strap or handle) and checks that floor palms are flat and down. Exercises whose arms cannot reach the floor because of the body pose are listed, not hidden. `npm run stills:guides` (`studio-stills.mjs`) renders labelled contact sheets of chosen guides for form review; it never records video.

All guide IDs, both sides and named phases are covered by `check:studio`. `check:studio:geometry` compares the animated geometry against the floor. `check:studio:library` captures visible changes on the anatomy stage for every guide and writes a per-movement report. `render:guides` uses the same browser check and also encodes and verifies anatomy MP4 files. See the [studio guide](../docs/reference/motion-studio.md).

# Checks

Automated checks. `npm run check` builds the app, then runs every one of these. Each can also run alone, such as `npm run check:guides`.

| Check            | File                | Verifies                                                                                        |
| ---------------- | ------------------- | ----------------------------------------------------------------------------------------------- |
| `check:models`   | `check-models.ts`   | Model files and the catalogue list the same structures; triangle counts and file sizes match    |
| `check:skeleton` | `check-skeleton.ts` | Skeleton selection, search, geometry bounds, left and right sides, no lost triangles            |
| `check:viewer`   | `check-viewer.ts`   | Layer visibility, search, regions, hiding, reset, picking, preview, overview and detail order   |
| `check:organs`   | `check-organs.ts`   | The five inside systems: structures, layers, detail files and the shared transform              |
| `check:nerves`   | `check-nerves.ts`   | Nerve registration against 99 bones, bounds, left and right sides, search and state             |
| `check:guides`   | `check-guides.ts`   | Exercise targets, cited sources, ranking, picking on the body and mode switching                |
| `check:previews` | `check-previews.ts` | Previews match their layers, stay in place, and each mode's first paint stays under 2.5 MB      |
| `check:pose`     | `check-pose.ts`     | Movements: floor contacts, head clearance, rigid bones, landing and return to the standing pose |

The build also runs `check:studio` for deterministic pose, contact, project-file, state and decoded-mesh checks. `npm run check:studio:surfaces` samples every pilot at 60 Hz on both anatomy tiers and the human. `npm run check:studio:browser` starts a local server and tests the visible controls and recorder in Chrome.

The Node checks import app code from `src/` directly and run in Node with `tsx`, so they need no browser.

All guide IDs, both sides and named phases are covered by `check:studio`. `check:studio:geometry` compares the animated geometry against the floor. `check:studio:library` captures visible changes on the anatomy stage for every guide and writes a per-movement report. `render:guides` uses the same browser check and also encodes and verifies anatomy MP4 files. See the [studio guide](../docs/reference/motion-studio.md).

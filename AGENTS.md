# AGENTS.md

Instructions for AI coding agents, and anyone else, working in this repository. The repository holds only Anatomy Explorer.

## What this is

A browser app showing a source-derived 3D male body: 1,046 selectable skeletal, muscular and nervous system structures. It has three modes, Explore, Stretches and Nerve glides, plus rigged movements. It is React, TypeScript, three.js through @react-three/fiber, Zustand and Tailwind, built with Vite. It is live at https://vrisha-anatomy.netlify.app. Read [docs/master-guide.md](docs/master-guide.md) for how it works.

## Folder map

| Path              | Contents                                                                        |
| ----------------- | ------------------------------------------------------------------------------- |
| `src/`            | The app, grouped by job. See [src/README.md](src/README.md)                     |
| `asset-pipeline/` | Fetch, select and build steps that make the models. See its README              |
| `checks/`         | The automated checks behind `npm run check`. See its README                     |
| `public/`         | Served as is: `models/` (GLBs, manifests, attribution), `draco/`, `favicon.svg` |
| `docs/`           | Master guide, animation lesson, reference notes and `plans/`                    |

## Commands

```bash
npm ci                 # install; also copies the Draco decoder into public/draco
npm run dev            # local dev server
npm run check          # type-check, production build and all nine checks
npm run format         # Prettier
npm run format:check
```

Asset rebuild commands and their order are in [asset-pipeline/README.md](asset-pipeline/README.md).

## Rules

1. Run `npm run check` and `npm run format:check` before calling work done. Report failures with their output.
2. Never hand-edit generated files: `src/anatomy/generated/`, `asset-pipeline/data/` and everything in `public/models/` except `ATTRIBUTION.md`. Change the step that writes them and re-run it.
3. After changing any layer model, or which layers a mode shows, run `npm run build:previews`. `check:previews` enforces a 2.5 MB first-paint budget for every mode.
4. Never invent anatomy. If a source lacks a structure, record it as missing. Never re-centre or rescale a single structure to make it look right; all placement goes through `asset-pipeline/data/source-transform.json` or a fitted registration.
5. Keep attribution intact. The geometry is CC BY-SA. Record geometry changes in `public/models/ATTRIBUTION.md`.
6. Health content is education only and not clinically reviewed. Do not claim medical accuracy. New exercises follow [docs/reference/exercise-guides.md](docs/reference/exercise-guides.md); `check:guides` enforces targets and citations.
7. Keep three.js and `@react-three/*` out of the main bundle. Only code reached through the lazy imports in `App.tsx` (`viewer/Scene.tsx` and `ui/LoadingBar.tsx`) may import them, so the panel paints before the 3D engine arrives.
8. Plans go in `docs/plans/`, one file per plan, listed in `docs/plans/README.md`. Update `docs/plans/roadmap.md` when a milestone moves.
9. Deploys are manual and production may differ from `main`. Never deploy unless asked. Follow [docs/reference/deploying.md](docs/reference/deploying.md).
10. Any exercise that shows a hand, wrist or grip follows [.claude/skills/hand-grip-poses/SKILL.md](.claude/skills/hand-grip-poses/SKILL.md) and passes `npm run check:hands`.

## Skills for exercises and the rig

Any work on an exercise, a Motion Lab clip, a pose, a solver or an artifact that shows the body
moving must use the skills in `.claude/skills/<name>/SKILL.md` (read the file if your tool has no
skill loader), in this order: `exercise-authoring` (the whole procedure), `biomechanics-physics`
(contact, balance, joint ranges, rhythms, smoothness; the numbers live in
`src/motion/physics/policy.ts`), `motion-qa` (render still frames, never video, and run the checks),
plus `hand-grip-poses` for hands and `nerve-glide-views` for nerve glides. New exercises must pass
`npm run check:physics` without joining `checks/physics-known.json`.

## Testing in a browser

- Guide state is in the URL hash, so a link sets up a scene, such as `#mode=stretch&parts=hamstrings&exercise=supine-hamstring` or `#mode=glide&parts=sciatic`.
- Dev builds expose the store as `window.__store`; production builds do not.
- Models are ready when `[aria-label="Loading 3D model"]` has `aria-hidden="true"`. Each mounted layer also logs `[mesh-audit:<url>] OK`.

## Code style

TypeScript strict mode with no unused locals or parameters. Prettier: no semicolons, single quotes, 100-column lines. Keep modules small, and write comments that explain why rather than what.

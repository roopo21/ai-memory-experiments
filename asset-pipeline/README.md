# Asset pipeline

The factory that turns downloaded anatomy files into the 3D models the app loads. Nothing in here runs in the browser.

It writes two things:

- 3D models and manifests in `public/models/`
- the catalogue the app reads, in `src/anatomy/generated/`

Never edit those outputs by hand. Change the step that makes them and run it again.

## Folders

| Folder    | What it holds                                                                                   |
| --------- | ----------------------------------------------------------------------------------------------- |
| `fetch/`  | Downloads pinned source files into the ignored `assets-src/` cache and verifies their checksums |
| `select/` | Chooses which source structures we use and writes the pinned lists in `data/`                   |
| `build/`  | Converts, places and compresses the models, registers the nerves, and makes previews            |
| `shared/` | Helpers the steps share: GLB reading, compression, the source transform, preload sets           |
| `data/`   | Pinned lists and fixed numbers the steps read and write; generated, so do not hand-edit         |

`fetch/copy-draco.mjs` is different: it runs on `npm install` and copies the Draco decoder from three.js into `public/draco/`.

## Rebuilding

Run the steps for a system in this order, then rebuild previews and run the checks. Python 3 and network access are needed only for fetching.

| System   | Steps                                                              |
| -------- | ------------------------------------------------------------------ |
| Skeleton | `fetch:skeleton`, `build:skeleton`                                 |
| Muscles  | `select:muscles`, `fetch:muscles`, `build:muscles`                 |
| Organs   | `select:organs`, `fetch:organs`, `build:organs`                    |
| Nerves   | `fetch:nerves`, `select:nerves`, `register:nerves`, `build:nerves` |
| Always   | `build:previews`, then `npm run check`                             |

Notes:

- The skeleton list in `data/skeleton-selection.json` is pinned by hand and has no select step.
- `select:muscles` downloads the BodyParts3D index files if they are not cached; `select:organs` reads them, so run the muscle step first on a fresh machine.
- `select:organs` also reads the skeleton and muscle catalogues, to record structures shared between systems.
- Inspect the diff of any `data/*-selection.json` before building from it.
- `build:previews -- --dry` reports preview sizes without writing anything.

## Data files

| File                         | Written by        | Meaning                                                    |
| ---------------------------- | ----------------- | ---------------------------------------------------------- |
| `skeleton-selection.json`    | hand-pinned       | BodyParts3D structures in the skeleton                     |
| `muscles-selection.json`     | `select:muscles`  | BodyParts3D structures in the muscle layer                 |
| `organs-selection.json`      | `select:organs`   | BodyParts3D structures in the five inside systems          |
| `organs-shared.json`         | `select:organs`   | Structures that belong to more than one system             |
| `organs-unavailable.json`    | `select:organs`   | Wanted structures the source does not have                 |
| `source-mesh-ids.json`       | pinned            | Mesh ids available in the pinned BodyParts3D mirror        |
| `nerves-selection.json`      | `select:nerves`   | Z-Anatomy nerves we import, by source node name            |
| `nerves-excluded.json`       | `select:nerves`   | Z-Anatomy nodes left out, with their triangle counts       |
| `source-transform.json`      | pinned            | The one transform from source millimetres to viewer metres |
| `zanatomy-registration.json` | `register:nerves` | The fitted transform that places the nerves on this body   |

## Motion studio characters and contact data

Run `npm run build:studio-assets` after changing the atlas bind pose or Clover. The first step locates the jaw hinge and joints of the fingers and toes on the registered skeleton. The next builds Clover's mesh, colours and skin weights directly around those joints. The final two steps sample the extreme vertices of the atlas, performer and highlighted tissues for floor contact. These outputs live under `src/motion/` and load with the studio. The exercise choreography lives under `src/studio/choreography/`.

See the [motion studio guide](../docs/reference/motion-studio.md) for recording and verification.

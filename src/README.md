# App source

The web app, grouped by what each part does.

| Folder     | What it does                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------- |
| `anatomy/` | The catalogue of body parts and search. `generated/` is written by the asset pipeline; do not edit |
| `viewer/`  | Loads the 3D models in stages, draws and colours them, handles clicks and moves the camera         |
| `motion/`  | The 20-bone rig, the three movements, breathing and contact shadows                                |
| `guides/`  | Stretches and nerve glides: the library, ranking, highlighting and their panel and card            |
| `state/`   | What the app remembers (one Zustand store) and the shareable URL hash                              |
| `ui/`      | Side panel, system list, layer controls, search box, detail card, tooltip and loading bar          |

Entry points: `main.tsx` starts the app, `App.tsx` lays out the page, and `index.css` holds the shared styles. The 3D code in `viewer/` and `motion/` loads as a separate chunk so the panel appears first.

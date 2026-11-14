# Anatomy Explorer

Interactive 3D human anatomy explorer: React + TypeScript + Vite, Three.js via
`@react-three/fiber` / `@react-three/drei`, Zustand, Tailwind v4.

```bash
npm install        # also copies the Draco decoder to public/draco
npm run dev        # http://localhost:5173
npm run build
npm run gen:models # regenerate the procedural placeholder GLBs
npm run audit:models  # diff GLB mesh names against systems.json (CI-friendly exit code)
```

> For education only, not medical advice.

The app opens in a source-derived **male skeleton study view**. See [README-skeleton.md](README-skeleton.md) for coverage, sources and reproduction. The other systems and female body remain procedural placeholders. The requirement for complete, medically accurate
models, the research on where they can come from, and the build plan are in
[README-high-fidelity.md](README-high-fidelity.md).

## How it works

| Concern | Where |
| --- | --- |
| All anatomy content (systems, colours, camera framings, organ text) | `src/data/systems.json` — **never hardcode anatomy in components** |
| Typed lookups over the data | `src/data/anatomy.ts` |
| UI + scene state (sex, active systems, layers, hover/selection, camera requests) | `src/store/useAnatomyStore.ts` |
| Ghost / highlight rules (pure function) | `src/lib/appearance.ts` |
| Mesh ↔ data audit | `src/lib/auditMeshes.ts` (runs on every model load, logs to the console) |
| Procedural placeholder body | `src/scene/placeholderBody.ts` |

### Data schema (`systems.json`)

```jsonc
{
  "systems":    [{ "id", "name", "color", "icon", "description",
                   "camera": { "position": [x,y,z], "target": [x,y,z] },
                   "meshNames": ["Liver", ...] }],
  "structures": [{ "meshName", "displayName", "systems": ["endocrine","digestive"],
                   "sex": "male" | "female",   // optional; omit when present in both
                   "description", "facts": ["..."] }]
}
```

A structure with several entries in `systems` shows one badge per system (pancreas, bone marrow).
Meshes are matched to structures **by exact name**. Skin meshes are structures too (system
`integumentary`), so the skin ghosts like everything else.

### Mesh audit

On each model load the console shows either `[mesh-audit:male] OK` or a group listing
(a) meshes in the model with no `systems.json` entry and (b) entries with no mesh. Entries with a
`sex` field are only expected in the matching model. `npm run audit:models` does the same offline
against the files in `public/models` (it only reads the GLB's JSON chunk, so Draco files work).

## Replacing the placeholder models

The app loads `/models/male.glb` and `/models/female.glb`. The shipped files are generated from
capsules/spheres by `npm run gen:models`; replace them with real anatomy and everything keeps working
as long as mesh names match the data file.

### 1. Export from Blender (Z-Anatomy)

1. Download Z-Anatomy (<https://www.z-anatomy.com>) and open the `.blend` in Blender 4.x.
   Check its licence (CC BY-SA) before redistributing derived models.
2. Pick the male or female collections you want and hide/delete the rest (labels, lines, helper empties).
3. Decimate heavy meshes (Modifier → *Decimate*, ratio 0.1–0.3 for bones/muscles). Target
   **under ~300k triangles** and **under ~10 MB** per file for 60 fps on a mid-range laptop.
4. Apply transforms: select all → `Ctrl+A` → *All Transforms*.
5. Orientation/scale: **Y up, +Z front, 1 unit = 1 metre, feet at y = 0**. (Blender is Z-up; the glTF
   exporter's "+Y Up" option does the conversion.) If your scale differs, edit the `camera` entries in
   `systems.json`.
6. *File → Export → glTF 2.0 (.glb)*: Format **glTF Binary**; Include **Selected Objects** only;
   Mesh: **Apply Modifiers**, **Normals**; **Compression: off** (do it in step 3 below);
   Material: *Export* is fine, the app replaces materials at runtime.

### 2. Name meshes

The **mesh object name** in the outliner must equal a `meshName` in `systems.json` exactly
(case-sensitive). Use `Underscores_Not_Spaces`, and `_L` / `_R` suffixes for paired structures
(`Kidney_L`, `Femur_R`). Note: left/right is the *patient's*; the patient's left is the viewer's right.

- Join a structure that is several objects into one object with that name (`Ctrl+J`), or the extra
  pieces will show as unmatched.
- Blender suffixes duplicates with `.001`; three.js strips dots, so `Liver.001` becomes `Liver001` and
  will not match. Rename them.
- Sex-specific organs go only in the matching file; mark them with `"sex"` in the data.
- To add a structure, add an entry to `structures` and its name to the owning system's `meshNames`.
  Then run `npm run audit:models`.

### 3. Draco-compress

```bash
npx @gltf-transform/cli optimize male.glb public/models/male.glb --compress draco --texture-compress webp
# or just geometry:
npx @gltf-transform/cli draco male.glb public/models/male.glb
```

`optimize` also dedupes and prunes, but check it doesn't **merge meshes or rename nodes**: if it does, add
`--join false --flatten false` (and verify with `npm run audit:models`). The Draco decoder is served
from `/draco/` (copied from three.js by `postinstall`), so there is no CDN dependency.

## Behaviour notes

- Only the displayed sex is downloaded. When toggling, the old body stays until the new one is loaded
  (progress bar at top), then swaps; camera, active systems and layer settings are untouched. A selected
  sex-specific structure is deselected if it doesn't exist in the other model.
- The render loop is demand-driven (`frameloop="demand"`): it only renders while something is animating
  or the user is interacting, so an idle tab costs ~0 GPU.
- Ghosted/faint meshes are made non-pickable so the skin never blocks hover on organs behind it.
- Keyboard: the system list is one tab stop; arrows/Home/End move, Space/Enter toggle. The sex toggle is
  a radio group; search is a combobox (arrows + Enter); `Esc` closes the detail card.
- Mobile (<768px): the panel is a bottom sheet (drag handle button toggles it; contents are `inert` when collapsed).

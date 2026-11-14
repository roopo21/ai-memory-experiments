# Male skeleton experiment

The app now opens directly in a real, source-derived male skeleton study view.
The pipeline and viewer work end to end. This is **not yet a complete or clinically
reviewed anatomy atlas**. Other systems and the female model remain the original
procedural placeholders, accessible through “Placeholder systems”. Switching to
Female also switches to that view; no male geometry is relabelled as female.

## Run and reproduce

```bash
npm install
npm run dev                    # http://localhost:5173
npm run build                  # TypeScript + production bundle
npm run audit:models           # all three GLBs match their respective catalogues
npm run check:skeleton         # geometry + search + state regression checks

# Optional: reproduce the shipped skeleton (Python 3, network required)
npm run fetch:skeleton
npm run build:skeleton
npm run audit:models
npm run check:skeleton
```

The shipped `public/models/male-skeleton.glb` needs no source download to run.
`gen:models` only regenerates the two procedural bodies and never overwrites the
skeleton. Downloads are cached in ignored `assets-src/skeleton/`. Individual
binary STL lengths and SHA-256 digests are checked; the shipped manifest pins
expected hashes. Download errors fail the build rather than silently omitting a bone.
The downloader uses the pinned CDN, GitHub API, then raw GitHub as fallbacks.
GitHub API rate limits can require retrying later; completed downloads are retained.

## What is actually included

| Measurement | Result |
| --- | --- |
| Selectable structures | 231 |
| Bone concepts | 200, including two foot sesamoid groups |
| Sternum | Three separately selectable source parts |
| Teeth | 28 |
| Standard adult bones represented | 199 of 206 |
| Source triangles, preserved in export | 2,037,126 |
| GLB size | 36,909,524 bytes (~35.2 MiB), uncompressed |
| Model height after unit conversion | 1.6424 metres |

The 231 objects are **not 231 standard bones**: 200 bone concepts minus two
additional sesamoid groups plus one sternum gives 199. The sternum is exported as
three parts, and the 28 teeth are separately selectable.

Known missing structures: a separately modelled coccyx, six auditory ossicles
(left/right malleus, incus and stapes), and four third molars. Ligaments, articular
cartilage and landmark annotations are outside this first imported selection.
These are dataset/selection limitations, not empty meshes disguised as anatomy.

## Study controls

- Search a named structure, e.g. **left femur**, **sphenoid**, or **atlas**.
- Browse bones by region. A selection opens a source-linked detail card and focuses the camera.
- Hover/click the 3D surfaces; double-click a surface to focus it.
- “Isolate selected structure” hides other structures; clear the selection or Reset to restore them.
- Orbit, zoom, pan and per-system opacity/visibility remain available.
- On mobile the region browser is a collapsible bottom sheet.

Cards contain source identification and geometry metadata, not invented clinical
facts. Definitions, landmarks, articulations and clinical teaching notes still
need sourced content and expert review.

## Sources and transformation

Source geometry: **BodyParts3D 3.0 / 20110915, 95% polygon reduction**, from
[Kevin Mattheus Moerman's STL mirror](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D),
pinned to `2c83c698788cff57f6317bddcf712e7acfbea7d8`.
This has more source detail than the previously sampled 4.0/99% archive; a larger
polygon count alone does not certify anatomical accuracy.

The selection in `scripts/skeleton-selection.json` uses bone/tooth leaf FMA IDs
from the BodyParts3D IS-A index, plus the three sternum parts. It is checked into
the project so regeneration does not depend on a changing ontology query.
`public/models/skeleton-manifest.json` records every source URL, checksum and
triangle count. `src/data/skeleton.json` is generated from that same manifest.

Transformation: `(x, y, z)` source millimetres become `(x, z, -y)/1000` metres,
then all structures receive the same vertical translation to ground the feet.
Patient-left stays +X; anterior becomes +Z. No shape sculpting, artificial
subdivision, further decimation, or anatomical repair is applied. Coincident
vertices are welded and shading normals recalculated, preserving source triangles.

Geometry attribution and share-alike terms are in
[public/models/ATTRIBUTION.md](public/models/ATTRIBUTION.md). This experiment does
not require exclusive ownership; no commercial ownership decision is pending.

## Verification and remaining work

Passed: production build; mesh/data matching for both placeholders and skeleton;
231 unique selectable IDs; source/export triangle equality; finite metre-scale
bounds; left/right femur orientation; mode-specific search; selection and sex/mode
transitions. Headless Chrome exercised initial rendering, left-femur search and
isolation, Reset, female/uterus search, return to skeleton, and a 390px mobile panel
without JavaScript exceptions. Screenshots were visually inspected.

Hardware 60 fps has **not** been measured. The browser check used software WebGL.
This first system uses one lazy-loaded ~35 MiB GLB with 231 draw calls, not regional
streaming or level-of-detail switching. The initial code bundle includes the
catalogue; further compression/streaming should follow real-device profiling.

To reach the original full study-atlas standard: obtain compatible source meshes
for the missing structures; validate registration against this body; add cartilage,
ligaments and landmarks; source teaching content; and obtain an anatomist's review.
The current experiment proves the source-to-browser pipeline, not those remaining
anatomical requirements.

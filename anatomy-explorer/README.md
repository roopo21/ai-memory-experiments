# Anatomy Explorer

A local React, TypeScript and Three.js viewer for source-derived male skeletal and muscular anatomy. It contains 231 skeletal structures and 435 muscle/tendon structures from the same BodyParts3D release. Five additional layers contain 193 cardiovascular, respiratory, digestive, urinary and nervous structures. Female anatomy is not implemented. Procedural demo bodies have been removed.

## Run and check

Requires Node.js with npm. Python 3 and network access are needed only to fetch source data. The generated GLBs, catalogues, manifests and Draco decoder are included, so running the app needs no anatomy download.

```bash
npm ci
npm run dev           # local Vite preview
npm run check         # production build, all asset audits, skeleton and viewer checks
npm run format:check
```

Use the **View** button beside any system to reveal it alone, then toggle other layers to combine them. New layers load on demand. Select structures through search, the region browser or the viewport. Toggle system visibility, adjust opacity, isolate a selection, hide individual structures and restore them. Selecting a muscle requests its detailed surface; the regional overview remains available while it loads. Missing assets display a load error.

## Code map

| Location                            | Responsibility                                                      |
| ----------------------------------- | ------------------------------------------------------------------- |
| `src/data/anatomy.ts`               | Typed catalogue and lookups over generated anatomy                  |
| `src/data/systems.json`             | Supported systems and their presentation metadata                   |
| `src/store/useAnatomyStore.ts`      | Layer visibility, selection, isolation, regions and camera requests |
| `src/scene/Scene.tsx`               | Independent skeleton, regional muscle and selected-detail loading   |
| `src/scene/Body.tsx`, `registry.ts` | Mesh rendering, picking and overview/detail replacement             |
| `src/ui/StructureBrowser.tsx`       | Browse, hide and restore source structures                          |
| `scripts/source-geometry.ts`        | Checksum verification and the common source-to-viewer transform     |
| `scripts/*-selection.json`          | Pinned source selections; stable IDs, not display names             |
| `public/models/*-manifest.json`     | Source URLs, checksums, geometry counts and coverage                |

`src/data/skeleton.json` and `src/data/muscles.json` are generated. Edit the selection or importer and regenerate them; do not hand-edit anatomical output. Raw STLs are cached under ignored `assets-src/`. Runtime assets stay under `public/models/`.

## Rebuild the assets

```bash
npm run fetch:skeleton
npm run build:skeleton
npm run fetch:muscles
npm run build:muscles
npm run fetch:organs
npm run build:organs
npm run check
```

The downloader pins the source revision, validates binary STL lengths and hashes, and fails on incomplete downloads. It can reuse validated cached meshes. `python3 scripts/select-muscles.py` rebuilds the muscle selection from cached or downloaded source indexes; inspect that diff before regenerating assets.

All systems share `scripts/source-transform.json`: source `(x, y, z)` millimetres become `(x, z, -y) / 1000` metres plus the same ground offset. Individual structures are never centered separately.

## What the assets represent

- **Skeleton:** 231 selectable objects representing 199 standard bones, additional sesamoid groups, three sternum parts and 28 teeth. Missing: separate coccyx, six auditory ossicles and four third molars. The exported skeleton retains 2,037,126 source triangles.
- **Muscles:** 435 terminal source structures, including grouped muscles and tendons, across eight region files. This is not a claim of 435 individual muscles or complete musculature. The overview contains 3,000,490 triangles. Selected detail assets contain 18,087,848 triangles collectively, versus 18,087,874 in the source; compression removes 26 triangles, recorded and checked explicitly.
- **Delivery:** approximately 7.1 MB of skeleton geometry and 12.0 MB of regional muscle geometry before individual detail requests (decimal units). Draco quantizes positions and normals; muscle overviews also undergo simplification. All eight regions load by default. Full-body geometry remains heavy; real-device performance is not yet established.
- **Review:** source names, positions and surface geometry are preserved through a shared conversion, but attachments, landmarks and teaching content have not received independent anatomical review.

Source and derived-geometry terms are retained in [ATTRIBUTION.md](public/models/ATTRIBUTION.md). This is an educational experiment, not a complete or clinically reviewed atlas.

## Additional systems

| Layer          | New selectable surfaces                           | Coverage                                                                                                                                       |
| -------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Cardiovascular | 65                                                | Heart wall, valves, papillary structures and available major vessels; not a complete peripheral network                                        |
| Respiratory    | 12                                                | Five lung lobes, trachea, bronchus, selected laryngeal/nasal and oral surfaces                                                                 |
| Digestive      | 12 additional, plus 3 shared respiratory surfaces | Liver, stomach, esophagus, pancreas, gallbladder, bowel and source subdivisions                                                                |
| Urinary        | 6                                                 | Two kidneys, two ureters, bladder and urethra                                                                                                  |
| Nervous        | 98                                                | Predominantly brain subdivisions, optic structures and source cavity/canal surfaces; no complete peripheral nerve or spinal-cord surface model |

These use the same source transform as bones and muscles. Overview transfer totals 3.8 MB; selected detail files total 11.5 MB collectively. The detailed exports contain 3,522,980 triangles versus 3,522,988 source triangles. Supporting oral bones and skeletal muscles already imported stay in their existing layers. Source-defined groups and cavity surfaces retain their original names. These layers are imported source coverage, not complete or independently reviewed systems.

The single forward plan is [ROADMAP.md](ROADMAP.md).

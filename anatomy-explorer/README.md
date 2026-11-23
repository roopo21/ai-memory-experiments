# Anatomy Explorer

A local React, TypeScript and Three.js viewer for source-derived male skeletal and muscular anatomy. It contains 231 skeletal structures and 435 muscle/tendon structures from the same BodyParts3D release. Five additional layers contain 193 cardiovascular, respiratory, digestive, urinary and nervous structures. Two guide modes turn the body into a picker: select muscles to get stretches, or select nerves to get nerve glides. Female anatomy is not implemented. Procedural demo bodies have been removed.

## Run and check

Requires Node.js with npm. Python 3 and network access are needed only to fetch source data. The generated GLBs, catalogues, manifests and Draco decoder are included, so running the app needs no anatomy download.

```bash
npm ci
npm run dev           # local Vite preview
npm run check         # production build, asset audits, skeleton, viewer, organ, nerve and guide checks
npm run format:check
```

Use the **View** button beside any system to reveal it alone, then toggle other layers to combine them. New layers load on demand, first as a lightweight preview and then at full quality. Select structures through search, the region browser or the viewport. Toggle system visibility, adjust opacity, isolate a selection, hide individual structures and restore them. Selecting a muscle requests its detailed surface; the regional overview remains available while it loads. Missing assets display a load error.

## Motion and posing

Use the buttons above the viewport to play **Yoga backbend** (a held full wheel pose with hands and feet down), **Moonwalk** (a looping heel-and-toe slide), or **Cartwheel** (one sideways rotation, then an upright landing). **Stand upright**, Reset and mode changes return to neutral. **Pause motion** freezes an active movement as well as the ambient breathing and sway. With reduced motion enabled, buttons show representative still poses; Play motion explicitly starts animation.

The runtime joint rig is prepared lazily on the first movement. Each skeletal surface follows a single joint so bones stay rigid. Other anatomy layers use approximate skin weights on the same rig, and picking follows the deformed geometry. Shoulder-girdle joints, inward-facing supporting palms, continuous trunk weights and muscle-specific shoulder attachments reduce overlap during large movements. The cartwheel uses staggered limb timing and a softer landing; the moonwalk uses a steady supporting-foot slide and alternating heel lifts. Active clips render at up to 60 frames per second, with contact shadows beneath palms and soles. These are illustrative animations, not biomechanical or exercise-technique simulations.

## Stretch and nerve-glide guides

Switch modes at the top of the panel. **Stretches** shows muscle over bone. **Nerve glides** shows nerves inside a ghosted skeleton. Pick body parts on the model or from the body-area chips: hovering names the group, a click adds or removes it, and a double-click adds it and frames it. Results rank exercises aimed at the selection first, then exercises that also reach it, and filter by position, type and equipment. Opening an exercise lights its main targets in the bright colour and the other tissue it reaches in the second colour, turns the camera to the side that shows them, and lists steps, where to feel it, dose, tips, cautions and the source. The detail card of any muscle or nerve links to its exercises.

Guide state lives in the URL hash, so `#mode=stretch&parts=hamstrings&exercise=supine-hamstring` opens that stretch directly.

| Library      | Exercises | Target groups    | Catalogue structures covered  |
| ------------ | --------- | ---------------- | ----------------------------- |
| Stretches    | 163       | 49 muscle groups | 393 of 435 muscle structures  |
| Nerve glides | 26        | 11 nerve groups  | 200 of 380 nervous structures |

Muscles with no stretch in the library (facial expression muscles, the inguinal ligament) and nerves with no self-performed glide (cranial, autonomic, trunk, obturator and musculocutaneous nerves, and the brain) are dimmed and cannot be picked.

Entries that link a source (AAOS OrthoInfo, NHS, HealthLinkBC, East Kent Hospitals, Royal Wolverhampton, South Tees Hospitals, Physitrack) follow that handout's movement, and a dose that names a source quotes it. The other entries were written for this guide: stretch doses default to the ACSM 2011 position stand, and glides follow the slider and tensioner model of Coppieters and Butler (2008). No clinician has reviewed the library, and every exercise card says it is for education only.

To add an exercise, append it to the matching file in `src/data/guides/` and target group ids from `groups.ts`. `npm run check:guides` fails on unknown groups, short or unfinished steps, a dose that names a source the entry does not cite, a group with no exercise, or a group with unequal left and right structures.

## Code map

| Location                            | Responsibility                                                      |
| ----------------------------------- | ------------------------------------------------------------------- |
| `src/data/anatomy.ts`               | Typed catalogue and lookups over generated anatomy                  |
| `src/data/systems.json`             | Supported systems and their presentation metadata                   |
| `src/store/useAnatomyStore.ts`      | Layer visibility, selection, isolation, regions and camera requests |
| `src/scene/Scene.tsx`               | Independent skeleton, regional muscle and selected-detail loading   |
| `src/scene/Body.tsx`, `registry.ts` | Mesh rendering, picking and preview/overview/detail replacement     |
| `src/scene/loadQueue.ts`            | Progressive loading order: previews first, visible layers next      |
| `vite.config.ts`, `scene/assets.ts` | Content-versioned model URLs, decoder path and index.html preloads  |
| `scripts/build-previews.ts`         | Preview GLBs and `src/data/previews.json`                           |
| `src/ui/StructureBrowser.tsx`       | Browse, hide and restore source structures                          |
| `src/data/guides/`                  | Stretch and glide libraries, target groups, sources, default doses  |
| `src/lib/guides.ts`, `guideView.ts` | Ranking and filters; how each mesh is highlighted in a guide        |
| `src/ui/guide/`                     | Mode switch, guide panel, exercise card and detail-card links       |
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
npm run build:previews
npm run check
```

The downloader pins the source revision, validates binary STL lengths and hashes, and fails on incomplete downloads. It can reuse validated cached meshes. `python3 scripts/select-muscles.py` rebuilds the muscle selection from cached or downloaded source indexes; inspect that diff before regenerating assets.

BodyParts3D systems share `scripts/source-transform.json`: source `(x, y, z)` millimetres become `(x, z, -y) / 1000` metres plus the same ground offset. Individual structures are never centered separately.

## What the assets represent

- **Skeleton:** 231 selectable objects representing 199 standard bones, additional sesamoid groups, three sternum parts and 28 teeth. Missing: separate coccyx, six auditory ossicles and four third molars. The exported skeleton retains 2,037,126 source triangles.
- **Muscles:** 435 terminal source structures, including grouped muscles and tendons, across eight region files. This is not a claim of 435 individual muscles or complete musculature. The overview contains 3,000,490 triangles. Selected detail assets contain 18,087,848 triangles collectively, versus 18,087,874 in the source; compression removes 26 triangles, recorded and checked explicitly.
- **Delivery:** approximately 7.1 MB of skeleton geometry and 12.0 MB of regional muscle geometry before individual detail requests (decimal units). Draco quantizes positions and normals; muscle overviews also undergo simplification. All eight regions load by default. Real-device performance is not yet established.
- **Progressive loading:** every layer GLB has a preview in `public/models/preview/`, simplified to about 6% of its triangles with every structure kept. A surface whose extent would move by more than 2 mm or 2% of its size is simplified more gently or shipped as is, which protects long thin structures such as spinal tracts. `index.html` preloads the previews of the mode the page opens in: 1.7 MB for the default view and stretches instead of 19.0 MB, and 1.5 MB for a shared nerve-glide link instead of 12.9 MB. `scripts/preload-sets.ts` derives these sets from the store. Full-quality layers download once the previews have arrived, visible layers before the mostly hidden skeleton, and replace each preview in place. Rebuild previews after changing any layer or a mode's layers; `npm run check:previews` fails on stale, incomplete or displaced previews and enforces a 2.5 MB first-paint budget for every mode.
- **Caching:** model URLs carry a content hash (`?v=`), the Draco decoder lives under a content-hashed directory and Vite names bundles by hash, so `netlify.toml` serves all three as `immutable`. A returning visitor revalidates only `index.html`.
- **Review:** source names, positions and surface geometry are preserved through a shared conversion, but attachments, landmarks and teaching content have not received independent anatomical review.

Source and derived-geometry terms are retained in [ATTRIBUTION.md](public/models/ATTRIBUTION.md). This is an educational experiment, not a complete or clinically reviewed atlas.

## Additional systems

| Layer          | New selectable surfaces                           | Coverage                                                                                                                                                                     |
| -------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cardiovascular | 65                                                | Heart wall, valves, papillary structures and available major vessels; not a complete peripheral network                                                                      |
| Respiratory    | 12                                                | Five lung lobes, trachea, bronchus, selected laryngeal/nasal and oral surfaces                                                                                               |
| Digestive      | 12 additional, plus 3 shared respiratory surfaces | Liver, stomach, esophagus, pancreas, gallbladder, bowel and source subdivisions                                                                                              |
| Urinary        | 6                                                 | Two kidneys, two ureters, bladder and urethra                                                                                                                                |
| Nervous        | 98                                                | Predominantly brain subdivisions, optic structures and source cavity/canal surfaces; extended with 282 Z-Anatomy spinal cord, cranial, trunk, pelvic and limb nerve surfaces |

These use the same source transform as bones and muscles. Overview transfer totals 3.8 MB; selected detail files total 11.5 MB collectively. The detailed exports contain 3,522,980 triangles versus 3,522,988 source triangles. Supporting oral bones and skeletal muscles already imported stay in their existing layers. Source-defined groups and cavity surfaces retain their original names. These layers are imported source coverage, not complete or independently reviewed systems.

The single forward plan is [ROADMAP.md](ROADMAP.md).

### Nerve extension and deployment

`npm run fetch:nerves`, `npm run select:nerves`, `npm run register:nerves`, and `npm run build:nerves` reproduce the pinned Z-Anatomy import. Registration fits 99 shared bone landmarks (median residual 0.80 mm). Source terms and upstream notice are retained under `public/models/`.

Production: https://vrisha-anatomy.netlify.app. Run `npm run check`, then `netlify deploy --prod --dir dist --no-build --site 27c67818-b9d4-4595-b392-1374549d2231`. The background and favicon use Vrisha Labs branding.

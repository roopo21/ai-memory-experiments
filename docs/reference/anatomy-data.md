# Anatomy data: what the models contain

This is the exact inventory behind the viewer. For the plain-language story, read the [master guide](../master-guide.md). To rebuild any of it, see [asset-pipeline/README.md](../../asset-pipeline/README.md).

## Inventory

| Layer          | Selectable structures                         | Source                     | Coverage notes                                                                               |
| -------------- | --------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------- |
| Skeleton       | 231                                           | BodyParts3D 3.0            | 199 standard bones, sesamoid groups, three sternum parts and 28 teeth                        |
| Muscles        | 435                                           | BodyParts3D 3.0            | Terminal source structures, including grouped muscles and tendons, in eight region files     |
| Cardiovascular | 65                                            | BodyParts3D 3.0            | Heart wall, valves, papillary structures and available major vessels                         |
| Respiratory    | 12                                            | BodyParts3D 3.0            | Five lung lobes, trachea, bronchus and selected laryngeal, nasal and oral surfaces           |
| Digestive      | 12, plus 3 shared with respiratory            | BodyParts3D 3.0            | Liver, stomach, esophagus, pancreas, gallbladder, bowel and source subdivisions              |
| Urinary        | 6                                             | BodyParts3D 3.0            | Two kidneys, two ureters, bladder and urethra                                                |
| Nervous        | 98 brain and cavity surfaces, plus 282 nerves | BodyParts3D 3.0, Z-Anatomy | Brain subdivisions and optic structures; spinal cord, cranial, trunk, pelvic and limb nerves |

That is 1,141 selectable structures. Muscle counts include source groups and tendons, so 435 is not a count of individual muscles.

**Known gaps.** The skeleton has no separate coccyx, no six auditory ossicles and no four third molars. Vessels are a limited major-vessel selection. Cartilage, ligaments, lymphatics, skin and the female body are not imported. Anything missing is listed as missing; nothing is filled with an invented shape.

## Files and sizes

| What                       | Files | Size    | Loaded when                                    |
| -------------------------- | ----- | ------- | ---------------------------------------------- |
| Layer files (overviews)    | 19    | 26.5 MB | Their system is visible                        |
| Previews of every layer    | 19    | 2.7 MB  | First, before the layer files                  |
| Per-structure detail files | 628   | ~68 MB  | One at a time, when that structure is selected |

- The default view (skeleton plus muscles) is 19.0 MB at full quality and 1.7 MB as previews. A shared nerve-glide link needs 1.5 MB of previews instead of 12.9 MB.
- The skeleton keeps all 2,037,126 source triangles. Muscle overviews are simplified to a 12% triangle target, about 3.0 million triangles in all. Muscle detail files keep 18,087,848 of 18,087,874 source triangles; compression removes 26, recorded and checked. The other systems' detail files keep 3,522,980 of 3,522,988.
- Previews keep every structure at about 6% of its triangles. A surface whose extent would move by more than 2 mm or 2% of its size is simplified more gently or shipped as is, which protects long thin structures such as spinal tracts. `npm run check:previews` keeps every mode's first paint under 2.5 MB.
- Draco compression stores positions with 16-bit and normals with 12-bit precision.

## Placement

All BodyParts3D layers share one transform in `asset-pipeline/data/source-transform.json`: source `(x, y, z)` millimetres become `(x, z, -y) / 1000` metres, plus one ground offset. Individual structures are never re-centred.

The Z-Anatomy nerves are placed by one uniform similarity transform fitted to 99 bones present in both sources, stored in `asset-pipeline/data/zanatomy-registration.json`. The median landmark residual is 0.80 mm. Nerve courses relative to vessels and muscles have not been reviewed.

## Delivery and caching

Every model URL carries a content hash, such as `?v=3f2a91c0d4`. The Draco decoder sits under a content-hashed folder and Vite names code bundles by hash. So `netlify.toml` serves all three as `immutable`, and a returning visitor revalidates only `index.html`. `index.html` also starts downloading the decoder and the current mode's previews before the app code runs.

Full-quality layers download once the previews have arrived, at most 12 at a time, visible layers before the mostly hidden skeleton. Each one replaces its preview in place.

Recorded load times, on Chrome on an Apple M4 Pro laptop with an emulated network, are in [plans/roadmap.md](../plans/roadmap.md), milestone 2. Frame rate, memory and phones are not measured yet.

## Where the records live

| File                                   | Records                                                     |
| -------------------------------------- | ----------------------------------------------------------- |
| `public/models/*-manifest.json`        | Source URLs, checksums, triangle counts, sizes and coverage |
| `asset-pipeline/data/*-selection.json` | The pinned list of source structures for each system        |
| `src/anatomy/generated/*.json`         | The catalogue the app reads: names, systems, regions, facts |
| `public/models/ATTRIBUTION.md`         | Sources, licences and every change made to the geometry     |

## Review status

Source names, positions and surfaces are preserved through one shared conversion. Attachments, landmarks and teaching content have not been independently reviewed by an anatomist. This is an educational experiment, not a complete or clinically reviewed atlas.

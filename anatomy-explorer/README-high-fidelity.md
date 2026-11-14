# High-fidelity anatomy: experiment and build plan

## Current scope (handoff continuation)

This is a feasibility experiment. Exclusive ownership is **not a requirement**.
The male skeleton is now the first implemented source-derived system; see
[README-skeleton.md](README-skeleton.md) for reproducible commands, measured
geometry counts, source attribution, tests, and explicit gaps. The older research
below records the initial plan, not proof that all requirements have been met.
Licensing does not block this experiment: attribution and source share-alike terms
are retained. Clinical review is a future quality milestone.


The app in this folder works end to end, but its bodies are placeholders: 60 capsules and spheres.
This document states the standard the real models must meet, what research on 14 Nov 2026 found
about where such models can come from, and the plan to build them.

## 1. The requirement

The explorer must be good enough to study the human body from, which means:

- **Complete.** Every system holds its full set of named structures, not a representative few.
- **Detailed.** Each structure has its real shape. A skeleton means 206 separate bones with their
  landmarks (condyles, foramina, processes), not rods.
- **Medically accurate.** Shapes, positions, relations and names agree with standard anatomy
  references, and a qualified anatomist has signed that off.
- **High resolution.** Close-up views of a single bone or organ stay smooth and detailed.
- **Experimental.** Attributed open source geometry is acceptable; exclusive ownership is out of scope.
- **Both sexes.** A male and a female body to the same standard.

### What "complete" means per system

| System | Minimum content |
| --- | --- |
| Skeletal | All 206 adult bones as separate meshes, 32 teeth, costal and articular cartilage, major ligaments |
| Muscular | Every named skeletal muscle (about 600 to 650, counts vary by convention) with tendons; diaphragm; pelvic floor |
| Nervous | Brain with lobes, gyri and deep nuclei; brainstem; cerebellum; spinal cord; 12 pairs of cranial nerves; 31 pairs of spinal nerves; the plexuses and named peripheral nerves |
| Cardiovascular | Heart with chambers, valves and coronary vessels; named arteries and veins down to the hands and feet |
| Lymphatic and immune | Thymus, spleen, tonsils, node groups, thoracic duct and main lymphatic trunks, red marrow sites |
| Respiratory | Nasal cavity, sinuses, pharynx, larynx with cartilages, trachea, bronchial tree, lung lobes and segments, pleura |
| Digestive | Mouth to anus with every named segment; liver segments, biliary tree, pancreas, salivary glands |
| Urinary | Kidneys with internal structure, ureters, bladder, urethra |
| Endocrine | Pituitary, pineal, thyroid, parathyroids, adrenals, islet-bearing pancreas, gonads |
| Reproductive | Complete male and female internal and external organs |
| Integumentary | Skin surface, plus a cross-section model of skin layers, hair and nails |

## 2. Why this cannot be generated in one pass

Accurate anatomy is measured, not invented. Every credible atlas is built from imaging of real
bodies (CT, MRI or cryosection photographs), segmented structure by structure and corrected by
anatomists. Code can produce plausible shapes; it cannot produce the correct shape of a sphenoid
bone or the course of the facial nerve. Anything I generated procedurally and called accurate
would be wrong in ways a student could not detect, which is the worst outcome for a study tool.

So the models have to be built from real data through a pipeline. The rest of this document is
that pipeline.

## 3. Research findings

### Sources and licences

| Source | What it is | Licence | Fit |
| --- | --- | --- | --- |
| **BodyParts3D** (DBCLS, Japan) | Whole-body adult male, one OBJ per structure, keyed by FMA ontology IDs | Licence page says **CC BY 4.0** (updated 27 Feb 2025). See the warning below | Best open base for the male body |
| **Z-Anatomy** | Blender atlas built on BodyParts3D, with added nerves and labels | **CC BY-SA 4.0**; some parts are non-commercial (inner ear CC BY-NC-SA, kidney CC BY-NC) | Not usable for a proprietary product as shipped |
| **HRA / HuBMAP 3D Reference Object Library** | 55 organ models (25 male, 30 female) from the Visible Human data, in GLB | **CC BY 4.0** | Good for female organs; has no muscles and only part of the skeleton |
| **Visible Human Project** (US NLM) | Raw CT, MRI and cryosection images of one male and one female body | No licence needed since July 2019; NLM terms apply and require acknowledgement | Raw material for models we segment ourselves |
| **TotalSegmentator** | AI that segments 100+ structures from CT or MR scans | Code Apache 2.0; some sub-models (appendicular bones, high-res heart, tissue types, face) need a paid licence for commercial use | Speeds up segmentation of Visible Human scans |
| **Commercial libraries** (Zygote and similar) | Finished male and female anatomy sets | Negotiated; no public terms for embedding in an app | Fastest route to both sexes, at a cost; not owned |

### What I measured in BodyParts3D release 4.0

I downloaded its index files and counted:

- 3,432 distinct anatomical concepts, each with an FMA ID.
- 1,258 separate meshes in the part-of tree and 2,234 in the is-a tree.
- Strong coverage of bones, muscles, arteries (732 named concepts), veins (340), bronchial tree,
  teeth, cartilage and the major organs.

Gaps I confirmed by searching the index:

- **No lymph nodes or lymphatic vessels** (zero entries containing "lymph").
- **No female anatomy** (zero entries for uterus, ovary, vagina or breast). The model is male only.
- **Very few peripheral nerves** (no sciatic nerve, vagus nerve or brachial plexus).

Resolution: the mesh archive did not finish downloading (the server stalled at 19 of 65 MB).
The 188 meshes that did arrive total 935,000 triangles, with a median of about 1,550 and a largest
of about 112,000. Scaled to all 1,258 meshes that suggests several million triangles in total, but
that is an extrapolation from a sample. The archive is also labelled as a 99% polygon reduction,
so higher-resolution originals may exist; I have not confirmed that or whether they are available.

### Licence warning on BodyParts3D

The official licence page says CC BY 4.0, which permits closed commercial products with
attribution. But the OBJ files I downloaded still carry a header naming **CC BY-SA 2.1 Japan**,
which would force anything derived from them to be shared under the same terms. Until DBCLS
confirms in writing that the 4.0 release files are under CC BY 4.0, treat this as unresolved.
This one answer decides whether the cheapest route is open to us.

### Naming standards

- **FMA** (Foundational Model of Anatomy) IDs come with BodyParts3D and give every structure a
  stable identifier and a place in a part-of hierarchy.
- **Terminologia Anatomica 2** is the international standard for names. Its individual terms are
  public domain; the publication is CC BY-ND 4.0.

## 4. What "proprietary" can mean

No free source gives us a complete model that we would own outright. There are three routes:

| Route | What we ship | Ownership | Cost and effort |
| --- | --- | --- | --- |
| **A. Open base plus our own work** | BodyParts3D male (if CC BY 4.0 is confirmed) and HRA organs, cleaned, corrected and extended by us | We own our additions and corrections; the base stays attributable to its authors. The product can be closed | Lowest. Most of the male body exists on day one |
| **B. Licensed commercial library** | A vendor's male and female sets | Vendor owns the models; we hold a licence | Fast, recurring or one-off fee, terms limit what we can do |
| **C. Original models from imaging** | Meshes we segment from Visible Human scans and sculpt ourselves | Fully ours | Highest. Months of segmentation and anatomist time |

**Recommendation:** start with route A for the male body and use route C only for what is missing
(lymphatics, peripheral nerves, the female body). That gets a complete, accurate male skeleton,
musculature and vasculature quickly, and spends original effort where no usable source exists.
Have a lawyer confirm the licence position before anything ships.

## 5. Build pipeline

1. **Ingest.** Download source meshes into `assets-src/` (kept out of the app bundle), recording
   source, version, licence and checksum for every file.
2. **Identify.** Key every mesh by FMA ID. Generate `systems.json` from the source index and the
   FMA hierarchy rather than writing it by hand, so thousands of entries stay consistent.
3. **Clean (Blender, scripted).** Fix normals and holes, align left and right, set scale and
   orientation to the app's convention, separate fused parts, name objects by ID.
4. **Fill gaps.** Segment missing structures from Visible Human scans in 3D Slicer, using
   TotalSegmentator's open models for a first pass and manual correction after. Model by hand,
   against references, what cannot be segmented (fine nerves, lymphatics).
5. **Female body.** Segment the Visible Human female, or adapt the male skeleton and musculature
   to female proportions and add female organs from the HRA set. The first is more accurate; the
   second is faster. This is an open decision.
6. **Optimise.** Produce three levels of detail per structure, compress with Draco or meshopt,
   and split into one file per system and region so the browser loads only what is on screen.
7. **Verify.** Run the mesh audit, the completeness check against the table in section 1, and the
   anatomist review described below.

## 6. Changes the app needs

The current app assumes 60 meshes in one file. Thousands of meshes need:

- **Streaming.** Per-system files loaded on demand, with levels of detail switched by distance.
- **Hierarchy.** A tree browser (system, region, organ, part) and search across thousands of
  names, including synonyms and Latin terms.
- **Rendering.** Merged draw calls for unselected structures and a spatial index for hover
  picking, to keep 60 fps. The 60 fps target has not yet been measured on real hardware even for
  the placeholder.
- **Schema.** `systems.json` gains an ID, a parent, synonyms, laterality and a source and licence
  record per structure.
- **Content.** Descriptions for thousands of structures, written or reviewed by someone qualified.

## 7. Accuracy and sign-off

"Medically accurate" is a claim about review, not about the software. Before the claim is made:

- An anatomist checks every system against a standard atlas, using a written checklist: present,
  correctly named, correct side, correct position, correct neighbours.
- Every correction is logged against the structure's ID.
- Every description and fact cites a reference.
- The on-screen note "For education only, not medical advice" stays.

## 8. Phases

| Phase | Deliverable | Done when |
| --- | --- | --- |
| 0. Licence | Written answer from DBCLS; legal review of routes A to C | We know which sources we may ship |
| 1. Skeleton | Complete male skeleton in the app | 206 bones and 32 teeth, each selectable, anatomist-checked |
| 2. Male body | Muscles, vessels, organs, airways | Section 1 table met for every system BodyParts3D covers |
| 3. Gaps | Lymphatics, peripheral nerves, skin layers | Section 1 table met for all eleven rows |
| 4. Female body | Female model to the same standard | Same checks pass for the female file |
| 5. Scale-up | Streaming, levels of detail, hierarchy browser | 60 fps measured on a mid-range laptop with a full body loaded |

Phase 1 is the right first build: it is the system you named, the source data for it is the
strongest, and it proves the whole pipeline on a few hundred meshes before thousands.

## 9. Historical commercial questions (not blockers for this experiment)

1. **Ownership.** Is a closed product built on attributed open data acceptable (route A), or must
   every mesh be exclusively ours (route C)?
2. **Budget.** Is there money for a commercial library (route B) or for an anatomist's review time?
3. **Female body.** Segment from Visible Human scans (accurate, slow) or adapt the male model
   (fast, less faithful)?

## Sources

- BodyParts3D licence: <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html>
- BodyParts3D release 4.0 README and data: <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/README_e.html>
- Z-Anatomy models and licences: <https://github.com/Z-Anatomy/Models-of-human-anatomy>
- HRA 3D Reference Object Library: <https://hubmapconsortium.github.io/ccf/pages/ccf-3d-reference-library.html>
  (the page I read lists release 1.2, June 2022; check for newer releases)
- Visible Human Project data access: <https://www.nlm.nih.gov/research/visible/getting_data.html>
- TotalSegmentator: <https://github.com/wasserth/TotalSegmentator>
- Terminologia Anatomica 2: <https://libraries.dal.ca/Fipat/ta2.html>

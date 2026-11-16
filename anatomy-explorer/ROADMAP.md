# Anatomy Explorer roadmap

Updated 2026-11-16. This is the single forward plan for the anatomy app. `README.md` covers operation; the manifests record what is actually shipped; `ATTRIBUTION.md` records source terms. Update this file as milestones are verified rather than creating parallel planning documents.

## Latest implementation update

Five additional system layers are now imported: 65 cardiovascular, 12 respiratory, 12 further digestive (plus three shared respiratory/oral surfaces), six urinary and 98 nervous structures. The viewer supports independent visibility and one-click solo views, search, streamed detail, hide/restore and isolation for all seven systems. The new import has a pinned selection, source checksums and output audit.

Milestones 3 and 4 below now describe coverage expansion and review of this initial import. They are not complete: peripheral vessels, peripheral nerves, complete spinal cord geometry, anatomical review, registration landmarks and measured performance remain outstanding. Milestones 1 and 2 still apply. Female anatomy and other system layers remain unimplemented.

## Outcome

Build a study atlas with real, individually selectable anatomy, coherent spatial relationships across systems, useful source-backed teaching content and a responsive browser viewer. Start with the male source body already imported. Add female anatomy as a separately sourced and reviewed body. No system is considered delivered because a toggle, label or approximate shape exists.

## Starting point

| Area                             | Implemented                                                                                                  | Still unverified or missing                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Male skeleton                    | 231 selectable source structures; 199 standard bones represented; 28 teeth                                   | Separate coccyx, six ossicles, four third molars; cartilage, ligaments and landmarks; expert review      |
| Male muscles                     | 435 named source muscle/tendon structures; eight regional overviews; selected full-detail loading            | Full individual-muscle coverage, attachment review, anatomical corrections and detailed teaching content |
| Shared body                      | Both imports use one pinned source revision and one rigid coordinate transform                               | Landmark-based registration checks and review of anatomical relationships                                |
| Viewer                           | Search, browsing, visibility, opacity, focus, isolation, hide/restore and explicit load errors               | Bounded asset cache, skeleton LOD, retry controls, clipping, annotations and measured device performance |
| Verification                     | Production build, catalogue/mesh audit, geometry counts, basic bounds/laterality and state regression checks | Automated decoded-geometry registration tests, CI browser checks and anatomist sign-off                  |
| Additional systems / female body | Five initial internal system layers imported; female body unavailable                                        | Coverage expansion, sourcing gaps, registration and review                                               |

Muscle counts include source groups and tendons. A source triangle count is a fidelity measurement, not proof of anatomical accuracy. The current muscle detail compression removes 26 of 18,087,874 source triangles. The whole-body muscle overview still has about 3 million triangles, in addition to the 2 million triangle skeleton.

## Architecture to keep

New systems extend the existing body; they are not new independently centered scenes.

1. **Source package:** pin dataset/revision, structure IDs, source files, hashes and applicable geometry terms. Keep raw sources out of the browser bundle.
2. **Anatomy catalogue:** distinguish anatomical concepts from renderable meshes. A source group can represent several concepts; one concept can have several meshes. Keep source IDs stable and record laterality, region, system membership, parent relationships, aliases, body identity and provenance.
3. **Registration:** use the existing shared transform for this BodyParts3D body. A different source requires an explicit registration transform and reviewed landmark correspondences. Never resize or reposition each organ independently to make it look plausible.
4. **Asset manifest:** generate system/region overview URLs, per-structure detail URLs, bounds, byte sizes, triangle counts, hashes and coverage status. Preserve the mapping between concept IDs and picking IDs across all levels of detail.
5. **Viewer:** load layers independently; use the registry to replace overview geometry with selected detail without rendering both. Keep layer visibility as the single state source for both controls and picking.
6. **Content and review:** attach referenced descriptions and review records to stable IDs. Keep software validation separate from anatomical sign-off.

The current implementation has system-specific builders. Extract a common manifest schema and layer loader as the third real system is added; avoid building a general plugin framework before that requirement exists.

## Milestones, in order

### 1. Verify and stabilize the skeleton + muscle body

This is the next implementation milestone. Finish it before importing another large system.

- Audit the muscle selection against the source hierarchy, including hand/foot groups, rectus subdivisions, diaphragm and pelvic floor. Produce explicit missing, grouped and excluded entries. Resolve structures currently in “Other muscle structures”.
- Check left/right pairs, bone relationships and shared landmarks in front, side and back views. Add representative decoded-geometry tests against transformed raw source vertices; identical transform metadata alone is insufficient.
- Compare overview and detailed surfaces around narrow tendons, muscle boundaries and thin bones. Define acceptable error by structure and viewing distance, not one global reduction ratio.
- Review and document the 26 dropped triangles; determine whether compression preserves the intended surface at those locations.
- Add pending/failed detail states, actionable retry controls and tests for slow loads, region switching, hidden layers and selections made before geometry arrives.
- Record a browser smoke suite in the repo and run it in CI alongside `npm run check`. Include keyboard search, system controls, picking, focus, isolation, hide/restore and a mobile viewport.

**Exit:** every shipped source ID is accounted for; representative registration and LOD comparisons pass; failed loads never silently substitute anatomy; browser regressions run automatically. Anatomical review status remains visible for anything not yet reviewed.

### 2. Establish performance budgets before adding more geometry

- Profile a named laptop and a named mobile device. Record browser, viewport, network conditions, cold-load time, frame time, draw calls and peak memory.
- Add a skeleton overview/detail split. Prioritize visible regions and the selected structure instead of downloading every region immediately.
- Implement cache budgets, request cancellation or stale-result suppression, and disposal of unneeded decoded geometry. Track both CPU and GPU memory; compressed transfer size alone is insufficient.
- Split the catalogue/search payload from the initial shell if profiling confirms it delays interaction. The production bundle currently warns about large chunks.
- Use a spatial picking index and draw-call reduction only after profiling identifies those bottlenecks. Preserve structure identity and selection behavior.

**Proposed acceptance targets, not current claims:** usable first view within 5 seconds on a documented 20 Mbps / 100 ms test connection; 95th-percentile frame time below 33 ms during a repeatable orbit/selection sequence on the chosen laptop; no monotonic memory growth after 20 region/selection cycles. Set the mobile memory budget from device measurements. Record actual results here.

### 3. Add thoracic and abdominal organs from the same body

Import in small, independently verifiable batches:

1. Respiratory: lungs and available subdivisions, trachea, main bronchi, laryngeal structures and associated source parts.
2. Digestive: liver, gallbladder/biliary structures, stomach, intestines, pancreas and available named subdivisions.
3. Urinary: kidneys, ureters, bladder and urethral parts present in the source.
4. Male reproductive and endocrine: available structures with shared-system ownership where appropriate, such as pancreas and gonads.

For each batch, first inspect the pinned source hierarchy and files. Publish the actual available coverage, then select non-overlapping renderable leaves. Extend the manifest, catalogue and layer controls from generated data. Add a torso preset that reveals internal relationships through visibility, opacity or clipping.

**Exit per batch:** every promised structure has geometry and provenance; no duplicate parent/child surfaces; source registration is preserved; unloaded structures can be found through search; selection and hiding work across systems; source omissions are listed. Do not claim internal organ anatomy when only an outer surface exists.

### 4. Add cardiovascular anatomy

- Inventory heart surfaces, chambers, valves, coronary vessels, major arteries and veins in the chosen source. Confirm which are separate meshes versus labels or aggregates.
- Start with heart and great vessels; then add regional arterial and venous trees down to hands and feet where source coverage permits.
- Preserve thin branches during simplification. Split loading by region and vessel family rather than one whole-body file.
- Support artery/vein filters, connected-structure navigation and reviewed continuity checks at region boundaries.

**Exit:** each declared vessel has a stable ID and selectable surface; important connections and relationships have been checked; thin vessels remain visible at the intended viewing scale; the performance gate from milestone 2 still passes.

### 5. Fill source gaps and complete supporting systems

This requires new anatomical data and review, not just frontend code.

| Workstream         | Required work                                                                                      | Acceptance evidence                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Skeletal gaps      | Source missing bones/teeth; add cartilage and ligaments; annotate landmarks                        | Count against an explicit adult-bone inventory, correct laterality and reviewed articulations |
| Nervous            | Inventory existing CNS data; source missing cranial/spinal nerves, plexuses and peripheral courses | Named structures and reviewed courses relative to vessels, muscles and bones                  |
| Lymphatic / immune | Establish available node groups, ducts, trunks and organs; source gaps                             | Explicit node-group granularity and reviewed drainage relationships                           |
| Integumentary      | Obtain a registered skin surface; build separately sourced sectional views                         | Whole-body fit plus clearly identified sectional/detail assets                                |
| Organ internals    | Add lobes, segments, chambers, ducts and other missing internal structures                         | Internal geometry supported by source data, not labels applied to an exterior shell           |

Candidate routes to evaluate are compatible open datasets, licensed anatomy libraries, or segmentation from imaging followed by manual correction. Verify the exact downloadable asset, permission to redistribute derivatives and browser delivery rights before choosing a source. Earlier exploratory source/license claims are not procurement decisions. Do not block local work on hypothetical commercial ownership requirements.

**Exit:** every intended concept is marked present, grouped, missing or intentionally excluded; new geometry passes registration and expert review. No absent structure is filled with an invented primitive.

### 6. Build a separately sourced female body

- Choose a coherent female base dataset or a segmentation project with anatomy review. Do not relabel or globally scale the male body.
- Define shared concepts independently of body-specific meshes. Add body identity to source records, assets and review status.
- Include a reviewed pelvis, skeleton, musculature, reproductive organs, breasts and organ relationships; preserve real variation instead of assuming a universal body.
- Add body switching only when each body has a meaningful, truthful coverage inventory. Keep camera and layer preferences when possible; clear selections absent from the new body.

**Exit:** the same coverage, registration, performance and interaction gates pass for the female body. The UI reports differences in coverage explicitly.

### 7. Make the geometry useful for study

- Build a hierarchy of system → region → structure → part, with aliases and reviewed terminology.
- Add source-backed descriptions, muscle origins/insertions/actions/innervation, articulations, landmarks and relationships. Keep provisional text distinguishable from reviewed content.
- Add labels with occlusion handling, clipping planes, saved views and guided dissection steps. Define what “hide”, “isolate” and “restore” mean consistently across these features.
- Add keyboard access to all study actions, readable labels, reduced-motion behavior and mobile interaction checks.
- Introduce quizzes and guided lessons only after their underlying anatomy and answer keys are reviewed.

**Exit:** representative study tasks can be completed by learners without exposing incorrect or unsupported anatomy; content has citations and a named review record.

## Definition of a delivered system

A system is delivered only when it has:

- A named scope and coverage inventory, including omissions and grouped source structures.
- Real geometry, stable identities, source hashes and retained attribution.
- Verified registration to the selected body and anatomical review appropriate to the claim.
- Search, selection, visibility, opacity, isolation and detail behavior that work with other layers.
- Reproducible asset generation, automated checks and recorded device-performance results.
- Teaching content that states its sources and review status.

Do not rename “imported” to “complete” or “medically accurate” without the corresponding evidence.

## Next work package

Take milestone 1 first: produce the muscle coverage inventory, add decoded landmark/LOD validation, investigate the dropped triangles, and commit a reproducible browser smoke suite. Then measure milestone 2 before choosing the first respiratory batch. Keep later milestones as work queues until their dependencies are satisfied; avoid calendar estimates until sourcing and anatomical review effort are known.

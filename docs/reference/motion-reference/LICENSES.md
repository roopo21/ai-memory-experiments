# Reference data: licences and provenance

The reference-envelope check (`npm run check:reference`) uses numbers derived from exactly two open
datasets. Nothing from AMASS, Fit3D, GRAB, CMU, Mixamo, marketplaces or any other source is used.
Read on 2026-11-28 at the origin URLs below. This is a record of what the sources say, not legal
advice; the open questions for a lawyer are in the research note (`mocap-research.md`, section 9).

| Source          | Licence                                        | Used for                                | Tier            |
| --------------- | ---------------------------------------------- | --------------------------------------- | --------------- |
| UI-PRMD         | Open Data Commons PDDL v1.0 (public domain)    | Squat, lunge, leg raise, shoulder, step | commercial-safe |
| AddBiomechanics | Creative Commons Attribution 4.0 International | Squat, sit to stand, gait, running      | commercial-safe |

## What is and is not in the repository

- **Committed:** `scripts/reference/` (code), `docs/reference/motion-reference/data/envelopes.json`
  (percentiles, ratios and counts across at least five subjects per entry), and these notes.
- **Never committed:** any recording, trajectory, marker file, `.b3d`, `.zip` or per-frame series.
  The script downloads into `.cache/motion-reference/`, which `.gitignore` excludes, and writes only
  the aggregate JSON. A figure in the JSON cannot be turned back into a recording of one person.
- The data is used to describe how people move, in checks. It is not retargeted onto the rig, played
  back, or used to fit a model, and none of it ships in the web app.

## UI-PRMD

University of Idaho Physical Rehabilitation Movements Data Set. 10 healthy adults, 10 movements, 10
repetitions each, recorded with a Vicon optical system (100 Hz) and a Kinect.

- Data set page: https://webpages.uidaho.edu/ui-prmd/ (read from the Internet Archive snapshot of
  2025-04-24, https://web.archive.org/web/20250424230129/https://www.webpages.uidaho.edu/ui-prmd/).
  On 2026-11-28 the live host refused scripted requests (HTTP 403) and the `www.` host redirected to
  `https://www.uidaho.edu/404.htm`, so the page may have moved. The archive keeps the files.
- Paper (the citation the authors ask for): Vakanski A., Jun H.-P., Paul D., Baker R. A Data Set of
  Human Body Movements for Physical Rehabilitation Exercises. _Data_ 2018, 3(1), 2.
  https://doi.org/10.3390/data3010002 (PMC5773117, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5773117/).
- File used: `Segmented Movements.zip` (206,962,745 bytes, SHA-256
  `37478419e5bd6cdb814a94d1ec0fa0b2dfa6497cae03d25e1c2fbc51c676d721`), the Vicon `Positions` folder
  only. Fetched from the Internet Archive copy of 2025-04-25,
  `http://web.archive.org/web/20250425223830id_/https://www.webpages.uidaho.edu/ui-prmd/Segmented%20Movements.zip`;
  the script tries the origin URL first and accepts any copy with the pinned checksum.
- Version: the set has no version number. It is the 2018 release as published on that page.

Licence text, quoted:

> The data set is released under the Open Data Commons Public Domain Dedication and License (PDDL)
> v1.0, and as such is publically available for free to all interested users.
> (data set page)

> Data Set License: UI-PRMD data set is made available under the Open Data Commons Public Domain
> Dedication and License v1.0 whose full text can be found at:
> http://opendatacommons.org/licenses/pddl/1.0. (Data 2018 paper, footnotes)

PDDL v1.0 (https://opendatacommons.org/licenses/pddl/1-0/), section 3.1: "The Rightsholder by using
this Document, dedicates the Work to the public domain for the benefit of the public and
relinquishes all rights in Copyright and Database Rights over the Work." Where that dedication is
not effective, section 3.3(a) grants "a worldwide, royalty-free, non-exclusive, licence to Use the
Work ... These rights explicitly include commercial use, and do not exclude any field of
endeavour." Section 4.1: no other contractual conditions. Section 5.1: "provided by the
Rightsholder 'as is'". PDDL requires no attribution. We give it anyway, as the authors request a
citation.

Notes and limits:

- The data set page notes that the Vicon files for subject 3's inline lunge (`m03_s03`) are missing.
- 37 of 990 Vicon episodes lose a marker the angle definitions need (Vicon writes occluded markers as
  zero). They are excluded, not repaired. The count is in `envelopes.json` under `excluded`.
- The article itself is CC BY 4.0, separately from the data licence.

## AddBiomechanics

AddBiomechanics Dataset 1.0 (the "core" dataset): OpenSim models and per-trial kinematics for 273
subjects, 70+ hours, from 15 published data sources, processed with one pipeline (Stanford University).

- Data page: https://addbiomechanics.org/download_data.html (read 2026-11-28). Terms of service:
  https://addbiomechanics.org/tos.html. FAQ with citation rules: https://addbiomechanics.org/faq.html
  (last updated May 09, 2025).
- Archive used: `http://archive.simtk.org/addbiomechanics/addbiomechanics.zip`, 417,665,422,113 bytes,
  `Last-Modified: Wed, 02 Apr 2025 18:47:20 GMT`, `ETag: "613ecc9321-631d01550d044"`. We read its
  central directory and extract single `.b3d` members by byte range; the members, sizes and CRC-32
  checksums are pinned in `scripts/reference/sources.json`. Nothing else in the archive is read.
- Version: "Version 1.0 of the AddBiomechanics Dataset". The page also lists a larger, unreviewed
  "May 15, 2024 snapshot"; we do not use it.

Licence text, quoted from the data page:

> Below are (currently) the world's largest datasets of physically validated human motion,
> available for free under a Creative Commons BY 4.0 license.

and from the terms of service: "content submitted to this website ... will be available under a CC BY
4.0 license". The legal code is https://creativecommons.org/licenses/by/4.0/legalcode. Section
2(a)(1) grants "a worldwide, royalty-free, non-sublicensable, non-exclusive, irrevocable license to
exercise the Licensed Rights in the Licensed Material to: reproduce and Share the Licensed Material,
in whole or in part; and produce, reproduce, and Share Adapted Material." The licence has no
non-commercial term. Section 3(a)(1) requires, when Sharing, identification of the creators, a
notice referring to the licence, a link to the licence, and an indication of whether the material was
modified. Section 4 treats a database that includes a substantial part of the contents as Adapted
Material. Our derived JSON is percentiles of a small subset, and we attribute it as modified.

Credit, as the FAQ asks ("Please also cite the AddBiomechanics Dataset manuscript", and the page: "the
LICENSE.txt file in each dataset ... lists the original uploaders ... so that you can correctly
credit them"). The core-dataset archive contains no `LICENSE.txt`, so credit follows the source
table on the data page:

- Werling K., Kaneda J., Tan T., Agarwal R., Skov S., Van Wouwe T., Uhlrich S., Bianco N., Ong C.,
  Falisse A., Sapkota S., Chandra A., Carter J., Preatoni E., Fregly B., Hicks J., Delp S., Liu C. K.
  (2025). AddBiomechanics Dataset: Capturing the Physics of Human Motion at Scale. In _Computer Vision
  – ECCV 2024_ (pp. 490–508). Springer. https://doi.org/10.1007/978-3-031-73223-2_27
- Werling K., Bianco N. A., Raitor M., Stingel J., Hicks J. L., Collins S. H., Delp S. L., Liu C. K.
  (2023). AddBiomechanics: Automating model scaling, inverse kinematics, and inverse dynamics from
  human motion data through sequential optimization. _PLOS ONE_ 18(11), e0295152.
  https://doi.org/10.1371/journal.pone.0295152
- Data sources used (as the data page links them):
  - Uhlrich et al. 2023, OpenCap, 6 subjects: https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011462
  - Falisse et al. 2016, 7 subjects (gait and sit to stand): https://pubmed.ncbi.nlm.nih.gov/27875132/
  - Hamner et al. 2013, 6 subjects (running): https://pubmed.ncbi.nlm.nih.gov/23246045/

Notes and limits:

- The terms of service say: "This software is a demonstration of a research result and can't be used
  for diagnostics or any other clinical purposes." We use the data to check animation, and make no
  diagnostic or clinical claim. Repository rule 6 (education only) stands.
- The terms also say contributors must have de-identified patient data and had it "properly
  authorized". Whether uploaders held the rights and subject consent to license commercially is
  open question 7 in the research note; we rely on the stated CC BY 4.0 grant.
- Trials of simulated impairment (asymmetric squats, weak legs, trunk sway) are excluded from the
  natural-movement envelopes.

## Attribution in the repository

`public/models/ATTRIBUTION.md` ("Motion reference data") and the "Sources and licences" section of
`README.md` carry the credit above. `envelopes.json` repeats the licence, tier, page, paper and access
date of each source under `sources`.

## Rules for adding a source

A source joins only after the owner approves it and its licence is read at the origin. Only sources
with an explicit commercial-use grant (CC BY, CC0, PDDL, or equivalent) may feed `envelopes.json`.
Datasets licensed for non-commercial or research-only use (AMASS, SMPL, Fit3D, GRAB, Human3.6M, and
others in the research note) stay out of this repository, out of its cache, and out of its CI.

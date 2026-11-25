# Anatomy geometry attribution

BodyParts3D © The Database Center for Life Science (DBCLS), Japan.
Source: BodyParts3D release 3.0 (20110915), 95% polygon reduction, converted to STL by Kevin Mattheus Moerman.

- Mirror: https://github.com/Kevin-Mattheus-Moerman/BodyParts3D
- Pinned commit: `2c83c698788cff57f6317bddcf712e7acfbea7d8`
- Geometry licence retained from the pinned mirror: Creative Commons Attribution-ShareAlike 2.1 Japan, https://creativecommons.org/licenses/by-sa/2.1/jp/
- Original paper: https://doi.org/10.1093/nar/gkn613

The derived `male-skeleton.glb` and all files under `muscles/` and `organs/` retain these attribution/share-alike terms. The mirror's code licence does not replace its geometry licence.

Changes: selected source bones, teeth, muscles and tendons; converted millimetres to metres; rotated Z-up to Y-up; applied the same ground translation to both systems; welded coincident vertices; recomputed shading normals; exported indexed GLB with Draco compression (16-bit positions, 12-bit normals). Muscle regional overviews are simplified with a 12% target triangle ratio and 0.001 simplifier error setting. Detailed muscle surfaces are exported without that simplification step, but compression removes 26 of 18,087,874 source triangles. The skeleton export retains its 2,037,126 source triangles. No anatomical sculpting, synthetic splitting or repair has been applied.

See `skeleton-manifest.json` and `muscles-manifest.json` for source URLs, checksums, geometry counts, output sizes and coverage limitations. These are source-derived surfaces, not an independently reviewed anatomy atlas. Additional source-derived cardiovascular, respiratory, digestive, urinary and nervous selections are included under `organs/`. Their detail exports remove eight of 3,522,988 source triangles during compression; regional overviews use the same simplification settings as muscles. See `organs-manifest.json` for their source provenance and output counts. Female anatomy is not included.

Muscle preview GLBs omit source materials. The viewer applies a neutral material and colors the muscles identified by each exercise.

## Nervous system extension

BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan.
Z-Anatomy - The open source atlas of anatomy - CC-BY-SA 4.0.
Cranial Nerves and Foramina - University of Dundee, CAHID - CC-BY 4.0.

The files under `nerves/` adapt the Z-Anatomy glTF export at https://github.com/nqwrc/3d-anatomy/tree/8ca3b7421bcfbe88b85859eb1983d5cf79f21749/public/models, originating from https://github.com/Z-Anatomy/Models-of-human-anatomy. These derived nerve geometry files are distributed under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). The cranial nerve contribution retains CC BY 4.0 attribution (https://creativecommons.org/licenses/by/4.0/). The upstream notice is retained at `nerves/LICENSE.txt`.

Changes: selected 282 spinal cord, cranial, trunk, pelvic and limb nerve surfaces; excluded duplicate brain and inner-ear surfaces; fitted one uniform similarity transform against 99 corresponding bone landmarks (median residual 0.80 mm); baked world coordinates; exported five regional Draco-compressed GLBs. See `nerves-manifest.json` for source hashes, counts and registration. Courses have not been independently reviewed.

## Stretch and nerve-glide content

The exercise library under `src/guides/library/` was written for this app and is not clinically reviewed. Entries that link a source paraphrase the movement in that public handout, and a dose that names a source quotes its numbers. No handout text or images are reproduced. Sources:

- American Academy of Orthopaedic Surgeons, OrthoInfo: Knee, Rotator Cuff and Shoulder, Spine, Hip, and Foot and Ankle Conditioning Programs; Therapeutic Exercise Programs for Carpal Tunnel Syndrome (2022) and Radial Tunnel Syndrome (2024). https://www.orthoinfo.org
- NHS: Flexibility exercises. https://www.nhs.uk/live-well/exercise/flexibility-exercises/
- HealthLinkBC: Hip flexor stretch (kneeling). https://www.healthlinkbc.ca/healthwise/hip-flexor-stretch-kneeling
- Physitrack: Pectoralis stretching. https://us.physitrack.com/home-exercise-video/pectoralis-stretching
- East Kent Hospitals University NHS Foundation Trust: Cubital tunnel syndrome. https://leaflets.ekhuft.nhs.uk/cubital-tunnel-syndrome/html
- The Royal Wolverhampton NHS Trust: Nerve Gliding Exercises. https://royalwolverhampton.nhs.uk/wp-content/uploads/2025/06/Nerve-Gliding-Exercises.pdf
- South Tees Hospitals NHS Foundation Trust: Sciatic nerve slider; Femoral nerve slider. https://www.southtees.nhs.uk/resources/

Default stretch doses follow Garber et al., ACSM position stand, Med Sci Sports Exerc 2011;43(7):1334–59. Glide types follow Coppieters and Butler, Man Ther 2008;13(3):213–21. Evidence notes cite Coppieters et al. 2009 and 2015 (J Orthop Sports Phys Ther) and Basson et al. 2017 (J Orthop Sports Phys Ther 47(9):593–615).

## Motion studio performer

Clover, the clothed performer, is an original procedural character built in this project. Her face, hair, clothes and articulated limbs are generated by `asset-pipeline/motion/build-avatar.ts`. The jaw, finger and toe pivots and skin bindings use landmarks derived from the registered BodyParts3D surfaces credited above. The studio drives Clover and the atlas with the same movement. Keep the anatomy source credits and share-alike licence with recordings that show atlas geometry.

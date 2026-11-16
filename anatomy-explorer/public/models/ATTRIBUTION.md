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

## Nervous system extension

BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan.
Z-Anatomy - The open source atlas of anatomy - CC-BY-SA 4.0.
Cranial Nerves and Foramina - University of Dundee, CAHID - CC-BY 4.0.

The files under `nerves/` adapt the Z-Anatomy glTF export at https://github.com/nqwrc/3d-anatomy/tree/8ca3b7421bcfbe88b85859eb1983d5cf79f21749/public/models, originating from https://github.com/Z-Anatomy/Models-of-human-anatomy. These derived nerve geometry files are distributed under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). The cranial nerve contribution retains CC BY 4.0 attribution (https://creativecommons.org/licenses/by/4.0/). The upstream notice is retained at `nerves/LICENSE.txt`.

Changes: selected 282 spinal cord, cranial, trunk, pelvic and limb nerve surfaces; excluded duplicate brain and inner-ear surfaces; fitted one uniform similarity transform against 99 corresponding bone landmarks (median residual 0.80 mm); baked world coordinates; exported five regional Draco-compressed GLBs. See `nerves-manifest.json` for source hashes, counts and registration. Courses have not been independently reviewed.

# Anatomy geometry attribution

BodyParts3D © The Database Center for Life Science (DBCLS), Japan.
Source: BodyParts3D release 3.0 (20110915), 95% polygon reduction, converted to STL by Kevin Mattheus Moerman.

- Mirror: https://github.com/Kevin-Mattheus-Moerman/BodyParts3D
- Pinned commit: `2c83c698788cff57f6317bddcf712e7acfbea7d8`
- Geometry licence retained from the pinned mirror: Creative Commons Attribution-ShareAlike 2.1 Japan, https://creativecommons.org/licenses/by-sa/2.1/jp/
- Original paper: https://doi.org/10.1093/nar/gkn613

The derived `male-skeleton.glb` and all files under `muscles/` retain these attribution/share-alike terms. The mirror's code licence does not replace its geometry licence.

Changes: selected source bones, teeth, muscles and tendons; converted millimetres to metres; rotated Z-up to Y-up; applied the same ground translation to both systems; welded coincident vertices; recomputed shading normals; exported indexed GLB with Draco compression (16-bit positions, 12-bit normals). Muscle regional overviews are simplified with a 12% target triangle ratio and 0.001 simplifier error setting. Detailed muscle surfaces are exported without that simplification step, but compression removes 26 of 18,087,874 source triangles. The skeleton export retains its 2,037,126 source triangles. No anatomical sculpting, synthetic splitting or repair has been applied.

See `skeleton-manifest.json` and `muscles-manifest.json` for source URLs, checksums, geometry counts, output sizes and coverage limitations. These are source-derived surfaces, not an independently reviewed anatomy atlas. Other systems and female anatomy are not included.

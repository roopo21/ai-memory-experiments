---
name: nerve-glide-views
description: Frame new Motion Lab exercises and stills, map nerve glides to regional muscle exposure, and verify the target path and floor context.
---

# Motion Lab exercise views

- [ ] Add each glide ID to its exposure region in `src/studio/glideViews.ts`. Use the primary and secondary nerve groups from its cited guide. Trace each named nerve through the shipped atlas on both sides. The sciatic trunk divides into tibial and common fibular nerves. Nearby sacral plexus branches can have different origins. Mark absent branches as missing. [Upper limb anatomy](https://anatomy.ttuhscep.edu/anatomytables/nerves_upperlimb.html) · [Lower limb anatomy](https://anatomy.ttuhscep.edu/anatomytables/nerves_lowerlimb.html)
- [ ] Expose the working shoulder, arm and hand for upper-limb glides. Include the neck for plexus and cervical loading. Expose the working hip, lumbar area, leg and foot for lower-limb glides. Include the axial route for a cord/dura target. Mirror the working side and expose both for bilateral guides.
- [ ] In Full body, keep remote muscles opaque and regional muscle opacity at 0.22. Bones retain their depth cues. Draw the primary nerve in cyan with a 2.7-pixel depth-independent stroke and secondary targets with a 1.6-pixel stroke. Check both preview and full resolution when the surface source changes.
- [ ] Fit the full motion envelope once. Use side for sagittal squats and hinges, front for lateral movement, and detail framing for hands and glides. Inspect the floor and shadow in whole-body views and in the detail inset. A view change must preserve the pose. Supported surfaces have a 5 mm tolerance in the rig checks. Test apparent gaps using those checks before changing a camera.
- [ ] Inspect named phases on labelled contact sheets. Check proximal and distal ends, the opposite limb, the floor, the support prop and whether the inset covers the active limb. Repeat on the right for unilateral changes. Compare the same timestamps before and after. Keep the review to still images.

```sh
npm run check:glide-views
npm run stills:guides -- --kind glide --angle Focus --output .view-stills/glides
npm run stills:guides -- --only median-slider --side right --angles Focus,Side --output .view-stills/right
npm run stills:guides -- --only squat,cossack-squat,chair-hamstring --angles Teaching,Front,Side,Back,Overhead,Focus --times 2 --output .view-stills/cameras
npm run check
npm run format:check
```

The focus still renderer requires at least 12 cyan pixels in the main frame outside the inset at every sampled phase. Visually trace the path too. Passing a pixel count alone cannot establish continuity or clinical accuracy.

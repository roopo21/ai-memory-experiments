# Motion Lab views

Stills for the region-focused nerve glide view and the camera set. Education only; not clinically reviewed.

- `focus/`: every nerve glide in the Focus camera at the start and 2 s, as contact sheets (`sheet-NN.jpg`) and per glide. Muscles are faded to 0.22 opacity only in the glide's region; the cyan nerve is drawn on top of bone.
- `before/`: the same glides in the old Teaching view, for comparison.
- `cameras/` and `cameras-before/`: squat, cossack squat and chair hamstring from Teaching, Front, Side, Back, Top and Focus.

Regions: `arm` is shoulder, arm and hand. `arm-neck` adds the neck for plexus and cervical loading. `leg` is hip, lumbar area, leg and foot. `leg-spine` adds the axial route for sciatic, slump and femoral tensioning. The mapping lives in `src/studio/glideViews.ts`; `npm run check:glide-views` fails if a glide has no region, if its primary nerve is not drawn on both sides, or if remote muscles fade. Nerve groups come from the guide library.

| Glide                          | Region    | Primary nerve        | Secondary           |
| ------------------------------ | --------- | -------------------- | ------------------- |
| `median-glide-sequence`        | arm       | median               | -                   |
| `median-elbow-wrist-slider`    | arm       | median               | -                   |
| `ulnar-glide-hand-to-ear`      | arm       | ulnar                | -                   |
| `plexus-shoulder-slider`       | arm-neck  | brachial-plexus      | -                   |
| `brachial-plexus-sequence`     | arm-neck  | brachial-plexus      | median              |
| `median-gentle-slider`         | arm-neck  | median               | -                   |
| `median-slider`                | arm-neck  | median               | brachial-plexus     |
| `median-tensioner`             | arm-neck  | median               | brachial-plexus     |
| `ulnar-glide-sequence`         | arm-neck  | ulnar                | brachial-plexus     |
| `ulnar-slider`                 | arm-neck  | ulnar                | brachial-plexus     |
| `ulnar-tensioner`              | arm-neck  | ulnar                | brachial-plexus     |
| `radial-glide-sequence`        | arm-neck  | radial               | brachial-plexus     |
| `radial-slider`                | arm-neck  | radial               | -                   |
| `femoral-slider-prone`         | leg       | femoral              | -                   |
| `femoral-slider-side-lying`    | leg       | femoral              | lfcn                |
| `tibial-slider-seated`         | leg       | tibial               | sciatic             |
| `tibial-tensioner-strap`       | leg       | tibial               | sciatic             |
| `fibular-slider-seated`        | leg       | fibular              | sciatic             |
| `fibular-tensioner-supine`     | leg       | fibular              | sciatic             |
| `sural-slider-seated`          | leg       | sural                | tibial, sciatic     |
| `slump-tensioner`              | leg-spine | neural-axis, sciatic | tibial              |
| `sciatic-slider-seated`        | leg-spine | sciatic              | neural-axis         |
| `sciatic-slider-supine`        | leg-spine | sciatic              | tibial, neural-axis |
| `sciatic-slider-standing`      | leg-spine | sciatic              | neural-axis         |
| `sciatic-tensioner-supine`     | leg-spine | sciatic              | tibial, neural-axis |
| `femoral-tensioner-side-lying` | leg-spine | femoral              | lfcn, neural-axis   |

---
name: motion-qa
description: How to render still frames and contact sheets of a stretch, nerve glide or Motion Lab clip and judge whether it looks natural, then run the automated physics and form checks. Use after any change to an exercise, a pose, the rig or the solvers. Never record video.
---

# Motion QA: stills, sheets and numbers

We verify motion with **rendered still frames** and automated checks. Never record video and never
regenerate MP4s (`render:motion`, `render:guides`, the Record button are off limits for QA).

## 1. Automated first

```bash
npm run check:physics -- --only <id>[,<id>]   # floating, sinking, balance, sliding, pops, hold shimmer, reach
npm run check:form -- --only <id>             # 75 joint angles inside normal ranges
npm run check:studio                          # continuity (< 0.82 rad per 60 Hz frame), mirrors, geometry, physics
```

The first failure line names the time in seconds; look at stills at that time.

## 2. Contact sheets

```bash
npm run stills:guides -- --output $TMPDIR/sheets --only deep-squat-hold --angles Side,Front \
  --times 0,1.7,3.2 --width 330 --height 300 --figure human
```

- `--figure` is `anatomy` (default), `bones`, `human` or `pair`. Use `human` to judge silhouette and
  grips, `bones` to judge joints, `anatomy` to judge what the guide highlights.
- `--angles` accepts Teaching, Side, Front, Back, Overhead; list several to stack rows.
- `--times` picks seconds. Beats are 1.7 s apart (1.25 s when a guide has more than four beats), a
  hold adds 1.5 s, the return 1.8 s; print `scores[id].frames` if unsure. Always include **one
  frame mid-transition** (between two beats), not only the beats: that is where floating, pops and
  limb crossings hide.
- Output goes to the scratchpad, never into the repo. Open the `.jpg` with the image reader.
- A local browser is required (Chrome; set `CHROME_PATH` if needed). The first sheet takes a minute.

## 3. What to look for (stop at the first "no")

| Question                  | Looks wrong when                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Is it supported?          | gap between body and floor shadow, shadow far below, a seat with hips in the air, a foot sunk in the floor                                 |
| Would it fall over?       | weight outside the feet with no hands or seat to catch it                                                                                  |
| Are joints human?         | wrist bent back more than ~80, fingers curling backwards, knee bending forwards, elbow past straight, shoulder blade not following the arm |
| Is the pose the exercise? | wrong leg in front, wrong knee angle for the named position, spine rounded when the text says long                                         |
| Are limbs crossing?       | forearm through thigh, hand through hip, shin through the other shin                                                                       |
| Is the motion natural?    | stop-start linear ramps, a limb popping between frames, jitter during a hold                                                               |
| Does it match both sides? | right side is a clean mirror of the left (`both` guides change roles instead)                                                              |

Check the **Front** and **Overhead** views for leg azimuths (90/90, pigeon, straddle) and the
**Side** view for heights, depth and spine curve. A pose that is right from the side can still have
the wrong leg in front.

## 4. Numbers that back up the picture

`npx tsx checks/check-physics.ts --only <id> --report out.json` records, per guide and side: lowest
point height, floating, penetration, atlas floating, centre-of-mass margin, foot slide, peak point
and joint acceleration, hold speed and hand reach. Before/after tables in a PR should quote these.

## 5. Report format

For each fixed case: before sheet, after sheet, the check lines before and after, and anything you
were unsure about anatomically. List exercises that still fail and why; do not hide them.

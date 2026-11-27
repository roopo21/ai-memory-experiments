# Motion studio

Every stretch and nerve-glide card has a **Preview movement in studio** button. It opens the atlas skeleton with the selected muscles or nerves highlighted. In Explore, **Motion studio** opens the movement picker. Select a clip and press **Play**, or enter its name under **Describe a movement**, such as “Seated sciatic slider with a human and skeleton from the side.” **Targets** shows the source bones and highlighted muscle or nerve surfaces. **Human** shows Clover. Both figures share the same side, timing and camera.

For a hand, foot or jaw detail, the Teaching camera frames the moving part. Front, Back, Side and Overhead show the whole body. The phase buttons take you to named positions, including the five finger shapes in the tendon-glide sequence.

## Record just the figure

1. Pick the movement, figure and working side. Select **Teaching**, **Side**, **Front**, **Back** or **Overhead**. Drag to orbit and scroll to zoom. **Frame** fits the entire movement.
2. For a screen recording, select **Clean view**. The stage fills the window and hides the controls and cursor. Home goes to the start, Space plays or pauses, and the arrow keys step by 1/30 second. Escape or a double-tap returns to the controls.
3. **Record one take** captures the canvas at normal speed from the first pose to the last. The browser downloads a silent MP4 or WebM according to its encoder. Escape cancels the take. Keep the tab visible while it records. Real-time recording depends on how quickly the laptop draws frames.
4. For two videos with exactly matching frames, use the offline renderer below. It waits for each frame and can render slower than playback. Keep the accompanying credits when sharing atlas footage.

## Author a movement

Choose **Custom movement** for a blank timeline, or choose a preset and **Edit a keyframe copy**. The copy includes the named phases and samples four poses per second, or eight for the ankle alphabet. It is editable joint animation. A copy retains the original target highlights, working side, prop and hand or foot anchors where authored. The anchors keep the planted limbs in place between keyframes.

Select a keyframe, pick a joint, and set its X, Y and Z rotations in degrees. **Add pose** duplicates the selected pose at the new time. Root position moves the pelvis in metres from its standing position. Positive X is the performer's left, Y is up and Z is forward. **Plant both feet** solves for ankles on the standing floor marks. Under **Hand and foot anchors**, lock a palm, sole or toe at the current pose. Attach a palm to the floor or a moving thigh, or edit its target coordinates in metres. Set **Lock from** and **Until** for a contact that exists during one part of the clip. The limb eases into and out of the lock over 0.15 seconds. A chair and a mat with a head pad are available under **Support prop**. Run **Check floor and foot locks** to locate unreachable foot marks or a joint crossing the floor. Inspect the result in side and front views to check for self-intersection.

The cue field accepts these commands. Each changes the pose at the given time. A new time starts with the preceding keyframe's pose.

```text
At 2s bend both elbows 85
At 2s bend left knee 60
At 2s rotate chest y 25
At 2s move root 0 -0.20 0
At 3s hold
At 4s return to start
```

The editor supports all 79 joints, 2–512 keyframes and clips up to 60 seconds. It interpolates rotations by quaternion along the shorter arc. For a full turn, add intermediate poses less than 180° apart. Choose a muscle or nerve group under **Highlight**. The project saves in this browser. **Download motion** saves a portable JSON file. Import a file to continue editing or render it on another machine. Making a keyframe copy saves the previous custom draft under **Previous draft**.

## Repeatable MP4 export

Install the project dependencies, a Chromium browser and FFmpeg. The command starts a temporary local server. Set `CHROME_PATH` if Chrome is installed in a nonstandard location. Choose a new output folder for each export.

```sh
npm run render:motion -- --clip push-up --figure both --output "$HOME/Movies/push-up-pair"
npm run render:motion -- --clip supine-hamstring --side right --angle Side --figure human --output "$HOME/Movies/hamstring-right"
npm run render:motion -- --project my-movement.motion.json --figure both --output "$HOME/Movies/custom-pair"
```

The default is 1280 × 720 at 30 fps. Use `--width 1920 --height 1080 --fps 30 --detail` for the full anatomy layer at 1080p. The renderer supports `anatomy`, `bones`, `human` and `both`. A pair includes separate videos, a side-by-side comparison, start/middle/end stills, credits and a JSON file with the motion revision, timing and settings. The output directory appears after every requested file has been written.

## How the human works

Clover is a 3D mesh made in this repository. The build script shapes her face, hair, hands, clothes and feet around the same joints that move the atlas. Her shirt ends above the elbows. Rounded elbows and knees overlap the neighbouring limb surfaces as they bend. The chin and lower edge of the mouth follow the jaw. You can see her toes curl, or the middle and end joints of her fingers fold while her knuckles stay straight. A deterministic timeline turns the joints and positions the props on every frame.

## Coverage and verification

The library includes all 163 stretches and 26 nerve glides. It also offers six other presets and an editable custom timeline. The coloured anatomy identifies the target groups in the selected guide. A translucent pass reveals targets behind bone. A screen-space outline keeps thin nerves readable in a whole-body shot. The demonstrations are educational illustrations awaiting clinical review. Short filmed holds illustrate position. The guide card contains the written duration and instructions.

- `npm run check:studio` compares guide IDs and phases, tests both sides of unilateral clips at 60 Hz, and checks seeking, editable copies, joint length, continuity, contact landmarks and project files.
- `npm run check:form` measures 75 anatomical angles (shoulder, girdle, elbow, forearm, wrist, every finger and thumb joint, hip, knee, ankle, toes, trunk, neck and jaw) on every guide at 30 Hz, both sides, and fails when any leaves its normal range. `-- --report out.json` writes each guide's extremes.
- `npm run stills:guides -- --output <folder> --only <ids>` renders labelled contact sheets from chosen angles (`--angles Side,Front`) and times (`--times 0,2`). It never records video.
- `npm run check:hands` checks wrist and finger limits, backward fingers, grip contact on bars, sticks, towels, straps and handles, and palm contact on the floor for all 189 guides. Add `--hand left` or `--hand right` to `stills:guides` for a close-up of one hand. Before and after hand stills are in `docs/reference/images/hands/`. See `.claude/skills/hand-grip-poses/SKILL.md`.
- `npm run check:studio:geometry` skins the actual human, preview bones and full-resolution bones with the visible target tissues at phase boundaries and midpoints throughout the authored library. The two bespoke guides and the push-up have additional support-patch tests.
- `npm run check:studio:surfaces` checks every vertex on those three contact fixtures at 60 Hz. Palms, toes, heels, the chair and the head and back pads use a 5 mm tolerance.
- `npm run check:studio:browser` drives the guide cards, authoring controls, capture, recorder and mobile layout. `npm run check:studio:library` renders the highlighted skeleton through every guide and checks for visibility and movement. `npm run check:studio:cards` opens the studio from each of the 189 guide cards and checks that returning restores the same instructions.

### Export the complete library

```sh
npm run render:guides -- --output "$HOME/Movies/Anatomy Explorer/Guide Library"
```

The export produces a silent 960 × 540, 24 fps atlas MP4 per guide, a representative still, an offline gallery, source credits and a per-clip verification report. The exporter verifies every video's dimensions and frame count with FFprobe. Choose a fresh output folder to keep an earlier edition. For higher resolution or separately framed figures, use the single-clip exporter above.

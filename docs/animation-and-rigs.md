# Animation and rigs: a beginner's lesson

This lesson teaches the basic ideas behind making 3D things move. Then it shows how this project already uses them, and how they can power the next features. No maths is needed to follow along.

## Part 1. The basic ideas

### 1.1 Animation is a fast flipbook

A flipbook shows one drawing after another so quickly that your eye sees movement. A computer does the same thing. It draws the whole scene, changes a few numbers, and draws it again. Each drawing is a **frame**. Smooth motion needs about 30 to 60 frames every second, written as **fps**.

So animation is just this: **change some numbers a little, every frame.**

### 1.2 The three numbers every object has

Every 3D object carries three settings, together called its **transform**:

| Setting      | Plain meaning          | Example                     |
| ------------ | ---------------------- | --------------------------- |
| **Position** | Where it is            | 1 metre up, 10 cm forward   |
| **Rotation** | Which way it is turned | Tilted 30 degrees forward   |
| **Scale**    | How big it is          | 2% wider while breathing in |

Rotations are usually stored as a **quaternion**, a set of four numbers. You never need to read them. They exist because they blend smoothly and never get stuck, which simple angles sometimes do.

### 1.3 Families: parents and children

Objects can hold other objects, like a parent holding a child's hand. When the parent moves, the child comes along. Your hand is a child of your forearm, which is a child of your upper arm, which is a child of your chest. Turn the shoulder and the whole arm swings. This family tree is called a **hierarchy**.

### 1.4 Four ways to make things move

| Way                | How it works                                                      | Good for                                     |
| ------------------ | ----------------------------------------------------------------- | -------------------------------------------- |
| **Keyframes**      | You set a few key poses; the computer fills in the frames between | Hand-made animation, exercise poses          |
| **Procedural**     | A formula makes the motion, such as a wave for breathing          | Breathing, sway, loops, this project's moves |
| **Physics**        | Gravity and forces decide the motion                              | Falling, cloth, bouncing                     |
| **Motion capture** | Sensors or video record a real person moving                      | Natural human movement                       |

Filling in between keyframes is called **interpolation**. **Easing** makes it feel natural: a movement starts slowly, speeds up, then slows down before it stops, just like a real arm.

## Part 2. Rigs

### 2.1 What a rig is

A 3D body is only a shell of triangles. It cannot bend by itself. A **rig** is an invisible stick figure placed inside the shell, like the wire inside a bendy toy. Each stick is called a **bone**, and the place where two sticks meet is a **joint**. Move the stick figure, and the shell follows.

The pose the body was in when it was tied to the stick figure is called the **bind pose** or **rest pose**. Here, that is standing upright, exactly as the source anatomy is positioned.

### 2.2 Skinning: tying the shell to the bones

**Skinning** decides which bone each dot of the shell follows. Think of each dot holding strings to one or more bones:

- A dot in the middle of the thigh holds one string, to the thigh bone. It follows the thigh exactly.
- A dot near the knee holds two strings, maybe 60% thigh and 40% shin. When the knee bends, it moves partway with each, so the skin bends smoothly instead of tearing.

Those percentages are called **weights**, and each dot usually listens to at most four bones. Artists often "paint" weights with a brush in a program such as Blender.

Skinning has well-known problems. A twisted wrist can pinch flat like a candy wrapper, and a bent elbow can lose volume. Common fixes are extra twist bones, a smarter blending method called dual-quaternion skinning, or **corrective shapes** that switch on at certain angles.

### 2.3 Morph targets: a second way to change shape

Instead of bones, you can store a second version of the shape, such as a muscle bulging, and slide between the two with a dial from 0 to 1. These are called **morph targets** or **blend shapes**. They suit muscle bulges, breathing and faces, things that change shape rather than swing around a joint.

### 2.4 Forward and inverse kinematics

There are two ways to pose an arm:

- **Forward kinematics (FK).** Turn the shoulder, then the elbow, then the wrist, from the body outwards. Simple, but putting a hand exactly on a table this way takes trial and error.
- **Inverse kinematics (IK).** Say "put the hand here", and maths works out the shoulder and elbow angles for you. A **pole** says which way the elbow should point, so it does not flip backwards.

IK is how feet stay planted on the floor while the hips move.

### 2.5 Clips, mixers and blending

A **clip** is a recording of how joints move over time, like "walk" or "wave". A **mixer** plays clips, loops them, speeds them up, and **blends** them. A blend is a crossfade: for half a second, 50% walk and 50% run, so the change is smooth. The standard web file, glTF, can carry a rig, skin weights and clips together.

### 2.6 Retargeting

Motion recorded on one skeleton can be moved onto a different skeleton. This is called **retargeting**. It works when you can say which bone matches which, such as "their LeftUpLeg is our leftThigh", and then correct for different limb lengths.

## Part 3. How this project does it

The project already has a working rig. It lives in `src/motion/`.

**The core 20 bones, built in code.** `movementRig.ts` uses 20 main joints in metres: pelvis, lower back, mid back, chest, neck, head, two shoulders, two upper arms, two forearms, two hands, two thighs, two shins and two feet. The bones themselves are cheap, but surfaces are only tied to them the first time you press a movement, so normal browsing pays nothing extra.

The exercise rig extends those 20 with 59 joints for the jaw, fingers and toes. Clover and the source anatomy share all 79. A tendon glide can bend just the finger joints while the wrist stays steady. The [studio guide](reference/motion-studio.md) shows how to open and film any guide.

**Moves written as maths.** Each movement is a function of time. Ask "where is every joint 1.2 seconds into the cartwheel?" and it answers. There are no recorded clips and no clip files. The moves are the yoga backbend (a held full wheel), the moonwalk (a looping slide) and the cartwheel (3.7 seconds, then an upright landing).

**IK keeps hands and feet planted.** `solveLimb` is a two-bone IK solver with a pole. Bone lengths come from the bind pose, so limbs never stretch. A separate step shares a palm's turn between the wrist and forearm, so wrists do not twist unnaturally.

**Smooth changes between moves.** `advanceMovement` blends joint transforms, not the surface dots, from one move to the next. That keeps limbs rigid while they move.

**Every anatomy surface is skinned on the fly.** `skinAnatomyMesh` turns each surface into a skinned surface:

- Each bone of the skeleton follows exactly one joint, so it stays rigid like real bone.
- Muscles, organs and nerves get approximate weights from where they sit. The trunk uses smooth, continuous weights from hips to chest, and the shoulders blend between chest and arm.
- Clicking still works while the body moves, because the invisible laser follows the moved surfaces. `updateSkinBounds` keeps that fast.

**Small touches.** `LivingBody.tsx` makes the standing body breathe: a 5-second cycle that swells the body by a few percent, mostly front to back, plus a tiny sway. `MovementShadows.tsx` puts soft shadows under palms and soles. With the system's reduced-motion setting on, each move shows as a still pose instead.

**A robot checks the moves.** `npm run check:pose` confirms that hands and feet touch the floor where they should, the head clears the floor, bones never bend, and the body returns to its bind pose.

**Honest limits.** These are illustrative moves, not a biomechanics simulation. Muscles do not contract or bulge, nothing stops two surfaces from passing through each other, and the weights are approximate.

## Part 4. How to use this to build more

### 4.1 See a pose on the skeleton

Open **Supine hamstring stretch**, choose **Preview movement in studio**, then select **Straighten and hold**. The knee opens while the hands follow the back of the moving thigh. The other foot stays planted. Drag the timeline backward and the same joints retrace the same path.

Every stretch now has a demonstration. An author gives each movement a starting posture and names the positions it should pass through. The rig fills in the frames between them. Find the guide by its ID under `src/studio/choreography/`; the two original demonstration guides use the contact solvers in `src/motion/studio/sample.ts`.

### 4.2 See a nerve glide move

Open **Seated sciatic slider**. As the foot moves forward, the head lifts. As the knee bends again, the head nods. Both ends move on the same timeline. Other guides need more stages. In the median-nerve hand sequence, you can pause separately when the fingers open, the wrist extends, the thumb opens and the palm turns. Cyan marks the guide’s selected nerve.

### 4.3 A stretch meter

If we knew where each muscle attaches to bone, we could measure how much longer the muscle gets in a pose than in the bind pose, and colour it from "relaxed" to "well stretched". The rig already moves the bones. The missing piece is attachment data, which is part of milestone 7 in the roadmap.

### 4.4 Using professional animation

For richer moves, a standard humanoid rig can be built in Blender with bone names matching ours, given clips by hand or from motion capture, exported as glTF, and played with three.js's `AnimationMixer`. Free clip libraries and auto-riggers exist, but check each licence before shipping anything.

### 4.5 Help for the video pilot

The same rig can render every exercise from fixed cameras, always with the same body and the same lighting. Those frames, or just the stick-figure joint positions, could serve as reference input when testing video generation. That idea is worth trying inside the video pilot before spending on large runs.

### 4.6 Better-looking bending

If close-ups look wrong at the shoulders or spine, the usual upgrades are more spine bones, twist bones in the forearms, dual-quaternion skinning, and corrective shapes for extreme angles. Muscle bulge could use morph targets.

### 4.7 Keep it fast

Skinning costs work for every dot, every frame, though the graphics card does most of it. Keep the full-detail surfaces still unless needed, rig only what is visible, and measure frame time on a real phone before adding more.

## Little dictionary

| Word                   | Means                                                            |
| ---------------------- | ---------------------------------------------------------------- |
| Frame / fps            | One drawing / how many drawings per second                       |
| Transform              | Position, rotation and scale of an object                        |
| Quaternion             | Four numbers that store a rotation and blend smoothly            |
| Hierarchy              | Parents and children: move a parent and its children follow      |
| Keyframe               | A key pose at a moment in time; frames in between are filled in  |
| Interpolation / easing | Filling in between keyframes / making it start and stop gently   |
| Rig / bone / joint     | The invisible stick figure, its sticks, and where sticks meet    |
| Bind pose              | The pose the body was in when its skin was tied to the bones     |
| Skinning / weights     | Tying dots to bones / how much each bone pulls each dot          |
| Morph target           | A stored alternative shape you can slide towards                 |
| FK / IK                | Pose joint by joint / pose by saying where the hand or foot goes |
| Pole                   | The hint that tells IK which way the elbow or knee points        |
| Clip / mixer           | A recorded movement / the player that loops and blends clips     |
| Retargeting            | Moving an animation from one skeleton onto another               |

## Where to learn more

- three.js manual, the basics of 3D on the web: https://threejs.org/manual/#en/fundamentals
- three.js skinned meshes: https://threejs.org/docs/#api/en/objects/SkinnedMesh
- three.js animation mixer: https://threejs.org/docs/#api/en/animation/AnimationMixer
- glTF 2.0 specification, the skins and animations sections: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
- Blender manual, armatures (rigs): https://docs.blender.org/manual/en/latest/animation/armatures/index.html
- Blender manual, weight painting: https://docs.blender.org/manual/en/latest/sculpt_paint/weight_paint/index.html

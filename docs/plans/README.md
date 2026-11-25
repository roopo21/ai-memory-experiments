# Plans

Every plan for this project lives in this folder, one file per plan.

| Plan                     | Status        | What it covers                                                                     |
| ------------------------ | ------------- | ---------------------------------------------------------------------------------- |
| [roadmap.md](roadmap.md) | Active        | The master plan: milestones, performance budgets, coverage, review, female body    |
| [3d-rig.md](3d-rig.md)   | Local library | Exercise motion on the anatomy rig, a matched human view, authoring and validation |

## Plans not on `main` yet

Two related plans were written on the `gpu-research` branch and have not been merged. Move them here when that branch lands.

- `pose-visuals/PLAN.md` proposes a pose spec for each of the 189 exercises, shown live in the exercise card. It predates the skinned rig. The [3D rig PRD](3d-rig.md) picks up its authoring and validation work using the actual anatomy body for the pilot.
- `video-pilot/PILOT.md` describes a small pilot of 96 generated exercise clips before any large run.

## Adding a plan

1. Create `docs/plans/<topic>.md` with a short, plain name, such as `pose-visuals.md`.
2. Start it with the date, a status (Draft, Active, Done or Dropped) and one paragraph saying what it decides.
3. Add a row to the table above.
4. When a plan changes the overall direction, update [roadmap.md](roadmap.md) too.

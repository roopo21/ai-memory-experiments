# Plans

Every plan for this project lives in this folder, one file per plan.

| Plan                     | Status | What it covers                                                                  |
| ------------------------ | ------ | ------------------------------------------------------------------------------- |
| [roadmap.md](roadmap.md) | Active | The master plan: milestones, performance budgets, coverage, review, female body |

## Plans not on `main` yet

Two related plans were written on the `gpu-research` branch and have not been merged. Move them here when that branch lands.

- `pose-visuals/PLAN.md` proposes a pose spec for each of the 189 exercises, shown live in the exercise card. It was written against commit `835925a` and assumes the anatomy has no rig. `main` now has a 20-bone skinned rig in `src/motion/`, so revisit its mannequin decision first. See [../animation-and-rigs.md](../animation-and-rigs.md), part 4.
- `video-pilot/PILOT.md` describes a small pilot of 96 generated exercise clips before any large run.

## Adding a plan

1. Create `docs/plans/<topic>.md` with a short, plain name, such as `pose-visuals.md`.
2. Start it with the date, a status (Draft, Active, Done or Dropped) and one paragraph saying what it decides.
3. Add a row to the table above.
4. When a plan changes the overall direction, update [roadmap.md](roadmap.md) too.

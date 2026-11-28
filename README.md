# Anatomy Explorer

A see-through 3D human body in the browser, built from published anatomy data. Live at https://vrisha-anatomy.netlify.app.

- **Explore** 1,046 real skeletal, muscular and nervous system structures. Click any part for its name and facts.
- **Stretches:** pick muscles and get 163 stretches, with the target muscles lit up on the body.
- **Nerve glides:** pick nerves and get 26 nerve glides the same way.
- **Motion studio** plays every stretch and nerve glide on the same 79-joint skeleton and clothed character. Edit keyframes, highlight targets and record the stage. See the [motion studio guide](docs/reference/motion-studio.md).

The anatomy is the male body from BodyParts3D, with nerves from Z-Anatomy. It is an educational experiment, not a clinically reviewed atlas.

## Start here

| Read                                                     | For                                               |
| -------------------------------------------------------- | ------------------------------------------------- |
| [docs/master-guide.md](docs/master-guide.md)             | How everything works, in plain words              |
| [docs/animation-and-rigs.md](docs/animation-and-rigs.md) | How 3D bodies move, and how to build on our rig   |
| [docs/plans/](docs/plans/README.md)                      | What is planned, starting with the roadmap        |
| [AGENTS.md](AGENTS.md)                                   | Rules for AI coding agents working in this folder |

## Run it

Needs Node.js and npm. The models are included, so no anatomy download is needed.

```bash
npm ci
npm run dev           # local dev server
npm run check         # type-check, production build and all checks
npm run format:check
```

## Folders

```text
src/              the web app: anatomy, viewer, motion, guides, state, ui
asset-pipeline/   fetch, select and build steps that make the 3D models
checks/           automated checks run by npm run check
public/           served as is: models, Draco decoder, favicon
docs/             master guide, lessons, reference notes and plans
```

## Sources and licences

Geometry comes from BodyParts3D (CC BY-SA 2.1 Japan) and Z-Anatomy (CC BY-SA 4.0), with cranial nerve work from the University of Dundee (CC BY 4.0). Credits and every change we made are in [public/models/ATTRIBUTION.md](public/models/ATTRIBUTION.md), which the app links from its footer.

Motion checks compare guide animation with statistics derived from two open datasets: UI-PRMD (Open Data Commons PDDL v1.0, Vakanski et al. 2018) and AddBiomechanics (CC BY 4.0, Werling et al. 2024, https://addbiomechanics.org). No recording is stored in this repository. Licences, versions and credits are in [docs/reference/motion-reference/LICENSES.md](docs/reference/motion-reference/LICENSES.md).

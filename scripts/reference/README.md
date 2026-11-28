# Reference derivation

Turns two open motion datasets into the compact statistics that `npm run check:reference` uses.
Licences and what may be committed: [docs/reference/motion-reference/LICENSES.md](../../docs/reference/motion-reference/LICENSES.md).
What the numbers mean: [docs/reference/motion-reference/README.md](../../docs/reference/motion-reference/README.md).

```bash
npm run reference:derive               # download into .cache/, derive, write envelopes.json
sh scripts/reference/run.sh --no-fetch # derive from what is already cached
sh scripts/reference/run.sh --limit 2  # two subjects per source, a quick trial
sh scripts/reference/run.sh --only ui-prmd
npm run format                         # the JSON is formatted by Prettier like every other file
```

First run creates a virtualenv in `.cache/motion-reference/venv` (numpy, scipy, nimblephysics; see
`requirements.txt`), then downloads about 0.8 GB: the UI-PRMD archive (207 MB) and 19 AddBiomechanics
subject files read by byte range out of a 417 GB archive. The AddBiomechanics host serves about
1 MB/s, so allow 20 to 40 minutes. The run is resumable: finished files are kept and verified by
size and CRC-32.

**Nothing in `.cache/` is ever committed** (it is in `.gitignore`), and `envelopes.json` contains
only percentiles, ratios and counts across at least 5 subjects. Do not add a script that writes
trajectories anywhere in the repository.

| File             | Does                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `derive.py`      | The run: fetch, per-movement statistics, write the JSON. Movement definitions are at its top                 |
| `ui_prmd.py`     | UI-PRMD Vicon marker positions to joint angles in the app's convention                                       |
| `addbio.py`      | AddBiomechanics `.b3d` (OpenSim coordinates, joint centres) to the same angles                               |
| `common.py`      | Low-pass, derivatives, log dimensionless jerk, timing, coupling. Twin of `checks/check-reference-metrics.ts` |
| `fetch.py`       | Parallel byte-range download and single-member extraction from a remote zip                                  |
| `sources.json`   | Pinned archive URLs, UI-PRMD SHA-256, and AddBiomechanics member names, sizes and CRC-32                     |
| `pin_sources.py` | Rebuilds `sources.json` after a change of subjects (reads the archive's directory only)                      |

Changing the analysis: edit the estimator in `common.py` **and** `check-reference-metrics.ts`, run
`npm run check:reference` (its `selfTest` pins the two together), re-derive, and say in the PR
which numbers moved.

If the UI-PRMD origin is back, the script uses it first and checks the same SHA-256. If a download
fails the checksum, it stops; it never derives from a file it cannot verify.

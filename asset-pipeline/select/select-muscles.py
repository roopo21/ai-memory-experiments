"""Select non-overlapping terminal muscle structures from BodyParts3D 3.0."""
from collections import defaultdict
import csv
import json
from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parents[2]
INDEX = ROOT / "assets-src/indexes"
fetch = runpy.run_path(str(ROOT / "asset-pipeline/fetch/fetch-models.py"))["fetch"]
INDEX.mkdir(parents=True, exist_ok=True)
for filename in ["composite_parts.txt", "parts_list_e.txt"]:
    path = INDEX / filename
    if not path.exists():
        path.write_bytes(fetch(f"assets/BodyParts3D_data/{filename}"))

children = defaultdict(set)
names = {}
with (INDEX / "composite_parts.txt").open() as file:
    rows = csv.reader(file, delimiter="\t")
    next(rows)
    for parent, parent_name, child, child_name in rows:
        if parent != child:
            children[parent].add(child)
        names[parent] = parent_name
        names[child] = child_name
with (INDEX / "parts_list_e.txt").open() as file:
    rows = csv.reader(file, delimiter="\t")
    next(rows)
    for row in rows:
        if len(row) == 2:
            names[row[0]] = row[1]

# The composite table omits these subdivisions named in parts_list_e.
children.update({
    "FMA9628": {"FMA13377", "FMA13378"},
    "FMA38507": {"BP45", "BP47"},
    "FMA38508": {"BP44", "BP46"},
    "FMA77260": {"BP44", "BP45"},
    "FMA77261": {"BP46", "BP47"},
})


def leaves(node, path=()):
    if node in path:
        raise ValueError(f"Cycle in source hierarchy: {node}")
    if not children[node]:
        return {node}
    return set().union(*(leaves(child, (*path, node)) for child in children[node]))


regions = {
    "FMA71287": "Head",
    "FMA71290": "Neck",
    "FMA71291": "Back",
    "FMA9621": "Upper limbs",
    "FMA9622": "Lower limbs",
    "FMA71293": "Thorax",
    "FMA86917": "Abdomen and pelvis",
    "FMA71295": "Perineum",
}
region_ids = {region: leaves(region) for region in regions}
rows = [{
    "id": identifier,
    "name": names[identifier],
    "kind": "tendon" if "tendon" in names[identifier] else "muscle",
    "region": next(
        (name for region, name in regions.items() if identifier in region_ids[region]),
        "Other muscle structures",
    ),
} for identifier in sorted(leaves("FMA72954"))]
(ROOT / "asset-pipeline/data/muscles-selection.json").write_text(json.dumps(rows, indent=2) + "\n")
print(f"Selected {len(rows)} unique terminal structures")

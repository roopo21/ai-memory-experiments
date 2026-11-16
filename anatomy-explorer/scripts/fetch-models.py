"""Fetch pinned source meshes; fail rather than publish a partial source manifest."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import struct
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
COMMIT = "2c83c698788cff57f6317bddcf712e7acfbea7d8"
REPOSITORY = "Kevin-Mattheus-Moerman/BodyParts3D"


def fetch(relative_path):
    urls = [
        f"https://raw.githubusercontent.com/{REPOSITORY}/{COMMIT}/{relative_path}",
        f"https://cdn.jsdelivr.net/gh/{REPOSITORY}@{COMMIT}/{relative_path}",
        f"https://api.github.com/repos/{REPOSITORY}/contents/{relative_path}?ref={COMMIT}",
    ]
    errors = []
    for url in urls:
        try:
            request = urllib.request.Request(url, headers={"Accept": "application/vnd.github.raw+json"})
            with urllib.request.urlopen(request, timeout=30) as response:
                return response.read()
        except Exception as error:
            errors.append(str(error))
    raise RuntimeError(f"Unable to fetch {relative_path}: {'; '.join(errors)}")


def validate(data, identifier, expected):
    if len(data) <= 84:
        raise ValueError(f"Empty or invalid STL: {identifier}")
    triangles = struct.unpack_from("<I", data, 80)[0]
    if len(data) != 84 + 50 * triangles:
        raise ValueError(f"Invalid STL length: {identifier}")
    checksum = hashlib.sha256(data).hexdigest()
    if identifier in expected and checksum != expected[identifier]:
        raise ValueError(f"Checksum mismatch: {identifier}")
    return checksum, triangles


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--system", choices=["skeleton", "muscles"], required=True)
    system = parser.parse_args().system
    destination = ROOT / "assets-src" / system
    destination.mkdir(parents=True, exist_ok=True)
    shipped_manifest = ROOT / "public/models" / f"{system}-manifest.json"
    expected = {
        row["id"]: row["sha256"]
        for row in json.loads(shipped_manifest.read_text())["files"]
    } if shipped_manifest.exists() else {}
    selection = json.loads((ROOT / "scripts" / f"{system}-selection.json").read_text())

    def download(row):
        path = destination / f'{row["id"]}.stl'
        relative_path = f"assets/BodyParts3D_data/stl/{path.name}"
        data = path.read_bytes() if path.exists() else fetch(relative_path)
        try:
            checksum, triangles = validate(data, row["id"], expected)
        except ValueError:
            data = fetch(relative_path)
            checksum, triangles = validate(data, row["id"], expected)
        path.write_bytes(data)
        return {
            **row,
            "url": f"https://raw.githubusercontent.com/{REPOSITORY}/{COMMIT}/{relative_path}",
            "sha256": checksum,
            "triangles": triangles,
        }

    with ThreadPoolExecutor(max_workers=8) as pool:
        rows = list(pool.map(download, selection))
    # Source metadata is required too. Publish the manifest only after every fetch succeeds.
    for name in ["LICENSE_content", "README.md"]:
        (destination / name).write_bytes(fetch(name))
    temporary = destination / "manifest.json.tmp"
    temporary.write_text(json.dumps({"commit": COMMIT, "files": rows}, indent=2) + "\n")
    temporary.replace(destination / "manifest.json")
    print(f"Validated {len(rows)} STLs; {sum(row['triangles'] for row in rows):,} triangles")


if __name__ == "__main__":
    main()

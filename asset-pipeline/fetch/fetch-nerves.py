"""Fetch the pinned Z-Anatomy glTF export used for the peripheral nervous system layer.

The export comes from github.com/nqwrc/3d-anatomy (Draco-compressed GLB with the
Z-Anatomy structure name on every node). The skeletal file is fetched only to
derive the registration transform onto the BodyParts3D body; it is not shipped.
"""
import hashlib
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
REPOSITORY = "nqwrc/3d-anatomy"
COMMIT = "8ca3b7421bcfbe88b85859eb1983d5cf79f21749"
FILES = ["models/nervous.glb", "models/skeletal.glb", "models/License.txt"]


def fetch(relative_path):
    urls = [
        f"https://raw.githubusercontent.com/{REPOSITORY}/{COMMIT}/public/{relative_path}",
        f"https://cdn.jsdelivr.net/gh/{REPOSITORY}@{COMMIT}/public/{relative_path}",
    ]
    errors = []
    for url in urls:
        try:
            with urllib.request.urlopen(url, timeout=60) as response:
                return url, response.read()
        except Exception as error:
            errors.append(str(error))
    raise RuntimeError(f"Unable to fetch {relative_path}: {'; '.join(errors)}")


def main():
    destination = ROOT / "assets-src" / "nerves"
    destination.mkdir(parents=True, exist_ok=True)
    shipped = ROOT / "public/models/nerves-manifest.json"
    expected = (
        {row["path"]: row["sha256"] for row in json.loads(shipped.read_text())["sourceFiles"]}
        if shipped.exists()
        else {}
    )
    rows = []
    for relative_path in FILES:
        path = destination / Path(relative_path).name
        url = f"https://raw.githubusercontent.com/{REPOSITORY}/{COMMIT}/public/{relative_path}"
        data = path.read_bytes() if path.exists() else None
        if data is None or (relative_path in expected and hashlib.sha256(data).hexdigest() != expected[relative_path]):
            url, data = fetch(relative_path)
        checksum = hashlib.sha256(data).hexdigest()
        if relative_path in expected and checksum != expected[relative_path]:
            raise ValueError(f"Checksum mismatch: {relative_path}")
        if relative_path.endswith(".glb") and data[:4] != b"glTF":
            raise ValueError(f"Not a GLB: {relative_path}")
        path.write_bytes(data)
        rows.append({"path": relative_path, "url": url, "sha256": checksum, "bytes": len(data)})
        print(f"{relative_path}: {len(data):,} bytes {checksum[:12]}")
    temporary = destination / "manifest.json.tmp"
    temporary.write_text(
        json.dumps({"repository": REPOSITORY, "commit": COMMIT, "files": rows}, indent=2) + "\n"
    )
    temporary.replace(destination / "manifest.json")


if __name__ == "__main__":
    main()

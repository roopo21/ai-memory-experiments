"""Download pinned source STLs; cache validated files and record their SHA-256 hashes."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib, json, struct, urllib.request, time
ROOT=Path(__file__).resolve().parents[1]
COMMIT='2c83c698788cff57f6317bddcf712e7acfbea7d8'
BASE=f'https://cdn.jsdelivr.net/gh/Kevin-Mattheus-Moerman/BodyParts3D@{COMMIT}/'
DEST=ROOT/'assets-src/skeleton'
DEST.mkdir(parents=True,exist_ok=True)
expected_path=ROOT/'public/models/skeleton-manifest.json'
expected={r['id']:r['sha256'] for r in json.loads(expected_path.read_text())['files']} if expected_path.exists() else {}
selection=json.loads((ROOT/'scripts/skeleton-selection.json').read_text())
def download(row):
    path=DEST/(row['id']+'.stl'); url=BASE+'assets/BodyParts3D_data/stl/'+path.name
    for attempt in range(3):
        try:
            data=path.read_bytes() if path.exists() and attempt == 0 else urllib.request.urlopen(urllib.request.Request(url if attempt == 0 else (f'https://api.github.com/repos/Kevin-Mattheus-Moerman/BodyParts3D/contents/assets/BodyParts3D_data/stl/{path.name}?ref={COMMIT}' if attempt == 1 else f'https://raw.githubusercontent.com/Kevin-Mattheus-Moerman/BodyParts3D/{COMMIT}/assets/BodyParts3D_data/stl/{path.name}'), headers={'Accept':'application/vnd.github.raw+json'}),timeout=30).read()
            assert len(data)>84 and len(data)==84+50*struct.unpack('<I',data[80:84])[0], f'Invalid STL: {path}'
            checksum=hashlib.sha256(data).hexdigest()
            assert row['id'] not in expected or checksum == expected[row['id']], f'Checksum mismatch: {path}'
            path.write_bytes(data)
            print(row['id'], flush=True)
            return {**row,'url':f'https://raw.githubusercontent.com/Kevin-Mattheus-Moerman/BodyParts3D/{COMMIT}/assets/BodyParts3D_data/stl/{path.name}','sha256':hashlib.sha256(data).hexdigest(),'triangles':struct.unpack('<I',data[80:84])[0]}
        except Exception as error:
            print(row["id"], str(error), flush=True)
            if attempt==2: return {**row, "error": str(error)}
            time.sleep(1)
with ThreadPoolExecutor(max_workers=12) as pool: rows=list(pool.map(download,selection))
assert not any('error' in r for r in rows), [r for r in rows if 'error' in r]
(DEST/'manifest.json').write_text(json.dumps({'commit':COMMIT,'files':rows},indent=2)+'\n')
for f in ['LICENSE_content','README.md']:
    url=f'https://api.github.com/repos/Kevin-Mattheus-Moerman/BodyParts3D/contents/{f}?ref={COMMIT}'
    (DEST/f).write_bytes(urllib.request.urlopen(urllib.request.Request(url,headers={'Accept':'application/vnd.github.raw+json'}),timeout=30).read())
print(f'Downloaded and validated {len(rows)} STLs; {sum(r["triangles"] for r in rows):,} triangles')

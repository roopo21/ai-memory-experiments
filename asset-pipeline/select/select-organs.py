"""Select terminal source anatomy for the BodyParts3D nervous system layer."""
from pathlib import Path
from collections import defaultdict
import csv,json
root=Path(__file__).resolve().parents[2]
children=defaultdict(set);names={}
with (root/'assets-src/indexes/composite_parts.txt').open() as f:
 for a,b,c,d in list(csv.reader(f,delimiter='\t'))[1:]:
  if a!=c:children[a].add(c)
  names[a]=b;names[c]=d
with (root/'assets-src/indexes/parts_list_e.txt').open() as f:
 for row in list(csv.reader(f,delimiter='\t'))[1:]:
  if len(row)==2:names[row[0]]=row[1]
def leaves(n,path=()):
 if n in path:raise ValueError(n)
 return set().union(*(leaves(c,(*path,n)) for c in children[n])) if children[n] else {n}
children['FMA9704']={'FMA15571','FMA15572'}
available=set(json.loads((root/'asset-pipeline/data/source-mesh-ids.json').read_text()))
existing={s['meshName'] for file in ['skeleton','muscles'] for s in json.loads((root/f'src/anatomy/generated/{file}.json').read_text())['structures']}
ids = leaves('FMA7157') | leaves('FMA7647')
rows = [
    {'id': i, 'name': names[i], 'kind': 'source structure', 'region': 'Nervous', 'systems': ['nervous']}
    for i in sorted((ids & available) - existing)
]
shared = {i: ['nervous'] for i in sorted(ids & available & existing)}
missing = {'nervous': [{'id': i, 'name': names[i]} for i in sorted(ids - available)]}
for name, data in [('selection', rows), ('shared', shared), ('unavailable', missing)]:
    (root / f'asset-pipeline/data/organs-{name}.json').write_text(json.dumps(data, indent=2) + '\n')
print(f'Selected {len(rows)} nervous structures.')

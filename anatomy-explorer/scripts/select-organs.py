"""Select terminal source anatomy for the five additional system layers."""
from pathlib import Path
from collections import defaultdict
import csv,json
root=Path(__file__).resolve().parents[1]
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
available=set(json.loads((root/'scripts/source-mesh-ids.json').read_text()))
roots={'cardiovascular':'FMA7161','respiratory':'FMA7158','digestive':'FMA7152','urinary':'FMA7159','nervous':'FMA7157'}
existing={s['meshName'] for file in ['skeleton','muscles'] for s in json.loads((root/f'src/data/{file}.json').read_text())['structures']}
rows={};shared={};missing={}
for system,node in roots.items():
 ids=leaves(node)
 if system=='urinary':ids |= leaves('FMA15900') | leaves('FMA19667')
 if system=='nervous':ids |= leaves('FMA7647')
 if system=='cardiovascular':
  for ident,name in names.items():
   if any(word in name for word in ['artery','arteries','vein','vena cava']):ids |= leaves(ident)
 missing[system]=[{"id":i,"name":names[i]} for i in sorted(ids-available)]
 ids &= available
 print(system,len(ids))
 for i in sorted(ids):
  if i in existing:shared.setdefault(i,[]).append(system);continue
  if i in rows:rows[i]['systems'].append(system);continue
  rows[i]={'id':i,'name':names[i],'kind':'source structure','region':system.capitalize(),'systems':[system]}
(root/'scripts/organs-selection.json').write_text(json.dumps(list(rows.values()),indent=2)+'\n')
(root/'scripts/organs-shared.json').write_text(json.dumps(shared,indent=2)+'\n')
print('New',len(rows),'Existing shared',shared)

(root/'scripts/organs-unavailable.json').write_text(json.dumps(missing,indent=2)+'\n')

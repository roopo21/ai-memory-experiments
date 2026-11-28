"""Rebuild sources.json: the exact archive members and checksums the derivation uses.

    python3 scripts/reference/pin_sources.py

Run only to change the selection. It reads the central directory of the 417 GB AddBiomechanics
archive with range requests (a few MB) and records, for each chosen subject file, its size and
CRC-32, so a later fetch can prove it got the same bytes. The UI-PRMD archive checksum is the
SHA-256 of the Wayback Machine copy dated 2025-04-25 of the file the dataset page publishes.
"""

import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
import fetch

URL = 'http://archive.simtk.org/addbiomechanics/addbiomechanics.zip'
# group -> (folder pattern, why). All With_Arm so shoulder and elbow coordinates exist.
# Subject lists keep the download near 0.7 GB; the archive serves about 1 MB/s. Every movement
# still has at least five subjects, the minimum the derivation accepts.
GROUPS = {
    'Uhlrich2023': (
        r'^test/With_Arm/Uhlrich2023_Formatted_With_Arm/([^/]+)/[^/]+\.b3d$',
        {'subject2', 'subject3', 'subject4', 'subject6', 'subject9', 'subject10'},
    ),
    'Falisse2017': (
        r'^(?:train|test)/With_Arm/Falisse2017_Formatted_With_Arm/([^/]+)/[^/]+\.b3d$',
        {'subject_0', 'subject_1', 'subject_3', 'subject_4', 'subject_5', 'subject_6', 'subject_8'},
    ),
    'Hamner2013': (
        r'^(?:train|test)/With_Arm/Hammer2013_Formatted_With_Arm/([^/]+)/[^/]+\.b3d$',
        {'subject01', 'subject02', 'subject03', 'subject04', 'subject08', 'subject10'},
    ),
}


def main():
    z = fetch.RemoteZip(URL)
    members = []
    for group, (rx, subjects) in GROUPS.items():
        for name, i in sorted(z.info.items()):
            m = re.match(rx, name)
            if m and m.group(1) in subjects:
                members.append({'group': group, 'subject': name.split('/')[-2], 'name': name,
                                'size': i.file_size, 'crc32': i.CRC})
    path = os.path.join(os.path.dirname(__file__), 'sources.json')
    base = json.load(open(path)) if os.path.exists(path) else {}
    base.setdefault('addbiomechanics', {})['archive'] = {'url': URL, 'bytes': z.zip.fp.raw.size}
    base['addbiomechanics']['members'] = members
    json.dump(base, open(path, 'w'), indent=1)
    print(len(members), 'members pinned')


if __name__ == '__main__':
    main()

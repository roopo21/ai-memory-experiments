"""Download helpers for the reference-motion derivation.

Everything lands in the git-ignored cache (.cache/motion-reference). Nothing here is committed.

* `ranged_get` fetches a byte range with several parallel connections, because the archive hosts
  are slow per connection.
* `RemoteZip` reads the central directory of a very large remote zip with a few range requests and
  extracts single members, so the 417 GB AddBiomechanics archive never has to be downloaded whole.
"""

import concurrent.futures as cf
import io
import struct
import time
import urllib.request
import zipfile
import zlib

UA = 'anatomy-explorer-reference-derivation/1 (+https://github.com/roopo21/anatomy-explorer)'
CHUNK = 4 << 20


def _open(url, headers=None, method='GET', timeout=120):
    req = urllib.request.Request(url, headers={'User-Agent': UA, **(headers or {})}, method=method)
    return urllib.request.urlopen(req, timeout=timeout)


def head(url):
    r = _open(url, method='HEAD', timeout=60)
    return int(r.headers['Content-Length']), r.headers.get('Accept-Ranges', '') == 'bytes'


def _range(url, start, end, tries=6):
    for attempt in range(tries):
        try:
            d = _open(url, {'Range': f'bytes={start}-{end}'}).read()
            if len(d) == end - start + 1:
                return d
        except Exception:
            pass
        time.sleep(2 * (attempt + 1))
    raise IOError(f'range {start}-{end} of {url} failed')


def ranged_get(url, start, length, workers=8):
    """Bytes [start, start+length) of `url`, fetched in parallel chunks."""
    spans = [(o, min(o + CHUNK, start + length) - 1) for o in range(start, start + length, CHUNK)]
    with cf.ThreadPoolExecutor(workers) as pool:
        return b''.join(pool.map(lambda s: _range(url, *s), spans))


class _Remote(io.RawIOBase):
    def __init__(self, url):
        self.url, self.pos = url, 0
        self.size, ranges = head(url)
        assert ranges, 'server does not support byte ranges'

    def seekable(self):
        return True

    def readable(self):
        return True

    def tell(self):
        return self.pos

    def seek(self, offset, whence=0):
        self.pos = offset if whence == 0 else self.pos + offset if whence == 1 else self.size + offset
        return self.pos

    def readinto(self, buf):
        n = min(len(buf), self.size - self.pos)
        if n <= 0:
            return 0
        buf[:n] = _range(self.url, self.pos, self.pos + n - 1)
        self.pos += n
        return n


class RemoteZip:
    def __init__(self, url):
        self.url = url
        self.zip = zipfile.ZipFile(io.BufferedReader(_Remote(url), buffer_size=1 << 20))
        self.info = {i.filename: i for i in self.zip.infolist()}

    def extract(self, name, dest):
        """Fetch one deflated or stored member in parallel and write it to `dest`."""
        i = self.info[name]
        head_bytes = ranged_get(self.url, i.header_offset, 30 + 1024, workers=1)
        n, m = struct.unpack('<HH', head_bytes[26:30])
        data = ranged_get(self.url, i.header_offset + 30 + n + m, i.compress_size)
        raw = zlib.decompress(data, -15) if i.compress_type == zipfile.ZIP_DEFLATED else data
        if zlib.crc32(raw) != i.CRC:
            raise IOError(f'CRC mismatch for {name}')
        with open(dest, 'wb') as f:
            f.write(raw)
        return i

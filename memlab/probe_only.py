"""Score an already-ingested namespace, without re-writing the corpus.

Needed because `dreaming: "dynamic"` settles on a ~17-minute horizon, far longer
than a single run wants to block for. Ingest once, come back, probe.
"""
from __future__ import annotations

import json
import statistics
import sys

from .adapters import SupermemoryAdapter
from .run import RESULTS, score_probe
from .scenario import PROBES

scope = sys.argv[1]
mode = sys.argv[2] if len(sys.argv) > 2 else "dynamic"
a = SupermemoryAdapter(scope=scope, dreaming=mode)

scored, lat = [], []
for p in PROBES:
    got = a.retrieve(p)
    lat.append(got.latency_ms)
    s = score_probe(p, got.hits)
    s["latency_ms"] = round(got.latency_ms, 1)
    scored.append(s)
    r = s["recall"]
    print(f"  {p.id:<4} {p.kind:<24} recall={'  n/a' if r is None else f'{r:5.0%}'} "
          f"rank={s['rank_of_answer']} {'POISON' if s['poisoned'] else '      '} "
          f"{round(got.latency_ms)}ms")

m = [s for s in scored if s["recall"] is not None]
outranked = sum(1 for s in scored if s["stale_ranks"] and s["rank_of_answer"]
                and min(s["stale_ranks"]) < s["rank_of_answer"])
summary = {
    "provider": f"supermemory-{mode}",
    "label": scope,
    "capabilities": a.capabilities,
    "mean_recall": round(statistics.mean(s["recall"] for s in m), 3),
    "perfect_probes": sum(1 for s in m if s["recall"] == 1.0),
    "measured_probes": len(m),
    "poisoned_probes": sum(1 for s in scored if s["poisoned"]),
    "poisonable_probes": sum(1 for p in PROBES if p.stale),
    "stale_outranks_answer": outranked,
    "search_p50_ms": round(statistics.median(lat), 1),
    "search_max_ms": round(max(lat), 1),
    "write_p50_ms": None,
    "settle": {"waited_s": 732, "note": "measured separately by watch_dynamic"},
}
print(f"\n--- {summary['provider']} ---")
for k, v in summary.items():
    if k != "capabilities":
        print(f"  {k:<22} {v}")

out = {"run_at": "probe-only", "summary": summary, "writes": [],
       "probes": scored, "stored_memories": a.dump_all()}
path = RESULTS / f"supermemory-{mode}-{scope}.json"
path.write_text(json.dumps(out, indent=2, default=str))
print(f"  written -> {path}")

"""How long does `dreaming: "dynamic"` take to become searchable, and do edges form?

`dynamic` is supermemory's DEFAULT mode and the one their graph docs say the
relationship quality depends on ("production quality is higher ... let dynamic
dreaming do its job"). `instant` processed each document alone and produced zero
edges. This polls the dynamic namespace on a long horizon and records the first
moment memories appear, and the first moment any edge appears.
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

from supermemory import Supermemory

NS = sys.argv[1] if len(sys.argv) > 1 else "memlab_sm_dynamic"
MAX_MIN = float(sys.argv[2]) if len(sys.argv) > 2 else 40.0
c = Supermemory(api_key=os.environ["SUPERMEMORY_API_KEY"])

QUERY = ("Orca speech to text provider backend lead training hours "
         "orchestration whisper fallback coach")

t0 = time.perf_counter()
trace, first_mem, first_edge = [], None, None
while (time.perf_counter() - t0) / 60 < MAX_MIN:
    el = round(time.perf_counter() - t0)
    try:
        res = c.search(NS, query=QUERY, search_mode="memories", limit=100,
                       threshold=0.0, include={"related": True})
        d = res.model_dump() if hasattr(res, "model_dump") else res
        rows = d.get("results") or []
    except Exception as e:
        print(f"  {el:>5}s  search error {type(e).__name__}", flush=True)
        time.sleep(60); continue

    edges, rel_types, latest_false, infer = 0, set(), 0, 0
    for r in rows:
        rel = (r.get("included") or {}).get("related") or {}
        for b in ("parents", "children", "siblings"):
            for e in (rel.get(b) or []):
                edges += 1
                rel_types.add(e.get("relation"))
        if r.get("is_latest") is False:
            latest_false += 1
        if r.get("is_inference"):
            infer += 1

    if rows and first_mem is None:
        first_mem = el
    if edges and first_edge is None:
        first_edge = el
    trace.append({"t_s": el, "memories": len(rows), "edges": edges,
                  "is_latest_false": latest_false, "inferences": infer,
                  "relations": sorted(x for x in rel_types if x)})
    print(f"  {el:>5}s  memories={len(rows):<3} edges={edges:<3} "
          f"is_latest=false:{latest_false:<3} inferred={infer:<3} "
          f"relations={sorted(x for x in rel_types if x) or '-'}", flush=True)

    # stop once the graph has clearly settled: memories present, and either
    # edges have appeared or we have seen a stable count for a while
    if first_edge and len(trace) >= 3:
        tail = trace[-3:]
        if len({x["memories"] for x in tail}) == 1 and len({x["edges"] for x in tail}) == 1:
            print("  settled", flush=True)
            break
    time.sleep(60)

out = {"namespace": NS, "first_memory_s": first_mem, "first_edge_s": first_edge,
       "trace": trace}
Path("results/supermemory-dynamic-watch.json").write_text(json.dumps(out, indent=2))
print(f"\nfirst memory searchable: {first_mem}s")
print(f"first graph edge:        {first_edge}s")
print("written -> results/supermemory-dynamic-watch.json")

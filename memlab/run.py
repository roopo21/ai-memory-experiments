"""Run the timeline through one or more providers and score retrieval.

Two numbers carry the decision:

  recall      did the current, correct fact come back at all (and how high)?
  poison      did a superseded fact come back alongside it?

Poison is the one most benchmarks skip and the one that actually costs you in
production: an agent handed both "Deepgram" and "AssemblyAI" will hedge, or pick
wrong, and you will not be able to tell why.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import statistics
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from .adapters import Mem0Adapter, SupermemoryAdapter
from .scenario import PROBES, TIMELINE, Probe

RESULTS = Path(__file__).resolve().parent.parent / "results"


def _hit(pattern: str, text: str) -> bool:
    return re.search(pattern, text, re.I) is not None


def score_probe(probe: Probe, hits) -> dict:
    texts = [h.text or "" for h in hits]
    blob = "\n".join(texts)

    groups_hit = [any(_hit(p, blob) for p in grp) for grp in probe.expect]
    recall = (sum(groups_hit) / len(probe.expect)) if probe.expect else None

    # rank (1-indexed) of the first hit satisfying every expect-group it can
    rank = None
    for i, t in enumerate(texts, 1):
        if probe.expect and all(any(_hit(p, t) for p in grp) for grp in probe.expect):
            rank = i
            break
    if rank is None and probe.expect:
        for i, t in enumerate(texts, 1):
            if any(any(_hit(p, t) for p in grp) for grp in probe.expect):
                rank = i
                break

    stale_found = [s for s in probe.stale if _hit(s, blob)]
    stale_ranks = [
        i for i, t in enumerate(texts, 1) if any(_hit(s, t) for s in probe.stale)
    ]

    return {
        "probe": probe.id,
        "kind": probe.kind,
        "query": probe.query,
        "n_hits": len(hits),
        "recall": recall,
        "groups_hit": groups_hit,
        "rank_of_answer": rank,
        "poisoned": bool(stale_found),
        "stale_terms": stale_found,
        "stale_ranks": stale_ranks,
        # for a cold negative, "good" means returning nothing
        "cold_noise": len(hits) if probe.kind == "cold-negative" else None,
        "hits": [
            {"rank": i, "text": h.text, "score": h.score,
             "created_at": h.created_at, "extras": h.extras}
            for i, h in enumerate(hits, 1)
        ],
    }


def run(adapter, label: str) -> dict:
    print(f"\n=== {label} :: ingesting {len(TIMELINE)} events ===", flush=True)
    writes = []
    for ev in TIMELINE:
        w = adapter.ingest(ev)
        w.pop("raw", None)
        writes.append(w)
        print(f"  {ev.id} {ev.date}  {round(w['latency_ms'])}ms", flush=True)

    print(f"--- settling (polling until indexed) ---", flush=True)
    settle = adapter.settle() or {}
    print(f"  settled: {settle}", flush=True)

    print(f"=== {label} :: {len(PROBES)} probes ===", flush=True)
    scored, lat = [], []
    for p in PROBES:
        got = adapter.retrieve(p)
        lat.append(got.latency_ms)
        s = score_probe(p, got.hits)
        s["latency_ms"] = round(got.latency_ms, 1)
        scored.append(s)
        flag = "POISON" if s["poisoned"] else "     "
        r = s["recall"]
        rs = "  n/a" if r is None else f"{r:5.0%}"
        print(f"  {p.id:<4} {p.kind:<24} recall={rs} rank={s['rank_of_answer']} "
              f"{flag} {round(got.latency_ms)}ms", flush=True)

    measured = [s for s in scored if s["recall"] is not None]
    summary = {
        "provider": adapter.name,
        "label": label,
        "capabilities": adapter.capabilities,
        "mean_recall": round(statistics.mean(s["recall"] for s in measured), 3),
        "perfect_probes": sum(1 for s in measured if s["recall"] == 1.0),
        "measured_probes": len(measured),
        "poisoned_probes": sum(1 for s in scored if s["poisoned"]),
        "poisonable_probes": sum(1 for p in PROBES if p.stale),
        "search_p50_ms": round(statistics.median(lat), 1),
        "search_max_ms": round(max(lat), 1),
        "write_p50_ms": round(statistics.median(w["latency_ms"] for w in writes), 1),
    }

    summary["settle"] = settle
    out = {
        "run_at": datetime.now(timezone.utc).isoformat(),
        "summary": summary,
        "writes": writes,
        "probes": scored,
        "stored_memories": adapter.dump_all(),
    }
    RESULTS.mkdir(exist_ok=True)
    path = RESULTS / f"{adapter.name}-{label}.json"
    path.write_text(json.dumps(out, indent=2, default=str))
    print(f"\n--- summary ({label}) ---")
    for k, v in summary.items():
        if k != "capabilities":
            print(f"  {k:<20} {v}")
    print(f"  written -> {path}")
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("provider", choices=["mem0", "supermemory"])
    ap.add_argument("--dreaming", default="instant",
                    choices=["instant", "dynamic"],
                    help="supermemory only: processing mode")
    ap.add_argument("--scope", default=None, help="user_id / namespace to use")
    ap.add_argument("--keep", action="store_true", help="don't delete after the run")
    a = ap.parse_args()

    scope = a.scope or f"memlab_{int(time.time())}"
    if a.provider == "supermemory":
        adapter = SupermemoryAdapter(scope=scope, dreaming=a.dreaming)
    else:
        adapter = Mem0Adapter(scope=scope)
    try:
        run(adapter, scope)
    finally:
        if not a.keep:
            adapter.teardown()
            print(f"  torn down scope {scope}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

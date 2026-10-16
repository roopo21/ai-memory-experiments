"""Ablation: do mem0's documented temporal controls actually fix co-retrieval?

Baseline poisoning was 6/6. The platform advertises `latest_only`,
`reference_date`, `expiration_date` and `show_expired`. This checks each one
against the same probes instead of taking the docs at their word.
"""
from __future__ import annotations

import json
import os
import re
import statistics
import sys
from pathlib import Path

from mem0 import MemoryClient
from .scenario import PROBES

SCOPE = sys.argv[1] if len(sys.argv) > 1 else "memlab_run2"
client = MemoryClient(api_key=os.environ["MEM0_API_KEY"])


def search(q, **kw):
    res = client.search(q, filters={"user_id": SCOPE}, top_k=10, threshold=0.0, **kw)
    rows = res if isinstance(res, list) else res.get("results", [])
    return rows or []


def grade(probe, rows):
    texts = [r.get("memory", "") or "" for r in rows]
    blob = "\n".join(texts)
    hit = (all(any(re.search(p, blob, re.I) for p in g) for g in probe.expect)
           if probe.expect else None)
    stale_ranks = [i for i, t in enumerate(texts, 1)
                   if any(re.search(s, t, re.I) for s in probe.stale)]
    good_ranks = [i for i, t in enumerate(texts, 1)
                  if probe.expect and all(any(re.search(p, t, re.I) for p in g)
                                          for g in probe.expect)]
    return {
        "recall": hit,
        "stale_ranks": stale_ranks,
        "answer_rank": good_ranks[0] if good_ranks else None,
        # the number that matters: did a dead fact outrank the live one?
        "stale_outranks_answer": bool(
            stale_ranks and good_ranks and min(stale_ranks) < min(good_ranks)
        ),
        "n": len(rows),
    }


ARMS = {
    "baseline":          {},
    "latest_only":       {"latest_only": True},
    "rerank":            {"rerank": True},
    "latest_only+rerank": {"latest_only": True, "rerank": True},
    "keyword_search":    {"keyword_search": True},
}

print(f"scope = {SCOPE}\n")
table, entity_signal = {}, []
for arm, kw in ARMS.items():
    rows_out = []
    for p in PROBES:
        extra = dict(kw)
        if p.reference_date:
            extra["reference_date"] = p.reference_date
        try:
            rows = search(p.query, **extra)
        except Exception as e:
            print(f"  {arm:<20} {p.id} ERROR {type(e).__name__}: {str(e)[:120]}")
            rows = []
        for r in rows:
            sb = r.get("score_breakdown") or {}
            if "entity" in sb:
                entity_signal.append(sb["entity"])
        g = grade(p, rows)
        g["probe"] = p.id
        g["kind"] = p.kind
        rows_out.append(g)
    measured = [r for r in rows_out if r["recall"] is not None]
    table[arm] = {
        "recall": f"{sum(1 for r in measured if r['recall'])}/{len(measured)}",
        "poisoned": sum(1 for r in rows_out if r["stale_ranks"]),
        "stale_outranks": sum(1 for r in rows_out if r["stale_outranks_answer"]),
        "detail": rows_out,
    }
    t = table[arm]
    print(f"  {arm:<20} recall={t['recall']}  poisoned={t['poisoned']}/6  "
          f"stale_outranks_answer={t['stale_outranks']}")

print("\n--- reference_date A/B on P6 (July training volume) ---")
p6 = next(p for p in PROBES if p.id == "P6")
for lbl, kw in [("no reference_date", {}),
                ("reference_date=2026-07-20", {"reference_date": p6.reference_date})]:
    rows = search(p6.query, **kw)
    print(f"  {lbl}")
    for i, r in enumerate(rows[:5], 1):
        print(f"    {i} {r.get('score'):.3f} [{(r.get('created_at') or '')[:10]}] "
              f"{(r.get('memory') or '')[:88]}")

print("\n--- expiry: did expiration_date survive extraction? (E07 -> 2026-08-31) ---")
allrows = client.get_all(filters={"user_id": SCOPE}, page_size=100)
allrows = allrows if isinstance(allrows, list) else allrows.get("results", [])
sixes = [r for r in allrows if re.search(r"\b6\b|six", r.get("memory", ""), re.I)]
for r in sixes:
    print(f"  expiration_date={r.get('expiration_date')!r:<14} "
          f"created={(r.get('created_at') or '')[:10]} {r.get('memory')[:90]}")
print(f"  memories carrying ANY expiration_date: "
      f"{sum(1 for r in allrows if r.get('expiration_date'))}/{len(allrows)}")

print("\n--- graph signal: distribution of score_breakdown.entity ---")
if entity_signal:
    nz = [e for e in entity_signal if e and e > 0]
    print(f"  samples={len(entity_signal)}  nonzero={len(nz)}  "
          f"max={max(entity_signal):.4f}  mean={statistics.mean(entity_signal):.4f}")
else:
    print("  no entity component returned")

Path("results/mem0-ablation.json").write_text(json.dumps(table, indent=2, default=str))
print("\nwritten -> results/mem0-ablation.json")

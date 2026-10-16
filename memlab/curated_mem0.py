"""Does mem0 behave if YOU own the extraction?

The baseline run let mem0's extractor decide what to store, and poisoning was
6/6. This arm writes one pre-distilled fact per event with `infer=False`, sets a
real `expiration_date` on the self-limiting one, and explicitly deletes the
facts that later statements supersede — i.e. ordinary write hygiene that a
caller can implement.

If this fixes poisoning, the honest framing is that these products are worth
buying as a *retrieval index*, not as an *extraction pipeline*.
"""
from __future__ import annotations

import json
import os
import re
import statistics
import sys
import time

from mem0 import MemoryClient

from .adapters import epoch, wait_until_indexed
from .scenario import PROBES

SCOPE = "memlab_curated"
c = MemoryClient(api_key=os.environ["MEM0_API_KEY"])

# one atomic fact per statement; `supersedes` names the fact this one kills
FACTS = [
    ("2026-01-10", "Orca is a voice AI agent for field sales teams.", None, None),
    ("2026-01-10", "Orca uses LiveKit for transport.", None, None),
    ("2026-01-10", "Orca uses Deepgram for speech-to-text.", None, "stt"),
    ("2026-01-10", "Orca uses Cartesia for text-to-speech.", None, None),
    ("2026-02-02", "Orca stores all data in Supabase Postgres.", None, None),
    ("2026-02-02", "Pavan leads backend engineering on Orca.", None, "backend_lead"),
    ("2026-03-15", "Orca uses AssemblyAI for speech-to-text.", None, "stt"),
    ("2026-04-20", "Roopo is training for Ironman 70.3 Goa in November 2026.", None, None),
    ("2026-04-20", "Roopo's triathlon coach is Nikhil.", None, None),
    ("2026-04-20", "Roopo trains 12 hours a week.", None, "volume"),
    ("2026-05-30", "Orca uses Pipecat for agent orchestration.", None, None),
    ("2026-05-30", "Orca uses LiveKit only as the WebRTC transport layer.", None, None),
    ("2026-06-18", "Shreya leads backend engineering on Orca.", None, "backend_lead"),
    ("2026-07-07", "Roopo trains 6 hours a week during the fundraise.",
     "2026-08-31", "volume"),
    ("2026-08-25", "Roopo trains 12 hours a week.", None, "volume"),
    ("2026-09-12", "Orca uses Claude Opus for codegen and agent work.", None, "llm"),
    ("2026-10-05", "Orca's ASR falls back to Whisper for offline mode.", None, None),
    ("2026-10-05", "Shreya built Orca's offline Whisper ASR fallback.", None, None),
]

try:
    c.delete_all(user_id=SCOPE)
except Exception:
    pass

live: dict[str, str] = {}   # slot -> memory_id of the currently-true fact
killed = 0
print(f"writing {len(FACTS)} curated facts (infer=False)\n")
for date, text, expires, slot in FACTS:
    kw = {"timestamp": epoch(date), "infer": False}
    if expires:
        kw["expiration_date"] = expires
    res = c.add(messages=[{"role": "user", "content": text}], user_id=SCOPE, **kw)
    # supersede: retire the previous occupant of this slot
    if slot and slot in live:
        try:
            c.delete(live[slot])
            killed += 1
        except Exception as e:
            print(f"   delete failed: {type(e).__name__}")
    if slot:
        ids = res.get("results") or res.get("memories") or []
        mid = (ids[0] or {}).get("id") if ids and isinstance(ids[0], dict) else None
        if mid:
            live[slot] = mid
    print(f"  {date}  {'EXP ' + expires if expires else '    '}  {text[:62]}")

print(f"\nsuperseded (deleted) {killed} facts")


def canary(tok):
    try:
        res = c.search("offline whisper fallback", filters={"user_id": SCOPE},
                       top_k=20, threshold=0.0)
        rows = res if isinstance(res, list) else res.get("results", [])
        return any(tok.lower() in (r.get("memory") or "").lower() for r in rows or [])
    except Exception:
        return False


def count():
    r = c.get_all(filters={"user_id": SCOPE}, page_size=100)
    r = r if isinstance(r, list) else r.get("results", [])
    return len(r)


print()
s = wait_until_indexed(count, canary, "Whisper", label=" [curated]", max_wait=300)
print(f"settled: {s}\n")

results, lat = [], []
for p in PROBES:
    kw = {"filters": {"user_id": SCOPE}, "top_k": 10, "threshold": 0.0,
          "rerank": True}
    if p.reference_date:
        kw["reference_date"] = p.reference_date
    t0 = time.perf_counter()
    res = c.search(p.query, **kw)
    lat.append((time.perf_counter() - t0) * 1000)
    rows = res if isinstance(res, list) else res.get("results", [])
    texts = [r.get("memory", "") or "" for r in rows or []]
    blob = "\n".join(texts)
    recall = (all(any(re.search(x, blob, re.I) for x in g) for g in p.expect)
              if p.expect else None)
    stale = [i for i, t in enumerate(texts, 1)
             if any(re.search(x, t, re.I) for x in p.stale)]
    good = [i for i, t in enumerate(texts, 1)
            if p.expect and all(any(re.search(x, t, re.I) for x in g) for g in p.expect)]
    results.append({
        "probe": p.id, "kind": p.kind, "recall": recall, "n_hits": len(texts),
        "stale_ranks": stale, "answer_rank": good[0] if good else None,
        "outranked": bool(stale and good and min(stale) < min(good)),
        "hits": texts[:6],
    })
    flag = "POISON" if stale else "      "
    print(f"  {p.id:<4} {p.kind:<24} recall={'n/a' if recall is None else str(recall):<5} "
          f"rank={good[0] if good else None} {flag}")

m = [r for r in results if r["recall"] is not None]
summary = {
    "arm": "mem0 curated (infer=False + expiry + explicit supersede)",
    "recall": f"{sum(1 for r in m if r['recall'])}/{len(m)}",
    "poisoned": sum(1 for r in results if r["stale_ranks"]),
    "poisonable": sum(1 for p in PROBES if p.stale),
    "stale_outranks": sum(1 for r in results if r["outranked"]),
    "stored": count(),
    "search_p50_ms": round(statistics.median(lat), 1),
}
print(f"\n--- {summary['arm']} ---")
for k, v in summary.items():
    print(f"  {k:<18} {v}")

allrows = c.get_all(filters={"user_id": SCOPE}, page_size=100)
allrows = allrows if isinstance(allrows, list) else allrows.get("results", [])
print(f"\n  memories carrying an expiry: "
      f"{sum(1 for r in allrows if r.get('expiration_date'))}/{len(allrows)}")
print("  stale entities still present: " + ", ".join(sorted({
    e for r in allrows for e in ("Deepgram", "Pavan", "GPT")
    if e.lower() in (r.get("memory") or "").lower()
})) or "  none")

open("results/mem0-curated.json", "w").write(
    json.dumps({"summary": summary, "probes": results}, indent=2, default=str))
print("\nwritten -> results/mem0-curated.json")

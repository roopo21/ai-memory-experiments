"""Cross-provider comparison, plus the graph-specific questions mem0 can't answer.

Run after the per-provider runs. Reads results/*.json and prints the table that
the adoption decision actually turns on.
"""
from __future__ import annotations

import collections
import glob
import json
from pathlib import Path

RESULTS = Path(__file__).resolve().parent.parent / "results"


def load() -> list[dict]:
    out = []
    for f in sorted(glob.glob(str(RESULTS / "*.json"))):
        if any(x in f for x in ("ablation", "comparison", "curated")):
            continue
        d = json.load(open(f))
        if "summary" in d:
            d["_file"] = Path(f).name
            out.append(d)
    return out


def headline(runs: list[dict]) -> None:
    print("\n## Headline\n")
    hdr = (f"{'provider / mode':<26} {'recall':>8} {'poisoned':>9} {'stale>live':>11} "
           f"{'w→read':>8} {'search p50':>11}")
    print(hdr)
    print("-" * len(hdr))
    for r in runs:
        s = r["summary"]
        outranked = sum(
            1 for p in r["probes"]
            if p["stale_ranks"] and p["rank_of_answer"]
            and min(p["stale_ranks"]) < p["rank_of_answer"]
        )
        settle = (s.get("settle") or {}).get("waited_s", "?")
        print(f"{s['provider']:<26} "
              f"{s['mean_recall']:>7.0%} "
              f"{s['poisoned_probes']}/{s['poisonable_probes']:>7} "
              f"{outranked:>11} "
              f"{str(settle) + 's':>8} "
              f"{str(s['search_p50_ms']) + 'ms':>11}")


def per_probe(runs: list[dict]) -> None:
    print("\n## Per-probe recall (✓ = live fact retrieved, ✗ = missed, P = poisoned)\n")
    names = [r["summary"]["provider"] for r in runs]
    print(f"{'probe':<8}{'kind':<26}" + "".join(f"{n[:16]:<18}" for n in names))
    ids = [p["probe"] for p in runs[0]["probes"]]
    for i, pid in enumerate(ids):
        row = f"{pid:<8}{runs[0]['probes'][i]['kind']:<26}"
        for r in runs:
            p = next((x for x in r["probes"] if x["probe"] == pid), None)
            if p is None:
                row += f"{'-':<18}"; continue
            if p["recall"] is None:
                cell = f"n/a({p['n_hits']} hits)"
            else:
                cell = "✓" if p["recall"] == 1.0 else ("~" if p["recall"] else "✗")
                cell += f" r{p['rank_of_answer']}" if p["rank_of_answer"] else ""
                if p["poisoned"]:
                    cell += " P"
            row += f"{cell:<18}"
        print(row)


def graph_report(runs: list[dict]) -> None:
    print("\n## Graph: did edges actually form?\n")
    for r in runs:
        s = r["summary"]
        if not s["capabilities"].get("graph_edges_readable"):
            # mem0: the only visible graph signal is score_breakdown.entity
            ent = [
                (h["extras"].get("score_breakdown") or {}).get("entity")
                for p in r["probes"] for h in p["hits"]
            ]
            ent = [e for e in ent if e is not None]
            nz = [e for e in ent if e > 0]
            print(f"  {s['provider']}: no readable edges (graph folded into score). "
                  f"entity component: {len(nz)}/{len(ent)} nonzero")
            continue
        buckets = collections.Counter()
        relations = collections.Counter()
        latest = collections.Counter()
        with_edges = 0
        seen = set()
        for p in r["probes"]:
            for h in p["hits"]:
                x = h["extras"]
                key = h["text"][:60]
                if key not in seen:
                    seen.add(key)
                    latest[x.get("is_latest")] += 1
                edges = x.get("edges") or []
                if edges:
                    with_edges += 1
                for e in edges:
                    buckets[e["bucket"]] += 1
                    relations[e.get("relation")] += 1
        print(f"  {s['provider']}:")
        print(f"    distinct memories seen     {len(seen)}")
        print(f"    is_latest distribution     {dict(latest)}")
        print(f"    hits carrying any edge     {with_edges}")
        print(f"    edge buckets               {dict(buckets) or '{} (none formed)'}")
        print(f"    relation types             {dict(relations) or '{} (none formed)'}")


def temporal_report(runs: list[dict]) -> None:
    print("\n## Temporal metadata actually stored\n")
    for r in runs:
        s = r["summary"]
        rows = r.get("stored_memories") or []
        exp = sum(1 for x in rows if x.get("expiration_date"))
        backdated = set()
        for p in r["probes"]:
            for h in p["hits"]:
                d = h["extras"].get("document_date") or (h.get("created_at") or "")[:10]
                if d:
                    backdated.add(d)
        print(f"  {s['provider']}:")
        print(f"    memories stored            {len(rows)}")
        print(f"    carrying an expiry         {exp}")
        print(f"    distinct fact dates seen   {len(backdated)} -> "
              f"{sorted(backdated)[:6]}{'...' if len(backdated) > 6 else ''}")
        caps = {k: v for k, v in s["capabilities"].items() if v}
        print(f"    capabilities present       {sorted(caps)}")


def curated_arm() -> None:
    f = RESULTS / "mem0-curated.json"
    if not f.exists():
        return
    d = json.load(open(f))
    s = d["summary"]
    print("\n## Control arm: mem0 with extraction turned off\n")
    print(f"  {s['arm']}")
    print(f"    recall             {s['recall']}")
    print(f"    poisoned           {s['poisoned']}/{s['poisonable']}")
    print(f"    stale outranks     {s['stale_outranks']}")
    print(f"    memories stored    {s['stored']}  (vs 18 when mem0 extracts)")
    print(f"    search p50         {s['search_p50_ms']}ms")
    miss = [p["probe"] for p in d["probes"] if p["recall"] is False]
    if miss:
        print(f"    probes lost        {miss}  <- history was deleted, not just hidden")


def main() -> None:
    runs = load()
    if not runs:
        print("no results yet"); return
    print(f"# Memory layer comparison  ({len(runs)} runs)")
    headline(runs)
    per_probe(runs)
    graph_report(runs)
    temporal_report(runs)
    curated_arm()
    (RESULTS / "comparison.json").write_text(json.dumps(
        [{"provider": r["summary"]["provider"], **r["summary"]} for r in runs],
        indent=2, default=str))
    print(f"\nwritten -> {RESULTS / 'comparison.json'}")


if __name__ == "__main__":
    main()

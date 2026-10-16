"""Thin adapters so both providers answer the same two questions:
write this statement as of this date, and retrieve for this query.

Everything provider-specific (graph exposure, temporal flags, polling) is kept
behind `capabilities` and `extras` so the scorer stays provider-agnostic.
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone

from .scenario import Event, Probe


def epoch(date: str) -> int:
    return int(datetime.fromisoformat(f"{date}T12:00:00+00:00").timestamp())



def wait_until_indexed(
    count_fn, canary_fn, canary: str, *, poll: float = 5.0, max_wait: float = 300.0,
    stable_polls: int = 3, label: str = "",
) -> dict:
    """Block until extraction AND indexing have converged.

    Both providers return from `add` before the memory is searchable, and on mem0
    the vector index lags even behind `get_all`. A fixed sleep silently truncates
    the corpus and quietly invalidates every score, so we poll two signals:
    the stored count going stable, and a canary token becoming retrievable.
    """
    t0 = time.perf_counter()
    last, stable, counts = -1, 0, []
    canary_ok = False
    while time.perf_counter() - t0 < max_wait:
        n = count_fn()
        counts.append(n)
        stable = stable + 1 if n == last else 0
        last = n
        canary_ok = canary_fn(canary)
        if stable >= stable_polls and canary_ok:
            break
        print(f"    settling{label}: stored={n} canary={'yes' if canary_ok else 'no'} "
              f"({round(time.perf_counter() - t0)}s)", flush=True)
        time.sleep(poll)
    return {"waited_s": round(time.perf_counter() - t0, 1), "stored": last,
            "canary_retrievable": canary_ok, "count_trace": counts}


@dataclass
class Hit:
    """One retrieved memory, normalised across providers."""
    text: str
    score: float | None = None
    created_at: str | None = None
    extras: dict = field(default_factory=dict)


@dataclass
class Retrieval:
    hits: list[Hit]
    latency_ms: float
    raw: object = None


class Adapter:
    name = "base"
    capabilities: dict[str, bool] = {}

    def ingest(self, event: Event) -> dict: ...
    def settle(self) -> dict: ...
    def retrieve(self, probe: Probe, k: int = 10) -> Retrieval: ...
    def dump_all(self) -> list[dict]: return []
    def teardown(self) -> None: ...


# --------------------------------------------------------------------------- #
# mem0 Platform
# --------------------------------------------------------------------------- #
class Mem0Adapter(Adapter):
    name = "mem0"
    capabilities = {
        "backdated_writes": True,     # add(timestamp=...)
        "explicit_expiry": True,      # add(expiration_date=...)
        "point_in_time_search": True, # search(reference_date=...)
        "latest_only": True,          # search(latest_only=True)
        "graph_edges_readable": False,# graph is folded into `score`, never exposed
        "per_memory_history": True,   # history(memory_id)
    }

    def __init__(self, scope: str, api_key: str | None = None):
        from mem0 import MemoryClient
        self.scope = scope
        self.client = MemoryClient(api_key=api_key or os.environ["MEM0_API_KEY"])

    def ingest(self, event: Event) -> dict:
        opts: dict = {"timestamp": epoch(event.date)}
        if event.expires:
            opts["expiration_date"] = event.expires
        t0 = time.perf_counter()
        res = self.client.add(
            messages=[{"role": "user", "content": event.text}],
            user_id=self.scope,
            **opts,
        )
        return {"event": event.id, "latency_ms": (time.perf_counter() - t0) * 1000,
                "raw": res}

    def settle(self) -> dict:
        def canary(tok: str) -> bool:
            try:
                res = self.client.search(
                    "offline ASR fallback", filters={"user_id": self.scope},
                    top_k=20, threshold=0.0,
                )
                rows = res if isinstance(res, list) else res.get("results", [])
                return any(tok.lower() in (r.get("memory", "") or "").lower()
                           for r in (rows or []))
            except Exception:
                return False

        return wait_until_indexed(
            lambda: len(self.dump_all()), canary, "Whisper", label=" [mem0]",
        )

    def retrieve(self, probe: Probe, k: int = 10) -> Retrieval:
        kwargs: dict = {"filters": {"user_id": self.scope}, "top_k": k, "threshold": 0.0}
        if probe.reference_date:
            kwargs["reference_date"] = probe.reference_date
        t0 = time.perf_counter()
        res = self.client.search(probe.query, **kwargs)
        dt = (time.perf_counter() - t0) * 1000
        rows = res if isinstance(res, list) else res.get("results", res)
        hits = [
            Hit(
                text=r.get("memory", ""),
                score=r.get("score"),
                created_at=r.get("created_at"),
                extras={kk: r.get(kk) for kk in
                        ("event_date", "expiration_date", "categories", "updated_at",
                         "score_breakdown")
                        if r.get(kk) is not None},
            )
            for r in (rows or [])
        ]
        return Retrieval(hits, dt, res)

    def dump_all(self) -> list[dict]:
        res = self.client.get_all(filters={"user_id": self.scope}, page_size=100)
        rows = res if isinstance(res, list) else res.get("results", [])
        return rows or []

    def teardown(self) -> None:
        try:
            self.client.delete_all(user_id=self.scope)
        except Exception:
            pass


# --------------------------------------------------------------------------- #
# supermemory v5
# --------------------------------------------------------------------------- #
class SupermemoryAdapter(Adapter):
    name = "supermemory"
    capabilities = {
        "backdated_writes": True,       # add(date=...) -> metadata.temporalContext
        "explicit_expiry": False,       # forgetting is inferred, not declared
        "point_in_time_search": False,  # no reference_date equivalent
        "latest_only": True,            # is_latest on every memory
        "graph_edges_readable": True,   # included.related{parents,children,siblings}
        "per_memory_history": True,     # version chain via parents
    }

    # the corpus's vocabulary, used as a broad sweep to approximate "list all"
    SWEEP = ("orca voice ai stack speech to text transport orchestration database "
             "backend lead people training triathlon coach race hours llm codegen")

    def __init__(self, scope: str, api_key: str | None = None,
                 dreaming: str = "instant"):
        from supermemory import Supermemory
        self.scope = scope
        self.dreaming = dreaming
        self.client = Supermemory(api_key=api_key or os.environ["SUPERMEMORY_API_KEY"])
        self.name = f"supermemory-{dreaming}"

    def ingest(self, event: Event) -> dict:
        t0 = time.perf_counter()
        res = self.client.add(
            self.scope,
            content=event.text,
            id=f"{self.scope}-{event.id}",
            date=f"{event.date}T12:00:00Z",
            dreaming=self.dreaming,
            metadata={"event_id": event.id},
        )
        return {"event": event.id, "latency_ms": (time.perf_counter() - t0) * 1000,
                "raw": res.model_dump() if hasattr(res, "model_dump") else str(res)}

    def _rows(self, query: str, k: int = 100, **kw) -> list[dict]:
        res = self.client.search(
            self.scope, query=query, search_mode="memories", limit=k,
            threshold=0.0, include={"related": True, "documents": True}, **kw
        )
        d = res.model_dump() if hasattr(res, "model_dump") else dict(res)
        return d.get("results") or []

    def settle(self) -> dict:
        def canary(tok: str) -> bool:
            try:
                return any(tok.lower() in (r.get("memory") or "").lower()
                           for r in self._rows("offline ASR fallback whisper", k=30))
            except Exception:
                return False

        # dynamic dreaming groups documents in the background and takes longer
        mx = 300.0 if self.dreaming == "instant" else 600.0
        return wait_until_indexed(
            lambda: len(self.dump_all()), canary, "Whisper",
            label=f" [{self.name}]", poll=8.0, max_wait=mx,
        )

    def retrieve(self, probe: Probe, k: int = 10) -> Retrieval:
        t0 = time.perf_counter()
        rows = self._rows(probe.query, k=k)
        dt = (time.perf_counter() - t0) * 1000
        hits = []
        for d in rows:
            md = d.get("metadata") or {}
            tc = md.get("temporalContext") or {}
            hits.append(Hit(
                text=d.get("memory") or d.get("chunk") or "",
                score=d.get("similarity"),
                created_at=(d.get("system") or {}).get("created_at"),
                extras={
                    "is_latest": d.get("is_latest"),
                    "is_inference": d.get("is_inference"),
                    "document_date": tc.get("documentDate"),
                    "event_date": tc.get("eventDate"),
                    "edges": _edges((d.get("included") or {}).get("related")),
                },
            ))
        return Retrieval(hits, dt, rows)

    def dump_all(self) -> list[dict]:
        try:
            return self._rows(self.SWEEP, k=100)
        except Exception:
            return []

    def teardown(self) -> None:
        try:
            self.client.namespaces.delete(self.scope)
        except Exception:
            pass


def _edges(rel) -> list[dict]:
    """v5 returns included.related as {parents, children, siblings}."""
    out: list[dict] = []
    if not isinstance(rel, dict):
        return out
    for bucket in ("parents", "children", "siblings"):
        for e in (rel.get(bucket) or []):
            e = e if isinstance(e, dict) else getattr(e, "__dict__", {})
            out.append({
                "bucket": bucket,
                "relation": e.get("relation"),
                "memory": (e.get("memory") or "")[:160],
                "version": e.get("version"),
                "is_latest": e.get("is_latest"),
            })
    return out

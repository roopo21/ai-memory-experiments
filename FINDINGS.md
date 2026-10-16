# Should you run a hosted memory layer across your agents?

Measured, not read off a landing page. Harness in `memlab/`, raw per-probe data
in `results/`.

**Short answer: not yet as a memory *brain*. Yes, eventually, as a retrieval
*index* — and the single place worth wiring it is your Orca hook layer, not any
individual agent.** Reasoning below.

---

## What was measured

10 dated statements over 10 months, backdated to the day each was said, with
planted supersessions, a role change, a partial update, an expiring fact, a
two-hop join, and one cold negative (`memlab/scenario.py`). Then 10 probes,
scored on two axes:

- **recall** — did the currently-true fact come back, and at what rank
- **poison** — did a *superseded* fact come back with it, and did it outrank the
  live one

Poison is the axis memory benchmarks skip and the one that costs you. An agent
handed both "Deepgram" and "AssemblyAI" with no signal about which is live will
hedge or guess, and the trace won't tell you why.

> **A measurement trap worth knowing about.** Both products return from `add`
> long before the memory is searchable, and on mem0 the vector index lags even
> behind `get_all`. The first run here scored 11% recall — which looks like a
> damning quality result and was actually a race: only 6 of 10 events had been
> extracted. `adapters.wait_until_indexed` now polls stored-count stability plus
> a canary fact before any probe runs. If you benchmark these yourself, this is
> the thing that will silently lie to you.

---

## Headline

| | recall | poisoned | stale outranks live | write→searchable | search p50 |
| --- | --- | --- | --- | --- | --- |
| mem0 Platform (defaults) | 9/9 | 6/6 | 4 | 108 s | 513 ms |
| supermemory, `instant` | 9/9 | 6/6 | 2 | 116 s | 573 ms |
| **supermemory, `dynamic`** (default) | **8/9** | **3/6** | **0** | **~17 min** | 597 ms |
| mem0, extraction off (control) | 8/9 | 2/6 | 0 | 20 s | 518 ms |

Read this as two groups. The fast paths (rows 1–2) retrieve the right fact
almost always and **never suppress the dead one** — 6/6 poisoned. The slow paths
(rows 3–4) cut poisoning by half or better and never let a stale fact outrank a
live one. The thing that buys correctness is *time*, or doing the extraction
yourself.

---

## mem0 Platform

### Retrieval is good. Reconciliation does not exist.

All 18 memories' history events are `ADD`. Zero `UPDATE`, zero `DELETE`. mem0 v3
is an **append-only extraction log**; contradictions accumulate:

```
[2026-02-02] Pavan is leading backend engineering for the Orca project
[2026-06-18] Pavan has left Orca
```

Both live, both retrievable, nothing marking the first as dead.

What partly rescues it: the extractor usually preserves the transition *inside
the prose* — "swapped speech-to-text **from Deepgram to** AssemblyAI", "reduced
training to 6 hours **effective until the end of August 2026**". The temporality
is in the text, not in metadata you can filter on. A competent model reading the
retrieved set can often work it out. That is a real mitigation, and it is also
why you cannot do this with a cheap model.

### The graph is not an interface, and did nothing

Graph memory was **removed from the OSS SDK** in v3 (~4k lines, all external
graph stores — Neo4j, Memgraph, Kuzu, AGE, Neptune) and is now Platform-only,
always-on, and **opaque**: the old `relations` array is gone, folded into a
single `score`. The only visible trace is `score_breakdown.entity`:

```
500 scored results on an entity-dense corpus → 0 nonzero. max 0.0000.
```

The two-hop probe passed, but on plain semantic similarity — one memory happened
to contain both halves. **There is no graph to traverse, inspect, or debug.** If
a graph interface is what you came for, mem0 no longer has one.

### Two documented temporal features that did not work

**`expiration_date` does not compose with extraction:**

| write mode | expiry persisted? |
| --- | --- |
| `infer=False` (raw) | **yes** — and correctly hidden once past |
| `infer=True` (default) | **no** — silently dropped |

0 of 18 memories in the main run carried an expiry despite one write setting it.

**`reference_date` had no effect.** Same query, with and without a July
reference date — identical scores to four decimals, identical order:

```
none                       0.430 / 0.427 / 0.358 ...
reference_date=2026-07-20  0.430 / 0.427 / 0.358 ...
```

No point-in-time querying observed.

### The one lever that works

| arm | recall | poisoned | stale outranks live |
| --- | --- | --- | --- |
| defaults | 9/9 | 6/6 | **4** |
| `keyword_search=True` | 9/9 | 6/6 | 4 |
| `latest_only=True` | 8/9 | 5/6 | 2 |
| `rerank=True` | 9/9 | 6/6 | **1** |
| `latest_only` + `rerank` | 8/9 | 5/6 | **0** |

`rerank=True` is **off by default** and is the difference between your agent
reading the dead fact first and the live one first. Turn it on. `latest_only`
helps ranking but costs recall.

---

## supermemory v5

### `instant` mode: no graph at all

22 memories, and:

```
is_latest     {True: 22}      ← including facts that were explicitly superseded
is_inference  {False: 22}
edges         none formed
relations     none formed
```

Every memory is flagged current, including "Orca uses Deepgram" *after* the
switch to AssemblyAI was ingested. And that stale fact **ranked #1, above its own
correction**.

A sharp detail: it was also one of only **2 of 22 memories that lost its
backdate** (`documentDate: null`). The fact that beat its own correction is
precisely the one with no temporal grounding to deprioritise it.

This is consistent with their own docs — `dreaming: "instant"` "processes the
document alone", and "production quality is higher when you keep a stable `id`
and let dynamic dreaming do its job". So instant is explicitly the degraded
path, and the measurements below confirm it: the graph is the whole product,
and `instant` has none of it. It is, however, the only path that gets you
searchable in ~2 minutes.

### `dynamic` mode: the temporal graph is real, and it works

`dynamic` is the default mode and the one their graph docs say the relationship
quality depends on. It is also slow enough that a naive benchmark will conclude
it is broken. Polling the namespace on a long horizon
(`memlab/watch_dynamic.py`):

```
   0s → 671s   memories=0   edges=0
        732s   memories=18  edges=7   relations=['extends','updates']
        854s   memories=18  edges=7   (settled)
```

Nothing for roughly twelve minutes, then the whole graph appears at once.
Measured from the ingest write, **first searchable memory at ~17 minutes**.

Once settled, it is the best-performing arm in this evaluation, and the only one
that resolved supersession on its own:

| | `instant` | `dynamic` |
| --- | --- | --- |
| recall | 9/9 | 8/9 |
| poisoned | 6/6 | **3/6** |
| stale outranks live | 2 | **0** |
| graph edges | **0** | **7** |

P1 (vendor swap), P2 (role change) and P7 (expired-then-reverted fact) were
poisoned in *every other arm* and come back clean here, with the live fact at
rank 1.

#### What the graph actually contains

```
"Orca now uses AssemblyAI for speech-to-text."            ← rank 1 for P1
  ↳ parents/updates:  "Orca uses Deepgram for speech-to-text."
  ↳ siblings/extends: "Orca's ASR is AssemblyAI with a Whisper fallback"
```

All seven edges are correct, including the harder cases:

| relation | child | parent |
| --- | --- | --- |
| `updates` | Orca now uses AssemblyAI | Orca uses Deepgram |
| `updates` | Shreya is now backend lead | Pavan leads backend |
| `updates` | Pavan has left Orca | Pavan leads backend |
| `updates` | training back to 12 h from September | training cut to 6 h until August |
| `updates` | training back to 12 h from September | base phase ~12 h per week |
| `extends` | AssemblyAI + Whisper fallback | Orca now uses AssemblyAI |

Two separate memories correctly supersede the same parent ("Shreya is lead" and
"Pavan has left" both update "Pavan leads backend"), and the reverted training
volume correctly supersedes *both* prior volume facts. It also distinguished
`extends` from `updates` — the Whisper fallback enriches the AssemblyAI fact
rather than replacing it, which is the nuance mem0 has no vocabulary for.

#### One mechanical detail worth knowing

Superseded parents are **not** flagged `is_latest: false` — every retrieved
memory had `is_latest: true`. Supersession is expressed by the *edge*, and the
dead parent simply stops being returned as a top-level hit; you only see it by
asking for `include: {related: true}`. So do not filter on `isLatest` and expect
it to mean "current" — it does not.

Note also what survived correctly: the vendor fact "Orca uses Deepgram" dropped
out of retrieval, but "Deepgram's word error rate on Indian English was
unacceptable" stayed. That is right — the second statement is still true. The
extractor separated a superseded *decision* from a still-valid *reason*, which
is a genuinely hard distinction.

### Where it is genuinely ahead of mem0

- **Ranking.** Live fact at rank 1 on 7/9 probes vs mem0's rank 2–3. Same
  poisoning count, materially better ordering — which is what the model actually
  reads first.
- **The graph fields are real and readable**: `included.related` →
  `{parents, children, siblings}` with `updates` / `extends` / `derives`
  relation types, plus `is_latest`, `is_inference`, and
  `metadata.temporalContext` (`documentDate` / `eventDate` /
  `temporalEventStartMs`). Empty on this corpus in instant mode, but it is an
  interface, which mem0 no longer offers.
- **A review queue for inferred facts.** `GET /v3/container-tags/{ns}/inferred`
  lists low-confidence derived memories; approve clears `isInference`, decline
  sets `isForgotten` and drops it from search. This is the only governance
  surface either product offers over "what did the extractor decide about me",
  and it matters more than any benchmark number.
- Self-hostable (one binary / Docker), namespace-scoped API keys, and
  `searchMode: "chunks"` for plain RAG over documents from the same store.

### Costs and risks

- **v3/v4 are deprecated — v5 only after 31 Dec 2026.** Migration is real work;
  there are nine separate migration guides. Budget for it.
- Defaults changed between v4 and v5 (`searchMode` memories→hybrid, `threshold`
  0.6→0.3), so any comparison you read online may not describe today's behaviour.
- `rewriteQuery` and `rerank` can each bill an extra operation.
- Search p50 573 ms but **max 3093 ms** on one probe — the tail is worse than
  mem0's.

---

## The control arm, and the actual conclusion

Same corpus, same probes, mem0 with **extraction turned off**: one pre-distilled
fact per statement (`infer=False`), a real `expiration_date` on the
self-limiting one, and an explicit `delete` of each fact a later statement
supersedes. Ordinary write hygiene any caller can implement.

| | defaults | extraction off |
| --- | --- | --- |
| poisoned | 6/6 | **2/6** |
| stale outranks live | 4 | **0** |
| write→searchable | 108 s | **20 s** |
| memories stored | 18 | 14 |
| Deepgram / Pavan / GPT still in store | yes | **gone** |

Poisoning roughly thirds, stale never beats live, and write-to-readable drops 5×
because you skipped the LLM extraction step entirely.

**So the value these products add is retrieval, not extraction.** Their
extractors are the component that created the problem their temporal features
then fail to solve.

### The tension nobody has solved

Note what the control arm *lost*: probe P6, "how many hours a week was I
training in July". Explicit supersession deleted that fact, so the history is
gone. You get exactly one of:

- **append-only** (both products' default): full history, poisoned retrieval
- **explicit supersede**: clean retrieval, no history

Neither gives you bi-temporal querying — valid-time separate from
transaction-time, so you can ask "what did I believe in July" *and* "what is true
now" against the same store. mem0's `reference_date` is the one feature that
advertises this, and it was a no-op. That is the actual gap in this product
category, and it's the thing you'd want if you care about temporal behaviour.

---

## Where this fits across your agents

Your setup, as it actually is: Orca orchestrating Claude Code **and** OpenCode
panes with `SessionStart` / `UserPromptSubmit` / `Stop` / `StopFailure` hooks;
Asana as declared single source of truth for tasks across five segments;
Supabase, Asana, Gmail, Calendar, Drive and Wispr Flow behind MCP; and an
incumbent memory of **10 markdown files across 4 project-scoped directories**.

### The one place it belongs: the Orca hook layer

Not inside any agent. You already have the seam every memory vendor's
integration guide wishes you had:

- **`UserPromptSubmit`** → `search(top_k=5, rerank=True)` → inject a short
  "known context" block. ~500 ms measured, comfortably inside your 10 s hook
  timeout. Make it fail-open — your OpenCode status plugin already has that
  instinct.
- **`Stop`** → write *curated* facts only, async, fire-and-forget. Never pipe raw
  transcripts in. 108 s write latency means this can never be synchronous, and
  per the control arm, letting their extractor loose is what causes poisoning.

One integration, and every pane of every agent shares one memory. That is the
leverage, and almost nobody else's setup has it.

Namespace by concern rather than by project — `roopo/preferences`,
`roopo/people`, `roopo/segments` — because the gap in your current setup is
precisely that `feedback` memories learned in one repo never reach OpenCode or
the next repo.

### Where it does not belong

- **Task state.** Asana is your SSOT and your three skills enforce it. A memory
  layer here creates a second truth that silently diverges.
- **Repo and code facts.** `CLAUDE.md` plus the repo are authoritative and
  version-controlled. Memory would drift from them with no diff to review.
- **Calendar, email, meetings.** Already behind connectors; Wispr Flow already
  does meeting search. Retrieving from source is fresher than a stale copy.
- **Anything needing read-after-write in-session.** 108 s / 116 s. A fact written
  this turn is not available next turn. This rules out the most intuitive use
  ("remember that for the rest of this session") outright.

### Why "not yet"

You have ~10 memory files. A hosted semantic index earns its keep when you have
hundreds of facts and can no longer just load them all — you are one to two
orders of magnitude below that. The real deficiency in your current setup isn't
retrieval quality, it's **reach**: project-scoped directories that don't cross
projects or agents. That is fixable with a shared directory and a symlink, not a
vendor, and it keeps the property that matters most at your volume — you can
read your entire memory by hand and audit what it believes.

Both products' extractors decide what is true about you, and a wrong extracted
fact silently poisons every agent downstream. At 10 files you'd notice. At 500
hosted memories you would not. If you do adopt, supermemory's inferred-memory
review queue is the only reason you'd catch it.

### What would change the answer

Adopt when any of these becomes true:

1. Memory volume passes roughly 100–200 facts, so loading everything stops working.
2. You want non-Claude agents (OpenCode, or something embedded in a product) reading the same memory — a shared file directory stops being enough once a non-filesystem consumer appears.
3. You want semantic recall over meeting/document history, which is a RAG problem — supermemory's `chunks` mode, not its memory graph.

### If you adopt one today

**supermemory on `dreaming: "dynamic"`** — the default. It is the only
configuration tested that resolves supersession by itself, exposes *why* it did
so as inspectable `updates` / `extends` edges, and never lets a stale fact
outrank a live one. That is the product working as advertised.

The price is a **~17-minute write-to-readable horizon**, which is not a
deal-breaker for the use case recommended above (durable cross-agent
preferences change on a scale of days, not seconds) and is disqualifying for
anything resembling session memory. Do not reach for `instant` to fix that —
it buys latency by discarding the graph entirely, and it was the worst arm
tested.

**With this write discipline, which the data demands:**

- You distil the facts. Never hand it a raw transcript.
- One atomic fact per write, with the date it became true.
- On supersede, explicitly delete or forget the old fact — and if you want
  history, keep your own append-only log. Git already does this for files.
- `rerank` on, always.
- Search is in the hot path (~500 ms); writes never are.

---

## Reproduce

```bash
cp .env.example .env && uv sync
uv run python -m memlab.run mem0 --scope run_mem0
uv run python -m memlab.run supermemory --scope run_sm --dreaming instant
uv run python -m memlab.ablate_mem0 run_mem0
uv run python -m memlab.curated_mem0
uv run python -m memlab.compare
```

# ai-memory-experiments

A small harness that answers one question with data instead of marketing copy:
**would a hosted memory layer earn a place across my agents, and where?**

Compares **mem0 Platform** and **supermemory v5** on the same corpus, scoring the
thing that actually breaks agents — not whether the right fact comes back, but
whether a *dead* fact comes back with it.

## The corpus

`memlab/scenario.py` — 10 dated statements spanning 10 months, with deliberately
planted structure:

| planted | events | what it tests |
| --- | --- | --- |
| supersession | E01 → E03 | vendor swapped; is the old one still live? |
| role change | E02 → E06 | an attribute moves from one person to another |
| partial update | E01 → E05 | a tool is *narrowed*, not dropped |
| expiring fact | E07 → E08 | a temporary change that later reverts |
| two-hop join | E06 + E10 | answer needs two memories combined |
| cold negative | — | never stated; does it invent an answer? |

Every write is **backdated** to the day the statement was made (`timestamp` on
mem0, `date` on supermemory), so the providers see a real timeline rather than
ten simultaneous writes.

## The two metrics

- **recall** — did the currently-true fact come back at all, and at what rank
- **poison** — did a superseded fact come back alongside it, and did it *outrank*
  the live one

Poison is the one most memory benchmarks skip. An agent handed both "Deepgram"
and "AssemblyAI" with no signal about which is live will hedge or guess, and you
won't be able to tell why from the trace.

## Run it

```bash
cp .env.example .env     # add keys; .env is gitignored
uv sync

uv run python -m memlab.run mem0        --scope run_mem0
uv run python -m memlab.run supermemory --scope run_sm_i --dreaming instant
uv run python -m memlab.run supermemory --scope run_sm_d --dreaming dynamic

uv run python -m memlab.ablate_mem0 run_mem0   # do mem0's temporal flags help?
uv run python -m memlab.compare                # the decision table
```

`--keep` skips teardown so you can poke at a namespace afterwards.

### Getting keys

- **mem0** needs no signup: `npm i -g @mem0/cli && mem0 init --agent --agent-caller <name>`
- **supermemory**: console.supermemory.ai → API Keys

## A note on measurement

Both providers return from `add` long before the memory is searchable, and on
mem0 the vector index lags even behind `get_all`. A fixed `sleep` silently
truncates the corpus and invalidates every score — the first run here scored 11%
recall for exactly that reason, which looked like a quality result and was
actually a race. `adapters.wait_until_indexed` now polls two independent
signals (stored count going stable, plus a canary fact becoming retrievable)
before any probe runs, and records how long it waited. That wait is itself one
of the more important numbers in the output.

## Findings

See `FINDINGS.md`. Raw per-probe data, including every retrieved hit and its
score breakdown, is in `results/`.

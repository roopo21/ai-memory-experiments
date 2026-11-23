#!/usr/bin/env python3
"""Cost per ACCEPTED 5 s / 720p video: self-host vs hosted API (v3, after peer A, peer B and reviewer B).

Evidence tags: F = read on a primary page/README; V = vendor/aggregator claim; I = inference; O = opinion/assumption.
Run:  python3 cost_model.py          -> writes 04-cost-model.md
Edit any number and re-run; the "rank stability" and "volume" tables are the FR7 mechanical test.

Changes vs v2 (reviewer B): per-option acceptance (O, to be replaced by blind rating), utilisation derived from
monthly volume instead of assumed, ops/engineer time added, break-even only vs the SAME model, API priced per clip
(billing minimums respected), GST excluded everywhere (claimable by a registered business) with an FX markup on
foreign-billed providers, distilled Wan A14B added, unverified-timing options flagged.
"""
import json
import math
import sys
from pathlib import Path

USD_INR = 93.0            # F: XE 92.95, open.er-api 93.37 on 2026-11-20
FX_MARKUP = 0.025         # O: card/forex markup on USD-billed foreign providers
GST = 0.0                 # O: excluded everywhere; set 0.18 to see the unclaimed-GST case (applies to all providers)
HOURS = 730
OPS_USD_MONTH = 215.0     # O: 10 h/month engineer time at ~Rs2,000/h; any self-host option pays this, APIs do not
MAX_UTIL_PER_BOX = 0.85   # O: queueing headroom before adding another box
VOLUMES = (500, 2000, 5000)   # accepted clips per month
BASE_V = 2000

# ---- Hosted API: USD per S1 clip (low, mid, high), `acc` = acceptance prior (O)
API = {
    "Wan 2.2 5B, fal.ai (hosted open)":          dict(clip=(0.15, 0.15, 0.15), acc=0.35, tag="F", same_as="Wan2.2 TI2V-5B",
        note="$0.15 per video <=5 s at 720p. Apache 2.0 weights, so portable"),
    "Wan 2.2 A14B, fal.ai (hosted open)":        dict(clip=(0.20, 0.40, 0.40), acc=0.55, tag="F", same_as="Wan2.2 A14B (full)",
        note="$0.08/s at 720p, $0.04/s at 480p. RISK: fal page says model removed 2027-01-04"),
    "LTX-2.3 Pro, fal.ai (hosted open, 1080p)":  dict(clip=(0.30, 0.35, 0.40), acc=0.50, tag="F", same_as="LTX-2.x",
        note="1080p only ($0.06-0.08/s, page conflicts); upper bound for S1"),
    "Hailuo 2.3, MiniMax (closed, 768p)":        dict(clip=(0.19, 0.28, 0.28), acc=0.80, tag="F/V", same_as=None,
        note="$0.28 per 6 s clip at 768p (billing minimum 6 s); low = Fast tier $0.19 (V). RISK: reportedly moved to legacy list"),
    "Runway Gen-4 Turbo (closed)":               dict(clip=(0.25, 0.25, 0.25), acc=0.70, tag="F", same_as=None,
        note="$0.05/s (5 credits/s at $0.01)"),
    "Kling 2.6 Pro via fal.ai (closed, silent)": dict(clip=(0.35, 0.35, 0.56), acc=0.80, tag="F", same_as=None,
        note="$0.07/s silent; high = Kling 3.0 Pro $0.112/s"),
    "Veo 3.1 Fast via fal.ai (closed, silent)":  dict(clip=(0.50, 0.50, 0.75), acc=0.85, tag="F", same_as=None,
        note="$0.10/s silent, $0.15/s with audio"),
    "Runway Gen-4.5 (closed)":                   dict(clip=(0.60, 0.60, 0.60), acc=0.85, tag="F", same_as=None,
        note="12 credits/s"),
    "Veo 3.1 Lite (closed) - UNVERIFIED":        dict(clip=(0.15, 0.20, 0.25), acc=0.80, tag="V", same_as=None, ranked=False,
        note="aggregator-only; Google pages unreadable; excluded"),
}

# ---- Self-host. gen_s = wall seconds for one S1 clip. dedicated=True -> rented by the month (always-on); else per-job.
SELF = [
    dict(name="Wan2.2 TI2V-5B, RTX 4090 (RunPod secure)", model="Wan2.2 TI2V-5B", price=(0.34, 0.89, 0.89), cur="usd", foreign=True,
         gen_s=(535, 535, 700), acc=0.35, ptag="F", gtag="F", dedicated=True,
         note="README 534.7 s on one 4090 with offload; Apache 2.0", licence="Apache 2.0", quality="lower-mid, silent (O)"),
    dict(name="Wan2.2 A14B full, default sampler, H100 PCIe (RunPod)", model="Wan2.2 A14B (full)", price=(1.99, 2.89, 2.89), cur="usd", foreign=True,
         gen_s=(1041, 1200, 1500), acc=0.55, ptag="F", gtag="F", dedicated=True,
         note="README 1041.5 s on H100/H800, 59.8 GB peak; PCIe assumed slower (O)", licence="Apache 2.0", quality="high, silent (O)"),
    dict(name="Wan2.2 A14B full, default sampler, H100 (E2E India)", model="Wan2.2 A14B (full)", price=(3.99, 3.99, 3.99), cur="usd", foreign=False,
         gen_s=(1000, 1041, 1250), acc=0.55, ptag="F", gtag="F", dedicated=True,
         note="E2E price table is USD, excl. tax", licence="Apache 2.0", quality="high, silent (O)"),
    dict(name="Wan2.2 A14B full, default sampler, H100 (Yotta India)", model="Wan2.2 A14B (full)", price=(428, 596, 596), cur="inr", foreign=False,
         gen_s=(1000, 1041, 1250), acc=0.55, ptag="F", gtag="F", dedicated=True,
         note="Rs596 1xH100 VM; Rs428 is 8x bare metal, term unknown", licence="Apache 2.0", quality="high, silent (O)"),
    dict(name="Wan2.2 A14B + Lightning 4-step, H100 PCIe (RunPod)", model="Wan2.2 A14B (distilled)", price=(1.99, 2.89, 2.89), cur="usd", foreign=True,
         gen_s=(80, 125, 200), acc=0.45, ptag="F", gtag="V", dedicated=True, unverified=True,
         note="UNVERIFIED: one JarvisLabs report 79 s on an H200 vs 643 s baseline (~8x); scaled to H100 PCIe (I). Quality drop unknown",
         licence="Apache 2.0 (LoRA licence to check)", quality="mid-high (O)"),
    dict(name="HunyuanVideo 1.5 distilled, RTX 4090 (RunPod secure)", model="HunyuanVideo 1.5", price=(0.34, 0.89, 0.89), cur="usd", foreign=True,
         gen_s=(190, 300, 500), acc=0.45, ptag="F", gtag="I", dedicated=True, unverified=True,
         note="UNVERIFIED at 720p: Tencent '75 s' is the 480p distilled model; scaled 2.5-6x (I)", licence="Tencent Community: no EU/UK/KR, 100M MAU",
         quality="mid, silent (O)"),
    dict(name="LTX-2.x, H100 (E2E India dedicated)", model="LTX-2.x", price=(3.99, 3.99, 3.99), cur="usd", foreign=False,
         gen_s=(58, 120, 300), acc=0.50, ptag="F", gtag="I", dedicated=True, unverified=True,
         note="UNVERIFIED: no primary timing exists; low = vendor '18x faster than Wan2.2-14B' on 1041 s", licence="LTX Community: <$10M revenue, keep watermark",
         quality="mid-high, native audio (O)"),
    dict(name="LTX-2.x, H100 (Modal serverless)", model="LTX-2.x", price=(3.95, 3.95, 3.95), cur="usd", foreign=True,
         gen_s=(58, 120, 300), acc=0.50, ptag="F", gtag="I", dedicated=False, overhead_s=60, unverified=True,
         note="UNVERIFIED time; per-second billing, 60 s cold start per job (O)", licence="LTX Community: <$10M revenue, keep watermark",
         quality="mid-high, native audio (O)"),
    dict(name="LTX-2.x fp8+offload, RTX 5090 (RunPod secure)", model="LTX-2.x", price=(0.69, 1.39, 1.39), cur="usd", foreign=True,
         gen_s=(120, 300, 700), acc=0.50, ptag="F", gtag="I", dedicated=True, unverified=True,
         note="UNVERIFIED: no official VRAM/timing; bf16 weights ~66 GiB on a 32 GB card needs offload", licence="LTX Community: <$10M revenue, keep watermark",
         quality="mid-high, native audio (O)"),
    dict(name="Wan2.2 A14B, IndiaAI-subsidised H100", model="Wan2.2 A14B (full)", price=(67, 92, 153), cur="inr", foreign=False,
         gen_s=(1000, 1041, 1250), acc=0.55, ptag="V", gtag="F", dedicated=True, conditional=True,
         note="rate card not readable; approval required; excluded from ranking (FR3)", licence="Apache 2.0", quality="high, silent (O)"),
]


def usd_hr(c, i):
    p = c["price"][i] / (USD_INR if c["cur"] == "inr" else 1.0)
    return p * (1 + GST) * (1 + (FX_MARKUP if c["foreign"] else 0))


def monthly_cost(c, V, ip=1, ig=1, acc=None):
    """Monthly USD to deliver V accepted clips."""
    a = acc if acc is not None else c["acc"]
    gen = c["gen_s"][ig]
    if c["dedicated"]:
        busy_h = V / a * gen / 3600.0
        boxes = max(1, math.ceil(busy_h / (HOURS * MAX_UTIL_PER_BOX)))
        return boxes * HOURS * usd_hr(c, ip) + OPS_USD_MONTH
    return V / a * (gen + c.get("overhead_s", 0)) / 3600.0 * usd_hr(c, ip) + OPS_USD_MONTH


def api_monthly(a, V, i=1, acc=None):
    return V / (acc if acc is not None else a["acc"]) * a["clip"][i]


def per_video(c, V, **k):
    return monthly_cost(c, V, **k) / V


def api_per_video(a, V, i=1, acc=None):
    return api_monthly(a, V, i, acc) / V


def breakeven(c, a):
    """Smallest accepted volume/month where self-host beats the SAME-model API, scanning to 20,000. None if never."""
    for V in range(50, 20001, 50):
        if monthly_cost(c, V) < api_monthly(a, V):
            return V
    return None


def fmt(x):
    return f"${x:,.2f}"


def main():
    rows = []
    for c in SELF:
        rows.append(dict(kind="self-host", name=c["name"], ranked=not c.get("conditional", False), unv=c.get("unverified", False),
                         lo=per_video(c, BASE_V, ip=0, ig=0), mid=per_video(c, BASE_V), hi=per_video(c, BASE_V, ip=2, ig=2),
                         eq50=per_video(c, BASE_V, acc=0.5), vols=[per_video(c, v) for v in VOLUMES],
                         tag=f"price {c['ptag']} / time {c['gtag']}", note=c["note"], licence=c["licence"], quality=c["quality"]))
    for n, a in API.items():
        rows.append(dict(kind="api", name=n, ranked=a.get("ranked", True), unv=a["tag"] == "V",
                         lo=api_per_video(a, BASE_V, 0), mid=api_per_video(a, BASE_V), hi=api_per_video(a, BASE_V, 2),
                         eq50=api_per_video(a, BASE_V, acc=0.5), vols=[api_per_video(a, v) for v in VOLUMES],
                         tag=a["tag"], note=a["note"], licence="n/a (hosted)", quality="closed/hosted"))
    if "--json" in sys.argv:
        print(json.dumps(rows, indent=2)); return
    rk = [r for r in rows if r["ranked"]]
    order = lambda key: {r["name"]: i for i, r in enumerate(sorted(rk, key=lambda r: r[key]), 1)}
    r_lo, r_hi, r_eq = order("lo"), order("hi"), order("eq50")
    o = ["# 04 Cost model v3 (generated by `cost_model.py`; do not edit by hand)\n",
         f"S1 = 5 s, 24 fps, 720p, T2V. Cost per ACCEPTED clip, **{BASE_V:,} accepted clips/month**. USD/INR {USD_INR} (F). GST excluded everywhere "
         f"(set GST in the script to test). {FX_MARKUP:.1%} FX markup on foreign-billed providers (O). Engineer time ${OPS_USD_MONTH:,.0f}/month on every self-host option (O). "
         f"Dedicated boxes are rented all month; extra boxes are added above {MAX_UTIL_PER_BOX:.0%} load, so utilisation FOLLOWS volume. "
         "Acceptance is a per-option prior (O) until the blind-rating experiment measures it; the `@50%` column re-runs every option at one shared 50% to show how much that opinion matters. "
         "Rows marked **UNV** rest on an unverified generation time or price and should not carry a recommendation alone.\n",
         "## Ranked by mid case\n",
         "| # | option | kind | low | mid | high | @50% shared acc | rank lo/hi/@50% | evidence | UNV |", "|---|---|---|---|---|---|---|---|---|---|"]
    for i, r in enumerate(sorted(rk, key=lambda r: r["mid"]), 1):
        o.append(f"| {i} | {r['name']} | {r['kind']} | {fmt(r['lo'])} | {fmt(r['mid'])} | {fmt(r['hi'])} | {fmt(r['eq50'])} | {r_lo[r['name']]}/{r_hi[r['name']]}/{r_eq[r['name']]} | {r['tag']} | {'UNV' if r['unv'] else ''} |")
    for r in rows:
        if not r["ranked"]:
            o.append(f"| n/r | {r['name']} | {r['kind']} | {fmt(r['lo'])} | {fmt(r['mid'])} | {fmt(r['hi'])} | {fmt(r['eq50'])} | - | {r['tag']} | {'UNV' if r['unv'] else ''} |")
    o.append("\nLow/high pair the best/worst price with the best/worst time. A rank swing of more than 3 places between columns means the option is not a robust pick on cost alone.\n")
    o.append("## Volume sensitivity: USD per accepted clip (mid case)\n")
    o.append("| option | " + " | ".join(f"{v:,}/mo" for v in VOLUMES) + " |\n|---|" + "---|" * len(VOLUMES))
    for r in sorted(rk, key=lambda r: r["mid"]):
        o.append(f"| {r['name']} | " + " | ".join(fmt(x) for x in r["vols"]) + " |")
    o.append("\n## Break-even vs a hosted endpoint, accepted clips/mo above which self-hosting is cheaper (mid case, includes engineer time)\n")
    o.append("| self-host option | hosted comparator | break-even /mo | like-for-like? |\n|---|---|---|---|")
    byname = {c["name"]: c for c in SELF}
    pairs = [(c["name"], n, "same model" if a["same_as"] == c["model"] else None) for c in SELF if not c.get("conditional")
             for n, a in API.items() if a["same_as"] == c["model"]]
    pairs += [(next(n for n in byname if "Lightning" in n), "Wan 2.2 A14B, fal.ai (hosted open)", "NO: distilled vs full model, quality differs"),
              (next(n for n in byname if "Lightning" in n), "Wan 2.2 5B, fal.ai (hosted open)", "NO: different, smaller model"),
              (next(n for n in byname if n.startswith("HunyuanVideo")), "Wan 2.2 5B, fal.ai (hosted open)", "NO: different model, licence differs")]
    for sn, an, lfl in pairs:
        b = breakeven(byname[sn], API[an])
        if "LTX" in sn and "1080p" in an:
            lfl = "NO: hosted price is 1080p, self-host is 720p"
        o.append(f"| {sn} | {an} | {'never within 20,000' if b is None else f'{b:,}'} | {lfl} |")
    o.append("\n## Evidence notes\n")
    for r in rows:
        o.append(f"- **{r['name']}** (`{r['tag']}`): {r['note']}.")
    text = "\n".join(o) + "\n"
    Path(__file__).with_name("04-cost-model.md").write_text(text)
    print(text)


if __name__ == "__main__":
    main()

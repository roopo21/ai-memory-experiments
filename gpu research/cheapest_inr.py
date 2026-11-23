#!/usr/bin/env python3
"""Cheapest self-host vs API, INR only. Prices read 2026-11-20 (peer C India pages, RunPod page via peer B, fal/WaveSpeed/Atlas via search).
Rates are ex-GST (E2E states GST extra; claimable for a registered business). Compute only: no setup, idle, storage or retries."""
USD_INR = 93.0
FX = 1.025  # card/forex markup on foreign providers (assumption)
# (label, rate INR/hr, note)
GPUS = {
 "E2E H100 spot (India)":        (70.00,  "E2E pricing.md; spot = can be interrupted; PAN/Aadhaar validation"),
 "JarvisLabs H100 spot (India)": (145.80, "jarvislabs.ai/in; per-second billing, self-serve"),
 "E2E H100 on-demand (India)":   (379.05, "E2E pricing.md"),
 "JarvisLabs A100 80GB spot (India)": (84.24, "jarvislabs.ai/in"),
 "JarvisLabs A100 80GB on-demand (India)": (140.94, "jarvislabs.ai/in"),
 "E2E L40S 48GB (India)":        (102.00, "E2E pricing.md"),
 "RunPod RTX 4090 community (global)": (0.34*USD_INR*FX, "runpod.io, $0.34/hr, per-second; not in India"),
}
# (model, GPU used for the vendor timing, seconds list [vendor claim, x3 haircut, x10 haircut] or single, what it is)
JOBS = [
 ("LTX-Video 13B 0.9.8 distilled (HD)", ["E2E H100 spot (India)","JarvisLabs H100 spot (India)","E2E H100 on-demand (India)"], (10, 30, 100),
  "vendor: 'HD video in 10 s on H100'; frames/steps not stated, so 3x and 10x haircuts shown"),
 ("Wan 2.1 T2V-1.3B (480p, 5 s)", ["RunPod RTX 4090 community (global)","E2E L40S 48GB (India)"], (240, 240, 360),
  "README: ~4 min on RTX 4090; L40S time inferred equal to a 4090 (+50% high case)"),
 ("Wan 2.2 TI2V-5B (720p, 5 s)", ["RunPod RTX 4090 community (global)","E2E L40S 48GB (India)"], (535, 535, 800),
  "README table: 534.7 s on RTX 4090; L40S inferred"),
 ("HunyuanVideo 1.5 distilled (480p, image-to-video only)", ["RunPod RTX 4090 community (global)"], (75, 75, 150),
  "Tencent: 75 s on a 4090; 480p, image-to-video only, excludes EU/UK/KR"),
 ("CogVideoX-2B (480p, 8 fps, 6 s)", ["JarvisLabs A100 80GB spot (India)","JarvisLabs A100 80GB on-demand (India)"], (90, 90, 135),
  "model card: ~90 s on A100 at 50 steps; dated quality"),
]
API = [  # (name, USD per 5 s clip, tag)
 ("Wan 2.2 5B 720p, WaveSpeed ($0.05/video)", 0.05, "primary page via search; Atlas Cloud lists $0.01/s = $0.05 too"),
 ("Wan 2.2 5B 720p, Atlas Cloud ($0.01/s)", 0.05, "primary page via search; 5 s length assumed"),
 ("LTX-Video 13B 0.9.8 distilled, fal.ai ($0.02/s)", 0.10, "fal llms.txt via search; older 0.9.7 page is inconsistent ($0.04/s or $0.04/video)"),
 ("Pruna P-Video 720p ($0.02/s)", 0.10, "UNVERIFIED: resellers only; one lists $0.20/video"),
 ("Wan 2.2 5B 720p, fal.ai ($0.15/video)", 0.15, "fal page (peer B)"),
 ("Hailuo 2.3 Fast (MiniMax)", 0.19, "aggregator only"),
 ("Wan 2.2 A14B 480p, fal.ai ($0.04/s)", 0.20, "fal page (peer B); removed 2027-01-04"),
 ("Runway Gen-4 Turbo ($0.05/s)", 0.25, "Runway docs (peer B)"),
 ("Hailuo 2.3 (768p, $0.28 per 6 s)", 0.28, "MiniMax page (peer B)"),
 ("Veo 3.1 Fast silent, fal.ai ($0.10/s)", 0.50, "fal page (peer B)"),
]
o=[]
o.append("## Self-host: compute cost per generated clip (INR, ex-GST, one attempt)\n")
o.append("| model | GPU / provider | rate Rs/hr | s per clip (claim / x3 / x10 or alt) | Rs per clip | 48 h rental, incl 18% GST | clips in 48 h |")
o.append("|---|---|---|---|---|---|---|")
rows=[]
for m,gl,secs,note in JOBS:
    for g in gl:
        r=GPUS[g][0]; c=[r*s/3600 for s in secs]; rent=r*48*1.18; n=[48*3600/s for s in secs]
        rows.append((c[0],m,g))
        o.append(f"| {m} | {g} | {r:,.0f} | {secs[0]} / {secs[1]} / {secs[2]} | {c[0]:.2f} / {c[1]:.2f} / {c[2]:.2f} | Rs{rent:,.0f} | {n[0]:,.0f} / {n[1]:,.0f} / {n[2]:,.0f} |")
o.append("\n## API: INR per 5 s clip, cheapest first (USD/INR 93; foreign card markup/GST not included)\n")
o.append("| option | USD | Rs per clip | Rs per 100 clips | evidence |\n|---|---|---|---|---|")
for n,u,t in sorted(API,key=lambda x:x[1]):
    o.append(f"| {n} | ${u:.2f} | {u*USD_INR:.1f} | {u*USD_INR*100:,.0f} | {t} |")
# break-even: 48h E2E H100 spot rental vs cheapest verified API
rent=70*48*1.18
for api_name,u in (("Wan 2.2 5B API (Rs4.65)",0.05),("LTX 13B distilled fal API (Rs9.30)",0.10)):
    o.append(f"\nBreak-even: a 48 h E2E H100 spot rental (Rs{rent:,.0f} incl GST) equals {rent/(u*USD_INR):,.0f} clips of {api_name}.")
o.append("\nNotes: compute only, no retries (multiply by 2-4 for accepted clips), no setup time, no idle. Spot can be interrupted.")
open("INDIA-CHEAPEST-tables.md","w").write("\n".join(o)+"\n")
print("\n".join(o))

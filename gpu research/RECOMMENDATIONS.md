# Recommendations: GPUs and cost to self-host a video generation model

Prepared 2026-11-20 for the Asana task "Figure out GPUs and cost to self-host a video gen model". Numbers come from `cost_model.py` (re-run it to check any figure). Evidence tags: F = read on a primary page, V = vendor or aggregator claim, I = inference, O = assumption.

## Verdict

**Do not self-host yet. Use a hosted open-weights endpoint now, a closed API for hero shots, and spend about $150 (Rs14k) on one benchmark before committing to any GPU.** At 500 to 5,000 accepted 5 s / 720p clips a month, hosted options cost about $0.35-0.60 per accepted clip. For the two models with verified timings (Wan 2.2 5B and Wan 2.2 A14B), the same model on a rented GPU **never breaks even with its hosted version within 20,000 clips a month** once about $215 a month of engineer time is counted. Self-hosting starts to win only with models whose speed is **unverified** (derived, I): distilled Wan A14B above about 3,300 clips a month against hosted A14B, HunyuanVideo above about 2,100 against hosted Wan 5B. Those comparisons are cross-model, so quality differs. The LTX break-evens (750-4,500) compare against a 1080p hosted price and are not like-for-like.

## Which GPU for which model (answer to the core question)

| Model | GPU class | Verified timing for a 5 s 720p clip | Tag |
|---|---|---|---|
| Wan 2.2 TI2V-5B | 24 GB (RTX 4090) | 534.7 s on one 4090 | F |
| Wan 2.2 A14B, full | 80 GB (H100); peak 59.8 GB | 1041.5 s on one H100 | F |
| Wan 2.2 A14B + 4-step Lightning LoRA | 80 GB | about 80-200 s (my range, I, scaled from one 79 s report on an H200) | V, unverified |
| HunyuanVideo 1.5 | 14 GB minimum with offload, 24 GB comfortable | none at 720p ("75 s" is the 480p model) | unverified |
| LTX-2.5 | no official figure; bf16 weights about 66 GiB | none from Lightricks | unverified |

Wan 2.5 and later are API-only (no weights in Alibaba's GitHub or Hugging Face orgs). India is not the cheap place to rent: an Indian H100 is $3.49-6.40/hr against $2.89 secure or $1.99 community on RunPod. The IndiaAI subsidy (about Rs92/hr in news reports) could not be verified.

## Top 5

Costs are USD per **accepted** clip at 2,000 clips a month (Rs93 per dollar). Hosted prices do not change with volume; box prices do.

| # | Option | $ per accepted clip (500 / 2,000 / 5,000 per month) | Confidence | Main risk | What would prove it wrong |
|---|---|---|---|---|---|
| 1 | **Wan 2.2 5B on fal.ai** (hosted open weights). List price $0.15 per clip | $0.43 (Rs40) at any volume | Low-Medium: price is F, but cost rests on an assumed 35% acceptance (O) and its rank swings 8/3/1 across cases | Quality: acceptance may be well under the 35% assumed. Apache weights keep an exit to self-hosting open | Blind test of 50 prompts: acceptance below 30% where Hailuo reaches 60% or more (cost about $22: Wan 5B $7.50 + Hailuo $14 for 50 prompts) |
| 2 | **Hailuo 2.3 / 2.3 Fast** (MiniMax, closed, 768p). $0.28 per 6 s clip (F); $0.19 Fast (V, aggregator only) | $0.35 (Rs33), Fast $0.24 | Low-Medium: legacy-list risk and rank swings 2/1/6 across cases | Reportedly moved to MiniMax's legacy list; closed, so no exit | Price page no longer lists it, or acceptance not above Wan 5B's in the same blind test |
| 3 | **Wan 2.2 A14B + 4-step Lightning LoRA on a RunPod H100 PCIe** ($2.89/hr secure). Best self-host candidate: Apache 2.0, full-size model | $4.75 / $1.19 / $0.48 (Rs442 / Rs111 / Rs45). Beats hosted A14B above about 3,300 clips a month and hosted Wan 5B above about 5,550 | Low (timing and quality loss unverified) | One report only; the distilled output may be visibly worse; idle rent if volume is under 2,000 | One hour on the H100: over 150 s per clip, or blind acceptance below the full A14B run's (the experiment includes that run) |
| 4 | **HunyuanVideo 1.5 step-distilled on a RunPod RTX 4090** ($0.89/hr secure, $0.34 community) | $1.76 / $0.44 / $0.31 (Rs164 / Rs41 / Rs29). Beats hosted Wan 5B above about 2,100 | Low | No 720p timing; licence excludes the EU, UK and South Korea and caps at 100M MAU | One hour on a 4090: more than about 300 s per clip at 720p, or any customer in an excluded territory |
| 5 | **Veo 3.1 Fast, silent, via fal.ai** (closed). $0.50 per clip. Not a pick to adopt, the quality yardstick | $0.59 (Rs55) | Medium | Cost; per accepted clip it only matches Wan 5B if Veo's acceptance is about 3.3x Wan 5B's ($0.50 / $0.15), which needs Wan 5B at or below about 30% | Blind test shows Wan 5B acceptance above about 30%, so Veo can never pay back on cost alone |

### Dropped, and why
- **Wan 2.2 A14B at the default sampler (README time; step count not stated), anywhere**: $2.27 per accepted clip on RunPod, $3.02 on E2E, $4.79 on Yotta. Never competitive with its own hosted price ($0.73).
- **Wan 2.2 A14B on fal.ai**: the page says the model is removed on 2027-01-04, about six weeks away.
- **LTX-2.x self-host** (H100 or RTX 5090): no primary timing and no official VRAM figure, and the licence needs a $10M revenue check and a visible watermark. Revisit after the benchmark; it is the one model that adds native audio.
- **Indian on-demand providers** (E2E $3.99, Neysa $4.39, JarvisLabs $3.49, Yotta about $6.40) and the IndiaAI portal: 1.2-2.2x RunPod's $2.89 secure H100 and 1.7-3.2x its $1.99 community one, or an unverifiable rate card. One exception: JarvisLabs **spot** H100 at $1.54 undercuts RunPod community, but spot can be interrupted mid-clip. GST is excluded everywhere in the model; a registered business can usually claim it back.
- **Runway Gen-4 Turbo ($0.36 per accepted clip) and Kling 2.6 Pro ($0.44)**: both viable and cheaper than Veo. Left out of the five only because Hailuo fills the cheap-closed slot and Veo is the quality yardstick; swap them in if Hailuo disappears.
- **Veo 3.1 Lite at $0.03-0.05/s**: only aggregators list it; Google's pages were unreadable.

## What drives the cost (the non-obvious part)

1. **Rent, ops time and acceptance rate dominate; generation time matters only through the number of boxes.** While one rented box covers the volume, a clip costs about (monthly rent + engineer time) / volume, and a faster or slower time changes nothing (distilled Wan at 80 s, 125 s or 200 s all cost $1.19 at 2,000 a month). Time bites when it forces extra boxes: that is why full A14B costs $2.27 against $1.19 for distilled. So for the weakly-timed models the benchmark should measure acceptance first, and speed second.
2. **Acceptance is an opinion in this model.** Priors range from 35% (Wan 5B) to 85% (Veo). Re-running every option at one shared 50% moves hosted Wan 5B to the top ($0.30) and hosted Veo to $1.00. Only the blind test settles this.
3. **Utilisation follows volume.** At 500 clips a month a 4090 running distilled Hunyuan is busy about 13% of the time (model, 45% acceptance, 300 s per clip), so a clip costs $1.76 against $0.44 at 2,000 a month.

## The one experiment (about $150 / Rs14k, 1-2 engineer-days)

One prompt set, 50 short prompts at 1280x720, 121 frames, 24 fps, fixed seed, run on eight setups with two blind raters scoring accept/reject:
- RunPod H100 PCIe: Wan 2.2 A14B full (the reference for #3's kill test); Wan 2.2 A14B + Lightning 4-step; HunyuanVideo 1.5 720p step-distilled; LTX-2.5 fp8.
- RunPod RTX 4090: HunyuanVideo 1.5 with offload; Wan 2.2 TI2V-5B with official settings.
- Hosted: fal Wan 5B, Hailuo 2.3, Veo 3.1 Fast silent.
Record wall time including model load, peak VRAM and accept rate. Expected spend about $94 (H100, about 32 h including the slow full-A14B run) + $9 (4090) + $47 (APIs: Wan 5B $7.50, Hailuo $14, Veo Fast $25), about $150 in total. Feed the results into `cost_model.py` and the top 5 settles.

## Open items (not hidden)
- Acceptance priors, the $215 a month engineer-time figure and the 2.5% FX markup are my assumptions (O). The "default sampler" for Wan's README times is not specified in the README table.
- The Lightning timing is a single report; Hunyuan 720p and LTX timings are inferences.
- Not surveyed in depth: SkyReels V3, Kandinsky 6.0, MiniMax H3, LingBot-Video (listed in `01-models.md`).
- Google, Kling, Seedance and the IndiaAI rate cards could not be read; AWS/GCP/Azure on-demand H100 prices not verified.
- Prices were captured on 2026-11-20 and few pages show a date. Re-check before spending.

Full trail: `requirements.md` (scope), `01`-`04` (evidence and model), `reviews/` (peer and reviewer output, verbatim), `05-review-log.md` (objections and resolutions).

I spot-checked three claims. Two of them change numbers in the model.

- **HunyuanVideo 1.5 at 720p has no published timing.** The "75 s on a 4090" figure is for the 480p step-distilled model ([HF card](https://huggingface.co/tencent/HunyuanVideo-1.5), [distillation notes](https://huggingface.co/tencent/HunyuanVideo-1.5/blob/main/assets/step_distillation_comparison.md)). The model's #1 option rests on a number nobody has measured.
- **Wan2.2 A14B with a 4-step distilled LoRA ("Lightning") is missing from the model.** One reported run took 79 s per 720p clip on an H200, down from 643 s ([JarvisLabs](https://jarvislabs.ai/blog/wan-2-2-lightning-different-video), [ModelTC](https://github.com/ModelTC/Wan2.2-Lightning)).
- **Hailuo 2.3 is billed per 6 s clip: $0.28, not $0.235.** It has also reportedly been moved to MiniMax's legacy list ([DevDigest](https://www.developersdigest.tech/models/video-generation/minimax), [Magic Hour](https://magichour.ai/blog/hailuo-23-pricing)).

## A. Verdict
Use a hosted open-weights endpoint now, with a closed API for hero shots. Don't self-host until a ₹10–15k benchmark shows a distilled model at 120 s or less per 720p clip on a GPU costing $1–3/h. At 500–5000 accepted clips a month, the team would pay $150–1,500 a month on fal's Wan 5B. One always-on rented 4090 is $650 a month before anyone spends time running it.

## B. Objections (ranked by impact on the ranking)

1. **Every option gets the same 50% acceptance.** This is where quality differences should show up, and holding it fixed erases them. Kling 3.0 and Veo 3.1 Fast are not comparable to the Wan 5B model. If Veo Fast is accepted 80% of the time and Wan 5B 25%, they cost the same per accepted clip ($0.63 vs $0.60).
   - Effect: the cost of closed APIs is too high, and the cost of small models is too low.
   - Fix: give each model its own acceptance rate, measured by blind rating (see D).
2. **The top two picks rest on unmeasured generation times.** HunyuanVideo at 720p is a guessed "2.5–6×" scale-up from a 480p figure. LTX on a 5090 is "2–6× slower than an H100", and the H100 figure is itself unmeasured.
   - Effect: ranks 1, 2, 4 and 7 are all likely too cheap. The LTX/5090 option swings from rank 2 to rank 8 between the low and high cases, so it fails the model's own robustness test.
   - Fix: list these as "unverified" and keep them out of the ranking (the requirements already demand this under FR6).
3. **60% utilisation doesn't fit this volume.** At 500 clips a month, a 4090 averaging 300 s per clip is busy about 83 of 730 hours, roughly 11%. That makes an always-on box cost about $1.30 per accepted clip, not $0.25. At 5000 a month it needs more than one 4090 (capacity at 100% busy is 4,380).
   - Effect: self-host costs too low by 2–5× at the low end.
   - Fix: work out utilisation from volume, and model per-second pods with real cold-start (model load) times.
4. **The break-even logic is broken.**
   - It compares boxes against APIs running different models (an LTX box against Wan A14B on fal).
   - Break-even is just monthly rent divided by the API price. That's why HunyuanVideo and Wan 5B show identical break-evens.
   - It leaves out engineer time.
   - It reports wins at 88% of capacity (Wan 5B on a 4090 vs fal's 5B), which is not a real win.
   - Fix: break-even = (rent + ops) ÷ (API cost − marginal self-host cost), comparing the same model at the same quality tier, and capped at capacity.
5. **The cost of running the box yourself is missing.** Storage (~$7 a month) and egress (under 50 GB a month) don't matter. Engineer time does: 10–20 h a month at ₹1.5–3k/h is ₹15–60k ($160–650) a month, which is more than the whole API bill at 500 clips.
   - Effect: self-host costs too low.
   - Fix: add an ops row to the break-even.
6. **Wan A14B self-host uses only the full 40-step setup**, while HunyuanVideo gets its distilled variant. Distilled 4-step Wan A14B probably takes about 80–120 s per clip on an H100, against the 1,041 s modelled.
   - Effect: Wan A14B self-host costs too high by about 8×.
   - Fix: add the distilled variant as its own row with a quality-tier label.
7. **The closed-API baseline uses premium tiers.** Cheaper tiers in the evidence are left out: Runway Gen-4 Turbo ($0.25 per clip), Kling 2.6 ($0.35), Hailuo 2.3 Fast ($0.19), MiniMax H3-Lite. Hailuo 2.3 is also prorated to 5 s when it is billed per 6 s clip.
   - Effect: the closed-API costs shown are too high overall. Hailuo is shown too low (should be $0.56, not $0.47).
   - Fix: add the cheaper tiers and use the per-clip minimums.
8. **GST is applied unevenly.** 18% is added only to Indian providers. Imported services carry GST too: reverse charge for a registered business, or OIDAR tax for an unregistered buyer. On top of that, foreign card payments carry a 2–3.5% FX markup.
   - Effect: Indian options are 18% too expensive relative to the rest.
   - Fix: either show everything excluding GST (marked claimable) or apply it to every option. Add the FX markup to USD-billed options.
9. **Platform risk isn't priced.** fal is removing Wan A14B on 2027-01-04, about six weeks away. Hailuo 2.3 is reportedly legacy. HunyuanVideo's licence excludes the EU, UK and South Korea. LTX requires the watermark to be kept.
   - Fix: add a risk column. Prefer open-weights endpoints, because the same weights can be moved to Replicate or self-hosted if one is pulled.
10. **The FX rate is fine.** ₹93 sits between two dated sources, and a 0.4% gap is noise.

## C. My top 5

| # | Option | Cost / confidence | Why | Cheapest disproof |
|---|---|---|---|---|
| 1 | **Wan 2.2 5B on fal.ai** (hosted open weights) | $0.15 per clip; medium confidence | Cheapest verified price, Apache licence, no ops, can move to self-host later | 50 prompts: acceptance below 30% where Hailuo reaches 60%+ (about $8) |
| 2 | **Hailuo 2.3 / 2.3 Fast** (closed API, 768p) | $0.19–0.28 per clip; medium confidence | Likely higher acceptance at a near-open-weights price | Same 50 prompts; also check whether it's still listed on platform.minimax.io |
| 3 | **Wan2.2 A14B + Lightning 4-step**, ComfyUI on a RunPod H100 PCIe ($2.89/h) | About $0.08 per clip if it takes ~100 s; low confidence | Full-size model at distilled speed; Apache licence | One hour on the H100: more than 150 s per clip, or visible quality loss |
| 4 | **HunyuanVideo 1.5** 720p step-distilled, diffusers on a RunPod 4090 secure ($0.89/h) | Low confidence | Fits on 14 GB; cheapest box if 720p takes under ~200 s | One hour on the 4090: time at 720p, 8 steps |
| 5 | **Veo 3.1 Fast silent via fal** (closed API) | $0.50 per clip; medium confidence | The quality ceiling that sets what "accepted" means | If its acceptance is under 1.7× Wan 5B's, it's never worth using |

**Where I differ from the cost model:**
- It ranks HunyuanVideo #1 and LTX-on-5090 #2 on guessed times. I rank HunyuanVideo 4th and drop LTX-on-5090 entirely: it has no VRAM figure, and a ~66 GiB bf16 model on a 32 GB card is a guess.
- I drop Wan A14B on fal because it is being removed.
- I add distilled Wan A14B, which the model doesn't have.
- I move Hailuo up, using the corrected per-clip price.
- I treat the closed APIs as the yardstick for acceptance rather than as the most expensive rows.

## D. The one experiment
**One prompt set, eight setups, one blind acceptance score each.**

- **Prompts:** 50 short-clip prompts (S1: 1280×720, 121 frames, 24 fps, T2V, fixed seed).
- **Self-hosted, on a RunPod secure H100 PCIe:**
  - Wan2.2 A14B + Lightning 4-step (cfg 1, bf16, no offload)
  - HunyuanVideo 1.5 720p step-distilled (8 steps, bf16)
  - LTX-2.5 (fp8, default steps)
- **Self-hosted, on a RunPod secure RTX 4090:**
  - HunyuanVideo 1.5 (with offload)
  - Wan2.2 TI2V-5B (with offload, official settings)
- **Hosted:** fal Wan 5B, Hailuo 2.3, and Veo 3.1 Fast silent on the same prompts.
- **Record:** wall time including model load, peak VRAM, and blind accept/reject from 2 raters.
- **Spend:**
  - About 15 h on the H100: ~$45.
  - About 10 h on the 4090: ~$9.
  - APIs: ~$47 (fal Wan 5B $7.50, Hailuo 2.3 $14, Veo 3.1 Fast $25).
  - **Total about $100–130 (₹10–12k)**, plus 1–2 engineer-days.
- **Result:** measured per-model acceptance and time feed straight into `cost_model.py`. That settles objections 1, 2 and 6, which together are what could change the ranking.

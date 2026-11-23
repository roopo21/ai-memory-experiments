# GPU Research: self-hosting a video generation model

Source: Asana task "Figure out GPUs and cost to self-host a video gen model" (Vrisha AI, `Later · Deep · @experiment`, due 2026-12-01, task gid 1220732719607695).
Scoped on: 2026-11-20. Status: v2 (revised after reviewer pass 0, see `reviews/00-requirements-review.md`).

## 1. Goal

Work out which GPUs are needed for which video generation models, and what it would cost today to run a video generation model myself and generate videos. End with a ranked **top 5** of concrete recommendations (model + harness + GPU + provider + cost per video).

## 2. Decision this serves

"Should I self-host a video gen model, and if so, on what stack and at what cost per video?" The output must let me decide in about 10 minutes, so it has to be comparable across options and carry a clear "so what".

Out of scope: building the product around the model, fine-tuning or training, audio/lip-sync pipelines, legal and licensing review beyond flagging commercial-use restrictions.

## 3. Work packages (run in order; each ends with a gate)

| # | Work package | Output file | Gate to move on |
|---|---|---|---|
| WP1 | Model survey: open-weights models first, closed or API-only ones as a cost baseline | `01-models.md` | Every model has a source link, release date, licence, parameter count |
| WP2 | GPU mapping: model to VRAM, GPU class, precision/quantisation, throughput, seconds to generate a clip | `02-gpu-mapping.md` | Each figure marked fact / inference / opinion, with a source |
| WP3 | Pricing: cloud GPU hourly prices in India, sanity-checked against global providers; on-demand vs spot | `03-pricing.md` | Each price has provider, GPU, region, currency, date captured |
| WP4 | Cost model: cost per generated video under stated resolution, length, utilisation | `04-cost-model.md` + `cost_model.py` | Reproducible: a script regenerates every number |
| WP5 | Prune and peer review: delete weak or unsupported findings; independent reviewers attack what remains | `05-review-log.md` | All reviewer objections resolved or recorded as open |
| WP6 | Converge: top 5 recommendations | `RECOMMENDATIONS.md` | Passes the quality rubric (section 5) |

## 4. Functional requirements

**FR1 Model survey.** Cover recent and older video generation models (examples to check, not a closed list: Wan 2.x, HunyuanVideo, LTX-Video, CogVideoX, Mochi, Open-Sora, SkyReels, plus any newer releases since mid-2026). For each: licence and whether commercial use is allowed, parameter count, supported resolution/fps/clip length, text-to-video vs image-to-video, and the serving harness (ComfyUI, diffusers, vendor repo, vLLM-style servers, etc.). WP1 gate adds a **licence matrix** (commercial use, revenue/user cap, territory exclusions, output ownership, attribution) and a **harness maturity** column (last commit, open-issue trend).

**FR2 GPU mapping.** Fixed candidate set: RTX 4090, RTX 5090, L40S, A100 40/80 GB, H100, H200, B200, and AMD MI300X (flag ROCm support gaps). Consumer GPUs on community clouds are flagged for terms-of-service and data-privacy limits. For each model and a standard target (see FR4), give VRAM needed at fp16/bf16, fp8 and quantised variants where they exist; the smallest GPU that works and the recommended one; measured generation time per clip with the benchmark's GPU named. Reject any benchmark that does not state steps, resolution, precision and offload settings. If only a different GPU is benchmarked, scale it and mark the result as an inference with a stated error band of ±30–50%.

**FR3 Pricing.** Hourly GPU prices from Indian providers (examples to check: E2E Networks, Yotta, Tata Communications / Neysa, Hyperstack-style India regions, any IndiaAI-mission subsidised compute) and from global providers (RunPod, Lambda, Vast.ai, Modal, Replicate, AWS/GCP/Azure) as a sanity check. Record on-demand and spot/interruptible prices separately. Convert to INR with the rate and date stated; state whether GST (18%) is included. **Eligibility rule:** a provider can appear in the ranking only if it has a verifiable public price or a dated quote; otherwise it is listed as "not publicly listed" and excluded from ranking. Also record availability (multi-GPU nodes, quota).

**FR4 Cost model.** Cost per **accepted** video = GPU hourly price x (generation seconds / 3600) x (1 / utilisation) x (1 / acceptance rate) + amortised model-load cost + storage + egress + idle floor. Scenarios are fully defined (duration, fps, resolution, steps, T2V vs I2V) and each model carries a quality-tier label (distilled few-step vs full-step) with the judging method stated (VBench or side-by-side; say so if no benchmark exists):
- S1: 5 s, 24 fps, 720p, T2V
- S2: 5 s, 24 fps, 1080p, T2V
- S3: 10 s, 24 fps, 720p, T2V
- S4: 5 s, 24 fps, 720p, I2V
- Sensitivities: utilisation 100% / 60% / 30%; acceptance rate 100% / 50% / 25%; warm vs cold start; always-on VM vs serverless per-second.
- A TCO table adds weights storage (50–100+ GB), egress, and engineer time at a stated INR/hour rate.
- **API baseline:** at least 6 hosted providers priced per second of video at matching resolution, dated (examples: Veo, Sora, Runway, Kling, Luma, Hailuo/MiniMax, Seedance), plus hosted open-weights endpoints (fal.ai, Replicate) as a separate row, since they share the model but remove ops.

**FR5 Break-even.** State the monthly video volume where self-hosting beats the hosted-API baseline, per recommendation.

**FR6 Prune.** Every finding that lacks a source, relies on a single marketing claim, or cannot be reproduced is deleted or demoted to "unverified" and excluded from the recommendations.

**FR7 Peer review.** At least two reviewer passes through `claude -p`, run as a protocol: (a) a peer given the raw questions and sources only, not my draft, who re-derives the key numbers; (b) a reviewer who attacks method and conclusions; at least one pass uses a different model tier from the author. Output is saved verbatim in `05-review-log.md`, each objection marked resolved or open. "Changes the ranking" is mechanical: re-run `cost_model.py` with the objection's value and check whether the top-5 order flips.

**FR8 Top 5.** `RECOMMENDATIONS.md` opens with a one-line **verdict**: self-host, hosted open-weights endpoint, or closed API. It then ranks exactly five options, of which at least one must be a non-self-host baseline. Each states: model, harness, GPU, provider, cost per accepted video for S1 to S4 in INR and USD, break-even monthly volume, main risk, confidence (low / medium / high), and what would prove it wrong. A one-page summary supports a 10-minute read.

**FR9 Follow-up.** The top 3 get a proposed paid benchmark run (steps, settings, expected spend) as the mandatory next step before any commitment. It is not run in this task.

**Time box:** WP1 1.5 h, WP2 2 h, WP3 1.5 h, WP4 1 h, WP5 1 h, WP6 1 h.

## 5. Quality bar (applies to every output)

An insight counts only if it:
1. is non-obvious;
2. has evidence, with each claim marked fact, inference or opinion, and numbers given as ranges;
3. ends with a "so what";
4. holds at realistic scale (not just one lucky benchmark);
5. names the cheapest experiment that would disprove it.

## 6. Constraints and assumptions

- Prices and model releases change quickly. Anything captured is dated, and the date is part of the claim.
- Today is 2026-11-20; training knowledge may be out of date, so web sources win over memory.
- Indian-provider prices may only be available on request or behind login; if so, record "not publicly listed" instead of guessing.
- No spending on cloud GPUs in this task. All numbers come from published benchmarks and price pages. A small paid benchmark run is a proposed follow-up, not part of this task.

## 7. Acceptance criteria

- [ ] All six work-package files exist in this folder.
- [ ] `cost_model.py` runs and reproduces every cost figure in `04-cost-model.md`.
- [ ] No unsourced numbers in `RECOMMENDATIONS.md`.
- [ ] Two reviewer passes logged; no open objection that changes the ranking.
- [ ] Top 5 delivered with cost per video in INR and USD.

## 8. Open questions

1. Is the target use case short social clips, or longer cinematic output? (Assumed: short clips, S1 to S3 above.)
2. Is a text-to-video-only model enough, or do image-to-video and consistency across shots matter?
3. Is commercial licensing a hard requirement? (Assumed: yes, so non-commercial licences are flagged and ranked below.)
4. Is data residency in India a requirement or only a price preference? (Assumed: preference.)

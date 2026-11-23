# GPU rental and video-API prices, 20 Nov 2026

Pages were read on 2026-11-20. A dash (—) means the page didn't say. Most providers only show a "$" sign, which I've taken to mean USD, and most don't say whether tax is included.

## Part 1: GPU hourly prices

| Provider | GPU | Price | Unit / type | Region | Tax | Source / quote |
|---|---|---|---|---|---|---|
| E2E Networks | H100 / H200 / L40S / A100 80GB | $3.99 / $5.29 / $1.20 / $2.10 | per GPU-hr, on-demand | — | **excl.**: "do not include taxes" | e2enetworks.com/pricing: "NVIDIA H200 \| 141 \| 30 \| 375 \| $5.29". The table is in USD even though the title says "from ₹30/hr" |
| Yotta Shakti | 1×H100 VM | ₹596 | per hr, on-demand | — | — | shakticloud.ai/pricing: "VM – 1 x H100 On Demand \| … \| ₹ 596" |
| Yotta Shakti | 1×L40S VM; 8×H100 bare metal; 8×H100 SLURM | ₹302; ₹428/GPU; ₹386/GPU | per hr; term for bare metal and SLURM not stated | — | — | same page. No H200 listed |
| Neysa | H100 / H200 / L40S | $4.39 / $4.72 / $1.95 | "Starts at … / hour"; not labelled on-demand | — | — | neysa.ai/pricing. No A100 listed |
| JarvisLabs | H100 / H200 / A100 80GB | on-demand $3.49 / $4.59 / $1.49; spot $1.54 / $2.29 / $0.89 | per GPU-hr, billed per second | — | — | jarvislabs.ai/pricing. INR toggle **not readable**; no L40S |
| IndiaAI compute portal | — | **not readable** | — | — | — | indiaai.gov.in and AIKosh pages had no rate card |
| RunPod | H100 SXM / H100 PCIe | Secure $4.39 / $2.89; Community from $2.69 / $1.99 | per hr, billed per second | 30+ regions | — | runpod.io/pricing ("Updated November 12, 2026"): "H100 PCIe at $2.89/hr on Secure Cloud, or from $1.99/hr on Community Cloud" |
| RunPod | A100 80GB PCIe / SXM | Secure $2.09 / $2.19; Community $1.19 / $1.39 | same | | | same |
| RunPod | L40S / RTX 4090 / RTX 5090 | Secure $1.09 / $0.89 / $1.39; Community $0.79 / $0.34 / $0.69 | same | | | page data: "Community Cloud $0.34/hr, Secure Cloud $0.89/hr" (4090) |
| Lambda | H100 SXM; A100 80GB; B200 | $4.59–4.89; $3.19; $7.69–7.99 | per GPU-hr, on-demand | — | **excl.**: "* Plus applicable sales tax/VAT/GST" | lambda.com/pricing (lambda.ai redirects there) |
| Vast.ai (median of live offers, single GPU, on-demand) | H100 SXM / A100 SXM4 / RTX 4090 / RTX 5090 / L40S | $2.40 / $0.85 / $0.48 / $0.64 / $0.80 | per hr, marketplace | mixed | — | **I computed these.** The pricing page itself is not readable. Source: console.vast.ai/api/v0/bundles at 07:40 UTC. Number of offers: 5 / 27 / 64 / 64 / 9 |
| Modal | H100 / H200 / A100 80GB / L40S | $0.001097 / $0.001261 / $0.000694 / $0.000542 per second (≈ $3.95 / $4.54 / $2.50 / $1.95 per hr) | per second, on-demand | — | — | modal.com/pricing: "Nvidia H100 SXM5 $0.001097 / sec" |
| AWS | p5.48xlarge (8×H100) | on-demand **not readable** on AWS's own pages. Capacity Block: $47.757/instance-hr ($5.97 per GPU) | Capacity Block, not on-demand | us-east-1 and Mumbai, same price | — | aws.amazon.com/ec2/capacityblocks/pricing. Vantage (a third-party price tracker): "$55.040 On Demand", region not named |
| GCP | a3-highgpu-8g | **not readable** | — | — | — | cloud.google.com/compute/gpus-pricing |
| Azure | ND96isr H100 v5 | **not readable** on Azure's own page. Vantage: $98.32/hr on-demand, $18.17 spot | per VM-hr (8 GPUs) | region not named | — | instances.vantage.sh |

## Part 2: Hosted video APIs (USD per second of output)

| Model | 720p | 1080p | Source | Quote |
|---|---|---|---|---|
| Veo 3.1 (Google's own pages) | **not readable** | **not readable** | ai.google.dev now redirects to aistudio.google.com and lists no Veo rows; the Vertex AI page came back empty | — |
| Veo 3.1 Standard, via fal.ai | $0.20 silent / $0.40 with audio | same | fal.ai/models/fal-ai/veo3.1 | "720p / 1080p \| $0.20/s \| $0.40/s" |
| Veo 3.1 Fast, via fal.ai | $0.10 silent / $0.15 with audio | same | same | "$0.10/s \| $0.15/s" |
| Veo 3.1 / 3.1 Fast, via Runway | $0.20 / $0.40; $0.10 / $0.15 | not tiered | docs.dev.runwayml.com/guides/pricing | "veo3.1 … 40 credits per second" at "$0.01 per credit" |
| Veo 3 (not 3.1), Veo Lite | not found | | | |
| Runway Gen-4 Turbo / Gen-4.5 / Aleph 2 | $0.05 / $0.12 / $0.28 | not tiered | Runway docs | "gen4.5: 12 credits per second" |
| Kling (own site) | **not readable** (page is an empty shell) | | kling.ai/dev/pricing | — |
| Kling 2.6 Pro / 3.0 Pro, via fal.ai | $0.07 / $0.112 silent; $0.14 / $0.168 with audio | resolution not stated | fal.ai | "$0.07 (audio off) or $0.14 (audio on)" |
| Luma Ray 3.2 | 20 credits/s | 80 credits/s | lumalabs.ai/api/pricing | "T2V/I2V (5s) \| 20 \| 50 \| 100 \| 400". **The $ value of a credit is not on the page.** If 1 credit = $0.003 (my inference), that is $0.06 and $0.24 |
| MiniMax Hailuo 2.3 / 02 | $0.047 at 768p (6s clip) | $0.082 ($0.49 per 6s clip) | platform.minimax.io/docs/guides/pricing ("All prices are in USD") | "$0.49 per 1080P, 6s video" |
| MiniMax H3 / H3-Lite | $0.08 / $0.04 at 768p | H3 at 2K: $0.13 | same | — |
| Seedance (BytePlus, ByteDance's own platform) | **not readable** | **not readable** | docs.byteplus.com (page dated "Last updated: November 19, 2026"; table not rendered) | — |
| Seedance 1.0 Pro, via fal.ai | — | about $0.124 (≈$0.62 per 5s clip) | fal.ai | "Each 1080p 5 second video costs roughly $0.62" |
| Wan 2.2 A14B (open weights), fal.ai | $0.08 (480p: $0.04) | no 1080p tier | fal.ai | "$0.08 per video second for 720p". Page says the model is removed 4 Jan 2027 |
| Wan 2.2 5B, fal.ai | $0.15 per ≤5s 720p video | — | fal.ai | "$0.15 per video" |
| LTX-2.3 Pro, fal.ai | no 720p tier | **$0.08 or $0.06** (page conflicts) | fal.ai/models/fal-ai/ltx-2.3/text-to-video | see Conflicts |
| HunyuanVideo, Replicate | about $2.55 per run (4×H100, about 7 min) | — | replicate.com/tencent/hunyuan-video | "costs approximately $2.55 to run". fal.ai pages return 404 |
| Wan 2.2 / LTX-2 Pro, Replicate | **not readable** | | | |

For comparison with self-hosting, serverless GPU prices: Replicate H100 $5.49/hr, A100 80GB $5.04/hr, L40S $3.51/hr. fal.ai H100 $4.50/hr.

## Part 3: USD to INR

| Source | Rate | Timestamp |
|---|---|---|
| XE (mid-market) | 92.9477 | "Nov 20, 2026, 06:58 UTC" |
| open.er-api.com (data from exchangerate-api.com) | 93.3727 | "Fri, 20 Nov 2026 00:02:32 +0000" |
| RBI / FBIL (official reference rates) | **not readable** | — |

Use about ₹93/$. On that basis, Yotta's ₹596 for one H100 VM is about $6.40/hr, and E2E's $3.99 is about ₹371/hr before 18% GST.

## Conflicts between sources
- **LTX-2.3 on fal.ai:** the page header says $0.08/s at 1080p, but the table on the same page says $0.06/s.
- **USD to INR:** the two sources are 0.42 INR apart. XE's figure is also below the 7-day low printed on its own page (93.30).
- **E2E:** the page title says "from ₹30/hr", but the price table is in USD.
- **Neysa:** the hourly "starts at" prices don't match the monthly reserved figures on a 730-hour month.
- **Yotta:** a one-GPU H100 VM is ₹596/hr, while H100 bare metal is ₹428 per GPU. The page doesn't say which commitment term applies to the bare-metal rate.
- **Lambda:** H100 shows four prices ($4.59–4.89), and the tables don't say which cluster size each price belongs to.

## Confidence and gaps
- **High confidence:** RunPod, Modal, Lambda, E2E, JarvisLabs, Runway, MiniMax, and the fal.ai Wan and Veo pages. These were read verbatim on the providers' own pages, or on fal.ai's own pages for fal.ai models.
- **Medium confidence:**
  - Yotta: the page came back truncated.
  - Vast.ai medians: I computed them myself, and the H100 (5 offers) and L40S (9 offers) samples are small.
  - Luma: converting credits to dollars is my inference.
- **Gaps (not readable):**
  - On-demand H100 prices on AWS, GCP and Azure's own pages.
  - The IndiaAI rate card.
  - Google's own Veo prices, Veo 3 and Lite tiers.
  - Kling's and Seedance's own price pages.
  - Replicate's Wan 2.2 and LTX prices; LTX-2 and HunyuanVideo on fal.ai (404).
  - JarvisLabs INR prices.
  - The official RBI rate.
- Almost no page states the region or a price date. GST/tax is stated only by E2E and Lambda, both excluding it.
- **Comparing self-hosting with APIs:** a 1080p clip from an open-weights model on one H100 typically takes minutes (HunyuanVideo on Replicate takes about 7 minutes on 4×H100). Hosted per-second prices of $0.05–$0.40 are therefore usually cheaper than renting a GPU unless it is kept busy. **This is an estimate; I did not benchmark it.**

# Self-hostable open-weights video generation models, as of 2026-11-20

Wan 2.2 and HunyuanVideo 1.5 are the most practical to self-host today. Wan 2.2's TI2V-5B is the only model here with a vendor-measured 5 s 720p time on a single consumer GPU: 534.7 s on an RTX 4090. HunyuanVideo 1.5 fits in about 14 GB with offloading. LTX-2.5 is probably the strongest open model, but Lightricks publishes no single-GPU timing and no official VRAM figure. Nothing newer than Wan 2.2 has open weights from Alibaba.

## 1. Model list

| Model | Weights? | Primary source |
|---|---|---|
| **Wan 2.2** (T2V/I2V-A14B, TI2V-5B, S2V-14B, Animate-14B) | Yes, Jul–Nov 2025 | [github.com/Wan-Video/Wan2.2](https://github.com/Wan-Video/Wan2.2) |
| Wan2.2-Animate-2-14B, Wan-Dancer-14B | Yes, Jul–Aug 2026 (animation and dance models, not general T2V) | [HF Wan-AI](https://huggingface.co/Wan-AI) |
| **Wan 2.5 / 2.6 / 2.7 / 3.0** | **No.** None of the 27 repos in the Wan-AI HF org and none of the 6 repos in the Wan-Video GitHub org is 2.5 or later | [HF Wan-AI](https://huggingface.co/Wan-AI), [GitHub Wan-Video](https://github.com/Wan-Video) |
| HunyuanVideo 1.5 (8.3B) | Yes, 2025-11-21. No 2.0 found | [HF tencent/HunyuanVideo-1.5](https://huggingface.co/tencent/HunyuanVideo-1.5) |
| LTX-2 (19B), LTX-2.3 (22B), **LTX-2.5** (22B, licence dated 2026-08-11) | Yes | [github.com/Lightricks/LTX-2](https://github.com/Lightricks/LTX-2) |
| Kandinsky 5.0 Video (2B Lite / 19B Pro), **6.0** (3B Lite / 29B Pro, gated) | Yes | [HF kandinskylab](https://huggingface.co/kandinskylab) |
| SkyReels V2 (1.3B/14B), V3 (14B/19B, Jan 2026) | Yes | [SkyReels-V2](https://github.com/SkyworkAI/SkyReels-V2) |
| MiniMax H3 (33B, CFG-distilled; 2K upscaler not released) | Yes, Aug 2026 | [HF MiniMax-H3](https://huggingface.co/MiniMaxAI/MiniMax-H3) |
| LingBot-Video (30B-A3B MoE and 1.3B, Apache-2.0) | Yes, 2026-07-09 | [HF robbyant](https://huggingface.co/robbyant/lingbot-video-moe-30b-a3b) |
| CogVideoX1.5-5B, Mochi 1 (10B), Open-Sora 2.0 (11B) | Yes, but these are 2024–25 releases and now trail the newer models | HF/GitHub cards |

## 2. The five most relevant models

| | Wan2.2 TI2V-5B | Wan2.2 T2V/I2V-A14B | HunyuanVideo 1.5 | LTX-2.5 | Kandinsky 6.0 Pro |
|---|---|---|---|---|---|
| **Licence** | Apache 2.0, commercial use OK | Apache 2.0 | Tencent Hunyuan Community License: **not licensed in the EU, UK or South Korea**; a separate licence is needed above 100M MAU; outputs may not be used to improve other models | LTX-2.x Community License: free for companies under **$10M** annual revenue, paid licence at or above it; watermarking must be kept | MIT (HF tag), gated access |
| **Params** | 5B dense | 27B MoE, 14B active | 8.3B | about 22B (from filenames), plus a Gemma 4 12B text encoder | 29B |
| **Resolution / fps / length** | 1280×704 at 24 fps, about 5 s | 480P and 720P | 480p/720p (1080p with the SR model), 121 frames at 24 fps | Up to 4K (DFR), 24 fps, 121-frame examples, with synced audio | 5 s, with super-resolution to 1080p and 44 kHz audio |
| **VRAM (official)** | "at least 24GB VRAM (e.g, RTX 4090)" with offload; peak 22.9 GB | "at least 80GB VRAM"; peak 59.8 GB at 720p | "Minimum GPU Memory: 14 GB (with model offloading enabled)" | No figure. fp8-cast plus CPU/disk offload is supported; nvfp4 needs Blackwell; the bf16 download is about 66 GiB | Not stated (CPU offload used in the example) |
| **Measured 5 s 720p** | **534.7 s on 1× RTX 4090** (vendor table; settings include offload, model dtype conversion and T5 on CPU) | **1041.5 s on 1× H100/H800; 155.1 s on 8×** (vendor; peak 59.8 GB) | No 720p figure readable. Vendor says "a single RTX 4090 can generate videos within 75 seconds", but that is for the **480p** step-distilled model at 8–12 steps | None verified. Secondary coverage reports 6.8 s for a 10 s clip on **2× GB200**; I could not confirm this in a Lightricks source | None found |

Notes on the table:
- Neither Wan table states the step count or precision. The README only says "Without specific optimization, TI2V-5B can generate a 5-second 720P video in under 9 minutes on a single consumer-grade GPU".
- For comparison, CogVideoX1.5's card gives "Single H100: ~550 seconds (5-second video)" at 50 steps in BF16, at 1360×768 and 16 fps.

Sources: Wan figures come from [the README](https://github.com/Wan-Video/Wan2.2) and its [efficiency chart](https://github.com/Wan-Video/Wan2.2/blob/main/assets/comp_effic.png), which I downloaded and read. HunyuanVideo figures come from [the HF card](https://huggingface.co/tencent/HunyuanVideo-1.5) and [LICENSE](https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5/blob/main/LICENSE). LTX figures come from [the HF card](https://huggingface.co/Lightricks/LTX-2.5) and [LICENSE-2_x](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x). Kandinsky figures come from [the HF card](https://huggingface.co/kandinskylab/Kandinsky-6.0-Pro-5s-Diffusers).

## 3. Where sources conflict

- **Wan 2.6 open weights:** [Vibedex](https://vibedex.ai/blog/wan-26-review-2026) and [Venice](https://venice.ai/models/wan-2-6) say the weights are released. Alibaba's HF and GitHub orgs contain no such repo. Treat the claim as false.
- **LTX licence:** some blogs call it Apache 2.0. Only the *code* is Apache 2.0; the weights use the Community License with the $10M threshold. LTX-2 and LTX-2.3 use an older licence (LICENSE-2) that adds liquidated damages of "double the amount that would otherwise have been paid".
- **LTX VRAM:** third-party claims range from 8 GB to 80 GB. Lightricks' own on-premise blog reportedly says 32 GB minimum (fp8) and 80 GB recommended, but that page failed to load for me, so this is unconfirmed.
- **HunyuanVideo timing:** a summary site gives "28.33 s for 50 steps" on 8×H800 alongside "~2.0 s/step". Those two numbers contradict each other. The official chart is an image I could not retrieve.
- **HunyuanVideo VRAM:** Tencent says 14 GB minimum; the community tool Wan2GP says 6 GB.
- **Parameter counts:** CogVideoX "1.5-5B" is tagged 6B on HF. Wan-Animate-2 is named 14B but its Diffusers repo is tagged 16B.

## Confidence and gaps

**High confidence:**
- No Wan 2.5–3.0 weights exist.
- The Wan 2.2 timing and memory figures.
- The licence terms for Wan, HunyuanVideo and LTX, all read from the licence files.
- The HunyuanVideo 14 GB minimum.

**Gaps:**
1. **No primary single-GPU 720p timing for HunyuanVideo 1.5, LTX-2.5 or Kandinsky 6.0.** HunyuanVideo's speed chart is an image; the URL I tried returned an error. Lightricks' optimization doc says explicitly "no absolute timings or VRAM figures".
2. The Wan table does not state step count or precision. bf16 with the default sampler is likely, but that is not confirmed.
3. I did not read the licences for SkyReels V2/V3, MiniMax H3 (whose application form covers the US, EU, UK and South Korea), or the CogVideoX LICENSE file.
4. Separate bf16, fp8 and quantised VRAM figures are not published by any of these vendors. The only fp8 or quantised numbers are community figures, which I left out.
5. I saw only the 10 most recently updated of the 204 repos in Tencent's HF org. My search for "HunyuanVideo" in repo names found nothing newer than 1.5.

**Practical takeaway:**
- **24 GB card:** Wan2.2 TI2V-5B (about 9 min per clip) or HunyuanVideo 1.5 (with offload).
- **80 GB card:** Wan2.2-A14B (about 17 min on one H100, about 2.6 min on 8).
- **LTX-2.5:** plan on an 80 GB GPU until you benchmark it yourself.
- **Before shipping:** check the licence territory restrictions (HunyuanVideo excludes the EU, UK and South Korea) and the revenue threshold (LTX).

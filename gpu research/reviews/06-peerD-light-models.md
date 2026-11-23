# Lighter open video models for a 48-hour single-GPU rental

**The "Kimi" video model:** Moonshot AI has no released video-generation model, open or API. Kling has no open-weights model either. For fast, cheap 5 s clips the best option is LTX-Video 13B 0.9.8 distilled, which the vendor says makes an HD clip in about 10 s on an H100. If the licence needs to be Apache, use Wan 2.2 TI2V-5B, which Wan says takes under 9 minutes per clip on a 4090.

## Q1: Kimi and Kling
- **Moonshot AI / Kimi: no.** The moonshotai Hugging Face org has about 20 models (Kimi-K2/K2.5/K2.6/K3, Kimi-VL, Kimi-Audio, Moonlight). None of them generates video ([HF API](https://huggingface.co/api/models?author=moonshotai)). A news report (not a primary source) says only that a "Kimi Creation Space" video feature was "in the gray test stage" ([Pandaily](https://pandaily.com/?p=167608)). I found no public video API.
- **Kuaishou Kling: no open weights for the Kling generator.** KlingTeam publishes research models only, such as LivePortrait, MemFlow and ReCamMaster-Wan2.1 ([HF search](https://huggingface.co/api/models?search=kling)). Kling 2.6 and 3.0 are API-only.

## Q2: The models

| Model | Licence / commercial use | Params | VRAM (stated) | Output | Measured time per clip (source) |
|---|---|---|---|---|---|
| Wan 2.1 T2V-1.3B | Apache 2.0 | 1.3B | "only 8.19 GB" | 832×480, 5 s | "5-second 480P video on an RTX 4090 in about 4 minutes" ([README](https://github.com/Wan-Video/Wan2.1)), vendor |
| Wan 2.2 TI2V-5B | Apache 2.0 | 5B | "at least 24GB VRAM (e.g, RTX 4090)" | 1280×704, 24 fps | "5-second 720P video in under 9 minutes on a single consumer-grade GPU" ([README](https://github.com/Wan-Video/Wan2.2)); 534.7 s on a 4090 in the README table, vendor |
| LTX-Video 0.9.6–0.9.8 (2B / 13B distilled) | LTXV Open Weights 0.X: free; entities with "annual revenues of at least $10,000,000" need a paid licence ([licence](https://huggingface.co/Lightricks/LTX-Video/raw/main/LTX-Video-Open-Weights-License-0.X.txt)) | 2B / 13B | not stated | 1216×704, 30 fps; up to 60 s | 13B distilled: "generates HD videos in 10 seconds… (on H100)". 2B distilled: "Still real time on H100" ([README](https://github.com/Lightricks/LTX-Video)), vendor. Frames and steps not stated |
| LTX-2.5 | LTX-2.x Community (free under $10M revenue, keep watermark); weights gated with auto-approve | 22B + Gemma text encoder | not stated; bf16 weights about 66 GiB | default 1024×1536, 24 fps; audio | **none published** |
| CogVideoX-2B | Apache 2.0 | 2B | from 4 GB (diffusers fp16) | 720×480, 8 fps, 6 s | "Single A100: ~90 seconds, Single H100: ~45 seconds" at 50 steps ([card](https://huggingface.co/zai-org/CogVideoX-2b)), vendor |
| CogVideoX-5B | CogVideoX licence: commercial use needs registration, capped at "1 million visits per month" | 5B | from 5 GB | 720×480, 8 fps, 6 s | "A100: ~180 seconds, H100: ~90 seconds" at 50 steps, vendor |
| Mochi 1 preview | Apache 2.0 | 10B | "approximately 60GB" in the repo; 22 GB bf16 in diffusers; "<20GB" in ComfyUI | 480p | **none published** |
| Open-Sora 2.0 | Apache 2.0 | 11B | 60.3 GB peak at 768px | 256px / 768×768 | **1656 s on one H100/H800** at 768², 50 steps; 60 s at 256² ([README](https://github.com/hpcaitech/Open-Sora)), vendor |
| SkyReels-V2 | Skywork Community licence; "supports commercial use" | 1.3B / 5B / 14B | 1.3B: 14.7 GB; 14B: 43–51 GB at 540P | 540P / 720P, 24 fps | **none published** |
| HunyuanVideo 1.5, 480p I2V step-distilled | Tencent Community: excludes EU, UK and South Korea; separate licence above 100M MAU | 8.3B | "Minimum GPU Memory: 14 GB (with model offloading)" | 480p, image-to-video only | "a single RTX 4090 can generate videos within **75 seconds**" at 8–12 steps ([README](https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5)), vendor |

All the times above are vendor figures. I found no primary third-party timings.

## Q3: Ranking for a 5 s, 720p clip at the lowest cost per clip

1. **LTX-Video 13B 0.9.8 distilled (fp8):** about 10 s on an H100 for 1216×704, by far the cheapest per clip. Quality is described as "slight quality reduction" compared with 13B dev. There are official ComfyUI workflows. The licence is free under $10M revenue.
2. **Wan 2.2 TI2V-5B:** true 720p at 24 fps under Apache 2.0, but slow (about 9 minutes on a 4090). An H100 without offload should be faster, but no figure is published. Official ComfyUI support.
3. **HunyuanVideo 1.5 480p step-distilled:** 75 s on a 4090. It is 480p and image-to-video only, and the territory exclusion applies. HunyuanVideo 1.5 has a ComfyUI guide (from the previous research round, `01-models.md`).
4. **Wan 2.1 1.3B:** 480p in about 4 minutes on a 4090, needs only 8 GB, Apache. ComfyUI integration is official.
5. **CogVideoX-2B:** 45–90 s, but only 8 fps at 720×480. It looks dated. ComfyUI support is through a community wrapper only (not verified).
6. **Unmeasured or too slow:** LTX-2.5 (heavy, no timing), Mochi (480p, no timing; ComfyUI native per its README), SkyReels-V2 (no timing) and Open-Sora 2.0 (28 minutes per clip at 768px; no ComfyUI workflow found).

## Q4: What could block a rented GPU in India
- **Gated weights:** only LTX-2.5 is gated (auto-approve). All the others are ungated.
- **Territory:** no licence excludes India. Hunyuan excludes **EU, UK and South Korea**, which matters if the buyer's customers are there.
- **Revenue and usage caps:** LTX ($10M revenue, with "liquidated damages… double" for unlicensed commercial use); CogVideoX-5B (registration on bigmodel.cn and a 1M visits/month cap); Skywork (asks for "security reviews and records" before deploying an internet service).
- **Blackwell:** only LTX-2.x's nvfp4 path needs it (from the previous research round). The fp8/bf16 paths and every other model run on Ampere, Ada or Hopper. CogVideoX's FP8 mode "must be used on devices with NVIDIA H100 or above".
- **More than 80 GB:** none of these models needs it. The tightest are Open-Sora 768px (60.3 GB peak), Mochi's reference repo (about 60 GB) and SkyReels 14B with the prompt enhancer ("64G+"). Avoid the RTX 4090 for all three.

## Conflicts
- **Wan 2.2 5B:** the README says both "under 9 minutes" and 534.7 s (8.9 min). These agree; the time includes offload and T5 on the CPU.
- **Mochi VRAM:** 60 GB (repo), 42 or 22 GB (HF card) and under 20 GB (ComfyUI). It depends on the implementation.
- **Hunyuan's 75 s:** this is the **480p** step-distilled model. No 720p timing exists.
- **LTX "HD in 10 seconds":** the README gives no frame count, steps or resolution for this figure, so it may not be a 5 s 720p clip.

## Confidence and gaps
- **High confidence:** the licences, parameter counts and vendor timings quoted above (read directly from READMEs, licence files and the HF API).
- **Medium confidence:** "no Kimi video model". I checked the HF org and news reports, not Moonshot's API changelog.
- **Gaps:**
  - No primary timing for LTX-2.x, Mochi or SkyReels.
  - No independent benchmark for any model.
  - No official VRAM figure for LTX 0.9.x.
  - ComfyUI support for CogVideoX and SkyReels is unverified.
- **Suggestion:** spend the first 2 hours of the 48-hour rental timing LTX 13B distilled, Wan 2.2 5B and Hunyuan distilled on the rented GPU before committing.

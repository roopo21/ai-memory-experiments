# 02 GPU mapping (v2, captured 2026-11-20). Claims from READMEs and cards, not our measurements. Error band on any scaled figure: +/-30-50%.

| Model | Official VRAM | Time for S1 (5 s, 720p, 24 fps) | Tag |
|---|---|---|---|
| Wan 2.2 TI2V-5B | "at least 24GB VRAM (e.g. RTX 4090)" with offload; peak 22.9 GB | **534.7 s on 1x RTX 4090** (README table; offload + dtype conversion + T5 on CPU) | F |
| Wan 2.2 A14B | "at least 80GB VRAM"; peak **59.8 GB** at 720p | **1041.5 s on 1x H100/H800**; 155.1 s on 8 GPUs. Steps/precision not stated | F |
| Wan 2.2 A14B + Lightning 4-step LoRA | not stated | one report: 79 s on an H200 vs 643 s baseline (JarvisLabs, ModelTC repo); quality impact not measured | V, UNVERIFIED |
| HunyuanVideo 1.5 | "Minimum GPU Memory: 14 GB (with model offloading enabled)"; ComfyUI says 24 GB comfortable | "within 75 seconds on a single RTX 4090" is the **480p step-distilled** model; no 720p figure | F for VRAM, UNVERIFIED at 720p |
| LTX-2.5 | **no official figure**; fp8-cast + CPU/disk offload supported; nvfp4 needs Blackwell; bf16 download ~66 GiB | none from Lightricks; "6.8 s for a 10 s clip on 2x GB200" is secondary | UNVERIFIED |
| CogVideoX1.5-5B (comparison) | n/a | ~550 s on 1x H100 for 5 s at 1360x768, 16 fps, 50 steps, bf16 | F |

GPU classes implied: **24 GB** (RTX 4090) runs Wan 5B and distilled Hunyuan with offload; **80 GB** (H100) is the floor for Wan A14B at 720p without heavy offload; **LTX needs a benchmark** before any GPU is chosen.
**So what:** the models people call "cheap to self-host" (LTX, distilled Hunyuan) are exactly the ones with no primary 720p timing. The verified one (Wan A14B) is slow, at about 17 min per 5 s clip on an H100.
**What would prove this wrong:** one measured S1 run per model on the named GPU (FR9).

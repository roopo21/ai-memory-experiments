# 01 Model survey (v2, captured 2026-11-20; corrected by peer A, primary sources)

Tags: F = primary source (README, model card, licence file), V = vendor/aggregator, I = inference, O = opinion.

| Model | Open weights? | Licence and commercial conditions | Params | Native audio | Tag |
|---|---|---|---|---|---|
| **Wan 2.2** (T2V/I2V-A14B, TI2V-5B, S2V, Animate) | Yes (Jul-Nov 2025) | Apache 2.0, unrestricted | A14B = 27B MoE, 14B active; 5B dense | No | F |
| Wan 2.5 / 2.6 / 2.7 / 3.0 | **No.** Not among the 27 repos in Wan-AI on HF or the 6 in Wan-Video on GitHub. Blogs claiming otherwise are wrong | n/a (API only) | n/a | partial | F (absence), peer A |
| **HunyuanVideo 1.5** | Yes (2025-11-21) | Tencent Community: **not licensed in EU, UK, South Korea**; separate licence above 100M MAU; outputs may not be used to improve other models | 8.3B | No | F (licence file) |
| **LTX-2 / 2.3 / 2.5** | Yes | LTX-2.x Community: free under **$10M** annual revenue, paid above; keep watermark. LTX-2 and 2.3 (older LICENSE-2) add liquidated damages of "double the amount that would otherwise have been paid". Only the *code* is Apache 2.0 | 19B / 22B / ~22B + 12B text encoder | Yes, synchronised | F |
| Kandinsky 5.0 / 6.0 | Yes (6.0 Pro gated) | MIT per HF tag | 2B/19B; 3B/29B | 6.0: audio | F, not benchmarked |
| SkyReels V2 / V3 | Yes | licence not read | 1.3B-19B | no | not benchmarked |
| MiniMax H3 (33B, CFG-distilled, Aug 2026) | Yes | application form covers US/EU/UK/KR; not read in full | 33B | n/a | not benchmarked |
| LingBot-Video (Jul 2026) | Yes | Apache 2.0 | 30B-A3B MoE, 1.3B | n/a | not benchmarked |
| CogVideoX1.5-5B, Mochi 1, Open-Sora 2.0 | Yes | varies | 5-11B | no | F: 2024-25 releases, trail the newer models (O) |
| Closed: Veo 3.1, Kling 2.6/3.0, Runway Gen-4/4.5, Hailuo 2.3, Seedance | No | n/a | n/a | varies | pricing in 03 |

Corrections to my first draft: LTX is not Apache 2.0 for weights; HunyuanVideo's "75 s on a 4090" is the 480p distilled model; Wan 2.5+ are not open.
**So what:** only Wan 2.2 is both open and unrestricted. LTX is fine for a company under $10M revenue but must keep its watermark. Hunyuan is unusable for customers in the EU/UK/KR.
**What would prove this wrong:** a Wan 2.5+ repo appearing in the Wan-AI org, or a primary LTX timing page.

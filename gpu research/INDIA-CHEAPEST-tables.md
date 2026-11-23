## Self-host: compute cost per generated clip (INR, ex-GST, one attempt)

| model | GPU / provider | rate Rs/hr | s per clip (claim / x3 / x10 or alt) | Rs per clip | 48 h rental, incl 18% GST | clips in 48 h |
|---|---|---|---|---|---|---|
| LTX-Video 13B 0.9.8 distilled (HD) | E2E H100 spot (India) | 70 | 10 / 30 / 100 | 0.19 / 0.58 / 1.94 | Rs3,965 | 17,280 / 5,760 / 1,728 |
| LTX-Video 13B 0.9.8 distilled (HD) | JarvisLabs H100 spot (India) | 146 | 10 / 30 / 100 | 0.41 / 1.22 / 4.05 | Rs8,258 | 17,280 / 5,760 / 1,728 |
| LTX-Video 13B 0.9.8 distilled (HD) | E2E H100 on-demand (India) | 379 | 10 / 30 / 100 | 1.05 / 3.16 / 10.53 | Rs21,469 | 17,280 / 5,760 / 1,728 |
| Wan 2.1 T2V-1.3B (480p, 5 s) | RunPod RTX 4090 community (global) | 32 | 240 / 240 / 360 | 2.16 / 2.16 / 3.24 | Rs1,836 | 720 / 720 / 480 |
| Wan 2.1 T2V-1.3B (480p, 5 s) | E2E L40S 48GB (India) | 102 | 240 / 240 / 360 | 6.80 / 6.80 / 10.20 | Rs5,777 | 720 / 720 / 480 |
| Wan 2.2 TI2V-5B (720p, 5 s) | RunPod RTX 4090 community (global) | 32 | 535 / 535 / 800 | 4.82 / 4.82 / 7.20 | Rs1,836 | 323 / 323 / 216 |
| Wan 2.2 TI2V-5B (720p, 5 s) | E2E L40S 48GB (India) | 102 | 535 / 535 / 800 | 15.16 / 15.16 / 22.67 | Rs5,777 | 323 / 323 / 216 |
| HunyuanVideo 1.5 distilled (480p, image-to-video only) | RunPod RTX 4090 community (global) | 32 | 75 / 75 / 150 | 0.68 / 0.68 / 1.35 | Rs1,836 | 2,304 / 2,304 / 1,152 |
| CogVideoX-2B (480p, 8 fps, 6 s) | JarvisLabs A100 80GB spot (India) | 84 | 90 / 90 / 135 | 2.11 / 2.11 / 3.16 | Rs4,771 | 1,920 / 1,920 / 1,280 |
| CogVideoX-2B (480p, 8 fps, 6 s) | JarvisLabs A100 80GB on-demand (India) | 141 | 90 / 90 / 135 | 3.52 / 3.52 / 5.29 | Rs7,983 | 1,920 / 1,920 / 1,280 |

## API: INR per 5 s clip, cheapest first (USD/INR 93; foreign card markup/GST not included)

| option | USD | Rs per clip | Rs per 100 clips | evidence |
|---|---|---|---|---|
| Wan 2.2 5B 720p, WaveSpeed ($0.05/video) | $0.05 | 4.7 | 465 | primary page via search; Atlas Cloud lists $0.01/s = $0.05 too |
| Wan 2.2 5B 720p, Atlas Cloud ($0.01/s) | $0.05 | 4.7 | 465 | primary page via search; 5 s length assumed |
| LTX-Video 13B 0.9.8 distilled, fal.ai ($0.02/s) | $0.10 | 9.3 | 930 | fal llms.txt via search; older 0.9.7 page is inconsistent ($0.04/s or $0.04/video) |
| Pruna P-Video 720p ($0.02/s) | $0.10 | 9.3 | 930 | UNVERIFIED: resellers only; one lists $0.20/video |
| Wan 2.2 5B 720p, fal.ai ($0.15/video) | $0.15 | 13.9 | 1,395 | fal page (peer B) |
| Hailuo 2.3 Fast (MiniMax) | $0.19 | 17.7 | 1,767 | aggregator only |
| Wan 2.2 A14B 480p, fal.ai ($0.04/s) | $0.20 | 18.6 | 1,860 | fal page (peer B); removed 2027-01-04 |
| Runway Gen-4 Turbo ($0.05/s) | $0.25 | 23.2 | 2,325 | Runway docs (peer B) |
| Hailuo 2.3 (768p, $0.28 per 6 s) | $0.28 | 26.0 | 2,604 | MiniMax page (peer B) |
| Veo 3.1 Fast silent, fal.ai ($0.10/s) | $0.50 | 46.5 | 4,650 | fal page (peer B) |

Break-even: a 48 h E2E H100 spot rental (Rs3,965 incl GST) equals 853 clips of Wan 2.2 5B API (Rs4.65).

Break-even: a 48 h E2E H100 spot rental (Rs3,965 incl GST) equals 426 clips of LTX 13B distilled fal API (Rs9.30).

Notes: compute only, no retries (multiply by 2-4 for accepted clips), no setup time, no idle. Spot can be interrupted.

# 03 Pricing (v2, captured 2026-11-20 by peer B from provider pages). Tax excluded unless stated; almost no page states region or a price date.

## GPU rental (USD/hr unless noted)
| Provider | GPU | Price | Type | Tag |
|---|---|---|---|---|
| E2E Networks (India) | H100 / H200 / L40S / A100 80GB | $3.99 / $5.29 / $1.20 / $2.10 | on-demand, excl. tax. Table is USD even though page title says "from Rs30/hr" | F |
| Yotta Shakti (India) | 1xH100 VM / 1xL40S VM | Rs596 / Rs302 per hr; 8xH100 bare metal Rs428/GPU (term unstated) | on-demand | F, page truncated |
| Neysa (India) | H100 / H200 / L40S | $4.39 / $4.72 / $1.95 "starts at" | not labelled | F |
| JarvisLabs (India) | H100 / H200 / A100 80GB | on-demand $3.49 / $4.59 / $1.49; spot $1.54 / $2.29 / $0.89 | per-second billing | F |
| IndiaAI compute portal | H100 | news says ~Rs92/hr subsidised; **rate card not readable** | approval required | V, conditional |
| RunPod | H100 PCIe / SXM | secure $2.89 / $4.39; community from $1.99 / $2.69 | per-second | F ("Updated November 12, 2026") |
| RunPod | A100 80GB / L40S / RTX 4090 / RTX 5090 | secure $2.09 / $1.09 / $0.89 / $1.39; community $1.19 / $0.79 / $0.34 / $0.69 | per-second | F |
| Lambda | H100 SXM / A100 80GB / B200 | $4.59-4.89 / $3.19 / $7.69-7.99, plus tax | on-demand | F |
| Vast.ai (median of live offers, peer-computed) | H100 / A100 / 4090 / 5090 / L40S | $2.40 / $0.85 / $0.48 / $0.64 / $0.80 | marketplace, small samples | I |
| Modal | H100 / H200 / A100 80GB / L40S | $3.95 / $4.54 / $2.50 / $1.95 | per-second serverless | F |
| AWS / GCP / Azure H100 | | own pages unreadable; AWS capacity block $5.97/GPU-hr; Azure ND H100 v5 ~$12.29/GPU-hr (third-party) | | not verified |

FX: USD/INR 92.95 (XE) and 93.37 (open.er-api), 2026-11-20. Model uses 93.

## Hosted APIs (USD, S1 = 5 s clip)
| Option | Price | Tag |
|---|---|---|
| Wan 2.2 5B, fal.ai | $0.15 per video up to 5 s, 720p | F |
| Wan 2.2 A14B, fal.ai | $0.08/s at 720p ($0.04/s 480p); **page says removed 2027-01-04** | F |
| LTX-2.3 Pro, fal.ai | 1080p only; $0.06 or $0.08/s (page conflicts) | F |
| Hailuo 2.3 (MiniMax) | $0.047/s at 768p, billed per 6 s clip = $0.28; Fast tier $0.19 reported; reportedly moved to legacy list | F / V |
| Runway Gen-4 Turbo / Gen-4.5 | $0.05/s / $0.12/s | F |
| Kling 2.6 Pro / 3.0 Pro via fal.ai | $0.07 / $0.112 per s silent ($0.14 / $0.168 with audio) | F |
| Veo 3.1 Fast / Standard via fal.ai | $0.10 / $0.20 per s silent ($0.15 / $0.40 with audio) | F |
| Veo 3.1 Lite $0.03-0.05/s (aggregators) | Google pages unreadable | V, excluded |
| Sora 2 API | reported sunset 2026-09-24 | V, treat as gone |

**So what:** Indian on-demand H100s ($3.49-6.40/hr) cost more than RunPod's $2.89 secure or $1.99 community; the one exception is JarvisLabs spot at $1.54, which can be interrupted; a consumer GPU on RunPod is 3-10x cheaper per hour than any H100. The only cheap Indian route is the IndiaAI subsidy, and its rate card could not be verified.
**What would prove this wrong:** a readable IndiaAI rate card with approved access under about Rs150/hr, or E2E/Yotta cutting H100 below $2.5/hr.

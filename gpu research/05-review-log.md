# 05 Review log (FR7)

Protocol: author = Claude Sonnet 5.5 (this session). Reviewers ran through `claude -p`: pass 0 on Sonnet, passes A to D on **Opus** (a different tier from the author, satisfying FR7), with web access where stated. Raw output is saved verbatim in `reviews/`. Prompts are saved beside them.

| Pass | Role | File | Input given | Web |
|---|---|---|---|---|
| 0 | Reviewer of the requirements | `reviews/00-requirements-review.md` | requirements v1 | no (Sonnet tier) |
| A | Independent peer, models and GPU timings | `reviews/01-peerA-models.md` | questions only, not the draft | yes |
| B | Independent peer, prices and FX | `reviews/02-peerB-prices.md` | questions only, not the draft | yes |
| C | Reviewer, attacks method and proposes own top 5 | `reviews/03-reviewer-b.md` | requirements, cost model v2, both peer reports | yes (3 spot checks) |
| D | Auditor of the final recommendations | `reviews/04-audit.md` | recommendations, cost model v3, evidence files | no |

## Pass 0: requirements (10 objections, all adopted into v2)
Verdict-first output and a non-self-host baseline slot; cost per accepted video; TCO components; fully defined scenarios; scaling error band; enumerated API baseline; price-eligibility rule; fixed GPU set; licence matrix; mechanical "changes the ranking" test. Resolved: yes, see requirements v2.

## Pass A: corrections to my draft (primary sources)
| My draft said | Peer A found | Resolution |
|---|---|---|
| Wan A14B about 600 s on H100 | README: 1041.5 s on H100/H800 | fixed in model |
| Hunyuan 1.5 "75 s on a 4090" | that is the 480p step-distilled model | demoted to unverified, scaled 2.5-6x (I) |
| LTX about 33 s on H100 (vendor 18x claim) | no primary timing or VRAM figure exists | demoted to unverified; excluded from recommendations |
| LTX might be Apache | weights are LTX Community licence, $10M threshold, watermark | fixed in 01 |
| Wan 2.5-3.0 status unclear | no such repos in Wan-AI / Wan-Video orgs: API only | fixed in 01 |
| Newer models missing | Kandinsky 6.0, SkyReels V3, MiniMax H3, LingBot-Video | listed in 01, not benchmarked (open) |

## Pass B: corrections to my draft (provider pages)
E2E H100 is $3.99 (USD table), not Rs362 from a search summary. JarvisLabs is $3.49 on-demand, not Rs218. RunPod 4090 secure is $0.89 and 5090 secure $1.39. Yotta H100 is Rs596. FX is 93, not 95. Veo 3.1 Lite $0.03-0.05 could not be verified (excluded). Hosted Wan 2.2 A14B at $0.08/s exists and fal removes it on 2027-01-04. IndiaAI rate card unreadable (conditional). All applied in model v3 and 03.

## Pass C: method attack (10 objections)
| # | Objection | Status |
|---|---|---|
| 1 | One shared 50% acceptance hides quality differences | **Resolved in model**: per-option priors (O) plus an "@50% shared" column; still open as a measurement, settled only by the blind test |
| 2 | Top picks rest on unmeasured times | Resolved: marked UNV, none carries a recommendation alone; confidence Low |
| 3 | 60% utilisation does not fit the volume | Resolved: utilisation derived from volume, extra boxes added |
| 4 | Break-even compares different models and omits ops | Resolved: same-model rows, ops included, cross-model rows labelled NO |
| 5 | Engineer time missing | Resolved: $215/month (O) |
| 6 | Distilled Wan A14B missing | Resolved: added as unverified row, becomes #3 |
| 7 | Closed-API baseline uses premium tiers; Hailuo billing minimum | Resolved: per-clip pricing, Gen-4 Turbo and Kling 2.6 added |
| 8 | GST applied unevenly | Resolved: GST excluded everywhere, 2.5% FX markup on foreign providers |
| 9 | Platform risk not priced | Resolved: risk column in the top 5; fal removal date flagged |
| 10 | FX rate fine | No change |
Reviewer also supplied its own top 5 (Wan 5B on fal, Hailuo, distilled Wan A14B, Hunyuan, Veo 3.1 Fast). **My final top 5 contains the same five options and was written after I read its list, so it is not an independent confirmation.** The cost model's own cost ranking differs: it puts Runway Gen-4 Turbo and Kling 2.6 above Veo, and the self-host options below the cheap hosted ones. The choice of Lightning, Hunyuan and Veo for slots 3 to 5 is a judgment about what the benchmark should test, not a cost result.

## Pass D: audit of the recommendations (9 findings)
| # | Finding | Resolution |
|---|---|---|
| 1 | "Never breaks even" overclaimed; LTX rows contradicted it; 3,300 not in the model | Fixed: claim limited to the verified Wan rows; cross-model and LTX rows added to the model and labelled not like-for-like |
| 2 | Runway Gen-4 Turbo and Kling 2.6 omitted without reason | Fixed: listed under "Dropped" as viable swaps |
| 3 | Experiment budget mis-summed | Fixed: about $150 / Rs14k; kill-test cost corrected to about $22 |
| 4 | Experiment cannot test #3's kill condition | Fixed: full A14B run added |
| 5 | India claim contradicted by JarvisLabs spot $1.54 | Fixed: exception stated in 03 and recommendations |
| 6 | Two Medium confidences too high | Fixed: #1 and #2 now Low-Medium |
| 7 | "Generation time barely matters" overclaimed | Fixed: it matters through box count |
| 8 | "40 steps" unsupported | Fixed: renamed "default sampler", noted as open |
| 9 | Several figures not traceable | Fixed: utilisation figure recomputed from the model; Lightning range tagged I; Hailuo Fast tagged V |

## Open objections that could still change the ranking
1. Acceptance priors are opinions; the blind test replaces them. Could reorder #1, #2 and #5.
2. Lightning and Hunyuan-720p timings are unverified; the benchmark measures them.
3. The two peers and the reviewers share a model family with the author, so correlated blind spots are possible; the benchmark is the only truly independent check.

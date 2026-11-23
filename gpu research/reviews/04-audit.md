1. **The verdict's break-even claim goes further than the model.** "The same model on a rented GPU never breaks even with its hosted version within 20,000 clips a month" holds only for the Wan rows. The model's break-even table shows LTX self-host breaking even at 750 (Modal), 1,800 (5090) and 4,500 (E2E). "Self-hosting only starts to win above roughly 3,300" also contradicts the doc's own #4, which beats Wan 5B at about 2,100. And 3,300 is not in the model output at all: Lightning has no break-even row, so the figure is derived (I).

2. **Top 5 leaves out two cheaper hosted options without saying why.** Runway Gen-4 Turbo is rank 2 at $0.36, tagged F, with a robust 3/2/4 rank swing. Kling 2.6 Pro is rank 4 at $0.44. Neither is in the top 5 or under "Dropped", yet Veo ($0.59, rank 7) makes the list.

3. **The experiment cost doesn't match its own parts.** $45 + $9 + $47 = $101, which is Rs9.4k at Rs93, not "Rs10-12k". This appears in both the verdict and the heading. The #1 kill test's "about $8" covers only the Wan prompts. It also needs Hailuo for 50 prompts, which adds $14, so about $22.

4. **The experiment can't run #3's kill test.** #3 fails on "blind acceptance below the full model's", but the eight setups include no full Wan A14B run, on a GPU or on fal.

5. **The India claims are contradicted by the pricing file.** JarvisLabs spot H100 is $1.54/hr, below RunPod community at $1.99. That conflicts with "India is not the cheap place to rent" and "every Indian provider… 1.2-3x". The "1.2-3x" range also switches between the secure ($2.89) and community ($1.99) baselines.

6. **Two "Medium" confidences are too high.**
   - Hailuo (#2): the Fast price is tagged V, there is a legacy-list risk, and its 2/1/6 rank swing fails the model's own ">3 places = not robust" rule.
   - Wan 5B (#1): its 8/3/1 swing also fails that rule, and its cost rests on an assumed (O) 35% acceptance. Low-Medium fits both.

7. **"Generation time barely matters" is an overclaim.** In the model, full A14B costs $2.27 against $1.19 for Lightning at 2,000 clips, and $2.21 against $0.48 at 5,000. Slower generation adds boxes.

8. **"Full 40 steps" isn't supported.** 02-gpu-mapping says the steps and precision for the 1041.5 s run are "not stated". The 40-step figure is an assumption.

9. **These figures don't trace to any file provided:**
   - 11% utilisation and "2-5x pricier"
   - Lightning "about 80-200 s"; the evidence has only 79 s on an H200
   - "Wan 2.5 and later are API-only"
   - the Hunyuan and LTX licence terms
   - Hailuo Fast at $0.19, which appears in the doc without its V tag

**Checks that passed:** all top-5 USD and Rs figures, the volume rows, the dropped-option costs, the @50% numbers ($0.30 and $1.00), the Veo 3.3x / 30% arithmetic, the GPU timings and VRAM figures, the API spend of $47, and "about six weeks" to 2027-01-04.

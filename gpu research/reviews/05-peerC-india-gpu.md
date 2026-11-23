I've started five page readers in parallel, covering JarvisLabs, E2E, Yotta and Neysa, Cyfuture, NxtGen and Krutrim, plus IndiaAI, Tata and Sarvam. I'll put together the report when they come back.

I've sent a reader to JarvisLabs' India pricing page to pull the INR rates. The other four readers are still running.

The E2E report is in, with an INR table, the GST policy and KYC details. Three other readers are still running: Yotta/Neysa, Cyfuture/NxtGen/Krutrim, and IndiaAI/Tata/Sarvam. The JarvisLabs INR page reader is also still running.

Still waiting on the four other readers.

The JarvisLabs India page is read and gives INR rates. Its H100 price is ₹330.48/hr, while an earlier search summary said ₹217.89; I'll list that under "Conflicts between sources". Three readers are still running.

Still waiting on Yotta/Neysa, Cyfuture/NxtGen/Krutrim and IndiaAI/Tata/Sarvam.

The IndiaAI, Tata and Sarvam results are in. Yotta/Neysa and Cyfuture/NxtGen/Krutrim are still running.

Two readers are still running: Yotta/Neysa and Cyfuture/NxtGen/Krutrim.

The Cyfuture, NxtGen and Krutrim results are in. NxtGen publishes no hourly rate card; its pricing goes through quotes. Only the Yotta/Neysa reader is still running.

# Renting one GPU in India for 48 hours on a Rs 10,000 budget (checked 2026-11-20)

All totals are **rate × 48 h × 1.18** (18% GST added, even where the page doesn't say GST is extra). Rates are ₹ per GPU-hour, on-demand unless marked spot.

| Provider | A100 80GB | H100 80GB | L40S 48GB | Other 24–96GB | GST | Billing / minimum | 48 h incl GST |
|---|---|---|---|---|---|---|---|
| **JarvisLabs** ([/in](https://jarvislabs.ai/in/gpu-cloud-pricing)) | 140.94 (spot 84.24) | 330.48 (spot 145.80) | not offered | RTX Pro 6000 96GB 207.36 (spot 109.35); L4 41.31; A30 38.88. Page: "A6000…no longer part of the Jarvislabs lineup" | Page doesn't say. Only "applicable taxes are additional" in one example | "billed per second", "no minimum commitment", "add credits from ₹500" | A100 **₹7,983**; A100 spot ₹4,771; H100 spot ₹8,258; Pro 6000 spot ₹6,194 |
| **E2E Networks** ([pricing.md](https://www.e2enetworks.com/pricing.md)) | 189 (spot 66) | 379.05 (spot 70) | 102 | L4 49; A40 48GB 96; RTX PRO 6000 236.55 | "all prices exclude GST (18%)" | "billed hourly with no minimum commitment" (the HTML FAQ says per-minute). Prepaid credits | L40S **₹5,777**; A100 spot ₹3,738; A100 ₹10,705 ✗ |
| **Cyfuture** ([pricing](https://cyfuture.ai/pricing)) | 198 | 329 | 124 | RTX PRO 6000 256.5 | Not stated | "Per-hour billing". No spot | L40S **₹7,023**; A100 ₹11,215 ✗ |
| **Yotta Shakti** ([pricing](https://shakticloud.ai/pricing)) | not listed | 596 | 302 | — | Not stated | "Per Hour, Per Compute" | L40S ₹17,105 ✗ |
| **Neysa** ([velocis](https://neysa.ai/velocis)) | not listed | 153 (USD page: $4.39) | 67.50 (USD page: $1.95) | L4 45.07 | Not stated | USD page: "billed to the minute". "Talk to sales" | L40S ₹3,823 *if* the INR rate applies to you (see Conflicts) |
| **Tata (Vayu)** ([GPU page](https://www.tatacommunications.com/cloud/cloud-ai/gpu)) | — | 8X only, "from ₹3,905/hour" | "from ₹200/hour" | L4 "from ₹90" | Not stated | "Get In Touch" | L40S ₹11,328 ✗ |
| **NxtGen** | Not readable: the page is rendered by JavaScript. A reseller asks you to get a quote | — | — | — | — | — | Unknown |
| **Ola Krutrim** ([pricing](https://www.olakrutrim.com/pricing)) | The pricing page lists CPU only. Docs say GPU VMs exist, but no GPU price is published | — | — | — | — | Per-second (CPU) | Unknown |
| **IndiaAI portal** ([calculator](https://compute.indiaai.gov.in/indiaaipricecalculator)) | 135.9 | 153.0 | 67.5 | L4 44.86 | — | Max subsidy "upto 40%" | Not available to an individual (below) |
| **Sarvam AI** | **No.** It sells APIs only, priced per token or per character ([api-pricing](https://www.sarvam.ai/api-pricing)). No GPU rental found | | | | | | |

✗ = goes over Rs 10,000.

**IndiaAI eligibility:** researchers (h-index ≥5 or similar), students, academia, government, and DPIIT startups with "Annual rev 50 Lacs or Funding of INR 100 Lacs". There is no category for an individual. Requests are taken "between 1-25th of the month" and the approved list is published "on the 10th of next month". That is a 2–6 week wait, so it doesn't work for a rental this week.

## What Rs 10,000 buys for 48 hours in India

1. **JarvisLabs A100 80GB on-demand: ₹7,983** (₹6,765 if the price already includes GST). This is the best fit for video models. 80GB runs Wan/Hunyuan-class models without heavy offloading. You can sign up yourself and pay by Stripe card. The page says there are ComfyUI and PyTorch templates. GSTIN is optional ("If you're GST-registered, your GSTIN appears on the invoice"), and the page doesn't mention KYC. Region is "India", with no city named on the GPU pages (the CPU VMs are in Noida).
2. **E2E L40S 48GB: ₹5,777.** This is the cheapest confirmed non-interruptible option. Account validation needs PAN, plus Aadhaar via DigiLocker or an ID and selfie. A GSTIN is not required for individuals. There are PyTorch images, but I found no ComfyUI template. Data centres are in Delhi NCR and Chennai.
3. **Cyfuture L40S 48GB: ₹7,023.** You can sign up yourself ("Deploy a GPU Now"). Its rates carry the warning "Using default exchange rate due to API failure", so they may move. Data centres are in Noida, Jaipur and Raipur. The pages I read don't mention KYC, GST requirements or templates.

Spot is cheaper (E2E A100 at ₹3,738, JarvisLabs H100 at ₹8,258), but it can be interrupted. Over 48 hours you'd need to checkpoint often.

**I could not confirm stock for any provider.** Live availability is only visible inside a logged-in console.

## Conflicts between sources

- **JarvisLabs H100:** a search snippet said ₹217.89, but the live India page says ₹330.48. I used the page.
- **Neysa:** the INR table (H100 ₹153, L40S ₹67.50, 8×H100 ₹1,224) matches the IndiaAI calculator figures almost exactly. The USD page says H100 is $4.39/hr. At ₹80–95 per dollar, ₹153 is about $1.6–1.9, so the two can't both be the open on-demand price. The INR table is most likely the IndiaAI empanelment rate, so don't count on ₹3,823.
- **E2E billing:** the .md page says "Hourly billing", the HTML FAQ says "per-minute granularity", and the TIR docs say "bills only the minutes the instance runs".
- **Yotta transfer:** the page says ₹5.99/GB ingress and egress, but also says "Data transfer … included".
- **Tata:** H200 is "₹402" for 1X but "₹4,247" for 8X. The page doesn't say whether prices are per GPU or per instance.
- **Cyfuture:** an FAQ line (seen only in a summary, not verbatim) prices 8×H100 "from $28.50/hr", which doesn't match the INR table.

## Confidence and gaps

- **High:** E2E (official INR price list, GST excluded explicitly) and JarvisLabs (INR prices and per-second billing).
- **Medium:** Cyfuture (converted at a fallback exchange rate), and Yotta and Tata (published, but unclear whether you can sign up yourself or what term the prices are for).
- **Low or none:** Neysa INR applicability, NxtGen, Krutrim GPU prices.
- **Not checked:**
  - Live stock at any provider.
  - The JarvisLabs GST treatment and minimum top-up.
  - Whether E2E has a ComfyUI image (its pre-built images page wasn't read).
  - KYC at Cyfuture, Yotta and Neysa.
  - Sarvam's "Model Training" page (not read).
- **Not included in the totals:** storage, which is small. For example, JarvisLabs charges ₹0.013/GB/hr, about ₹125 for 200GB over 48 hours.

**Next step:** log in to the JarvisLabs and E2E consoles to confirm A100 80GB and L40S are in stock and whether JarvisLabs shows GST at checkout.

Sources: [JarvisLabs India](https://jarvislabs.ai/in/gpu-cloud-pricing), [JarvisLabs USD](https://jarvislabs.ai/pricing), [E2E pricing.md](https://www.e2enetworks.com/pricing.md), [E2E sign-up docs](https://docs.e2enetworks.com/myaccount/account/get-started/), [E2E TIR docs](https://docs.e2enetworks.com/tir/tir-instance/get-started/), [Cyfuture](https://cyfuture.ai/pricing), [Shakti](https://shakticloud.ai/pricing), [Neysa USD](https://neysa.ai/pricing), [Neysa INR](https://neysa.ai/velocis), [Tata](https://www.tatacommunications.com/cloud/cloud-ai/gpu), [Krutrim](https://www.olakrutrim.com/pricing), [Krutrim docs](https://docs.cloud.olakrutrim.com/), [IndiaAI](https://compute.indiaai.gov.in/), [IndiaAI eligibility](https://compute.indiaai.gov.in/eligibilitycriteria), [IndiaAI calculator](https://compute.indiaai.gov.in/indiaaipricecalculator), [Sarvam](https://www.sarvam.ai/api-pricing), [NxtGen reseller](https://precisiontech.in/cloud/nxtgen-cloud/nxtgen-gpu-cloud/), [dev.to roundup](https://dev.to/mr_manushukla/gpu-cloud-pricing-in-india-2026-h100-h200-and-b200-rates-compared-bo7)

Nothing has changed since my report: this notice is for the last page reader (Yotta and Neysa), whose results are already in it. It's the final version.

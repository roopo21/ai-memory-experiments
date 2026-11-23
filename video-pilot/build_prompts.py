#!/usr/bin/env python3
"""Pilot prompt builder: 6 exercises x 4 themes x 4 takes = 96 clips. Deterministic, spends nothing.
Prompt = theme block + camera/script block + constraints. Visual scripts were drafted from the exercise steps in
anatomy-explorer/src/data/guides and MUST be checked by the author (side wording especially) before any run."""
import csv, json
from pathlib import Path

THEMES = {
 "studio-dark":  "Photorealistic studio video. Plain dark charcoal background, soft key light. One adult wearing plain fitted grey athletic clothing.",
 "studio-light": "Photorealistic studio video. Plain light off-white background, bright even lighting. One adult wearing plain fitted grey athletic clothing.",
 "flat-illustration": "Flat vector illustration animation. Simple clean shapes, faceless figure, muted blue-grey palette, plain background, no shading.",
 "wooden-mannequin": "3D render of a smooth wooden artist's mannequin with no face, plain neutral studio background, soft lighting.",
}
CONSTRAINTS = ("Exactly one figure, full body in frame. Static camera, no cuts, no camera movement. "
               "Slow, controlled movement at a calm pace. Realistic human proportions and joint movement. No text, logos or captions.")
NEGATIVE = "extra limbs, extra fingers, distorted hands, mirrored movement, text, watermark, camera shake, cuts, multiple people"

# id, name, kind, position, equipment, view, visual script (author to check; side stated explicitly)
EXERCISES = [
 ("overhead-side-bend", "Standing overhead side bend", "stretch", "standing", [], "front view",
  "Front view. The person stands with feet hip-width apart, both feet flat and evenly weighted. They raise the right arm straight overhead, then slowly lean the upper body to the left, keeping the trunk in one plane with no tipping forward or back. They hold the lean, then return upright."),
 ("neck-side-bend", "Neck side bend (ear to shoulder)", "stretch", "seated", ["chair"], "front view",
  "Front view, upper body and chair visible. The person sits upright on a chair with the left hand gripping the side of the seat. They slowly tilt the head toward the right shoulder with the nose pointing forward, the left shoulder staying down. They hold, then return upright."),
 ("supine-hamstring", "Supine hamstring stretch", "stretch", "lying", [], "side view",
  "Side view. The person lies on their back on a mat. They bring the right knee toward the chest and clasp both hands behind the right thigh below the knee. They slowly straighten the right leg upward and draw it toward the head until the leg is long. The left leg stays flat on the floor. They hold, then lower."),
 ("kneeling-hip-flexor", "Half-kneeling hip flexor stretch", "stretch", "kneeling", [], "side view",
  "Side view. The person is half-kneeling on a mat: left knee on the floor, right foot flat in front with the right knee bent to about 90 degrees, trunk upright. They tuck the tailbone under, then slowly shift the hips forward while the trunk stays upright. They hold, then return."),
 ("doorway-pec", "Doorway chest stretch", "stretch", "standing", ["doorway"], "front three-quarter view",
  "Front three-quarter view. The person stands inside an open doorway with both forearms resting vertically on the door frame, elbows bent at shoulder height. The right foot steps forward through the doorway. They lean the chest gently forward, forearms staying on the frame. They hold, then return."),
 ("median-gentle-slider", "Gentle median nerve slider", "glide", "seated", [], "front view, hand clearly visible",
  "Front view, upper body, right hand clearly visible. The person sits tall with the right elbow bent to 90 degrees at the side and the palm facing up. They bend the right wrist and fingers backward while tilting the head toward the right shoulder. Then they curl the wrist and fingers forward while the head returns to the middle. They repeat smoothly between the two positions."),
]
TAKES = 4

rows = []
for eid, name, kind, pos, eq, view, script in EXERCISES:
    for tid, tblock in THEMES.items():
        prompt = f"{tblock} {script} {CONSTRAINTS}"
        for t in range(1, TAKES + 1):
            rows.append(dict(clip_id=f"{eid}__{tid}__take-{t:02d}", exercise_id=eid, kind=kind, position=pos,
                             equipment=",".join(eq), theme=tid, take=t, prompt=prompt, negative_prompt=NEGATIVE))
here = Path(__file__).parent
(here / "prompts.jsonl").write_text("\n".join(json.dumps(r) for r in rows) + "\n")
cols = ["clip_id", "model", "provider", "seed", "cost_inr", "side_ok", "poses_ok", "setting_ok", "motion_ok", "artifacts_ok",
        "framing_ok", "paced_ok", "approvable", "review_seconds", "notes"]
with open(here / "scoring-sheet.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(cols)
    for r in rows: w.writerow([r["clip_id"]] + [""] * (len(cols) - 1))
print(len(rows), "clips;", len(rows) // TAKES, "unique prompts")
print("\nSAMPLE:", rows[0]["clip_id"], "\n", rows[0]["prompt"], "\nNEG:", rows[0]["negative_prompt"])

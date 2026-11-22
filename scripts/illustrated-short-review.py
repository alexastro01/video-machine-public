"""Capture encoded cut boundaries and selected story frames for visual review."""
import argparse
import json
import math
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("episode")
parser.add_argument("file", type=Path)
parser.add_argument("--at", default="")
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
timeline = json.loads((ROOT / "episodes" / args.episode / "timeline.json").read_text())
probe = json.loads(subprocess.check_output([
    "ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
    "stream=nb_frames,avg_frame_rate", "-of", "json", str(args.file.resolve())
]))["streams"][0]
a, b = map(int, probe["avg_frame_rate"].split("/"))
fps, count = a / b, int(probe["nb_frames"])
cuts = []
for shot in timeline["shots"][1:]:
    frame = math.ceil(shot["start"] * fps - 1e-8)
    if 0 < frame < count:
        cuts.extend([frame - 1, frame, min(frame + 1, count - 1)])
beats = [0, count - 1]
beats.extend(round(float(t) * fps) for t in args.at.split(",") if t)
beats = sorted(set(n for n in beats if 0 <= n < count))
frames = sorted(set(cuts + beats))
args.output.mkdir(parents=True, exist_ok=True)
expression = "+".join(f"eq(n\\,{n})" for n in frames)
subprocess.run([
    "ffmpeg", "-v", "error", "-y", "-i", str(args.file.resolve()),
    "-vf", "select=" + expression, "-fps_mode", "vfr", "-frames:v", str(len(frames)),
    str(args.output / "capture-%03d.png")
], check=True)
paths = dict(zip(frames, sorted(args.output.glob("capture-*.png"))))
if len(paths) != len(frames):
    raise ValueError("Encoded review did not capture all requested frames")
font = ImageFont.truetype(str(ROOT / "public/fonts/dmsans.ttf"), 17)
sheets = []
for group, selected in [("cuts", cuts), ("beats", beats)]:
    for offset in range(0, len(selected), 9):
        subset = selected[offset:offset + 9]
        rows = math.ceil(len(subset) / 3)
        sheet = Image.new("RGB", (3 * 336, rows * 625), "#17262e")
        draw = ImageDraw.Draw(sheet)
        for i, n in enumerate(subset):
            x, y = i % 3 * 336, i // 3 * 625
            with Image.open(paths[n]) as image:
                sheet.paste(image.convert("RGB").resize((336, 597), Image.Resampling.LANCZOS), (x, y + 28))
            draw.text((x + 5, y + 3), f"f{n} / {n / fps:.3f}s", font=font, fill="white")
        target = args.output / f"encoded-{group}-{offset // 9 + 1}.jpg"
        sheet.save(target, quality=95)
        sheets.append(str(target))
report = {"file": str(args.file.resolve()), "fps": fps, "frames": count,
          "capturedFrames": frames, "cutFrames": cuts, "beatFrames": beats, "sheets": sheets}
(args.output / "review.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report))

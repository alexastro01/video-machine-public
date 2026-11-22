"""Inspect every encoded frame and export motion strips for human review."""
from pathlib import Path
import argparse
import hashlib
import json
import math
import subprocess

import numpy as np
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument("--name", default="full-stack-subscriber-v1")
parser.add_argument("--version", default="v1")
args = parser.parse_args()
assert all("/" not in s and "\\" not in s and ".." not in s for s in [args.name, args.version])
root = Path(__file__).resolve().parents[1]
episode = root / "episodes/full-stack-subscriber"
video = root / "renders/full-stack-subscriber" / (args.name + ".mp4")
out = video.parent / ("encoded-" + args.version)
out.mkdir(exist_ok=True)
edit = json.loads((episode / "edit.json").read_text())
events = edit["events"]
fps = edit["fps"]
expected_frames = round(edit["duration"] * fps)


def run(command):
    return subprocess.run(command, capture_output=True, check=True).stdout


raw = run(["ffmpeg", "-v", "error", "-i", str(video), "-vf", "scale=96:170", "-pix_fmt", "rgb24", "-f", "rawvideo", "-"])
pixels = np.frombuffer(raw, np.uint8).reshape(-1, 96 * 170, 3)
spatial_std = pixels.std(axis=1).mean(axis=1)
uniform_frames = np.flatnonzero(spatial_std < 1.5).tolist()


def strip(name, times, columns=5, width=216):
    folder = out / name
    folder.mkdir(exist_ok=True)
    seen = set()
    samples = []
    for label, time in times:
        frame = min(expected_frames - 1, max(0, round(time * fps)))
        if frame not in seen:
            samples.append((label, frame))
            seen.add(frame)
    frames = sorted(frame for _, frame in samples)
    expression = "+".join(f"eq(n,{frame})" for frame in frames)
    height = round(width * 16 / 9)
    run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-vf", f"select='{expression}',scale={width}:{height}", "-fps_mode", "vfr", str(folder / "frame-%03d.png")])
    files = sorted(folder.glob("frame-*.png"))
    assert len(files) == len(frames)
    lookup = dict(zip(frames, files))
    contact = Image.new("RGB", (width * columns, math.ceil(len(samples) / columns) * (height + 27)), "#edf0f2")
    draw = ImageDraw.Draw(contact)
    for index, (label, frame) in enumerate(samples):
        x = index % columns * width
        y = index // columns * (height + 27)
        contact.paste(Image.open(lookup[frame]), (x, y))
        draw.text((x + 5, y + height + 4), f"{label} {frame / fps:.2f}s", fill="#20242b")
    contact.save(out / (name + ".jpg"), quality=95)
    (folder / "frames.json").write_text(json.dumps([
        {"label": label, "frame": frame, "time": frame / fps, "file": str(lookup[frame].relative_to(root))}
        for label, frame in samples
    ], indent=2) + "\n")


strip("scenes", [(shot["id"], shot["start"] + min(.5, shot["duration"] / 2)) for shot in edit["shots"]], 4, 270)
strip("opening", [(str(i), i * .25) for i in range(29)])
strip("clock", [(str(i), events["clockMove"] - .2 + i * .1) for i in range(13)])
strip("trial-billing", [(str(i), events["upgrade"] - .3 + i * .12) for i in range(26)])
strip("compare", [(str(i), events["compareMove"] - .2 + i * .12) for i in range(19)])
strip("inventory", [(str(i), events["inventory"] - .15 + i * .3) for i in range(24)])
for side, start in [("in", events["limit_again"] - .1), ("out", events["inventory"] - .3)]:
    strip("portrait-" + side, [(str(i), start + i * .1) for i in range(13)])
strip("ending", [(str(i), events["cv_title"] - .2 + i * .12) for i in range(math.ceil((edit["duration"] - events["cv_title"] + .2) / .12))])

probe = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(video)]))
vstream = next(s for s in probe["streams"] if s["codec_type"] == "video")
astream = next(s for s in probe["streams"] if s["codec_type"] == "audio")
minimum_frame = int(spatial_std.argmin())
minimum_image = out / "minimum-variation.png"
run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-vf", f"select='eq(n,{minimum_frame})'", "-frames:v", "1", str(minimum_image)])
proof = {
    "video": str(video.relative_to(root)),
    "sha256": hashlib.sha256(video.read_bytes()).hexdigest(),
    "decodedFrames": len(pixels),
    "expectedFrames": expected_frames,
    "nearUniformFrameThreshold": 1.5,
    "minimumMeanChannelSpatialStd": float(spatial_std.min()),
    "nearUniformFrames": uniform_frames,
    "lowSpatialDetailReviewThreshold": 25,
    "lowSpatialDetailFramesRequiringInspection": np.flatnonzero(spatial_std < 25).tolist(),
    "minimumVariationFrame": {"frame": minimum_frame, "time": minimum_frame / fps, "evidence": str(minimum_image.relative_to(root))},
    "dimensions": [vstream["width"], vstream["height"]],
    "fps": vstream["avg_frame_rate"],
    "audioCodec": astream["codec_name"],
    "sampleRate": astream["sample_rate"],
    "frameEvidence": str(out.relative_to(root)),
    "scope": "Every encoded frame checked for missing/uniform picture. Selected motion strips require visual inspection. Pixel variation is diagnostic, not an aesthetic score.",
}
assert len(pixels) == expected_frames
assert not uniform_frames
(episode / ("export-review-" + args.version + ".json")).write_text(json.dumps(proof, indent=2) + "\n")
print(json.dumps({key: proof[key] for key in ["video", "decodedFrames", "expectedFrames", "minimumMeanChannelSpatialStd", "nearUniformFrames", "dimensions", "frameEvidence"]}))

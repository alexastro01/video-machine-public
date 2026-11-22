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
parser.add_argument("--name", default="ai-review-loop-v4")
parser.add_argument("--version", default="v4")
args = parser.parse_args()
assert all("/" not in s and "\\" not in s and ".." not in s for s in [args.name, args.version])
root = Path(__file__).resolve().parents[1]
episode = root / "episodes/ai-review-loop"
video = root / "renders/ai-review-loop" / (args.name + ".mp4")
out = video.parent / ("encoded-" + args.version)
out.mkdir(exist_ok=True)
snapshot_edit = episode / "versions" / args.version / "episodes/ai-review-loop/edit.json"
edit = json.loads((snapshot_edit if snapshot_edit.exists() else episode / "edit.json").read_text())
events = edit["events"]
fps = edit["fps"]
expected_frames = round(edit["duration"] * fps)


def run(command):
    return subprocess.run(command, capture_output=True, check=True).stdout


raw = run(["ffmpeg", "-v", "error", "-i", str(video), "-vf", "scale=96:170", "-pix_fmt", "rgb24", "-f", "rawvideo", "-"])
pixels = np.frombuffer(raw, np.uint8).reshape(-1, 96 * 170, 3)
spatial_std = pixels.std(axis=1).mean(axis=1)
uniform_frames = np.flatnonzero(spatial_std < 1.5).tolist()
near_black_fraction = (pixels.max(axis=2) < 5).mean(axis=1)
partial_black_frames = np.flatnonzero(near_black_fraction > .02).tolist()


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
strip("simplify", [(str(i), events["opusEdit"] - .1 + i * .08) for i in range(13)])
strip("modules", [(str(i), events["geminiEdit"] - .1 + i * .08) for i in range(13)])
strip("restore", [(str(i), events["astraEdit"] - .1 + i * .08) for i in range(13)])
handoff_start = events["fastHandoffs"][-1]["at"]
if "glance" in events:
    handoff_start = events["loopEnd"]
    strip("glance", [(str(i), events["glance"] - .18 + i / 30) for i in range(24)])
    strip("merge", [(str(i), events["hoverStart"] - .12 + i * .14) for i in range(23)])
    strip("pacing", [
        ("Opening", .32), ("Too simple", events["glance"] + .25),
        ("CurrencyFactory", events["modules"][1] + .34), ("Original restored", events["astraEdit"] + .32),
        ("Merge hover", events["hoverOver"] + .35), ("Withdraw", events["hoverLeave"] + .22),
        *[(h["role"].title(), h["contact"] + .23) for h in events["fastHandoffs"]],
        ("Zero changes", events["diffReveal"] + .32), ("Three hours", events["hoursNumber"] + .5),
        ("Much cleaner", events["cleaner"] + .8),
    ], 4, 270)
strip("carousel", [(str(i), events["loopStart"] - .1 + i * .1) for i in range(math.ceil((events["loopEnd"]-events["loopStart"]+.3)*10))])
strip("handoff", [(str(i), handoff_start - .15 + i / 30) for i in range(31)])
strip("comparison", [(str(i), events["compare"] - .1 + i * .12) for i in range(23)])
strip("ending", [(str(i), events["hours"] - .1 + i * .18) for i in range(math.ceil((edit["duration"] - events["hours"] + .1) / .18))])

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
    "partialBlackFrameThreshold": .02,
    "maximumNearBlackPixelFraction": float(near_black_fraction.max()),
    "partialBlackFrames": partial_black_frames,
    "lowSpatialDetailReviewThreshold": 25,
    "lowSpatialDetailFramesRequiringInspection": np.flatnonzero(spatial_std < 25).tolist(),
    "minimumVariationFrame": {"frame": minimum_frame, "time": minimum_frame / fps, "evidence": str(minimum_image.relative_to(root))},
    "dimensions": [vstream["width"], vstream["height"]],
    "fps": vstream["avg_frame_rate"],
    "audioCodec": astream["codec_name"],
    "sampleRate": astream["sample_rate"],
    "frameEvidence": str(out.relative_to(root)),
    "scope": "Every encoded frame checked for missing/uniform picture and large black capture bands in this light-background film. Selected motion strips require visual inspection. Pixel variation is diagnostic, not an aesthetic score.",
}
assert len(pixels) == expected_frames
assert not uniform_frames
assert not partial_black_frames, f"Partial black browser captures: {partial_black_frames}"
(episode / ("export-review-" + args.version + ".json")).write_text(json.dumps(proof, indent=2) + "\n")
print(json.dumps({key: proof[key] for key in ["video", "decodedFrames", "expectedFrames", "minimumMeanChannelSpatialStd", "nearUniformFrames", "dimensions", "frameEvidence"]}))

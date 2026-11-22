"""Decode a delivered short, check dimensions/frames/audio, and compare its end frames."""
import hashlib
import json
import re
import subprocess
import argparse
import math
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("file", type=Path)
parser.add_argument("--episode", default="time-speeds-up")
parser.add_argument("--speed", type=float, default=1.0)
args = parser.parse_args()
if not math.isfinite(args.speed) or args.speed <= 0:
    parser.error("speed must be positive and finite")
if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", args.episode):
    parser.error("episode must be a lowercase episode slug")
EP = ROOT / "episodes" / args.episode
T = json.loads((EP / "timeline.json").read_text())
FILE = args.file.resolve()
OUT = FILE.parent
expected_duration = T["duration"] / args.speed
expected_frames = round(expected_duration * T["fps"])
probe = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(FILE)]))
video = next(s for s in probe["streams"] if s["codec_type"] == "video")
audio = next(s for s in probe["streams"] if s["codec_type"] == "audio")
if (video["width"], video["height"]) != (1080, 1920):
    raise ValueError("Wrong portrait delivery dimensions")
if abs(float(probe["format"]["duration"]) - expected_duration) > .05:
    raise ValueError("Delivery duration differs from the story timeline")
proc = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(FILE), "-vf", "scale=72:128:flags=area",
                         "-pix_fmt", "rgb24", "-f", "rawvideo", "pipe:1"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
first, last, frames, minimum, uniform = None, None, 0, 999, []
while True:
    raw = proc.stdout.read(72 * 128 * 3)
    if not raw:
        break
    if len(raw) != 72 * 128 * 3:
        raise RuntimeError("Incomplete decoded frame")
    image = np.frombuffer(raw, np.uint8).reshape(128, 72, 3)
    if first is None:
        first = image.copy()
    last = image.copy()
    deviation = float(image.std(axis=(0, 1)).mean())
    minimum = min(minimum, deviation)
    if deviation < 4:
        uniform.append(frames)
    frames += 1
error = proc.stderr.read().decode()
if proc.wait() or error:
    raise RuntimeError(error)
if frames != expected_frames or uniform:
    raise RuntimeError(f"Frame count or blank-frame check failed: {frames}, {uniform[:12]}")
log = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(FILE), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
(OUT / f"final-audio-{FILE.stem}.log").write_text(log)
summary = log.rsplit("Summary:", 1)[-1]
lufs = re.search(r"I:\s*(-?[\d.]+) LUFS", summary)
peak = re.search(r"Peak:\s*(-?[\d.]+) dBFS", summary)
result = {"file": str(FILE), "episode": args.episode, "speed": args.speed, "sha256": hashlib.sha256(FILE.read_bytes()).hexdigest(), "sizeBytes": FILE.stat().st_size,
          "duration": float(probe["format"]["duration"]), "frames": frames, "fps": video["avg_frame_rate"],
          "width": video["width"], "height": video["height"], "videoCodec": video["codec_name"],
          "audioCodec": audio["codec_name"], "audioSampleRate": audio["sample_rate"], "pixelFormat": video["pix_fmt"],
          "colorSpace": video.get("color_space"), "decodedWithoutErrors": True, "uniformFrames": uniform,
          "minimumSpatialDeviation": minimum, "firstLastFrameMeanAbsoluteDifference": float(abs(first.astype(float) - last.astype(float)).mean()),
          "integratedLufs": float(lufs.group(1)) if lufs else None, "truePeakDbfs": float(peak.group(1)) if peak else None,
          "soundVerification": "Measured; exact selected speech was independently transcribed. Not listened to.", "userApproved": False}
(OUT / f"verification-{FILE.stem}.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))

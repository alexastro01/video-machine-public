"""Package saved, explicit-timing native actions without using browser GIF playback."""
import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageSequence

ROOT = Path(__file__).resolve().parents[1]
EP = ROOT / "episodes/where-did-my-year-go"
PUB = ROOT / "public/episodes/where-did-my-year-go"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--partial", action="store_true")
args = parser.parse_args()


def ff(*args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *map(str, args)], check=True)


for job in json.loads((EP / "image-jobs.json").read_text()):
    source = ROOT / job["output"]
    if source.exists():
        shutil.copy2(source, PUB / "art" / (job["id"] + ".png"))
    elif not args.partial:
        raise FileNotFoundError(source)

metadata = {}
font = ImageFont.truetype(str(ROOT / "public/fonts/dmsans.ttf"), 18)
for job in json.loads((EP / "gif-jobs.json").read_text()):
    source = ROOT / job["output"]
    if not source.exists():
        if args.partial:
            continue
        raise FileNotFoundError(source)
    im = Image.open(source)
    frames = [f.convert("RGB") for f in ImageSequence.Iterator(im)]
    if len(frames) != job["frames"]:
        raise ValueError(f"Native frame count differs for {job['id']}")
    if im.size != (512, 912):
        raise ValueError(f"Inspect unexpected native packing for {job['id']}: {im.size}")
    if job.get("recoverCellWidth"):
        # A returned GIF may cut windows wider than its actual generated cells.
        # Recover those cells from each four-window row, retaining original poses.
        recovered = []
        cell = job["recoverCellWidth"]
        for row in range(3):
            strip = Image.new("RGB", (4*im.width, im.height))
            for col in range(4):
                strip.paste(frames[row*4+col], (col*im.width, 0))
            recovered.extend(strip.crop((col*cell, 0, (col+1)*cell, im.height)) for col in range(4))
        frames = recovered
    if job.get("cropBox"):
        frames = [frame.crop(tuple(job["cropBox"])) for frame in frames]
    if job.get("columnCropBoxes"):
        boxes = job["columnCropBoxes"]
        if len(boxes) != 4:
            raise ValueError("Expected one inspected crop for each generated column")
        frames = [frame.crop(tuple(boxes[i % 4])) for i, frame in enumerate(frames)]
    decoded = source.parent / "native-frames"
    decoded.mkdir(exist_ok=True)
    sheet = Image.new("RGB", (4 * 256, 3 * 480), "#17262e")
    draw = ImageDraw.Draw(sheet)
    for i, frame in enumerate(frames):
        frame.save(decoded / f"frame-{i+1:02}.png")
        thumb = frame.resize((256, 456), Image.Resampling.NEAREST)
        x, y = (i % 4) * 256, (i // 4) * 480
        draw.text((x+5, y+2), f"{i+1} / {i*job['frameMs']/1000:.2f}s", font=font, fill="white")
        sheet.paste(thumb, (x, y+24))
    sheet.save(source.parent / "contact.jpg", quality=94)
    movie = source.with_suffix(".mp4")
    signature = {"sha256": hashlib.sha256(source.read_bytes()).hexdigest(), "frameMs": job["frameMs"],
                 "recoveredCellWidth": job.get("recoverCellWidth"), "cropBox": job.get("cropBox"),
                 "columnCropBoxes": job.get("columnCropBoxes")}
    signature_file = source.parent / "package.json"
    cached = json.loads(signature_file.read_text()) if signature_file.exists() else {}
    if not movie.exists() or cached.get("signature") != signature:
        ff("-framerate", 1000 / job["frameMs"], "-i", decoded / "frame-%02d.png",
           "-vf", "fps=30,scale=1080:1920:flags=neighbor,setsar=1", "-c:v", "libx264",
           "-preset", "fast", "-crf", "15", "-pix_fmt", "yuv420p", "-color_range", "tv",
           "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
           "-movflags", "+faststart", movie)
        info = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=nb_frames,duration", "-of", "json", str(movie)]))["streams"][0]
        count = int(info["nb_frames"])
        for label, frame_index in [("first", 0), ("early", min(8, count-1)),
                                   ("middle", (count-1)//2), ("last", count-1)]:
            ff("-i", movie, "-vf", f"select=eq(n\\,{frame_index})", "-frames:v", 1,
               source.parent / (label + ".png"))
        cached = {"signature": signature, "packagedFrames": count, "packagedDuration": float(info["duration"])}
        signature_file.write_text(json.dumps(cached, indent=2) + "\n")
    metadata[job["id"]] = {"source": str(source.relative_to(ROOT)), "movie": str(movie.relative_to(ROOT)),
        "nativeFrames": len(frames), "sourceFrameMs": job["frameMs"], "nativeDuration": len(frames)*job["frameMs"]/1000,
        "packagedFrames": cached["packagedFrames"], "duration": cached["packagedDuration"],
        "processing": ("Cropped the inspected intact portrait in each column to remove repeated edge strips and stabilize framing." if job.get("columnCropBoxes") else
                       "Recovered generated row cells and cropped portrait bounds." if job.get("recoverCellWidth") else
                       "Native frame boundaries unchanged; nearest-neighbor scaling and 30fps frame selection."),
        "recoveredCellWidth": job.get("recoverCellWidth"), "cropBox": job.get("cropBox"),
        "columnCropBoxes": job.get("columnCropBoxes"),
        "generatedInterpolation": False, "finiteAction": True}
    for label, frame_index in job.get("poses", {}).items():
        target = source.parent / (label + ".png")
        if not target.exists() or target.stat().st_mtime < movie.stat().st_mtime:
            ff("-i", movie, "-vf", f"select=eq(n\\,{frame_index})", "-frames:v", 1, target)
    metadata[job["id"]]["poses"] = job.get("poses", {})

# This approved clean action belongs to the original reusable library, not the cancelled revision.
old = ROOT / "public/episodes/time-speeds-up/animations/phone-set-down"
dest = PUB / "animations/set-down"
dest.mkdir(parents=True, exist_ok=True)
for source_name, target_name in [("phone-set-down.mp4", "set-down.mp4"), ("first.png", "first.png"), ("last.png", "last.png")]:
    shutil.copy2(old / source_name, dest / target_name)
metadata["set-down"] = {"movie": str((dest / "set-down.mp4").relative_to(ROOT)),
    "source": "public/episodes/time-speeds-up/animations/phone-set-down/phone-set-down.gif", "duration": 1.68,
    "nativeFrames": 12, "finiteAction": True, "reused": True}
(EP / "animation-assets.json").write_text(json.dumps(metadata, indent=2) + "\n")
print(json.dumps({"packagedActions": list(metadata), "partial": args.partial}))

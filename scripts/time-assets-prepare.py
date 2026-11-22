"""Package native animation frames as seekable local videos, retaining originals."""
import json
import shutil
import subprocess
from pathlib import Path
from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parents[1]
EP = ROOT / "episodes/time-speeds-up"
PUB = ROOT / "public/episodes/time-speeds-up"


def ff(*args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *map(str, args)], check=True)


def main():
    images = json.loads((EP / "image-jobs.json").read_text())
    for job in images:
        shutil.copy2(ROOT / job["output"], PUB / "art" / (job["id"] + ".png"))
    metadata = {}
    for job in json.loads((EP / "gif-jobs.json").read_text()):
        source = ROOT / job["output"]
        im = Image.open(source)
        frames = [f.convert("RGB") for f in ImageSequence.Iterator(im)]
        # Three returned GIFs have a row-window packing error. Their actual
        # generated cells are 512px wide, while the container cuts at 576px.
        # Rejoining the four windows recovers the original generated cells.
        # The lake and roof GIFs have correct boundaries and are left alone.
        recover = bool(job.get("recoverCellWidth", job["id"] in {"birthday-blow", "phone-scroll", "food-taste"}))
        if recover:
            fixed = []
            for row in range(3):
                strip = Image.new("RGB", (im.width * 4, im.height))
                for col in range(4):
                    strip.paste(frames[row * 4 + col], (col * im.width, 0))
                fixed.extend(strip.crop((col * 512, 0, (col + 1) * 512, im.height)) for col in range(4))
            frames = fixed
        out = source.parent / "delivery-frames"
        out.mkdir(exist_ok=True)
        for i, frame in enumerate(frames):
            if recover:
                frame = frame.crop((0, 56, 512, 968))
            frame.save(out / f"frame-{i + 1:02}.png")
        fps = 1000 / job["frameMs"]
        movie = source.parent / (job["id"] + ".mp4")
        ff("-framerate", fps, "-i", out / "frame-%02d.png", "-vf",
           "fps=30,scale=1080:1920:flags=neighbor,setsar=1", "-c:v", "libx264", "-preset", "fast",
           "-crf", "15", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709",
           "-color_trc", "bt709", "-movflags", "+faststart", movie)
        for label, frame in [("first", frames[0]), ("last", frames[-1])]:
            if recover:
                frame = frame.crop((0, 56, 512, 968))
            frame.save(source.parent / (label + ".png"))
        if job["id"] == "roof-child-arrives":
            # Hold the last clean decoded pose at the native-action boundary.
            # A different frontal still caused a visible pose substitution.
            ff("-i", movie, "-vf", "select=eq(n\\,29)", "-frames:v", "1", source.parent / "hold.png")
        metadata[job["id"]] = {"source": str(source.relative_to(ROOT)), "movie": str(movie.relative_to(ROOT)),
                               "frames": len(frames), "sourceFps": fps, "duration": len(frames) / fps,
                               "recoveredCellWidth": 512 if recover else None,
                               "processing": "recovered original row cells and cropped to portrait" if recover else "native frames unchanged",
                               "interpolatedFrames": 0, "finiteAction": True}
        if job["id"] == "roof-child-arrives":
            metadata[job["id"]].update({"heldAfterSeconds": 1.0, "heldDecodedFrame": 29,
                                       "holdImage": str((source.parent / "hold.png").relative_to(ROOT))})
    (EP / "animation-assets.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(json.dumps({"localAnimations": len(metadata), "localImages": len(images)}))


if __name__ == "__main__":
    main()

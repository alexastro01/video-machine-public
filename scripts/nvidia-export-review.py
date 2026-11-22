"""Inspect the encoded Nvidia delivery and extract visual and audio evidence."""
from pathlib import Path
import argparse
import hashlib
import json
import math
import re
import subprocess
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "episodes/nvidia-four-trillion"
cli = argparse.ArgumentParser()
cli.add_argument("--version", choices=["v2","v3"], default="v2")
cli.add_argument("--speech",action="store_true",help="Compare the independent transcription of the encoded track to the selected script")
options=cli.parse_args()
version=options.version
VIDEO = ROOT / f"renders/nvidia-four-trillion/nvidia-four-trillion-{version}.mp4"
OUT = ROOT / f"renders/nvidia-four-trillion/export-review-{version}"
OUT.mkdir(parents=True, exist_ok=True)


def run(args):
    completed=subprocess.run([str(x) for x in args],capture_output=True)
    if completed.returncode:
        raise RuntimeError(completed.stderr.decode(errors="replace")[-3500:])
    return completed


if options.speech:
    source=json.loads((BASE/"transcript-source.json").read_text())
    encoded=json.loads((BASE/f"transcript-encoded-{version}.json").read_text())
    def normalized(text):
        text=text.casefold().replace("’","'").replace("-"," ")
        for spelling,number in [("nineteen ninety three","1993"),("one twenty eight","128"),
                                ("twenty twenty five","2025"),("four","4"),("two","2")]:
            text=re.sub(r"\b"+spelling+r"\b",number,text)
        return re.sub(r"[^a-z0-9]","",text)
    wanted=(BASE/"narration.txt").read_text()
    match=normalized(wanted)==normalized(encoded["text"])
    audio_bytes=(OUT/"encoded-audio.wav").read_bytes()
    assert hashlib.sha256(audio_bytes).hexdigest()==encoded["sourceSha256"]
    result={"model":encoded["model"],"sourceFile":encoded["sourceFile"],"sourceSha256":encoded["sourceSha256"],
            "spokenTextMatchesAfterNumberFormatting":match,"firstWord":encoded["words"][0],"lastWord":encoded["words"][-1],
            "sourceTimedWords":len(source["words"]),"asrTimedWords":len(encoded["words"])}
    (BASE/f"encoded-speech-review-{version}.json").write_text(json.dumps(result,indent=2)+"\n")
    print(json.dumps(result,indent=2))
    raise SystemExit(0 if match else 1)

edit_path=BASE/"versions/v2/edit.json" if version=="v2" and (BASE/"versions/v2/edit.json").exists() else BASE/"edit.json"
edit = json.loads(edit_path.read_text())
events = edit["events"]
probe = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", VIDEO]).stdout)
video = next(s for s in probe["streams"] if s["codec_type"] == "video")
audio = next(s for s in probe["streams"] if s["codec_type"] == "audio")
assert (video["width"], video["height"]) == (1080, 1920)
assert video["r_frame_rate"] == "60/1"
assert int(video["nb_frames"]) == edit["worldFrames"]
assert video["pix_fmt"] == "yuv420p"
assert video["color_space"] == "bt709" and video["color_range"] == "tv"
assert abs(float(probe["format"]["duration"]) - edit["duration"]) < .05
assert int(audio["sample_rate"]) == 48000 and audio["channels"] == 2

measurement = run(["ffmpeg", "-hide_banner", "-i", VIDEO, "-vn", "-af", "loudnorm=I=-16:TP=-1.5:LRA=8:print_format=json", "-f", "null", "-"])
loudness = json.loads(re.findall(r'\{\s*"input_i"[\s\S]*?\}', measurement.stderr.decode())[-1])
assert -17 <= float(loudness["input_i"]) <= -15, loudness
assert float(loudness["input_tp"]) <= -1, loudness
run(["ffmpeg", "-y", "-v", "error", "-i", VIDEO, "-vn", "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", OUT / "encoded-audio.wav"])

sampled = run(["ffmpeg", "-v", "error", "-i", VIDEO, "-vf", "fps=2,scale=54:96", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]).stdout
pixels = np.frombuffer(sampled, dtype=np.uint8).reshape(-1, 96, 54, 3)
means = pixels.mean(axis=(1, 2, 3))
variances = pixels.var(axis=(1, 2, 3))
assert float(means.min()) > 3 and float(variances.min()) > 10

times = {f"overview-{i:02}": float(t) for i, t in enumerate(range(0, 54, 2))}
for shot in edit["shots"]:
    times["shot-" + shot["id"]] = shot["start"] + min(shot["duration"] / 2, 1)
for name, at, offsets in [
    ("opening", events["impact"], [-.25, -.05, .08, .25, .45]),
    ("flashback", events["diner"], [-.03, .08, .16, .32]),
    ("drawer", events["drawer"], [0, .2, .4, .65]),
    ("phone", events["sega"], [.05, .25, .4, .55]),
    ("agreement", events["confirm"], [-.08, .04, .2]),
    ("assembly", events["redesign"], [.12, .28, .46, .65, .85, 1.15, 1.5, 1.9]),
    ("compute", events["cuda"], [-.03, .1, .2, .35]),
    ("network", events["networkStart"], [0, .25, .5, .85]),
    ("servers", events["ai"], [-.03, .12, .3, .6, 1.4, 2]),
    ("value", events["valueStart"], [-.03, .1, .25, .6, 1.2]),
]:
    for i, offset in enumerate(offsets):
        times[f"{name}-{i}"] = at + offset
if version=="v3":
    for name,event,offsets in [
        ("sketch","diner",[.40,.95,1.55,2.95]),
        ("cup","coffee",[.10,.54,1.10]),
        ("listen","request",[.12,1.10,2.65]),
        ("gesture","parallel",[.12,.84,1.70]),
        ("look","learning",[.32,.94,1.76]),
        ("cart","shipping",[.05,.40,.82]),
        ("payoff","valueStart",[.10,.54,1.92]),
    ]:
        for i,dt in enumerate(offsets): times[f"{name}-{i}"] = events[event]+dt
    times.update({"table-00-19":19.0,"diner-three":8.1,"coffee-lift":10.87,"drawer-hold":19.53,
                  "palm-sample":34.39,"follow":38.68,"server-cut-before":41.1,"server-cut-after":41.15})
times["final"] = edit["duration"] - 1 / 60
frames = {name: min(edit["worldFrames"] - 1, max(0, round(t * 60))) for name, t in times.items()}
unique = sorted(set(frames.values()))
# FFmpeg limits expression-tree depth. Keep long frame selections shallow.
terms=[f"eq(n,{n})" for n in unique]
select="+".join("("+ "+".join(terms[i:i+12]) +")" for i in range(0,len(terms),12))
run(["ffmpeg", "-y", "-v", "error", "-i", VIDEO, "-vf", f"select='{select}',scale=540:960", "-fps_mode", "vfr", "-threads", "2", "-q:v", "2", OUT / "frame-%03d.jpg"])
files = {n: OUT / f"frame-{i+1:03}.jpg" for i, n in enumerate(unique)}
entries = {name: {"frame": n, "time": n / 60, "file": str(files[n].relative_to(ROOT))} for name, n in frames.items()}
(OUT / "frames.json").write_text(json.dumps(entries, indent=2) + "\n")


def montage(names, filename, columns, width):
    height = round(width * 16 / 9)
    canvas = Image.new("RGB", (columns * width, math.ceil(len(names) / columns) * (height + 22)), "#f1f0e9")
    draw = ImageDraw.Draw(canvas)
    for i, name in enumerate(names):
        pic = Image.open(ROOT / entries[name]["file"]).resize((width, height), Image.Resampling.LANCZOS)
        x, y = i % columns * width, i // columns * (height + 22)
        canvas.paste(pic, (x, y))
        draw.text((x+4, y+height+3), f'{name} {entries[name]["time"]:.2f}s', fill="#10232e")
    canvas.save(OUT / filename, quality=92)


montage([n for n in entries if n.startswith("overview-")], "overview.jpg", 9, 140)
montage([n for n in entries if n.startswith(("opening-", "drawer-", "phone-", "agreement-", "assembly-"))], "acting-and-props.jpg", 6, 180)
montage([n for n in entries if n.startswith(("flashback-", "compute-", "network-", "servers-", "value-"))], "transitions-and-flow.jpg", 6, 180)
if version=="v3":
    montage([n for n in entries if n.startswith(("sketch-","cup-","listen-","gesture-","look-","cart-","payoff-"))],
            "character-acting.jpg",6,145)
    montage(["diner-three","coffee-lift","table-00-19","drawer-hold","palm-sample","follow","server-cut-before","server-cut-after","final"],"placements.jpg",5,176)

if version=="v3":
    public=ROOT/"public/episodes/nvidia-four-trillion"
    def decode(path,channels):
        raw=run(["ffmpeg","-v","error","-i",path,"-f","f32le","-ac",channels,"-ar",48000,"-"]).stdout
        return np.frombuffer(raw,dtype="<f4").reshape(-1,channels)
    fx=decode(public/"effects.wav",2)
    voice_file=public/"narration.wav"
    old=ROOT/"output/nvidia-four-trillion/v2-stems/narration.wav"
    same_voice=hashlib.sha256(voice_file.read_bytes()).digest()==hashlib.sha256(old.read_bytes()).digest() if old.exists() else None
    if same_voice is False:
        same_voice=bool(np.array_equal(decode(voice_file,1),decode(old,1)))
        assert same_voice
    cue_report=[]
    for c in json.loads((BASE/"audio-events.json").read_text())["events"]:
        start=round(c["at"]*48000);stop=start+round(c["duration"]*48000)
        seg=fx[start:stop]
        power=np.sqrt((seg**2).mean(axis=0))
        assert max(power)>.001,c["id"]
        cue_report.append({"id":c["id"],"at":c["at"],"peakDbFS":round(float(20*np.log10(abs(seg).max())),2),
                           "leftRmsDbFS":round(float(20*np.log10(power[0])),2),"rightRmsDbFS":round(float(20*np.log10(power[1])),2)})
    (BASE/"audio-delivery-v3.json").write_text(json.dumps({"narrationStemSampleIdenticalToV2":same_voice,
        "effectsPeakDbFS":round(float(20*np.log10(abs(fx).max())),2),"encodedIntegratedLUFS":float(loudness["input_i"]),
        "encodedTruePeakDbTP":float(loudness["input_tp"]),"mixChannels":audio["channels"],"events":cue_report},indent=2)+"\n")

result = {
    "artifact": str(VIDEO.relative_to(ROOT)), "sha256": hashlib.sha256(VIDEO.read_bytes()).hexdigest(),
    "format": {k: video[k] for k in ("width", "height", "r_frame_rate", "nb_frames", "pix_fmt", "color_space", "color_range")},
    "audio": {"codec":audio["codec_name"],"channels":audio["channels"],"sampleRate":int(audio["sample_rate"])},
    "durationSeconds": float(probe["format"]["duration"]),
    "encodedLoudness": {"integratedLUFS": float(loudness["input_i"]), "truePeakDbTP": float(loudness["input_tp"]), "rangeLU": float(loudness["input_lra"])},
    "visualSamples": {"count": len(pixels), "minimumMeanRgb": round(float(means.min()), 2), "minimumVariance": round(float(variances.min()), 2), "extractedFrames": len(unique)},
    "evidence": str(OUT.relative_to(ROOT)), "userApproved": False,
}
(BASE / f"export-review-{version}.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))

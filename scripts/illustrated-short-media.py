"""Prepare an illustrated dialogue short from its episode-owned edit plan."""
import json
import re
import subprocess
import sys
from pathlib import Path
import numpy as np
from scipy.io import wavfile
from scipy.ndimage import gaussian_filter1d
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[1]
SLUG = sys.argv[1]
EP = ROOT / "episodes" / SLUG
PUB = ROOT / "public/episodes" / SLUG
PLAN = json.loads((EP / "edit-plan.json").read_text())
SR = 48000
D = PLAN["duration"]
N = round(D * SR)


def decode(file, filters=None, channels=1):
    command = ["ffmpeg", "-v", "error", "-i", str(file)]
    if filters:
        command += ["-af", filters]
    command += ["-ar", str(SR), "-ac", str(channels), "-f", "f32le", "pipe:1"]
    values = np.frombuffer(subprocess.check_output(command), np.float32)
    return values.reshape(-1, channels) if channels > 1 else values


def norm(text):
    return re.sub(r"[^a-z0-9]", "", text.lower())


sources, words_by_source = {}, {}
for key, source in PLAN["sources"].items():
    sources[key] = decode(PUB / source["file"], "loudnorm=I=-16.5:TP=-2:LRA=9,aresample=48000")
    words_by_source[key] = json.loads((EP / source["words"]).read_text())["words"]
speakers = {source["speaker"]: np.zeros(N, np.float32) for source in PLAN["sources"].values()}
mapped, occupied = [], {name: [] for name in speakers}
for part in PLAN["parts"]:
    key = part["source"]
    a, b, start = part["sourceStart"], part["sourceEnd"], part["start"]
    speaker = PLAN["sources"][key]["speaker"]
    for word in words_by_source[key]:
        if word["start"] < b and word["end"] > a and not (a <= word["start"] and word["end"] <= b):
            raise ValueError(f"Audio boundary crosses a word: {part['id']} {word}")
    piece = sources[key][round(a * SR):round(b * SR)].copy()
    fade = min(round(.006 * SR), len(piece)//2)
    piece[:fade] *= np.linspace(0, 1, fade)
    piece[-fade:] *= np.linspace(1, 0, fade)
    at = round(start * SR)
    if at + len(piece) > N:
        raise ValueError("Voice exceeds delivery")
    if any(at < previous_end and at + len(piece) > previous_start for previous_start, previous_end in occupied[speaker]):
        raise ValueError("Overlapping phrases on a speaker track")
    occupied[speaker].append((at, at+len(piece)))
    speakers[speaker][at:at+len(piece)] += piece
    for index, word in enumerate(words_by_source[key]):
        if a <= word["start"] and word["end"] <= b:
            mapped.append({"text": word["text"], "start": round(start+word["start"]-a, 4),
                "end": round(start+word["end"]-a, 4), "source": key, "sourceIndex": index,
                "speaker": speaker, "part": part["id"]})
mapped.sort(key=lambda w: w["start"])
if norm(" ".join(w["text"] for w in mapped)) != norm((EP / "narration.txt").read_text()):
    raise ValueError("Delivery words differ from the exact requested script")
for previous, word in zip(mapped, mapped[1:]):
    if previous["end"] > word["start"] + .025:
        raise ValueError(f"Speaker overlap or caption overlap: {previous} / {word}")
voice = sum(speakers.values())
for speaker, data in speakers.items():
    wavfile.write(PUB / f"voice-{speaker}.wav", SR, data)
wavfile.write(PUB / "narration.wav", SR, voice.astype(np.float32))
captions = [{"text": " "+w["text"], "startMs": round(w["start"]*1000), "endMs": round(w["end"]*1000),
             "timestampMs": round(w["start"]*1000), "confidence": None} for w in mapped]
(EP / "captions.json").write_text(json.dumps(captions, indent=2, ensure_ascii=False)+"\n")
(EP / "transcript-delivery.json").write_text(json.dumps({"words": mapped, "speed": 1,
    "alignment": "Exact selected-take word alignment, independently transcribed; ambiguous week line replaced by independently verified pickup."}, indent=2, ensure_ascii=False)+"\n")

shots = PLAN["shots"]
for i, shot in enumerate(shots):
    end = shots[i+1]["start"] if i+1 < len(shots) else D
    shot["duration"] = round(end-shot["start"], 6)
    if shot["duration"] <= 0:
        raise ValueError("Nonpositive shot")
pages = []
for group in PLAN["captionGroups"]:
    words = [next(w for w in mapped if w["source"] == group["source"] and w["sourceIndex"] == index)
             for index in group["indices"]]
    start = 0 if group.get("immediate") else words[0]["start"]
    end = words[-1]["end"] + .22
    next_start = next((w["start"] for w in mapped if w["start"] >= words[-1]["end"] and w not in words), D)
    end = min(end, next_start-.015)
    end = min(group.get("holdUntil", end), next_start-.015 if next_start < D else D)
    visual_start = start
    if "visualStartIndex" in group:
        visual_start = words[group["visualStartIndex"]]["start"]
    text = " ".join(w["text"] for w in words)
    shot = next(s for s in reversed(shots) if s["start"] <= visual_start)
    pages.append({"start": start, "end": max(end, words[-1]["end"]), "text": text,
                  "visualText": group.get("visualText", text), "visualStart": visual_start,
                  "immediate": bool(group.get("immediate")), "captionTop": shot.get("captionTop"),
                  "speaker": words[0]["speaker"]})
(EP / "caption-phrases.json").write_text(json.dumps(pages, indent=2, ensure_ascii=False)+"\n")
timeline = {"id": SLUG, "duration": D, "fps": PLAN["fps"], "frames": round(D*PLAN["fps"]),
            "shots": shots, "words": mapped, "lastSpokenWordEnd": mapped[-1]["end"],
            "endingHoldSeconds": round(D-mapped[-1]["end"], 4)}
(EP / "timeline.json").write_text(json.dumps(timeline, indent=2, ensure_ascii=False)+"\n")

music_config = PLAN["music"]
raw_music = decode(ROOT/music_config["source"], f'loudnorm=I={music_config["lufs"]}:TP=-5:LRA=8', 2)
offset = round(music_config["sourceOffset"]*SR)
music = raw_music[offset:offset+N].copy()
if len(music) != N:
    raise ValueError("Score does not cover the film")
t = np.arange(N)/SR
active = gaussian_filter1d((abs(voice) > .012).astype(float), SR*.055)
gain = .92-.31*np.clip(active*2, 0, 1)
q0, q1 = music_config["quietRange"]
gain *= np.interp(t, [0, q0-.16, q0, q1-.25, q1+.5, D], [1, 1, music_config["quietGain"], music_config["quietGain"], 1, 1])
gain *= np.clip((t-music_config["fadeInStart"])/music_config["fadeInDuration"], 0, 1)
gain *= np.clip((D-t)/music_config["fadeOutDuration"], 0, 1)
music *= gain[:, None]

rng = np.random.default_rng(58)
effects = np.zeros((N, 2), np.float32)
events = PLAN["soundEvents"]
def noise(seconds, lo, hi):
    n = round(seconds*SR)
    value = sosfilt(butter(2, [lo, hi], btype="bandpass", fs=SR, output="sos"), rng.standard_normal(n))
    value /= max(abs(value).max(), 1e-9)
    return value*np.sin(np.linspace(0, np.pi, n))**1.5

for event in events:
    seconds = event["duration"]
    if event["kind"] == "file":
        data = decode(PUB/event["file"], "highpass=f=220,lowpass=f=3400")
        data = data[round(event.get("sourceStart", 0)*SR):][:round(seconds*SR)].copy()
        data /= max(abs(data).max(), 1e-9)
        fade = min(round(.055*SR), len(data)//2)
        data[:fade] *= np.linspace(0, 1, fade)
        data[-fade:] *= np.linspace(1, 0, fade)
    elif event["kind"] == "glass":
        ts = np.arange(round(seconds*SR))/SR
        data = (np.sin(2*np.pi*event.get("frequency", 680)*ts)+.18*np.sin(2*np.pi*1382*ts))*np.exp(-ts*17)*np.minimum(ts*200, 1)
    else:
        data = noise(seconds, event.get("low", 200), event.get("high", 4200))
    at = round(event["time"]*SR)
    length = min(len(data), N-at)
    effects[at:at+length] += data[:length, None]*event["gain"]*.707
wind = noise(D, 150, 1300)
wind_envelope = PLAN.get("ambience", {}).get("windEnvelope", [
    [0, 0], [9.7, 0], [10, .006], [15.3, .006], [15.4, 0],
    [21.2, 0], [21.4, .006], [29.1, .006], [29.2, 0],
    [31.3, 0], [31.5, .008], [D-.4, .008], [D, 0]])
wind_times, wind_levels = zip(*wind_envelope)
if any(b <= a for a, b in zip(wind_times, wind_times[1:])):
    raise ValueError("Wind envelope times must increase")
wind_gain = np.interp(t, wind_times, wind_levels)
effects += wind[:, None]*wind_gain[:, None]
for name, data in [("music", music), ("effects", effects)]:
    wavfile.write(PUB/f"{name}.wav", SR, data.astype(np.float32))
(EP / "audio-edit.json").write_text(json.dumps({"speed": 1, "duration": D, "parts": PLAN["parts"],
    "sourceCutBasis": "Exact selected-take alignment, measured quiet windows and 6ms fades; no spoken word crosses a cut."}, indent=2)+"\n")
(EP / "sound-plan.json").write_text(json.dumps({"music": music_config, "events": events,
    "soundVerification": "Levels and timings measured; not listened to in this tool session.", "speakerTracks": list(speakers)}, indent=2)+"\n")
episode = json.loads((EP / "episode.json").read_text())
episode.update({"duration": D, "fps": PLAN["fps"], "aspectRatio": "9:16", "renderer": "hyperframes", "world": "memory",
    "scenes": [{"id": s["id"], "set": s["set"], "action": s["action"], "specimen": "none", "start": s["start"],
        "duration": s["duration"], "anchor": s["description"], "label": s["id"], "timeOfDay": "evening"} for s in shots]})
(EP / "episode.json").write_text(json.dumps(episode, indent=2)+"\n")
print(json.dumps({"duration": D, "frames": timeline["frames"], "words": len(mapped), "shots": len(shots),
                  "captionPhrases": len(pages), "endingHold": timeline["endingHoldSeconds"]}))

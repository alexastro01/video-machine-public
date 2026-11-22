"""Build Alex's overnight story on the selected Astra recordings and their word timings."""

import hashlib
import json
import math
import re
import subprocess

import numpy as np
from dialogue_media import ROOT, R, normal, pcm, run, wav

SLUG = "make-no-mistakes-story"
EP = ROOT / "episodes" / SLUG
PUB = ROOT / "public" / "episodes" / SLUG
FPS = 60
SAMPLES = R // FPS


def read(path):
    return json.loads(path.read_text())


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


plan = read(EP / "plan.json")
rows = read(EP / "script.json")
speed = plan["speed"]
cursor = 0
parts, words, phrases, takes = [], [], [], []
lines = {}


def add_phrases(line_words):
    group = []
    for i, word in enumerate(line_words):
        if group and (
            word["text"].startswith("'")
            or len(" ".join([words[j]["text"] for j in group] + [word["text"]])) > 19
        ):
            phrases.append(group)
            group = []
        group.append(len(words) - len(line_words) + i)
        punctuation = bool(re.search(r"[.?!:,;…]['’]?$", word["text"]))
        gap = (
            i == len(line_words) - 1 or line_words[i + 1]["start"] - word["end"] > 0.36
        )
        if len(group) == 3 or punctuation or gap:
            phrases.append(group)
            group = []


for row in rows:
    name = row["id"]
    selection = row.get("selection", {})
    alignment = read(
        ROOT / selection["alignment"] if selection else EP / "voices" / (name + ".json")
    )
    source = ROOT / alignment["source"]
    meta = read(source.with_suffix(".json"))
    assert alignment["sha256"] == hashlib.sha256(source.read_bytes()).hexdigest()
    timed = [dict(w) for w in alignment["words"][selection.get("firstWord", 0) :]]
    assert [w["text"] for w in timed] == row["text"].split()
    audio = pcm(source)
    begin = max(0, timed[0]["start"] - (0.035 if name == "question" else 0.075))
    # Keep the unvoiced release after the last aligned phone, including the final /p/.
    end = min(len(audio) / R, timed[-1]["end"] + 0.14)
    end = min(end, alignment.get("trimBefore", end))
    clip = audio[round(begin * R) : round(end * R)].copy()
    for w in timed:
        w["start"] -= begin
        w["end"] -= begin
    if name == "database":
        j = next(i for i, w in enumerate(timed) if normal(w["text"]) == "saved")
        extra = max(0, 0.62 - (timed[j + 1]["start"] - timed[j]["end"]))
        if extra:
            location = round(
                (
                    timed[j]["end"]
                    + min(0.06, (timed[j + 1]["start"] - timed[j]["end"]) / 2)
                )
                * R
            )
            clip = np.concatenate(
                (clip[:location], np.zeros(round(extra * R)), clip[location:])
            )
            for w in timed[j + 1 :]:
                w["start"] += extra
                w["end"] += extra
    target = round(len(clip) / speed)
    # WSOLA preserves Astra's pitch. Exact output lengths keep the voice, SRT,
    # studio and 60 fps action clock on the same timeline.
    result = subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-f",
            "f32le",
            "-ar",
            str(R),
            "-ac",
            "1",
            "-i",
            "pipe:0",
            "-af",
            f"atempo={speed},apad,atrim=end_sample={target}",
            "-f",
            "f32le",
            "pipe:1",
        ],
        input=clip.astype("<f4").tobytes(),
        capture_output=True,
        check=True,
    )
    clip = np.frombuffer(result.stdout, "<f4").copy()
    energy = np.mean(clip[: len(clip) // 960 * 960].reshape(-1, 960) ** 2, axis=1)
    voiced = energy[energy > max(1e-6, np.percentile(energy, 94) * 0.035)]
    gain = float(np.clip(0.122 / np.sqrt(np.mean(voiced)), 0.68, 1.62))
    clip *= gain
    fade = np.linspace(0, 1, round(0.003 * R))
    clip[: len(fade)] *= fade
    clip[-len(fade) :] *= fade[::-1]
    at = cursor / R
    for w in timed:
        w["start"] = round(at + w["start"] / speed, 6)
        w["end"] = round(at + w["end"] / speed, 6)
    words.extend(timed)
    add_phrases(timed)
    lines[name] = {
        "frame": round(at * FPS),
        "end": round((at + len(clip) / R) * FPS),
        "words": timed,
    }
    pad = round(plan["gaps"][name] * R / speed)
    parts.extend((clip, np.zeros(pad)))
    cursor += len(clip) + pad
    takes.append(
        {
            "line": name,
            "source": str(source.relative_to(ROOT)),
            "sessionId": meta["sessionId"],
            "model": meta["model"],
            "voice": meta["voice"],
            "usageSeconds": meta["usage"]["seconds"],
            "reused": True,
            "speed": speed,
            "sourceStart": round(begin, 5),
            "sourceEnd": round(end, 5),
            "gainDb": round(20 * math.log10(gain), 3),
            "sha256": alignment["sha256"],
        }
    )

voice = np.concatenate(parts)
frames = math.ceil(len(voice) / SAMPLES)
voice = np.pad(voice, (0, frames * SAMPLES - len(voice)))
wav(PUB / "narration.wav", voice)
run(
    [
        "ffmpeg",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(PUB / "narration.wav"),
        "-c:a",
        "libmp3lame",
        "-q:a",
        "1",
        str(PUB / "source-take-1.mp3"),
    ]
)
save(EP / "transcript-source.json", {"sourceTake": 1, "words": words})
save(
    EP / "voice-provenance.json",
    {
        "provider": "OpenAI API",
        "voice": "Astra Spark",
        "model": "gpt-live-1",
        "takes": takes,
        "newSessionSeconds": sum(t["usageSeconds"] for t in takes if not t["reused"]),
        "reusedSessionSeconds": sum(t["usageSeconds"] for t in takes if t["reused"]),
    },
)

events = {}
for cue, (line, phrase, *delta) in plan["events"].items():
    segment = lines[line]["words"]
    target = [normal(t) for t in phrase.split()]
    haystack = [normal(w["text"]) for w in segment]
    hits = [
        j
        for j in range(len(haystack) - len(target) + 1)
        if haystack[j : j + len(target)] == target
    ]
    assert len(hits) == 1, (line, phrase, hits)
    events[cue] = round(segment[hits[0] + (delta[0] if delta else 0)]["start"] * FPS)

stages = {name: lines[line]["frame"] for name, line, desc in plan["stages"]}
stages["retry"] = lines["fix"]["frame"] - 5
stages["aside"] = lines["pout"]["frame"]
events.update(
    send=events["job"] + 12,
    countStart=plan["hook"]["countStart"],
    full=plan["hook"]["countStart"] + plan["hook"]["countFrames"],
    lid=events["followStart"] - 5,
    catch=events["one"] + 5,
    secondCheck=next(
        round(w["start"] * FPS)
        for w in lines["gate"]["words"]
        if normal(w["text"]) == "hit"
    ),
    free=events["batch"] + 7,
    retryType=events["quoteStart"],
    replace=events["quoteEnd"],
    refresh=events["broken"] - 7,
    success=lines["fix"]["end"] + 27,
)
events["enter"] = events["free"] + 23
events["land"] = events["enter"] + 32
events["slump"] = events["success"] + 38
# Each held face is a separate frontal drawing; the body bounce follows individual words.
pose_times = [
    (0, "send"),
    (stages["setup"], "receive"),
    (events["cloud"], "inspect"),
    (events["under"] + 18, "receive"),
    (events["barely"], "proud"),
    (events["chop"], "point"),
    (events["caps"], "inspect"),
    (events["wait"], "receive"),
    (events["land"] + 11, "send"),
    (lines["standup"]["frame"], "inspect"),
    (events["ship"] - 12, "send"),
    (events["type"] - 55, "point"),
    (events["save"], "receive"),
    (events["main"], "point"),
    (lines["homework"]["frame"], "proud"),
    (events["broken"] - 5, "gasp"),
    (events["threeMore"], "inspect"),
    (events["launch"], "point"),
    (events["think"], "send"),
    (events["success"], "proud"),
    (stages["aside"], "puff"),
]
poses = [{"at": max(0, at), "pose": pose} for at, pose in sorted(pose_times)]
# Three-frame anime mouth exposures follow only Astra's conformed voice.
mouth = []
for start in range(0, len(voice), SAMPLES * 3):
    rms = np.sqrt(np.mean(voice[start : start + SAMPLES * 3] ** 2))
    mouth.append(int(np.digitize(rms, [0.018, 0.061, 0.116])))
clock = {
    "fps": FPS,
    "frames": frames,
    "events": events,
    "stages": stages,
    "words": words,
    "phrases": phrases,
    "poses": poses,
    "mouth": mouth,
}
save(EP / "clock.json", clock)
captions = []
for j, indices in enumerate(phrases):
    first, last = words[indices[0]], words[indices[-1]]
    stop = min(
        last["end"] + (0.48 if normal(last["text"]) == "saved" else 0.16),
        words[phrases[j + 1][0]]["start"] if j + 1 < len(phrases) else frames / FPS,
    )
    captions.append(
        {
            "text": " ".join(words[i]["text"] for i in indices),
            "startMs": round(first["start"] * 1000),
            "endMs": round(stop * 1000),
            "timestampMs": round(first["start"] * 1000),
            "confidence": None,
        }
    )
captions[-1]["endMs"] = int(frames / FPS * 1000)
save(EP / "captions.json", captions)
ep = read(EP / "episode.json")
ep["duration"] = frames / FPS
ep["audio"]["narrationTail"] = round(frames / FPS - words[-1]["end"], 5)
for i, scene in enumerate(ep["scenes"]):
    start = stages[scene["id"]]
    stop = stages[ep["scenes"][i + 1]["id"]] if i + 1 < len(ep["scenes"]) else frames
    scene.update(start=start / FPS, duration=(stop - start) / FPS)
save(EP / "episode.json", ep)

library = read(EP / "assets/foley.json")
clips = {k: pcm(PUB / "sfx" / v["file"]) for k, v in library.items()}
effects = np.zeros(len(voice))
log = []


def hit(key, frame, gain, length, offset=0.0, accent=0.0, speed=1.0):
    raw = clips[key]
    x = np.arange(round(length * R)) * speed + offset * R
    piece = np.interp(x, np.arange(len(raw)), raw, left=0, right=0)
    piece = piece * (gain / max(0.01, np.max(np.abs(piece))))
    n = min(len(piece) // 3, round(0.006 * R))
    piece[:n] *= np.linspace(0, 1, n)
    t = min(len(piece) // 3, round(0.046 * R))
    piece[-t:] *= np.linspace(1, 0, t)
    start = round(frame * SAMPLES - accent * R)
    if start < 0:
        piece = piece[-start:]
        start = 0
    count = min(len(piece), len(effects) - start)
    if count > 0:
        effects[start : start + count] += piece[:count]
    log.append(
        {
            "file": library[key]["file"],
            "source": library[key]["source"],
            "actionFrame": frame,
            "startSample": start,
            "gain": gain,
            "playbackSpeed": speed,
            "trimStart": offset,
            "duration": length,
        }
    )


crest = (events["full"] - events["countStart"]) / FPS
hit("swell", events["full"], 0.040, crest + 0.10, 1.40 - crest, crest)
hit("tick", events["full"], 0.038, 0.07)
hit("pop", events["lid"] + 7, 0.067, 0.093, 0.010, 0.012)
hit("pop", events["catch"], 0.045, 0.09, 0.012, 0.012)
for j in [0, 6, 11, 17, 24, 34, 44]:
    hit("key", stages["setup"] + 14 + j, 0.038 if j % 2 else 0.049, 0.083)
hit("enter", events["send"], 0.15, 0.22)
hit("swipe", events["send"] + 12, 0.071, 0.30, 0.05, 0.12)
hit("latch", events["identity"], 0.115, 0.24)
hit("scan", events["secondCheck"], 0.072, 0.22, 0, 0.02)
hit("tick", events["under"], 0.055, 0.1)
for t in [0, 5, 10]:
    hit("pop", events["chop"] + t, 0.065, 0.075, 0.012, 0.012, 1 + t * 0.024)
hit("tick", events["six"], 0.08, 0.09)
hit("latch", events["free"], 0.11, 0.16)
hit("swipe", events["enter"] + 13, 0.045, 0.24, 0.06, 0.10)
hit("latch", events["land"], 0.067, 0.14)
for t in [0, 14, 29]:
    hit("key", events["ship"] + t, 0.052, 0.08)
hit("latch", events["save"], 0.12, 0.22)
hit("thud", events["tired"], 0.11, 0.19, 0.02, 0.08, 0.9)
hit("enter", events["refresh"], 0.12, 0.15)
hit("fail", events["broken"], 0.22, 0.58, 0, 0.035)
for cue in ["quoteStart", "quoteHard", "quoteAbout", "quoteEnd"]:
    hit("key", events[cue], 0.041, 0.075)
hit("swipe", events["route"] + 8, 0.09, 0.36, 0.025, 0.15)
hit("enter", events["success"] - 6, 0.105, 0.17)
hit("ok", events["success"], 0.19, 0.76, 0, 0.03)
hit("thud", events["slump"], 0.15, 0.22, 0, 0.085, 0.80)
hit("crunch", events["slump"], 0.21, 0.23, 0.497, 0.023)
save(EP / "audio-events.json", log)
wav(PUB / "effects.wav", effects)
# The shared episode schema includes a music stem. V4's master is voice and Foley.
wav(PUB / "music.wav", np.zeros_like(voice))
mixed = PUB / "mix.wav"
wav(mixed, voice + effects)
meter = subprocess.run(
    [
        "ffmpeg",
        "-hide_banner",
        "-i",
        str(mixed),
        "-af",
        "loudnorm=print_format=json",
        "-f",
        "null",
        "-",
    ],
    capture_output=True,
    check=True,
)
stats = json.loads(re.search(r"\{[^{}]+\}", meter.stderr.decode()).group())
gain = -16 - float(stats["input_i"])
tmp = PUB / "mix-master.wav"
run(
    [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-i",
        str(mixed),
        "-af",
        f"volume={gain}dB,alimiter=limit=0.79:attack=5:release=60:level=0:latency=1,apad,atrim=end_sample={len(voice)}",
        "-ar",
        str(R),
        "-ac",
        "2",
        "-c:a",
        "pcm_s24le",
        str(tmp),
    ]
)
tmp.replace(mixed)
print(
    f"{frames} frames, {frames / FPS:.2f} seconds, {len(words)} spoken words, {len(log)} synchronized sound cues."
)

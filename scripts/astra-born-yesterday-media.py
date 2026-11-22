"""Conform the selected performances, post entrances and sound to the episode plan."""

from hashlib import sha256
import json
from pathlib import Path
import re
import subprocess
import tempfile

import numpy as np
from dialogue_media import ROOT, R, assemble, pcm, run, wav

SLUG = "astra-born-yesterday"
EP, PUBLIC = ROOT / "episodes" / SLUG, ROOT / "public/episodes" / SLUG


def read(path):
    return json.loads(path.read_text())


def save(name, value):
    (EP / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


plan = read(EP / "plan.json")
fps, duration = plan["fps"], plan["duration"]
recipe, recordings = [], {}
for i, row in enumerate(plan["lines"]):
    source = PUBLIC / "voices" / (row["source"] + ".wav")
    aligned = read(EP / "voices" / (row["source"] + "-aligned.json"))
    transcription = read(EP / "voices" / (row["source"] + "-words.json"))
    if (
        sha256(source.read_bytes()).hexdigest() != aligned["sourceSha256"]
        or aligned["sourceSha256"] != transcription["sourceSha256"]
    ):
        raise ValueError(f"Selected take changed: {row['id']}")
    audio = pcm(source)
    lo, hi = row["window"]
    edges = [lo] + [t for cut in row["cuts"] for t in cut] + [hi]
    if edges != sorted(edges) or round(hi * R) > len(audio):
        raise ValueError(f"Invalid source edit for {row['id']}")
    pieces = []
    for start, end in zip(edges[::2], edges[1::2]):
        piece = audio[round(start * R) : round(end * R)].copy()
        fade = min(round(0.003 * R), len(piece) // 2)
        piece[:fade] *= np.linspace(0, 1, fade)
        piece[-fade:] *= np.linspace(1, 0, fade)
        pieces.append(piece)
    cut_audio = np.concatenate(pieces)
    edited = PUBLIC / "voices" / (row["id"] + "-edit.wav")
    wav(edited, cut_audio)
    words = []
    for word in aligned["words"]:
        a, b = word["start"], word["end"]
        if (
            a < lo
            or b > hi
            or any(a < right and b > left for left, right in row["cuts"])
        ):
            raise ValueError(f"Source edit intersects {row['id']} word {word['text']}")
        removed = sum(right - left for left, right in row["cuts"] if right <= a)
        words.append(
            dict(
                text=word["text"],
                start=round(a - lo - removed, 6),
                end=round(b - lo - removed, 6),
            )
        )
    recordings[row["id"]] = dict(
        sourceFile=str(edited.relative_to(ROOT)),
        speed=row["speed"],
        wordTimings=words,
        completeTake=False,
    )
    next_at = (
        plan["lines"][i + 1]["at"]
        if i + 1 < len(plan["lines"])
        else duration - 0.000001
    )
    pause = next_at - row["at"] - round(len(cut_audio) / row["speed"]) / R
    if pause < 0:
        raise ValueError(f"Line overruns the next entrance: {row['id']} ({pause:.3f}s)")
    recipe.append(
        dict(id=row["id"], speaker=row["role"], text=row["text"], afterPause=pause)
    )

save("dialogue.json", dict(voices={}, lineRecordings=recordings, lines=recipe, fps=fps))
_, timeline, _ = assemble(SLUG)
if timeline["frames"] != round(duration * fps):
    raise ValueError(f"The selected takes must fill the planned {duration:g} seconds")
lines = timeline["lines"]
by_id = {line["id"]: line for line in lines}
words = [word for line in lines for word in line["words"]]
save(
    "transcript-source.json",
    dict(sourceTake={l["id"]: l["source"] for l in plan["lines"]}, words=words),
)

# Pauses inside a line keep short captions from lingering over an unrelated reaction.
captions = []
for line in lines:
    chunk = []
    for j, w in enumerate(line["words"]):
        chunk.append(w)
        next_word = line["words"][j + 1] if j + 1 < len(line["words"]) else None
        if (
            next_word
            and len(chunk) < 2
            and next_word["start"] - w["end"] < 0.36
            and not w["text"].endswith((".", "!", "?", "…"))
        ):
            continue
        start = round(1000 * chunk[0]["start"])
        stop = min(
            w["end"] + 0.17, next_word["start"] if next_word else line["end"] + 0.095
        )
        captions.append(
            dict(
                text=" ".join(t["text"] for t in chunk),
                startMs=start,
                endMs=round(1000 * stop),
                timestampMs=start,
                confidence=None,
            )
        )
        chunk = []
save("captions.json", captions)

episode = read(EP / "episode.json")
episode["duration"] = duration
episode["audio"].update(
    narrationOffset=0, narrationTail=round(duration - words[-1]["end"], 4)
)
episode["scenes"] = []
for i, (line, row) in enumerate(zip(lines, plan["lines"])):
    end = lines[i + 1]["start"] if i + 1 < len(lines) else duration
    episode["scenes"].append(
        dict(
            id=row["id"],
            start=line["start"],
            duration=end - line["start"],
            anchor=row["text"],
            description=row["shot"],
            label=row["id"],
            set="developer-ui",
            action="reveal",
            timeOfDay="day",
        )
    )
save("episode.json", episode)


def word_frame(line_id, index, edge="start"):
    return round(by_id[line_id]["words"][index][edge] * fps)


e = {}
for event, (line, word, offset, *edge) in plan["cueLeadFrames"].items():
    e[event] = word_frame(line, word, edge[0] if edge else "start") + offset
flight = read(ROOT / "episodes/astra-one-quick-test/plan.json")["motion"]["flight"]
e["land"] = e["snap"] + round(flight * fps)
for event, (base, delta) in plan["afterCueFrames"].items():
    e[event] = e[base] + delta
flood = [
    row["fixedFrame"]
    if "fixedFrame" in row
    else max(6, round(row["at"] * (e["burst"] - 12)))
    for row in plan["flood"]
]
narration = pcm(PUBLIC / "narration.wav")
N = round(duration * R)
envelope = []
for block in narration.reshape((-1, R // fps)):
    rms = np.sqrt(np.mean(block**2))
    envelope.append(round(100 * np.clip((rms - 0.011) / 0.13, 0, 1)))
save("cues.json", dict(events=e, floodFrames=flood, mouth=envelope))

ledger = read(EP / "assets/sounds.json")
sources = {name: pcm(ROOT / row["file"]) for name, row in ledger.items()}
effects = np.zeros(N)
log = []
riser = plan.get("openingRiser")
if riser:
    row = ledger[riser["sound"]]
    crest = e["burst"] * (R // fps)
    release = round(riser["releaseSeconds"] * R)
    source_start = round(row["accent"] * R) - crest
    length = crest + release
    allowed_start, allowed_end = (round(t * R) for t in row["trim"])
    if not allowed_start <= source_start < source_start + length <= allowed_end:
        raise ValueError(
            "Opening riser does not contain the complete build and release"
        )
    swell = sources[riser["sound"]][source_start : source_start + length].copy()
    envelope = np.interp(
        np.arange(length),
        [0, round(0.075 * R), crest * 0.52, crest, length - 1],
        [0, 0.64, 0.80, 1, 0],
    )
    swell *= envelope
    swell *= riser["peak"] / np.max(np.abs(swell))
    effects[:length] += swell
    log.append(
        dict(
            action="tension rises beneath the post flood",
            sound=riser["sound"],
            frame=0,
            time=0,
            crestFrame=e["burst"],
            endTime=length / R,
            sourceTrim=[source_start / R, (source_start + length) / R],
            peak=riser["peak"],
        )
    )


def place(sound, frame, level, action, rate=1):
    row = ledger[sound]
    lo, hi = row["trim"]
    source = sources[sound][round(lo * R) : round(hi * R)]
    out = np.interp(np.arange(0, len(source), rate), np.arange(len(source)), source)
    edge = min(round(0.003 * R), len(out) // 2)
    out[:edge] *= np.linspace(0, 1, edge)
    out[-edge:] *= np.linspace(1, 0, edge)
    out *= level / max(np.max(np.abs(out)), 0.001)
    start = round((frame / fps - (row["accent"] - lo) / rate) * R)
    if start < 0 or start + len(out) > N:
        raise ValueError(f"{action} falls outside the edit")
    effects[start : start + len(out)] += out
    log.append(
        dict(
            frame=frame,
            time=frame / fps,
            sound=sound,
            action=action,
            rate=rate,
            peak=level,
        )
    )


for i, frame in enumerate(flood):
    place("pop", frame, 0.13 if i < 3 else 0.077, "incoming post", 0.88 + i * 0.047)
swipe_accent = round(plan["cardMotion"]["swipeFrames"] / 2)
for name in ("zero", "lazy", "prefer"):
    place(
        "slide",
        e[name] + swipe_accent,
        0.066 if name == "prefer" else 0.047,
        name + " post crosses frame",
        1.05,
    )
place("burst", e["burst"] + round(plan["cardMotion"]["floodExitFrames"] / 2), 0.15, "post pile breaks apart", 0.96)
place("pop", e["cube"] + swipe_accent, 0.066, "cube enters", 0.93)
place("snap", e["snap"], 0.20, "finger snap")
place("burst", e["snap"] + 26, 0.046, "cube rotates", 1.42)
place("land", e["land"], 0.16, "cube contacts the floor", 0.68)
# A low two-note contact reinforces the reused blue cube's fasteditor click.
t = np.arange(round(0.155 * R)) / R
start = round(e["land"] / fps * R)
effects[start : start + len(t)] += (
    0.086
    * np.sin(2 * np.pi * (111 * t - 170 * t * t))
    * np.exp(-30 * t)
    * (1 - np.exp(-t / 0.002))
)
wav(PUBLIC / "effects.wav", effects)
save("audio-events.json", sorted(log, key=lambda x: x["frame"]))

bed = pcm(ROOT / plan["music"])
cross = round(0.4 * R)
while len(bed) < N:
    w = np.linspace(0, 1, cross)
    bed = np.concatenate(
        (bed[:-cross], bed[-cross:] * (1 - w) + bed[:cross] * w, bed[cross:])
    )
bed = bed[:N].copy()
bed *= 0.021 / np.sqrt(np.mean(bed**2))
ts = np.arange(N) / R
curve = np.interp(
    ts,
    [
        0,
        0.08,
        0.24,
        e["fever"] / fps - 0.027,
        e["fever"] / fps,
        e["snap"] / fps,
        e["snap"] / fps + 0.28,
        duration - 0.16,
        duration,
    ],
    [0, 0, 1, 1, 0, 0, 0.83, 0.78, 0],
)
if riser:
    burst = e["burst"] / fps
    curve *= np.interp(
        ts, [0, burst, burst + 0.35], [riser["musicGain"], riser["musicGain"], 1]
    )
wav(PUBLIC / "music.wav", bed * curve)
with tempfile.TemporaryDirectory() as temp:
    mix = Path(temp) / "mix.wav"
    args = [
        part
        for stem in ("narration", "music", "effects")
        for part in ("-i", str(PUBLIC / (stem + ".wav")))
    ]
    run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-y",
            *args,
            "-filter_complex",
            "amix=inputs=3:duration=first:normalize=0",
            "-ac",
            "2",
            "-c:a",
            "pcm_f32le",
            str(mix),
        ]
    )
    meter = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-i",
            str(mix),
            "-af",
            "loudnorm=I=-16:TP=-2:LRA=8:print_format=json",
            "-f",
            "null",
            "-",
        ],
        capture_output=True,
        check=True,
    )
    stats = json.loads(re.search(r"\{[^{}]+\}", meter.stderr.decode()).group())
    gain = min(-16 - float(stats["input_i"]), -2.1 - float(stats["input_tp"]))
    run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-y",
            "-i",
            str(mix),
            "-af",
            f"volume={gain:.5f}dB",
            "-ar",
            str(R),
            "-c:a",
            "pcm_s24le",
            str(PUBLIC / "mix.wav"),
        ]
    )
save(
    "audio-master.json",
    dict(
        gainDb=gain,
        preGain=stats,
        musicDropFrame=e["fever"],
        musicReturnFrame=e["snap"],
        frames=timeline["frames"],
    ),
)
print(
    f"{len(words)} spoken words, {len(flood)} flood entrances, {len(envelope)} audio-driven mouth frames"
)

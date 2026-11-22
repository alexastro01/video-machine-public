"""Conform Astra's selected performances and the diagram to the same word clock."""

import hashlib
import itertools
import json
import math
import re
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from dialogue_media import ROOT, R, normal, pcm, run, wav

SLUG = "make-no-mistakes"
EP = ROOT / "episodes" / SLUG
PUB = ROOT / "public" / "episodes" / SLUG


def read(file):
    return json.loads(file.read_text())


def save(file, value):
    file.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")


def make_captions(groups):
    """Group one or two words within a continuous take or edit, using their recorded times."""
    captions = []
    for words in groups:
        index = 0
        while index < len(words):
            first = words[index]
            chunk = [first]
            index += 1
            if (
                index < len(words)
                and not re.search(r"[.!?,:…]['’]?$", first["text"])
                and words[index]["start"] - first["end"] < 0.31
            ):
                chunk.append(words[index])
                index += 1
            end = chunk[-1]["end"] + (
                0.58 if normal(chunk[-1]["text"]) == "saved" else 0.1
            )
            if index < len(words):
                end = min(end, words[index]["start"])
            start_ms = round(first["start"] * 1000)
            captions.append(
                {
                    "text": " ".join(w["text"] for w in chunk),
                    "startMs": start_ms,
                    "endMs": round(end * 1000),
                    "timestampMs": start_ms,
                    "confidence": None,
                }
            )
    for cue, following in itertools.pairwise(captions):
        cue["endMs"] = min(cue["endMs"], following["startMs"])
    return captions


def music_bed(source, samples):
    """Loop the score through a short crossfade, then match its level for this edit."""
    track = source
    overlap = round(0.4 * R)
    fade = np.linspace(0, 1, overlap)
    while len(track) < samples:
        crossfade = track[-overlap:] * (1 - fade) + track[:overlap] * fade
        track = np.concatenate((track[:-overlap], crossfade, track[overlap:]))
    track = track[:samples].copy()
    track *= 0.026 / max(0.001, np.sqrt(np.mean(track**2)))
    return track


def normalize_take(source, destination, samples, target, channels, ceiling):
    meter = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-i",
            str(source),
            "-af",
            "loudnorm=print_format=json",
            "-f",
            "null",
            "-",
        ],
        capture_output=True,
        check=True,
    )
    measured = json.loads(re.search(r"\{[^{}]+\}", meter.stderr.decode()).group())
    gain = target - float(measured["input_i"])
    filters = (
        f"volume={gain:.5f}dB,alimiter=limit={ceiling}:attack=5:release=60:level=0:latency=1,"
        f"asetpts=N/SR/TB,apad=whole_len={samples},atrim=end_sample={samples}"
    )
    run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-y",
            "-i",
            str(source),
            "-af",
            filters,
            "-ar",
            str(R),
            "-ac",
            str(channels),
            "-c:a",
            "pcm_s24le",
            str(destination),
        ]
    )


plan = read(EP / "plan.json")
script = read(EP / "script.json")
fps, speed = plan["fps"], plan["speed"]


def speech_rms(audio):
    block = R // 50
    energy = np.mean(
        audio[: len(audio) // block * block].reshape(-1, block) ** 2, axis=1
    )
    active = energy[energy > max(1e-7, np.percentile(energy, 92) * 0.018)]
    return float(np.sqrt(np.mean(active)))


def final_release(audio, word_end):
    """Keep low-energy final consonants beyond the last aligned voiced phone."""
    block = R // 200
    pos = round(word_end * R)
    tail = audio[pos : pos + round(0.34 * R)]
    energy = np.mean(tail[: len(tail) // block * block].reshape(-1, block) ** 2, axis=1)
    active = np.flatnonzero(energy > 0.0016**2)
    return min(
        len(audio) / R,
        word_end + (active[-1] + 1) / 200 + 0.025 if len(active) else word_end + 0.035,
    )


def tighten_hook(audio, words, offset):
    """Cut the spaces between words before conforming the short opening performance."""
    cuts = []
    for previous, following in itertools.pairwise(words):
        left = round((previous["end"] - offset + 0.022) * R)
        right = round((following["start"] - offset - 0.020) * R)
        if right - left > R * 0.012:
            cuts.append((left, right))
    cursor = 0
    pieces = []
    for left, right in cuts:
        part = audio[cursor:left].copy()
        part[-48:] *= np.linspace(1, 0, 48)
        if cursor:
            part[:48] *= np.linspace(0, 1, 48)
        pieces.append(part)
        cursor = right
    part = audio[cursor:].copy()
    if cursor:
        part[:48] *= np.linspace(0, 1, 48)
    pieces.append(part)

    def map_time(value):
        sample = round((value - offset) * R)
        return (sample - sum(b - a for a, b in cuts if b <= sample)) / R

    return np.concatenate(pieces), [
        dict(w, start=map_time(w["start"]), end=map_time(w["end"])) for w in words
    ]


reference_level = np.median(
    [
        speech_rms(pcm(PUB / "voices" / f"{key}-take1.wav"))
        for key in ("limit", "gpu", "stream", "pool", "recap")
    ]
)
timeline, timings, pieces, provenance = {}, [], [], []
cursor = 0
for row in script:
    key = row["id"]
    source = PUB / "voices" / f"{key}-take{row.get('take', 1)}.wav"
    aligned = read(EP / "voices" / f"{key}.json")
    sha = hashlib.sha256(source.read_bytes()).hexdigest()
    words = aligned["words"]
    if sha != aligned["sha256"] or row["text"].split() != [w["text"] for w in words]:
        raise ValueError(f"{key}: the recorded script or selected take changed")
    src = pcm(source)
    # Retain fricatives beyond the last aligned phoneme and lead-in consonants.
    lo = max(0.0, words[0]["start"] - (0.028 if key == "hook" else 0.080))
    hi = (
        final_release(src, words[-1]["end"])
        if key in ("route", "pout", "hook")
        else min(len(src) / R, words[-1]["end"] + 0.115)
    )
    trimmed = src[round(lo * R) : round(hi * R)]
    mapped_words = [dict(w, start=w["start"] - lo, end=w["end"] - lo) for w in words]
    take_speed = speed
    if key == "hook":
        trimmed, mapped_words = tighten_hook(trimmed, words, lo)
        take_speed = len(trimmed) / (
            round(plan["pictureHookFrames"] * R / fps) - round(0.035 * R)
        )
    with tempfile.NamedTemporaryFile(suffix=".wav") as temp:
        wav(Path(temp.name), trimmed)
        edited = np.frombuffer(
            run(
                [
                    "ffmpeg",
                    "-v",
                    "error",
                    "-i",
                    temp.name,
                    "-af",
                    f"atempo={take_speed:.9f}",
                    "-ar",
                    str(R),
                    "-ac",
                    "1",
                    "-f",
                    "f32le",
                    "-",
                ]
            ),
            "<f4",
        ).copy()
    # Hold a frame-exact transition even if the filter pads its last overlap window.
    if key == "hook":
        target = round(plan["pictureHookFrames"] * R / fps) - round(0.035 * R)
        if len(edited) != target:
            positions = np.linspace(0, len(edited) - 1, target)
            edited = np.interp(positions, np.arange(len(edited)), edited).astype(
                np.float32
            )
    pickup_gain = (
        float(np.clip(reference_level / speech_rms(edited), 0.66, 1.52))
        if row.get("take", 1) >= 3
        else 1.0
    )
    edited *= pickup_gain
    fade = np.linspace(0, 1, round(0.004 * R))
    edited[: len(fade)] *= fade
    edited[-len(fade) :] *= fade[::-1]
    actual_speed = len(trimmed) / len(edited)
    start = cursor / R
    mapped = [
        {
            "text": v["text"],
            "start": round(start + v["start"] / actual_speed, 6),
            "end": round(start + v["end"] / actual_speed, 6),
        }
        for v in mapped_words
    ]
    gap = (
        0.085
        if key in ("hook", "front", "gpu", "stream", "database", "twist")
        else 0.045
    )
    if key == "payoff":
        gap = 0.20
    if key == "hook":
        gap = 0.035
    if key == "route":
        gap = 0.5
    if key == "pout":
        gap = 0.025
    timeline[key] = {"at": round(start * fps), "words": mapped}
    timings.extend(mapped)
    pieces.extend([edited, np.zeros(round(gap * R))])
    cursor += len(edited) + round(gap * R)
    take = read(source.with_suffix(".json"))
    provenance.append(
        {
            "line": key,
            "source": str(source.relative_to(ROOT)),
            "sha256": sha,
            "trim": [round(lo, 6), round(hi, 6)],
            "speed": round(actual_speed, 6),
            "gainDb": round(20 * math.log10(pickup_gain), 3),
            "sessionId": take["sessionId"],
            "model": take["modelReturned"],
            "voice": take["voice"],
            "voiceId": take["voiceId"],
        }
    )
frames = math.ceil(cursor * fps / R)
seconds = frames / fps
size = round(seconds * R)
narration = np.pad(np.concatenate(pieces), (0, size - cursor))
# Match line loudness as a single performance, keeping transients below full scale.
with tempfile.TemporaryDirectory() as temp:
    raw_voice = Path(temp) / "narration.wav"
    wav(raw_voice, narration)
    normalize_take(raw_voice, PUB / "narration.wav", size, -17, 1, 0.79)
run(
    [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-i",
        str(PUB / "narration.wav"),
        "-codec:a",
        "libmp3lame",
        "-q:a",
        "1",
        str(PUB / "source-take-1.mp3"),
    ]
)
save(
    EP / "voice-provenance.json",
    {
        "provider": "OpenAI API",
        "voice": "Astra Spark",
        "disclosure": "Astra Spark is an AI-generated voice.",
        "selected": provenance,
        "master": "The local take is the conformed sequence of the selected line recordings. Word times follow that sequence.",
    },
)
save(EP / "transcript-source.json", {"sourceTake": 1, "words": timings})
(EP / "narration.txt").write_text("\n\n".join(row["text"] for row in script) + "\n")

cues = {}
for name, (key, anchor, *offset) in plan["wordCues"].items():
    words = timeline[key]["words"]
    wanted = [normal(w) for w in anchor.split()]
    haystack = [normal(w["text"]) for w in words]
    matches = [
        i
        for i in range(len(haystack) - len(wanted) + 1)
        if haystack[i : i + len(wanted)] == wanted
    ]
    if len(matches) != 1:
        raise ValueError(
            f"{name}: expected exactly one occurrence of {anchor} in {key}"
        )
    cues[name] = round(words[matches[0] + (offset[0] if offset else 0)]["start"] * fps)
# The gate emits checks 12 frames apart. The worker finishes, clears, then admits the waiting ticket.
cues["secondCheck"] = cues["check"] + 12
cues["free"] = max(cues["batch"] - 14, cues["wait"] + 14)
stages = {s["id"]: timeline[s["lines"][0]]["at"] for s in plan["stages"]}
lines = {k: v["at"] for k, v in timeline.items()}
save(
    EP / "cues.json",
    {"frames": frames, "fps": fps, "events": cues, "stages": stages, "lines": lines},
)
captions = make_captions(line["words"] for line in timeline.values())
captions[-1]["endMs"] = math.floor(seconds * 1000)
save(EP / "captions.json", captions)
# Speech envelope is sampled from the actual conformed narration for the character's mouth.
per_frame = R // fps
envelope = np.sqrt(np.mean(narration.reshape(frames, per_frame) ** 2, axis=1))
save(
    EP / "mouth.json",
    np.minimum(
        3,
        np.floor(
            envelope
            / np.maximum(0.012, np.percentile(envelope[envelope > 0.006], 70))
            * 3
        ),
    )
    .astype(int)
    .tolist(),
)

effects = np.zeros(size)
sound_log = []
assets = {}
for name, (file, a, b, accent) in plan["library"].items():
    raw = pcm(PUB / "sfx" / (name + Path(file).suffix))[round(R * a) : round(R * b)]
    assets[name] = raw / max(0.001, np.max(abs(raw))), accent - a


def accent(name, frame, gain):
    clip, offset = assets[name]
    at = round((frame / fps - offset) * R)
    left = max(0, at)
    right = min(size, at + len(clip))
    if right > left:
        effects[left:right] += clip[left - at : right - at] * gain
    sound_log.append(
        {
            "sound": name,
            "frame": frame,
            "gain": gain,
            "source": plan["library"][name][0],
        }
    )


for event, (name, gain) in plan["soundCues"].items():
    accent(name, cues[event], gain)
riser = plan["riser"]
crest = cues["hookDouble"] / fps
riser_start = riser["sourceAccentSeconds"] - crest * riser["speed"]
riser_end = riser["sourceAccentSeconds"] + riser["afterAccentSeconds"] * riser["speed"]
riser_source = pcm(PUB / "sfx" / "opening-riser.mp3")
# Play the source faster, including its pitch rise, and land its crest on the stamp.
riser_samples = (
    np.arange(round((crest + riser["afterAccentSeconds"]) * R)) * riser["speed"]
    + riser_start * R
)
swell = np.interp(riser_samples, np.arange(len(riser_source)), riser_source)
swell *= riser["gain"] / np.max(np.abs(swell))
swell[:240] *= np.linspace(0, 1, 240)
swell[-3840:] *= np.linspace(1, 0, 3840)
effects[: len(swell)] += swell
sound_log.append(
    {
        "sound": "opening riser",
        "frame": 0,
        "crestFrame": cues["hookDouble"],
        "gain": riser["gain"],
        "speed": riser["speed"],
        "source": riser["file"],
        "trimSeconds": [riser_start, riser_end],
    }
)
accent("click", cues["secondCheck"], 0.10)
for f in range(stages["front"], stages["front"] + 21, 4):
    accent("click", f, 0.037)
for k in range(1, 3):
    accent("click", cues["ship"] + k * 17, 0.046)
wav(PUB / "effects.wav", effects)
save(EP / "audio-events.json", sound_log)
source_music = pcm(ROOT / plan["music"])
bed = music_bed(source_music, size)
t = np.arange(size) / R
bed *= np.interp(
    t,
    [
        0,
        0.17,
        stages["twist"] / fps - 0.15,
        stages["twist"] / fps + 0.12,
        cues["signup"] / fps,
        cues["ten"] / fps,
        lines["pout"] / fps - 0.08,
        lines["pout"] / fps + 0.13,
        seconds,
    ],
    [0.35, 1, 1, 0.34, 0.36, 0.8, 0.82, 0.20, 0],
)
wav(PUB / "music.wav", bed)
with tempfile.TemporaryDirectory() as temp:
    mix = Path(temp) / "mix.wav"
    streams = [
        item
        for stem in ("narration", "music", "effects")
        for item in ("-i", str(PUB / (stem + ".wav")))
    ]
    run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-y",
            *streams,
            "-filter_complex",
            "amix=inputs=3:duration=first:normalize=0",
            "-ar",
            str(R),
            "-ac",
            "2",
            "-c:a",
            "pcm_f32le",
            str(mix),
        ]
    )
    raw = subprocess.run(
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
    stats = json.loads(re.search(r"\{[^{}]+\}", raw.stderr.decode()).group())
    gain = min(-16 - float(stats["input_i"]), -2.0 - float(stats["input_tp"]))
    run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-y",
            "-i",
            str(mix),
            "-af",
            f"volume={gain:.6f}dB",
            "-c:a",
            "pcm_s24le",
            str(PUB / "mix.wav"),
        ]
    )
    save(EP / "audio-master.json", {"gainDb": gain, "preGain": stats})
episode = read(EP / "episode.json")
episode.update(
    renderer="remotion",
    world=SLUG,
    closingFade=False,
    fps=fps,
    duration=seconds,
    cast=["astra", "alex"],
    fiction=False,
    premise="Astra traces Alex’s login-page prompt, compares its input tokens and reveals the four-word example in OpenAI’s GPT-5 launch post.",
)
episode["audio"] = {
    "narration": f"episodes/{SLUG}/narration.wav",
    "music": f"episodes/{SLUG}/music.wav",
    "effects": f"episodes/{SLUG}/effects.wav",
    "narrationOffset": 0,
    "narrationTail": seconds - timings[-1]["end"],
    "narrationTrimStart": 0,
    "pauses": [],
}
episode["scenes"] = []
for i, s in enumerate(plan["stages"]):
    key = s["id"]
    first = s["lines"][0]
    end = stages[plan["stages"][i + 1]["id"]] if i + 1 < len(plan["stages"]) else frames
    episode["scenes"].append(
        {
            "id": key,
            "start": stages[key] / fps,
            "duration": (end - stages[key]) / fps,
            "anchor": next(r["text"] for r in script if r["id"] == first),
            "description": s["description"],
            "label": key,
            "set": "developer-ui",
            "action": "reveal",
            "timeOfDay": "day",
        }
    )
save(EP / "episode.json", episode)
print(
    f"{frames} frames, {seconds:.2f} s, {len(timings)} aligned words across {len(script)} selected recordings."
)

# The shorter edit uses the same performances at the same speed. Cut on pauses between
# words and keep a continuous music bed under the new picture edit.
omitted = set()
for line_id, first, last in plan["shortOmissions"]:
    line_words = timeline[line_id]["words"]
    if not 0 <= first <= last < len(line_words):
        raise ValueError(f"Invalid short edit on {line_id}")
    omitted.update(w["start"] for w in line_words[first : last + 1])
boundaries = [0]
for left, right in itertools.pairwise(timings):
    if (left["start"] in omitted) != (right["start"] in omitted):
        boundaries.append(round((left["end"] + right["start"]) * fps / 2))
boundaries.append(frames)
short_text = {}
for line_id, original, revised in plan["shortCaptionEdits"]:
    matches = [w for w in timeline[line_id]["words"] if w["text"] == original]
    if len(matches) != 1 or matches[0]["start"] in omitted:
        raise ValueError(
            f"Short caption edit must identify one retained word in {line_id}"
        )
    short_text[matches[0]["start"]] = revised
spans, short_words, short_groups = [], [], []
cursor = 0
for left, right in itertools.pairwise(boundaries):
    group = [
        w
        for w in timings
        if w["start"] >= left / fps - 0.012 and w["start"] < right / fps - 0.012
    ]
    if not group or group[0]["start"] in omitted:
        continue
    if any(w["start"] in omitted for w in group):
        raise ValueError("A short cut intersects the wrong phrase")
    spans.append({"sourceIn": left, "sourceOut": right, "at": cursor})
    offset = (cursor - left) / fps
    short_groups.append(
        [
            {
                "text": short_text.get(w["start"], w["text"]),
                "start": round(w["start"] + offset, 6),
                "end": round(w["end"] + offset, 6),
            }
            for w in group
        ]
    )
    short_words.extend(short_groups[-1])
    cursor += right - left
short_frames = cursor
short_captions = make_captions(short_groups)
short_captions[-1]["endMs"] = math.floor(short_frames * 1000 / fps)
short_lines = []
for line in timeline.values():
    kept = [
        short_text.get(w["start"], w["text"])
        for w in line["words"]
        if w["start"] not in omitted
    ]
    if kept:
        short_lines.append(" ".join(kept))
(EP / "narration-short.txt").write_text("\n\n".join(short_lines) + "\n")
save(
    EP / "short-edit.json",
    {
        "frames": short_frames,
        "spans": spans,
        "words": short_words,
        "captions": short_captions,
    },
)


def compact_pcm(audio):
    parts = []
    for s in spans:
        a = audio[s["sourceIn"] * per_frame : s["sourceOut"] * per_frame].copy()
        a[: len(fade)] *= fade
        a[-len(fade) :] *= fade[::-1]
        parts.append(a)
    return np.concatenate(parts)


short_voice = compact_pcm(pcm(PUB / "narration.wav"))
short_fx = compact_pcm(effects)


# Derive the two ducking moments from their positions in the abridged cut.
def to_short(f):
    for span in spans:
        if f < span["sourceOut"]:
            return span["at"] + max(0, f - span["sourceIn"])
    return short_frames


def pose_track(length, to_edit):
    # Anchor the performed gestures to their actions, then place the remaining
    # pose cuts 2–3 seconds apart in the actual viewing edit.
    anchors = [
        (0, "defense"),
        (to_edit(cues["ship"] - 10), "point"),
        (to_edit(cues["spike"] - 7), "cover"),
        (min(to_edit(cues["glance"] - 5), length - 120), "puff"),
        (length, None),
    ]
    accents = [
        (to_edit(cues[name]), pose)
        for name, pose in (
            ("balance", "point"),
            ("check", "proud"),
            ("ban", "defense"),
            ("prompt", "doubt"),
            ("three", "point"),
            ("six", "proud"),
            ("wait", "doubt"),
            ("predict", "snap"),
            ("standup", "turn-away"),
            ("type", "proud"),
            ("drama", "defense"),
            ("primary", "point"),
            ("tired", "turn-away"),
            ("copies", "point"),
            ("five", "proud"),
            ("sign", "defense"),
            ("rFront", "snap"),
            ("rGpu", "point"),
            ("rDb", "turn-away"),
            ("incident", "doubt"),
            ("think", "point"),
            ("thinking", "proud"),
        )
    ]
    cycle = ["proud", "point", "defense", "doubt", "snap", "turn-away", "relief"]
    track = []
    for (left, pose), (right, following) in itertools.pairwise(anchors):
        distance = right - left
        beats = max(
            1, math.ceil(distance / 180), min(round(distance / 148), distance // 120)
        )
        if distance / beats < 120 or distance / beats > 180:
            raise ValueError(f"Gesture anchors are too close: {left} and {right}")
        track.append({"at": left, "pose": pose})
        for i in range(1, beats):
            pos = left + round(distance * i / beats)
            excluded = {track[-1]["pose"]}
            if i == beats - 1:
                excluded.add(following)
            options = [
                p
                for a, p in sorted(accents, key=lambda cue: abs(cue[0] - pos))
                if abs(a - pos) <= 95
            ]
            options += (
                cycle[len(track) % len(cycle) :] + cycle[: len(track) % len(cycle)]
            )
            track.append(
                {"at": pos, "pose": next(p for p in options if p not in excluded)}
            )
    # Give the 10-second gate result a steady read before the request map opens.
    for i in range(1, len(track) - 1):
        if 590 <= track[i]["at"] <= 640:
            earliest = max(track[i - 1]["at"] + 120, track[i + 1]["at"] - 180)
            latest = min(track[i - 1]["at"] + 180, track[i + 1]["at"] - 120)
            track[i]["at"] = max(earliest, min(588, latest))
    return track


save(
    EP / "pose-timing.json",
    {
        "full": pose_track(frames, lambda f: f),
        "short": pose_track(short_frames, to_short),
    },
)
s_n = short_frames * per_frame
s_t = np.arange(s_n) / R
s_curve = np.interp(
    s_t,
    [
        0,
        0.17,
        to_short(stages["twist"]) / fps - 0.15,
        to_short(stages["twist"]) / fps + 0.12,
        to_short(cues["signup"]) / fps,
        to_short(cues["ten"]) / fps,
        to_short(lines["pout"]) / fps - 0.08,
        to_short(lines["pout"]) / fps + 0.13,
        short_frames / fps,
    ],
    [0.35, 1, 1, 0.34, 0.36, 0.8, 0.82, 0.20, 0],
)
s_bed = music_bed(source_music, s_n)
with tempfile.TemporaryDirectory() as temp:
    m = Path(temp) / "short.wav"
    wav(m, short_voice + short_fx + s_bed * s_curve)
    normalize_take(m, PUB / "short-mix.wav", s_n, -16, 2, 0.77)


def srt_time(ms):
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


srt = []
i = 0
for cue in short_captions:
    parts = cue["text"].split()
    for j in range(len(parts)):
        start = max(cue["startMs"], round(short_words[i + j]["start"] * 1000))
        end = (
            min(cue["endMs"], round(short_words[i + j + 1]["start"] * 1000))
            if j + 1 < len(parts)
            else cue["endMs"]
        )
        srt.append(
            f"{len(srt) + 1}\n{srt_time(start)} --> {srt_time(end)}\n{' '.join(parts[: j + 1])}\n"
        )
    i += len(parts)
(EP / "captions-short.srt").write_text("\n".join(srt))
print(
    f"Short edition: {short_frames} frames, {short_frames / fps:.2f} s, {len(short_words)} words."
)

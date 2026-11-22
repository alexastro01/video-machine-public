"""Prepare the 32-second RIP edit from the saved Astra Spark takes."""

import hashlib
import json
import subprocess

import numpy as np

from dialogue_media import ROOT, R, pcm, wav

episode = ROOT / "episodes/rip"
edit_dir = episode / "build-failed"
public = ROOT / "public/episodes/rip"
assets = public / "build-failed"
plan = json.loads((episode / "edit.json").read_text())
fps = plan["fps"]
count = plan["frames"] * R // fps
cues = plan["cues"]
voice = np.zeros(count)
effects = np.zeros(count)
words, lines, chunks, events = [], [], [], []


def save(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def rms(signal):
    return float(np.sqrt(np.mean(signal**2)))


def active_rms(signal):
    blocks = signal[: len(signal) // 240 * 240].reshape(-1, 240)
    energy = np.sqrt(np.mean(blocks * blocks, axis=1))
    return rms(energy[energy > energy.max() * 0.12])


def add(track, sound, at):
    start = round(at * R)
    if start < 0:
        sound, start = sound[-start:], 0
    if start + len(sound) > len(track):
        raise ValueError(f"Audio extends past the hard cut at {at}")
    track[start : start + len(sound)] += sound


def fade(sound, attack=0.003, tail=0.025):
    sound = sound.copy()
    for seconds, reverse in ((attack, False), (tail, True)):
        size = min(len(sound), round(R * seconds))
        if size:
            view = sound[-size:][::-1] if reverse else sound[:size]
            view *= np.linspace(0, 1, size)
    return sound


for spec in plan["lines"]:
    key = spec["id"]
    src = assets / "voices" / f"{key}.wav"
    alignment = json.loads((edit_dir / "voices" / f"{key}.json").read_text())
    if alignment["sha256"] != hashlib.sha256(src.read_bytes()).hexdigest():
        raise ValueError(f"Stale alignment for {key}")
    stamped = alignment["words"]
    assert [w["text"] for w in stamped] == spec["text"].split()
    source = pcm(src)
    first, last = stamped[0]["start"], stamped[-1]["end"]
    # The quiet onset of "I" precedes its CTC peak in the blog line.
    trim = first - (0.22 if key == "blog" else 0.075)
    stop = min(len(source) / R, last + 0.13)
    samples = source[round(trim * R) : round(stop * R)].astype(float)
    rate, extra, gap_at = 1.0, 0.0, float("inf")
    onset = spec["onset"]
    at = onset - (first - trim)
    if key == "right":
        rate, extra = 0.89, 0.125
        gap_at = (stamped[0]["end"] + stamped[1]["start"]) / 2
        split = round((gap_at - trim) * R)
        samples = np.r_[
            fade(samples[:split], 0, 0.005),
            np.zeros(round(extra * R)),
            fade(samples[split:], 0.005, 0),
        ]
        # Preserve pitch on the final, measured deadpan line. Lead room and a
        # short tail keep atempo from trimming the final consonant.
        padded = np.r_[samples, np.zeros(round(0.3 * R))].astype("<f4")
        stretched = subprocess.run(
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
                "-",
                "-af",
                f"atempo={rate}",
                "-f",
                "f32le",
                "-",
            ],
            input=padded.tobytes(),
            capture_output=True,
            check=True,
        )
        samples = np.frombuffer(stretched.stdout, "<f4")[
            : round(len(samples) / rate)
        ].astype(float)
        at = 30.5
        samples = samples[: round((31.95 - at) * R)]

    def movie_time(t):
        return round(at + (t - trim + (extra if t > gap_at else 0)) / rate, 5)

    samples = fade(samples)
    samples *= 0.145 / max(1e-7, active_rms(samples))
    samples = 0.84 * np.tanh(samples / 0.84)
    add(voice, samples, at)
    edits = [
        dict(text=w["text"], start=movie_time(w["start"]), end=movie_time(w["end"]))
        for w in stamped
    ]
    if key == "right":
        edits[0]["start"] = 30.5
    if key == "blog":
        edits[0]["start"] = max(0, round(at + 0.035, 4))
    frame = int(round(at * fps))
    video_samples = np.pad(samples, (0, -len(samples) % (R // fps))).reshape(
        -1, R // fps
    )
    energies = np.sqrt(np.mean(video_samples**2, axis=1))
    mouth = (
        np.clip((energies - 0.004) / max(0.01, np.percentile(energies, 80)), 0, 1)
        .round(2)
        .tolist()
    )
    lines.append(
        dict(
            id=key,
            frame=frame,
            text=spec["text"],
            words=edits,
            mouth=mouth,
            strong=spec["strong"],
        )
    )
    words.extend(edits)
    cursor = 0
    for size in spec["groups"]:
        part = edits[cursor : cursor + size]
        next_start = edits[cursor + size]["start"] if cursor + size < len(edits) else 32
        end = min(next_start, 32, part[-1]["end"] + 0.13)
        chunks.append(
            dict(
                text=" ".join(w["text"] for w in part),
                startMs=round(part[0]["start"] * 1000),
                endMs=round(end * 1000),
                timestampMs=round(part[0]["start"] * 1000),
                confidence=None,
            )
        )
        cursor += size
    assert cursor == len(edits)

sources = json.loads((episode / "sound-sources.json").read_text())
sounds = {k: pcm(assets / "sfx" / f"{k}.wav").astype(float) for k in sources}
# Slow the end of the sweep to follow the descending stone.
sweep = sounds["air"]
positions = np.cumsum(np.linspace(1.28, 0.72, len(sweep))) - 1.28
sounds["air"] = np.interp(positions, np.arange(len(sweep)), sweep)


def cue(name, frame, action, level=-12):
    clip = fade(sounds[name], 0.002, 0.022)
    clip *= (0.145 * 10 ** (level / 20)) / max(1e-7, active_rms(clip))
    clip = np.clip(clip, -0.155, 0.155)
    add(effects, clip, frame / fps - sources[name]["accent"])
    events.append(
        dict(source=name, frame=frame, action=action, relativeActiveRmsDb=level)
    )


for f in [*(s["startFrame"] for s in plan["industries"]), cues["post"], cues["playback"], cues["draft"], cues["failed"] + 1]:
    cue("pop", f, "Window or card appears", -13)
for field in ["draftType", "replaceType"]:
    first, last = cues[field]
    for i, f in enumerate(range(first, last + 1, 4)):
        cue("key", f, "Opus types", -12 - (i % 3))
for f in cues["publish"]:
    cue("mouse", f, "Publish contact")
for f in [cues["openCut"], cues["playback"] + 16, cues["selectHelp"]]:
    cue("mouse", f, "Playback or word selection", -13)
for industry in plan["industries"]:
    impact = industry["impact"]
    line = next(item for item in lines if item["id"] == industry["lineId"])
    gap = impact / fps - line["words"][-1]["end"]
    if not 0.04 <= gap <= 0.14:
        raise ValueError(f"{industry['name']} impact misses its spoken name by {gap:.3f}s")
    cue("air", impact - 8, industry["name"] + " stone falls", -16)
    cue("stone", impact, industry["name"] + " stone hits", -19)
    cue("boom", impact, industry["name"] + " impact")
for word in words:
    if word["start"] < 29.5:
        cue("pop", round(word["start"] * fps), "Caption word", -18)
cue("error", cues["failed"], "Build failed")
cue("typing", cues["contact"] + 1, "Alex types for one second")
cue("key", cues["enter"], "Alex presses Enter")
cue("success", cues["passed"], "Build passed")
assert not np.any(effects[round(29.5 * R) :])
assert not np.any(voice[round(29.5 * R) : round(30.5 * R)])
mix = voice + effects
gain = min(1.35, 0.84 / max(abs(mix))) * 1.38
peak = np.abs(mix * gain)
above = np.maximum(0, peak - 0.64)
limited = np.minimum(peak, 0.64) + 0.21 * (-np.expm1(-above / 0.21))
# One gain curve for all stems preserves the relative dialogue/effects mix.
gain = gain * np.divide(limited, peak, out=np.ones_like(peak), where=peak > 0)
for name, sound in [
    ("narration", voice),
    ("effects", effects),
    ("music", np.zeros(count)),
    ("mix", mix),
]:
    wav(public / (name + ".wav"), sound * gain)
subprocess.run(
    [
        "ffmpeg",
        "-v",
        "error",
        "-y",
        "-i",
        str(public / "narration.wav"),
        "-c:a",
        "libmp3lame",
        "-q:a",
        "1",
        str(public / "source-take-1.mp3"),
    ],
    check=True,
)
save(
    episode / "transcript-source.json",
    dict(sourceTake=1, voice="Astra Spark", words=words),
)
save(episode / "captions.json", chunks)
save(episode / "timeline.json", dict(lines=lines, frames=plan["frames"], fps=fps))
save(episode / "audio-events.json", events)
print(
    f"{len(lines)} Astra Spark lines, {len(words)} timed words, {len(events)} effects, 32 seconds. Final word ends at {words[-1]['end']:.3f}s."
)

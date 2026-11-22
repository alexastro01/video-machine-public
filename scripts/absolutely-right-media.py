"""Prepare the timed dialogue, counter dings and keyboard Foley from local recordings."""

import hashlib
import json
import math
import subprocess
import wave

import numpy as np

from dialogue_media import R, ROOT, pcm, run, wav


EP = ROOT / "episodes/absolutely-right"
PUB = ROOT / "public/episodes/absolutely-right"
edit = json.loads((EP / "edit.json").read_text())
fps = edit["fps"]
spf = R // fps
length = edit["frames"] * spf


def save(name, data):
    (EP / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def set_edges(audio, fade_in=0.003, fade_out=0.006):
    for count, reverse in [(round(fade_in * R), False), (round(fade_out * R), True)]:
        n = min(count, len(audio))
        if n:
            ramp = np.linspace(0, 1, n)
            if reverse:
                audio[-n:] *= ramp[::-1]
            else:
                audio[:n] *= ramp
    return audio


def pitch_preserved(audio, rate):
    count = round(len(audio) / rate)
    # Pad before atempo so that its last analysis window contains the final consonant.
    args = [
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
        f"apad=pad_dur=0.2,atempo={rate},apad,atrim=end_sample={count}",
        "-f",
        "f32le",
        "pipe:1",
    ]
    out = subprocess.run(
        args, input=audio.astype("<f4").tobytes(), capture_output=True, check=True
    )
    return np.frombuffer(out.stdout, "<f4").copy()


def load_take(spec):
    name = spec["name"]
    file = PUB / "voices" / (name + ".wav")
    align = json.loads((EP / "voices" / (name + ".json")).read_text())
    assert align["sha256"] == hashlib.sha256(file.read_bytes()).hexdigest(), name
    words = [dict(w) for w in align["words"]]
    start, stop = spec["window"]
    skip_a, skip_b = spec.get("skip", [start, start])
    source = pcm(file)
    assert 0 <= start <= skip_a <= skip_b <= stop <= len(source) / R + 0.0001
    assert (
        not any(w["start"] < skip_b and w["end"] > skip_a for w in words)
        or skip_a == skip_b
    )
    segment = np.concatenate(
        (
            source[round(start * R) : round(skip_a * R)],
            source[round(skip_b * R) : round(stop * R)],
        )
    )
    rate = spec["speed"]
    assert 0.8 <= rate <= 1.2
    audio = pitch_preserved(segment, rate)
    energies = np.sqrt(
        np.mean(audio[: len(audio) // 480 * 480].reshape(-1, 480) ** 2, axis=1)
    )
    active = energies[energies > max(energies) * 0.11]
    audio *= 0.132 / np.sqrt(np.mean(active**2))
    set_edges(audio)
    for w in words:
        for key in ("start", "end"):
            t = w[key]
            w[key] = (t - start - (skip_b - skip_a if t >= skip_b else 0)) / rate
    # The first consonant precedes the first high-confidence CTC letter.
    acoustic_start = int(np.flatnonzero(energies > max(energies) * 0.035)[0]) * 0.01
    words[0]["start"] = min(max(0, words[0]["start"]), acoustic_start)
    return audio, words


takes = {name: load_take(spec) for name, spec in edit["takes"].items()}
speech = np.zeros(length)
effects = np.zeros(length)
lines, captions, words, events, rapid = [], [], [], [], []
key_frames = []


def place(track, clip, frame, gain=1):
    start = frame * spf
    assert start >= 0 and start + len(clip) <= len(track)
    track[start : start + len(clip)] += clip * gain


def line(take, speaker, text, frame):
    sample, alignment = takes[take]
    if lines:
        assert lines[-1]["end"] <= frame + 1, (lines[-1]["text"], text)
    place(speech, sample, frame)
    at = frame / fps
    text_words = text.split()
    assert len(text_words) == len(alignment)
    timed = [
        {
            "text": text_words[i],
            "start": round(at + w["start"], 6),
            "end": round(at + w["end"], 6),
        }
        for i, w in enumerate(alignment)
    ]
    meters = np.pad(sample, (0, -len(sample) % spf)).reshape(-1, spf)
    envelope = np.sqrt(np.mean(meters**2, axis=1))
    openness = np.minimum(1, envelope / max(0.001, np.percentile(envelope, 82)))
    end = frame + math.ceil(len(sample) / spf)
    record = {
        "speaker": speaker,
        "text": text,
        "frame": frame,
        "end": end,
        "words": timed,
        "mouth": np.round(openness, 2).tolist(),
    }
    lines.append(record)
    words.extend(timed)
    captions.append(
        {
            "text": text,
            "startMs": round(timed[0]["start"] * 1000),
            "endMs": round(end / fps * 1000),
            "timestampMs": round(timed[0]["start"] * 1000),
            "confidence": None,
        }
    )
    return record


for i, exchange in enumerate(edit["exchanges"]):
    line(exchange["take"], "alex", exchange["text"], exchange["alex"])
    reply = line("right", "opus", edit["reply"], exchange["opus"])
    right = next(w for w in reply["words"] if w["text"] == edit["counterWord"])
    events.append(
        {"count": i + 1 if i < 5 else 28, "frame": round(right["start"] * fps)}
    )
last = line("right", "opus", edit["reply"], edit["typing"]["reply"])
events.append({"count": 29, "frame": round(last["words"][-1]["start"] * fps)})


def grains(source, count):
    """Overlap short windows from the whole line for the deliberately sped-up chat."""
    hop = 240
    win = 2 * hop
    starts = np.arange(-hop, count, hop)
    centers = np.linspace(0, len(source) - 1, len(starts))
    padded = np.pad(source, (hop, hop))
    weights = np.hanning(win + 1)[:-1]
    out = np.zeros(count + 3 * hop)
    for start, center in zip(starts, centers):
        j = int(center)
        out[start + hop : start + hop + win] += padded[j : j + win] * weights
    return set_edges(out[hop : hop + count], 0.001, 0.003)


# The 22 visual rows, audible 'right' syllables and bells share these exact video frames.
montage = edit["montage"]
n = montage["exchanges"]
fractions = np.linspace(0, 1, n + 1)
bounds = np.rint(
    montage["first"]
    + (montage["stop"] - montage["first"]) * (1.35 * fractions - 0.35 * fractions**2)
).astype(int)
reply_sample, reply_words = takes["right"]
split = round(reply_words[-1]["start"] * R)
for i, (begin, stop) in enumerate(zip(bounds, bounds[1:])):
    begin, stop = int(begin), int(stop)
    tick = begin + min(stop - begin - 1, round((stop - begin) * 0.67))
    count = 6 + i
    prompt = montage["prompts"][i % len(montage["prompts"])]
    rapid.append(
        {"count": count, "start": begin, "frame": tick, "end": stop, "prompt": prompt}
    )
    events.append({"count": count, "frame": tick})
    lead = np.concatenate((takes[prompt.lower().strip(".")][0], reply_sample[:split]))
    place(effects, grains(lead, (tick - begin) * spf), begin, 0.35)
    place(effects, grains(reply_sample[split:], (stop - tick) * spf), tick, 0.46)
events.sort(key=lambda event: event["frame"])
assert [e["count"] for e in events] == list(range(1, 30))


def effect(name, target_peak):
    spec = edit["sfx"][name]
    lo, hi = (round(t * R) for t in spec["trim"])
    x = pcm(PUB / "sfx" / spec["file"])[lo:hi].copy()
    return set_edges(
        x * target_peak / max(abs(x)), 0.001, 0.024 if name == "ding" else 0.009
    )


bell = effect("ding", 0.115)
key = effect("key", 0.059)
stop_sample = montage["stop"] * spf
for e in events:
    clip = bell
    if 6 <= e["count"] <= 27:
        # Tails overlap, then all the montage sound cuts off together at the stop.
        clip = set_edges(bell[: stop_sample - e["frame"] * spf].copy(), 0.001, 0.009)
        clip *= 0.54 + 0.16 * (e["count"] - 6) / 21
    place(effects, clip, e["frame"])
opening_keys = [0, 6, 12, 20, 25, 34, 42, 47, 54, 65, 73]
prompt_keys = [181, 190, 223, 234, 248, 261, 421, 431, 450, 602, 727]
key_frames = sorted(opening_keys + prompt_keys + edit["typing"]["keyFrames"])
assert len(edit["input"]) == len(edit["typing"]["keyFrames"])
for i, frame in enumerate(key_frames):
    accent = 0.7 + ((i * 7) % 6) * 0.055
    place(effects, key, frame, accent)
# Enter settles on the cut to the completely silent, sent message.
enter = edit["typing"]["enter"]
place(effects, set_edges(key[:spf].copy(), 0.0004, 0.004), enter - 1, 1.2)
master = speech + effects
lo, hi = enter * spf, edit["typing"]["reply"] * spf
assert np.max(np.abs(master[lo:hi])) == 0
gain = min(1.25, 0.84 / np.max(np.abs(master)))
with wave.open(str(PUB / "mix.wav"), "wb") as stereo:
    stereo.setparams((2, 2, R, 0, "NONE", "not compressed"))
    channels = np.repeat((master * gain * 32767).astype("<i2")[:, None], 2, axis=1)
    stereo.writeframes(channels.tobytes())
for filename, track in (
    ("narration", speech),
    ("effects", effects),
    ("music", np.zeros(length)),
):
    wav(PUB / (filename + ".wav"), track * gain)
run(
    [
        "ffmpeg",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(PUB / "narration.wav"),
        "-q:a",
        "1",
        str(PUB / "source-take-1.mp3"),
    ]
)
save(
    "transcript-source.json",
    {
        "sourceTake": 1,
        "method": "Exact-take CTC, converted through saved cuts and WSOLA speech rates. Montage word onsets are in timeline.json.",
        "words": words,
    },
)
save("captions.json", captions)
save(
    "timeline.json",
    {
        "lines": lines,
        "dings": events,
        "montage": rapid,
        "keyFrames": key_frames,
        "commitFrame": events[-1]["frame"],
        "freeze": [enter, edit["typing"]["reply"]],
    },
)
print(
    f"{len(lines)} spoken turns, {len(rapid)} time-lapse exchanges, {len(events)} counter strikes; silent samples {lo}–{hi - 1}."
)

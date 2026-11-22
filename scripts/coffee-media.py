"""Conform the coffee captions, picture cues and audio to the selected Kai take."""

from pathlib import Path
import hashlib
import json
import math
import re
import shutil
import subprocess

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SLUG = "is-coffee-actually-a-drug"
EP = ROOT / "episodes" / SLUG
PUBLIC = ROOT / "public" / "episodes" / SLUG
RATE, FPS = 48000, 60


def read(path):
    return json.loads(path.read_text())


def save(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n")


def ffmpeg(args, data=None):
    return subprocess.run(
        ["ffmpeg", "-v", "error", "-y", *map(str, args)],
        input=data,
        stdout=subprocess.PIPE,
        check=True,
    ).stdout


def samples(file, channels):
    raw = ffmpeg(["-i", file, "-ac", channels, "-ar", RATE, "-f", "f32le", "-"])
    return np.frombuffer(raw, dtype="<f4").reshape(-1, channels).copy()


def write_stem(name, data):
    ffmpeg(
        [
            "-f",
            "f32le",
            "-ar",
            RATE,
            "-ac",
            data.shape[1],
            "-i",
            "-",
            "-c:a",
            "pcm_s24le",
            PUBLIC / name,
        ],
        data.astype("<f4").tobytes(),
    )


def norm(word):
    return re.sub("[^a-z0-9]", "", word.lower())


def trim_quiet_frames(raw, words, cuts):
    """Remove only the nominated low-level intervals and map every recorded word."""
    pieces, measured = [], []
    cursor = 0
    for cut in cuts:
        first, last = cut["sourceFrames"]
        a, z = first / FPS, last / FPS
        lo, hi = round(a * RATE), round(z * RATE)
        assert cursor <= lo < hi <= len(raw)
        assert all(w["end"] <= a or w["start"] >= z for w in words), cut
        peak = float(np.max(np.abs(raw[lo:hi])))
        assert peak < 10 ** (-50 / 20), (cut, peak)
        pieces.append(raw[cursor:lo].copy())
        measured.append(
            {
                **cut,
                "sourceStart": a,
                "sourceEnd": z,
                "peakDbfs": round(20 * math.log10(max(peak, 1e-9)), 2),
            }
        )
        cursor = hi
    pieces.append(raw[cursor:].copy())
    # De-click inside the quiet margins adjacent to each splice.
    fade = round(0.003 * RATE)
    for left, right in zip(pieces, pieces[1:]):
        left[-fade:] *= np.linspace(1, 0, fade)[:, None]
        right[:fade] *= np.linspace(0, 1, fade)[:, None]

    def delivery_time(source):
        return round(
            source
            - sum(
                c["sourceEnd"] - c["sourceStart"]
                for c in measured
                if c["sourceEnd"] <= source
            ),
            6,
        )

    conformed = [
        {**w, "start": delivery_time(w["start"]), "end": delivery_time(w["end"])}
        for w in words
    ]
    return np.concatenate(pieces), conformed, measured


def main():
    board = read(EP / "storyboard.json")
    script = (EP / "narration.txt").read_text().split()
    words = [w for w in read(EP / "assets/aligned-words.json") if w["text"].strip()]
    independent = read(EP / "transcript-independent.json")["words"]
    scribe = (EP / "assets/scribe-take-1.txt").read_text().split()
    normalized = list(map(norm, script))
    assert (
        normalized
        == [norm(w["text"]) for w in words]
        == [norm(w["word"]) for w in independent]
        == list(map(norm, scribe))
    )
    # Locate attacks and decays in the recording at the disputed boundaries of
    # the two alignments. In particular, the small.en aligner lost the last word.
    revised = {
        1: (0.30, 0.84),
        2: (0.94, 1.43),
        3: (1.43, 1.61),
        4: (1.65, 2.16),
        8: (3.44, 3.94),
        9: (4.31, 5.12),
        21: (9.85, 10.00),
        89: (34.64, 35.23),
    }
    for i, (w, spelling) in enumerate(zip(words, script)):
        w["text"] = spelling
        if i in revised:
            w["start"], w["end"] = revised[i]
    for i, w in enumerate(words):
        if i + 1 < len(words):
            w["end"] = min(w["end"], words[i + 1]["start"])
        assert w["end"] > w["start"], w
    raw = samples(PUBLIC / "source-take-1.mp3", 1)
    edited, words, cuts = trim_quiet_frames(raw, words, board["silenceCuts"])
    save(
        EP / "transcript-source.json",
        {
            "sourceTake": 1,
            "editVersion": board["version"],
            "basis": "Selected continuous Kai take, local small.en forced alignment, ElevenLabs Scribe and independent OpenAI whisper-1 transcription. Disputed word edges cross-checked against source energy. Display times follow the nine measured silence trims in audio-edits.json.",
            "acousticAdjustments": list(revised),
            "words": words,
        },
    )
    duration = math.ceil((len(edited) / RATE + 0.22) * FPS) / FPS
    assert 30 <= duration <= 60
    total = round(duration * RATE)

    def anchor(phrase):
        pattern = [norm(w) for w in phrase.split()]
        indices = [
            i for i in range(len(words)) if normalized[i : i + len(pattern)] == pattern
        ]
        assert len(indices) == 1, (phrase, indices)
        return words[indices[0]]["start"]

    events = {key: anchor(phrase) for key, phrase in board["events"].items()}
    scenes = []
    for index, (name, phrase, action, location, description) in enumerate(
        board["scenes"]
    ):
        events[name] = 0 if index == 0 else round(anchor(phrase) * FPS) / FPS
        scenes.append(
            dict(
                id=name,
                start=events[name],
                action=action,
                anchor=phrase,
                set=location,
                label=description,
                timeOfDay="day",
            )
        )
    for i, shot in enumerate(scenes):
        end = scenes[i + 1]["start"] if i + 1 < len(scenes) else duration
        shot["duration"] = end - shot["start"]
    save(
        EP / "edit.json",
        {
            "fps": FPS,
            "duration": duration,
            "events": events,
            "captionY": board["captionY"],
            "version": board["version"],
            "spokenWords": len(words),
        },
    )
    phrases = board["captionPhrases"].split("|")
    assert " ".join(phrases).split() == script
    captions, pos = [], 0
    for phrase in phrases:
        last = pos + len(phrase.split()) - 1
        start = words[pos]["start"]
        next_start = words[last + 1]["start"] if last + 1 < len(words) else duration
        until = min(next_start, words[last]["end"] + 0.13)
        captions.append(
            {
                "text": phrase,
                "startMs": round(start * 1000),
                "endMs": round(until * 1000),
                "timestampMs": round(start * 1000),
                "confidence": None,
            }
        )
        pos = last + 1
    save(EP / "captions.json", captions)
    episode = read(EP / "episode.json")
    prefix = f"episodes/{SLUG}/"
    episode.update(
        renderer="remotion",
        world="coffee-motion",
        hook="none",
        closingFade=False,
        fiction=False,
        fps=FPS,
        duration=duration,
        cast=["miko"],
        premise="Miko follows caffeine from a coffee plant to a brain receptor. Two characters take turns in one green chair to explain why alertness can outlast tiredness for a while.",
        audio={
            "narration": prefix + "narration.wav",
            "music": prefix + "music.wav",
            "effects": prefix + "effects.wav",
            "narrationOffset": 0,
            "narrationTrimStart": 0,
            "narrationTail": duration - words[-1]["end"],
            "pauses": [],
        },
        scenes=scenes,
    )
    save(EP / "episode.json", episode)
    voice_file = PUBLIC / "narration.wav"
    ffmpeg(
        [
            "-f",
            "f32le",
            "-ac",
            1,
            "-ar",
            RATE,
            "-i",
            "-",
            "-af",
            "loudnorm=I=-17:TP=-3:LRA=8,aresample=48000",
            "-ac",
            2,
            "-c:a",
            "pcm_s24le",
            voice_file,
        ],
        edited.astype("<f4").tobytes(),
    )
    voice = samples(voice_file, 2)
    score = samples(PUBLIC / "source-music.mp3", 2)
    music_start = 9.16
    score = score[round(music_start * RATE) : round(music_start * RATE) + total]
    assert len(score) == total
    score *= 0.021 / max(1e-6, np.sqrt(np.mean(score**2)))
    score *= min(1, 0.108 / np.max(np.abs(score)))
    score[:3840] *= np.linspace(0, 1, 3840)[:, None]
    score[-round(0.48 * RATE) :] *= np.linspace(1, 0, round(0.48 * RATE))[:, None]
    write_stem("music.wav", score)
    library = read(ROOT / "episodes/beer-feels-good/assets/sfx-ledger.json")
    ledger = [
        row.copy() for row in library if row["id"] in ("tap", "pop", "glass", "swipe")
    ]
    book_origin = next(
        row
        for row in read(ROOT / "episodes/inventions-since-2000/sound-provenance.json")[
            "selected"
        ]
        if row["id"] == "book"
    )
    ledger.append(
        {
            **book_origin,
            "provider": "ElevenLabs MCP",
            "sha256": "ccd78bcdf1d8948b4d436a3ba18c9dd0bc472a986ecbfefff287bb42aea049ec",
        }
    )
    sounds = {}
    (PUBLIC / "sfx").mkdir(exist_ok=True)
    for row in ledger:
        original = ROOT / row["file"]
        dest = PUBLIC / "sfx" / original.name
        shutil.copyfile(original, dest)
        assert hashlib.sha256(dest.read_bytes()).hexdigest() == row["sha256"]
        row.update(
            file=str(dest.relative_to(ROOT)), copiedFrom=str(original.relative_to(ROOT))
        )
        sounds[row["id"]] = samples(dest, 1)[:, 0]
    save(EP / "assets/sfx-ledger.json", ledger)
    foley = np.zeros((total, 2), dtype=np.float32)
    cues = []

    def cue(name, time, sound, length, peak, pan=0):
        track = sounds[sound]
        onset = int(np.flatnonzero(np.abs(track) > np.max(np.abs(track)) * 0.035)[0])
        part = track[
            max(0, onset - 192) : max(0, onset - 192) + round(length * RATE)
        ].copy()
        part *= peak / max(1e-6, np.max(np.abs(part)))
        edge = min(288, len(part) // 2)
        part[:edge] *= np.linspace(0, 1, edge)
        part[-edge:] *= np.linspace(1, 0, edge)
        start = round(time * RATE)
        foley[start : start + len(part)] += part[:, None] * [
            1 - max(pan, 0),
            1 + min(pan, 0),
        ]
        cues.append(
            dict(
                action=name,
                at=round(time, 3),
                sound=sound,
                duration=round(len(part) / RATE, 3),
            )
        )

    cue("cup lifted", 0.26, "glass", 0.21, 0.042, -0.2)
    cue("surface match", events["cup"] - 0.10, "swipe", 0.27, 0.030)
    cue("caffeine breaks the surface", events["one"] + 0.10, "pop", 0.15, 0.033)
    cue("caffeine identified", events["caffeine"], "tap", 0.12, 0.025)
    cue("cherry opens", events["plants"] + 0.43, "tap", 0.10, 0.031, 0.18)
    cue("waking clock ticks", events["awakeWord"], "tap", 0.065, 0.020, -0.22)
    cue("enter the brain", events["brain"] + 0.11, "swipe", 0.29, 0.03)
    cue(
        "follow one adenosine particle", events["receptor"] - 0.17, "swipe", 0.19, 0.029
    )
    cue("chair feet touch down", events["seat"], "tap", 0.13, 0.050)
    cue("adenosine lands", events["down"], "pop", 0.18, 0.055)
    cue("signal reaches moon", events["down"] + 0.47, "pop", 0.12, 0.027, 0.27)
    cue("caffeine lands", events["occupied"], "tap", 0.16, 0.05)
    cue("adenosine rebounds", events["denied"], "pop", 0.15, 0.045, -0.18)
    cue("page turns", events["alertWord"] + 0.20, "swipe", 0.19, 0.028)
    cue("bedside clock clicks", events["need"], "tap", 0.085, 0.023, -0.32)
    cue("book covers meet", events["sleepWord"] + 0.05, "book", 0.26, 0.030)
    cue("caffeine clears", events["clearsWord"], "swipe", 0.25, 0.035, 0.12)
    cue("adenosine returns", events["again"] + 0.11, "pop", 0.16, 0.039)
    write_stem("effects.wav", foley)
    save(EP / "motion-audio-cues.json", cues)
    mix = score + foley
    mix[: min(total, len(voice))] += voice[:total]
    ffmpeg(
        [
            "-f",
            "f32le",
            "-ar",
            RATE,
            "-ac",
            2,
            "-i",
            "-",
            "-af",
            "loudnorm=I=-16:TP=-1.8:LRA=8,aresample=48000",
            "-c:a",
            "pcm_s24le",
            PUBLIC / "mix.wav",
        ],
        mix.astype("<f4").tobytes(),
    )
    save(
        EP / "audio-edits.json",
        {
            "narration": {
                "source": "source-take-1.mp3",
                "rate": 1,
                "sourceIn": 0,
                "sourceOut": len(raw) / RATE,
                "deliveryVoiceSeconds": len(edited) / RATE,
                "removedSeconds": round((len(raw) - len(edited)) / RATE, 6),
                "silenceCuts": cuts,
            },
            "music": {
                "source": "source-music.mp3",
                "sourceIn": music_start,
                "sourceOut": music_start + duration,
                "rate": 1,
                "loop": False,
            },
            "mix": "mix.wav",
            "targetIntegratedLufs": -16,
        },
    )
    print(
        f"{duration:.3f}s at {FPS} fps; {len(words)} spoken words, {len(scenes)} shots."
    )


if __name__ == "__main__":
    main()

"""Regression: soft opening and closing words must survive a speaker handoff."""
from pathlib import Path
from tempfile import TemporaryDirectory
import json
import sys
import wave
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import dialogue_media as media

with TemporaryDirectory(prefix="dialogue-edges-") as temp:
    media.ROOT = Path(temp)
    base = media.ROOT / "episodes/test"
    public = media.ROOT / "public/episodes/test"
    base.mkdir(parents=True)
    public.mkdir(parents=True)
    t = np.arange(media.R) / media.R
    audio = np.sin(2 * np.pi * 370 * t) * .1
    audio[:media.R // 5] *= .01
    audio[-media.R // 5:] *= .01
    media.wav(public / "group.wav", np.tile(audio, 2))
    words = [{"text": text, "start": at, "end": end} for text, at, end in [
        ("Quiet", 0, .15), ("start", .22, .5), ("ends.", .7, .98),
        ("Now", 1, 1.15), ("I", 1.22, 1.5), ("answer.", 1.7, 1.98),
    ]]
    (base / "group.json").write_text(json.dumps({"words": words}))
    recordings = {}
    for i, name in enumerate(["first", "reply"]):
        media.wav(public / f"{name}.wav", audio)
        own = [{**w, "start": w["start"] - i, "end": w["end"] - i} for w in words[i * 3:i * 3 + 3]]
        (base / f"{name}.json").write_text(json.dumps({"words": own}))
        recordings[name] = {"sourceFile": f"public/episodes/test/{name}.wav", "words": f"{name}.json"}
    spec = {
        "fps": 30,
        "voices": {"actor": {"take": 1, "sourceFile": "public/episodes/test/group.wav", "words": "group.json"}},
        "lines": [
            {"id": "first", "speaker": "actor", "text": "Quiet start ends.", "afterPause": .28},
            {"id": "reply", "speaker": "actor", "text": "Now I answer.", "afterPause": .3},
        ],
        "lineRecordings": recordings,
    }
    (base / "dialogue.json").write_text(json.dumps(spec))
    _, timeline, _ = media.assemble("test")
    first, reply = timeline["lines"]
    assert abs(first["duration"] - 1) < 1 / media.R
    assert abs(reply["start"] - first["end"] - .28) < 1 / media.R
    assert first["words"][0]["start"] == 0
    assert first["words"][-1]["end"] <= first["end"]
    assert reply["words"][0]["start"] >= first["end"] + .28
    with wave.open(str(public / "line-00.wav"), "rb") as f:
        samples = np.frombuffer(f.readframes(f.getnframes()), "<i2")
    assert len(samples) == media.R
    assert np.any(samples[:media.R // 10])
    assert np.any(samples[-media.R // 10:])
    edits = json.loads((base / "audio-edit.json").read_text())
    assert all(x["completeTake"] and x["sourceStart"] == 0 and x["sourceEnd"] == 1 for x in edits)

    # RMS matching must not flatten unequal loud transients into the same peak.
    transient = np.array([0, .15, .6, 1.1, 1.7, 2.1, 1.7, .6, 0,
                          -.15, -.6, -1.1, -1.7, -2.1, -.6, 0])
    media.wav(public / "headroom.wav", transient)
    with wave.open(str(public / "headroom.wav"), "rb") as f:
        written = np.frombuffer(f.readframes(f.getnframes()), "<i2") / 32767
    nonzero = transient != 0
    gains = written[nonzero] / transient[nonzero]
    assert gains.max() - gains.min() < .00025
    assert 0 < written[3] < written[4] < written[5] <= .98
    assert -.98 <= written[13] < written[12] < written[11] < 0

    # Ordinary signals retain their level rather than being normalized upward.
    ordinary = transient * .2
    media.wav(public / "ordinary.wav", ordinary)
    with wave.open(str(public / "ordinary.wav"), "rb") as f:
        written = np.frombuffer(f.readframes(f.getnframes()), "<i2") / 32767
    assert np.max(np.abs(written - ordinary)) <= 1 / 32767

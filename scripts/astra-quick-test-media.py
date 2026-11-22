"""Build One Quick Test from the selected Chris and Layla recordings."""
import hashlib
import json
import re
import subprocess
from collections import defaultdict

import numpy as np

from dialogue_media import ROOT, R, assemble, normal, pcm, run, wav

SLUG = "astra-one-quick-test"
EP = ROOT / "episodes" / SLUG
PUBLIC = ROOT / "public/episodes" / SLUG
plan = json.loads((EP / "plan.json").read_text())
duration = plan["duration"]
motion = plan["motion"]


def save(name, data):
    (EP / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


# The independent transcript excludes acting directions. The selected source windows
# leave handles around the actual consonants. First/last offsets come from these takes.
provenance = json.loads((EP / "voice-provenance.json").read_text())
performances = {**provenance["voices"], **provenance.get("pickups", {})}
transcripts = {}
sources = {}
for name, performance in performances.items():
    source = next(t for t in performance["takes"] if t["take"] == performance["selectedTake"])
    transcript_file = performance.get("transcript", f"voices/whisper-{name}.json")
    transcript = json.loads((EP / transcript_file).read_text())
    if transcript["sourceSha256"] != hashlib.sha256((ROOT / source["source"]).read_bytes()).hexdigest():
        raise ValueError(f"Unmatched source take for {name}")
    sources[name] = source["source"]
    transcripts[name] = transcript["words"]
positions = defaultdict(int)
recordings = {}
lines = []
for i, line in enumerate(plan["lines"]):
    name = line.get("recording", line["speaker"])
    tokens = line["text"].split()
    start = positions[name]
    words = transcripts[name][start:start + len(tokens)]
    if [normal(w["word"]) for w in words] != [normal(w) for w in tokens]:
        raise ValueError(f"Different reading for {line['id']}")
    mapped = [dict(text=text, start=w["start"], end=w["end"]) for text, w in zip(tokens, words)]
    mapped[0]["start"] = line["firstOnset"]
    mapped[-1]["end"] = line["lastOffset"]
    positions[name] += len(tokens)
    recordings[line["id"]] = dict(sourceFile=sources[name], sourceStart=line["sourceStart"],
                                   sourceEnd=line["sourceEnd"], wordTimings=mapped,
                                   completeTake=name in provenance.get("pickups", {}))
    next_at = plan["lines"][i + 1]["start"] if i + 1 < len(plan["lines"]) else duration
    pause = next_at - line["start"] - (line["sourceEnd"] - line["sourceStart"])
    if pause < 0:
        raise ValueError(f"Overlapping dialogue at {line['id']}")
    lines.append({k: line[k] for k in ("id", "speaker", "text")} | {"afterPause": round(pause, 6)})
# Avoid rounding an exact frame boundary up to an extra frame in the shared assembler.
lines[-1]["afterPause"] -= .1 / R
save("dialogue.json", dict(fps=plan["fps"], narrationSpeed=1, voices={}, lines=lines, lineRecordings=recordings))
_, timeline, _ = assemble(SLUG)
assert timeline["frames"] == round(duration * plan["fps"])
words = [w for line in timeline["lines"] for w in line["words"]]
save("transcript-source.json", {"sourceTake": {k: v["selectedTake"] for k,v in performances.items()}, "words": words})

episode = json.loads((EP / "episode.json").read_text())
scene_metadata = {scene["id"]: scene for scene in episode["scenes"]}
episode["duration"] = duration
episode["audio"]["narrationTail"] = round(duration - words[-1]["end"], 6)
episode["scenes"] = [{**scene_metadata[scene["id"]], **scene} for scene in plan["scenes"]]
save("episode.json", episode)

captions = []
for line in timeline["lines"]:
    pair = []
    for i, w in enumerate(line["words"]):
        pair.append(w)
        if len(pair) == 2 or w["text"].endswith((".", "?", "!")) or i == len(line["words"]) - 1:
            onset = round(pair[0]["start"] * 1000)
            captions.append(dict(text=" ".join(p["text"] for p in pair), startMs=onset,
                                 endMs=round(pair[-1]["end"] * 1000), timestampMs=onset, confidence=None))
            pair = []
save("captions.json", captions)

length = round(duration * R)
fx = np.zeros(length)
events = []
ledger = json.loads((ROOT / "episodes/full-stack-subscriber/assets/sfx-ledger.json").read_text())
sounds = {}
for item in ledger:
    if item["id"] in ("tap", "pop", "swipe", "typing"):
        a = pcm(ROOT / item["file"])
        onset = np.flatnonzero(np.abs(a) > np.max(np.abs(a)) * .025)[0]
        sounds[item["id"]] = a[max(0,onset - round(.002 * R)):]


def place(key, at, signal, seconds, peak):
    offset = round(at * R)
    n = min(len(signal), round(seconds * R), length-offset)
    a = signal[:n].copy()
    a *= peak / max(.001, np.abs(a).max())
    edge = min(round(.004 * R), n // 3)
    a[:edge] *= np.linspace(0, 1, edge)
    a[-edge:] *= np.linspace(1, 0, edge)
    fx[offset:offset+n] += a
    events.append(dict(sound=key, at=round(at, 6), duration=n/R, peak=peak))


def play(key, at, seconds, peak):
    place(key, at, sounds[key], seconds, peak)


def notes(key, at, pitches, seconds, peak):
    t = np.arange(round(seconds * R)) / R
    tone = np.zeros_like(t)
    for delay, frequency, decay in pitches:
        elapsed = np.maximum(0, t-delay)
        tone += np.sin(2*np.pi*frequency*elapsed)*np.exp(-decay*elapsed) * np.minimum(1,elapsed/.006)
    place(key, at, tone, seconds, peak)


for at in (motion["firstPay"], motion["tryButton"], motion["secondPay"], motion["finalClick"]):
    play("tap", at, .13, .091)
for at in (motion["firstError"], motion["secondError"]):
    notes("payment-error", at, [(0, 365, 14), (.082, 235, 17)], .30, .077)
for at in (motion["alert"], motion["anotherAlert"]):
    notes("launch-ping", at, [(0, 802, 13), (.075, 1160, 12)], .39, .067)
    play("swipe", at, .27, .024)
for at in (motion["chart"], motion["demo"], motion["rebuild"], motion["redesign"]):
    play("swipe", at, .28, .030)
for at in (motion["chart"]+.53,motion["chart"]+.65,motion["chart"]+.79):
    play("pop", at, .13, .026)
for line in timeline["lines"]:
    if line["id"] == "prompt":
        for w in line["words"]:
            play("typing", w["start"], min(.16,w["end"]-w["start"]), .032)
for at in (motion["cubeFlip"], motion["payFlip"]):
    play("swipe", at, .36, .055)
    land = at + motion["flight"]
    play("tap", land, .14, .086)
    notes("landing-thump", land, [(0, 126, 19),(.018, 70, 28)], .23, .096)
play("swipe", motion["keyboardHandoff"], .28, .039)
play("tap", motion["keyboardHandoff"]+.58, .12, .050)
play("typing",motion["redesign"],.72,.038)
play("pop", motion["redesign"]+.53, .16, .034)
save("audio-events.json", sorted(events,key=lambda e:e["at"]))


def stereo(name, a):
    mono = PUBLIC / f"{name}-mono.wav"
    wav(mono, a)
    run(["ffmpeg","-v","error","-y","-i",str(mono),"-ac","2",str(PUBLIC/f"{name}.wav")])

stereo("effects", fx)
bed = pcm(ROOT / plan["music"]["source"])
while len(bed) < length:
    cross = min(round(.5 * R), len(bed)//4)
    gain = np.linspace(0,1,cross)
    bed = np.concatenate([bed[:-cross],bed[-cross:]*(1-gain)+bed[:cross]*gain,bed[cross:]])
bed = bed[:length]
bed *= plan["music"]["rms"]/np.sqrt(np.mean(bed**2))
bed[:round(.065*R)] *= np.linspace(0,1,round(.065*R))
bed[-round(.15*R):] *= np.linspace(1,0,round(.15*R))
stereo("music", bed)
inputs = [part for stem in ("narration","music","effects") for part in ("-i",str(PUBLIC/f"{stem}.wav"))]
premix = PUBLIC/"mix-float.wav"
run(["ffmpeg","-v","error","-y",*inputs,"-filter_complex","amix=inputs=3:duration=first:normalize=0","-c:a","pcm_f32le",str(premix)])
measure = subprocess.run(["ffmpeg","-hide_banner","-i",str(premix),"-af","loudnorm=I=-17:TP=-2:LRA=8:print_format=json","-f","null","-"],capture_output=True,check=True)
stats = json.loads(re.search(r"\{[^{}]+\}",measure.stderr.decode()).group())
gain = min(-17-float(stats["input_i"]),-2.1-float(stats["input_tp"]))
run(["ffmpeg","-v","error","-y","-i",str(premix),"-af",f"volume={gain:.5f}dB","-c:a","pcm_s16le",str(PUBLIC/"mix.wav")])
save("audio-master.json", {"mix":"mix.wav","speechRate":1,"mixGainDb":gain,"premix":stats,"music":plan["music"],"sfx":[v for v in ledger if v["id"] in sounds]})
print(f"{len(words)} words, {timeline['frames']} frames, {len(events)} sound cues.")

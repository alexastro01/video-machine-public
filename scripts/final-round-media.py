"""Assemble the selected voices, word-driven picture cues and foley for The Final Round."""
from collections import Counter
from hashlib import sha256
import json
import math
import re
import subprocess
import tempfile
from pathlib import Path

import numpy as np

from dialogue_media import ROOT, R, assemble, pcm, run, wav

SLUG = "alex-astro-the-final-round"
EP = ROOT / "episodes" / SLUG
PUB = ROOT / "public" / "episodes" / SLUG


def read(path):
    return json.loads(path.read_text())


def save(name, body):
    (EP / name).write_text(json.dumps(body, indent=2, ensure_ascii=False) + "\n")


plan = read(EP / "plan.json")
recordings, source_words = {}, {}
roles = read(EP / "voice-provenance.json")["voices"]
for role in roles:
    key = role["role"]
    path = ROOT / role["source"]
    align = read(EP / "voices" / (key + "-aligned.json"))
    if sha256(path.read_bytes()).hexdigest() != align["sha256"]:
        raise ValueError(f"Voice recording changed for {key}")
    source_words[key] = align["words"]

cursor = Counter()
lines = []
for item in plan["lines"]:
    key, role = item["id"], item["speaker"]
    size = len(item["text"].split())
    words = source_words[role][cursor[role]:cursor[role]+size]
    cursor[role] += size
    start, end = item["sourceWindow"]
    recordings[key] = dict(sourceFile=f"public/episodes/{SLUG}/source-{role}-take-1.mp3",
                           wordTimings=words, sourceStart=start, sourceEnd=end, completeTake=False)
    if sum(item["rows"]) != size:
        raise ValueError(f"Caption row lengths disagree with {key}")
    lines.append({k:item[k] for k in ("id", "speaker", "text", "afterPause")})
if any(cursor[r] != len(words) for r, words in source_words.items()):
    raise ValueError("An aligned word was not used")
save("dialogue.json", dict(fps=plan["fps"], narrationSpeed=1, voices={}, lineRecordings=recordings, lines=lines))
_, timeline, _ = assemble(SLUG)
lines = timeline["lines"]
duration, frames, fps = timeline["duration"], timeline["frames"], timeline["fps"]
words = [word for line in lines for word in line["words"]]
save("transcript-source.json", dict(sourceTake={r["role"]:1 for r in roles}, words=words))
captions, scenes = [], []
for i,(line,item) in enumerate(zip(lines,plan["lines"])):
    stop = lines[i+1]["start"] if i+1<len(lines) else duration
    first, last = line["words"][0]["start"], line["words"][-1]["end"]
    until = min(stop, last+.48) if i+1<len(lines) else duration
    if line["id"] == "salary":
        until = stop
    captions.append(dict(text=line["text"],startMs=round(first*1000),endMs=min(round(until*1000), math.floor(duration*1000)),
                         timestampMs=round(first*1000),confidence=None))
    scenes.append(dict(id=line["id"],label=line["id"],start=line["start"],duration=stop-line["start"],
                       anchor=line["text"],set="developer-ui",action=item["action"],timeOfDay="day",
                       description=item["shot"]))
save("captions.json", captions)
manifest = read(EP/"episode.json")
manifest.update(duration=duration, scenes=scenes)
manifest["audio"]["narrationTail"] = round(duration-words[-1]["end"],6)
save("episode.json",manifest)
by_id = {line["id"]:line for line in lines}
cues={"opening":0}
for key,(line_id,word_index,shift) in plan["cueWords"].items():
    cues[key] = round((by_id[line_id]["words"][word_index]["start"]+shift)*fps)
save("cues.json",cues)
sample_count = round(duration*R)
effects = np.zeros(sample_count)
sounds = {}
for name,item in plan["sounds"].items():
    a,b=item["sourceRange"]
    samples=pcm(PUB/"sfx"/item["file"])[round(a*R):round(b*R)].copy()
    samples *= item["peak"] / max(.001, np.max(np.abs(samples)))
    edge=min(round(.009*R),len(samples)//2)
    samples[:edge] *= np.linspace(0,1,edge)
    samples[-edge:] *= np.linspace(1,0,edge)
    sounds[name]=samples
events=[]
for cue,ident,offset in plan["foley"]:
    start_frame=cues[cue]+round(offset*fps)
    start=round(start_frame*R/fps)
    signal=sounds[ident]
    effects[start:start+len(signal)] += signal
    events.append(dict(frame=start_frame,cue=cue,sound=ident))
save("audio-events.json",events)
wav(PUB/"effects.wav",effects)
wav(PUB/"music.wav",np.zeros(sample_count))
with tempfile.TemporaryDirectory() as td:
    premix=Path(td)/"sum.wav"
    run(["ffmpeg","-v","error","-y","-i",str(PUB/"narration.wav"),"-i",str(PUB/"effects.wav"),
         "-filter_complex","amix=inputs=2:duration=first:normalize=0","-c:a","pcm_f32le",str(premix)])
    cmd=["ffmpeg","-hide_banner","-i",str(premix),"-af","loudnorm=I=-16:TP=-2:LRA=8:print_format=json","-f","null","-"]
    stderr=subprocess.run(cmd,capture_output=True,check=True).stderr.decode()
    stats=json.loads(re.search(r"\{[^{}]+\}",stderr).group())
    gain=min(-16.5-float(stats["input_i"]),-1.9-float(stats["input_tp"]))
    if not math.isfinite(gain):
        raise ValueError("Invalid audio loudness")
    run(["ffmpeg","-v","error","-y","-i",str(premix),"-af",f"volume={gain:.5f}dB","-ar",str(R),
         "-ac","2","-c:a","pcm_s16le",str(PUB/"mix.wav")])
save("audio-master.json",dict(master="mix.wav",sourceLUFS=stats["input_i"],sourceTruePeak=stats["input_tp"],gainDb=gain))
print(f"{frames} frames. {len(words)} source-timed words. {len(events)} foley cues.")

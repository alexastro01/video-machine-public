"""Build the exact-take Nvidia timeline and a local, unclipped audio master."""
from pathlib import Path
import hashlib
import json
import math
import re
import shutil
import subprocess
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SLUG = "nvidia-four-trillion"
B = ROOT / "episodes" / SLUG
P = ROOT / "public/episodes" / SLUG
RATE = 48000


def run(args):
    return subprocess.run([str(x) for x in args], check=True, capture_output=True)


def pcm(path):
    return np.frombuffer(run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", RATE, "-"]).stdout, dtype="<f4").astype(np.float64)


def save(path, audio):
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", str(RATE), "-ac", str(1 if audio.ndim==1 else audio.shape[1]), "-i", "-", "-c:a", "pcm_s24le", str(path)], input=audio.astype("<f4").tobytes(), check=True)


source = json.loads((B / "transcript-source.json").read_text())
words = source["words"]
voice = pcm(P / "source-take-1.mp3")
voice_duration = len(voice) / RATE
duration = math.ceil((max(voice_duration, words[-1]["end"]) + .72) * 30) / 30
assert 30 <= duration <= 60, duration
size = round(duration * RATE)


def plain(value):
    return re.sub(r"[^a-z0-9]", "", value.lower())


def anchor(phrase):
    tokens = [plain(x) for x in phrase.split()]
    starts = [i for i in range(len(words) - len(tokens) + 1) if [plain(w["text"]) for w in words[i:i+len(tokens)]] == tokens]
    if len(starts) != 1:
        raise ValueError(f"Expected one anchor for {phrase!r}: {starts}")
    return words[starts[0]]["start"]


specs = [
    ("hook", "Jensen Huang's", "workshop", "worried", "Nvidia's near-bankruptcy begins on a visibly failing chip and Jensen's reaction."),
    ("stakes", "before it", "workshop", "receive", "Jensen looks from the failed board to the CRT, then opens his palm."),
    ("diner", "In nineteen", "diner", "seated", "Seated at the booth, Jensen sketches while the other founders watch."),
    ("coffee", "over diner", "diner", "seated", "Cut closer as Jensen raises his coffee and turns to his colleagues."),
    ("gaming", "They wanted", "workshop", "point", "A CRT displays an animated low-poly racing scene beside the graphics board."),
    ("failure", "But their early", "workshop", "worried", "The demonstration stalls and the early chip emits a small failure spark."),
    ("cash", "Cash was", "workshop", "worried", "The drawer opens fully, visibly empty, as the deadline becomes immediate."),
    ("sega", "Huang told", "workshop", "point", "Cut to Jensen with the receiver at his ear and the handset off its cradle."),
    ("request", "then asked", "workshop", "receive", "Jensen asks for the payment with his free hand out, then holds to listen."),
    ("agreement", "They agreed", "workshop", "relieved", "The receiver stays at Jensen's ear as his shoulders relax."),
    ("redesign", "That bought", "workshop", "seated", "Cut to a fresh board on the work mat and Jensen setting the components."),
    ("riva", "Their new", "workshop", "receive", "The new RIVA 128 board locks together with a visible successful screen response."),
    ("shipping", "took off", "workshop", "relieved", "Pull back as a loaded shipping cart rolls into place beside the working RIVA board."),
    ("cuda", "Years later", "compute", "point", "Miko inspects a sample chip as the lab display shows its processing cells."),
    ("parallel", "to other kinds", "compute", "point", "Separate the work into eight simultaneously moving calculation lanes."),
    ("learning", "That helped", "compute", "point", "The lanes feed a neural network that lights in connected layers."),
    ("ai", "When the AI", "servers", "receive", "Pull from one green board into a growing hall of GPUs."),
    ("platform", "already had", "servers", "relieved", "A ready CUDA terminal and lit server bays show hardware and software together."),
    ("milestone", "In July", "servers", "neutral", "A market display establishes July 2025 while the server hall remains visible."),
    ("value", "four trillion dollars in market", "servers", "relieved", "The historical market-value display resolves to $4 TRILLION and holds through the ending."),
]
shots = []
for index, (name, phrase, stage, pose, description) in enumerate(specs):
    start = anchor(phrase)
    end = anchor(specs[index+1][1]) if index+1 < len(specs) else duration
    shots.append({"id": name, "start": start, "duration": end-start, "set": "nvidia-" + stage, "stage": stage, "pose": pose, "action": "reveal", "anchor": phrase, "label": name, "description": description, "timeOfDay": "evening"})

events = {x["id"]: x["start"] for x in shots}
events.update(impact=.28, fail=anchor("dead end"), drawer=anchor("Cash was"), confirm=anchor("They agreed")+.14, boardLock=anchor("fresh design")+.1, rivaReveal=anchor("Riva"), laneStart=anchor("calculations"), networkStart=anchor("train artificial"), valueStart=anchor("four trillion dollars in market"), speechEnd=words[-1]["end"], end=duration)
edit = {"id": SLUG, "duration": duration, "fps": 60, "worldFps": 60, "worldFrames": round(duration*60), "width": 1080, "height": 1920, "worldWidth": 1080, "worldHeight": 1920, "shots": shots, "events": events, "worldModel": json.loads((B / "plan.json").read_text())["model"], "audioMaster": f"episodes/{SLUG}/mix.wav"}
(B / "edit.json").write_text(json.dumps(edit, indent=2) + "\n")
episode = json.loads((B / "episode.json").read_text())
episode.update(renderer="remotion", world="nvidia", fiction=False, fps=60, duration=duration, closingFade=False, cast=["miko"])
episode["audio"].update(narrationOffset=0, narrationTail=duration-voice_duration, narrationTrimStart=0, pauses=[])
episode["scenes"] = [{k:v for k,v in s.items() if k not in ("stage", "pose", "description")} for s in shots]
(B / "episode.json").write_text(json.dumps(episode, indent=2) + "\n")

captions, chunk = [], []
for i, word in enumerate(words):
    proposed = " ".join(w["text"] for w in chunk + [word])
    if chunk and (len(chunk) == 2 or len(proposed) > 21 or word["start"] - chunk[-1]["end"] > .26):
        captions.append(chunk)
        chunk = []
    chunk.append(word)
    if word["text"].endswith((".", "?", "!")) or i == len(words)-1:
        captions.append(chunk)
        chunk=[]
out=[]
for i, group in enumerate(captions):
    end=min(group[-1]["end"]+.1, captions[i+1][0]["start"] if i+1<len(captions) else duration)
    text=re.sub(r"\b(four|two)\b",lambda m:{"four":"4","two":"2"}[m[0].lower()]," ".join(w["text"] for w in group),flags=re.I)
    out.append({"text":text, "startMs":round(group[0]["start"]*1000), "endMs":round(end*1000), "timestampMs":round(group[0]["start"]*1000), "confidence":None})
(B / "captions.json").write_text(json.dumps(out, indent=2) + "\n")

narration = np.zeros(size)
# Uniform gain, with headroom before any mix. Do not clamp intermediate speech.
gain=min(.155 / max(float(np.sqrt(np.mean(voice**2))),1e-6), .72/max(float(np.abs(voice).max()),1e-6))
narration[:len(voice)]=voice*gain
save(P / "narration.wav", narration)

music_origin=ROOT / "public/episodes/brain-upload/source-music.mp3"
music_source=P / "source-music.mp3"
shutil.copy2(music_origin,music_source)
raw=pcm(music_source)
raw=raw[RATE:49*RATE]
raw/=max(float(np.sqrt(np.mean(raw**2))),1e-6)
overlap=RATE
music=np.zeros(size)
for start in range(0,size,len(raw)-overlap):
    count=min(len(raw),size-start)
    clip=raw[:count].copy()
    if start:
        blend=min(overlap,count)
        clip[:blend]*=np.linspace(0,1,blend)
        music[start:start+blend]*=np.linspace(1,0,blend)
    music[start:start+count]+=clip
music*=.018
for i in range(0,size,RATE//10):
    if i/RATE >= events["cash"] and i/RATE < events["sega"]:
        music[i:i+RATE//10]*=.42
music[:round(.16*RATE)]*=np.linspace(.3,1,round(.16*RATE))
fade=round(.6*RATE)
music[-fade:]*=np.linspace(1,0,fade)
save(P / "music.wav", music)

# Make small local Foley selects so a rebuild can run without the Downloads library.
foley=json.loads((B/"foley-v3.json").read_text())
library=Path.home()/"Downloads/1000+UR.FASTEDITOR SFX/1000+UR.FASTEDITOR SFX"
selects=P/"foley-v3"
selects.mkdir(exist_ok=True)
ledger_path=B/"assets/foley-v3.json"
previous=json.loads(ledger_path.read_text()) if ledger_path.exists() else {}
bank, ledger = {}, {}
for key, spec in foley["sources"].items():
    original=library/spec["source"]
    local=selects/(key+".wav")
    old=previous.get(key,{})
    settings={k:v for k,v in spec.items()}
    if old.get("settings")!=settings or not local.exists():
        speed=spec["speed"]
        filters=(f"highpass=f={spec['highpassHz']},lowpass=f={spec['lowpassHz']},"
                 f"aresample={RATE},asetrate={round(RATE*speed)},aresample={RATE}")
        run(["ffmpeg","-y","-v","error","-ss",spec["startSeconds"],"-t",spec["lengthSeconds"],
             "-i",original,"-af",filters,"-ac",1,"-ar",RATE,"-c:a","pcm_s24le",local])
        original_hash=hashlib.sha256(original.read_bytes()).hexdigest()
    else:
        original_hash=old["originalSHA256"]
        if hashlib.sha256(local.read_bytes()).hexdigest()!=old["selectSHA256"]:
            raise ValueError(f"Foley select changed: {local}")
    bank[key]=pcm(local)
    ledger[key]={"file":str(local.relative_to(ROOT)),"originalLibrary":foley["library"],
                 "settings":settings,"originalSHA256":original_hash,"selectSHA256":hashlib.sha256(local.read_bytes()).hexdigest()}
ledger_path.write_text(json.dumps(ledger,indent=2)+"\n")
fx=np.zeros((size,2))
sound_events=[]
for cue in foley["cues"]:
    key=cue["source"]
    at=events[cue["event"]]+cue["offset"]
    start=round(at*RATE)
    sample=bank[key]
    count=min(len(sample),round(cue.get("duration",len(sample)/RATE)*RATE),size-start)
    assert count>0 and start>=0, cue
    cut=sample[:count].copy()
    cut*=cue["peak"]/max(float(np.abs(cut).max()),1e-6)
    head=min(round(.003*RATE),count//2)
    tail=min(round((.13 if count>.45*RATE else .026)*RATE),count//3)
    cut[:head]*=np.linspace(0,1,head)
    cut[-tail:]*=np.linspace(1,0,tail)
    angle=(cue["pan"]+1)*math.pi/4
    fx[start:start+count]+=cut[:,None]*[math.cos(angle),math.sin(angle)]
    sound_events.append({**cue,"at":round(at,4),"duration":round(count/RATE,4)})
save(P/"effects.wav",fx)
mix=(narration+music)[:,None]+fx
if float(np.abs(mix).max())>.94:mix*=.94/float(np.abs(mix).max())
save(P/"mix-pre-master.wav",mix)
def measure(path):
    result=run(["ffmpeg","-hide_banner","-i",path,"-af","loudnorm=I=-16:TP=-2:LRA=8:print_format=json","-f","null","-"])
    return json.loads(re.findall(r'\{\s*"input_i"[\s\S]*?\}',result.stderr.decode())[-1])
before=measure(P/"mix-pre-master.wav")
master_filter=(f"loudnorm=I=-16:TP=-2:LRA=8:measured_I={before['input_i']}:measured_TP={before['input_tp']}:"
               f"measured_LRA={before['input_lra']}:measured_thresh={before['input_thresh']}:offset={before['target_offset']}:linear=true")
run(["ffmpeg","-y","-v","error","-i",P/"mix-pre-master.wav","-af",master_filter,
     "-ac",2,"-ar",RATE,"-c:a","pcm_s24le",P/"mix.wav"])
master=measure(P/"mix.wav")
assert -17<=float(master["input_i"])<=-15 and float(master["input_tp"])<=-1.25,master
(B/"audio-events.json").write_text(json.dumps({
    "events":sound_events,"voiceUniformGain":gain,"musicSource":str(music_source.relative_to(ROOT)),
    "musicReuse":{"origin":str(music_origin.relative_to(ROOT)),"provenance":"episodes/brain-upload/music-source.json",
                 "sha256":hashlib.sha256(music_source.read_bytes()).hexdigest(),"sourceIntervalSeconds":[1,49],"loopCrossfadeSeconds":1},
    "deliveryMaster":{"channels":2,"targetIntegratedLUFS":-16,"integratedLUFS":float(master["input_i"]),"truePeakDbTP":float(master["input_tp"])},
    "sourceDuration":voice_duration,"mixPeakBeforeMaster":float(np.abs(mix).max()),
    "sourceLedger":str(ledger_path.relative_to(ROOT))},indent=2)+"\n")
production=json.loads((B/"production.json").read_text())
production.update(mediaPrepared={"durationSeconds":duration,"sourceTake":1,"narrationRetimed":False,"exactTakeWords":len(words),"captionChunks":len(out),"scenes":len(shots)},approval={"userApproved":False})
(B/"production.json").write_text(json.dumps(production,indent=2)+"\n")
print(json.dumps({"duration":duration,"shots":len(shots),"words":len(words),"sourceDuration":voice_duration,"worldFrames":edit["worldFrames"]}))

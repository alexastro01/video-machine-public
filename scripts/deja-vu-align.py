"""Force-align the edited deja-vu dialogue to its script, then map to delivery time."""
import json
from pathlib import Path
import stable_whisper, torch

torch.set_num_threads(4)
EP = Path("episodes/deja-vu")
src = "public/episodes/deja-vu/source-edited.wav"
edit = json.loads((EP / "audio-edit.json").read_text())
speed = edit["speed"]
model = stable_whisper.load_model("small.en", device="cpu")
TEXT = {"01a": "Wait…", "01b": "I've been here before.", "02": "You've never been here.",
        "03": "Past life?", "04": "Really?!", "05": "No.",
        "06a": "Same layout as a room you forgot.", "06b": "Familiar, plus no memory, equals déjà vu.",
        "07": "So next time you walk in and think…"}
assert " ".join(TEXT[s["line"]] for s in edit["segments"]) == (EP / "narration.txt").read_text().strip()
# Segment-relative word bounds measured from -45 dB silencedetect pauses in
# 06-witch-take-2 (pauses at 0.61-0.76, 1.62-1.83 and 2.36-2.65 s after the cut).
MEASURED = {"06b": [(0.02, 0.60), (0.76, 1.00), (1.00, 1.20), (1.20, 1.62), (1.83, 2.36), (2.65, 3.05), (3.05, 3.48)]}
build = sorted(Path("public/episodes/deja-vu/voice-build").glob("[0-9][0-9]-*.wav"))
words, raw = [], []
for seg in edit["segments"]:
    clip = next(p for p in build if p.stem.endswith("-" + seg["line"]))
    tokens = TEXT[seg["line"]].split()
    r = model.transcribe(str(clip), language="en", word_timestamps=True, verbose=None,
                         initial_prompt=TEXT[seg["line"]])
    heard = [w for s in r.segments for w in s.words]
    raw.append({"line": seg["line"], "heard": [(w.word, w.start, w.end) for w in heard]})
    if seg["line"] in MEASURED:
        heard = [type("W", (), {"start": a, "end": b})() for a, b in MEASURED[seg["line"]]]
        raw[-1]["override"] = "silencedetect phrase boundaries; ASR collapsed the final words"
    elif len(heard) != len(tokens):
        # Fallback: spread tokens over the segment by character length.
        total = sum(len(t) for t in tokens); length = seg["editEnd"] - seg["editStart"]; c = 0
        heard = []
        for t in tokens:
            heard.append(type("W", (), {"start": length * c / total, "end": length * (c + len(t)) / total})())
            c += len(t)
        raw[-1]["fallback"] = "character-proportional"
    ws = [type("W", (), {"word": t, "start": h.start, "end": h.end})() for t, h in zip(tokens, heard)]
    length = seg["editEnd"] - seg["editStart"]
    for i, w in enumerate(ws):
        a, b = max(0.0, w.start), min(length, w.end)
        if i == 0:
            a = min(a, 0.04)  # measured waveform onset of the cut segment
        if i == len(ws) - 1:
            b = max(b, length - 0.03)
        if b - a < 0.06:
            b = a + 0.06
        words.append({"text": w.word.strip(), "start": round(seg["editStart"] + a, 3),
                      "end": round(seg["editStart"] + b, 3), "line": seg["line"]})
for x, y in zip(words, words[1:]):
    if y["start"] < x["start"] + 0.06:
        y["start"] = round(x["start"] + 0.06, 3)
    x["end"] = min(x["end"], y["start"]) if x["line"] == y["line"] else x["end"]
(EP / "forced-alignment.json").write_text(json.dumps(raw, indent=1, ensure_ascii=False, default=str) + "\n")
src_doc = {"sourceTake": "line-edit-v1", "sourceFile": src, "speed": 1.0,
           "model": "stable-ts/Whisper-small.en forced alignment per cut segment", "words": words}
(EP / "transcript-aligned.json").write_text(json.dumps(src_doc, indent=2, ensure_ascii=False) + "\n")
deliv = [{"text": w["text"], "start": round(w["start"] / speed, 3), "end": round(w["end"] / speed, 3)} for w in words]
(EP / "transcript-source.json").write_text(json.dumps(
    {"sourceTake": "line-edit-v1", "sourceFile": "public/episodes/deja-vu/narration.wav",
     "speed": speed, "words": deliv}, indent=2, ensure_ascii=False) + "\n")
print(json.dumps({"words": len(words), "instant": [w for w in words if w["end"] <= w["start"]],
                  "delivery": deliv}, ensure_ascii=False))

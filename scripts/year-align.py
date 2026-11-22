"""Independently transcribe and align the two exact selected character takes."""
import json
import re
from pathlib import Path
import torch
import stable_whisper

ROOT = Path(__file__).resolve().parents[1]
EP = ROOT / "episodes/where-did-my-year-go"
PUB = ROOT / "public/episodes/where-did-my-year-go"
torch.set_num_threads(4)
model = stable_whisper.load_model("small.en", device="cpu")


def norm(text):
    return re.sub(r"[^a-z0-9]", "", text.lower())


for who in ["friend", "miko"]:
    script = json.loads((EP / f"{who}-provider-transcript.json").read_text())["text"]
    script = re.sub(r"\[[^]]+\]\s*", "", script)
    source = str(PUB / f"{who}-take-1.mp3")
    independent = model.transcribe(source, language="en", word_timestamps=True,
                                   verbose=None, condition_on_previous_text=False)
    independent.save_as_json(str(EP / f"{who}-independent.json"))
    spoken = " ".join(s.text for s in independent.segments)
    aligned = model.align(source, script, language="en", original_split=True,
                          fast_mode=True, verbose=False)
    aligned.save_as_json(str(EP / f"{who}-alignment.json"))
    words = [{"text": w.word.strip(), "start": round(w.start, 4), "end": round(w.end, 4)}
             for segment in aligned.segments for w in segment.words if w.word.strip()]
    (EP / f"{who}-words.json").write_text(json.dumps({"sourceTake": 1, "script": script,
        "independentText": spoken.strip(), "independentMatchesScript": norm(spoken) == norm(script),
        "words": words, "alignment": "Whisper small.en independent transcription and exact-script alignment on the selected take"},
        indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"speaker": who, "words": len(words), "independentMatches": norm(spoken) == norm(script),
                      "independentText": spoken.strip(), "instantWords": [w for w in words if w["end"] <= w["start"]]}, ensure_ascii=False), flush=True)

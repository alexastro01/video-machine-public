"""Derive the deja-vu shot timeline, events and captions from the selected take.

Every cut, event and caption comes from the delivery-time word timestamps in
transcript-source.json. Writes timeline.json, captions.json, caption-cues.json,
the Blender config and updates episode.json scene timing.
"""
import json, re
from pathlib import Path

EP = Path("episodes/deja-vu")
FPS = 30
words = json.loads((EP / "transcript-source.json").read_text())["words"]
edit = json.loads((EP / "audio-edit.json").read_text())
DUR = edit["deliveryDuration"]
norm = lambda s: re.sub(r"[^a-zà-ÿ']", "", s.lower())


def find(phrase):
    toks = [norm(t) for t in phrase.split()]
    hits = [i for i in range(len(words)) if [norm(w["text"]) for w in words[i:i + len(toks)]] == toks]
    if len(hits) != 1:
        raise SystemExit(f"Anchor {phrase!r} found {len(hits)} times")
    return hits[0]


def at(phrase):
    return words[find(phrase)]["start"]


def frame(t):
    return round(t * FPS) / FPS


# Shot list: (id, set, action, anchor, lead seconds before the anchor onset)
SHOTS = [
    ("freeze", "deja-cafe", "stop", "Wait", 0.0),
    ("reveal", "deja-cafe", "reveal", "Past life", 0.12),
    ("really", "deja-cafe", "puzzle", "Really", 0.05),
    ("no", "deja-cafe", "turn", "No. Same", 0.05),
    ("layout", "deja-wire", "wave", "Same layout", 0.14),
    ("equation", "deja-ghost", "reveal", "Familiar", 0.10),
    ("walkin", "deja-cafe", "step", "So next time", 0.10),
]
starts = [0.0 if i == 0 else frame(at(a) - lead) for i, (_, _, _, a, lead) in enumerate(SHOTS)]
shots = []
for i, (sid, st, action, anchor, lead) in enumerate(SHOTS):
    end = starts[i + 1] if i + 1 < len(SHOTS) else DUR
    shots.append({"id": sid, "set": st, "action": action, "anchor": anchor,
                  "start": starts[i], "duration": round(end - starts[i], 4)})
EVENTS = {
    "offscreen": at("You've never"),
    "smoke": frame(at("Past life") - 0.2),
    "really": at("Really"),
    "no": at("No. Same"),
    "cast": frame(at("Same layout") - 0.12),
    "wire": at("layout"),
    "room": at("room you forgot"),
    "familiar": at("Familiar"),
    "noMemory": at("no memory"),
    "equals": at("equals"),
    "dejavu": at("déjà vu"),
    "walk": at("walk in"),
    "think": at("think"),
}
timeline = {"id": "deja-vu", "fps": FPS, "duration": DUR, "frames": round(DUR * FPS),
            "shots": shots, "events": {k: round(v, 4) for k, v in EVENTS.items()}}
(EP / "timeline.json").write_text(json.dumps(timeline, indent=2) + "\n")
Path("blender/deja-vu").mkdir(parents=True, exist_ok=True)
Path("blender/deja-vu/config-v1.json").write_text(json.dumps(
    {**timeline, "worldWidth": 1080, "worldHeight": 1920, "samples": 24}, indent=2) + "\n")

# Captions: pages of up to two words, broken at sentence punctuation or long
# gaps. "déjà vu" stays together. Each cue shows the words spoken so far.
pages, cur = [], []
for i, w in enumerate(words):
    cur.append(w)
    nxt = words[i + 1] if i + 1 < len(words) else None
    pair = norm(w["text"]) == "déjà"
    brk = (not pair) and (len(cur) == 2 or re.search(r"[.?!…,]$", w["text"]) or
                          (nxt and nxt["start"] - w["end"] > 0.28) or nxt is None or
                          (nxt and norm(nxt["text"]) == "déjà"))
    if brk or (nxt is None):
        pages.append(cur)
        cur = []
GOLD = {"layout", "familiar", "déjà", "vu", "here", "before"}
RED = {"no", "memory", "never"}
cues, captions = [], []
flat = [w for p in pages for w in p]
for pi, page in enumerate(pages):
    page_end = pages[pi + 1][0]["start"] if pi + 1 < len(pages) else DUR
    for k, w in enumerate(page):
        end = page[k + 1]["start"] if k + 1 < len(page) else page_end
        shown = page[:k + 1]
        cues.append({"start": w["start"], "end": round(end, 3), "words": [
            {"text": x["text"], "tone": "gold" if norm(x["text"]) in GOLD else "red" if norm(x["text"]) in RED else "white"}
            for x in shown]})
for w, nxt in zip(flat, flat[1:] + [None]):
    captions.append({"text": " " + w["text"], "startMs": round(w["start"] * 1000),
                     "endMs": round((nxt["start"] if nxt else DUR) * 1000),
                     "timestampMs": round(w["start"] * 1000), "confidence": None})
# Every token must be visible for at least one output frame.
for c in cues:
    if round(c["end"] * FPS) <= round(c["start"] * FPS):
        raise SystemExit(f"Caption cue shorter than a frame: {c}")
(EP / "caption-cues.json").write_text(json.dumps(cues, indent=2, ensure_ascii=False) + "\n")
(EP / "captions.json").write_text(json.dumps(captions, indent=2, ensure_ascii=False) + "\n")

ep = json.loads((EP / "episode.json").read_text())
ep.update({"renderer": "hyperframes", "world": "deja-vu", "closingFade": False, "duration": DUR,
           "cast": ["miko", "witch"],
           "audio": {"narration": "public/episodes/deja-vu/narration.wav",
                     "music": "public/episodes/deja-vu/music.wav",
                     "effects": "public/episodes/deja-vu/effects.wav",
                     "narrationOffset": 0, "narrationTail": 0.14, "narrationTrimStart": 0, "pauses": []},
           "scenes": [{"id": s["id"], "set": s["set"], "specimen": "none", "action": s["action"],
                       "start": s["start"], "duration": s["duration"], "anchor": s["anchor"],
                       "focus": [], "label": s["id"], "timeOfDay": "evening"} for s in shots]})
(EP / "episode.json").write_text(json.dumps(ep, indent=2, ensure_ascii=False) + "\n")
print(json.dumps({"duration": DUR, "shots": [(s["id"], s["start"], s["duration"]) for s in shots],
                  "events": timeline["events"], "cues": len(cues)}, ensure_ascii=False))

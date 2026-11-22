"""Place complete phrases at story cues and derive the 55.2s edit from exact-take words."""
import json
import re
import subprocess
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
EP = ROOT / "episodes/time-speeds-up"
PUB = ROOT / "public/episodes/time-speeds-up"
SR = 48000
FPS = 30
DURATION = 55.2

# Every source cut is inside a measured quiet gap, never inside speech.
# Holds have camera-roll, jar or sunrise action and a continuous score.
PARTS = [
    ("hook", 0, 4.18, 0),
    ("question", 4.18, 6.52, 4.4),
    ("empty-year", 6.52, 8.55, 10.5),
    ("laptop", 8.55, 9.84, 14),
    ("same-food", 9.84, 11, 15.5),
    ("scroll", 11, 12.3, 16.9),
    ("one-day", 12.3, 15.54, 21.2),
    ("piece", 15.54, 18.6, 26.1),
    ("try", 18.6, 20.1, 30),
    ("one-new-thing", 20.1, 22.94, 31.7),
    ("route", 22.94, 24.04, 34.6),
    ("food", 24.04, 25.1, 36.6),
    ("lake", 25.1, 26.46, 38.6),
    ("grandma", 26.46, 27.72, 40.8),
    ("sunrise", 27.72, 29, 42.8),
    ("longer", 29, 32.85, 44.5),
    ("today", 32.85, 35.45, 49.4),
    ("tell-me", 35.45, 36.88, 52.2),
]

SHOTS = [
    ("candle", "time-bedroom", "blow-candle", 0, "birthday", "birthday-blow", "Blow, reset, blow again; 26 appears on the cake."),
    ("text", "time-bedroom", "recall", 4.4, "bedroom", "phone-scroll", "A friend's message interrupts a December evening."),
    ("camera-2008", "time-bedroom", "recall", 6.8, "bedroom", None, "The childhood camera roll is full of distinct memories."),
    ("camera-2026", "time-bedroom", "recall", 9.1, "bedroom", None, "This year's camera roll has 11 mostly repetitive screenshots."),
    ("cant-name-one", "time-bedroom", "recall", 11.8, "bedroom", None, "The empty-year realization settles on his face."),
    ("same-laptop", "time-bedroom", "recall", 14, "routine-laptop", None, "The same laptop fills the frame."),
    ("same-food", "time-bedroom", "recall", 15.5, "routine-food", None, "Attention shifts to the same ordinary meal."),
    ("same-scroll", "time-bedroom", "recall", 16.9, "routine-phone", None, "The same phone scroll completes the routine."),
    ("child-memories", "time-shelf", "save-memory", 18.3, "child-shelf", None, "Childhood jars hold a first swim, first bike and bee sting."),
    ("adult-memory", "time-shelf", "save-memory", 21.2, "adult-shelf", None, "One work jar compresses a repetitive year."),
    ("small-piece", "time-shelf", "recall", 25.3, "adult-shelf", None, "An exact 20% slice becomes 2%; one theory, not proof."),
    ("try-something", "time-bedroom", "renew", 30, "bedroom", "phone-set-down", "He puts the camera roll down and chooses to change the week."),
    ("one-new-thing", "time-shelf", "save-memory", 31.7, "adult-shelf", None, "Five empty jars wait for five selected days from his week."),
    ("day-1", "time-city", "step", 34.6, "route", None, "A new path leads through an unfamiliar amber street."),
    ("day-2", "time-city", "eat", 36.6, "food", "food-taste", "He takes a bite and smiles at the unfamiliar food."),
    ("day-3", "time-lake", "renew", 38.6, "lake", "lake-jump", "A short feet-first jump ends in a cold splash."),
    ("day-4", "time-city", "renew", 40.8, "grandma", None, "He reconnects with Grandma on the phone."),
    ("day-5", "time-roof", "renew", 42.8, "roof", None, "He sits safely on a rooftop as the sun rises."),
    ("week-shelf", "time-shelf", "save-memory", 44.5, "adult-shelf", None, "The shelf now contains five distinct moments from the week."),
    ("holiday-paradox", "time-roof", "recall", 46.5, "roof", None, "The contrast is named: fast now, longer in memory."),
    ("kid-returns", "time-roof", "renew", 49.4, "roof", "roof-child-arrives", "His child self climbs up once and sits beside him."),
    ("candle-stays", "time-bedroom", "blow-candle", 54.2, "birthday", None, "The candle remains lit; the picture returns to the opening."),
]


def main():
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(PUB / "source-take-1.mp3"),
                                   "-ar", str(SR), "-ac", "1", "-f", "f32le", "pipe:1"])
    audio = np.frombuffer(raw, np.float32)
    edit = np.zeros(round(DURATION * SR), np.float32)
    for _, a, b, start in PARTS:
        piece = audio[round(a * SR):round(b * SR)].copy()
        fade = min(round(.006 * SR), len(piece) // 2)
        piece[:fade] *= np.linspace(0, 1, fade)
        piece[-fade:] *= np.linspace(1, 0, fade)
        i = round(start * SR)
        edit[i:i + len(piece)] += piece
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0",
                    "-af", "loudnorm=I=-16:TP=-2:LRA=9,aresample=48000", "-c:a", "pcm_s16le", str(PUB / "narration.wav")],
                   input=edit.tobytes(), check=True)
    # The independent local ASR establishes spoken onsets; the provider
    # transcript includes a non-spoken [thoughtful] token and late endings.
    independent = EP / "transcript-independent.json"
    if independent.exists():
        src = json.loads(independent.read_text())
        words = [{"text": w["word"].strip(), "start": w["start"], "end": w["end"]}
                 for s in src["segments"] for w in s["words"] if w["word"].strip()]
    else:
        words = [w for w in json.loads((EP / "transcript-source.json").read_text())["words"]
                 if not w["text"].startswith("[")]
    mapped = []
    for word in words:
        midpoint = (word["start"] + word["end"]) / 2
        part = next(p for p in PARTS if p[1] <= midpoint < p[2])
        mapped.append({"text": word["text"], "start": round(part[3] + max(0, word["start"] - part[1]), 4),
                       "end": round(part[3] + min(part[2], word["end"]) - part[1], 4), "phrase": part[0]})
    for i, word in enumerate(mapped):
        if i + 1 < len(mapped):
            word["end"] = min(word["end"], mapped[i + 1]["start"])
        if word["end"] <= word["start"]:
            raise ValueError(f"Nonpositive caption: {word}")
    (EP / "transcript-delivery.json").write_text(json.dumps({"words": mapped, "sourceTake": 1,
        "alignment": "Independent local ASR on the exact selected take, mapped through measured silence-only cuts"}, indent=2) + "\n")
    captions = [{"text": " " + w["text"], "startMs": round(w["start"] * 1000), "endMs": round(w["end"] * 1000),
                 "timestampMs": round(w["start"] * 1000), "confidence": None} for w in mapped]
    (EP / "captions.json").write_text(json.dumps(captions, indent=2) + "\n")
    pages, current = [], []
    for i, w in enumerate(mapped):
        current.append(w)
        nxt = mapped[i + 1] if i + 1 < len(mapped) else None
        if len(current) == 2 or re.search(r"[.!?…]$", w["text"]) or not nxt or nxt["phrase"] != w["phrase"]:
            end = min(w["end"] + .18, nxt["start"] if nxt else w["end"] + .18)
            pages.append({"start": current[0]["start"], "end": end, "text": " ".join(x["text"] for x in current)})
            current = []
    (EP / "caption-phrases.json").write_text(json.dumps(pages, indent=2) + "\n")
    shots = []
    for i, (sid, stage, action, start, art, animation, description) in enumerate(SHOTS):
        end = SHOTS[i + 1][3] if i + 1 < len(SHOTS) else DURATION
        shots.append({"id": sid, "set": stage, "action": action, "start": start, "duration": round(end - start, 4),
                      "art": art, "animation": animation, "description": description})
    (EP / "audio-edit.json").write_text(json.dumps({"sourceTake": 1, "speed": 1, "duration": DURATION,
        "cuts": [{"id": p[0], "sourceStart": p[1], "sourceEnd": p[2], "deliveryStart": p[3]} for p in PARTS],
        "sourceCutBasis": "Measured -40dB quiet gaps; 6ms edit fades; no words intentionally removed"}, indent=2) + "\n")
    (EP / "timeline.json").write_text(json.dumps({"id": "time-speeds-up", "duration": DURATION, "fps": FPS,
        "frames": round(DURATION * FPS), "shots": shots, "words": mapped}, indent=2) + "\n")
    ep = json.loads((EP / "episode.json").read_text())
    ep.update({"renderer": "hyperframes", "world": "memory", "hook": "none", "duration": DURATION,
               "closingFade": False, "aspectRatio": "9:16", "cast": ["miko"],
               "premise": "A repeating birthday gives way to a week of distinct memories.",
               "audio": {"narration": "episodes/time-speeds-up/narration.wav", "music": "episodes/time-speeds-up/music.wav",
                         "effects": "episodes/time-speeds-up/effects.wav", "narrationOffset": 0, "narrationTail": 1.5},
               "scenes": [{"id": s["id"], "set": s["set"], "action": s["action"], "specimen": "none",
                           "start": s["start"], "duration": s["duration"], "anchor": s["description"],
                           "label": s["id"], "timeOfDay": "evening"} for s in shots]})
    (EP / "episode.json").write_text(json.dumps(ep, indent=2) + "\n")
    print(json.dumps({"duration": DURATION, "frames": round(DURATION * FPS), "shots": len(shots), "words": len(mapped)}))


if __name__ == "__main__":
    main()

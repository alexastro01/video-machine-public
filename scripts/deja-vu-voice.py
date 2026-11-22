"""Assemble the deja-vu dialogue from the selected OpenAI line takes.

Cuts only measured silence between lines (never inside a spoken word), keeps a
short fade at each cut, writes the 1.0x edited source, then the delivery
narration at the chosen pitch-preserving speed. The edit map is saved so word
timings from forced alignment can be mapped to delivery time.
"""
import json, subprocess, sys
from pathlib import Path

EP = Path("episodes/deja-vu")
PUB = Path("public/episodes/deja-vu")
LINES = PUB / "lines"
SPEED = float(sys.argv[1]) if len(sys.argv) > 1 else 1.2
SR = 48000

# (line id, take file, source start, source end, silence after) in seconds.
# Bounds come from ffmpeg silencedetect at -45 dB plus ~40 ms of pre-roll.
EDIT = [
    ("01a", "01-miko-take-1.wav", 0.00, 0.62, 0.18),
    ("01b", "01-miko-take-1.wav", 1.10, 2.60, 0.08),
    ("02", "02-witch-take-1.wav", 0.06, 1.30, 0.10),
    ("03", "03-witch-take-1.wav", 0.34, 1.34, 0.06),
    ("04", "04-miko-take-1.wav", 0.46, 0.98, 0.10),
    ("05", "05-witch-take-1.wav", 0.79, 1.40, 0.12),
    ("06a", "06-witch-take-2.wav", 0.00, 1.90, 0.22),
    ("06b", "06-witch-take-2.wav", 2.25, 5.75, 0.12),
    ("07", "07-witch-take-1.wav", 0.07, 2.45, 0.00),
]
TAIL = 0.14  # breath after "think" before the hard cut back to frame 0


def run(*args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)


def main():
    tmp = PUB / "voice-build"
    tmp.mkdir(parents=True, exist_ok=True)
    parts, mapping, t = [], [], 0.0
    for i, (lid, take, a, b, gap) in enumerate(EDIT):
        seg = tmp / f"{i:02d}-{lid}.wav"
        dur = b - a
        run("-i", str(LINES / take), "-ss", f"{a}", "-t", f"{dur}",
            "-af", f"aresample={SR},aformat=channel_layouts=mono,afade=t=in:d=0.006,afade=t=out:st={dur-0.012}:d=0.012",
            "-c:a", "pcm_s16le", str(seg))
        parts.append(seg)
        mapping.append({"line": lid, "take": take, "sourceStart": a, "sourceEnd": b,
                        "editStart": round(t, 4), "editEnd": round(t + dur, 4)})
        t += dur
        g = gap if i < len(EDIT) - 1 else TAIL
        if g > 0:
            sil = tmp / f"{i:02d}-gap.wav"
            run("-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=mono", "-t", f"{g}", "-c:a", "pcm_s16le", str(sil))
            parts.append(sil)
            t += g
    lst = tmp / "list.txt"
    lst.write_text("".join(f"file '{p.resolve()}'\n" for p in parts))
    edited = PUB / "source-edited.wav"
    run("-f", "concat", "-safe", "0", "-i", str(lst), "-c:a", "pcm_s16le", str(edited))
    delivery = round(round(t / SPEED * 30) / 30, 4)  # whole frames
    run("-i", str(edited), "-af",
        f"atempo={SPEED},loudnorm=I=-16:TP=-2:LRA=9,aresample={SR},apad",
        "-t", f"{delivery}", "-ac", "1", "-c:a", "pcm_s16le", str(PUB / "narration.wav"))
    (EP / "audio-edit.json").write_text(json.dumps({
        "sourceDuration": round(t, 4), "speed": SPEED, "deliveryDuration": delivery,
        "method": "silence-only cuts between selected line takes; ffmpeg atempo (pitch preserved); loudnorm -16 LUFS",
        "segments": mapping}, indent=2) + "\n")
    print(json.dumps({"source": round(t, 3), "delivery": delivery, "speed": SPEED}))


main()

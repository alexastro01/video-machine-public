"""Build a quiet lo-fi mix with local finite Foley and a continuous loop seam."""
import json
import subprocess
from pathlib import Path
import numpy as np
from scipy.ndimage import gaussian_filter1d
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[1]
EP = ROOT / "episodes/time-speeds-up"
PUB = ROOT / "public/episodes/time-speeds-up"
SR = 48000
D = 55.2
N = round(D * SR)
RNG = np.random.default_rng(41)


def decode(file, normal=None):
    args = ["ffmpeg", "-v", "error", "-i", str(file)]
    if normal:
        args.extend(["-af", normal])
    args.extend(["-ar", str(SR), "-ac", "2", "-f", "f32le", "pipe:1"])
    return np.frombuffer(subprocess.check_output(args), np.float32).reshape(-1, 2)


def main():
    voice = decode(PUB / "narration.wav")[:N]
    raw = decode(PUB / "music-takes/take-1.mp3", "loudnorm=I=-24:TP=-5:LRA=8")
    music = raw[2 * SR:2 * SR + N].copy()
    # The final score approaches the samples just BEFORE the selected beginning,
    # so the next replay continues forward at the same point in the source.
    seam = round(.85 * SR)
    alpha = np.linspace(0, 1, seam)[:, None]
    music[-seam:] = music[-seam:] * (1 - alpha) + raw[2 * SR - seam:2 * SR] * alpha
    active = gaussian_filter1d((np.max(abs(voice), axis=1) > .012).astype(float), SR * .055)
    duck = .9 - .34 * np.clip(active * 2, 0, 1)
    # Match the opening voice-ducked bed at the loop seam.
    duck[-seam:] = duck[-seam:] * (1 - alpha[:, 0]) + duck[:seam] * alpha[:, 0]
    music *= duck[:, None]
    effects = np.zeros((N, 2), np.float64)
    events = []

    def put(t, mono, gain, kind, pan=0):
        start = round(t * SR)
        length = min(len(mono), N - start)
        if length <= 0:
            return
        p = np.array([np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)])
        effects[start:start + length] += mono[:length, None] * gain * p[None, :]
        events.append({"time": t, "kind": kind, "peakGain": gain})

    def noise(seconds, low=250, high=5000):
        n = round(seconds * SR)
        a = sosfilt(butter(2, [low, high], btype="bandpass", fs=SR, output="sos"), RNG.standard_normal(n))
        a /= max(np.max(abs(a)), 1e-8)
        return a * np.sin(np.linspace(0, np.pi, n)) ** 1.5

    def note(freq, seconds=.35):
        t = np.arange(round(seconds * SR)) / SR
        return (np.sin(2 * np.pi * freq * t) + .2 * np.sin(2 * np.pi * freq * 2.01 * t)) * np.exp(-t * 11) * np.minimum(t * 150, 1)

    for t in [.27, 1.47, 2.67]:
        put(t, noise(.22, 500, 7000), .07, "soft candle breath")
        put(t + .21, note(580, .09), .018, "wick tick")
    put(4.53, note(850), .045, "text notification")
    put(4.68, note(1134), .032, "text notification tail")
    for t in [6.78, 7.8, 9.06, 10.1]:
        put(t, noise(.13, 1400, 7500), .026, "camera-roll swipe")
    for i, t in enumerate([18.5, 18.8, 19.1, 19.6, 20.0, 20.4]):
        put(t, note([640, 760, 850][i % 3]), .024, "childhood jar settle", pan=.15)
    for t in [14, 15.5, 16.9]:
        put(t, noise(.07, 200, 2500), .028, "routine match cut")
    put(21.4, note(250, .2), .025, "work jar settles")
    for i, t in enumerate([35.9, 37.9, 40, 42.1, 44]):
        put(t, note(680 + 70 * i), .027, "new memory collected", pan=.2)
    put(34.8, noise(.12, 110, 1800), .045, "shoe on new path")
    put(36.95, noise(.1, 600, 5000), .025, "small bite")
    put(40.02, noise(.42, 200, 8500), .10, "lake splash")
    put(40.68, noise(.16, 400, 4200), .025, "water settle")
    put(40.97, note(460, .12), .02, "phone receiver click")
    for t in [49.8, 50.45, 50.8]:
        put(t, noise(.11, 110, 2200), .03, "child climbs roof step")
    # Subtle wind remains audible in picture-led pauses, without a silent hole.
    wind = noise(D, 140, 1200)
    env = np.interp(np.arange(N) / SR, [0, 18, 30, 38.5, 41, 42.8, 55.2], [0, 0, 0, .012, .003, .014, .004])
    effects += wind[:, None] * env[:, None]
    for name, data in [("music", music), ("effects", effects)]:
        wavfile.write(PUB / (name + ".wav"), SR, np.clip(data, -.96, .96).astype(np.float32))
    (EP / "audio-events.json").write_text(json.dumps(events, indent=2) + "\n")
    (EP / "sound-plan.json").write_text(json.dumps({"music": "Original ElevenLabs lo-fi instrumental take 1",
        "musicSourceOffset": 2, "musicNormalizationLufs": -24, "speechDuck": [.56, .9],
        "loopSeamSeconds": .85, "foley": "Locally synthesized quiet event cues; deterministic seed 41",
        "newMusicGenerated": 4, "selectedMusicTake": 1, "soundVerification": "Not listened to; delivery loudness measurement pending"}, indent=2) + "\n")
    print(json.dumps({"duration": D, "foleyEvents": len(events), "musicPeak": float(abs(music).max()), "effectsPeak": float(abs(effects).max())}))


if __name__ == "__main__":
    main()

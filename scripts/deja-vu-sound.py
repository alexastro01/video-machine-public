"""Local sound design for deja-vu: circular (seamless-loop) music, ambience and Foley.

Everything is synthesised with a fixed seed and written into a circular buffer of
exactly the video length, so tails that cross the end wrap to the start and the
loop seam has no discontinuity. Effects and music duck under the dialogue.
Outputs: public/episodes/deja-vu/{music,effects,mix-raw,delivery-mix}.wav and
episodes/deja-vu/audio-events.json.
"""
import json, subprocess
from pathlib import Path
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, sosfiltfilt

EP = Path("episodes/deja-vu"); PUB = Path("public/episodes/deja-vu")
SR = 48000
TL = json.loads((EP / "timeline.json").read_text()); EV = TL["events"]; DUR = TL["duration"]
L = int(round(DUR * SR)); rng = np.random.default_rng(31337)
t_all = np.arange(L) / SR


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "bandpass", fs=SR, output="sos"), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "lowpass", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "highpass", fs=SR, output="sos"), x)


def place(buf, sig, at, gain=1.0):
    """Add sig at time `at`, wrapping around the end (circular loop)."""
    i = int(round(at * SR)) % L
    n = len(sig); idx = (np.arange(n) + i) % L
    np.add.at(buf, idx, sig * gain)


def env(n, a, d):
    e = np.ones(n); ai = max(1, int(a * SR)); e[:ai] = np.linspace(0, 1, ai)
    e *= np.exp(-np.arange(n) / SR / d); return e


def tone(f, dur, a=.005, d=.5, harm=(1,), detune=0.0):
    n = int(dur * SR); tt = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * h * (1 + detune * k) * tt) / (k + 1) for k, h in enumerate(harm))
    return s * env(n, a, d)


def noise(dur):
    return rng.standard_normal(int(dur * SR))


def circular_noise(lo, hi):
    """Band-limited noise that is continuous across the loop seam."""
    x = bp(noise(DUR + 1.0), lo, hi)
    X = int(.5 * SR); out = x[:L].copy(); w = np.linspace(0, 1, X)
    out[:X] = out[:X] * w + x[L:L + X] * (1 - w)
    return out


wire_on = lambda t: 1.0 if EV["wire"] <= t < EV["dejavu"] + .2 else 0.0
eerie = np.array([wire_on(x) for x in t_all[::480]]); eerie = np.repeat(eerie, 480)[:L]
eerie = np.convolve(eerie, np.ones(9600) / 9600, mode="same")  # 0.2 s crossfade between moods

# ---------------- music: warm pad (cafe) <-> airy minor shimmer (forgotten room)
q = lambda f: round(f * DUR) / DUR  # whole cycles per loop: phase-continuous seam
music = np.zeros(L)
warm = [q(f) for f in (146.83, 220.0, 277.18, 329.63)]   # D major-ish, open voicing
cold = [q(f) for f in (138.59, 207.65, 246.94, 311.13)]  # C# minor colour
for f in warm:
    music += (1 - eerie) * .11 * np.sin(2 * np.pi * f * t_all) * (.8 + .2 * np.sin(2 * np.pi * q(.25) * t_all))
for f in cold:
    music += eerie * .10 * np.sin(2 * np.pi * f * t_all) * (.7 + .3 * np.sin(2 * np.pi * q(1.5) * t_all))
music += eerie * .05 * np.sin(2 * np.pi * q(1244.5) * t_all) * (.5 + .5 * np.sin(2 * np.pi * q(3) * t_all))
music = lp(np.tile(music, 3), 2400)[L:2 * L]  # filter circularly: no transient at the seam
# music-box plucks on a gentle grid (D major pentatonic); cold section shifts up and sparser
pent = [587.33, 659.25, 739.99, 880.0, 987.77]
beat = DUR / 32
for k in range(32):
    at = k * beat
    cold_here = EV["wire"] <= at < EV["dejavu"]
    if cold_here and k % 2: continue
    f = pent[(k * 3 + (k // 4)) % 5] * (1.5 if cold_here else 1)
    place(music, tone(f, 1.4, d=.45, harm=(1, 2, 3)) * (.05 if k % 4 else .075), at)
place(music, tone(110, 2.5, a=.02, d=1.2, harm=(1, 2)), 0, .06)  # soft root at the seam, wraps cleanly

# ---------------- ambience: cafe room tone, murmur, espresso hiss; street when the door opens
amb = .018 * circular_noise(120, 900) + .012 * circular_noise(300, 2400) * (.6 + .4 * np.sin(2 * np.pi * q(.5) * t_all))
amb *= (1 - .75 * eerie)
amb += eerie * .01 * circular_noise(3000, 9000)  # airy hiss in the wire world
fx = np.zeros(L); events = []


def ev(name, at, sig, gain):
    place(fx, sig, at, gain); events.append({"name": name, "at": round(at % DUR, 3)})


# footsteps: walk-in steps continue straight into the opening stop (match on action)
walk0 = TL["shots"][-1]["start"] + .12
steps = [walk0 + k * .3 for k in range(int((DUR - walk0) / .3) + 1)] + [DUR + 0.0, DUR + .2]
for k, at in enumerate(steps):
    s = lp(noise(.09), 900) * env(int(.09 * SR), .002, .025) + .4 * tone(70, .09, d=.03)
    ev("footstep", at, s, .35 if at < DUR else .45)
# freeze: a short tape-stop "huh" stinger at the opening frame
n = int(.35 * SR); tt = np.arange(n) / SR; sweep = np.sin(2 * np.pi * np.cumsum(420 * np.exp(-tt * 6)) / SR)
ev("freeze-stinger", 0.02, sweep * env(n, .003, .12) * .8 + bp(noise(.35), 2000, 6000) * env(n, .001, .03) * .3, .35)
# off-screen voice: faint sparkle from nowhere
ev("offscreen-shimmer", EV["offscreen"] - .05, sum(tone(f, .8, d=.3) for f in (1318.5, 1760.0)) * .5, .12)
# smoke poof reveal
n = int(.7 * SR)
ev("smoke-poof", EV["smoke"], bp(noise(.7), 200, 3000) * env(n, .01, .18) + .8 * tone(55, .7, d=.15), .55)
ev("magic-tinkle", EV["smoke"] + .1, sum(tone(f, 1.0, d=.35, harm=(1, 2)) for f in (1174.7, 1568.0, 2093.0)) * .4, .18)
# really: hopeful pop; no: comic deflate
ev("really-pop", EV["really"] - .04, tone(880, .25, d=.08, harm=(1, 2)) + tone(1320, .25, d=.06), .22)
n = int(.5 * SR); tt = np.arange(n) / SR
deflate = np.sin(2 * np.pi * np.cumsum(330 * np.exp(-tt * 2.2)) / SR) * env(n, .005, .25)
ev("no-deflate", EV["no"] + .02, deflate, .22)
# wand whoosh, then the wireframe sweep (rising digital shimmer)
n = int(.6 * SR); w = bp(noise(.6), 600, 5000) * np.sin(np.linspace(0, np.pi, n)) ** 2
ev("wand-whoosh", EV["cast"] + .05, w, .45)
n = int(.75 * SR); tt = np.arange(n) / SR
rise = np.sin(2 * np.pi * np.cumsum(300 + 2400 * tt / tt[-1]) / SR) * np.sin(np.linspace(0, np.pi, n))
ev("wire-sweep", EV["wire"], rise * .5 + hp(noise(.75), 4000) * np.sin(np.linspace(0, np.pi, n)) * .5, .3)
for k in range(10):  # little line "ticks" as surfaces turn to wire
    ev("wire-tick", EV["wire"] + k * .055, tone(2400 + 120 * k, .05, d=.015), .1)
# forgotten room swells in (reverse swell)
n = int(.7 * SR); sw = bp(noise(.7), 400, 2500) * np.linspace(0, 1, n) ** 3
ev("ghost-swell", EV["room"] - .2, sw + .5 * tone(311.1, .7, a=.6, d=2), .35)
# familiar: golden match chime
ev("familiar-chime", EV["familiar"], sum(tone(f, 1.6, d=.6, harm=(1, 2, 3)) for f in (587.33, 739.99, 880.0)) * .45, .3)
# no memory: details glitch out
for k in range(6):
    at = EV["noMemory"] + .05 + k * .07
    ev("memory-glitch", at, bp(noise(.04), 1500, 7000) * env(int(.04 * SR), .001, .01), .3)
# deja vu: room snaps back (reverse whoosh into a warm chord)
n = int(.45 * SR); rv = bp(noise(.45), 300, 4000) * np.linspace(0, 1, n) ** 2
ev("restore-whoosh", EV["dejavu"] - .4, rv, .4)
ev("restore-chord", EV["dejavu"] + .05, sum(tone(f, 1.6, d=.5, harm=(1, 2)) for f in (293.66, 369.99, 440.0, 587.33)) * .35, .3)
# door opens on the walk-in cut: latch click, creak, street swell
start = TL["shots"][-1]["start"]
ev("door-latch", start, tone(1800, .03, d=.008) + bp(noise(.03), 2000, 8000) * .5, .3)
n = int(.5 * SR); tt = np.arange(n) / SR
creak = np.sin(2 * np.pi * np.cumsum(180 + 60 * np.sin(tt * 30)) / SR) * env(n, .03, .3) * (1 + .5 * np.sign(np.sin(2 * np.pi * 37 * tt)))
ev("door-creak", start + .03, bp(creak, 150, 2500), .12)
n = int(1.6 * SR); street = bp(noise(1.6), 200, 3000) * np.sin(np.linspace(0, np.pi, n))
ev("street-swell", start, street, .05)
# cups: two quiet clinks in the cafe sections
for at in (1.1, 10.7):
    ev("cup-clink", at, tone(3150, .25, d=.06, harm=(1, 2.7)) * .7, .06)

# ---------------- mix with dialogue ducking
sr, voice = wavfile.read(PUB / "narration.wav"); voice = voice.astype(np.float64) / 32768
if voice.ndim > 1: voice = voice.mean(axis=1)
voice = np.pad(voice, (0, max(0, L - len(voice))))[:L]
venv = sosfiltfilt(butter(2, 6, "lowpass", fs=SR, output="sos"), np.abs(voice))
duck = 1 - .55 * np.clip(venv / (venv.max() * .25), 0, 1)
music_d = music * duck; fx_d = fx * (1 - .35 * (1 - duck) / .55)
mix = voice + music_d * .55 + amb + fx_d


def save(path, x):
    wavfile.write(path, SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))


save(PUB / "music.wav", music_d * .55); save(PUB / "effects.wav", fx_d + amb); save(PUB / "mix-raw.wav", mix)
meas = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(PUB / "mix-raw.wav"), "-af",
                       "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                      capture_output=True, text=True).stderr
m = json.loads(meas[meas.rindex("{"):meas.rindex("}") + 1])
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(PUB / "mix-raw.wav"), "-af",
                f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
                f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,"
                f"aresample={SR}", "-t", f"{DUR}", "-c:a", "pcm_s16le", str(PUB / "delivery-mix.wav")], check=True)
seam = float(np.abs(mix[-1] - mix[0]))
(EP / "audio-events.json").write_text(json.dumps({"duration": DUR, "seed": 31337, "events": events,
    "loopSeamSampleJump": round(seam, 5), "loudnessInput": m, "music": "synthesised locally; phase-continuous pad (whole cycles per loop) and circular pluck grid",
    "ducking": "dialogue envelope, music -55%, effects -35%"}, indent=2) + "\n")
print(json.dumps({"events": len(events), "seamJump": seam, "inputLUFS": m["input_i"]}))

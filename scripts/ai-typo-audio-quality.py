"""Rebuild the audio without hard clipping; retain v2's encoded picture."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import numpy as np
from dialogue_media import pcm, R

ROOT = Path(__file__).resolve().parents[1]
EP = ROOT / "episodes/ai-typo"
PUBLIC = ROOT / "public/episodes/ai-typo"
PREVIOUS = EP / "versions/v2"
RENDERS = ROOT / "renders/ai-typo"
SOURCE = RENDERS / "ai-typo-v2-young-opus.mp4"
OUTPUT = RENDERS / "ai-typo-v3-clean-audio.mp4"


def run(args):
    return subprocess.run(args, capture_output=True, check=True)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


unchanged = ["edit.json", "captions.json", "dialogue-timeline.json",
             "transcript-source.json", "audio-events.json"]
for name in unchanged:
    assert digest(EP / name) == digest(PREVIOUS / name), name
for name in ["music.wav", "effects.wav"] + [f"line-{i:02d}.wav" for i in range(13)]:
    assert digest(PUBLIC / name) == digest(PREVIOUS / "public-audio" / name), name

spec = json.loads((EP / "dialogue.json").read_text())
edit = json.loads((EP / "edit.json").read_text())
segments = []
for i, line in enumerate(spec["lines"]):
    audio = pcm(PUBLIC / f"line-{i:02d}.wav")
    audio *= min(2.5, .13 / max(.001, float(np.sqrt(np.mean(audio ** 2)))))
    segments.extend([audio, np.zeros(round(line["afterPause"] * R))])
original = np.concatenate(segments)
raw = pcm(PUBLIC / "narration-raw.wav")
original = np.pad(original, (0, max(0, len(raw) - len(original))))[:len(raw)]
gain = .98 / max(.98, float(np.max(np.abs(original))))
# The WAV writer scales by 32767; FFmpeg decodes signed PCM by 32768.
expected_pcm = original * gain * (32767 / 32768)
error = float(np.max(np.abs(raw - expected_pcm)))
assert error <= 1 / 32768 + 1e-7, "Raw narration no longer matches a linear gain"

premix = PUBLIC / "mix-v3-float.wav"
run(["ffmpeg", "-v", "error", "-y", "-i", str(PUBLIC / "narration.wav"),
     "-i", str(PUBLIC / "music.wav"), "-i", str(PUBLIC / "effects.wav"),
     "-filter_complex", "[0:a][1:a][2:a]amix=inputs=3:duration=first:normalize=0[a]",
     "-map", "[a]", "-ar", "48000", "-ac", "2", "-c:a", "pcm_f32le", str(premix)])
measurement = run(["ffmpeg", "-hide_banner", "-i", str(premix), "-af",
                   "loudnorm=I=-17:TP=-2:LRA=8:print_format=json", "-f", "null", "-"])
stats = json.loads(re.search(r"\{[\s\S]*\}", measurement.stderr.decode()).group())
# Constant gain matches the prior export's loudness without pumping the music.
mix_gain_db = min(-17 - float(stats["input_i"]), -2.1 - float(stats["input_tp"]))
run(["ffmpeg", "-v", "error", "-y", "-i", str(SOURCE), "-i", str(premix),
     "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
     "-af", f"volume={mix_gain_db:.6f}dB", "-c:a", "aac", "-b:a", "320k",
     "-ar", "48000", "-ac", "2", "-t", str(edit["duration"]),
     "-movflags", "+faststart", str(OUTPUT)])


def video_hash(path):
    return run(["ffmpeg", "-v", "error", "-i", str(path), "-map", "0:v:0",
                "-c:v", "copy", "-f", "hash", "-hash", "sha256", "-"]).stdout.decode().strip()


before_video, after_video = video_hash(SOURCE), video_hash(OUTPUT)
assert before_video == after_video
before = json.loads((EP / "voices/audio-quality-v2-before.json").read_text())
proof = {"file": str(OUTPUT.relative_to(ROOT)), "sha256": digest(OUTPUT),
         "sameSourceVoiceSha256": digest(PUBLIC / "source-ai-young-take-1.mp3"),
         "voiceRegenerated": False, "unchangedTimingFiles": unchanged,
         "beforeRawNarrationSamplesAtHardClamp": before["beforeRawNarrationSamplesAtHardClamp"],
         "unclippedAssemblyPeak": float(np.max(np.abs(original))),
         "linearHeadroomGain": gain, "maximumLinearWaveformError": error,
         "quantizationTolerance": 1 / 32768 + 1e-7,
         "rawNarrationProcessing": "Uniform attenuation replaces hard clipping; final loudness normalization follows.",
         "mixGainDb": mix_gain_db, "premixLoudnessMeasurement": stats,
         "videoStreamHashBefore": before_video, "videoStreamHashAfter": after_video,
         "pictureUnchanged": True, "codec": "AAC 320 kbps, 48 kHz stereo",
         "scope": "Repairs measured processing distortion. The voice's underlying synthesized timbre is retained."}
(EP / "voices/audio-quality-v3.json").write_text(json.dumps(proof, indent=2) + "\n")
print(json.dumps({"file": proof["file"], "pictureUnchanged": True,
                  "unclippedPeak": proof["unclippedAssemblyPeak"],
                  "linearWaveformError": error, "mixGainDb": mix_gain_db}))

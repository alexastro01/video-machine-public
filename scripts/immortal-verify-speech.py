"""Independent recognition of saved takes; cached results prevent duplicate requests."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
import os
import re
import sys
from dotenv import dotenv_values
from openai import OpenAI

root = Path(__file__).resolve().parents[1]
revision = next((x.split('=', 1)[1] for x in sys.argv[1:] if x.startswith('--revision=')), 'v2')
if not re.fullmatch(r'[a-z0-9-]+', revision):
    raise RuntimeError('Invalid revision name')
base = root / "episodes/immortal/revisions" / revision
key = os.environ.get("OPENAI_API_KEY") or dotenv_values(root / ".env.local").get("OPENAI_API_KEY")
if not key:
    raise RuntimeError("No configured transcription credential")
client = OpenAI(api_key=key, max_retries=0, timeout=120)
jobs = json.loads((base / "speech-provenance.json").read_text())
selected = {x for x in sys.argv[1:] if not x.startswith('--revision=')}
jobs = [j for j in jobs if not selected or j["id"] in selected]
dest = base / "independent-asr"
dest.mkdir(exist_ok=True)

def transcribe(job):
    file = root / job["file"]
    out = dest / f"{job['id']}.json"
    digest = hashlib.sha256(file.read_bytes()).hexdigest()
    if out.exists():
        saved = json.loads(out.read_text())
        if saved.get("sourceSha256") == digest:
            return {"id": job["id"], "cached": True, "text": saved["text"]}
        raise RuntimeError("Source changed: " + job["id"])
    with file.open("rb") as audio:
        response = client.audio.transcriptions.create(
            file=audio, model="whisper-1", language="en",
            response_format="verbose_json", timestamp_granularities=["word"],
        )
    data = response.model_dump(mode="json")
    data.update(sourceFile=job["file"], sourceSha256=digest,
                requestId=getattr(response, "_request_id", None),
                createdAt=datetime.now(timezone.utc).isoformat(), model="whisper-1")
    out.write_text(json.dumps(data, indent=2) + "\n")
    return {"id": job["id"], "cached": False, "text": data["text"]}

with ThreadPoolExecutor(max_workers=3) as pool:
    for result in pool.map(transcribe, jobs):
        print(json.dumps(result), flush=True)

"""Run the saved time-perception image/GIF jobs once, then retain provenance."""
import argparse
import fcntl
import json
import subprocess
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EP = ROOT / "episodes/time-speeds-up"
LOCK = threading.Lock()


def ledger(job, status, usage=None):
    with LOCK, (EP / ".spend-ledger.lock").open("a") as lock_file:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
        p = EP / "spend-ledger.json"
        d = json.loads(p.read_text())
        old = next((x for x in d["transactions"] if x["id"] == job["id"]), None)
        if old is None:
            old = {"id": job["id"], "provider": "OpenAI API", "kind": job["kind"],
                   "file": job["output"], "holdUsd": job.get("holdUsd", .6)}
            d["transactions"].append(old)
        old["status"] = status
        if usage:
            details = usage.get("input_tokens_details", {})
            output = usage.get("output_tokens_details", {})
            old.update({"usage": usage, "usageCalculatedUsd": round((
                details.get("text_tokens", 0) * 5 + details.get("image_tokens", 0) * 8
                + output.get("image_tokens", usage.get("output_tokens", 0)) * 30) / 1e6, 8),
                "holdUsd": 0, "costBasis": "Returned native-GIF usage at recorded project rates; not an invoice."})
        d["accountedUsd"] = round(sum(x.get("holdUsd", 0) + x.get("usageCalculatedUsd", 0)
                                      + x.get("reportedUsd", 0) for x in d["transactions"]), 8)
        p.write_text(json.dumps(d, indent=2) + "\n")


def run(job):
    target = ROOT / job["output"]
    if target.exists():
        return job["id"], True, "existing local asset"
    ledger(job, "requested")
    if job["kind"] == "image":
        cli = Path.home() / ".codex/skills/.system/imagegen/scripts/image_gen.py"
        cmd = ["uv", "run", "--no-project", "--with", "openai", "--with", "pillow",
               "--env-file", ".env.local", "--", "python", str(cli), "edit",
               "--prompt-file", job["promptFile"],
               "--model", "gpt-image-2", "--quality", job["quality"], "--size", job["size"],
               "--background", "opaque", "--out", job["output"]]
        for reference in job["reference"] if isinstance(job["reference"], list) else [job["reference"]]:
            cmd += ["--image", reference]
    else:
        cmd = ["node", "scripts/generate-native-gif.mjs", "--image", job["reference"],
               "--prompt-file", job["promptFile"], "--out", job["output"],
               "--size", job["size"], "--frames", str(job["frames"]),
               "--frame-ms", str(job["frameMs"]), "--quality", "medium", "--env-file", ".env.local"]
    result = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    (EP / "generation" / (job["id"] + ".log")).write_text(result.stdout + result.stderr)
    ok = result.returncode == 0 and target.exists()
    usage = None
    provenance = target.with_suffix(".provenance.json")
    if job["kind"] == "gif" and provenance.exists():
        usage = json.loads(provenance.read_text()).get("usage")
    ledger(job, "completed" if ok else "failed", usage)
    return job["id"], ok, "saved" if ok else result.stderr[-350:]


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--kind", choices=["image", "gif"], default="image")
    parser.add_argument("--ids")
    parser.add_argument("--workers", type=int, default=3)
    parser.add_argument("--episode-dir", type=Path, default=Path("episodes/time-speeds-up"))
    args = parser.parse_args()
    EP = ROOT / args.episode_dir
    jobs = json.loads((EP / ("image-jobs.json" if args.kind == "image" else "gif-jobs.json")).read_text())
    jobs = [j for j in jobs if not args.ids or j["id"] in args.ids.split(",")]
    failed = []
    with ThreadPoolExecutor(max_workers=min(4, args.workers)) as pool:
        for future in as_completed([pool.submit(run, j) for j in jobs]):
            name, ok, note = future.result()
            print(json.dumps({"id": name, "ok": ok, "note": note}), flush=True)
            if not ok:
                failed.append(name)
    if failed:
        raise SystemExit(1)

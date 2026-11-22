// Independent, cached word timestamps for a selected local audio take.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parseEnv } from "node:util";
import path from "node:path";
import process from "node:process";
import console from "node:console";
import { Blob } from "node:buffer";
const { fetch, FormData, AbortSignal } = globalThis;
const [input, output] = process.argv.slice(2);
if (!input || !output)
  throw new Error(
    "Usage: node scripts/transcribe-local-audio.mjs input.mp3 output.json",
  );
const bytes = await readFile(input);
const digest = createHash("sha256").update(bytes).digest("hex");
let existing;
try {
  existing = JSON.parse(await readFile(output, "utf8"));
} catch {
  // An uncached source needs its first independent transcript.
}
if (existing?.sourceSha256 === digest) {
  console.log(JSON.stringify({ cached: true, output, text: existing.text }));
  process.exit(0);
}
if (existing)
  throw new Error("Source changed; choose a new transcription filename.");
const key =
  process.env.OPENAI_API_KEY ??
  parseEnv(await readFile(".env.local", "utf8")).OPENAI_API_KEY;
if (!key)
  throw new Error("No local OpenAI transcription credential configured.");
const form = new FormData();
form.append(
  "file",
  new Blob([bytes], {
    type: input.endsWith(".wav") ? "audio/wav" : "audio/mpeg",
  }),
  path.basename(input),
);
form.append("model", "whisper-1");
form.append("language", "en");
form.append("response_format", "verbose_json");
form.append("timestamp_granularities[]", "word");
const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}` },
  body: form,
  signal: AbortSignal.timeout(120000),
});
if (!response.ok) {
  const body = await response.json();
  throw new Error(
    JSON.stringify({
      status: response.status,
      message: String(body.error?.message ?? "Transcription failed").replace(
        /sk-[\w-]+/g,
        "[REDACTED]",
      ),
    }),
  );
}
const data = await response.json();
const result = {
  ...data,
  sourceFile: input,
  sourceSha256: digest,
  model: "whisper-1",
  requestId: response.headers.get("x-request-id"),
  createdAt: new Date().toISOString(),
  automaticRetries: 0,
};
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(result, null, 2) + "\n");
console.log(
  JSON.stringify({ output, text: result.text, words: result.words?.length }),
);

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { parseEnv } from "node:util";
import path from "node:path";
import process from "node:process";
import console from "node:console";
import { Buffer } from "node:buffer";
const { fetch, AbortSignal } = globalThis;

const args = {};
for (let i = 2; i < process.argv.length; i += 2) {
  if (!process.argv[i].startsWith("--") || !process.argv[i + 1])
    throw new Error("Use named arguments with values");
  args[process.argv[i].slice(2)] = process.argv[i + 1];
}
for (const k of ["script", "instructions", "out", "voice"])
  if (!args[k]) throw new Error(`Missing --${k}`);
try {
  await access(args.out);
  throw new Error("Output already exists; choose a new take filename");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const key = process.env.OPENAI_API_KEY ??
  parseEnv(await readFile(args["env-file"] ?? ".env.local", "utf8")).OPENAI_API_KEY;
if (!key) throw new Error("OPENAI_API_KEY is not configured");
const spec = {
  model: args.model ?? "gpt-4o-mini-tts-2025-12-15",
  voice: args.voice,
  input: (await readFile(args.script, "utf8")).trim(),
  instructions: (await readFile(args.instructions, "utf8")).trim(),
  response_format: "wav",
  speed: 1,
};
await mkdir(path.dirname(args.out), { recursive: true });
const response = await fetch("https://api.openai.com/v1/audio/speech", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify(spec),
  signal: AbortSignal.timeout(180000),
});
if (!response.ok) {
  const error = await response.json();
  throw new Error(JSON.stringify({ status: response.status,
    message: String(error.error?.message ?? "Speech request failed")
      .replace(/sk-[\w-]+/g, "[REDACTED]") }));
}
await writeFile(args.out, Buffer.from(await response.arrayBuffer()));
await writeFile(args.out + ".json", JSON.stringify({
  provider: "OpenAI API", endpoint: "/v1/audio/speech", ...spec,
  createdAt: new Date().toISOString(), requestId: response.headers.get("x-request-id"),
  sourceFile: args.out, automaticRetries: 0,
  disclosure: `Narration generated with OpenAI's ${spec.voice} AI voice.`,
  documentation: "https://developers.openai.com/api/docs/guides/text-to-speech",
}, null, 2) + "\n");
console.log(JSON.stringify({ saved: args.out, voice: spec.voice, model: spec.model }));

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { parseEnv } from "node:util";
import process from "node:process";
import console from "node:console";
import { Buffer, Blob } from "node:buffer";
const { fetch, FormData, AbortSignal } = globalThis;
const root = "episodes/guitar-pickup",
  pub = "public/episodes/guitar-pickup";
const script = (await readFile(root + "/narration.txt", "utf8")).trim();
const key =
  process.env.OPENAI_API_KEY ??
  parseEnv(await readFile(".env.local", "utf8")).OPENAI_API_KEY;
if (!key) throw Error("OPENAI_API_KEY is not configured");
const mode = process.argv[2] ?? "speech";
async function request(url, body) {
  const r = await fetch("https://api.openai.com/v1/" + url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + key,
      ...(body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
    },
    body: body instanceof FormData ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(180000),
  });
  if (!r.ok) {
    const e = await r.json();
    throw Error(
      JSON.stringify({
        status: r.status,
        error: e.error?.message?.replace(/sk-[\w-]+/g, "[REDACTED]"),
      }),
    );
  }
  return r;
}
if (mode === "speech") {
  const spec = {
    model: "gpt-4o-mini-tts-2025-12-15",
    voice: "coral",
    input: script,
    response_format: "mp3",
    instructions:
      "Warm, curious female science storyteller. Clear English with a light British accent. Speak exactly the supplied script. Deliberately measured pace, about 110 words per minute, around 35 seconds for this script. Emphasize plink, roar, 82, tiny voltage and no signal. Short distinct pauses between paragraphs. No laughter, no added speech, no music. End the final line with an invitation to hear a guitar chord.",
  };
  const r = await request("audio/speech", spec);
  await mkdir(pub, { recursive: true });
  await writeFile(
    pub + "/source-take-1.mp3",
    Buffer.from(await r.arrayBuffer()),
  );
  await writeFile(
    root + "/narration-provenance.json",
    JSON.stringify(
      {
        provider: "OpenAI API",
        reason:
          "Connected ElevenLabs generation tools returned UNAVAILABLE in this session. Channel default unchanged.",
        ...spec,
        requestId: r.headers.get("x-request-id"),
        requestedPlaybackRate: 1.2,
        automaticRetries: 0,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("Saved source-take-1.mp3");
} else if (mode === "transcribe") {
  const form = new FormData();
  form.append(
    "file",
    new Blob([await readFile(pub + "/source-take-1.mp3")], {
      type: "audio/mpeg",
    }),
    "source-take-1.mp3",
  );
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  form.append("language", "en");
  form.append("prompt", script);
  const r = await request("audio/transcriptions", form);
  const x = await r.json();
  await writeFile(
    root + "/transcription-raw.json",
    JSON.stringify(x, null, 2) + "\n",
  );
  await writeFile(
    root + "/transcript-source.json",
    JSON.stringify(
      {
        sourceTake: 1,
        model: "whisper-1",
        requestId: r.headers.get("x-request-id"),
        words: x.words.map((w) => ({
          text: w.word,
          start: w.start,
          end: w.end,
        })),
      },
      null,
      2,
    ) + "\n",
  );
  console.log({ words: x.words.length, duration: x.duration, text: x.text });
}

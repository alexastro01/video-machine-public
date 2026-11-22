// Independent transcription of the selected local performance or encoded mix.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import console from "node:console";
import { Blob } from "node:buffer";
const { fetch, FormData, AbortSignal } = globalThis;

const input =
  process.argv[2] ?? "public/episodes/beer-feels-good/source-take-1.mp3";
const output =
  process.argv[3] ??
  "episodes/beer-feels-good/transcript-independent-take-1.json";
const key = process.env.OPENAI_API_KEY;
if (!key) throw new Error("OPENAI_API_KEY is not configured");
const form = new FormData();
form.append("model", "whisper-1");
form.append("response_format", "verbose_json");
form.append("timestamp_granularities[]", "word");
form.append("language", "en");
form.append("file", new Blob([await readFile(input)]), path.basename(input));
const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}` },
  body: form,
  signal: AbortSignal.timeout(180000),
});
const result = await response.json();
if (!response.ok)
  throw new Error(
    `Transcription failed (${response.status}): ${result.error?.code ?? "unknown"}`,
  );
await writeFile(
  output,
  JSON.stringify(
    {
      ...result,
      sourceFile: input,
      model: "whisper-1",
      transcriptPrompt: null,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    output,
    text: result.text,
    words: result.words?.length,
    duration: result.duration,
  }),
);

// Native GIF generation through OpenAI's Image API. No local motion synthesis.
// Credentials come from the environment, hidden stdin or an explicit local env file.
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import console from "node:console";
import { Buffer, Blob } from "node:buffer";
import { performance } from "node:perf_hooks";
import { parseEnv } from "node:util";

const { fetch, FormData, AbortSignal } = globalThis;

function options(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--key-stdin" || args[i] === "--dry-run")
      out[args[i].slice(2)] = true;
    else if (args[i].startsWith("--")) out[args[i].slice(2)] = args[++i];
    else throw new Error("Use named arguments");
  }
  return out;
}
async function hiddenKey() {
  if (!process.stdin.isTTY)
    throw new Error("Hidden key entry needs an interactive terminal");
  process.stdout.write("API key (hidden, memory only): ");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = (error) => {
      process.stdin.off("data", receive);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value.trim());
      value = "";
    };
    function receive(chunk) {
      for (const char of chunk.toString()) {
        if (char === "\u0003") {
          finish(new Error("Cancelled"));
          return;
        }
        if (char === "\r" || char === "\n") {
          finish();
          return;
        }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else value += char;
      }
    }
    process.stdin.on("data", receive);
  });
}
function safeError(response, json) {
  return {
    status: response.status,
    code: typeof json?.error?.code === "string" ? json.error.code : null,
    param: typeof json?.error?.param === "string" ? json.error.param : null,
    requestId: response.headers.get("x-request-id"),
    message:
      response.status === 401
        ? "Authentication failed; the supplied key was not accepted."
        : response.status === 403
          ? "The project does not have access to this model or feature."
          : typeof json?.error?.message === "string"
            ? json.error.message.replace(/sk-[A-Za-z0-9_-]+/g, "[REDACTED]")
            : "API request failed.",
  };
}

const args = options(process.argv.slice(2));
if (!args.image || !args["prompt-file"] || !args.out) {
  throw new Error(
    "Usage: node scripts/generate-native-gif.mjs --image reference.png --prompt-file prompt.txt --out result.gif [--key-stdin | --env-file .env.local] [--dry-run]",
  );
}
const model = args.model ?? "gpt-image-2.6-sunburst";
const frameCount = Number(args.frames ?? 12),
  frameMs = Number(args["frame-ms"] ?? 100);
if (!Number.isInteger(frameCount) || frameCount < 2 || frameCount > 16)
  throw new Error("Frame count must be 2–16");
if (
  !Number.isInteger(frameMs) ||
  frameMs < 20 ||
  frameMs > 2000 ||
  frameMs % 10
)
  throw new Error("Frame duration must be 20–2000 ms in 10 ms increments");
if (path.extname(args.out).toLowerCase() !== ".gif")
  throw new Error("Output must have a .gif extension");
try {
  await access(args.out);
  throw new Error("Output already exists; use a new versioned filename");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const image = await readFile(args.image),
  prompt = await readFile(args["prompt-file"], "utf8");
const request = {
  model,
  prompt,
  output_format: "gif",
  frame_count: frameCount,
  frame_duration_ms: frameMs,
  size: args.size ?? "auto",
  quality: args.quality ?? "medium",
  n: 1,
  background: "opaque",
};
const base = args.out.replace(/\.gif$/i, "");
await mkdir(path.dirname(args.out), { recursive: true });
const provenance = {
  nativeAnimation: true,
  endpoint: "/v1/images/edits",
  request,
  reference: args.image,
  referenceSHA256: createHash("sha256").update(image).digest("hex"),
  startedAt: new Date().toISOString(),
  automaticRetries: 0,
};
await writeFile(
  `${base}.request.json`,
  JSON.stringify(provenance, null, 2) + "\n",
);
if (args["dry-run"]) {
  console.log(
    JSON.stringify({
      dryRun: true,
      model,
      frameCount,
      frameMs,
      output: args.out,
    }),
  );
  process.exit(0);
}
let key = "";
try {
  key = args["key-stdin"]
    ? await hiddenKey()
    : (process.env.OPENAI_API_KEY ??
      (args["env-file"]
        ? parseEnv(await readFile(args["env-file"], "utf8")).OPENAI_API_KEY
        : ""));
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  // Read-only authentication and model access check before a charged request.
  const preflight = await fetch(
    `https://api.openai.com/v1/models/${encodeURIComponent(model)}`,
    {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(30000),
    },
  );
  const modelInfo = await preflight.json();
  if (!preflight.ok) {
    const error = safeError(preflight, modelInfo);
    await writeFile(
      `${base}.error.json`,
      JSON.stringify(
        { phase: "model-preflight", generationAttempted: false, ...error },
        null,
        2,
      ) + "\n",
    );
    console.error(JSON.stringify(error));
    process.exitCode = 1;
  } else {
    console.log(
      `Model access confirmed: ${model}. Submitting one native GIF request.`,
    );
    const form = new FormData();
    for (const [name, value] of Object.entries(request))
      form.append(name, String(value));
    form.append(
      "image[]",
      new Blob([image], { type: "image/png" }),
      path.basename(args.image),
    );
    const start = performance.now();
    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: AbortSignal.timeout(300000),
    });
    const json = await response.json();
    if (!response.ok) {
      const error = safeError(response, json);
      await writeFile(
        `${base}.error.json`,
        JSON.stringify(
          { phase: "generation", generationAttempted: true, ...error },
          null,
          2,
        ) + "\n",
      );
      console.error(JSON.stringify(error));
      process.exitCode = 1;
    } else {
      const encoded = json.data?.[0]?.b64_json;
      if (!encoded)
        throw new Error(
          "API returned no encoded image data; the request will not be retried",
        );
      const bytes = Buffer.from(encoded, "base64");
      if (!/^GIF8[79]a$/.test(bytes.subarray(0, 6).toString("ascii")))
        throw new Error("API output is not a GIF; refusing to label it as one");
      await writeFile(args.out, bytes, { flag: "wx" });
      await writeFile(
        `${base}.provenance.json`,
        JSON.stringify(
          {
            ...provenance,
            completedAt: new Date().toISOString(),
            seconds: (performance.now() - start) / 1000,
            requestId: response.headers.get("x-request-id"),
            usage: json.usage ?? null,
            outputFormat: json.output_format ?? "gif",
            size: json.size ?? null,
            revisedPrompt: json.data[0].revised_prompt ?? null,
            outputSHA256: createHash("sha256").update(bytes).digest("hex"),
            bytes: bytes.length,
          },
          null,
          2,
        ) + "\n",
      );
      console.log(
        JSON.stringify({
          output: args.out,
          bytes: bytes.length,
          nativeAnimation: true,
        }),
      );
    }
  }
} catch (error) {
  const message = String(error.message)
    .split(key || "\u0000")
    .join("[REDACTED]")
    .replace(/sk-[A-Za-z0-9_-]+/g, "[REDACTED]");
  console.error(message);
  process.exitCode = 1;
} finally {
  key = "";
}

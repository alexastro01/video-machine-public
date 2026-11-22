import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { episodeSchema } from "../src/engine/schema";
export const root = process.cwd();
export function exportStem(value: string | undefined, fallback: string) {
  if (value !== undefined && !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(value))
    throw new Error("Export name must be a plain filename stem");
  return value ?? fallback;
}
export function portraitFormat(
  aspectRatio: "9:16" | "16:9",
  flags: Set<string>,
) {
  if (flags.has("--portrait") && flags.has("--landscape"))
    throw new Error("Choose one format override");
  if (flags.has("--landscape")) return false;
  return flags.has("--portrait") || aspectRatio === "9:16";
}
export const json = <T = unknown>(file: string): T =>
  JSON.parse(readFileSync(file, "utf8"));
export function writeJson(file: string, value: unknown) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}
export function episodeId(value = "one-second-ahead") {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value))
    throw new Error("Use a lowercase episode slug");
  return value;
}
export function loadEpisode(id: string) {
  return episodeSchema.parse(json(`episodes/${episodeId(id)}/episode.json`));
}
export function command(name: string, args: string[]) {
  const r = spawnSync(name, args, { encoding: "utf8", maxBuffer: 8_000_000 });
  if (r.status !== 0) throw new Error(`${name} failed: ${r.stderr || r.error}`);
  return r.stdout;
}
export const duration = (file: string): number =>
  Number(
    command("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=nw=1:nk=1",
      file,
    ]),
  );
export function checkpoint(
  id: string,
  stage: string,
  details: Record<string, unknown>,
) {
  const file = `episodes/${id}/production.json`;
  let current: Record<string, unknown> = {};
  try {
    current = json(file);
  } catch {
    /* First run has no checkpoint. */
  }
  writeJson(file, {
    ...current,
    [stage]: { completedAt: new Date().toISOString(), ...details },
  });
}

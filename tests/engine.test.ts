import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { episodeSchema } from "../src/engine/schema";
import { alignEpisode, findAnchor } from "../src/engine/align";
import { captionPages } from "../src/components/Captions";
import { episodeId, portraitFormat } from "../scripts/common";
import {
  episodeProject,
  projectIds,
  projects,
} from "../src/engine/video-projects";
const pilot = JSON.parse(
  readFileSync("episodes/one-second-ahead/episode.json", "utf8"),
);
test("9:16 is the default and explicit format overrides are respected", () => {
  assert.equal(episodeSchema.parse(pilot).aspectRatio, "9:16");
  assert.equal(portraitFormat("9:16", new Set()), true);
  assert.equal(portraitFormat("9:16", new Set(["--landscape"])), false);
  assert.equal(portraitFormat("16:9", new Set(["--portrait"])), true);
  assert.throws(() =>
    portraitFormat("9:16", new Set(["--portrait", "--landscape"])),
  );
});
test("pilot is exactly 1800 frames and every scene joins the next", () => {
  const e = episodeSchema.parse(pilot);
  assert.equal(e.duration * e.fps, 1800);
  e.scenes
    .slice(1)
    .forEach((s, i) =>
      assert.ok(
        Math.abs(s.start - e.scenes[i].start - e.scenes[i].duration) < 0.001,
      ),
    );
});
test("invalid scene actions, duplicate IDs, missing time and unsafe paths are rejected", () => {
  for (const mutate of [
    (e: typeof pilot) => {
      e.scenes[1].action = "unimplemented";
    },
    (e: typeof pilot) => {
      e.scenes[1].id = e.scenes[0].id;
    },
    (e: typeof pilot) => {
      e.scenes[1].start += 0.2;
    },
    (e: typeof pilot) => {
      e.audio.narration = "../private.wav";
    },
  ]) {
    const e = structuredClone(pilot);
    mutate(e);
    assert.equal(episodeSchema.safeParse(e).success, false);
  }
});
test("scene anchors use spoken words and fail instead of guessing", () => {
  const words = [
    { text: "What", start: 0, end: 0.2 },
    { text: "if?", start: 0.2, end: 0.4 },
    { text: "Next,", start: 2, end: 2.3 },
  ];
  assert.equal(findAnchor(words, "what if"), 0);
  assert.equal(findAnchor(words, "Next"), 2);
  assert.throws(() => findAnchor(words, "missing phrase"), /not found/);
  const e = episodeSchema.parse({
    ...pilot,
    duration: 5,
    storyItems: [
      {
        file: "pixel/story-items/matches-v1.png",
        anchor: "Next",
        start: 0,
        duration: 1,
        x: 70,
        y: 23,
        size: 30,
        unavailable: true,
      },
    ],
    scenes: [
      { ...pilot.scenes[0], duration: 2, anchor: "What if" },
      {
        ...pilot.scenes[1],
        start: 2,
        duration: 3,
        anchor: "Next",
        actionAnchor: "Next",
        actionCue: undefined,
      },
    ],
  });
  const result = alignEpisode(e, words, 1);
  assert.equal(result.episode.scenes[1].start, 2.8);
  assert.equal(result.episode.scenes[1].duration, 2.2);
  assert.equal(result.captions[0].startMs, 800);
  assert.equal(result.episode.scenes[1].actionCue, 0);
  assert.equal(result.episode.storyItems![0].start, 2.8);
  assert.throws(
    () =>
      alignEpisode(
        { ...e, storyItems: [{ ...e.storyItems![0], anchor: "absent item" }] },
        words,
        1,
      ),
    /not found/,
  );
  assert.equal(
    episodeSchema.safeParse({
      ...e,
      storyItems: [{ ...e.storyItems![0], start: 4.5 }],
    }).success,
    false,
  );
});
test("caption pages stay short and separate pauses", () => {
  const captions = Array.from({ length: 12 }, (_, i) => ({
    text: " word",
    startMs: i * 200,
    endMs: i * 200 + 150,
    timestampMs: null,
    confidence: null,
  }));
  assert.ok(captionPages(captions).every((p) => p.words.length <= 5));
  assert.throws(() => episodeId("../../outside"));
});
test("a second episode reuses the cast and gets its own media paths without changing the pilot", () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "video-machine-test-"));
  try {
    mkdirSync(`${fixture}/episodes/one-second-ahead`, { recursive: true });
    const original = JSON.stringify(pilot);
    writeFileSync(
      `${fixture}/episodes/one-second-ahead/episode.json`,
      original,
    );
    const args = [
      path.resolve("node_modules/tsx/dist/cli.mjs"),
      path.resolve("scripts/episode.ts"),
      "new",
      "second-story",
      "--title",
      "What if you could hear colors?",
    ];
    execFileSync(process.execPath, args, { cwd: fixture, stdio: "pipe" });
    const e = episodeSchema.parse(
      JSON.parse(
        readFileSync(`${fixture}/episodes/second-story/episode.json`, "utf8"),
      ),
    );
    assert.deepEqual(e.cast, pilot.cast);
    assert.equal(e.number, 2);
    assert.equal(e.shadowLeadSeconds, 0);
    assert.equal(e.audio.narration, "episodes/second-story/narration.wav");
    assert.equal(
      readFileSync(`${fixture}/episodes/one-second-ahead/episode.json`, "utf8"),
      original,
    );
    assert.throws(() =>
      execFileSync(process.execPath, args, { cwd: fixture, stdio: "pipe" }),
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("creative briefs, references and episode listings stay with the chosen project", (t) => {
  const fixture = mkdtempSync(path.join(tmpdir(), "video-machine-brief-"));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  const cli = [
    path.resolve("node_modules/tsx/dist/cli.mjs"),
    path.resolve("scripts/episode.ts"),
  ];
  const run = (...args: string[]) =>
    execFileSync(process.execPath, [...cli, ...args], {
      cwd: fixture,
      encoding: "utf8",
      stdio: "pipe",
    });
  const norbert = "--project=norbert-explains";
  const alex = "--project=alex-astro";
  const folder = path.join(fixture, "episodes/norbert-explains-brief-story");
  const brief = path.join(folder, "brief.md");
  assert.throws(() => run("brief", "brief-story", "--title", "No project yet"));
  assert.equal(existsSync(path.join(fixture, "episodes")), false);
  run("brief", "brief-story", norbert, "--title", "The cost of $&");
  run(
    "new",
    "brief-story",
    "--project",
    "alex-astro",
    "--title",
    "The developer cut",
  );
  const alexFolder = path.join(fixture, "episodes/alex-astro-brief-story");
  const draft = readFileSync(brief, "utf8");
  assert.equal(draft.split("\n")[0], "# The cost of $&");
  assert.ok(draft.includes("../../channel/motion-pixel-style.md"));
  assert.ok(
    readFileSync(path.join(alexFolder, "brief.md"), "utf8").includes(
      "../../channel/developer/cast.json",
    ),
  );
  assert.throws(() =>
    run("new", "alex-astro-brief-story", "--title", "Wrong template"),
  );
  assert.throws(() =>
    run(
      "new",
      "brief-story",
      alex,
      "--world=tudor",
      "--title",
      "Wrong template",
    ),
  );
  assert.equal(existsSync(path.join(alexFolder, "episode.json")), false);
  assert.equal(existsSync(path.join(folder, "episode.json")), false);
  assert.equal(existsSync(path.join(fixture, "public")), false);
  const filled = "# The cost of $&\n\nReview the opening preview.\n";
  writeFileSync(brief, filled);
  run("brief", "brief-story", norbert, "--title", "Replacement");
  assert.deepEqual(JSON.parse(run("status", "brief-story", norbert)), {
    draft: {
      title: "The cost of $&",
      brief: "episodes/norbert-explains-brief-story/brief.md",
    },
    project: "norbert-explains",
  });

  const savedEpisode = path.join(fixture, "episodes/deja-vu");
  mkdirSync(savedEpisode);
  writeFileSync(
    path.join(savedEpisode, "episode.json"),
    JSON.stringify({
      title: "Older film",
      duration: 12,
      scenes: [{ set: "deja-cafe" }],
    }),
  );
  writeFileSync(
    path.join(savedEpisode, "user-brief.md"),
    "Use the supplied script.",
  );
  run("brief", "deja-vu", norbert);
  assert.equal(existsSync(path.join(savedEpisode, "brief.md")), false);
  const listing = run("list", norbert);
  assert.ok(listing.includes("deja-vu | 12s | Older film"));
  assert.ok(
    listing.includes("norbert-explains-brief-story | brief | The cost of $&"),
  );
  assert.ok(!listing.includes("alex-astro-brief-story"));
  assert.equal(
    run("list", alex).trim(),
    "alex-astro-brief-story | brief | The developer cut",
  );

  const pilotDir = path.join(fixture, "episodes/one-second-ahead");
  mkdirSync(pilotDir);
  writeFileSync(path.join(pilotDir, "episode.json"), JSON.stringify(pilot));
  writeFileSync(path.join(folder, "narration.txt"), "Keep this line.");
  run(
    "new",
    "brief-story",
    norbert,
    "--title",
    "The cost of $&",
    "--world=tudor",
  );
  assert.equal(
    JSON.parse(readFileSync(path.join(folder, "episode.json"), "utf8")).world,
    "tudor",
  );
  assert.equal(readFileSync(brief, "utf8"), filled);
  assert.equal(
    readFileSync(path.join(folder, "narration.txt"), "utf8"),
    "Keep this line.",
  );
});

test("historical casts have an explicit project and manifests honor that assignment", () => {
  const seen = new Set<string>();
  for (const project of projectIds) {
    const entry = projects[project];
    for (const file of [entry.profile, entry.cast, entry.styleGuide])
      assert.ok(existsSync(file), file);
    for (const id of entry.legacyEpisodes) {
      assert.ok(!seen.has(id), id);
      seen.add(id);
      assert.ok(existsSync(`episodes/${id}/episode.json`), id);
    }
  }
  assert.equal(episodeProject("nvidia-four-trillion"), "norbert-explains");
  assert.equal(episodeProject("rip"), "alex-astro");
  assert.equal(
    episodeSchema.safeParse({ ...pilot, project: "alex-astro" }).success,
    false,
  );
  assert.equal(
    episodeSchema.parse({ ...pilot, project: "norbert-explains" }).project,
    "norbert-explains",
  );
});

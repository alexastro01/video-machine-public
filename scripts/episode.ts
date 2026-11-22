import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { parseArgs } from "node:util";
import { episodeId, json, loadEpisode } from "./common";
import profile from "../channel/profile.json";
import {
  episodeProject,
  isVideoProject,
  projectEpisodeId,
  projectIds,
  projects,
} from "../src/engine/video-projects";
import type { VideoProject } from "../src/engine/video-projects";
const [operation = "list", ...args] = process.argv.slice(2);
const {
  values,
  positionals: [slug],
} = parseArgs({
  args,
  allowPositionals: true,
  options: {
    project: { type: "string" },
    title: { type: "string" },
    world: { type: "string" },
    illustrated: { type: "boolean" },
  },
});

const selected = values.project;
if (selected !== undefined && !isVideoProject(selected))
  throw new Error(
    `Unknown project "${selected}". Choose ${projectIds.join(" or ")}.`,
  );

function scopedId(raw: string | undefined, project?: VideoProject) {
  const id = episodeId(raw);
  const manifest = `episodes/${id}/episode.json`;
  if (
    project &&
    existsSync(manifest) &&
    episodeProject(id, json<{ project?: string }>(manifest).project) === project
  )
    return id;
  return project ? projectEpisodeId(id, project) : id;
}

function requestedTitle() {
  const title = values.title?.trim();
  if (!title || title.startsWith("--") || /[\r\n]/.test(title))
    throw new Error("Pass a single-line episode title with --title");
  return title;
}

function createFile(file: string, contents: string) {
  try {
    writeFileSync(file, contents, { flag: "wx" });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw error;
  }
}

function briefDraft(id: string) {
  const brief = `episodes/${id}/brief.md`;
  const title = readFileSync(brief, "utf8")
    .split("\n", 1)[0]
    .replace(/^#\s+/, "");
  return { title, brief };
}

if (operation === "projects") {
  for (const id of projectIds)
    console.log(`${id} | ${projects[id].name} | ${projects[id].styleGuide}`);
} else if (operation === "list") {
  for (const id of readdirSync("episodes")) {
    if (existsSync(`episodes/${id}/episode.json`)) {
      const e = json<{ title: string; duration: number; project?: string }>(
        `episodes/${id}/episode.json`,
      );
      if (selected && episodeProject(id, e.project) !== selected) continue;
      console.log(`${id} | ${e.duration}s | ${e.title}`);
    } else if (existsSync(`episodes/${id}/brief.md`)) {
      if (selected && episodeProject(id) !== selected) continue;
      console.log(`${id} | brief | ${briefDraft(id).title}`);
    }
  }
} else if (operation === "status") {
  const id = scopedId(slug, selected);
  const production = `episodes/${id}/production.json`;
  const manifest = `episodes/${id}/episode.json`;
  const project = episodeProject(
    id,
    existsSync(manifest)
      ? json<{ project?: string }>(manifest).project
      : undefined,
  );
  const status = existsSync(production)
    ? json<Record<string, unknown>>(production)
    : existsSync(`episodes/${id}/brief.md`)
      ? { draft: briefDraft(id) }
      : { manifest, productionRecord: null };
  console.log(JSON.stringify({ ...status, project }, null, 2));
} else if (
  operation === "brief" ||
  (operation === "new" && selected && !values.world && !values.illustrated)
) {
  if (!slug)
    throw new Error(
      'Usage: npm run episode -- brief episode-slug --project <project> --title "…"',
    );
  const id = scopedId(slug, selected);
  const dir = `episodes/${id}`;
  const existing = [
    "brief.md",
    "brief.json",
    "user-brief.md",
    "visual-brief.md",
  ]
    .map((name) => `${dir}/${name}`)
    .find((file) => existsSync(file));
  if (existing) {
    console.log(`Use the saved brief at ${existing}`);
  } else {
    if (existsSync(`${dir}/episode.json`))
      throw new Error(
        `Episode already exists at ${dir}. Open it for a revision or choose a new slug.`,
      );
    if (!selected)
      throw new Error(
        `Choose the project for the new brief with --project ${projectIds.join(" or ")}.`,
      );
    const title = requestedTitle();
    const template = readFileSync(
      new URL(
        "../.agents/skills/video-machine/assets/brief.md",
        import.meta.url,
      ),
      "utf8",
    );
    const project = projects[selected];
    const fields: Record<string, string> = {
      title,
      projectName: project.name,
      projectId: selected,
      profile: "../../" + project.profile,
      cast: "../../" + project.cast,
      styleGuide: "../../" + project.styleGuide,
    };
    mkdirSync(dir, { recursive: true });
    const created = createFile(
      `${dir}/brief.md`,
      template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => fields[key]),
    );
    console.log(
      `${created ? "Created" : "Use the saved brief at"} ${dir}/brief.md`,
    );
  }
} else if (operation === "new") {
  if (!slug)
    throw new Error(
      'Usage: npm run episode -- new episode-slug --title "What if…?"',
    );
  const id = scopedId(slug, selected);
  const owner = selected ?? episodeProject(id);
  if (owner && owner !== "norbert-explains")
    throw new Error(
      `The world draft uses the Norbert Explains cast. Use the creative brief for ${projects[owner].name}.`,
    );
  const dir = `episodes/${id}`;
  if (
    existsSync(dir) &&
    (!existsSync(`${dir}/brief.md`) || existsSync(`${dir}/episode.json`))
  )
    throw new Error("Episode already exists; refusing to overwrite it.");
  const title = requestedTitle();
  const template = loadEpisode("one-second-ahead");
  const pixel = !values.illustrated;
  const world = values.world ?? "brain-lab";
  if (!["brain-lab", "tudor", "uk-vanish", "memory"].includes(world))
    throw new Error(
      "Choose --world=brain-lab, --world=tudor, --world=uk-vanish or --world=memory",
    );
  if (!pixel && world !== "brain-lab")
    throw new Error("The Tudor and UK worlds use the pixel renderer");
  const manifest = {
    ...template,
    project: "norbert-explains",
    renderer:
      world === "memory" ? "hyperframes" : pixel ? "pixel3d" : "illustrated2d",
    pixelArt: pixel ? "rpg" : "v1",
    world,
    hook:
      world === "tudor"
        ? "tudor-awakening"
        : world === "uk-vanish"
          ? "uk-vanish"
          : "none",
    duration: profile.defaultDurationSeconds,
    aspectRatio: profile.primaryAspectRatio,
    id,
    number: readdirSync("episodes").filter((name) => name !== id).length + 1,
    title,
    shadowLeadSeconds: 0,
    premise: title,
    audio: {
      ...template.audio,
      narration: `episodes/${id}/narration.wav`,
      music: `episodes/${id}/music.wav`,
      effects: `episodes/${id}/effects.wav`,
    },
    scenes: [
      {
        id: "opening",
        set:
          world === "tudor"
            ? "tudor-cottage"
            : world === "uk-vanish"
              ? "uk-cockpit"
              : world === "memory"
                ? "time-bedroom"
                : pixel
                  ? "upload-lab"
                  : "street",
        action:
          world === "tudor"
            ? "wake"
            : world === "uk-vanish"
              ? "approach"
              : world === "memory"
                ? "recall"
                : pixel
                  ? "upload"
                  : "reveal",
        start: 0,
        duration: profile.defaultDurationSeconds,
        anchor: "What if",
        label: "Opening question",
        timeOfDay: "day",
      },
    ],
  };
  mkdirSync(dir, { recursive: true });
  mkdirSync(`public/episodes/${id}`, { recursive: true });
  createFile(`${dir}/captions.json`, "[]\n");
  createFile(`${dir}/narration.txt`, "");
  if (
    !createFile(`${dir}/episode.json`, JSON.stringify(manifest, null, 2) + "\n")
  )
    throw new Error("Episode already exists; refusing to overwrite it.");
  const production = {
    draft: {
      title,
      next: "Write narration, choose scene anchors, generate and import audio, then run media:prepare.",
    },
  };
  createFile(
    `${dir}/production.json`,
    JSON.stringify(production, null, 2) + "\n",
  );
  console.log(
    `Created the ${world} world draft in ${dir}. For a new channel video, start with the video-machine creative brief.`,
  );
} else
  throw new Error(
    'Commands: projects, list [--project <project>], status <id>, brief <slug> --project <project> --title "…", new <slug> --title "…"',
  );

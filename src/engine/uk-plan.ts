import type { Episode } from "./schema";
import type { Caption } from "@remotion/captions";
import { findAnchor } from "./align";
import { makeUkStoryEdit } from "./uk-story-plan";
export function makeUkEdit(
  episode: Episode,
  captions: Caption[],
  pauseSeconds: number,
): NonNullable<Episode["ukEdit"]> {
  if (episode.ukEdit?.style === "story-v6")
    return makeUkStoryEdit(episode, captions);
  const words = captions.map((c) => ({
    text: c.text,
    start: c.startMs / 1000,
    end: c.endMs / 1000,
  }));
  const scene = (id: string) => episode.scenes.find((s) => s.id === id)!;
  const at = (anchor: string) => findAnchor(words, anchor);
  const commentStart = scene("closer").start;
  const quietStart = commentStart - pauseSeconds;
  const shots: NonNullable<Episode["ukEdit"]>["shots"] = [];
  const add = (
    start: number,
    end: number,
    sceneId: string,
    views: (typeof shots)[number]["view"][],
    cut: (typeof shots)[number]["cut"] = "snap",
  ) => {
    const n = views.length;
    for (let i = 0; i < n; i++) {
      const from =
        Math.round((start + ((end - start) * i) / n) * episode.fps) /
        episode.fps;
      const to =
        Math.round((start + ((end - start) * (i + 1)) / n) * episode.fps) /
        episode.fps;
      shots.push({
        start: from,
        duration: to - from,
        sceneId,
        view: views[i],
        cut: i === 0 ? cut : "snap",
      });
    }
  };
  add(0, scene("ireland").start, "hook", ["cockpit", "runway"]);
  add(
    scene("ireland").start,
    scene("calais").start,
    "ireland",
    ["ireland"],
    "blocks",
  );
  add(
    scene("calais").start,
    scene("tunnel").start,
    "calais",
    ["coast"],
    "whip",
  );
  add(
    scene("tunnel").start,
    scene("pound").start,
    "tunnel",
    ["train", "rails"],
    "blocks",
  );
  add(
    scene("pound").start,
    at("Overnight"),
    "pound",
    ["coin", "coin-break"],
    "whip",
  );
  add(
    at("Overnight"),
    scene("realms").start,
    "pound",
    ["network", "network-close"],
    "blocks",
  );
  add(scene("realms").start, quietStart, "realms", ["throne", "crown"], "snap");
  if (pauseSeconds > 1 / episode.fps)
    add(quietStart, commentStart, "realms", ["sea"], "quiet");
  add(commentStart, episode.duration, "closer", ["closer", "cockpit"], "snap");
  return {
    quietStart,
    quietDuration: pauseSeconds,
    commentStart,
    shots,
    ...(episode.ukEdit?.pilotAnimation
      ? { pilotAnimation: episode.ukEdit.pilotAnimation }
      : {}),
    ...(episode.ukEdit?.mikoGifs ? { mikoGifs: episode.ukEdit.mikoGifs } : {}),
  };
}

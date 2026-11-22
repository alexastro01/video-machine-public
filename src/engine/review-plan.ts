import type { Caption } from "@remotion/captions";
import { findAnchor } from "./align";
import type { Episode } from "./schema";
import type { ReviewShot } from "../pixel/review-motion";
export function makeReviewEdit(
  episode: Episode,
  captions: Caption[],
  pauseDuration: number,
): NonNullable<Episode["reviewEdit"]> {
  if (episode.reviewEdit?.scenery === "pixel-village-v1")
    return makeImmersiveEdit(episode);
  const words = captions.map((c) => ({
    text: c.text,
    start: c.startMs / 1000,
    end: c.endMs / 1000,
  }));
  const at = (phrase: string) =>
    Math.round(findAnchor(words, phrase) * episode.fps) / episode.fps;
  const get = (id: string) => episode.scenes.find((s) => s.id === id)!;
  const quietEnd = at("A serious operation"),
    quietStart =
      Math.round((quietEnd - pauseDuration) * episode.fps) / episode.fps;
  const commentStart = get("week").start;
  const shots: ReviewShot[] = [];
  const group = (
    start: number,
    end: number,
    sceneId: string,
    angles: ReviewShot["angle"][],
    activities: ReviewShot["activity"][],
    mood: ReviewShot["mood"],
  ) => {
    const n = Math.max(1, Math.ceil((end - start) / 3.8));
    for (let i = 0; i < n; i++) {
      const from =
          Math.round((start + ((end - start) * i) / n) * episode.fps) /
          episode.fps,
        to =
          Math.round((start + ((end - start) * (i + 1)) / n) * episode.fps) /
          episode.fps;
      shots.push({
        start: from,
        duration: to - from,
        sceneId,
        angle: angles[Math.min(i, angles.length - 1)],
        activity: activities[Math.min(i, activities.length - 1)],
        mood,
        cutStyle:
          shots.length % 4 === 2
            ? "wipe"
            : shots.length % 3 === 1
              ? "whip"
              : "snap",
      });
    }
  };
  group(
    0,
    get("fire").start,
    "arrival",
    ["wake", "face"],
    ["wake", "cold"],
    "warm",
  );
  group(
    get("fire").start,
    get("language").start,
    "fire",
    ["top", "detail"],
    ["cold", "strike"],
    "cold",
  );
  group(
    get("language").start,
    get("food").start,
    "language",
    ["face", "wide"],
    ["speak", "years"],
    "warm",
  );
  group(
    get("food").start,
    get("law").start,
    "food",
    ["low", "face"],
    ["search", "eat"],
    "warm",
  );
  group(
    get("law").start,
    get("medicine").start,
    "law",
    ["wide", "face"],
    ["stocks", "stocks"],
    "cold",
  );
  group(
    get("medicine").start,
    quietStart,
    "medicine",
    ["face", "detail"],
    ["cut", "tools"],
    "cold",
  );
  group(quietStart, quietEnd, "medicine", ["quiet"], ["tools"], "cold");
  group(quietEnd, commentStart, "medicine", ["face"], ["brace"], "danger");
  group(
    commentStart,
    episode.duration,
    "week",
    ["low", "loop"],
    ["comment", "loop"],
    "warm",
  );
  for (const s of shots) if (s.activity === "loop") s.sceneId = "arrival";
  return {
    style: "nov-2026",
    scenery: "geometry",
    quietStart,
    quietDuration: quietEnd - quietStart,
    commentStart,
    shots,
  };
}

function makeImmersiveEdit(
  episode: Episode,
): NonNullable<Episode["reviewEdit"]> {
  const get = (id: string) => episode.scenes.find((s) => s.id === id)!;
  const shots: ReviewShot[] = [];
  const group = (
    start: number,
    end: number,
    sceneId: string,
    activities: ReviewShot["activity"][],
    mood: ReviewShot["mood"],
  ) => {
    const n = Math.max(1, Math.ceil((end - start) / 3.8));
    for (let i = 0; i < n; i++) {
      const from =
          Math.round((start + ((end - start) * i) / n) * episode.fps) /
          episode.fps,
        to =
          Math.round((start + ((end - start) * (i + 1)) / n) * episode.fps) /
          episode.fps;
      const activity = activities[Math.min(i, activities.length - 1)];
      shots.push({
        start: from,
        duration: to - from,
        sceneId,
        activity,
        mood,
        angle: activity === "strike" ? "detail" : "wide",
        cutStyle: shots.length % 4 === 2 ? "wipe" : "snap",
      });
    }
  };
  group(0, get("fire").start, "arrival", ["wake", "cold"], "warm");
  group(
    get("fire").start,
    get("language").start,
    "fire",
    ["cold", "strike"],
    "cold",
  );
  group(
    get("language").start,
    get("food").start,
    "language",
    ["speak", "years"],
    "warm",
  );
  group(get("food").start, get("law").start, "food", ["search", "eat"], "warm");
  group(
    get("law").start,
    get("medicine").start,
    "law",
    ["stocks", "stocks"],
    "cold",
  );
  group(
    get("medicine").start,
    get("week").start,
    "medicine",
    ["cut", "tools", "brace"],
    "cold",
  );
  group(
    get("week").start,
    episode.duration,
    "week",
    ["comment", "loop"],
    "warm",
  );
  for (const s of shots) if (s.activity === "loop") s.sceneId = "arrival";
  return {
    style: "nov-2026",
    scenery: "pixel-village-v1",
    ...(episode.reviewEdit?.wipeColors
      ? { wipeColors: episode.reviewEdit.wipeColors }
      : {}),
    quietStart: 0,
    quietDuration: 0,
    commentStart: get("week").start,
    shots,
  };
}

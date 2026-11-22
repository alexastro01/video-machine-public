import type { Caption } from "@remotion/captions";
import type { Episode } from "./schema";
import { findAnchor } from "./align";

export function makeUkStoryEdit(
  episode: Episode,
  captions: Caption[],
): NonNullable<Episode["ukEdit"]> {
  const words = captions.map((c) => ({
    text: c.text,
    start: c.startMs / 1000,
    end: c.endMs / 1000,
  }));
  const at = (phrase: string) => findAnchor(words, phrase);
  const shots: NonNullable<Episode["ukEdit"]>["shots"] = [];
  const add = (
    id: string,
    views: (typeof shots)[number]["view"][],
    cut: (typeof shots)[number]["cut"] = "snap",
  ) => {
    const scene = episode.scenes.find((s) => s.id === id)!;
    views.forEach((view, i) => {
      const start =
        Math.round(
          (scene.start + (scene.duration * i) / views.length) * episode.fps,
        ) / episode.fps;
      const end =
        Math.round(
          (scene.start + (scene.duration * (i + 1)) / views.length) *
            episode.fps,
        ) / episode.fps;
      shots.push({
        start,
        duration: end - start,
        sceneId: id,
        view,
        cut: i === 0 ? cut : "snap",
      });
    });
  };
  add("hook", ["cockpit", "runway"]);
  add("ireland", ["map-whole", "ireland"], "blocks");
  add("question", ["question", "closer"]);
  add("fish", ["fish", "fish-detail"], "whip");
  add("pints", ["pints", "pints-close"], "whip");
  add("pound", ["screens", "network"], "snap");
  add("league", ["stadium", "ball"], "blocks");
  add("dublin", ["approach-dublin", "dublin"], "whip");
  add("closer", ["closer", "cockpit"]);
  const events = Object.fromEntries(
    Object.entries({
      runway: "when the runway",
      runwayGone: "disappears",
      vanished: "just vanished",
      coast: "northern coast",
      fishGone: "Gone",
      friedFish: "fried fish",
      stopSip: "Stopped",
      midSip: "Mid-sip",
      overnight: "Overnight",
      dark: "goes dark",
      cancelled: "Cancelled",
      forever: "Forever",
      land: "pilot land",
      dublin: "Dublin",
      busy: "never been",
      comment: "Comment below",
    }).map(([name, phrase]) => [name, at(phrase)]),
  );
  return {
    style: "story-v6",
    ...(episode.ukEdit?.soundDesign
      ? { soundDesign: episode.ukEdit.soundDesign }
      : {}),
    ...(episode.ukEdit?.soundLayers
      ? { soundLayers: episode.ukEdit.soundLayers }
      : {}),
    events,
    shots,
    quietStart: episode.duration,
    quietDuration: 0,
    commentStart: episode.scenes.at(-1)!.start,
  };
}

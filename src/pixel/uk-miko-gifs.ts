import type { Episode } from "../engine/schema";
import type { SpriteSheet } from "./Sprite";
import coast from "../../public/pixel/animations/miko-coast-gif-v1-atlas.json";
import tunnel from "../../public/pixel/animations/miko-tunnel-gif-v1-atlas.json";
import trading from "../../public/pixel/animations/miko-trading-gif-v1-atlas.json";
import throne from "../../public/pixel/animations/miko-throne-gif-v1-atlas.json";
import { atlasFrameAt } from "./atlas-animation";

export type UkGifCue = NonNullable<
  NonNullable<Episode["ukEdit"]>["mikoGifs"]
>[number];

export const mikoGifSheets = {
  "miko-coast-gif-v1": {
    file: "pixel/animations/miko-coast-gif-v1-atlas.png",
    metadata: coast,
  },
  "miko-tunnel-gif-v1": {
    file: "pixel/animations/miko-tunnel-gif-v1-atlas.png",
    metadata: tunnel,
  },
  "miko-trading-gif-v1": {
    file: "pixel/animations/miko-trading-gif-v1-atlas.png",
    metadata: trading,
  },
  "miko-throne-gif-v1": {
    file: "pixel/animations/miko-throne-gif-v1-atlas.png",
    metadata: throne,
  },
} satisfies Record<UkGifCue["asset"], SpriteSheet>;

export function ukGifFrame(cue: UkGifCue, local: number) {
  const { metadata } = mikoGifSheets[cue.asset];
  if (
    cue.endFrame >= metadata.frameCount ||
    cue.holdFrame >= metadata.frameCount
  )
    throw new Error(`GIF pose outside ${cue.asset}`);
  return atlasFrameAt(local, {
    start: cue.at,
    frameDurationMs: metadata.frameDurationMs,
    endFrame: cue.endFrame,
    holdFrame: cue.holdFrame,
  });
}

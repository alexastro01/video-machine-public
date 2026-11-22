import type { CSSProperties, ReactNode } from "react";
import { Img, staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";
import inventory from "../../episodes/alex-astro-instagram-algorithm-rpg/art.json";
import clock from "../../episodes/alex-astro-instagram-algorithm-rpg/timing.json";

export const root = "episodes/alex-astro-instagram-algorithm-rpg/";
export const timing = clock;
export const cue = clock.cues;
export const pix = '"RPG Pixelify", monospace';
export const tiny = '"RPG Cartridge", monospace';
export const ink = "#111b29";
export const gold = "#ffe384";
export type ArtName = keyof typeof inventory;
export type Role = "alex" | "opus" | "astra" | "gemini";
export type Route = "feed" | "stories" | "reels" | "explore" | "search";

if (typeof document !== "undefined") {
  loadFont({
    family: "RPG Pixelify",
    url: staticFile(root + "type/pixelify.ttf"),
    weight: "400 700",
  });
  loadFont({
    family: "RPG Cartridge",
    url: staticFile(root + "type/press-start.ttf"),
  });
}

export function unit(f: number, a: number, b: number) {
  return Math.min(1, Math.max(0, (f - a) / (b - a)));
}
export function smooth(f: number, a: number, b: number) {
  const t = unit(f, a, b);
  return t * t * (3 - 2 * t);
}
export function out(f: number, a: number, b: number) {
  return 1 - Math.pow(1 - unit(f, a, b), 3);
}
export function pulse(f: number, start: number, span: number) {
  return Math.sin(Math.PI * unit(f, start, start + span));
}
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const snap = Math.round;
export function wordAt(f: number) {
  const next = clock.starts.findIndex((start) => start > f);
  return (next === -1 ? clock.starts.length : next) - 1;
}
export const plane: CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  width: 270,
  height: 480,
  transform: "scale(4)",
  transformOrigin: "0 0",
};
export const pos = (
  left: number,
  top: number,
  width?: number,
  height?: number,
): CSSProperties => ({ position: "absolute", left, top, width, height });
export function PixelLayer({ children }: { children: ReactNode }) {
  return <div style={plane}>{children}</div>;
}
export function Art({
  name,
  x = 0,
  y = 0,
  w,
  h,
  style,
  smoothArt = false,
}: {
  name: ArtName;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  style?: CSSProperties;
  smoothArt?: boolean;
}) {
  const data = inventory[name];
  const width = w ?? (h === undefined ? data.w : (h * data.w) / data.h);
  return (
    <Img
      src={staticFile(root + "art/" + data.file)}
      draggable={false}
      style={{
        ...pos(x, y, width, h ?? (width * data.h) / data.w),
        display: "block",
        imageRendering: smoothArt ? "auto" : "pixelated",
        ...style,
      }}
    />
  );
}
export function Feet({
  name,
  x,
  y,
  h,
  opacity = 1,
  transform,
  clipPath,
}: {
  name: ArtName;
  x: number;
  y: number;
  h: number;
  opacity?: number;
  transform?: string;
  clipPath?: string;
}) {
  const width = (h * inventory[name].w) / inventory[name].h;
  return (
    <Art
      name={name}
      x={snap(x - width / 2)}
      y={snap(y - h)}
      h={h}
      style={{ opacity, transform, clipPath, transformOrigin: "50% 100%" }}
    />
  );
}
export function Shadow({
  x,
  y,
  w,
  h = 5,
  alpha = 0.3,
}: {
  x: number;
  y: number;
  w: number;
  h?: number;
  alpha?: number;
}) {
  return (
    <div
      style={{
        ...pos(snap(x - w / 2), snap(y - h * 0.55), w, h),
        background: ink,
        opacity: alpha,
        clipPath:
          "polygon(12% 0,84% 0,84% 18%,96% 18%,96% 39%,100% 39%,100% 72%,87% 72%,87% 100%,13% 100%,13% 82%,3% 82%,3% 58%,0 58%,0 27%,12% 27%)",
      }}
    />
  );
}

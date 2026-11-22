export type Animation = {
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
  columns: number;
  frameCount: number;
  frameDurationMs: number;
  crop: { x: number; y: number; width: number; height: number };
  cells: { left: number; top: number; right: number; bottom: number }[];
  hands?: [number, number][];
};
export type Asset = {
  id: string;
  url: string;
  width: number;
  height: number;
  worldHeight: number;
  pivotX: number;
  footY: number;
  hand?: [number, number];
  animation?: Animation;
};
export type Line = {
  id: string;
  speaker: string;
  text: string;
  start: number;
  end: number;
  words: { text: string; start: number; end: number }[];
};
export type Shot = {
  id: string;
  start: number;
  duration: number;
  set: string;
  action: string;
  anchor: string;
  description: string;
};
export type Plan = {
  id: string;
  title: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  events: Record<string, number>;
  lines: Line[];
  shots: Shot[];
  assets: Asset[];
  model: string;
};

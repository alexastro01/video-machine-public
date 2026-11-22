export type SpyAnimation = {
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
  columns: number;
  rows: number;
  frameCount: number;
  frameDurationMs: number;
  crop: { x: number; y: number; width: number; height: number };
  cells: { left: number; top: number; right: number; bottom: number }[];
};

export type SpyAsset = {
  id: string;
  url: string;
  width: number;
  height: number;
  worldHeight: number;
  pivotX: number;
  footY: number;
  animation?: SpyAnimation;
};

export type SpyShotId =
  | "hook"
  | "point"
  | "league"
  | "servers"
  | "gpu"
  | "ignored"
  | "taipei"
  | "alarm"
  | "asset"
  | "laptop"
  | "exit"
  | "complete";

export type SpyPlan = {
  id: string;
  title: string;
  width: number;
  height: number;
  fps: number;
  frames: number;
  duration: number;
  revision: number;
  narrationSpeed: number;
  events: Record<string, number>;
  shots: {
    id: SpyShotId;
    start: number;
    duration: number;
    description: string;
    anchor: string;
    set: string;
    action: string;
  }[];
  lines: {
    id: string;
    start: number;
    end: number;
    words: { text: string; start: number; end: number }[];
  }[];
  assets: SpyAsset[];
};

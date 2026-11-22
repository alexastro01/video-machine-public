export type Animation = {
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
  background?: boolean;
};
export type Asset = {
  id: string;
  url: string;
  width: number;
  height: number;
  worldHeight: number;
  pivotX: number;
  footY: number;
  animation?: Animation;
};
export type StageActor = {
  id: string;
  x: number;
  y: number;
  z: number;
  flip?: boolean;
  scale?: number;
  endX?: number;
  walk?: boolean;
  frame?: number;
  reaction?: { id: string; at: number; duration: number };
};
export type StageProp = {
  type: string;
  x: number;
  y: number;
  z: number;
  text?: string;
  scale?: number;
  yaw?: number;
  cue?: number;
};
export type FilmStage = {
  background: string;
  actors: StageActor[];
  props: StageProp[];
  camera: [number, number, number];
  year?: string;
  plate?: string;
  plateFrame?: number;
  plateFocus?: [number, number, number];
  hold?: boolean;
  tilt?: number;
};
export type Plan = {
  id: string;
  title: string;
  duration: number;
  fps: number;
  frames: number;
  width: number;
  height: number;
  revision: number;
  events: Record<string, number>;
  shots: {
    id: string;
    start: number;
    duration: number;
    set: string;
    action: string;
    anchor: string;
    description: string;
    stage?: FilmStage;
  }[];
  lines: {
    id: string;
    start: number;
    end: number;
    words: { text: string; start: number; end: number }[];
  }[];
  assets: Asset[];
  backgrounds: Record<string, string>;
  portrait: string;
};

export type FateShot = {
  id: string;
  start: number;
  duration: number;
  description: string;
};

export type FateAsset = {
  id: string;
  url: string;
  width: number;
  height: number;
  worldHeight: number;
  pivotX: number;
  footY: number;
  animation?: {
    width: number;
    height: number;
    cellWidth: number;
    cellHeight: number;
    columns: number;
    frameCount: number;
    frameDurationMs: number;
    crop: { x: number; y: number; width: number; height: number };
    cells: { bottom: number }[];
  };
};

export type FatePlan = {
  title: string;
  frames: number;
  duration: number;
  fps: number;
  width: number;
  height: number;
  events: Record<string, number>;
  shots: FateShot[];
  assets: FateAsset[];
  scenery?: Record<string, string>;
  models?: Record<"book" | "brain" | "cloud", string>;
  openingQuestion?: boolean;
  revision?: number;
};

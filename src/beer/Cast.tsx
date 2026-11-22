import type { CSSProperties } from "react";
import { Img, staticFile } from "remotion";
import layout from "../../episodes/beer-feels-good/assets/miko-layout.json";
import propLayout from "../../episodes/beer-feels-good/assets/blender-layout.json";

export const base = "episodes/beer-feels-good/";
const absolute: CSSProperties = { position: "absolute" };
type Pose = keyof typeof layout.poses;
type Animation = keyof typeof layout.animations;

export const Actor = ({
  t,
  pose = "relaxed",
  animation,
  at = 0,
  x = 540,
  foot = 1330,
  height = 1080,
  opacity = 1,
  rotate = 0,
}: {
  t: number;
  pose?: Pose;
  animation?: Animation;
  at?: number;
  x?: number;
  foot?: number;
  height?: number;
  opacity?: number;
  rotate?: number;
}) => {
  if (!animation) {
    const asset = layout.poses[pose];
    const scale = height / asset.bodyHeight;
    return (
      <div
        style={{
          ...absolute,
          inset: 0,
          opacity,
          transform: `rotate(${rotate}deg)`,
          transformOrigin: `${x}px ${foot}px`,
        }}
      >
        <Img
          src={staticFile(asset.file)}
          style={{
            ...absolute,
            width: asset.width * scale,
            maxWidth: "none",
            left: x - asset.pivotX * scale,
            top: foot - asset.footY * scale,
          }}
        />
      </div>
    );
  }
  const asset = layout.animations[animation];
  const index = Math.min(
    asset.frameCount - 1,
    Math.max(0, Math.floor(((t - at + 1e-7) * 1000) / asset.frameDurationMs)),
  );
  const cell = asset.cells[index];
  const crop = asset.crop;
  const scale = height / asset.bodyHeight;
  return (
    <div
      style={{
        ...absolute,
        left: x - (asset.pivotX - crop.x) * scale,
        top: foot - (cell.footY - crop.y) * scale,
        width: crop.width * scale,
        height: crop.height * scale,
        overflow: "hidden",
        opacity,
        transform: `rotate(${rotate}deg)`,
        transformOrigin: `${(asset.pivotX - crop.x) * scale}px ${(cell.footY - crop.y) * scale}px`,
      }}
    >
      <Img
        src={staticFile(asset.file)}
        style={{
          ...absolute,
          width: asset.width * scale,
          maxWidth: "none",
          left: -(cell.originX + crop.x) * scale,
          top: -(cell.originY + crop.y) * scale,
        }}
      />
    </div>
  );
};

export const Molecule = ({
  t,
  x,
  y,
  size = 220,
  phase = 0,
  opacity = 1,
}: {
  t: number;
  x: number;
  y: number;
  size?: number;
  phase?: number;
  opacity?: number;
}) => {
  const frame = 1 + ((((Math.floor(t * 60) + phase) % 120) + 120) % 120);
  return (
    <Img
      src={staticFile(
        `${base}blender/molecule/frame-${String(frame).padStart(4, "0")}.png`,
      )}
      style={{
        ...absolute,
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        opacity,
      }}
    />
  );
};

export const Mug = ({
  frame,
  x,
  bottom,
  size,
}: {
  frame: number;
  x: number;
  bottom: number;
  size: number;
}) => {
  const index = Math.min(64, Math.max(1, Math.floor(frame)));
  return (
    <Img
      src={staticFile(
        `${base}blender/mug/frame-${String(index).padStart(4, "0")}.png`,
      )}
      style={{
        ...absolute,
        width: size,
        height: size,
        left: x - size * (1 - 520 / 1080),
        top: bottom - (size * propLayout.mug.frames[index - 1].footY) / 1080,
        transform: "scaleX(-1)",
      }}
    />
  );
};

export function performanceFrame(
  t: number,
  at: number,
  art: { frames: number; frameMs: number },
) {
  return Math.min(
    art.frames - 1,
    Math.max(0, Math.floor(((t - at + 1e-7) * 1000) / art.frameMs)),
  );
}

export const Performance = ({
  art,
  frame,
  x,
  y,
  width,
}: {
  art: {
    atlas: string;
    cellSize: number;
    columns: number;
    rows: number;
    frames: number;
    frameMs: number;
  };
  frame: number;
  x: number;
  y: number;
  width: number;
}) => {
  const i = frame;
  return (
    <div
      style={{
        ...absolute,
        left: x,
        top: y,
        width,
        height: width,
        overflow: "hidden",
      }}
    >
      <Img
        src={staticFile(art.atlas)}
        style={{
          ...absolute,
          width: width * art.columns,
          height: width * art.rows,
          maxWidth: "none",
          left: -(i % art.columns) * width,
          top: -Math.floor(i / art.columns) * width,
        }}
      />
    </div>
  );
};

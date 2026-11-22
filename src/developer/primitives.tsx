import type { CSSProperties, ReactNode } from "react";
import { Img, staticFile } from "remotion";

export const abs: CSSProperties = { position: "absolute" };
export const colors = {
  paper: "#f8f8fa",
  ink: "#20242b",
  blue: "#007aff",
  red: "#bd4b61",
  green: "#4c8b73",
  muted: "#9298a3",
  border: "#e8e9ed",
};
export const Card = ({
  children,
  style,
}: {
  children?: ReactNode;
  style?: CSSProperties;
}) => (
  <div
    style={{
      ...abs,
      background: "white",
      border: `2px solid ${colors.border}`,
      borderRadius: 30,
      boxShadow: "0 24px 64px #182b3512,0 3px 8px #182b3506",
      ...style,
    }}
  >
    {children}
  </div>
);
export type ActorSpec = {
  url: string;
  width: number;
  height: number;
  bounds: number[];
  pivotX: number;
  footY: number;
  bodyHeight: number;
};
export const PixelActor = ({
  actor,
  x,
  foot,
  height,
  style,
}: {
  actor: ActorSpec;
  x: number;
  foot: number;
  height: number;
  style?: CSSProperties;
}) => {
  const scale = height / actor.bodyHeight;
  return (
    <Img
      src={staticFile(actor.url)}
      style={{
        ...abs,
        left: x - actor.pivotX * scale,
        top: foot - actor.footY * scale,
        width: actor.width * scale,
        height: actor.height * scale,
        imageRendering: "pixelated",
        ...style,
      }}
    />
  );
};
export const SvgIcon = ({
  paths,
  size = 34,
  color = colors.ink,
}: {
  paths: string;
  size?: number;
  color?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    dangerouslySetInnerHTML={{ __html: paths }}
  />
);

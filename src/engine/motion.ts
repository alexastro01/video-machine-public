import { Easing, interpolate } from "remotion";
import profile from "../../channel/profile.json";

const ease = Easing.bezier(0.22, 0.8, 0.25, 1);
export const tween = (
  t: number,
  from: number,
  to: number,
  a: number,
  b: number,
) =>
  interpolate(t, [from, to], [a, b], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
export const pulse = (t: number, at: number, length = 0.5) =>
  Math.sin(Math.PI * Math.max(0, Math.min(1, (t - at) / length)));
export const beat = (t: number, at: number, length = 0.7) =>
  tween(t, at, at + length, 0, 1);
export const walk = (t: number) => Math.sin(t * Math.PI * 3.2);
export const palette = { ...profile.palette, shadow: "#47415B" };

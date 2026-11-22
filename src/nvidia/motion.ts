import timeline from "../../episodes/nvidia-four-trillion/edit.json";
import planData from "../../episodes/nvidia-four-trillion/plan.json";

export const edit = timeline;
export const e = edit.events;
export type Stage = "diner" | "workshop" | "compute" | "servers";
export type Pose =
  | "neutral"
  | "worried"
  | "point"
  | "seated"
  | "receive"
  | "relieved"
  | "phone-concerned"
  | "phone-relief"
  | "work-prepare"
  | "work-contact"
  | "diner-pencil"
  | "diner-cup"
  | "inspect"
  | "trace"
  | "follow";
export type Vec3 = [number, number, number];
type CameraPlan = { from: Vec3; to: Vec3; target: Vec3; fov: number };
export const plan = planData;
export const clamp = (v: number) => Math.max(0, Math.min(1, v));
export const smooth = (v: number) => {
  const x = clamp(v);
  return x * x * (3 - 2 * x);
};
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const shotAt = (t: number) =>
  edit.shots.find((s) => t >= s.start && t < s.start + s.duration) ??
  edit.shots[edit.shots.length - 1];
export const stageAt = (t: number) => shotAt(t).stage as Stage;
export const poseAt = (t: number) => shotAt(t).pose as Pose;
export function cameraAt(t: number) {
  const shot = shotAt(t);
  const cameras = plan.cameras as unknown as Record<string, CameraPlan>;
  // One continuous camera move carries the chip into the network explanation.
  // Restarting an identical move at each spoken clause made the scene jump back.
  const compute = t >= e.cuda && t < e.ai;
  const c = compute
    ? { ...cameras.cuda, to: cameras.learning.to }
    : cameras[shot.id];
  const p = smooth(
    compute ? (t - e.cuda) / (e.ai - e.cuda) : (t - shot.start) / shot.duration,
  );
  return {
    position: c.from.map((v, i) => mix(v, c.to[i], p)) as Vec3,
    target: c.target,
    fov: c.fov,
  };
}
export function actorAt(t: number) {
  const stage = stageAt(t);
  const p = plan.stages[stage].actor;
  const pulse = (at: number, length: number) => {
    const age = (t - at) / length;
    return age > 0 && age < 1 ? Math.sin(age * Math.PI) : 0;
  };
  let pose = poseAt(t);
  if (t < e.stakes) pose = t < e.impact + 0.07 ? "point" : "worried";
  if (t >= e.failure && t < e.fail + 0.06) pose = "point";
  if (t >= e.sega && t < e.redesign)
    pose = t < e.confirm ? "phone-concerned" : "phone-relief";
  if (stage === "diner") pose = t < e.coffee ? "diner-pencil" : "diner-cup";
  if (t >= e.stakes && t < e.diner)
    pose = t < e.stakes + 1.6 ? "worried" : "receive";
  if (t >= e.redesign + 0.08 && t < e.boardLock + 0.18)
    pose =
      Math.floor((t - e.redesign - 0.08) / 0.22) % 2 === 0
        ? "work-prepare"
        : "work-contact";
  if (t >= e.boardLock + 0.18 && t < e.riva) pose = "receive";
  if (stage === "compute")
    pose =
      t < e.parallel ? "inspect" : t < e.learning + 0.24 ? "trace" : "follow";
  const rotation =
    -0.045 * (pulse(e.impact + 0.04, 0.48) + pulse(e.fail + 0.04, 0.48)) +
    0.025 * pulse(e.confirm, 0.5) +
    0.018 * pulse(e.cuda + 0.28, 0.6);
  return {
    position: [p[0], p[1], p[2]] as Vec3,
    rotation,
    pose,
  };
}
export function propState(t: number) {
  return {
    drawer: t < e.redesign ? 0.46 * smooth((t - e.drawer - 0.17) / 0.42) : 0,
    oldVisible: t < e.redesign,
    newVisible: t >= e.redesign,
    newDrop: 1 - smooth((t - e.redesign - 0.58) / 0.64),
    phoneInHand: t >= e.sega && t < e.redesign,
    shipping: smooth((t - e.shipping) / 0.77),
    value: smooth((t - e.valueStart) / 0.35),
    confirmed: t >= e.confirm,
    failed: (t >= e.impact && t < e.diner) || (t >= e.fail && t < e.boardLock),
  };
}

export function transitionAt(t: number) {
  for (const transition of plan.transitions) {
    const offset = t - e[transition.shot as keyof typeof e];
    if (offset < -transition.lead || offset >= transition.tail) continue;
    const amount =
      offset <= 0
        ? smooth(1 + offset / transition.lead)
        : 1 - smooth(offset / transition.tail);
    return { treatment: transition.treatment, amount };
  }
  return null;
}

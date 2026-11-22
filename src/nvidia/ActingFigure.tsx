import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import choreography from "../../episodes/nvidia-four-trillion/acting-v3.json";
import { cameraAt, plan, shotAt, smooth, type Vec3 } from "./motion";

export type PoseMeta = {
  file: string;
  width: number;
  height: number;
  anchorX: number;
  footY: number;
  bounds: number[];
  palm?: number[];
};

const tracks: Record<string, number[][]> = choreography.tracks;
const rad = Math.PI / 180;
const lerp = THREE.MathUtils.lerp;

function poseAngles(t: number, trackSuffix: string) {
  const shot = shotAt(t),
    age = t - shot.start;
  const keys = tracks[shot.id + trackSuffix];
  if (!keys) return [0, 0, 0, 0];
  const index = keys.findIndex((key) => key[0] > age);
  const next = keys[index] ?? keys[keys.length - 1];
  const prev = index > 0 ? keys[index - 1] : index === 0 ? keys[0] : next;
  const phase = smooth((age - prev[0]) / Math.max(0.001, next[0] - prev[0]));
  return prev.slice(1).map((value, i) => lerp(value, next[i + 1], phase) * rad);
}

function createRig(meta: PoseMeta, pose: string) {
  const unit = 1 / plan.actorPixelsPerUnit;
  const geom = new THREE.PlaneGeometry(
    meta.width * unit,
    meta.height * unit,
    30,
    36,
  );
  geom.translate(
    (meta.width / 2 - meta.anchorX) * unit,
    (meta.footY - meta.height / 2) * unit,
    0,
  );
  const rest = geom.getAttribute("position").clone();
  const height = (meta.footY - meta.bounds[1]) * unit;
  const side = pose === "relieved" ? -1 : 1;
  const lifted =
    pose === "follow" || pose === "modern-present" || pose === "relieved";
  const sketch = pose === "diner-pencil" || pose.startsWith("work-");
  const weights = Array.from({ length: rest.count }, (_, i) => {
    const x = rest.getX(i) / height,
      y = rest.getY(i) / height;
    const torso = smooth((y - 0.14) / 0.36);
    // Use the artwork's own shoulder and neck. The shoe vertices have zero influence.
    const armSide = side * x;
    const arm =
      smooth((armSide + (sketch ? 0.1 : -0.015)) / 0.22) *
      smooth((y - 0.23) / 0.15) *
      (1 - smooth((y - (lifted ? 0.88 : 0.68)) / 0.13));
    const head =
      smooth((y - 0.57) / 0.13) * (1 - smooth((armSide - 0.18) / 0.16));
    const fore = arm * smooth((armSide + (sketch ? 0.06 : -0.095)) / 0.18);
    return [torso, head, arm, fore];
  });
  return { geom, rest, height, side, weights };
}

function deform(rig: ReturnType<typeof createRig>, angles: number[]) {
  const { geom, rest, height: h, weights, side } = rig;
  const out = geom.getAttribute("position");
  const pivots = [
    [0, 0.39],
    [0, 0.65],
    [side * 0.09, 0.6],
    [side * 0.21, 0.48],
  ];
  const sine = angles.map(Math.sin),
    cos = angles.map(Math.cos);
  for (let i = 0; i < rest.count; i++) {
    let x = rest.getX(i) / h,
      y = rest.getY(i) / h;
    // Deform from the most distal joint toward the hips so an elbow follows the torso.
    for (const joint of [3, 2, 1, 0]) {
      const weight = weights[i][joint];
      if (weight <= 0) continue;
      const [px, py] = pivots[joint],
        dx = x - px,
        dy = y - py;
      const sin = joint >= 2 ? sine[joint] * side : sine[joint];
      x += weight * ((cos[joint] - 1) * dx - sin * dy);
      y += weight * (sin * dx + (cos[joint] - 1) * dy);
    }
    out.setXYZ(i, x * h, y * h, 0);
  }
  out.needsUpdate = true;
}

// Interpolate the same deformed mesh the renderer sees, so the sample stays on the palm.
function placeAttachment(
  group: THREE.Group,
  geometry: THREE.PlaneGeometry,
  meta: PoseMeta,
) {
  if (!meta.palm) return;
  const { widthSegments: nx, heightSegments: ny } = geometry.parameters;
  const u = (meta.palm[0] / meta.width) * nx,
    v = (meta.palm[1] / meta.height) * ny;
  const x = Math.floor(u),
    y = Math.floor(v),
    tx = u - x,
    ty = v - y;
  const position = geometry.getAttribute("position");
  group.position.set(0, 0, 0.045);
  for (const [ix, iy, weight] of [
    [x, y, (1 - tx) * (1 - ty)],
    [x + 1, y, tx * (1 - ty)],
    [x, y + 1, (1 - tx) * ty],
    [x + 1, y + 1, tx * ty],
  ]) {
    const index = iy * (nx + 1) + ix;
    group.position.x += position.getX(index) * weight;
    group.position.y += position.getY(index) * weight;
  }
}

function contactTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const stops = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  stops.addColorStop(0, "rgba(25,29,30,.72)");
  stops.addColorStop(0.42, "rgba(25,29,30,.46)");
  stops.addColorStop(1, "rgba(25,29,30,0)");
  ctx.fillStyle = stops;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

export function ActingFigure({
  t,
  pose,
  position,
  meta,
  texture,
  scale = 1,
  trackSuffix = "",
  heldProp,
  children,
}: {
  t: number;
  pose: string;
  position: Vec3;
  meta: PoseMeta;
  texture: THREE.Texture;
  scale?: number;
  trackSuffix?: string;
  heldProp?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const rig = useMemo(() => createRig(meta, pose), [meta, pose]);
  const contact = useMemo(contactTexture, []);
  const attachment = useRef<THREE.Group>(null);
  useEffect(() => () => rig.geom.dispose(), [rig]);
  useEffect(() => () => contact.dispose(), [contact]);
  useLayoutEffect(() => {
    deform(rig, poseAngles(t, trackSuffix));
    if (attachment.current) placeAttachment(attachment.current, rig.geom, meta);
  }, [rig, t, trackSuffix, meta]);
  const cam = cameraAt(t).position;
  const yaw = Math.atan2(cam[0] - position[0], cam[2] - position[2]);
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={scale}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <planeGeometry args={[1.25, 0.53]} />
        <meshBasicMaterial
          map={contact}
          transparent
          opacity={0.52}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>
      <mesh geometry={rig.geom} castShadow receiveShadow frustumCulled={false}>
        <meshLambertMaterial
          map={texture}
          emissiveMap={texture}
          emissive="#b0b8bf"
          emissiveIntensity={0.64}
          side={THREE.DoubleSide}
          shadowSide={THREE.DoubleSide}
          alphaTest={0.38}
          alphaToCoverage
          toneMapped={false}
        />
      </mesh>
      {heldProp && <group ref={attachment}>{heldProp}</group>}
      {children}
    </group>
  );
}

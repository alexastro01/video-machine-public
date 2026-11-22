import { abs } from "../developer/primitives";
import { backflip, mix, ui } from "./motion";

type Vertex = [number, number, number];
type Surface = { points: Vertex[]; color: string; front?: boolean };
const svgSize = { width: 1080, height: 770 };
function corners(w: number, h: number, r: number) {
  const result: [number, number][] = [];
  for (let side = 0; side < 4; side++) {
    const cx = side < 2 ? w / 2 - r : -w / 2 + r;
    const cy = side === 0 || side === 3 ? -h / 2 + r : h / 2 - r;
    for (let step = 0; step <= 5; step++) {
      const a = -Math.PI / 2 + (side * Math.PI) / 2 + (step * Math.PI) / 10;
      result.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  return result;
}

export function FlipProp({
  type,
  t,
  start,
  x = 540,
  floor,
  width,
  failed = 0,
  opacity = 1,
  modern = 0,
}: {
  type: "cube" | "button";
  t: number;
  start: number;
  x?: number;
  floor: number;
  width: number;
  failed?: number;
  opacity?: number;
  modern?: number;
}) {
  const cube = type === "cube",
    h = cube ? width : 84,
    depth = cube ? width : 18;
  const k = backflip(t, start),
    yaw = cube ? -0.56 : 0.025 * k.air;
  const pitch = k.pitch + (cube ? -0.33 : -0.075);
  const project = ([vx, vy, vz]: Vertex): Vertex => {
    const sx = vx * Math.cos(yaw) + vz * Math.sin(yaw),
      z = -vx * Math.sin(yaw) + vz * Math.cos(yaw);
    const sy = vy * Math.cos(pitch) - z * Math.sin(pitch),
      sz = vy * Math.sin(pitch) + z * Math.cos(pitch);
    return [
      (sx * Math.cos(k.roll) - sy * Math.sin(k.roll)) * k.scaleX,
      (sx * Math.sin(k.roll) + sy * Math.cos(k.roll)) * k.scaleY,
      sz,
    ];
  };
  const bounds = corners(width, h, cube ? 5 : 19);
  const rim = (side: number): Vertex[] =>
    bounds.map(([px, py]) => [px, py, (side * depth) / 2]);
  const front = rim(1),
    back = rim(-1);
  const restingHalf = cube
    ? h * 0.5 * Math.cos(0.33) +
      depth * 0.5 * (Math.cos(0.56) + Math.sin(0.56)) * Math.sin(0.33)
    : h * 0.5 + 1;
  const ground = floor - restingHalf * k.scaleY - k.lift;
  const buttonColor = `rgb(${Math.round(mix(mix(17, 45, modern), 182, failed))},${Math.round(mix(mix(114, 70, modern), 64, failed))},${Math.round(mix(mix(231, 147, modern), 79, failed))})`;
  const surfaces: Surface[] = [
    { points: back, color: cube ? "#7c78d5" : "#554593" },
    { points: front, color: cube ? "#597af4" : buttonColor, front: true },
  ];
  for (let i = 0; i < front.length; i++) {
    const j = (i + 1) % front.length;
    const nx = bounds[j][1] - bounds[i][1],
      ny = bounds[i][0] - bounds[j][0];
    const mag = Math.hypot(nx, ny) || 1;
    const light = Math.round(50 + (1 - ny / mag) * 12 + (nx / mag) * 3);
    surfaces.push({
      points: [front[i], front[j], back[j], back[i]],
      color: cube
        ? `hsl(237 71% ${light}%)`
        : `hsl(246 36% ${34 + (light - 50) * 0.58}%)`,
    });
  }
  const faces = surfaces
    .map((s) => ({ ...s, points: s.points.map(project) }))
    .sort(
      (a, b) =>
        a.points.reduce((sum, v) => sum + v[2], 0) / a.points.length -
        b.points.reduce((sum, v) => sum + v[2], 0) / b.points.length,
    );
  const [ox, oy] = project([0, 0, depth / 2]),
    ux = project([1, 0, depth / 2]),
    uy = project([0, 1, depth / 2]);
  const labelMatrix = `matrix(${ux[0] - ox},${ux[1] - oy},${uy[0] - ox},${uy[1] - oy},${ox},${oy})`;
  const frontFacing = project([0, 0, 1])[2] > 0;
  return (
    <svg
      {...svgSize}
      viewBox="0 0 1080 770"
      style={{
        ...abs,
        inset: 0,
        overflow: "visible",
        opacity,
        pointerEvents: "none",
      }}
    >
      <ellipse
        cx={x}
        cy={floor + 2}
        rx={(cube ? 96 : width * 0.47) * (1 - 0.36 * k.air)}
        ry={cube ? 8 : 5}
        fill="#2b2261"
        opacity={0.14 - 0.075 * k.air}
      />
      {k.contact > 0 && k.contact < 1 && (
        <ellipse
          cx={x}
          cy={floor + 1}
          rx={(cube ? 70 : width * 0.38) + 55 * k.contact}
          ry={4 + 14 * k.contact}
          fill="none"
          stroke="#8b83d1"
          strokeWidth={3 * (1 - k.contact)}
          opacity={1 - k.contact}
        />
      )}
      <g transform={`translate(${x + k.travel} ${ground})`}>
        {faces.map((s, i) => (
          <g key={i}>
            <polygon
              points={s.points.map((v) => v.slice(0, 2).join(",")).join(" ")}
              fill={s.color}
              stroke={s.color}
              strokeWidth="1"
              strokeLinejoin="round"
            />
            {s.front && frontFacing && (
              <g transform={labelMatrix}>
                {cube ? (
                  <g fill="#dceaff">
                    <path d="M-34 -31h26v7h-19v19h-7z" />
                    <path d="M34 31H8v-7h19V5h7z" opacity=".52" />
                    <rect x="-5" y="-5" width="10" height="10" rx="2" />
                  </g>
                ) : (
                  <text
                    y="2"
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fill="white"
                    fontSize="45"
                    fontWeight="730"
                  >
                    {failed > 0.55 && modern > 0.5 ? ui.failed : ui.pay}
                  </text>
                )}
              </g>
            )}
          </g>
        ))}
      </g>
    </svg>
  );
}

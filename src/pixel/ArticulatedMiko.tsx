import type { ReactNode } from "react";
import { Img, staticFile } from "remotion";

export type HandPoint = [number, number];
const ink = "#171c2c";
export function MikoHand({ at }: { at: HandPoint }) {
  return (
    <g transform={`translate(${at[0]},${at[1]})`}>
      <path
        d="M-19 -14H9V-6H21V15H10V23H-16V14H-23V-5H-19Z"
        fill="#eaa567"
        stroke={ink}
        strokeWidth={8}
      />
      <path d="M-13 -4H9M-12 6H8" stroke="#bb7855" strokeWidth={4} />
    </g>
  );
}
function Arm({
  from,
  to,
  side,
}: {
  from: HandPoint;
  to: HandPoint;
  side: number;
}) {
  const dx = to[0] - from[0],
    dy = to[1] - from[1],
    d = Math.max(1, Math.hypot(dx, dy));
  const c = Math.min(d, 124),
    a = c / 2,
    h = Math.sqrt(Math.max(0, 62 * 62 - a * a));
  const elbow: [number, number] = [
    from[0] + dx / 2 - ((side * dy) / d) * h,
    from[1] + dy / 2 + ((side * dx) / d) * h,
  ];
  return (
    <g>
      <path
        d={`M${from}L${elbow}L${to}`}
        fill="none"
        stroke={ink}
        strokeWidth={38}
        strokeLinejoin="miter"
      />
      <path
        d={`M${from}L${elbow}L${to}`}
        fill="none"
        stroke="#30374e"
        strokeWidth={24}
        strokeLinejoin="miter"
      />
      <path d={`M${to[0] - 13} ${to[1] - 18}h27v11h-27z`} fill="#d1ba85" />
      <MikoHand at={to} />
    </g>
  );
}

/** Pixel head artwork stays intact. Separate screen-space joints own prop contacts. */
export function ArticulatedMiko({
  x,
  y,
  width = 430,
  time = 0,
  left = [95, 465],
  right = [305, 465],
  lean = 0,
  headTilt = 0,
  surprised = false,
  blink = false,
  rightItem,
  leftItem,
  legs = true,
}: {
  x: number;
  y: number;
  width?: number;
  time?: number;
  left?: HandPoint;
  right?: HandPoint;
  lean?: number;
  headTilt?: number;
  surprised?: boolean;
  blink?: boolean;
  rightItem?: ReactNode;
  leftItem?: ReactNode;
  legs?: boolean;
}) {
  const asset = staticFile("pixel/miko-pilot-four-v1.png");
  const crop = surprised ? [715, 57, 390, 340] : [148, 68, 390, 340];
  const scarf = Math.sin(time * 5) * 4 + lean * 1.4;
  return (
    <>
      <Img
        src={asset}
        style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
      />
      <svg
        width={width}
        height={width * 1.6}
        viewBox="0 0 400 640"
        style={{
          position: "absolute",
          left: x,
          top: y,
          overflow: "visible",
          imageRendering: "pixelated",
          filter: "drop-shadow(4px 8px 0 #14273735)",
        }}
      >
        <g transform={`rotate(${lean} 200 510)`} shapeRendering="crispEdges">
          {legs && (
            <g fill="#292d43" stroke={ink} strokeWidth={10}>
              <path d="M135 455H197V588H123V568H134Z" />
              <path d="M202 455H265L276 568V588H205Z" />
              <path d="M121 570H197V608H103V590H121Z" fill="#45414c" />
              <path d="M207 570H278V590H293V608H207Z" fill="#45414c" />
            </g>
          )}
          <path
            d="M135 309H266L289 350V474H110V351Z"
            fill="#252c40"
            stroke={ink}
            strokeWidth={10}
          />
          <path d="M188 320H219V460H188Z" fill="#f0dfb1" />
          <path d="M143 334L168 350L160 410H119V365Z" fill="#3e465d" />
          <path d="M249 334L232 360L248 408H282V352Z" fill="#343c53" />
          <path
            d="M126 339L151 324L163 341L137 356ZM242 326L269 342L259 358L232 342Z"
            fill="#c4aa6f"
          />
          <path d="M241 369H266V378H257V385H249V378H241Z" fill="#c5ac72" />
          <path
            d="M111 458H285V474H111ZM190 455H220V477H190Z"
            fill="#666777"
            stroke={ink}
            strokeWidth={5}
          />
          <Arm from={[130, 350]} to={left} side={1} />
          <Arm from={[272, 350]} to={right} side={-1} />
          <path
            d={`M150 305L208 323L259 301L311 ${304 + scarf}L335 ${330 + scarf}L315 ${344 + scarf}L267 323L210 349L146 328Z`}
            fill="#c52e45"
            stroke={ink}
            strokeWidth={9}
          />
          <path
            d="M151 307L209 327L260 306"
            fill="none"
            stroke="#ef5b59"
            strokeWidth={7}
          />
          <g transform={`rotate(${headTilt} 200 307)`}>
            <svg
              x="8"
              y="-8"
              width="386"
              height="337"
              viewBox={crop.join(" ")}
              overflow="hidden"
            >
              <image href={asset} width={1254} height={1254} />
            </svg>
            {blink && (
              <g fill="#e9a46d">
                <path d="M121 227H168V254H121ZM214 227H261V254H214Z" />
                <path
                  d="M125 241H164M219 241H255"
                  stroke={ink}
                  strokeWidth={8}
                />
              </g>
            )}
          </g>
          {leftItem && (
            <g transform={`translate(${left})`}>
              {leftItem}
              <MikoHand at={[0, 0]} />
            </g>
          )}
          {rightItem && (
            <g transform={`translate(${right})`}>
              {rightItem}
              <MikoHand at={[0, 0]} />
            </g>
          )}
        </g>
      </svg>
    </>
  );
}

export function Tankard({ tilt = 0 }: { tilt?: number }) {
  return (
    <g
      transform={`translate(-34 55) rotate(${tilt} 34 -55)`}
      shapeRendering="crispEdges"
    >
      <path
        d="M20-96H48V-20H21"
        fill="none"
        stroke="#182735"
        strokeWidth={14}
      />
      <path d="M22-91H42V-27H23" fill="none" stroke="#9bada6" strokeWidth={6} />
      <path
        d="M-47-111H22L17 0H-41Z"
        fill="#bbc9b6"
        fillOpacity={0.68}
        stroke="#1a2d37"
        strokeWidth={8}
      />
      <path d="M-37-85H12L9-9H-33Z" fill="#ac8747" />
      <path
        d="M-43-111H-29V-119H-10V-115H8V-107H23V-88H-43Z"
        fill="#e5dfbd"
        stroke="#51635e"
        strokeWidth={4}
      />
      <path d="M-28-75V-23M3-75V-38" stroke="#e4d4a1" strokeWidth={5} />
    </g>
  );
}

import cast from "../../channel/cast.json";
import { palette as p, walk } from "../engine/motion";

export type Pose =
  | "idle"
  | "walk"
  | "wave"
  | "reach"
  | "duck"
  | "startled"
  | "think";
export type Mood = "neutral" | "happy" | "worried" | "surprised";
export type CharacterProps = {
  id?: keyof typeof cast;
  x: number;
  y?: number;
  scale?: number;
  facing?: number;
  pose?: Pose;
  mood?: Mood;
  t?: number;
  gesture?: number;
  shadow?: boolean;
  opacity?: number;
  lean?: number;
};

// Feet are the rig origin. Both cast members share this rig and its motion vocabulary.
export const Character = ({
  id = "miko",
  x,
  y = 846,
  scale = 1.4,
  facing = 1,
  pose = "idle",
  mood = "neutral",
  t = 0,
  gesture = 1,
  shadow = false,
  opacity = 1,
  lean = 0,
}: CharacterProps) => {
  const c = cast[id];
  const line = shadow ? p.shadow : p.ink;
  const fill = (color: string) => (shadow ? p.shadow : color);
  const walking = pose === "walk";
  const gait = walking ? walk(t) : 0;
  const bob = walking
    ? -Math.abs(Math.cos(t * Math.PI * 3.2)) * 5
    : Math.sin(t * 1.6) * 1.8;
  const duck = pose === "duck" ? gesture : 0;
  const leftArm =
    pose === "wave"
      ? -125 * gesture + Math.sin(t * 12) * 12 * gesture
      : pose === "reach"
        ? -35 * gesture
        : pose === "startled"
          ? -70
          : -gait * 21;
  const rightArm = pose === "think" ? 75 : pose === "startled" ? 70 : gait * 21;
  const blink = Math.sin(t * 1.1 + (id === "miko" ? 0 : 2)) > 0.997;
  const eyebrow = mood === "worried" ? -5 : mood === "surprised" ? -11 : 0;
  return (
    <g
      opacity={opacity}
      transform={`translate(${x} ${y}) ${shadow ? "skewX(-36) scale(1.12 .5)" : ""} scale(${scale * facing} ${scale})`}
    >
      <g
        transform={`translate(0 ${bob + duck * 48}) rotate(${lean})`}
        stroke={line}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <g transform={`rotate(${gait * 23} -17 -82)`}>
          <path
            d="M-18-95 L-24-29"
            stroke={fill(c.trousers)}
            strokeWidth="26"
          />
          <path d="M-24-28 L-24-7 L-50-7 Q-58-16-45-22Z" fill={fill(c.shoe)} />
        </g>
        <g transform={`rotate(${-gait * 23} 17 -82)`}>
          <path d="M17-95 L25-29" stroke={fill(c.trousers)} strokeWidth="26" />
          <path d="M25-28 L25-7 L52-7 Q60-16 45-22Z" fill={fill(c.shoe)} />
        </g>
        <g transform={`rotate(${rightArm} -36 -167)`}>
          <path
            d="M-36-164 Q-66-130-62-98"
            stroke={fill(c.coat)}
            strokeWidth="25"
          />
          <circle cx="-61" cy="-91" r="12" fill={fill(c.skin)} />
        </g>
        <path
          d="M-34-185 Q-50-139-43-92 Q0-80 44-93 Q49-141 32-186Z"
          fill={fill(c.coat)}
        />
        <path
          d="M-12-178 L-11-100"
          stroke={shadow ? p.shadow : "#2C6366"}
          strokeWidth="3"
        />
        <path
          d="M-28-119 L-17-116 M19-119 L31-122"
          stroke={shadow ? p.shadow : "#84B4A7"}
          strokeWidth="3"
        />
        <g transform={`rotate(${leftArm} 36 -167)`}>
          <path
            d="M36-164 Q65-132 60-101"
            stroke={fill(c.coat)}
            strokeWidth="25"
          />
          <circle cx="60" cy="-93" r="12" fill={fill(c.skin)} />
          {pose === "wave" && (
            <path
              d="M55-92 l-4-13 m11 10 l4-12"
              stroke={fill(c.skin)}
              strokeWidth="6"
            />
          )}
        </g>
        <g
          transform={`translate(${duck * 23} ${duck * 10}) rotate(${-duck * 19})`}
        >
          <path
            d="M-20-197 L-16-173 Q5-161 22-179 L20-201"
            fill={fill(c.skin)}
          />
          <path
            d="M-29-185 Q0-168 32-185 L29-170 Q0-153-31-171Z"
            fill={fill(c.scarf)}
          />
          <path
            d={`M24-175 Q${57 + gait * 3}-${179 + Math.sin(t * 5) * 5} 70-156 L49-148 L31-166Z`}
            fill={fill(c.scarf)}
          />
          <ellipse cy="-244" rx="55" ry="59" fill={fill(c.skin)} />
          <ellipse cx="-53" cy="-235" rx="10" ry="14" fill={fill(c.skin)} />
          <path
            d="M-53-248 Q-68-273-48-286 Q-59-308-30-307 Q-24-328-4-313 Q17-333 31-312 Q59-318 59-294 Q78-275 52-257 L42-278 Q11-269-15-280 Q-37-276-38-248Z"
            fill={fill(c.hair)}
          />
          {!shadow && (
            <>
              <path
                d={`M-18 ${-252 + eyebrow} l13 -3 M12 ${-255 + eyebrow} l12 3`}
                fill="none"
                strokeWidth="3.5"
              />
              {blink ? (
                <path d="M-16-240h9 M16-240h9" />
              ) : (
                <>
                  <ellipse
                    cx="-11"
                    cy="-240"
                    rx="3.5"
                    ry={mood === "surprised" ? 7 : 5}
                  />
                  <ellipse
                    cx="21"
                    cy="-240"
                    rx="3.5"
                    ry={mood === "surprised" ? 7 : 5}
                  />
                </>
              )}
              <path
                d="M9-235 L14-224 L7-223"
                fill="none"
                stroke="#A96F50"
                strokeWidth="3"
              />
              {mood === "surprised" ? (
                <ellipse
                  cx="7"
                  cy="-210"
                  rx="7"
                  ry="8"
                  fill={p.ink}
                  strokeWidth="2"
                />
              ) : (
                <path
                  d={
                    mood === "worried"
                      ? "M-3-208 Q8-219 20-210"
                      : mood === "happy"
                        ? "M-8-213 Q7-195 25-214"
                        : "M-3-210 Q8-205 20-211"
                  }
                  fill="none"
                  strokeWidth="3"
                />
              )}
              <ellipse
                cx="-30"
                cy="-222"
                rx="9"
                ry="5"
                fill="#D67D67"
                opacity=".5"
                stroke="none"
              />
            </>
          )}
        </g>
      </g>
    </g>
  );
};

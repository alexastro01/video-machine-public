import { AbsoluteFill } from "remotion";
import { Character, type Pose } from "./components/Character";
import { palette as p } from "./engine/motion";
import "./components/Typography";
export const CharacterSheet = () => (
  <AbsoluteFill style={{ backgroundColor: p.paper, color: p.ink, padding: 80 }}>
    <div
      style={{
        fontFamily: "DM Sans",
        fontSize: 27,
        fontWeight: 800,
        letterSpacing: 4,
      }}
    >
      SMALL WHAT IFS / CAST & MOTION
    </div>
    <div style={{ fontFamily: "Fraunces", fontSize: 83, marginTop: 15 }}>
      Meet Miko & Nova.
    </div>
    <svg viewBox="0 0 1760 770" style={{ width: "100%", height: 770 }}>
      {(["idle", "walk", "wave", "reach", "duck"] as Pose[]).map((pose, i) => (
        <g key={pose}>
          <Character
            x={180 + i * 345}
            y={370}
            scale={0.9}
            pose={pose}
            mood={i === 0 ? "neutral" : "happy"}
            t={0.7}
          />
          <Character
            id="nova"
            x={180 + i * 345}
            y={730}
            scale={0.9}
            pose={pose}
            mood="happy"
            t={1.1}
          />
          <text
            x={180 + i * 345}
            y={420}
            textAnchor="middle"
            fontFamily="DM Sans"
            fontWeight="600"
            fontSize="26"
            fill={p.ink}
          >
            {pose}
          </text>
        </g>
      ))}
    </svg>
  </AbsoluteFill>
);

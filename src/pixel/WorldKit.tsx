import { useMemo } from "react";
import { BoxGeometry, EdgesGeometry, Color } from "three";
import { useSubjectHighlight } from "./FocusContext";
export const colors = {
  ink: "#24314b",
  floor: "#78819c",
  blue: "#435673",
  teal: "#348a88",
  cream: "#dfc599",
  orange: "#ea9a51",
  coral: "#cb6b70",
  light: "#ffe2a3",
};
const box = new BoxGeometry(1, 1, 1);
const edges = new EdgesGeometry(box);
export type Vec = [number, number, number];
export function Block({
  at,
  size,
  color = colors.blue,
  glow = false,
  outline = true,
}: {
  at: Vec;
  size: Vec;
  color?: string;
  glow?: boolean;
  outline?: boolean;
}) {
  const highlight = useSubjectHighlight();
  const edgeColor = useMemo(
    () => new Color(colors.ink).lerp(new Color("#ffc96f"), highlight * 0.9),
    [highlight],
  );
  return (
    <group position={at} scale={size}>
      <mesh geometry={box} castShadow receiveShadow>
        <meshStandardMaterial
          color={color}
          roughness={0.86}
          emissive={color}
          emissiveIntensity={(glow ? 0.7 : 0) + highlight * 0.32}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      {outline && (
        <lineSegments geometry={edges}>
          <lineBasicMaterial color={edgeColor} />
        </lineSegments>
      )}
    </group>
  );
}

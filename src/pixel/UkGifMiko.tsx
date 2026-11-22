import { PixelSprite } from "./Sprite";
import { mikoGifSheets, ukGifFrame, type UkGifCue } from "./uk-miko-gifs";

export function UkGifMiko({
  cue,
  local,
  time,
}: {
  cue: UkGifCue;
  local: number;
  time: number;
}) {
  return (
    <group position={[0, cue.y, 0]}>
      <mesh
        position={[cue.x, -0.015, cue.z - 0.025]}
        scale={[cue.height * 0.24, 0.035, 1]}
      >
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial color="#0b1b27" transparent opacity={0.35} />
      </mesh>
      <PixelSprite
        x={cue.x}
        z={cue.z}
        time={time}
        sheet={mikoGifSheets[cue.asset]}
        pose={ukGifFrame(cue, local)}
        height={cue.height}
        mirror={cue.mirror}
        alignCells
        fixedPivotPose={0}
        idleBob={false}
      />
    </group>
  );
}

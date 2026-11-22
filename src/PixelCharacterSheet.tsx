import { AbsoluteFill, Img, staticFile } from "remotion";
export const PixelCharacterSheet = () => (
  <AbsoluteFill
    style={{
      backgroundColor: "#b1a0d4",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <Img
      src={staticFile("pixel/miko-rpg-atlas.png")}
      style={{
        width: 1774,
        height: 887,
        objectFit: "contain",
        imageRendering: "pixelated",
      }}
    />
  </AbsoluteFill>
);

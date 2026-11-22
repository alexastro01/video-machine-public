import type { ReactNode } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { ACESFilmicToneMapping, PCFShadowMap } from "three";
export function PixelStage({
  portrait,
  background,
  children,
  transparent = false,
  orthographic = false,
}: {
  portrait: boolean;
  background: string;
  children: ReactNode;
  transparent?: boolean;
  orthographic?: boolean;
}) {
  const { width, height } = useVideoConfig();
  const w = portrait ? 540 : 960,
    h = portrait ? 960 : 540;
  return (
    <AbsoluteFill
      style={{
        background: transparent ? "transparent" : background,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: w,
          height: h,
          transform: `scale(${width / w},${height / h})`,
          transformOrigin: "0 0",
        }}
      >
        <ThreeCanvas
          width={w}
          height={h}
          orthographic={orthographic}
          camera={
            orthographic
              ? { position: [0, 4, 14], zoom: 160, near: 0.1, far: 90 }
              : { fov: 42, near: 0.1, far: 90 }
          }
          shadows
          dpr={1}
          gl={{
            antialias: false,
            alpha: transparent,
            preserveDrawingBuffer: true,
          }}
          onCreated={({ gl }) => {
            gl.shadowMap.type = PCFShadowMap;
            gl.toneMapping = ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.1;
            if (transparent) gl.setClearColor(0x000000, 0);
          }}
          style={{ width: w, height: h, imageRendering: "pixelated" }}
        >
          {children}
        </ThreeCanvas>
      </div>
    </AbsoluteFill>
  );
}

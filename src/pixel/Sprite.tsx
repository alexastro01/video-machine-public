import { useEffect, useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import { staticFile } from "remotion";
import {
  DoubleSide,
  MeshDepthMaterial,
  NearestFilter,
  RGBADepthPacking,
  SRGBColorSpace,
  TextureLoader,
  ShaderChunk,
} from "three";
import originalAtlas from "../../public/pixel/miko-atlas.json";
import cleanAtlas from "../../public/pixel/miko-clean-atlas.json";
import rpgAtlas from "../../public/pixel/miko-rpg-atlas.json";
import tudorAtlas from "../../public/pixel/tudor-npcs.json";
import actionAtlas from "../../public/pixel/miko-tudor-actions.json";
import fourAtlas from "../../public/pixel/miko-actions-four-v1.json";
import extraAtlas from "../../public/pixel/miko-actions-four-extra-v1.json";
import pilotAtlas from "../../public/pixel/miko-pilot-four-v1.json";
import pilotReactionAtlas from "../../public/pixel/animations/miko-pilot-reaction-v2-atlas.json";
import { useSubjectHighlight } from "./FocusContext";
export type SpriteSheet = {
  file: string;
  metadata: {
    width: number;
    height: number;
    crop: { x: number; y: number; width: number; height: number };
    cells: {
      originX: number;
      originY: number;
      left: number;
      right: number;
      top: number;
      bottom: number;
    }[];
    poses?: { walk: readonly number[] };
  };
};
const spriteSheets = {
  "pilot-reaction-v2": {
    metadata: { ...pilotReactionAtlas, poses: { walk: [0, 0, 0, 0] } },
    file: "pixel/animations/miko-pilot-reaction-v2-atlas.png",
  },
  "pilot-four": {
    metadata: { ...pilotAtlas, poses: { walk: [0, 0, 0, 0] } },
    file: "pixel/miko-pilot-four-v1.png",
  },
  v1: { metadata: originalAtlas, file: "pixel/miko-atlas.png" },
  clean: { metadata: cleanAtlas, file: "pixel/miko-clean-atlas.png" },
  rpg: { metadata: rpgAtlas, file: "pixel/miko-rpg-atlas.png" },
  tudor: { metadata: tudorAtlas, file: "pixel/tudor-npcs.png" },
  "tudor-actions": {
    metadata: actionAtlas,
    file: "pixel/miko-tudor-actions.png",
  },
  "four-core": {
    metadata: { ...fourAtlas, poses: { walk: [0, 0, 0, 0] } },
    file: "pixel/miko-actions-four-v1.png",
  },
  "four-extra": {
    metadata: { ...extraAtlas, poses: { walk: [0, 0, 0, 0] } },
    file: "pixel/miko-actions-four-extra-v1.png",
  },
} as const;
export const PixelSprite = ({
  x,
  z = 1.2,
  time,
  pose = 0,
  walking = false,
  digital = false,
  yaw = 0,
  mirror = false,
  artwork = "v1",
  height = 2.65,
  scarfPop = false,
  muted = false,
  alignCells = false,
  fixedPivotPose,
  sheet,
  idleBob = true,
}: {
  x: number;
  z?: number;
  time: number;
  pose?: number;
  walking?: boolean;
  digital?: boolean;
  yaw?: number;
  mirror?: boolean;
  artwork?: keyof typeof spriteSheets;
  height?: number;
  scarfPop?: boolean;
  muted?: boolean;
  alignCells?: boolean;
  fixedPivotPose?: number;
  sheet?: SpriteSheet;
  idleBob?: boolean;
}) => {
  const highlight = useSubjectHighlight();
  const { metadata: atlas, file }: SpriteSheet = sheet ?? spriteSheets[artwork];
  const source = useLoader(TextureLoader, staticFile(file));
  const maps = useMemo(
    () =>
      atlas.cells.map((cell) => {
        const map = source.clone();
        map.colorSpace = SRGBColorSpace;
        map.magFilter = NearestFilter;
        map.minFilter = NearestFilter;
        map.generateMipmaps = false;
        map.repeat.set(
          atlas.crop.width / atlas.width,
          atlas.crop.height / atlas.height,
        );
        map.offset.set(
          (cell.originX + atlas.crop.x) / atlas.width,
          1 - (cell.originY + atlas.crop.y + atlas.crop.height) / atlas.height,
        );
        map.needsUpdate = true;
        return map;
      }),
    [source, atlas],
  );
  const walk = atlas.poses?.walk ?? [0];
  const index = walking ? walk[Math.floor(time * 7) % walk.length] : pose;
  const map = maps[index];
  const cell = atlas.cells[index];
  // Follow the foot baseline, but don't recenter the body when a scarf moves.
  const pivotCell = atlas.cells[fixedPivotPose ?? index];
  const pivotX = alignCells
    ? (((pivotCell.left + pivotCell.right) / 2 -
        atlas.crop.x -
        atlas.crop.width / 2) *
        height) /
      atlas.crop.height
    : 0;
  const footPadding = alignCells
    ? ((atlas.crop.y + atlas.crop.height - 1 - cell.bottom) * height) /
      atlas.crop.height
    : 0;
  const depth = useMemo(
    () =>
      maps.map(
        (m) =>
          new MeshDepthMaterial({
            map: m,
            alphaTest: 0.65,
            depthPacking: RGBADepthPacking,
            side: DoubleSide,
          }),
      ),
    [maps],
  );
  useEffect(
    () => () => {
      maps.forEach((m) => m.dispose());
      depth.forEach((m) => m.dispose());
    },
    [maps, depth],
  );
  const bob = walking
    ? Math.abs(Math.sin(time * Math.PI * 7)) * 0.055
    : idleBob
      ? Math.sin(time * 2.4) * 0.014
      : 0;
  return (
    <group position={[x, bob, z]} rotation={[0, yaw, 0]}>
      <mesh
        castShadow
        position={[-pivotX, height / 2 - footPadding, 0]}
        customDepthMaterial={depth[index]}
        scale={[mirror ? -1 : 1, 1, 1]}
      >
        <planeGeometry
          args={[(height * atlas.crop.width) / atlas.crop.height, height]}
        />
        <meshStandardMaterial
          map={map}
          emissiveMap={map}
          alphaTest={0.65}
          side={DoubleSide}
          roughness={1}
          color="#ffffff"
          emissive={digital ? "#418c9f" : "#d19c63"}
          emissiveIntensity={
            (digital ? 0.45 : 0) + highlight * (digital ? 0.8 : 0.25)
          }
          onBeforeCompile={(shader) => {
            if (scarfPop || muted) {
              shader.fragmentShader = shader.fragmentShader.replace(
                "#include <map_fragment>",
                ShaderChunk.map_fragment +
                  `\nvec3 actorColor=diffuseColor.rgb; float actorLuma=dot(actorColor,vec3(0.2126,0.7152,0.0722)); float scarfMask=step(actorColor.g*7.5,actorColor.r)*step(actorColor.b*2.0,actorColor.r)*step(0.07,actorColor.r); diffuseColor.rgb=mix(vec3(actorLuma),actorColor,${muted ? "0.25" : "0.53"}); ${scarfPop ? "diffuseColor.rgb=mix(diffuseColor.rgb,vec3(2.2,0.12,0.08)*actorLuma,scarfMask);" : ""}`,
              );
              if (scarfPop)
                shader.fragmentShader = shader.fragmentShader.replace(
                  "#include <emissivemap_fragment>",
                  ShaderChunk.emissivemap_fragment +
                    "\nfloat actorEdge=1.0-min(min(texture2D(map,vMapUv+vec2(0.001,0.)).a,texture2D(map,vMapUv-vec2(0.001,0.)).a),texture2D(map,vMapUv+vec2(0.,0.001)).a); totalEmissiveRadiance+=vec3(0.25,0.4,0.44)*actorEdge*0.32;",
                );
            }
            if (!digital) return;
            shader.fragmentShader = shader.fragmentShader.replace(
              "#include <map_fragment>",
              ShaderChunk.map_fragment +
                "\nfloat spriteLuma=dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722)); diffuseColor.rgb=vec3(0.22,0.68,0.95)*spriteLuma*1.45;",
            );
            shader.fragmentShader = shader.fragmentShader.replace(
              "#include <emissivemap_fragment>",
              ShaderChunk.emissivemap_fragment +
                "\nfloat spriteEmission=dot(totalEmissiveRadiance,vec3(0.2126,0.7152,0.0722)); totalEmissiveRadiance=vec3(0.13,0.6,1.0)*spriteEmission*1.35;",
            );
          }}
          customProgramCacheKey={() =>
            digital
              ? "pixel-copy-cyan-v1"
              : scarfPop
                ? "pixel-red-scarf-v1"
                : muted
                  ? "pixel-muted-v1"
                  : "pixel-actor-v1"
          }
        />
      </mesh>
    </group>
  );
};

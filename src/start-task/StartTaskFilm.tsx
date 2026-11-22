import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import type { Caption } from "@remotion/captions";
import {
  AbsoluteFill,
  Img,
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  GLTFLoader,
  type GLTF,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import poses from "../../episodes/start-the-task/assets/miko-poses.json";
import actions from "../../episodes/start-the-task/assets/miko-actions.json";
import transcript from "../../episodes/start-the-task/revisions/v2-before-editorial/transcript-source.json";
import { progressiveCaptionCues } from "../engine/progressive-captions";
import {
  e,
  clamp,
  mix,
  move,
  smooth,
  span,
  graphicsOpacity,
  pointerAt,
  sentenceAt,
  typedSentence,
  worldCamera,
} from "./motion";

const base = "episodes/start-the-task/";
const paper = "#f8f8fa",
  ink = "#18191e",
  blue = "#087afa",
  green = "#3b856c";
const abs: CSSProperties = { position: "absolute" };
loadFont({
  family: "Task Inter",
  url: staticFile(base + "fonts/InterVariable.woff2"),
  weight: "100 900",
});
export type StudyAssets = { room: GLTF; textures: Record<string, THREE.Texture> };
type Assets = StudyAssets;
export function useStudyAssets() {
  const [handle] = useState(() =>
    delayRender("Loading local Blender study and pixel animation"),
  );
  const [assets, setAssets] = useState<Assets | null>(null);
  useEffect(() => {
    const files = {
      ...Object.fromEntries(Object.entries(poses).map(([k, v]) => [k, v.file])),
      ...Object.fromEntries(
        Object.entries(actions).map(([key, value]) => [
          "clip-" + key,
          value.file,
        ]),
      ),
    };
    Promise.all([
      new GLTFLoader().loadAsync(staticFile(base + "study-room-v1.glb")),
      Promise.all(
        Object.entries(files).map(async ([key, file]) => {
          const tex = await new THREE.TextureLoader().loadAsync(
            staticFile(file),
          );
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.NearestFilter;
          tex.generateMipmaps = false;
          return [key, tex] as const;
        }),
      ),
    ])
      .then(([room, textures]) =>
        setAssets({ room, textures: Object.fromEntries(textures) }),
      )
      .catch(cancelRender);
  }, []);
  useEffect(() => {
    if (assets) continueRender(handle);
  }, [assets, handle]);
  return assets;
}
const Camera = ({ t }: { t: number }) => {
  const { camera } = useThree();
  const c = worldCamera(t);
  useLayoutEffect(() => {
    camera.position.set(...c.position);
    camera.lookAt(...c.target);
    camera.updateMatrixWorld();
  }, [camera, c.position, c.target]);
  return null;
};
const labelTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 540;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#ffffff";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = '750 158px "Task Inter"';
  c.fillText("FINISH", 768, 176);
  c.fillText("PROJECT", 768, 362);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
};
const World = ({ t, assets }: { t: number; assets: Assets }) => {
  const room = useMemo(() => {
    const root = assets.room.scene.clone(true);
    for (const name of [
      "Task_Block",
      "Coffee_1",
      "Coffee_2",
      "Coffee_3",
      "Cleaning_cloth",
      "Blank_page",
    ])
      root.getObjectByName(name)?.removeFromParent();
    root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return root;
  }, [assets]);
  const task = useMemo(() => {
    const obj = assets.room.scene.getObjectByName("Task_Block")!.clone(true);
    obj.position.set(0, 0, 0);
    return obj;
  }, [assets]);
  const cups = useMemo(
    () =>
      [1, 2, 3].map((i) => {
        const g = assets.room.scene.getObjectByName("Coffee_" + i)!.clone(true);
        g.position.set(0, 0, 0);
        g.traverse((o) => {
          if (o instanceof THREE.Mesh) o.castShadow = true;
        });
        return g;
      }),
    [assets],
  );
  const cloth = useMemo(() => {
    const c = assets.room.scene.getObjectByName("Cleaning_cloth")!.clone(true);
    c.position.set(0, 0, 0);
    return c;
  }, [assets]);
  const map = useMemo(labelTexture, []);
  const end = t >= e.returnDesk;
  const posing =
    t >= e.done ? "one" : t >= e.coffeeIn && t < e.still ? "coffee" : "inspect";
  const seated = span(t, e.returnDesk, e.done);
  const clipKey = seated
    ? "typing"
    : span(t, e.coffeeIn - 0.02, e.still)
      ? "coffee"
      : span(t, e.still, e.starter)
        ? "facepalm"
        : null;
  const maps = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(actions).map((key) => [
          key,
          assets.textures["clip-" + key].clone(),
        ]),
      ),
    [assets],
  );
  const an = actions[clipKey ?? "typing"].metadata,
    crop = an.crop;
  const actorMap = maps[clipKey ?? "typing"];
  const clipStart =
    clipKey === "typing"
      ? e.typing
      : clipKey === "coffee"
        ? e.coffeeIn - 0.02
        : e.still;
  const index = Math.min(
    an.frameCount - 1,
    Math.max(
      0,
      Math.floor(((t - clipStart + 1e-7) * 1000) / an.frameDurationMs),
    ),
  );
  useLayoutEffect(() => {
    actorMap.repeat.set(crop.width / an.width, crop.height / an.height);
    actorMap.offset.set(
      ((index % an.columns) * an.cellWidth + crop.x) / an.width,
      1 -
        (Math.floor(index / an.columns) * an.cellHeight +
          crop.y +
          crop.height) /
          an.height,
    );
    actorMap.needsUpdate = true;
  }, [actorMap, index, an, crop]);
  const tex = clipKey ? actorMap : assets.textures[posing];
  const h = seated ? 1.73 : 2.04;
  const w =
    h *
    (clipKey
      ? crop.width / crop.height
      : poses[posing as keyof typeof poses].width /
        poses[posing as keyof typeof poses].height);
  const taskScale = 0.73 + 0.22 * move(t, e.goal, 0.4);
  const small = move(t, e.starter, 0.4);
  const wipe = clamp(t / 0.75);
  const clean = move(t, e.clean, 0.5);
  return (
    <>
      <Camera t={t} />
      <color attach="background" args={["#6e8d8b"]} />
      <ambientLight intensity={0.3} />
      <hemisphereLight args={["#e5f1f6", "#b59574", 1.25]} />
      <directionalLight
        position={[-3.4, 5, 4]}
        color="#ffe0b0"
        intensity={3.1}
        castShadow
        shadow-mapSize={[1536, 1536]}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={5}
        shadow-camera-bottom={-3}
        shadow-normalBias={0.015}
      />
      <directionalLight position={[3, 3, -2]} color="#a8daeb" intensity={1.6} />
      <pointLight
        position={[1.06, 1.5, 0.2]}
        color="#ffdfb0"
        intensity={4}
        distance={3}
      />
      <primitive object={room} />
      {[0, 1, 2].map((i) => {
        const p = move(t, -0.03 + i * 0.18, 0.65);
        return (
          <mesh
            key={"paper-" + i}
            position={[
              mix(-0.85 + i * 0.75, -0.35, p),
              1.034 + i * 0.007 + Math.sin(p * Math.PI) * 0.05,
              mix(0.38 + i * 0.18, 0.55, p),
            ]}
            rotation={[0, mix(-0.3 + i * 0.24, 0, p), 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.48, 0.007, 0.6]} />
            <meshStandardMaterial color="#f6f3e9" roughness={0.9} />
          </mesh>
        );
      })}
      <group
        position={[mix(-0.85, 0.75, wipe), 1.045, 0.78]}
        rotation={[0, -0.13 + wipe * 0.25, 0]}
        visible={t < e.coffeeIn}
      >
        <primitive object={cloth} />
      </group>
      <mesh
        position={[mix(-1.2, 1.2, clean), 1.035, 0.6]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={span(t, e.clean, e.clean + 0.5)}
      >
        <planeGeometry args={[0.045, 1.13]} />
        <meshBasicMaterial
          color="#dcebef"
          transparent
          opacity={0.7 * Math.sin(clean * Math.PI)}
        />
      </mesh>
      <mesh
        position={[
          end ? -0.35 : -0.2,
          clipKey
            ? h * ((an.cells[index].bottom + 1 - crop.y) / crop.height - 0.5) +
              0.01
            : h / 2 + 0.01,
          seated ? 1.3 : 0.0,
        ]}
        rotation={[0, 0.035, 0]}
      >
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          map={tex}
          emissiveMap={tex}
          emissive="white"
          emissiveIntensity={0.45}
          roughness={1}
          transparent
          alphaTest={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      {cups.map((cup, i) => {
        const first = t >= e.coffeeIn + 0.06;
        const appear = end
          ? move(t, e.returnDesk + 0.25 + i * 0.07, 0.23)
          : first && i === 0
            ? move(t, e.coffeeIn, 0.22)
            : 0;
        const emphasize =
          Math.sin(clamp((t - e.coffeeEnd - i * 0.13) / 0.22) * Math.PI) * 0.05;
        return (
          <group
            key={i}
            position={[
              end ? 0.35 + i * 0.31 : 0.58,
              1.033 + (1 - appear) * 0.22 + emphasize,
              0.94,
            ]}
            scale={appear}
          >
            <primitive object={cup} />
            {[0, 1].map((j) => (
              <mesh
                key={j}
                position={[
                  j * 0.045 - 0.02,
                  0.3 + ((t * 0.11 + j * 0.08) % 0.25),
                  0,
                ]}
              >
                <sphereGeometry args={[0.012, 7, 5]} />
                <meshBasicMaterial
                  color="#e7e5d9"
                  transparent
                  opacity={0.2 * (1 - ((t * 0.11 + j * 0.08) % 0.25) / 0.25)}
                />
              </mesh>
            ))}
          </group>
        );
      })}
      <group
        position={[0, 2.76 - 0.14 * move(t, e.goal, 0.4), -0.25]}
        rotation={[0, -0.03, -0.035 * (1 - small)]}
        scale={taskScale}
        visible={!end}
      >
        <primitive object={task} />
        <mesh position={[0, 0, 0.125]}>
          <planeGeometry args={[2.05, 0.72]} />
          <meshBasicMaterial map={map} transparent />
        </mesh>
        <mesh position={[0, -0.41, 0.18]} scale={small}>
          <sphereGeometry args={[0.075, 24, 16]} />
          <meshStandardMaterial
            color="#bfe5ff"
            emissive="#77bfff"
            emissiveIntensity={1.2}
          />
        </mesh>
      </group>
      {Array.from({ length: 14 }, (_, i) => (
        <mesh
          key={i}
          position={[
            -1.8 + ((i * 0.39) % 3.6),
            0.2 + ((i * 0.43 + t * 0.025) % 3.1),
            -1.2 + ((i * 0.27) % 1.5),
          ]}
        >
          <sphereGeometry args={[0.004, 5, 4]} />
          <meshBasicMaterial color="#ffe9be" transparent opacity={0.3} />
        </mesh>
      ))}
    </>
  );
};
const PixelMiko = ({ t }: { t: number }) => {
  const enter = move(t, e.graphics + 0.15, 0.45);
  const point = t >= e.focus;
  const who = point ? "one" : "inspect";
  const p = poses[who];
  const height = 280;
  return (
    <Img
      src={staticFile(p.file)}
      style={{
        ...abs,
        left: 115,
        top: 1150 + (1 - enter) * 30,
        height,
        width: (height * p.width) / p.height,
        imageRendering: "pixelated",
        opacity: enter,
      }}
    />
  );
};
const Pointer = ({ t }: { t: number }) => {
  const p = pointerAt(t);
  return (
    <div
      style={{
        ...abs,
        left: p.x,
        top: p.y,
        opacity: p.opacity,
        transform: `scale(${1 - p.press * 0.14})`,
        transformOrigin: "0 0",
      }}
    >
      <svg width="70" height="90" viewBox="0 0 70 90">
        <path
          d="M5 4 L5 70 L23 53 L39 85 L54 77 L38 47 L63 43 Z"
          fill={ink}
          stroke="white"
          strokeWidth="5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
const Check = ({
  progress,
  size = 68,
}: {
  progress: number;
  size?: number;
}) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <circle cx="40" cy="40" r="36" fill="#e5f3ed" />
    <path
      d="M21 41 L34 54 L59 27"
      fill="none"
      stroke={green}
      strokeWidth="7"
      pathLength="1"
      strokeDasharray="1"
      strokeDashoffset={1 - progress}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const Graphics = ({ t }: { t: number }) => {
  if (!span(t, e.graphics, e.returnDesk + 0.58)) return null;
  const appear = smooth(t, e.graphics, 0.48);
  const opacity = graphicsOpacity(t);
  const bracket = move(t, e.locate, 0.45);
  const focus = move(t, e.focus, 0.55);
  const detail = move(t, e.concrete, 0.55);
  const change = move(t, e.change, 0.4);
  const folderOpen = move(t, e.file, 0.45);
  const sheet = move(t, e.write, 0.45);
  const example = move(t, e.try, 0.45);
  const next = move(t, e.next, 0.4);
  const nextText = "Open my draft.".slice(
    0,
    Math.floor(clamp((t - e.action) / 0.65) * 14),
  );
  const click = clamp((t - e.open) / 0.35);
  const finishOpacity = 1 - change;
  const cardY = mix(383, 470, appear) - example * 95;
  return (
    <AbsoluteFill style={{ opacity }}>
      <AbsoluteFill
        style={{
          background: paper,
          clipPath: `inset(${mix(24, 0, appear)}% ${mix(8, 0, appear)}% round ${mix(80, 0, appear)}px)`,
        }}
      />
      <div
        style={{
          ...abs,
          left: 150,
          top: cardY,
          width: 780,
          height: mix(320, 460, appear),
          opacity: 1 - folderOpen,
          borderRadius: mix(32, 42, appear),
          background: `rgba(255,255,255,${appear})`,
          border: `${2 + bracket * 2}px solid ${appear > 0.8 ? "#d4dce8" : "#2788ea"}`,
          boxShadow: `0 ${20 * appear}px ${65 * appear}px #162d4a0d`,
          transform: `translateY(${change * 165}px) scale(${1 - change * 0.15})`,
          transformOrigin: "50% 50%",
        }}
      >
        <div
          style={{
            ...abs,
            inset: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            fontSize: 102 - focus * 14,
            fontWeight: 760,
            letterSpacing: -5,
            lineHeight: 0.99,
            color: appear > 0.65 ? ink : "white",
            opacity: finishOpacity,
            transform: `translateY(${-focus * 75}px) scale(${1 - focus * 0.12})`,
          }}
        >
          FINISH
          <br />
          PROJECT
        </div>
        {t >= e.research && (
          <>
            <div
              style={{
                ...abs,
                left: 70 + focus * 28,
                top: 92 - focus * 22,
                width: 632 - focus * 56,
                height: 242 - focus * 82,
                opacity: bracket * (1 - change),
                border: `3px solid ${blue}`,
                borderRadius: 24,
                clipPath:
                  "polygon(0 0,18% 0,18% 3%,3% 3%,3% 26%,0 26%,0 0,100% 0,100% 26%,97% 26%,97% 3%,82% 3%,82% 0,100% 0,100% 100%,82% 100%,82% 97%,97% 97%,97% 74%,100% 74%,100% 100%,0 100%,0 74%,3% 74%,3% 97%,18% 97%,18% 100%,0 100%)",
              }}
            />
            <svg
              width="780"
              height="460"
              style={{ ...abs, inset: 0, opacity: focus * (1 - change) }}
            >
              <path
                d="M390 235 L390 300 Q390 325 415 325 L540 325"
                fill="none"
                stroke={blue}
                strokeWidth="4"
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={1 - detail}
                strokeLinecap="round"
              />
              <circle cx="390" cy="235" r={8 + detail * 2} fill={blue} />
            </svg>
            <div
              style={{
                ...abs,
                left: 100,
                right: 100,
                top: 304,
                fontSize: 48,
                color: blue,
                fontWeight: 650,
                opacity: detail * (1 - change),
                transform: `translateY(${(1 - detail) * 20}px)`,
              }}
            >
              Open the file
            </div>
          </>
        )}
        <div
          style={{
            ...abs,
            inset: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            opacity: change,
            color: blue,
            fontSize: 82,
            letterSpacing: -3,
            fontWeight: 730,
          }}
        >
          OPEN FILE
        </div>
      </div>
      {/* A tab grows from the same task card; the front opens only after pointer contact. */}
      <div
        style={{
          ...abs,
          left: 208,
          top: 610,
          width: 664,
          height: 420,
          opacity: change * (1 - sheet),
          perspective: 1000,
          transform: `translateY(${-folderOpen * 50}px)`,
        }}
      >
        <div
          style={{
            ...abs,
            left: 0,
            top: -34,
            width: 252,
            height: 95,
            background: "#c5dcfb",
            borderRadius: "25px 35px 0 0",
            transform: `scaleY(${change})`,
            transformOrigin: "bottom",
          }}
        />
        <div
          style={{ ...abs, inset: 0, background: "#c5dcfb", borderRadius: 28 }}
        />
        <div
          style={{
            ...abs,
            left: 45,
            top: 25 - folderOpen * 170,
            width: 574,
            height: 375,
            borderRadius: 22,
            background: "white",
            boxShadow: "0 0 25px #244f8c12",
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                ...abs,
                top: 100 + i * 62,
                left: 55,
                height: 12,
                width: 390 - i * 48,
                background: "#d6e5f5",
                borderRadius: 6,
              }}
            />
          ))}
        </div>
        <div
          style={{
            ...abs,
            inset: 0,
            background: blue,
            borderRadius: 28,
            transform: `rotateX(${-folderOpen * 57}deg)`,
            transformOrigin: "bottom",
            boxShadow: "0 18px 40px #087afa20",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "white",
            fontSize: 71,
            letterSpacing: -3,
            fontWeight: 700,
          }}
        >
          OPEN FILE
        </div>
      </div>
      <div
        style={{
          ...abs,
          left: 220 + example * 115,
          top: mix(620, 405, sheet) - example * 70,
          width: 640,
          height: 780,
          background: "white",
          borderRadius: 32,
          border: "2px solid #e5e8ed",
          boxShadow: "0 20px 80px #2437500e",
          opacity: sheet,
          transform: `scale(${0.8 + sheet * 0.2 - example * 0.39})`,
          transformOrigin: "50% 0",
        }}
      >
        <div
          style={{
            ...abs,
            left: 60,
            right: 60,
            top: 55,
            height: 4,
            background: "#e5e9ef",
            borderRadius: 2,
          }}
        />
        <div
          style={{
            ...abs,
            right: 35,
            top: 25,
            width: 38,
            height: 38,
            borderRight: "3px solid #d5e0ec",
            borderTop: "3px solid #d5e0ec",
            borderRadius: "0 14px 0 0",
          }}
        />
        <div
          style={{
            ...abs,
            left: 60,
            top: 140,
            right: 55,
            color: ink,
            fontSize: 57,
            fontWeight: 500,
            lineHeight: 1.22,
            letterSpacing: -1.8,
          }}
        >
          {sentenceAt(t)}
          <span
            style={{
              display: "inline-block",
              height: 58,
              width: 4,
              marginLeft: 5,
              background: blue,
              opacity: t < e.sentence + 0.75 ? 0.9 : 0,
              verticalAlign: "middle",
            }}
          />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              ...abs,
              left: 60,
              top: 370 + i * 68,
              width: 500 - (i % 2) * 75,
              height: 4,
              background: "#f0f2f5",
              borderRadius: 2,
              opacity: sheet,
            }}
          />
        ))}
        <div
          style={{
            ...abs,
            right: 45,
            bottom: 40,
            opacity: move(t, e.sentence + 0.6, 0.23),
          }}
        >
          <Check progress={move(t, e.sentence + 0.6, 0.23)} />
        </div>
      </div>
      <div
        style={{
          ...abs,
          left: 140,
          top: 995 - example * 70,
          width: 800,
          opacity: example,
          transform: `translateY(${(1 - example) * 40}px)`,
        }}
      >
        <div
          style={{
            fontSize: 38,
            fontWeight: 580,
            color: "#657181",
            marginBottom: 22,
            letterSpacing: -0.9,
          }}
        >
          My next action
        </div>
        <div
          style={{
            width: 800,
            height: 148,
            background: "white",
            borderRadius: 28,
            border: `${2 + next}px solid ${next ? blue : "#dae2eb"}`,
            boxShadow: `0 0 0 ${next * 10}px #087afa0b`,
            display: "flex",
            alignItems: "center",
            padding: "0 38px",
            boxSizing: "border-box",
            color: nextText ? ink : "#abb2bc",
            fontSize: 62,
            letterSpacing: -2,
            fontWeight: 600,
          }}
        >
          {nextText || "Start with…"}
          <span
            style={{
              height: 58,
              width: 4,
              background: blue,
              marginLeft: 7,
              opacity: next * (1 - move(t, e.take, 0.2)),
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 20,
              top: 86,
              opacity: move(t, e.take, 0.25),
            }}
          >
            <Check progress={move(t, e.take, 0.3)} size={56} />
          </div>
        </div>
      </div>
      <PixelMiko t={t} />
      <svg
        width="1080"
        height="1920"
        style={{
          ...abs,
          inset: 0,
          opacity: span(t, e.open, e.open + 0.4) ? 1 : 0,
        }}
      >
        <circle
          cx="610"
          cy="855"
          r={15 + click * 58}
          fill="none"
          stroke={blue}
          strokeWidth="4"
          opacity={1 - click}
        />
      </svg>
      <Pointer t={t} />
    </AbsoluteFill>
  );
};
const WorldNotes = ({ t }: { t: number }) => (
  <>
    {span(t, e.starter, e.graphics + 0.3) && (
      <div style={{ ...abs, inset: 0, opacity: 1 - move(t, e.graphics, 0.3) }}>
        <svg width="1080" height="1920" style={{ ...abs, inset: 0 }}>
          <path
            d="M540 697 V710 Q540 735 565 735 H795 Q820 735 820 760"
            fill="none"
            stroke="#a7d5ff"
            strokeWidth="5"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={1 - move(t, e.starter, 0.25)}
          />
        </svg>
        <div
          style={{
            ...abs,
            left: 650,
            top: 760,
            width: 340,
            height: 100,
            borderRadius: 28,
            background: paper,
            border: `3px solid ${blue}`,
            color: blue,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 50,
            fontWeight: 700,
            letterSpacing: -2,
            opacity: move(t, e.starter + 0.18, 0.25),
            transform: `translateY(${(1 - move(t, e.starter + 0.18, 0.25)) * -30}px) scale(${0.8 + move(t, e.starter + 0.18, 0.25) * 0.2})`,
          }}
        >
          OPEN FILE
        </div>
      </div>
    )}
    {span(t, e.still, e.goal + 0.1) && (
      <div
        style={{
          ...abs,
          left: 374,
          top: 1120,
          width: 330,
          textAlign: "center",
          background: "#f8f8faf2",
          color: ink,
          borderRadius: 25,
          padding: "18px 0",
          fontSize: 64,
          fontWeight: 730,
          letterSpacing: -3,
          opacity: move(t, e.still, 0.2),
        }}
      >
        0 words
      </div>
    )}
    {t >= e.returnDesk && (
      <div
        style={{
          ...abs,
          left: 140,
          top: 320,
          width: 800,
          height: 235,
          borderRadius: 32,
          background: "#f8f8faee",
          boxShadow: "0 16px 50px #173c4920",
          opacity: move(t, e.returnDesk + 0.3, 0.35),
          transform: `translateY(${(1 - move(t, e.returnDesk + 0.3, 0.35)) * 35}px)`,
        }}
      >
        <div
          style={{
            ...abs,
            left: 40,
            top: 40,
            width: 660,
            fontSize: 57,
            lineHeight: 1.17,
            letterSpacing: -2,
            color: ink,
            fontWeight: 600,
          }}
        >
          {t < e.typing
            ? ""
            : typedSentence.slice(
                0,
                Math.floor(clamp((t - e.typing) / 1.2) * typedSentence.length),
              )}
          <span style={{ color: blue, opacity: t < e.done ? 1 : 0 }}>|</span>
        </div>
        <div
          style={{
            ...abs,
            right: 20,
            bottom: 20,
            opacity: move(t, e.one, 0.25),
          }}
        >
          <Check progress={move(t, e.one, 0.3)} size={60} />
        </div>
      </div>
    )}
  </>
);
const Captions = ({ captions, t }: { captions: Caption[]; t: number }) => {
  const cues = useMemo(
    () => progressiveCaptionCues(captions, transcript.words),
    [captions],
  );
  const c = cues.find((x) => t * 1000 >= x.startMs && t * 1000 < x.endMs);
  if (!c) return null;
  return (
    <div
      style={{
        ...abs,
        left: 75,
        right: 75,
        top: 1450,
        textAlign: "center",
        fontSize: 66,
        fontWeight: 800,
        letterSpacing: -1.7,
        lineHeight: 1.12,
        color: "white",
        WebkitTextStroke: "9px #182b35",
        paintOrder: "stroke fill",
        transform: `translateY(${(1 - move(t, c.startMs / 1000, 0.08)) * 7}px)`,
      }}
    >
      {c.text.toUpperCase()}
    </div>
  );
};
export const StartTaskFilm = ({
  captions,
  showCaptions = true,
  audioEnabled = true,
}: {
  captions: Caption[];
  showCaptions?: boolean;
  audioEnabled?: boolean;
}) => {
  const frame = useCurrentFrame(),
    { fps } = useVideoConfig(),
    t = frame / fps;
  const assets = useStudyAssets();
  return (
    <AbsoluteFill
      style={{
        background: paper,
        fontFamily: '"Task Inter", sans-serif',
        overflow: "hidden",
      }}
    >
      {assets && graphicsOpacity(t) < 1 && (
        <ThreeCanvas
          width={1080}
          height={1920}
          camera={{ position: [0, 2.35, 7.4], fov: 36, near: 0.1, far: 45 }}
          gl={{
            antialias: true,
            alpha: false,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
          }}
          shadows
          style={{ position: "absolute", inset: 0 }}
        >
          <World t={t} assets={assets} />
        </ThreeCanvas>
      )}
      <WorldNotes t={t} />
      <Graphics t={t} />
      {showCaptions && <Captions captions={captions} t={t} />}
      {audioEnabled && (
        <>
          <Audio src={staticFile(base + "narration.wav")} />
          <Audio src={staticFile(base + "effects.wav")} />
          <Audio src={staticFile(base + "music.wav")} />
        </>
      )}
    </AbsoluteFill>
  );
};

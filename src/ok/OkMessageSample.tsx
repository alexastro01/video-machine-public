import { useLayoutEffect, useMemo } from "react";
import { useLoader, useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Caption } from "@remotion/captions";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import miko from "../../episodes/ok-message/assets/miko.json";
import {
  actorFrameAt,
  ballAt,
  cameraAt,
  CHAT,
  chatAt,
  out,
  SAMPLE,
  smooth,
  TIMING,
  MESSAGE,
} from "./state";

const base = "episodes/ok-message/";
const font =
  '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';

const Chat = ({ time }: { time: number }) => {
  const ui = chatAt(time);
  const incoming = out(time, TIMING.incoming, TIMING.incoming + 0.23);
  const entry = out(time, 0, 0.25);
  return (
    <AbsoluteFill
      style={{ background: "#f8f8fa", opacity: ui.opacity, overflow: "hidden" }}
    >
      <AbsoluteFill
        style={{
          fontFamily: font,
          color: "#151517",
          transformOrigin: `${CHAT.dotX}px ${CHAT.dotY}px`,
          transform: `translate(${ui.x}px, ${ui.y + ui.leaveY}px) scale(${ui.scale})`,
        }}
      >
        <div
          style={{
            height: 307,
            background: "#f2f2f7",
            borderBottom: "1px solid #d9d9de",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 65,
              left: 67,
              fontSize: 38,
              fontWeight: 600,
            }}
          >
            9:41
          </div>
          <svg
            width="135"
            height="35"
            viewBox="0 0 135 35"
            style={{ position: "absolute", top: 72, right: 65 }}
          >
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={i}
                x={i * 11}
                y={24 - i * 5}
                width="7"
                height={7 + i * 5}
                rx="2"
                fill="#151517"
              />
            ))}
            <path
              d="M54 12 Q67 -1 80 12 M59 18 Q67 10 75 18"
              stroke="#151517"
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="67" cy="25" r="3" fill="#151517" />
            <rect
              x="91"
              y="7"
              width="37"
              height="22"
              rx="6"
              fill="none"
              stroke="#151517"
              strokeWidth="2"
            />
            <rect x="95" y="11" width="28" height="14" rx="3" fill="#151517" />
            <rect x="130" y="14" width="3" height="8" rx="1.5" fill="#151517" />
          </svg>
          <svg
            width="28"
            height="48"
            viewBox="0 0 28 48"
            style={{ position: "absolute", left: 48, top: 175 }}
          >
            <path
              d="M24 3 L4 24 L24 45"
              stroke="#007aff"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <div
            style={{
              position: "absolute",
              left: 490,
              top: 134,
              width: 100,
              height: 100,
              borderRadius: 100,
              background: "#bec8d1",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "white",
              fontSize: 51,
              fontWeight: 500,
            }}
          >
            M
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 245,
              width: "100%",
              textAlign: "center",
              fontSize: 36,
              fontWeight: 500,
            }}
          >
            {MESSAGE.contact} <span style={{ color: "#8c8c94" }}>›</span>
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            top: 410 + (1 - entry) * 24,
            right: 58,
            padding: "27px 38px",
            borderRadius: 47,
            background: "#007aff",
            color: "white",
            fontSize: 58,
            letterSpacing: -1.5,
            transform: `scale(${0.96 + 0.04 * entry})`,
            transformOrigin: "bottom right",
          }}
        >
          {MESSAGE.outgoing}
        </div>
        <div
          style={{
            position: "absolute",
            top: 638 + (1 - incoming) * 24,
            left: 60,
            width: 224,
            height: 154,
            borderRadius: 49,
            background: "#e7e7ec",
            opacity: incoming,
            transform: `scale(${0.95 + 0.05 * incoming})`,
            transformOrigin: "bottom left",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 37,
              top: 26,
              fontSize: 91,
              lineHeight: "108px",
              letterSpacing: -4,
              opacity: out(time, 0.34, 0.48),
            }}
          >
            {MESSAGE.reply}
          </div>
          <div
            style={{
              position: "absolute",
              left: 166 - CHAT.dotRadius,
              top: 118 - CHAT.dotRadius,
              width: CHAT.dotRadius * 2,
              height: CHAT.dotRadius * 2,
              background: "#151517",
              borderRadius: "100%",
              opacity:
                (1 - smooth(time, TIMING.depth - 0.02, TIMING.depth + 0.06)) *
                out(time, 0.34, 0.48),
            }}
          />
          <svg
            width="38"
            height="35"
            style={{ position: "absolute", left: -12, bottom: -2 }}
            viewBox="0 0 38 35"
          >
            <path d="M14 0 Q21 23 0 33 Q33 33 38 4" fill="#e7e7ec" />
          </svg>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 82,
            left: 134,
            right: 61,
            height: 98,
            border: "2px solid #c6c6cc",
            borderRadius: 54,
            color: "#b0b0b7",
            padding: "20px 35px",
            fontSize: 44,
          }}
        >
          iMessage
        </div>
        <div
          style={{
            position: "absolute",
            left: 61,
            bottom: 104,
            color: "#8e8e93",
            fontSize: 64,
            lineHeight: "68px",
            fontWeight: 300,
          }}
        >
          +
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 360,
            right: 360,
            height: 10,
            borderRadius: 8,
            background: "#171719",
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Camera = ({ time }: { time: number }) => {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    const c = cameraAt(time);
    camera.position.set(...c.position);
    camera.lookAt(...c.target);
    camera.updateMatrixWorld();
  }, [camera, time]);
  return null;
};

const Room = ({ time }: { time: number }) => {
  const gltf = useLoader(GLTFLoader, staticFile(base + "room-v1.glb"));
  const scene = useMemo(() => {
    const copy = gltf.scene.clone(true);
    copy.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.material = Array.isArray(o.material)
          ? o.material.map((m) => m.clone())
          : o.material.clone();
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return copy;
  }, [gltf]);
  const reveal = smooth(time, TIMING.room, TIMING.roomEnd);
  useLayoutEffect(() => {
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          m.transparent = reveal < 1;
          m.opacity = reveal;
          m.depthWrite = reveal > 0.5;
        }
      }
    });
  }, [scene, reveal]);
  return <primitive object={scene} visible={reveal > 0} />;
};

const Miko = ({ time }: { time: number }) => {
  const source = useLoader(THREE.TextureLoader, staticFile(miko.file));
  const texture = useMemo(() => {
    const t = source.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return t;
  }, [source]);
  const depth = useMemo(
    () =>
      new THREE.MeshDepthMaterial({
        map: texture,
        alphaTest: 0.5,
        depthPacking: THREE.RGBADepthPacking,
        side: THREE.DoubleSide,
      }),
    [texture],
  );
  const an = miko.metadata,
    c = an.crop,
    i = actorFrameAt(time),
    foot = an.cells[i].bottom + 1 - c.y;
  const h = 2.48,
    w = (h * c.width) / c.height,
    pivot = an.cellWidth / 2 - c.x;
  useLayoutEffect(() => {
    texture.repeat.set(c.width / an.width, c.height / an.height);
    texture.offset.set(
      ((i % an.columns) * an.cellWidth + c.x) / an.width,
      1 -
        (Math.floor(i / an.columns) * an.cellHeight + c.y + c.height) /
          an.height,
    );
  }, [texture, i, c, an]);
  const camera = cameraAt(time);
  return (
    <mesh
      position={[
        -0.68 + w / 2 - (pivot * w) / c.width,
        h * (foot / c.height - 0.5),
        -0.39,
      ]}
      rotation={[
        0,
        Math.atan2(camera.position[0] + 0.68, camera.position[2] + 0.39),
        0,
      ]}
      castShadow
      customDepthMaterial={depth}
      visible={time > TIMING.actorIn}
    >
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial
        map={texture}
        emissiveMap={texture}
        emissive="white"
        emissiveIntensity={0.28}
        roughness={1}
        alphaTest={0.5}
        side={THREE.DoubleSide}
        transparent
        opacity={smooth(time, TIMING.actorIn, TIMING.roomEnd)}
      />
    </mesh>
  );
};

const ContactShadow = ({ time }: { time: number }) => {
  const texture = useMemo(() => {
    const size = 64,
      pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const radius = Math.hypot(
          ((x + 0.5) / size) * 2 - 1,
          ((y + 0.5) / size) * 2 - 1,
        );
        pixels[(y * size + x) * 4 + 3] = Math.round(
          255 * Math.max(0, 1 - radius) ** 1.6,
        );
      }
    const t = new THREE.DataTexture(pixels, size, size);
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return t;
  }, []);
  const b = ballAt(time),
    height = Math.max(0, b.y - 1.32),
    size = 0.86 + height * 0.25;
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[b.x, 1.004, b.z]}
      visible={time > TIMING.roomEnd}
    >
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.55 / (1 + height * 2)}
        depthWrite={false}
      />
    </mesh>
  );
};

const World = ({ time }: { time: number }) => {
  const b = ballAt(time);
  return (
    <>
      <Camera time={time} />
      <ambientLight intensity={0.25} />
      <hemisphereLight args={["#dcecf0", "#9c7754", 0.9]} />
      <directionalLight
        position={[-3, 5, 4]}
        color="#ffe1b6"
        intensity={3.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-3}
        shadow-bias={-0.00025}
        shadow-normalBias={0.018}
      />
      <directionalLight
        position={[2.5, 3, -2]}
        color="#a9d3e0"
        intensity={2.1}
      />
      <pointLight
        position={[1.34, 1.5, 0.11]}
        color="#ffd49b"
        intensity={5}
        distance={3}
      />
      <Room time={time} />
      <Miko time={time} />
      <ContactShadow time={time} />
      <mesh
        position={[b.x, b.y, b.z]}
        castShadow
        visible={time >= TIMING.depth - 0.02}
      >
        <sphereGeometry args={[b.radius, 64, 40]} />
        <meshStandardMaterial
          color="#12151b"
          roughness={0.4}
          metalness={0.15}
          transparent
          opacity={b.opacity}
        />
      </mesh>
      <group visible={time > TIMING.drop}>
        {Array.from({ length: 30 }, (_, i) => (
          <mesh
            key={i}
            position={[
              -2 + ((i * 1.37) % 4),
              0.3 + ((i * 0.47 + time * 0.028) % 3),
              -1.9 + ((i * 0.31) % 3),
            ]}
          >
            <sphereGeometry args={[0.005, 5, 4]} />
            <meshBasicMaterial color="#f2e2bf" transparent opacity={0.22} />
          </mesh>
        ))}
      </group>
    </>
  );
};

const CaptionLine = ({
  captions,
  time,
}: {
  captions: Caption[];
  time: number;
}) => {
  const active = captions.find(
    (c) => time * 1000 >= c.startMs && time * 1000 < c.endMs,
  );
  if (!active) return null;
  const pop = out(time, active.startMs / 1000, active.startMs / 1000 + 0.1);
  return (
    <div
      style={{
        position: "absolute",
        top: 1390,
        left: 75,
        right: 75,
        textAlign: "center",
        fontFamily: font,
        fontSize: 64,
        fontWeight: 850,
        letterSpacing: -1.7,
        lineHeight: 1.08,
        color: "white",
        WebkitTextStroke: "9px #142c35",
        paintOrder: "stroke fill",
        transform: `translateY(${(1 - pop) * 10}px) scale(${0.97 + 0.03 * pop})`,
        textShadow: "0 4px 3px #142c3533",
      }}
    >
      {active.text.toUpperCase()}
    </div>
  );
};

export const OkMessageSample = ({
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
    time = frame / fps;
  return (
    <AbsoluteFill style={{ background: "#789b9e" }}>
      <Chat time={time} />
      <ThreeCanvas
        width={SAMPLE.width}
        height={SAMPLE.height}
        camera={{ position: [0, 1.6, 7], fov: 38, near: 0.1, far: 70 }}
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        shadows
        style={{ position: "absolute", inset: 0 }}
      >
        <World time={time} />
      </ThreeCanvas>
      {showCaptions && <CaptionLine captions={captions} time={time} />}
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

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import {
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
} from "remotion";
import * as THREE from "three";
import {
  GLTFLoader,
  type GLTF,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import { ActingFigure, type PoseMeta } from "./ActingFigure";
import {
  DrawerHand,
  LapNotebook,
  RackMonitor,
  SampleChip,
  SetLighting,
} from "./SetDetails";
import staging from "../../episodes/nvidia-four-trillion/assets/staging-v3.json";
import actorData from "../../episodes/nvidia-four-trillion/assets/miko.json";
import jensenData from "../../episodes/nvidia-four-trillion/assets/jensen.json";
import {
  actorAt,
  cameraAt,
  clamp,
  e,
  plan,
  propState,
  shotAt,
  smooth,
  stageAt,
  type Vec3,
} from "./motion";

type Assets = { gltf: GLTF; textures: Record<string, THREE.Texture> };
const actorDefinitions: Record<string, { poses: Record<string, PoseMeta> }> = {
  miko: { poses: { ...actorData.poses, ...staging.miko.poses } },
  founders: staging.founders,
  jensen: { poses: { ...jensenData.poses, ...staging.jensen.poses } },
};
const actorEntries = Object.entries(actorDefinitions).flatMap(([actor, data]) =>
  Object.entries(data.poses).map(([pose, meta]) => ({
    key: actor + "/" + pose,
    meta,
  })),
);
const stageNames = {
  diner: "Stage_Diner",
  workshop: "Stage_Workshop",
  compute: "Stage_Compute",
  servers: "Stage_Servers",
};

export function useNvidiaAssets() {
  const [handle] = useState(() =>
    delayRender(
      "Loading local Blender sets and generated Miko and Jensen poses",
    ),
  );
  const [assets, setAssets] = useState<Assets | null>(null);
  useEffect(() => {
    Promise.all([
      new GLTFLoader().loadAsync(staticFile(plan.model)),
      Promise.all(
        actorEntries.map(async ({ key, meta }) => {
          const texture = await new THREE.TextureLoader().loadAsync(
            staticFile(meta.file),
          );
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          return [key, texture] as const;
        }),
      ),
      document.fonts.ready,
    ])
      .then(([gltf, entries]) =>
        setAssets({
          gltf,
          textures: Object.fromEntries(entries),
        }),
      )
      .catch(cancelRender);
  }, []);
  useEffect(() => {
    if (assets) continueRender(handle);
  }, [assets, handle]);
  return assets;
}

function Camera({ t }: { t: number }) {
  const { camera } = useThree();
  const c = cameraAt(t);
  useLayoutEffect(() => {
    camera.position.set(...c.position);
    camera.lookAt(...c.target);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = c.fov;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();
  }, [camera, c.position, c.target, c.fov]);
  return null;
}

function paintScreen(context: CanvasRenderingContext2D, t: number) {
  const p = propState(t);
  context.fillStyle = p.failed ? "#18252b" : "#95c3dc";
  context.fillRect(0, 0, 512, 384);
  if (p.failed) {
    context.strokeStyle = "#e88c7e";
    context.lineWidth = 12;
    context.beginPath();
    context.moveTo(221, 125);
    context.lineTo(291, 195);
    context.moveTo(291, 125);
    context.lineTo(221, 195);
    context.stroke();
    context.fillStyle = "#e1b7a4";
    context.font = "bold 28px monospace";
    context.textAlign = "center";
    context.fillText("NO SIGNAL", 256, 256);
  } else {
    context.fillStyle = "#638e61";
    context.beginPath();
    context.moveTo(0, 178);
    context.lineTo(80, 120);
    context.lineTo(170, 178);
    context.lineTo(310, 113);
    context.lineTo(512, 190);
    context.lineTo(512, 384);
    context.lineTo(0, 384);
    context.fill();
    context.fillStyle = "#45535b";
    context.beginPath();
    context.moveTo(216, 170);
    context.lineTo(286, 170);
    context.lineTo(487, 384);
    context.lineTo(24, 384);
    context.closePath();
    context.fill();
    context.strokeStyle = "#f3e5b8";
    context.lineWidth = 5;
    for (let i = 0; i < 6; i++) {
      const u = (t * 0.7 + i / 6) % 1,
        y = 171 + u * u * 213;
      context.beginPath();
      context.moveTo(253, y);
      context.lineTo(253, y + 6 + u * 25);
      context.stroke();
    }
    const x = 256 + Math.sin(t * 1.3) * 28;
    context.fillStyle = "#d05849";
    context.fillRect(x - 45, 285, 90, 50);
    context.fillStyle = "#d9e4df";
    context.fillRect(x - 27, 270, 54, 26);
    context.fillStyle = "#24313a";
    context.fillRect(x - 52, 304, 14, 34);
    context.fillRect(x + 38, 304, 14, 34);
    context.fillStyle = "#e4edcf";
    context.font = "bold 21px monospace";
    context.textAlign = "left";
    context.fillText("3D DEMO", 20, 34);
  }
  context.fillStyle = "rgba(0,0,0,.07)";
  for (let y = 0; y < 384; y += 4) context.fillRect(0, y, 512, 1);
}

function useScreen(t: number) {
  const screen = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 384;
    const context = canvas.getContext("2d")!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return { canvas, context, texture };
  }, []);
  useLayoutEffect(() => {
    paintScreen(screen.context, t);
    screen.texture.needsUpdate = true;
  }, [screen, t]);
  return screen.texture;
}

function useModel(asset: GLTF, t: number) {
  const model = useMemo(() => {
    const root = asset.scene.clone(true);
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        const list = Array.isArray(obj.material)
          ? obj.material
          : [obj.material];
        for (const mat of list)
          if (mat instanceof THREE.MeshStandardMaterial)
            mat.envMapIntensity = 0.35;
      }
    });
    const glass = root.getObjectByName("CRT_glass");
    if (glass) glass.visible = false;
    return root;
  }, [asset]);
  const objects = useMemo(() => {
    const names = [
      ...Object.values(stageNames),
      "Prop_EarlyChip",
      "Prop_RivaChip",
      "Prop_Drawer",
      "Prop_DinerCup",
      "Prop_MarketLegend",
      "Prop_Shipping",
      "Prop_MarketValue",
      "Prop_ComputeChip",
      "Prop_PhoneReceiver",
      "Prop_RivaCore",
      ...Array.from({ length: 6 }, (_, i) => `Prop_RivaMemory_${i}`),
      ...Array.from({ length: 4 }, (_, i) => `Prop_CartWheel_${i}`),
    ];
    return Object.fromEntries(
      names.map((name) => {
        const obj = model.getObjectByName(name);
        if (!obj) throw new Error(`Missing Blender node: ${name}`);
        return [name, obj];
      }),
    );
  }, [model]);
  const bases = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(objects).map(([name, obj]) => [
          name,
          obj.position.clone(),
        ]),
      ),
    [objects],
  );
  useLayoutEffect(() => {
    const stage = stageAt(t),
      p = propState(t);
    for (const [id, name] of Object.entries(stageNames))
      objects[name].visible = id === stage;
    objects.Prop_EarlyChip.visible = p.oldVisible;
    objects.Prop_EarlyChip.position.copy(bases.Prop_EarlyChip);
    objects.Prop_RivaChip.visible = p.newVisible;
    objects.Prop_RivaChip.position.copy(bases.Prop_RivaChip);
    objects.Prop_Drawer.position.z = p.drawer;
    objects.Prop_DinerCup.visible = t < e.coffee;
    objects.Prop_MarketLegend.visible = t >= e.milestone;
    objects.Prop_Shipping.visible = t >= e.shipping;
    objects.Prop_Shipping.position.x = (1 - p.shipping) * 1.05;
    for (let i = 0; i < 4; i++)
      objects[`Prop_CartWheel_${i}`].rotation.z = (p.shipping * 1.05) / 0.095;
    objects.Prop_MarketValue.visible = p.value > 0.02;
    objects.Prop_MarketValue.position.y = -(1 - p.value) * 0.08;
    objects.Prop_PhoneReceiver.position.copy(bases.Prop_PhoneReceiver);
    objects.Prop_PhoneReceiver.visible = !p.phoneInHand;
    objects.Prop_RivaCore.position.y = p.newDrop * 0.11;
    objects.Prop_RivaCore.visible = t >= e.redesign + 0.47;
    for (let i = 0; i < 6; i++) {
      objects[`Prop_RivaMemory_${i}`].position.y =
        (1 - smooth((t - e.redesign - 0.3 - i * 0.09) / 0.34)) * 0.085;
      objects[`Prop_RivaMemory_${i}`].visible =
        t >= e.redesign + 0.28 + i * 0.09;
    }
  }, [objects, bases, t]);
  return model;
}

function Actor({ assets, t }: { assets: Assets; t: number }) {
  const stage = stageAt(t),
    a = actorAt(t);
  if (shotAt(t).id === "cash") return <DrawerHand t={t} />;
  const actor = stage === "compute" ? "miko" : "jensen";
  let pose: string = a.pose;
  if (stage === "servers") {
    pose =
      t < e.platform
        ? "modern-inspect"
        : t < e.milestone
          ? "modern-neutral"
          : t < e.valueStart + 1.66
            ? "modern-present"
            : "modern-receive";
  }
  const secondaryPose = t < e.valueStart + 0.2 ? "look-left" : "relieved";
  return (
    <>
      {stage === "diner" &&
        (["left", "right"] as const).map((side) => (
          <ActingFigure
            key={side}
            t={t}
            pose={side}
            trackSuffix={side === "left" ? "Left" : "Right"}
            meta={actorDefinitions.founders.poses[side]}
            texture={assets.textures["founders/" + side]}
            position={plan.dinerGuests[side] as Vec3}
          />
        ))}
      <ActingFigure
        t={t}
        pose={pose}
        meta={actorDefinitions[actor].poses[pose]}
        texture={assets.textures[actor + "/" + pose]}
        position={a.position}
        heldProp={pose === "inspect" ? <SampleChip /> : null}
      >
        {pose === "diner-pencil" ? <LapNotebook t={t} /> : null}
      </ActingFigure>
      {stage === "servers" && t >= e.milestone && (
        <ActingFigure
          t={t}
          pose={secondaryPose}
          meta={actorDefinitions.miko.poses[secondaryPose]}
          texture={assets.textures["miko/" + secondaryPose]}
          position={[0.86, 0.012, 1.08]}
          scale={0.74}
          trackSuffix="Miko"
        />
      )}
    </>
  );
}

const networkNodes: Vec3[] = [];
for (let column = 0; column < 3; column++)
  for (let row = 0; row < 4; row++)
    networkNodes.push([0.12 + column * 0.78, 1.95 + row * 0.37, -1.595]);

function Calculations({ t }: { t: number }) {
  const routes = useMemo(
    () =>
      Array.from(
        { length: 8 },
        (_, i) =>
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.6, 1.46, -0.82 + i * 0.19),
            new THREE.Vector3(0.75, 1.46, -0.82 + i * 0.19),
            new THREE.Vector3(1.8, 1.6, -0.78 + i * 0.15),
            new THREE.Vector3(...networkNodes[i % 4]),
          ]),
      ),
    [],
  );
  const connections = useMemo(() => {
    const entries: {
      id: string;
      layer: number;
      from: THREE.Vector3;
      to: THREE.Vector3;
      position: Vec3;
      quaternion: THREE.Quaternion;
      length: number;
    }[] = [];
    for (let layer = 0; layer < 2; layer++)
      for (let a = 0; a < 4; a++)
        for (let b = 0; b < 4; b++) {
          const from = new THREE.Vector3(...networkNodes[layer * 4 + a]),
            to = new THREE.Vector3(...networkNodes[(layer + 1) * 4 + b]);
          const direction = to.clone().sub(from);
          entries.push({
            id: `${layer}-${a}-${b}`,
            layer,
            from,
            to,
            position: from
              .clone()
              .add(to)
              .multiplyScalar(0.5)
              .toArray() as Vec3,
            quaternion: new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              direction.clone().normalize(),
            ),
            length: direction.length(),
          });
        }
    return entries;
  }, []);
  const visible = t >= e.parallel;
  return (
    <group visible={stageAt(t) === "compute"}>
      {t < e.learning && (
        <group position={[1.0, 2.55, -1.6]}>
          <mesh>
            <boxGeometry args={[0.73, 0.64, 0.016]} />
            <meshBasicMaterial color="#40565c" />
          </mesh>
          {Array.from({ length: 16 }, (_, i) => (
            <mesh
              key={i}
              position={[
                -0.24 + (i % 4) * 0.16,
                -0.225 + Math.floor(i / 4) * 0.15,
                0.013,
              ]}
            >
              <boxGeometry args={[0.119, 0.105, 0.008]} />
              <meshBasicMaterial
                color={
                  i % 4 === Math.floor(smooth((t - e.cuda) / 2.4) * 3)
                    ? "#98b899"
                    : "#58746e"
                }
              />
            </mesh>
          ))}
          {[-1, 1].map((side) =>
            [0, 1, 2, 3].map((i) => (
              <mesh
                key={side + "," + i}
                position={[side * 0.407, -0.206 + i * 0.138, 0.004]}
              >
                <boxGeometry args={[0.09, 0.026, 0.008]} />
                <meshBasicMaterial color="#8f9986" />
              </mesh>
            )),
          )}
        </group>
      )}
      {routes.map((route, i) => {
        const progress = clamp((t - e.parallel - i * 0.065) / 0.6),
          phase = (t - e.parallel) * 0.42 + i * 0.13,
          point = route.getPoint(((phase % 1) + 1) % 1);
        return (
          <group key={i} visible={visible}>
            <mesh>
              <tubeGeometry args={[route, 36, 0.01, 5, false]} />
              <meshBasicMaterial
                color="#81a770"
                transparent
                opacity={0.65 * progress}
              />
            </mesh>
            <mesh position={point} scale={progress}>
              <sphereGeometry args={[0.04, 10, 7]} />
              <meshStandardMaterial
                color="#a5ef79"
                emissive="#72c458"
                emissiveIntensity={1.5}
              />
            </mesh>
          </group>
        );
      })}
      {connections.map((line, i) => {
        const progress = smooth(
          (t - e.networkStart - line.layer * 0.28 - (i % 4) * 0.025) / 0.4,
        );
        const midpoint = line.from.clone().lerp(line.to, progress * 0.5);
        const phase = Math.max(0, t - e.networkStart - line.layer * 0.28) * 1.1;
        const point = line.from.clone().lerp(line.to, phase % 1);
        return (
          <group key={line.id} visible={progress > 0}>
            <mesh
              position={midpoint}
              quaternion={line.quaternion}
              scale={[1, progress, 1]}
            >
              <cylinderGeometry args={[0.006, 0.006, line.length, 5]} />
              <meshBasicMaterial color="#6a8c7d" />
            </mesh>
            {i % 3 === 0 && progress === 1 ? (
              <mesh position={point}>
                <sphereGeometry args={[0.024, 8, 6]} />
                <meshBasicMaterial color="#e3ffb5" />
              </mesh>
            ) : null}
          </group>
        );
      })}
      {networkNodes.map((node, i) => {
        const age = t - e.networkStart - Math.floor(i / 4) * 0.18;
        return (
          <mesh
            key={node.join(",")}
            visible={t >= e.learning}
            position={node}
            scale={
              age >= 0 ? 1 + 0.12 * Math.sin(Math.min(age, 1) * Math.PI) : 1
            }
          >
            <sphereGeometry args={[0.064, 12, 8]} />
            <meshStandardMaterial
              color={age >= 0 ? "#b4e891" : "#526a72"}
              emissive={age >= 0 ? "#8ad460" : "#233440"}
              emissiveIntensity={age >= 0 ? 0.7 : 0.1}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function ServerActivity({ t }: { t: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const positions = useMemo(() => {
    const entries: { position: Vec3; delay: number }[] = [];
    for (const side of [-1, 1])
      for (let row = 0; row < 5; row++)
        for (let level = 0; level < 9; level++)
          for (const dz of [0.29, 0.38])
            entries.push({
              position: [
                side * (2.3 - 0.64),
                0.26 + level * 0.31,
                1 - row * 1.15 + dz,
              ],
              delay: row * 0.16 + level * 0.018,
            });
    return entries;
  }, []);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const matrix = new THREE.Matrix4();
    const dark = new THREE.Color("#173d31"),
      green = new THREE.Color("#b2ef7a");
    for (const [i, entry] of positions.entries()) {
      matrix.makeTranslation(...entry.position);
      mesh.current.setMatrixAt(i, matrix);
      const power = smooth((t - e.ai - entry.delay) / 0.24);
      const color = dark
        .clone()
        .lerp(green, power)
        .multiplyScalar(0.86 + 0.14 * Math.sin(t * 8 + i * 1.7));
      mesh.current.setColorAt(i, color);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor)
      mesh.current.instanceColor.needsUpdate = true;
  }, [positions, t]);
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, positions.length]}
      visible={stageAt(t) === "servers"}
      frustumCulled={false}
    >
      <boxGeometry args={[0.018, 0.045, 0.035]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

function EventEffects({ t }: { t: number }) {
  const base = t < e.diner ? e.impact : e.fail,
    age = t - base;
  return (
    <group visible={stageAt(t) === "workshop" && age >= 0 && age < 0.65}>
      {Array.from({ length: 14 }, (_, i) => {
        const phase = i * 2.399,
          velocity = 0.3 + (i % 4) * 0.15;
        return (
          <mesh
            key={i}
            position={[
              -0.27 + Math.cos(phase) * age * velocity,
              1.3 + age * 1.35 - age * age * 1.5,
              -0.04 + Math.sin(phase) * age * velocity,
            ]}
            scale={Math.max(0, 1 - age / 0.65)}
          >
            <sphereGeometry args={[0.024, 6, 4]} />
            <meshBasicMaterial color={i % 2 ? "#ffe4a1" : "#f6a15d"} />
          </mesh>
        );
      })}
    </group>
  );
}

function Room({ assets, t }: { assets: Assets; t: number }) {
  const stage = stageAt(t),
    settings = plan.stages[stage];
  const screen = useScreen(t),
    model = useModel(assets.gltf, t);
  const pointer = shotAt(t).id;
  return (
    <>
      <Camera t={t} />
      <color attach="background" args={[settings.background]} />
      <SetLighting t={t} />
      <primitive object={model} />
      <mesh visible={stage === "workshop"} position={[0.88, 1.83, -0.025]}>
        <planeGeometry args={[0.91, 0.67]} />
        <meshBasicMaterial map={screen} toneMapped={false} />
      </mesh>
      <Actor assets={assets} t={t} />
      {stage === "compute" && <Calculations t={t} />}
      {stage === "servers" && <ServerActivity t={t} />}
      {stage === "servers" && t < e.milestone && <RackMonitor t={t} />}
      <EventEffects t={t} />
      <group
        visible={
          stage === "workshop" &&
          (pointer === "agreement" || pointer === "redesign")
        }
        position={[-1.37, 1.198, 0.432]}
      >
        <mesh>
          <sphereGeometry args={[0.035, 10, 7]} />
          <meshBasicMaterial color="#aff290" />
        </mesh>
      </group>
    </>
  );
}

export const NvidiaWorld = ({ assets, t }: { assets: Assets; t: number }) => (
  <ThreeCanvas
    width={1080}
    height={1920}
    camera={{ position: [1.7, 2.65, 5.2], fov: 40, near: 0.08, far: 45 }}
    gl={{
      antialias: true,
      alpha: false,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.02,
      preserveDrawingBuffer: true,
    }}
    shadows={{ type: THREE.PCFShadowMap }}
    style={{ position: "absolute", inset: 0 }}
  >
    <Room assets={assets} t={t} />
  </ThreeCanvas>
);

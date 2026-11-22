import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  GLTFLoader,
  type GLTF,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import { PixelActor } from "../hybrid/pixel-actor";
import { e, edit, land, mix, nativeFrame, shotAt, smooth, ui } from "./motion";

type Assets = { gltf: GLTF; textures: THREE.Texture[] };
export function useSwap3Assets() {
  const [handle] = useState(() =>
    delayRender("Loading Part 3 local Blender sets and cast"),
  );
  const [assets, setAssets] = useState<Assets | null>(null);
  useEffect(() => {
    Promise.all([
      new GLTFLoader().loadAsync(staticFile(edit.model)),
      Promise.all(
        edit.assets.map((a) =>
          new THREE.TextureLoader().loadAsync(staticFile(a.url)),
        ),
      ),
      document.fonts.ready,
    ])
      .then(([gltf, textures]) => setAssets({ gltf, textures }))
      .catch(cancelRender);
  }, []);
  useEffect(() => {
    if (assets) continueRender(handle);
  }, [assets, handle]);
  return assets;
}
function pageTexture(kind: "exam" | "contract") {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#f5efdf";
  c.fillRect(0, 0, 1024, 1024);
  c.fillStyle = "#2a4350";
  c.textAlign = "center";
  c.font = '800 100px "Swap3 Inter"';
  c.fillText(kind === "exam" ? ui.examTitle : ui.contractTitle, 512, 175);
  c.font = `750 ${kind === "exam" ? 170 : 118}px "Swap3 Inter"`;
  c.fillText(kind === "exam" ? ui.examQuestion : ui.contractValue, 512, 400);
  c.strokeStyle = "#a6b2b0";
  c.lineWidth = 5;
  for (const y of [590, 710, 830]) {
    c.beginPath();
    c.moveTo(100, y);
    c.lineTo(924, y);
    c.stroke();
  }
  c.font = '600 56px "Swap3 Inter"';
  c.fillText(
    kind === "exam" ? ui.examInstruction : ui.signatureLabel,
    512,
    955,
  );
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}
const World = ({ t, assets }: { t: number; assets: Assets }) => {
  const { camera } = useThree();
  const root = useMemo(() => {
    const r = assets.gltf.scene.clone(true);
    r.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    r.getObjectByName("Prop_Templates")!.visible = false;
    return r;
  }, [assets]);
  const cast = useMemo(() => {
    const group = new THREE.Group();
    const actors = new Map(
      edit.assets.map((a, i) => [
        a.id,
        new PixelActor(a, assets.textures[i].clone(), group),
      ]),
    );
    return { group, actors };
  }, [assets]);
  const props = useMemo(() => {
    const make = (name: string) => {
      const o = root.getObjectByName(name)!.clone(true);
      o.position.set(0, 0, 0);
      return o;
    };
    const paper = make("Prop_Paper"),
      pencil = make("Prop_Pencil"),
      phone = make("Prop_Phone");
    phone.scale.setScalar(0.45);
    const maps = [pageTexture("exam"), pageTexture("contract")];
    const material = new THREE.MeshStandardMaterial({
      map: maps[0],
      roughness: 1,
      emissive: "white",
      emissiveIntensity: 0.15,
      emissiveMap: maps[0],
    });
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.865, 1.085),
      material,
    );
    face.rotation.x = -Math.PI / 2;
    face.position.y = 0.007;
    paper.add(face);
    return { paper, pencil, phone, maps, material };
  }, [root]);
  const shot = shotAt(t);
  useLayoutEffect(() => {
    const school = shot.set === "swap-classroom";
    root.getObjectByName("Stage_Classroom")!.visible = school;
    root.getObjectByName("Stage_Office")!.visible = !school;
    for (const a of cast.actors.values()) a.mesh.visible = false;
    const push = smooth(t, shot.start, Math.min(1.7, shot.duration));
    let position: [number, number, number] = [0, 2.05, 6.25 - push * 0.18];
    let target: [number, number, number] = [0.0, 1.1, -0.15];
    if (
      ["accountant", "pencil2", "helpCompany", "helpExam", "me"].includes(
        shot.id,
      )
    ) {
      position = [-0.5, 1.85, 4.9 - push * 0.12];
      target = [-0.56, 1.15, -0.35];
    }
    if (["working", "lawyer", "answers", "reaction"].includes(shot.id)) {
      position = [0.85, 2.05, 4.5 - push * 0.1];
      target = [0.65, 1.52, -0.38];
    }
    if (["answers", "reaction"].includes(shot.id)) {
      position = [0.62, 2.08, 2.65 - push * 0.025];
      target = [0.62, 1.95, -0.55];
    }
    if (shot.id === "contract") {
      position = [-0.28, 2.8, 1.65];
      target = [-0.4, 0.87, 0.32];
    }
    camera.position.set(...position);
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const show = (id: string, x: number, z: number, start = 0) => {
      const a = cast.actors.get(id)!;
      a.show(
        x,
        0.012,
        z,
        camera,
        a.asset.animation
          ? nativeFrame(t, start, a.asset.animation.frameCount)
          : 0,
      );
    };
    if (school) {
      const young =
        t >= e.answers
          ? "young-caught"
          : shot.id === "accountant"
            ? "young-ask"
            : shot.id === "helpExam"
              ? "young-call-gif"
              : "young-puzzled";
      if (!["working", "answers", "reaction"].includes(shot.id))
        show(young, -0.59, -0.37, e.helpExam);
      show(
        shot.id === "answers"
          ? "teacher-phone"
          : shot.id === "reaction"
            ? "teacher-stare"
            : "teacher-point",
        0.65,
        -0.55,
        e.answers,
      );
      if (["accountant", "helpExam", "me"].includes(shot.id)) {
        for (const [id, actor] of cast.actors)
          if (id.startsWith("teacher-")) actor.mesh.visible = false;
      }
    } else {
      show(
        shot.id === "helpCompany"
          ? "adult-call-gif"
          : shot.id === "pencil2"
            ? "adult-ask"
            : shot.id === "office-hook"
              ? "adult-ask"
              : "adult-listen",
        -0.59,
        -0.37,
        e.helpCompany,
      );
      show(
        shot.id === "lawyer" ? "assistant-lawyer" : "assistant-contract",
        0.65,
        -0.55,
      );
      if (shot.id === "lawyer")
        for (const [id, actor] of cast.actors)
          if (id.startsWith("adult-")) actor.mesh.visible = false;
      if (["pencil2", "helpCompany"].includes(shot.id))
        for (const [id, actor] of cast.actors)
          if (id.startsWith("assistant-")) actor.mesh.visible = false;
    }
    if (shot.id === "contract")
      for (const a of cast.actors.values()) a.mesh.visible = false;
    props.material.map = props.maps[school ? 0 : 1];
    props.material.emissiveMap = props.material.map;
    props.material.needsUpdate = true;
    props.paper.position.set(
      -0.45,
      0.868 + land(t, school ? e.paperHit : e.contractHit),
      0.3,
    );
    props.paper.rotation.y = school ? -0.06 : 0.03;
    const paperHit = school ? e.paperHit : e.contractHit;
    props.paper.visible = t >= paperHit - 0.28;
    props.pencil.visible = school ? t >= e.pencilHit : t >= e.deal;
    const take = smooth(t, e.removePencil, 0.28);
    props.pencil.position.set(
      school ? -0.01 : mix(0.1, 0.95, take),
      school ? 0.892 + land(t, e.pencilHit, 0.22) : 0.892,
      0.17,
    );
    props.pencil.rotation.set(
      0,
      0,
      Math.PI / 2 + (school ? 0.12 : take * 0.08),
    );
    const handoff = smooth(t, e.takePhone, e.answers - e.takePhone);
    // The confiscation uses the cut to the teacher holding the phone.
    // Avoid a detached prop crossing the student's face between those shots.
    props.phone.visible = false;
    props.phone.position.set(
      mix(-0.88, 0.42, handoff),
      mix(1.35, 1.68, handoff),
      -0.12,
    );
    props.phone.rotation.set(0, handoff * 0.2, (1 - handoff) * -0.12);
  }, [t, shot, root, cast, camera, props]);
  return (
    <>
      <color attach="background" args={["#819c9f"]} />
      <hemisphereLight args={["#d4e6ee", "#b29d79", 1.2]} />
      <directionalLight
        name="LGT_Key_Windows"
        position={[-3, 5, 4]}
        color="#ffe0ae"
        intensity={2.8}
        castShadow
        shadow-mapSize={[1536, 1536]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={6}
        shadow-camera-bottom={-3}
        shadow-normalBias={0.02}
      />
      <directionalLight
        name="LGT_Rim_CoolWindow"
        position={[3, 3, -3]}
        color="#a9cdeb"
        intensity={1.0}
      />
      <primitive object={root} /> <primitive object={cast.group} />
      <primitive object={props.paper} /> <primitive object={props.pencil} />{" "}
      <primitive object={props.phone} />
    </>
  );
};
export const Swap3World = ({ t, assets }: { t: number; assets: Assets }) => (
  <ThreeCanvas
    width={1080}
    height={1920}
    camera={{ fov: 40, near: 0.05, far: 40, position: [0, 2, 6.8] }}
    gl={{
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.05,
    }}
    shadows
  >
    <World t={t} assets={assets} />
  </ThreeCanvas>
);

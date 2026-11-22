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
import {
  cameraForShot,
  drop,
  e,
  edit,
  mix,
  nativeFrame,
  shotAt,
  smooth,
  ui,
} from "./motion";

type Assets = { gltf: GLTF; textures: THREE.Texture[] };
export function useSwap4Assets() {
  const [handle] = useState(() =>
    delayRender("Loading Part 4 local Blender room and pixel cast"),
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
function printedTexture(kind: "cover" | "page" | "receipt") {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = kind === "receipt" ? 1600 : 1024;
  const c = canvas.getContext("2d")!;
  const dark = kind === "cover";
  c.fillStyle = dark ? "#263f4c" : "#f5f0e4";
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = dark ? "#e6d6ae" : "#29434d";
  c.textAlign = "center";
  c.font = '800 76px "Swap4 Inter"';
  if (kind === "receipt") {
    c.fillText(ui.expenseTitle, 512, 280);
    c.font = '850 230px "Swap4 Inter"';
    c.fillText(ui.expenseValue, 512, 650);
    c.strokeStyle = "#a2aea7";
    c.lineWidth = 5;
    c.setLineDash([15, 12]);
    c.beginPath();
    c.moveTo(90, 840);
    c.lineTo(934, 840);
    c.stroke();
    c.setLineDash([]);
    c.save();
    c.translate(512, 1100);
    c.rotate(-0.09);
    c.strokeStyle = "#ab5c4c";
    c.strokeRect(-390, -100, 780, 200);
    c.font = '800 65px "Swap4 Inter"';
    c.fillStyle = "#ab5c4c";
    c.fillText(ui.expenseStatus, 0, 22);
    c.restore();
  } else if (kind === "cover") {
    c.fillText("PARENTS’", 512, 430);
    c.fillText("EVENING", 512, 540);
  } else {
    c.fillText("SCHOOL REPORT", 512, 180);
    c.strokeStyle = "#adb6ac";
    c.lineWidth = 6;
    for (const y of [540, 650, 760, 870]) {
      c.beginPath();
      c.moveTo(110, y);
      c.lineTo(900, y);
      c.stroke();
    }
  }
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
    return {
      group,
      actors: new Map(
        edit.assets.map((a, i) => [
          a.id,
          new PixelActor(a, assets.textures[i].clone(), group),
        ]),
      ),
    };
  }, [assets]);
  const props = useMemo(() => {
    const make = (name: string) => {
      const o = root.getObjectByName(name)!.clone(true);
      o.position.set(0, 0, 0);
      return o;
    };
    const report = make("Prop_Report"),
      receipt = make("Prop_Receipt");
    const addFace = (
      o: THREE.Object3D,
      kind: "cover" | "page" | "receipt",
      w: number,
      h: number,
      y: number,
      x = 0,
    ) => {
      const map = printedTexture(kind);
      const material = new THREE.MeshStandardMaterial({
        map,
        roughness: 0.9,
        emissive: "white",
        emissiveMap: map,
        emissiveIntensity: 0.12,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, y, 0);
      o.add(mesh);
    };
    const hinge = report.getObjectByName("Report_Hinge")!;
    addFace(hinge, "cover", 0.88, 1.1, 0.015, 0.455);
    addFace(report, "page", 0.83, 1.05, 0.046);
    addFace(receipt, "receipt", 0.47, 0.79, 0.006);
    return { report, receipt, hinge };
  }, [root]);
  const shot = shotAt(t);
  useLayoutEffect(() => {
    const school = shot.set === "swap-classroom";
    root.getObjectByName("Stage_Classroom")!.visible = school;
    root.getObjectByName("Stage_Office")!.visible = !school;
    for (const a of cast.actors.values()) a.mesh.visible = false;
    const framing = cameraForShot(shot.id, t, shot.start);
    camera.position.set(...framing.position);
    camera.lookAt(...framing.target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const show = (id: string, x = 0, z = -0.4, start = 0, flip = false) => {
      const a = cast.actors.get(id)!;
      a.show(
        x,
        0.015,
        z,
        camera,
        a.asset.animation
          ? nativeFrame(t, start, a.asset.animation.frameCount)
          : 0,
      );
      if (flip) a.mesh.scale.x *= -1;
    };
    if (shot.id === "cta") show("young-ask-gif", 0, -0.4, e.cta);
    else if (shot.id === "billionaire-hook") show("young-puzzled");
    else if (shot.id === "school-hook") {
      show("young-puzzled", -0.5);
      show("mum-listen", 0.5);
    } else if (
      [
        "lawyer",
        "talent",
        "exposure",
        "performance",
        "exactly",
        "procedure",
      ].includes(shot.id)
    ) {
      show(
        shot.id === "talent"
          ? "young-ask-gif"
          : [
                "lawyer",
                "exposure",
                "performance",
                "exactly",
                "procedure",
              ].includes(shot.id)
            ? shot.id === "lawyer"
              ? "young-ask"
              : "young-rest"
            : "young-puzzled",
        0,
        -0.4,
        e.talent,
      );
    } else if (
      ["stay", "familiar", "why", "last", "worked"].includes(shot.id)
    ) {
      show(
        shot.id === "worked"
          ? "mum-hopeful-gif"
          : shot.id === "stay"
            ? "mum-firm"
            : ["why", "last", "result"].includes(shot.id)
              ? "mum-question"
              : "mum-listen",
        0,
        -0.4,
        e.worked,
      );
    } else if (
      ["partner", "salary", "result", "manager-phone"].includes(shot.id)
    ) {
      /* Explanatory cutaways contain their own cast icons. */
    } else if (shot.id === "reaction") {
      show("teacher-surprised", -0.48);
      show("young-caught", 0.48);
    } else if (shot.id !== "expense") {
      show(
        shot.id === "internship"
          ? "teacher-explain"
          : ["partner", "fire", "trip"].includes(shot.id)
            ? "teacher-list"
            : "teacher-explain",
        0,
        -0.4,
        e.internship,
        true,
      );
    }
    props.report.visible = school && !["expense", "cta"].includes(shot.id);
    props.report.scale.setScalar(0.52);
    props.report.position.set(0.15, 0.884 + drop(t, e.reportHit, 0.18), 0.28);
    props.report.rotation.y = -0.08;
    props.hinge.rotation.z = mix(0, 2.72, smooth(t, e.reportOpen, 0.55));
    props.receipt.visible = shot.id === "expense";
    const p = smooth(t, e.expense, 0.42);
    props.receipt.position.set(0.05, mix(0.94, 1.25, p), mix(0.25, 0.65, p));
    props.receipt.rotation.set(mix(0, 1.12, p), 0, -0.025);
    props.receipt.scale.setScalar(mix(1, 1.85, p));
  }, [t, shot, assets, root, cast, camera, props]);
  return (
    <>
      <color attach="background" args={["#425c6a"]} />
      <hemisphereLight args={["#c9d9e4", "#9c805c", 0.95]} />
      <directionalLight
        name="LGT_Key_Main"
        position={[-3, 5, 4]}
        color="#ffe0b4"
        intensity={2.4}
        castShadow
        shadow-mapSize={[1536, 1536]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={6}
        shadow-camera-bottom={-3}
        shadow-normalBias={0.02}
      />
      <directionalLight
        name="LGT_Fill_Soft"
        position={[3, 3, 4]}
        color="#b5d4eb"
        intensity={0.42}
      />
      <directionalLight
        name="LGT_Rim_CoolWindow"
        position={[3, 3, -3]}
        color="#93c2e8"
        intensity={1.1}
      />
      <primitive object={root} />
      <primitive object={cast.group} />
      <primitive object={props.report} />
      <primitive object={props.receipt} />
    </>
  );
};
export const Swap4World = ({ t, assets }: { t: number; assets: Assets }) => (
  <ThreeCanvas
    width={1080}
    height={1920}
    camera={{ fov: 40, near: 0.05, far: 40, position: [0, 2, 5] }}
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

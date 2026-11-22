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
  clamp,
  e,
  edit,
  mix,
  nativeFrame,
  phoneBlockStart,
  phoneShot,
  shotAt,
  smooth,
  ui,
} from "./motion";
type Assets = { gltf: GLTF; textures: THREE.Texture[] };
export function useSwap5Assets() {
  const [handle] = useState(() =>
    delayRender("Loading Part 5 local Blender props and pixel cast"),
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
function canvasMap(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const context = canvas.getContext("2d")!;
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return { canvas, context, map };
}
function round(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
) {
  c.fillStyle = fill;
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}
function check(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  c.strokeStyle = "white";
  c.lineWidth = size * 0.09;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(x - size * 0.23, y);
  c.lineTo(x - size * 0.05, y + size * 0.17);
  c.lineTo(x + size * 0.26, y - size * 0.18);
  c.stroke();
}
function paintPhone(c: CanvasRenderingContext2D, t: number, id: string) {
  c.fillStyle = "#f5f7f5";
  c.fillRect(0, 0, 1024, 2000);
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  c.lineCap = "round";
  round(c, 390, 42, 244, 48, 24, "#263f4c");
  const face = id === "face-hook",
    balance = id === "balance-hook",
    correct = id === "nibbles",
    bad = id === "wrong" || (id === "caps" && t >= e.reject2),
    good = correct && t >= e.success + 0.22;
  if (face) {
    const unlocked = t >= e.faceUnlock;
    const colour = unlocked ? "#6d9f82" : "#578da8";
    c.strokeStyle = colour;
    c.lineWidth = 18;
    for (const [x, y, sx, sy] of [
      [300, 560, 1, 1],
      [724, 560, -1, 1],
      [300, 984, 1, -1],
      [724, 984, -1, -1],
    ]) {
      c.beginPath();
      c.moveTo(x, y + sy * 100);
      c.lineTo(x, y);
      c.lineTo(x + sx * 100, y);
      c.stroke();
    }
    if (unlocked) {
      round(c, 382, 646, 260, 260, 130, colour);
      check(c, 512, 776, 200);
    } else {
      c.beginPath();
      c.arc(450, 730, 9, 0, Math.PI * 2);
      c.arc(574, 730, 9, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.arc(512, 776, 90, 0.2, Math.PI - 0.2);
      c.stroke();
      c.lineWidth = 9;
      c.beginPath();
      c.arc(
        512,
        776,
        285,
        -Math.PI / 2,
        -Math.PI / 2 + clamp(t / e.faceUnlock) * Math.PI * 2,
      );
      c.stroke();
    }
    c.fillStyle = "#637c84";
    c.font = '650 55px "Swap5 Inter"';
    c.fillText(ui.balanceLabel, 512, 1320);
    c.fillStyle = "#263f4c";
    c.font = '800 83px "Swap5 Inter"';
    c.fillText(ui.balance, 512, 1470);
    return;
  }
  if (balance) {
    c.fillStyle = "#60757c";
    c.font = '650 59px "Swap5 Inter"';
    c.fillText(ui.balanceLabel, 512, 530);
    c.fillStyle = "#233e4b";
    c.font = '800 83px "Swap5 Inter"';
    c.fillText(ui.balance, 512, 720);
    c.strokeStyle = "#d0dbd8";
    c.lineWidth = 5;
    for (const y of [1050, 1250, 1450]) {
      c.beginPath();
      c.moveTo(110, y);
      c.lineTo(914, y);
      c.stroke();
    }
    return;
  }
  c.strokeStyle = good ? "#78a28b" : "#4c7588";
  c.lineWidth = 18;
  c.beginPath();
  c.arc(512, 426, 77, Math.PI, Math.PI * 2);
  c.stroke();
  round(c, 416, 420, 192, 160, 28, good ? "#78a28b" : "#4c7588");
  if (good) check(c, 512, 501, 130);
  c.fillStyle = "#243e4b";
  c.font = '800 110px "Swap5 Inter"';
  const questionWords = ui.question.split(" ");
  c.fillText(questionWords.slice(0, 2).join(" "), 512, 830);
  c.fillText(questionWords.slice(2).join(" "), 512, 960);
  let value = "";
  if (id === "wrong") value = ui.titan;
  if (id === "caps")
    value = ui.caps.slice(
      0,
      Math.ceil(smooth(t, e.secondType, 0.4) * ui.caps.length),
    );
  if (correct)
    value = ui.correct.slice(
      0,
      Math.ceil(smooth(t, e.name, 0.42) * ui.correct.length),
    );
  round(c, 100, 1095, 824, 190, 30, "#ffffff");
  c.strokeStyle = bad ? "#b76860" : good ? "#7ca58e" : "#c2d0cd";
  c.lineWidth = 5;
  c.beginPath();
  c.roundRect(100, 1095, 824, 190, 30);
  c.stroke();
  c.textAlign = "left";
  c.font = '650 77px "Swap5 Inter"';
  c.fillStyle = value ? "#243e4b" : "#98a7a8";
  c.fillText(value || ui.answerPlaceholder, 138, 1217);
  c.textAlign = "center";
  if (bad) {
    c.font = '650 62px "Swap5 Inter"';
    c.fillStyle = "#a15d55";
    c.fillText(ui.wrong, 512, 1390);
  }
  round(c, 100, 1515, 824, 155, 36, good ? "#7ca58e" : "#527b90");
  c.font = '750 69px "Swap5 Inter"';
  c.fillStyle = "white";
  c.fillText(ui.submit, 512, 1613);
  if (good) {
    c.fillStyle = "#78a28b";
    c.beginPath();
    c.arc(512, 1815, 48, 0, Math.PI * 2);
    c.fill();
    check(c, 512, 1815, 65);
  }
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
    const phone = root.getObjectByName("Prop_Phone")!.clone(true);
    phone.position.set(0, 0, 0);
    const screen = canvasMap(1024, 2000);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.418, 0.816),
      new THREE.MeshBasicMaterial({ map: screen.map, toneMapped: false }),
    );
    mesh.position.z = 0.042;
    phone.add(mesh);
    const balance = canvasMap(1600, 650);
    const c = balance.context;
    c.fillStyle = "#294957";
    c.fillRect(0, 0, 1600, 650);
    c.textAlign = "center";
    c.fillStyle = "#c9d5ce";
    c.font = '650 90px "Swap5 Inter"';
    c.fillText(ui.balanceLabel, 800, 180);
    c.fillStyle = "#f3eee1";
    c.font = '800 144px "Swap5 Inter"';
    c.fillText(ui.balance, 800, 425);
    balance.map.needsUpdate = true;
    const balanceFace = new THREE.Mesh(
      new THREE.PlaneGeometry(1.55, 0.63),
      new THREE.MeshBasicMaterial({ map: balance.map, toneMapped: false }),
    );
    balanceFace.position.set(0, 1.56, 0.04);
    root.getObjectByName("Stage_Vault")!.add(balanceFace);
    const label = canvasMap(900, 180);
    label.context.fillStyle = "#d8bc8d";
    label.context.fillRect(0, 0, 900, 180);
    label.context.fillStyle = "#30434a";
    label.context.textAlign = "center";
    label.context.font = '800 105px "Swap5 Inter"';
    label.context.fillText(ui.memoryLabel, 450, 126);
    label.map.needsUpdate = true;
    const labelFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.85, 0.17),
      new THREE.MeshStandardMaterial({ map: label.map, roughness: 1 }),
    );
    labelFace.position.set(-0.26, 0.22, 0.445);
    root.getObjectByName("Prop_Shoebox")!.add(labelFace);
    return {
      phone,
      screen,
      lid: root.getObjectByName("Shoebox_Lid")!,
      wheel: root.getObjectByName("Hamster_Wheel")!,
      door: root.getObjectByName("Vault_Door")!,
      handle: root.getObjectByName("Vault_Handle")!,
    };
  }, [root]);
  const shot = shotAt(t);
  useLayoutEffect(() => {
    const set = {
      "swap-office": "Stage_Office",
      "swap-kitchen": "Stage_Kitchen",
      "swap-memory": "Stage_Memory",
      "swap-vault": "Stage_Vault",
    }[shot.set];
    for (const name of [
      "Stage_Office",
      "Stage_Kitchen",
      "Stage_Memory",
      "Stage_Vault",
    ])
      root.getObjectByName(name)!.visible = name === set;
    for (const a of cast.actors.values()) a.mesh.visible = false;
    const framing = cameraForShot(shot.id, t, shot.start);
    camera.position.set(...framing.position);
    camera.lookAt(...framing.target);
    if (camera instanceof THREE.PerspectiveCamera)
      camera.near = shot.id === "wheel" ? 1.55 : 0.05;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const show = (
      id: string,
      x = 0,
      y = 0.015,
      z = -0.4,
      start = 0,
      scale = 1,
    ) => {
      const a = cast.actors.get(id)!;
      a.show(
        x,
        y,
        z,
        camera,
        a.asset.animation
          ? nativeFrame(t, start, a.asset.animation.frameCount)
          : 0,
        scale,
      );
    };
    if (["hook-caller", "question"].includes(shot.id)) show("adult-listen");
    if (shot.id === "assistant")
      show("young-call-gif", 0, 0.015, -0.4, e.assistant);
    if (shot.id === "six") show("adult-call-gif", 0, 0.015, -0.4, e.six);
    if (shot.id === "titan-entry")
      show("adult-tap-gif", 0, 0.015, -0.4, e.firstType);
    if (shot.id === "business") show("adult-listen");
    if (shot.id === "office") show("young-call");
    if (shot.id === "hostage") show("adult-call");
    if (shot.set === "swap-memory") {
      props.lid.rotation.x = mix(0, -2.0, smooth(t, e.lidOpen, 0.55));
      props.wheel.rotation.z = -Math.PI * 2 * smooth(t, e.wheel, 1.45);
      if (t >= e.lidOpen + 0.2) {
        if (t < e.wheel) show("hamster-plain", -0.3, 0.125, 0.04, 0, 0.65);
        else show("hamster-run-gif", 0.34, 0.145, 0.08, e.wheel, 1);
      }
    }
    if (shot.set === "swap-vault") {
      props.handle.rotation.z =
        -Math.PI * 0.8 * smooth(t, e.vaultOpen - 0.15, 0.3);
      props.door.rotation.y = -1.66 * smooth(t, e.vaultOpen, 0.7);
      if (t < e.guard) show("hamster-guard", 0.46, 0.07, 0.65, 0, 1.22);
      else show("hamster-guard-gif", 0.46, 0.07, 0.65, e.guard, 1.22);
    }
    props.phone.visible = phoneShot(shot.id);
    if (props.phone.visible) {
      const start = phoneBlockStart(shot.id),
        p = smooth(t, start, 0.5);
      props.phone.position.set(mix(-0.025, 0, p), 1.116, 0.58);
      props.phone.rotation.set(-0.03, mix(-0.22, -0.035, p), mix(-0.025, 0, p));
      props.phone.scale.setScalar(0.56);
      paintPhone(props.screen.context, t, shot.id);
      props.screen.map.needsUpdate = true;
    }
  }, [t, shot, root, cast, camera, props, assets]);
  return (
    <>
      <color attach="background" args={["#3b596a"]} />
      <hemisphereLight args={["#cbdee7", "#a38a68", 1.05]} />
      <directionalLight
        name="LGT_Key_Main"
        position={[-3, 5, 4]}
        color="#ffe0b4"
        intensity={2.35}
        castShadow
        shadow-mapSize={[1536, 1536]}
        shadow-radius={3}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={6}
        shadow-camera-bottom={-3}
        shadow-normalBias={0.02}
      />
      <directionalLight
        name="LGT_Fill_Soft"
        position={[3, 3, 4]}
        color="#b7d3e9"
        intensity={0.45}
      />
      <directionalLight
        name="LGT_Rim_CoolWindow"
        position={[3, 3, -3]}
        color="#9dc9e8"
        intensity={1.1}
      />
      <primitive object={root} />
      <primitive object={cast.group} />
      <primitive object={props.phone} />
    </>
  );
};
export const Swap5World = ({ t, assets }: { t: number; assets: Assets }) => (
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

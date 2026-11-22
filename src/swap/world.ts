import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { PixelActor } from "../hybrid/pixel-actor";
import type { Plan } from "../paid/types";
import { clamp01, out, mix, nativeFrame } from "./state";

type V3 = [number, number, number];
const seeded = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export async function boot(canvas: HTMLCanvasElement, plan: Plan) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(plan.width, plan.height);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#46616b");
  scene.fog = new THREE.Fog("#46616b", 18, 65);
  const camera = new THREE.PerspectiveCamera(
    40,
    plan.width / plan.height,
    0.05,
    120,
  );
  const ambient = new THREE.HemisphereLight("#c7dce4", "#9b7b56", 1.25);
  scene.add(ambient);
  const key = new THREE.DirectionalLight("#ffe0b2", 2.2);
  key.position.set(-3, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1536, 1536);
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -5;
  key.shadow.normalBias = 0.025;
  scene.add(key);
  const rim = new THREE.DirectionalLight("#91c2d5", 0.75);
  rim.position.set(4, 3, -4);
  scene.add(rim);
  const warm = new THREE.PointLight("#f3ca84", 8, 9, 2);
  warm.position.set(-1.1, 2, -1.4);
  scene.add(warm);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.22;
  const gltf = await new GLTFLoader().loadAsync(plan.model);
  const model = gltf.scene;
  scene.add(model);
  model.updateMatrixWorld(true);
  model.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  function must(name: string) {
    const o = model.getObjectByName(name);
    if (!o) throw Error("Missing Blender node " + name);
    return o;
  }
  const stages = {
    plaza: must("Stage_Plaza"),
    garage: must("Stage_Garage"),
    jet: must("Stage_Jet"),
    office: must("Stage_Office"),
    porch: must("Stage_Porch"),
    kitchen: must("Stage_Kitchen"),
  };
  const templates = must("Prop_Templates");
  function prop(name: string) {
    const o = must(name);
    const c = o.clone(true);
    c.position.set(0, 0, 0);
    c.quaternion.copy(o.getWorldQuaternion(new THREE.Quaternion()));
    c.scale.copy(o.getWorldScale(new THREE.Vector3()));
    const g = new THREE.Group();
    g.add(c);
    scene.add(g);
    return g;
  }
  const phone = prop("Prop_Phone"),
    folder = prop("Prop_Folder"),
    balanceDesk = prop("Balance_Desk");
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 1100;
  const ctx = c.getContext("2d")!;
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const phoneFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.61, 1.12),
    new THREE.MeshBasicMaterial({ map, toneMapped: false }),
  );
  phoneFace.position.set(0, 0, 0.063);
  phone.add(phoneFace);
  let priorMode = "";
  function face(mode: string) {
    if (mode === priorMode) return;
    priorMode = mode;
    ctx.fillStyle = "#153544";
    ctx.fillRect(0, 0, 640, 1100);
    ctx.textAlign = "center";
    ctx.fillStyle = "#d4dfdc";
    ctx.font = "700 43px 'DM Sans'";
    ctx.fillText(mode === "balance" ? "Available balance" : "Today", 320, 225);
    ctx.fillStyle = "#e6d7ab";
    ctx.font =
      mode === "balance" ? "900 70px 'DM Sans'" : "900 112px 'DM Sans'";
    ctx.fillText(mode === "balance" ? "$1,800,000,000" : "14", 320, 490);
    if (mode !== "balance") {
      ctx.fillStyle = "#d4dfdc";
      ctx.font = "700 57px 'DM Sans'";
      ctx.fillText("meetings", 320, 565);
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = i % 2 ? "#3c6775" : "#7f9692";
        ctx.fillRect(92, 645 + i * 42, 456, 25);
      }
    }
    map.needsUpdate = true;
  }
  const textureLoader = new THREE.TextureLoader();
  const tex = await Promise.all(
    plan.assets.map((a) => textureLoader.loadAsync(a.url)),
  );
  const actors = new Map(
    plan.assets.map((a, i) => [a.id, new PixelActor(a, tex[i], scene)]),
  );
  function actor(id: string) {
    const a = actors.get(id);
    if (!a) throw Error("Missing cast " + id);
    return a;
  }
  function cam(pos: V3, target: V3, fov = 40) {
    camera.position.set(...pos);
    camera.fov = fov;
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  }
  function show(
    id: string,
    x: number,
    y: number,
    z: number,
    t: number,
    start = 0,
    duration?: number,
    scale = 1,
  ) {
    const a = actor(id),
      an = a.asset.animation;
    const index = an
      ? nativeFrame(
          t - start,
          duration ?? (an.frameCount * an.frameDurationMs) / 1000,
          an.frameCount,
        )
      : 0;
    a.show(x, y, z, camera, index, scale);
    return a;
  }
  const e = plan.events;
  function speech(id: string) {
    const l = plan.lines.find((l) => l.id === id)!;
    return {
      start: l.words[0].start,
      duration: Math.max(
        0.1,
        l.words[l.words.length - 1].end - l.words[0].start,
      ),
    };
  }
  const dustMat = new THREE.MeshBasicMaterial({
    color: "#ead4ab",
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  const dust = Array.from({ length: 26 }, () => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.013, 0.013, 0.013),
      dustMat,
    );
    scene.add(m);
    return m;
  });
  const swapOrbs = ["#d9bd7b", "#91c6cf"].map((color) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 12, 8),
      new THREE.MeshBasicMaterial({ color }),
    );
    scene.add(m);
    return m;
  });
  const car = must("Hero_Car"),
    door = must("Door_Hinge");
  const carBase = car.position.clone();
  // The plate is held in the seated actor's lap, above a low breakfast table.
  must("Breakfast_Table").position.y = 0.55;
  must("Stage_Kitchen_Back").scale.y = 1.3;
  model.traverse((o) => {
    if (o.name.startsWith("Breakfast_TableLeg")) {
      o.scale.y *= 0.5 / 0.73;
      o.position.y = 0.25;
    }
  });

  function renderAt(raw: number) {
    const t = Math.min(
      plan.duration - 1 / plan.fps,
      Math.max(0, Math.floor(raw * plan.fps + 1e-5) / plan.fps),
    );
    const shot =
      plan.shots.find(
        (s) => t >= s.start - 1e-5 && t < s.start + s.duration - 1e-5,
      ) ?? plan.shots[plan.shots.length - 1];
    const p = clamp01((t - shot.start) / shot.duration);
    for (const s of Object.values(stages)) s.visible = false;
    templates.visible = false;
    for (const a of actors.values()) a.mesh.visible = false;
    phone.visible = folder.visible = balanceDesk.visible = false;
    for (const o of swapOrbs) o.visible = false;
    scene.background = new THREE.Color("#46616b");
    scene.fog = new THREE.Fog("#46616b", 18, 65);
    key.color.set("#ffe0b2");
    warm.intensity = 6;
    warm.position.set(-1.1, 2, -1.4);
    ambient.intensity = 1.25;
    scene.environmentIntensity = 0.22;
    car.position.copy(carBase);
    door.rotation.y = 0;
    folder.rotation.set(0, 0, 0);
    cam([0.15, 2.4, 7.7], [0, 1.35, 0.25]);
    if (shot.id === "handshake" || shot.id === "scarf") {
      stages.plaza.visible = true;
      cam([0.05, 2.35, mix(7.5, 7.2, out(p))], [0, 1.3, 0.3], 40);
      if (shot.id === "handshake") {
        const a = actor("handshake-gif"),
          an = a.asset.animation!;
        a.show(
          0,
          0,
          0.35,
          camera,
          Math.min(4, nativeFrame(t, 1.05, an.frameCount)),
        );
      } else
        show(
          "scarf-transfer-gif",
          0,
          0,
          0.35,
          t,
          e.scarfStart,
          e.scarfEnd - e.scarfStart,
        );
      const q = (t - e.swapMoment) / 0.48;
      if (q >= 0 && q < 1) {
        swapOrbs.forEach((m, i) => {
          m.visible = true;
          const k = i ? 1 - q : q;
          m.position.set(
            mix(-0.58, 0.58, k),
            2.13 + Math.sin(q * Math.PI) * 0.3,
            0.51,
          );
          m.scale.setScalar(0.65 + 0.45 * Math.sin(q * Math.PI));
        });
      }
    } else if (shot.id === "cars") {
      stages.garage.visible = true;
      cam([mix(6.3, 6.0, out(p)), 2.6, 10.3], [0.0, 0.63, 0], 42);
      car.position.x = mix(-0.12, 0, out(p));
      scene.environmentIntensity = 0.55;
    } else if (shot.id === "jet") {
      stages.jet.visible = true;
      cam([8, 16, mix(21, 20, out(p))], [0, 1.3, 0], 46);
      show("rich-wow", 2.7, 0, 8.0, t, 0, undefined, 0.95);
      scene.fog = new THREE.Fog("#8aa4ab", 30, 95);
      scene.background = new THREE.Color("#8aa4ab");
    } else if (
      ["money", "yours", "schedule", "boss", "waiting"].includes(shot.id)
    ) {
      stages.office.visible = true;
      key.color.set(
        shot.id === "money" || shot.id === "yours" ? "#ffe1b8" : "#d5e4ef",
      );
      warm.intensity = shot.id === "money" || shot.id === "yours" ? 5 : 2.5;
      if (shot.id === "money") {
        cam([0, 2.0, mix(5.0, 4.7, out(p))], [0, 1.7, 0.88], 35);
        phone.visible = true;
        phone.position.set(0, 1.69, 0.88);
        phone.scale.setScalar(1.2);
        phone.rotation.set(-0.06, -0.08, -0.02);
        face("balance");
      } else {
        cam([0.15, 2.3, 7.7], [0.1, 1.3, 0.2], 40);
        const pos: V3 = [-0.42, 0, 0.15];
        if (shot.id === "yours") show("rich-wow", ...pos, t);
        else if (shot.id === "boss") {
          const s = speech("boss");
          show("rich-talk-gif", ...pos, t, s.start, s.duration);
        } else if (shot.id === "waiting") show("rich-talk", ...pos, t);
        else show(t < e.schedule + 1.5 ? "rich-wow" : "rich-reach", ...pos, t);
        phone.visible = true;
        phone.position.set(0.76, 1.31, 0.88);
        phone.scale.setScalar(0.62);
        phone.rotation.set(-0.06, -0.06, 0.025);
        face(shot.id === "yours" ? "balance" : "calendar");
        if (shot.id !== "yours") {
          folder.visible = true;
          folder.position.set(
            0.16,
            0.95 + mix(1.1, 0, out((t - 7.0) / 0.48)),
            0.83,
          );
          folder.rotation.set(0, -0.05, mix(0.1, 0.015, out((t - 7) / 0.48)));
          const hit =
            Math.max(0, Math.sin((t - 7.48) * 25)) *
            Math.exp(-Math.max(0, t - 7.48) * 15) *
            0.025;
          if (t > 7.48) folder.position.y += hit;
          let buzz = 0;
          for (const at of [7.6, e.boss + 0.42, e.waiting + 0.3]) {
            const a = t - at;
            if (a >= 0 && a < 0.35)
              buzz += Math.sin(a * 85) * Math.exp(-a * 8) * 0.012;
          }
          phone.position.x += buzz;
        }
        if (shot.id === "boss") cam([0.05, 2.2, 6.7], [-0.1, 1.55, 0.15], 38);
      }
    } else if (["home", "help", "its-me", "point"].includes(shot.id)) {
      stages.porch.visible = true;
      cam([0.35, 2.35, 8.2], [0.35, 1.35, 0.15], 40);
      if (shot.id === "help") cam([1.12, 2.0, 5.8], [1.12, 1.55, -0.25], 34);
      else if (shot.id === "its-me")
        cam([-0.5, 2.0, 5.8], [-0.48, 1.6, 0.75], 36);
      warm.position.set(1.3, 2, -0.5);
      warm.intensity = 10;
      door.rotation.y = -1.38 * out((t - e.doorOpen) / 0.65);
      if (shot.id === "home") show("rich-reach", -0.48, 0, 0.75, t);
      else if (shot.id === "its-me") {
        const s = speech("its-me");
        show("rich-talk-gif", -0.48, 0, 0.75, t, s.start, s.duration);
      } else show("rich-reach", -0.48, 0, 0.75, t);
      const question = speech("help");
      if (shot.id === "point") {
        const s = speech("inside");
        show("mum-point-gif", 1.18, 0, -0.32, t, s.start, s.duration);
      } else
        show(
          "mum-question-gif",
          1.18,
          0,
          -0.32,
          t,
          question.start,
          question.duration + 0.3,
        );
      if (shot.id === "home")
        actor("mum-question-gif").mesh.visible = t >= e.doorOpen;
      if (shot.id === "help") actor("rich-reach").mesh.visible = false;
      if (shot.id === "its-me") actor("mum-question-gif").mesh.visible = false;
    } else {
      stages.kitchen.visible = true;
      warm.position.set(0.4, 2, -1.4);
      warm.intensity = 9;
      key.color.set("#ffe1af");
      cam([-0.2, 1.8, 7.8], [-0.2, 1.3, 0.05], 40);
      const reach = speech("hand");
      if (shot.id === "inside") show("rich-reach", -0.78, 0, 0.75, t);
      else
        show(
          "rich-reach-gif",
          -0.78,
          0,
          0.75,
          t,
          reach.start,
          reach.duration + 0.25,
        );
      const a = actor("miko-pancakes-gif"),
        an = a.asset.animation!;
      const sp = speech("pancakes");
      let frame = 0;
      if (t >= sp.start) {
        const mid = 9;
        frame =
          t < e.bite
            ? Math.min(
                mid,
                nativeFrame(t - sp.start, e.bite - sp.start, mid + 1),
              )
            : mid +
              Math.min(
                an.frameCount - mid - 1,
                nativeFrame(t - e.bite, 0.75, an.frameCount - mid),
              );
      }
      a.show(0.74, 0, -0.53, camera, frame);
      if (shot.id === "pancakes") {
        cam([0.72, 1.4, 5.0], [0.74, 1.05, -0.53], 36);
        actor("rich-reach-gif").mesh.visible = false;
        a.show(0.74, 0, -0.53, camera, frame);
      }
    }
    dust.forEach((m, i) => {
      m.position.set(
        (seeded(i + 401) - 0.5) * 5,
        0.3 + ((seeded(i + 45) + t * 0.012) % 1) * 3.3,
        -1.8 + seeded(i + 97) * 3,
      );
      m.visible = shot.id !== "jet";
    });
    renderer.render(scene, camera);
  }
  window.addEventListener("hf-seek", (ev) =>
    renderAt((ev as CustomEvent<{ time: number }>).detail.time),
  );
  renderAt(0);
  await renderer.compileAsync(scene, camera);
  renderAt(0);
  return { renderAt, renderer };
}

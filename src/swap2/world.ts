import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { PixelActor } from "../hybrid/pixel-actor";
import type { Plan } from "../paid/types";
import { clamp01, out, mix, nativeFrame } from "../swap/state";

type V3 = [number, number, number];
const seeded = (i: number) => {
  const n = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
};
export function landing(t: number, hit: number, duration = 0.24, lift = 0.65) {
  const p = clamp01((t - hit + duration) / duration);
  const age = t - hit;
  return (
    lift * (1 - p) ** 2 +
    (age >= 0 && age < 0.22
      ? Math.sin((age / 0.22) * Math.PI) * Math.exp(-age * 13) * 0.025
      : 0)
  );
}
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
  const fill = new THREE.HemisphereLight("#c7dce4", "#9b7b56", 1.25);
  scene.add(fill);
  const key = new THREE.DirectionalLight("#ffe0b2", 2.2);
  key.name = "LGT_Key_KitchenWindow";
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
  rim.name = "LGT_Rim_CoolWindow";
  rim.position.set(4, 3, -4);
  scene.add(rim);
  const practical = new THREE.PointLight("#f3ca84", 9, 9, 2);
  practical.name = "LGT_Fill_WarmKitchen";
  practical.position.set(0.4, 2, -1.4);
  scene.add(practical);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.22;
  const model = (await new GLTFLoader().loadAsync(plan.model)).scene;
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
  const stages = ["Plaza", "Garage", "Jet", "Office", "Porch", "Kitchen"].map(
    (n) => must("Stage_" + n),
  );
  const kitchen = must("Stage_Kitchen"),
    porch = must("Stage_Porch");
  must("Prop_Templates").visible = false;
  const templates = must("Sequel_Prop_Templates");
  templates.visible = false;
  must("Breakfast_Table").position.y = 0.55;
  must("Stage_Kitchen_Back").scale.y = 1.3;
  model.traverse((o) => {
    if (o.name.startsWith("Breakfast_TableLeg")) {
      o.scale.y *= 0.5 / 0.73;
      o.position.y = 0.25;
    }
  });
  function cloneProp(name: string) {
    const source = must(name),
      copy = source.clone(true);
    copy.position.set(0, 0, 0);
    copy.quaternion.copy(source.getWorldQuaternion(new THREE.Quaternion()));
    copy.scale.copy(source.getWorldScale(new THREE.Vector3()));
    const wrapper = new THREE.Group();
    wrapper.add(copy);
    scene.add(wrapper);
    return wrapper;
  }
  const book = cloneProp("Prop_Homework"),
    plates = cloneProp("Prop_Dishes"),
    bin = cloneProp("Prop_Bin"),
    money = cloneProp("Prop_PocketMoney");
  const coins = Array.from({ length: 4 }, (_, i) => {
    const coin = money.getObjectByName(`Pocket_Coin_${i + 1}`);
    if (!coin) throw Error(`Missing pound coin ${i + 1}`);
    return { object: coin, restY: coin.position.y };
  });
  const coinCanvas = document.createElement("canvas");
  coinCanvas.width = coinCanvas.height = 256;
  const coinContext = coinCanvas.getContext("2d")!;
  coinContext.font = "900 185px 'DM Sans'";
  coinContext.textAlign = "center";
  coinContext.textBaseline = "middle";
  coinContext.fillStyle = "#443b29";
  coinContext.fillText("£", 128, 137);
  const coinMap = new THREE.CanvasTexture(coinCanvas);
  coinMap.colorSpace = THREE.SRGBColorSpace;
  const coinInk = new THREE.MeshStandardMaterial({
    map: coinMap,
    transparent: true,
    alphaTest: 0.1,
    roughness: 0.8,
    depthWrite: false,
  });
  for (const coin of coins) {
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), coinInk);
    mark.rotation.x = -Math.PI / 2;
    mark.position.y = 0.031;
    coin.object.add(mark);
  }
  const lid = bin.getObjectByName("Chore_BinLid");
  if (!lid) throw Error("Missing bin lid");
  const lidRest = lid.rotation.clone();
  function schoolPaper(showDeadline: boolean) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f1ead5";
    ctx.fillRect(0, 0, 1024, 768);
    ctx.textAlign = "left";
    ctx.fillStyle = "#233d4a";
    ctx.font = "900 112px 'DM Sans'";
    ctx.fillText("MATHS", 72, 156);
    if (showDeadline) {
      ctx.fillStyle = "#a44c42";
      ctx.font = "900 95px 'DM Sans'";
      ctx.fillText("TOMORROW", 72, 282);
    }
    ctx.fillStyle = "#52636a";
    ctx.font = "700 77px 'DM Sans'";
    ctx.fillText("x + 7 = 12", 72, 445);
    ctx.fillText("8 × 6 = ?", 72, 570);
    ctx.fillStyle = "#c7c0ac";
    for (const y of [485, 610]) ctx.fillRect(72, y, 870, 4);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  const paperMap = schoolPaper(false),
    deadlineMap = schoolPaper(true);
  const paperMaterial = new THREE.MeshStandardMaterial({
    map: paperMap,
    roughness: 1,
    emissive: 0xffffff,
    emissiveMap: paperMap,
    emissiveIntensity: 0.2,
    side: THREE.DoubleSide,
  });
  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(0.96, 0.69),
    paperMaterial,
  );
  paper.rotation.x = -Math.PI / 2;
  paper.position.set(0.018, 0.0965, 0);
  book.add(paper);
  const loader = new THREE.TextureLoader();
  const textures = await Promise.all(
    plan.assets.map((a) => loader.loadAsync(a.url)),
  );
  const actors = new Map(
    plan.assets.map((a, i) => [a.id, new PixelActor(a, textures[i], scene)]),
  );
  function actor(id: string) {
    const a = actors.get(id);
    if (!a) throw Error("Missing sequel cast " + id);
    return a;
  }
  function cam(pos: V3, target: V3, fov = 40) {
    camera.position.set(...pos);
    camera.fov = fov;
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  }
  function show(id: string, pos: V3, t: number, start = 0, scale = 1) {
    const a = actor(id),
      an = a.asset.animation;
    const frame = an
      ? nativeFrame(
          t - start,
          (an.frameCount * an.frameDurationMs) / 1000,
          an.frameCount,
        )
      : 0;
    a.show(...pos, camera, frame, scale);
    return a;
  }
  const dustMaterial = new THREE.MeshBasicMaterial({
    color: "#ead4ab",
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  });
  const dust = Array.from({ length: 24 }, () => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.013, 0.013, 0.013),
      dustMaterial,
    );
    scene.add(m);
    return m;
  });
  const e = plan.events;
  const bookRest: V3 = [0.43, 0.593, 0.08];
  const platesRest: V3 = [-1.77, 0.8885, -2.1];
  function propsRest() {
    book.position.set(...bookRest);
    book.rotation.set(0, -0.11, 0);
    book.scale.setScalar(1);
    plates.position.set(...platesRest);
    plates.rotation.set(0, 0.1, 0);
    plates.scale.setScalar(1);
    bin.position.set(0.24, 0, 0.72);
    bin.rotation.set(0, -0.12, 0);
    bin.scale.setScalar(1);
    money.position.set(0.43, 0.591, 0.08);
    money.rotation.set(0, -0.11, 0);
    money.scale.setScalar(1);
    for (const coin of coins) {
      coin.object.visible = true;
      coin.object.position.y = coin.restY;
    }
    lid!.rotation.copy(lidRest);
  }
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
    for (const s of stages) s.visible = false;
    for (const a of actors.values()) a.mesh.visible = false;
    book.visible = plates.visible = bin.visible = money.visible = false;
    propsRest();
    paperMaterial.map = paperMaterial.emissiveMap =
      t >= e.maths - 1e-5 ? deadlineMap : paperMap;
    scene.background = new THREE.Color("#46616b");
    scene.fog = new THREE.Fog("#46616b", 18, 65);
    key.color.set("#ffe1af");
    practical.intensity = 9;
    kitchen.visible = true;
    cam([-0.2, 2.15, 7.8], [-0.1, 1.3, 0.05]);
    if (shot.id === "hook") {
      cam([-0.2, 2.15, mix(8.3, 8.05, out(p))], [-0.1, 1.3, 0.05]);
      show("rich-reach-gif", [-0.82 + 0.04 * out(t / 0.4), 0, 0.75], t, -0.25);
      show("miko-pancakes-gif", [0.74, 0, -0.53], t, -0.3);
    } else if (shot.id === "refusal") {
      cam([0.74, 1.45, mix(5.35, 5.1, out(p))], [0.74, 1.05, -0.53], 36);
      show("miko-pancakes-gif", [0.74, 0, -0.53], t, shot.start);
    } else if (shot.id === "mum") {
      cam([-0.42, 2.05, mix(6.6, 6.35, out(p))], [-0.42, 1.48, -0.08], 38);
      show("mum-point-gif", [-0.47, 0, -0.23], t, e.finished + 0.2);
    } else if (shot.id === "homework") {
      cam([0.25, 2.85, 2.9], [0.43, 0.67, 0.08], 40);
      book.visible = true;
      book.position.y += landing(t, e.homeworkHit, 0.24, 0.65);
      book.rotation.y += 0.08 * (1 - out((t - e.homework) / 0.38));
    } else if (shot.id === "dishes") {
      cam([-1.45, 1.9, 1.65], [-1.77, 1.01, -2.1], 37);
      plates.visible = true;
      plates.position.y += landing(t, e.dishesHit, 0.24, 0.48);
    } else if (shot.id === "bins") {
      kitchen.visible = false;
      porch.visible = true;
      practical.position.set(1.3, 2, -0.5);
      cam([0.25, 1.55, 4.9], [0.24, 0.95, 0.65], 36);
      bin.visible = true;
      bin.position.x = mix(1.5, 0.24, out((t - e.bins) / (e.binsHit - e.bins)));
      const age = t - e.binsHit;
      lid!.rotation.x +=
        age >= 0 && age < 0.4
          ? -Math.sin((age / 0.4) * Math.PI) * Math.exp(-age * 5) * 0.32
          : 0;
    } else if (shot.id === "pay") {
      cam([0.55, 2.0, mix(6.2, 6.0, out(p))], [0.55, 1.38, -0.25], 38);
      show("young-object", [0.55, 0, -0.3], t);
      book.visible = plates.visible = true;
    } else if (shot.id === "house") {
      cam([-0.35, 1.95, 6.1], [-0.35, 1.43, -0.1], 37);
      show("mum-point-gif", [-0.4, 0, -0.16], t, e.house);
      book.visible = plates.visible = true;
    } else if (shot.id === "staff") {
      cam([0.45, 1.9, mix(6.2, 6.0, out(p))], [0.55, 1.35, -0.25], 38);
      show("young-object", [0.55, 0, -0.3], t);
      book.visible = plates.visible = true;
    } else if (shot.id === "plates_reply") {
      cam([-1.4, 1.9, mix(1.85, 1.7, out(p))], [-1.77, 1.01, -2.1], 37);
      plates.visible = true;
    } else if (shot.id === "lawyer") {
      cam([0.85, 1.95, 6.1], [0.6, 1.38, -0.3], 38);
      show("young-object", [0.6, 0, -0.3], t);
      plates.visible = book.visible = true;
    } else if (shot.id === "pocket_setup" || shot.id === "washing") {
      cam([-0.35, 1.95, 6.1], [-0.35, 1.43, -0.1], 37);
      show("mum-point-gif", [-0.4, 0, -0.16], t, shot.start);
      plates.visible = true;
      money.visible = shot.id === "washing";
    } else if (shot.id === "pocket") {
      cam([0.35, 2.6, 2.65], [0.43, 0.62, 0.08], 38);
      money.visible = true;
      for (const [i, coin] of coins.entries()) {
        const hit = e.pocketHit + i * 0.07;
        coin.object.visible = t >= hit - 0.24;
        coin.object.position.y += landing(t, hit, 0.24, 0.46);
      }
    } else if (shot.id === "coffee") {
      cam([0.68, 1.95, mix(6.15, 5.95, out(p))], [0.58, 1.2, -0.05], 38);
      show("young-worried", [0.62, 0, -0.3], t);
      money.visible = plates.visible = true;
    } else if (shot.id === "coffee_detail") {
      cam([0.5, 1.98, 3.65], [0.5, 1.55, -0.3], 38);
      show("young-worried", [0.62, 0, -0.3], t);
    } else if (shot.id === "offer") {
      cam([0.62, 2.0, 6.25], [0.64, 1.4, -0.3], 38);
      show("young-object", [0.64, 0, -0.3], t);
      book.visible = true;
    } else if (shot.id === "hand") {
      cam([-0.22, 2.05, 7.55], [-0.1, 1.3, 0.02], 40);
      show("rich-wow", [-0.94, 0, 0.75], t);
      show(
        "young-offer",
        [mix(0.93, 0.76, out((t - e.offer) / 0.34)), 0, -0.35],
        t,
      );
      book.visible = true;
    } else if (shot.id === "keep") {
      cam([-0.78, 2.0, 6.35], [-0.75, 1.5, 0.72], 38);
      show(
        "rich-wow",
        [
          -0.88 - 0.08 * out((t - e.keep) / 0.38),
          0,
          0.75 - 0.2 * out((t - e.keep) / 0.38),
        ],
        t,
        e.keep,
      );
      book.visible = true;
    } else if (shot.id === "exam") {
      cam([0.25, 2.85, 2.9], [0.43, 0.67, 0.08], 40);
      book.visible = true;
    } else {
      cam([0.69, 2.0, 6.3], [0.69, 1.36, -0.25], 38);
      show("young-defeated", [0.69, 0, -0.3], t);
      book.visible = plates.visible = true;
    }
    if (shot.id !== "bins") practical.position.set(0.4, 2, -1.4);
    dust.forEach((m, i) => {
      m.position.set(
        (seeded(i + 401) - 0.5) * 5,
        0.3 + ((seeded(i + 45) + t * 0.012) % 1) * 3.3,
        -1.8 + seeded(i + 97) * 3,
      );
    });
    renderer.render(scene, camera);
    return { time: t, shot: shot.id };
  }
  window.addEventListener("hf-seek", (ev) =>
    renderAt((ev as CustomEvent<{ time: number }>).detail.time),
  );
  renderAt(0);
  await renderer.compileAsync(scene, camera);
  renderAt(0);
  return { renderAt, renderer };
}

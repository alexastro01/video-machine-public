import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Asset, Plan } from "./types";
import {
  clamp01,
  ease,
  mix,
  clockSeconds,
  originalNoteVisible,
  newNoteVisible,
} from "./state";

type V3 = [number, number, number];
const out = (x: number) => 1 - (1 - clamp01(x)) ** 3;
const seeded = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

class Actor {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  frame = 0;
  x = 0;
  y = 0;
  z = 0;
  scale = 1;
  constructor(
    public asset: Asset,
    public texture: THREE.Texture,
    parent: THREE.Object3D,
  ) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      alphaTest: 0.48,
      side: THREE.DoubleSide,
      emissive: 0xffffff,
      emissiveMap: texture,
      emissiveIntensity: 0.35,
      roughness: 1,
    });
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(
        (asset.worldHeight * asset.width) / asset.height,
        asset.worldHeight,
      ),
      material,
    );
    this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
      map: texture,
      alphaTest: 0.48,
      depthPacking: THREE.RGBADepthPacking,
      side: THREE.DoubleSide,
    });
    this.mesh.castShadow = true;
    this.mesh.visible = false;
    parent.add(this.mesh);
  }
  show(
    x: number,
    y: number,
    z: number,
    camera: THREE.Camera,
    frame = 0,
    scale = 1,
  ) {
    const a = this.asset,
      an = a.animation;
    this.frame = Math.max(0, Math.min((an?.frameCount ?? 1) - 1, frame));
    let foot = a.footY,
      pivot = a.pivotX;
    if (an) {
      const c = an.crop,
        i = this.frame;
      this.texture.repeat.set(c.width / an.width, c.height / an.height);
      this.texture.offset.set(
        ((i % an.columns) * an.cellWidth + c.x) / an.width,
        1 -
          (Math.floor(i / an.columns) * an.cellHeight + c.y + c.height) /
            an.height,
      );
      foot = an.cells[i].bottom + 1 - c.y;
      pivot = an.cellWidth / 2 - c.x;
    }
    const w = (a.worldHeight * a.width) / a.height;
    this.mesh.position.set(
      x + (w / 2 - (pivot * w) / a.width) * scale,
      y + a.worldHeight * (foot / a.height - 0.5) * scale,
      z,
    );
    this.mesh.rotation.set(
      0,
      Math.atan2(camera.position.x - x, camera.position.z - z),
      0,
    );
    this.mesh.scale.setScalar(scale);
    this.mesh.visible = true;
    this.x = x;
    this.y = y;
    this.z = z;
    this.scale = scale;
  }
  hand(): THREE.Vector3 {
    const a = this.asset,
      an = a.animation,
      c = an?.crop;
    const p = an?.hands?.[this.frame] ??
      a.hand ?? [a.width * 0.8, a.height * 0.56];
    const px = p[0] - (c?.x ?? 0),
      py = p[1] - (c?.y ?? 0);
    const foot = an ? an.cells[this.frame].bottom + 1 - an.crop.y : a.footY;
    const pivot = an ? an.cellWidth / 2 - an.crop.x : a.pivotX;
    const factor = (a.worldHeight / a.height) * this.scale;
    return new THREE.Vector3(
      this.x + (px - pivot) * factor,
      this.y + (foot - py) * factor,
      this.z + 0.06,
    );
  }
}

function paper(text: string, color = "#9f493d", w = 512, h = 640) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d")!;
  x.fillStyle = "#eee3c2";
  x.fillRect(0, 0, w, h);
  x.fillStyle = "#9a9f89";
  for (let i = 0; i < 6; i++)
    x.fillRect(48, 140 + i * 58, w - 96 - (i % 3) * 40, 9);
  x.fillStyle = color;
  x.textAlign = "center";
  x.font = `900 ${Math.round(h * 0.3)}px 'DM Sans'`;
  const size = Math.floor(
    h * 0.3 * Math.min(1, (w * 0.82) / x.measureText(text).width),
  );
  x.font = `900 ${size}px 'DM Sans'`;
  x.save();
  x.translate(w / 2, h * 0.43);
  x.rotate(-0.15);
  x.fillText(text, 0, 0);
  x.restore();
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.65),
    new THREE.MeshBasicMaterial({
      map,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
}

export async function boot(canvas: HTMLCanvasElement, plan: Plan) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(plan.width, plan.height);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#294552");
  scene.fog = new THREE.Fog("#294552", 12, 32);
  const camera = new THREE.PerspectiveCamera(
    36,
    plan.width / plan.height,
    0.05,
    55,
  );
  scene.add(new THREE.HemisphereLight("#c1d8df", "#947557", 1.35));
  const key = new THREE.DirectionalLight("#ffdfb1", 2.3);
  key.position.set(-3, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -4;
  key.shadow.normalBias = 0.028;
  scene.add(key);
  const rim = new THREE.DirectionalLight("#9ac8d6", 0.7);
  rim.position.set(4, 3, -3);
  scene.add(rim);
  const lamp = new THREE.PointLight("#efc78c", 8, 8, 2);
  lamp.position.set(-1.1, 2, -1.4);
  scene.add(lamp);
  const cashLight = new THREE.PointLight("#cfdbad", 0, 4, 2);
  cashLight.position.set(0.5, 1.8, 1.7);
  scene.add(cashLight);
  const gltf = await new GLTFLoader().loadAsync(plan.model);
  const model = gltf.scene;
  scene.add(model);
  model.updateMatrixWorld(true);
  model.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats)
        if (m instanceof THREE.MeshStandardMaterial && m.map) {
          m.map.magFilter = THREE.NearestFilter;
          m.map.minFilter = THREE.NearestFilter;
          m.map.generateMipmaps = false;
        }
    }
  });
  function must(name: string) {
    const object = model.getObjectByName(name);
    if (!object) throw new Error("Missing Blender node " + name);
    return object;
  }
  const home = must("Stage_Home"),
    electronics = must("Stage_Electronics"),
    corner = must("Stage_Corner"),
    street = must("Stage_Street");
  const template = must("Prop_Templates");
  // Keep the cashier's face clear of the till screen in the portrait frame.
  for (const prefix of ["Corner", "Electronics"])
    model.traverse((o) => {
      if (
        o.name.startsWith(`${prefix}_Register`) ||
        o.name === `${prefix}_CashDrawer`
      )
        o.position.x += 0.48;
    });
  model.traverse((o) => {
    if (o.name.startsWith("Home_Books")) o.position.x -= 1.25;
    if (/^(Corner|Electronics)_(Shelf|Stock)/.test(o.name))
      o.position.x += o.position.x > 0 ? -1 : 1;
  });
  function prop(name: string) {
    const original = must(name),
      copy = original.clone(true),
      root = new THREE.Group();
    copy.position.set(0, 0, 0);
    copy.quaternion.copy(original.getWorldQuaternion(new THREE.Quaternion()));
    copy.scale.copy(original.getWorldScale(new THREE.Vector3()));
    root.add(copy);
    scene.add(root);
    return root;
  }
  const notes = Array.from({ length: 16 }, () => prop("Prop_Banknote"));
  const phone = prop("Prop_Phone"),
    consoleProp = prop("Prop_Console"),
    bag = prop("Prop_Bag");
  const consoleBox = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 0.7, 0.22),
    new THREE.MeshStandardMaterial({ color: "#b9a77c", roughness: 0.8 }),
  );
  scene.add(consoleBox);
  const faceCanvas = document.createElement("canvas");
  faceCanvas.width = 600;
  faceCanvas.height = 1100;
  const ctx = faceCanvas.getContext("2d")!;
  const screenTexture = new THREE.CanvasTexture(faceCanvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  const phoneScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.594, 1.075),
    new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false }),
  );
  phoneScreen.position.set(0, -0.01, 0.055);
  phone.add(phoneScreen);
  const exam = paper("F"),
    debt = paper("PAST DUE", "#a54b3e", 640, 640);
  debt.scale.set(0.86, 0.65, 0.86);
  scene.add(exam, debt);
  const receipt = paper("PAID", "#50705f", 512, 640);
  receipt.scale.set(0.45, 0.5, 0.45);
  scene.add(receipt);
  const cardSign = paper("CARD ONLY", "#275d67", 640, 420);
  cardSign.scale.set(1.15, 0.6, 1);
  scene.add(cardSign);
  const loader = new THREE.TextureLoader();
  const textures = await Promise.all(
    plan.assets.map((a) => loader.loadAsync(a.url)),
  );
  const actors = new Map(
    plan.assets.map((a, i) => [a.id, new Actor(a, textures[i], scene)]),
  );
  function actor(id: string) {
    const result = actors.get(id);
    if (!result) throw new Error("Missing cast asset " + id);
    return result;
  }
  const e = plan.events;
  function gif(id: string, t: number, start: number, cycle = false) {
    const an = actor(id).asset.animation;
    if (!an) return 0;
    if (id === "miko-talk-gif") {
      const line = plan.lines.find((l) => Math.abs(l.start - start) < 0.02);
      if (line?.words.length) {
        const first = line.words[0].start,
          last = line.words[line.words.length - 1].end;
        return Math.min(
          an.frameCount - 1,
          Math.floor(clamp01((t - first) / (last - first)) * an.frameCount),
        );
      }
    }
    const frame = Math.max(
      0,
      Math.floor(((t - start) * 1000) / an.frameDurationMs),
    );
    return cycle ? frame % an.frameCount : Math.min(an.frameCount - 1, frame);
  }
  function show(
    id: string,
    x: number,
    y: number,
    z: number,
    t: number,
    start = 0,
    cycle = false,
    scale = 1,
  ) {
    const a = actor(id);
    a.show(x, y, z, camera, gif(id, t, start, cycle), scale);
    return a;
  }
  const dustMat = new THREE.MeshBasicMaterial({
    color: "#d9c997",
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  });
  const specks = Array.from({ length: 22 }, () => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.012, 0.012),
      dustMat,
    );
    scene.add(mesh);
    return mesh;
  });
  let lastFace = "";
  function clockFace(seconds: number, calling: boolean, connected = false) {
    const value = calling
      ? "MUM"
      : `${String(Math.floor(Math.ceil(seconds) / 60)).padStart(2, "0")}:${String(Math.ceil(seconds) % 60).padStart(2, "0")}`;
    const state = value + ":" + (seconds < 15) + ":" + connected;
    if (state === lastFace) return;
    lastFace = state;
    ctx.fillStyle = calling ? "#294e58" : "#142c36";
    ctx.fillRect(0, 0, 600, 1100);
    ctx.fillStyle = calling ? "#e5dfc8" : "#94b4af";
    ctx.textAlign = "center";
    ctx.font = "700 42px 'DM Sans'";
    ctx.fillText(
      calling ? (connected ? "On call" : "Incoming call") : "",
      300,
      220,
    );
    ctx.fillStyle = calling ? "#f2e8d0" : seconds < 15 ? "#dc806a" : "#e0ce99";
    ctx.font = `900 ${calling ? 100 : 120}px 'DM Sans'`;
    ctx.fillText(value, 300, 535);
    if (calling) {
      ctx.beginPath();
      ctx.arc(300, 855, 56, 0, Math.PI * 2);
      ctx.fillStyle = "#89b09b";
      ctx.fill();
    }
    screenTexture.needsUpdate = true;
  }
  function cameraTo(pos: V3, target: V3, fov = 36) {
    camera.fov = fov;
    camera.position.set(...pos);
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  }
  function poseNote(i: number, pos: THREE.Vector3, rot: V3, scale = 1) {
    const n = notes[i];
    n.visible = true;
    n.position.copy(pos);
    n.rotation.set(...rot);
    n.scale.setScalar(scale);
  }

  function renderAt(rawTime: number) {
    const t = Math.min(
      plan.duration - 1 / plan.fps,
      Math.max(0, Math.floor(rawTime * plan.fps + 1e-5) / plan.fps),
    );
    const shot =
      plan.shots.find(
        (s) => t >= s.start - 1e-5 && t < s.start + s.duration - 1e-5,
      ) ?? plan.shots[plan.shots.length - 1];
    const p = clamp01((t - shot.start) / shot.duration);
    for (const a of actors.values()) a.mesh.visible = false;
    for (const n of notes) n.visible = false;
    for (const object of [
      home,
      electronics,
      corner,
      street,
      template,
      phone,
      consoleProp,
      bag,
      consoleBox,
      exam,
      debt,
      receipt,
      cardSign,
    ])
      object.visible = false;
    cashLight.intensity = 0;
    const isHome = [
      "promise",
      "mondays",
      "exams",
      "debt",
      "clock",
      "catch",
    ].includes(shot.id);
    const isFirst = shot.id === "buy" || shot.id === "card";
    const isStreet = shot.id === "run";
    const isCorner = !isHome && !isFirst && !isStreet;
    home.visible = isHome;
    electronics.visible = isFirst;
    street.visible = isStreet;
    corner.visible = isCorner;
    lamp.intensity = isHome ? 7 : 3;
    let miko: Actor | undefined;
    cameraTo([0.2, 2.45, 7.4], [0, 1.5, 0]);
    if (isHome) {
      let active = e.mondays;
      if (t >= e.exams) active = e.exams;
      if (t >= e.debt) active = e.debt;
      const speak = t < e.rule;
      if (speak) {
        cameraTo(
          [
            0.1 + mix(0.04, 0, out(p)),
            2.4,
            shot.id === "promise" ? 6.95 : 7.15 - 0.12 * out(p),
          ],
          [0, 1.3, 0.25],
          39,
        );
        miko = show("miko-talk-gif", -0.43, 0, 0.28, t, active);
        if (shot.id === "promise") {
          // A moving close view of the fictional note illustrates the premise;
          // the three earned payouts below remain one consistent physical pile.
          poseNote(
            15,
            new THREE.Vector3(
              mix(0.67, 0.58, out(p)),
              mix(1.8, 1.2, out(p)),
              1.1,
            ),
            [0.1, mix(-0.7, 0.2, ease(p)), -0.08],
            0.65,
          );
        }
      } else if (shot.id === "clock") {
        cameraTo([0.3, 1.75, 4.2], [0.3, 1.4, 1.12], 35);
        miko = show("miko-panic", -1.15, 0, 0.05, t, 0, false, 0.96);
      } else {
        cameraTo([0.15, 2.4, 7.5], [0, 1.3, 0.3], 39);
        miko = show("miko-panic-gif", -0.43, 0, 0.28, t, e.rule);
      }
      const tabletop = new THREE.Vector3(0.55, 0.883, 0.73);
      for (let i = 0; i < 15; i++)
        if (originalNoteVisible(i, t, e)) {
          const birth =
            [e.cash1, e.cash2, e.cash3][Math.floor(i / 5)] + (i % 5) * 0.045;
          const age = t - birth,
            q = out(age / 0.36),
            y = tabletop.y + i * 0.013;
          const target = new THREE.Vector3(
            tabletop.x + (seeded(i) - 0.5) * 0.06,
            y,
            tabletop.z + (seeded(i + 20) - 0.5) * 0.055,
          );
          const start = new THREE.Vector3(
            0.34 + seeded(i + 8) * 0.4,
            2.65 + (i % 5) * 0.05,
            0.75,
          );
          const pos = start.clone().lerp(target, q);
          pos.x += Math.sin(q * Math.PI) * 0.15;
          const settle =
            age > 0.36
              ? Math.sin((age - 0.36) * 24) *
                Math.exp(-(age - 0.36) * 16) *
                0.023
              : 0;
          pos.y += Math.max(0, settle);
          poseNote(
            i,
            pos,
            [
              mix(0.05, -Math.PI / 2, q),
              mix(0.55, 0, q),
              (seeded(i + 70) - 0.5) * 0.1,
            ],
            0.93,
          );
          if (age >= 0 && age < 0.32)
            cashLight.intensity = Math.max(
              cashLight.intensity,
              (1 - age / 0.32) * 3,
            );
        }
      if (shot.id === "exams") {
        exam.visible = true;
        exam.position.set(-0.55, 1.13, 0.38);
        exam.rotation.set(0, 0, -0.15);
        phone.visible = true;
        phone.position.set(0.15, 1.24, 0.65);
        phone.rotation.set(0, 0, -0.03);
        phone.scale.setScalar(0.55);
      }
      if (shot.id === "debt") {
        debt.visible = true;
        debt.position.set(0.0, 0.93, 1.12);
        debt.rotation.set(-0.45, 0, 0.09);
      }
      if (!speak) {
        phone.visible = true;
        phone.position.set(0.3, 1.4, 1.12);
        phone.rotation.set(-0.04, -0.1, -0.035);
        phone.scale.setScalar(0.8);
      }
    } else if (isFirst) {
      cameraTo(
        shot.id === "card" ? [0.18, 2.3, 7.8] : [0.18, 2.5, 8.0],
        [0.05, 1.3, 0.1],
        39,
      );
      miko = show(
        shot.id === "card" ? "miko-panic" : "miko-proud",
        -0.64,
        0,
        0.88,
        t,
      );
      show("clerk", 0.58, 0, -0.62, t, 0, false, 1.02);
      consoleProp.visible = true;
      consoleProp.position.set(0.3, 1.15, 0.35);
      consoleProp.rotation.set(-0.15, -0.1, 0);
      consoleProp.scale.setScalar(0.72);
      for (let i = 0; i < 15; i++)
        poseNote(
          i,
          new THREE.Vector3(0.18, 0.96 + i * 0.012, 0.78),
          [-Math.PI / 2, 0, (seeded(i) - 0.5) * 0.06],
          0.68,
        );
      phone.visible = true;
      phone.position.set(-0.96, 1.25, 0.2);
      phone.rotation.set(0, 0.12, -0.08);
      phone.scale.setScalar(0.5);
      cardSign.visible = shot.id === "card";
      cardSign.position.set(0.72, 1.23, 0.7);
      cardSign.rotation.set(-0.1, 0, -0.025);
    } else if (isStreet) {
      const x = mix(-2.3, 2.3, ease(p));
      cameraTo([x + 0.18, 2.12, 7.1], [x + 0.2, 1.4, 0]);
      miko = show("miko-run-gif", x, 0, 0.2, t, shot.start, true);
      const hand = miko.hand();
      bag.visible = true;
      bag.scale.setScalar(0.48);
      bag.position.copy(hand).add(new THREE.Vector3(0, -0.48, 0.015));
      bag.rotation.z = Math.sin((t - shot.start) * 10) * 0.08;
      phone.visible = true;
      phone.scale.setScalar(0.38);
      phone.position.set(x - 0.48, 1.12, 0.24);
      phone.rotation.set(0, 0, -0.1);
    } else {
      const close = shot.id === "last-note" || shot.id === "expiry";
      cameraTo(
        close ? [0.16, 2.35, 7.6] : [0.16, 2.45, 8.0],
        close ? [0.0, 1.32, 0.48] : [0, 1.3, 0.2],
        close ? 38 : 39,
      );
      const pastPayout = t >= e.lastCash;
      if (pastPayout)
        miko = show("miko-panic-gif", -0.65, 0, 0.85, t, e.lastCash);
      else if (shot.id === "thanks" || shot.id === "relief")
        miko = show(
          "miko-talk-gif",
          -0.65,
          0,
          0.85,
          t,
          shot.id === "thanks" ? e.thanks : e.relief,
        );
      else miko = show("miko-proud", -0.65, 0, 0.85, t);
      const react = t >= e.mum + 0.35;
      show(
        react
          ? "cashier-reaction-gif"
          : shot.id === "compliment"
            ? "cashier-talk"
            : "cashier-idle",
        0.5,
        0,
        -0.55,
        t,
        e.mum + 0.35,
      );
      const drawer = model.getObjectByName("Corner_CashDrawer");
      if (drawer)
        drawer.position.z =
          0.05 +
          0.34 *
            (out((t - e.transfer + 0.16) / 0.16) -
              out((t - e.empty - 0.12) / 0.22));
      consoleProp.visible = t < e.transfer + 0.4;
      consoleProp.position.set(0.3, 1.15, 0.2);
      consoleProp.rotation.set(-0.08, 0, 0);
      consoleProp.scale.setScalar(0.72);
      bag.visible = true;
      bag.scale.setScalar(0.74);
      bag.position.set(-1.12, 0.95, 0.09);
      bag.rotation.z = -0.04;
      for (let i = 0; i < 15; i++)
        if (originalNoteVisible(i, t, e)) {
          const q = ease((t - e.transfer - i * 0.075) / 0.42);
          const pos = new THREE.Vector3(
            mix(0.12, 1.14, q),
            mix(0.95 + i * 0.012, 1.07, q) + Math.sin(q * Math.PI) * 0.28,
            mix(0.76, 0.4, q),
          );
          poseNote(
            i,
            pos,
            [
              -Math.PI / 2,
              0.05 * Math.sin(q * Math.PI),
              (seeded(i) - 0.5) * 0.06,
            ],
            mix(0.68, 0.48, q),
          );
        }
      receipt.visible = t >= e.empty - 0.12 && t < e.thanks;
      receipt.position.set(0.65, 1.11 + out((t - e.empty) / 0.4) * 0.15, 0.01);
      receipt.rotation.set(-0.1, 0, 0.04);
      phone.visible = true;
      phone.position.set(0.12, 1.27, 0.3);
      phone.rotation.set(-0.14, -0.12, -0.08);
      phone.scale.setScalar(0.5);
      if (newNoteVisible(t, e)) {
        const hand = miko.hand();
        const q = out((t - e.lastCash) / 0.16);
        hand.y += mix(0.6, 0.12, q);
        hand.x += 0.11;
        hand.z -= 0.42 * ease((t - e.lastCash - 0.12) / 0.53);
        poseNote(15, hand, [-0.2, -0.1, -0.07], 0.62);
        if (t - e.lastCash < 0.3)
          cashLight.intensity = (1 - (t - e.lastCash) / 0.3) * 2.7;
      }
      if (shot.id === "compliment") {
        cameraTo([0.6, 2.1, 4.5], [0.5, 1.7, -0.55], 35);
        miko.mesh.visible = false;
        phone.visible = bag.visible = receipt.visible = false;
      }
      if (shot.id === "phone" || shot.id === "ten-clock") {
        cameraTo([-0.15, 1.65, 3.25], [-0.1, 1.25, 0.75], 35);
        phone.position.set(-0.1, 1.35, 1.05);
        phone.rotation.set(-0.02, 0, -0.03);
        phone.scale.setScalar(0.98);
        for (const a of actors.values()) a.mesh.visible = false;
      }
    }
    const speakingToMum = shot.id === "exams";
    clockFace(clockSeconds(t, e), t >= e.phone || speakingToMum, speakingToMum);
    specks.forEach((m, i) => {
      const phase = (seeded(i + 801) + t * 0.012) % 1;
      m.position.set(
        (seeded(i + 803) - 0.5) * 5,
        0.3 + phase * 3.4,
        -0.8 + seeded(i + 809) * 2.0,
      );
    });
    renderer.render(scene, camera);
  }
  window.addEventListener("hf-seek", (event) =>
    renderAt((event as CustomEvent<{ time: number }>).detail.time),
  );
  renderAt(0);
  await renderer.compileAsync(scene, camera);
  renderAt(0);
  return { renderAt, renderer };
}

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Asset, Plan, StageProp } from "./types";

type Triple = [number, number, number];
type ActorView = {
  asset: Asset;
  mesh: THREE.Mesh;
  texture: THREE.Texture;
  show: (
    x: number,
    y: number,
    z: number,
    camera: THREE.Camera,
    frame?: number,
    flip?: boolean,
    scale?: number,
  ) => unknown;
};
type Context = {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  actors: Map<string, ActorView>;
  textures: Map<string, THREE.Texture>;
  plan: Plan;
};
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mats = new Map<string, THREE.MeshStandardMaterial>();
let woodGrain: THREE.CanvasTexture | undefined;
const woodColors = new Set([
  "#9d7650",
  "#654933",
  "#806141",
  "#87694a",
  "#60462e",
  "#94704a",
  "#b48a54",
  "#674a32",
  "#7c592e",
  "#8b6744",
  "#b08a5d",
  "#594633",
  "#6a513c",
  "#9b754b",
  "#72593c",
  "#8e6b43",
  "#a88a5c",
  "#c7a577",
  "#936b43",
]);
function material(color: string, metalness = 0) {
  const id = `${color}/${metalness}`;
  if (!mats.has(id))
    mats.set(
      id,
      new THREE.MeshStandardMaterial({ color, roughness: 0.74, metalness }),
    );
  const m = mats.get(id)!;
  if (woodColors.has(color)) {
    if (!woodGrain) {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 256;
      const g = c.getContext("2d")!;
      g.fillStyle = "#fff";
      g.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 94; i++) {
        g.strokeStyle = i % 3 ? "#d9d9d9" : "#ededed";
        g.lineWidth = i % 7 ? 1 : 2;
        g.beginPath();
        for (let x = 0; x <= 512; x += 8) {
          const y = i * 2.8 + Math.sin(x * 0.027 + i * 1.3) * 2.2;
          if (x) g.lineTo(x, y);
          else g.moveTo(x, y);
        }
        g.stroke();
      }
      woodGrain = new THREE.CanvasTexture(c);
      woodGrain.colorSpace = THREE.SRGBColorSpace;
    }
    m.map = woodGrain;
  }
  return m;
}
function box(
  g: THREE.Object3D,
  dims: Triple,
  pos: Triple,
  color: string,
  radius = 0.02,
) {
  const m = new THREE.Mesh(
    new RoundedBoxGeometry(
      ...dims,
      2,
      Math.min(radius, ...dims.map((x) => x / 3)),
    ),
    material(color),
  );
  m.position.set(...pos);
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return m;
}
function cylinder(
  g: THREE.Object3D,
  r: number,
  h: number,
  pos: Triple,
  color: string,
  segments = 24,
) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, h, segments),
    material(color),
  );
  m.position.set(...pos);
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return m;
}
function plane(
  g: THREE.Object3D,
  t: THREE.Texture,
  w: number,
  h: number,
  pos: Triple,
) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      map: t,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
  );
  m.position.set(...pos);
  m.renderOrder = 20 + Math.round(pos[2] * 1000);
  g.add(m);
  return m;
}
function label(
  text: string,
  color = "#3b3329",
  bg = "#d9caa4",
  w = 1024,
  h = 768,
) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  const lines = text.split("\n");
  g.fillStyle = color;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `600 ${Math.min(76, h / (lines.length + 2))}px Georgia`;
  lines.forEach((s, i) =>
    g.fillText(s, w / 2, h * 0.4 + i * h * 0.16, w * 0.86),
  );
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function table(g: THREE.Group, height = 1.1, width = 1.5, depth = 0.85) {
  box(g, [width, 0.14, depth], [0, height, 0], "#9d7650");
  for (const x of [-width * 0.4, width * 0.4])
    for (const z of [-depth * 0.38, depth * 0.38])
      box(g, [0.1, height, 0.1], [x, height / 2, z], "#654933");
}
function chair(g: THREE.Group) {
  box(g, [0.8, 0.13, 0.7], [0, 0.92, 0], "#806141");
  box(g, [0.8, 0.8, 0.09], [0, 1.37, -0.32], "#87694a");
  for (const x of [-0.3, 0.3])
    for (const z of [-0.25, 0.25])
      box(g, [0.09, 0.9, 0.09], [x, 0.45, z], "#60462e");
}
function stone(g: THREE.Group, scale = 1) {
  const m = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.16 * scale, 1),
    material("#8a887f"),
  );
  m.scale.set(1.22, 0.73, 0.87);
  m.castShadow = true;
  g.add(m);
  return m;
}
function cup(g: THREE.Group) {
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.09, 0.21, 32, 1, true),
    material("#c6bda4"),
  );
  shell.position.y = 0.11;
  g.add(shell);
  cylinder(g, 0.108, 0.008, [0, 0.18, 0], "#5a4938");
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.065, 0.023, 10, 24),
    material("#b9ad93"),
  );
  handle.position.set(0.13, 0.11, 0);
  g.add(handle);
}
export async function createFilmStage({
  scene,
  camera,
  actors,
  textures,
  plan,
}: Context) {
  const root = new THREE.Group();
  scene.add(root);
  const bgMaterial = new THREE.MeshBasicMaterial({
    toneMapped: false,
    depthWrite: false,
  });
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 5.4), bgMaterial);
  bg.renderOrder = -12;
  root.add(bg);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 25),
    new THREE.ShadowMaterial({ opacity: 0.28 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.012;
  shadow.receiveShadow = true;
  root.add(shadow);
  const propsRoot = new THREE.Group();
  root.add(propsRoot);
  const propsByShot = new Map<string, THREE.Group[]>();
  const updaters = new Map<THREE.Group, (t: number) => void>();
  const cameraModel = (
    await new GLTFLoader().loadAsync("assets/art/camera1839.glb")
  ).scene;
  cameraModel.traverse((object) => {
    if (object instanceof THREE.Mesh)
      object.castShadow = object.receiveShadow = true;
  });
  const bookModel = (
    await new GLTFLoader().loadAsync("assets/art/register-book.glb")
  ).scene;
  bookModel.traverse((object) => {
    if (object instanceof THREE.Mesh)
      object.castShadow = object.receiveShadow = true;
  });
  const dust = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({
      color: "#cbbd96",
      size: 0.012,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    }),
  );
  const dustCoords = new Float32Array(54 * 3);
  for (let i = 0; i < 54; i++) {
    dustCoords[i * 3] = Math.sin(i * 16.29) * 4;
    dustCoords[i * 3 + 1] = 1.3 + Math.cos(i * 3.71) * 1.8;
    dustCoords[i * 3 + 2] = -1 - (i % 5) * 0.25;
  }
  dust.geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(dustCoords, 3),
  );
  root.add(dust);
  function portrait(g: THREE.Group, width = 1.75, height = 2.12, frame = true) {
    const t = textures.get(plan.portrait)!;
    plane(g, t, width, height, [0, 0, 0.04]);
    if (frame) {
      for (const x of [-width / 2 - 0.07, width / 2 + 0.07])
        box(g, [0.12, height + 0.24, 0.13], [x, 0, 0.02], "#ae803b");
      for (const y of [-height / 2 - 0.07, height / 2 + 0.07])
        box(g, [width + 0.24, 0.12, 0.13], [0, y, 0.02], "#bf9349");
    }
  }
  function makeProp(p: StageProp) {
    const g = new THREE.Group();
    propsRoot.add(g);
    g.position.set(p.x, p.y, p.z);
    g.scale.setScalar(p.scale ?? 1);
    const type = p.type;
    if (type === "chair") chair(g);
    else if (type === "smallTable") table(g);
    else if (type === "desk") table(g, 1.38, 2.15, 1.05);
    else if (type === "marketStall") {
      table(g, 0.82, 2.2, 0.8);
      for (let i = 0; i < 7; i++)
        box(
          g,
          [0.29, 0.45, 0.04],
          [-0.93 + i * 0.31, 0.57, 0.43],
          i % 2 ? "#94704a" : "#b48a54",
        );
    } else if (type === "cup") cup(g);
    else if (type === "rock") stone(g);
    else if (type === "bucket" || type === "basket") {
      const r = type === "bucket" ? 0.22 : 0.36,
        h = type === "bucket" ? 0.42 : 0.35;
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r * 0.78, h, 24, 1, true),
        material("#927047"),
      );
      m.position.y = h / 2;
      g.add(m);
      for (const y of [0, h * 0.45, h]) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(r * (0.78 + (y / h) * 0.22), 0.017, 6, 32),
          material("#c1a477"),
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = y;
        g.add(ring);
      }
      const handle = new THREE.Mesh(
        new THREE.TorusGeometry(r * 0.9, 0.018, 6, 28, Math.PI),
        material("#4c4a43"),
      );
      handle.position.y = h;
      g.add(handle);
    } else if (type === "turnip") {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 20, 14),
        material("#d7c9b1"),
      );
      g.add(m);
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.157, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        material("#977385"),
      );
      cap.position.y = 0.035;
      g.add(cap);
      for (let i = 0; i < 5; i++) {
        const leaf = box(
          g,
          [0.07, 0.28, 0.02],
          [Math.sin(i) * 0.06, 0.23, 0],
          "#7c8d54",
        );
        leaf.rotation.z = (i - 2) * 0.28;
      }
    } else if (["ledger", "book", "passport"].includes(type)) {
      const isPassport = type === "passport",
        w = isPassport ? 1.28 : 1.8,
        h = isPassport ? 1.7 : 1.25;
      if (!isPassport) {
        const model = bookModel.clone(true);
        model.scale.setScalar(0.78);
        g.add(model);
        const bounds = new THREE.Box3().setFromObject(model);
        const text = label(
          p.text ?? "Register",
          "#4a3c2c",
          "rgba(0,0,0,0)",
          512,
          512,
        );
        const entries = label("", "#705f49", "rgba(0,0,0,0)", 512, 512);
        const entryInk = (entries.image as HTMLCanvasElement).getContext("2d")!;
        entryInk.strokeStyle = "rgba(79,63,41,.48)";
        entryInk.lineWidth = 2;
        for (let row = 0; row < 10; row++) {
          const y = 65 + row * 39;
          for (let col = 0; col < 3; col++) {
            const x = 35 + col * 152;
            entryInk.beginPath();
            entryInk.moveTo(x, y);
            entryInk.lineTo(
              x + 95 + (row % 3) * 12,
              y + Math.sin(row + col) * 3,
            );
            entryInk.stroke();
          }
        }
        entries.needsUpdate = true;
        plane(g, entries, 0.54, 0.61, [-0.35, 0, bounds.max.z + 0.01]);
        plane(g, text, 0.54, 0.61, [0.35, 0, bounds.max.z + 0.01]);
        g.rotation.x = -Math.PI / 2;
        g.position.y = 1.45 - bounds.min.z;
      } else {
        box(
          g,
          [w + 0.08, h + 0.08, 0.13],
          [0, 0, 0],
          isPassport ? "#334b4d" : "#674a32",
        );
        const t = label("", "#473d2f", "#ddcfaa", 1024, 768);
        plane(g, t, w, h, [0, 0, 0.08]);
        plane(
          g,
          label("PASSPORT", "#473d2f", "rgba(0,0,0,0)", 768, 256),
          1.05,
          0.2,
          [0, 0.64, 0.09],
        );
        plane(
          g,
          label(p.text ?? "J. Smith", "#473d2f", "rgba(0,0,0,0)", 512, 512),
          0.55,
          0.65,
          [0.29, 0.2, 0.09],
        );
        g.rotation.x = -Math.PI / 2;
        if (isPassport) {
          const a = actors.get("norbert-industrial-passport")!;
          const t = a.texture.clone();
          t.repeat.set(1, 0.47);
          t.offset.set(0, 0.53);
          plane(g, t, 0.48, 0.62, [-0.29, 0.2, 0.09]);
        }
      }
    } else if (type === "contract") {
      const t = label("", "#443729", "#dacba5");
      plane(g, t, 1.4, 0.85, [0, 0, 0]);
      for (const x of [-0.72, 0.72]) {
        const r = cylinder(g, 0.06, 0.9, [x, 0, 0.02], "#c9b88e");
        r.rotation.z = Math.PI;
      }
      g.rotation.x = -0.3;
    } else if (type === "hourglass") {
      for (const y of [-0.4, 0.4])
        cylinder(g, 0.22, 0.06, [0, y, 0], "#7c592e");
      for (let i = 0; i < 4; i++)
        cylinder(
          g,
          0.018,
          0.8,
          [
            Math.sin((i * Math.PI) / 2) * 0.18,
            0,
            Math.cos((i * Math.PI) / 2) * 0.18,
          ],
          "#b49152",
        );
      const glass = new THREE.MeshPhysicalMaterial({
        color: "#c9d5cf",
        transparent: true,
        opacity: 0.2,
        roughness: 0.1,
        side: THREE.DoubleSide,
      });
      for (const sign of [-1, 1]) {
        const m = new THREE.Mesh(
          new THREE.ConeGeometry(0.17, 0.34, 20, 1, true),
          glass,
        );
        m.position.y = sign * 0.19;
        m.rotation.z = sign > 0 ? Math.PI : 0;
        g.add(m);
      }
      const sand = new THREE.Mesh(
        new THREE.ConeGeometry(0.13, 0.16, 16),
        material("#cba45a"),
      );
      sand.position.y = -0.29;
      g.add(sand);
      const stream = cylinder(g, 0.008, 0.41, [0, -0.1, 0], "#d8b05c");
      updaters.set(g, (t) => {
        stream.scale.x = 0.8 + 0.2 * Math.sin(t * 23);
      });
    } else if (type === "travelBag") {
      box(g, [0.7, 0.5, 0.35], [0, 0.3, 0], "#8b6744", 0.1);
      box(g, [0.6, 0.15, 0.38], [0, 0.57, 0.02], "#b08a5d", 0.07);
      for (const x of [-0.2, 0.2])
        box(g, [0.07, 0.53, 0.37], [x, 0.3, 0], "#594633");
    } else if (type === "haystack") {
      const m = new THREE.Mesh(
        new THREE.ConeGeometry(0.9, 1.5, 14),
        material("#a89458"),
      );
      m.position.set(0, 0.75, -0.6);
      g.add(m);
    } else if (type === "door") {
      box(g, [1.25, 2.6, 0.12], [0, 1.3, -0.5], "#6a513c");
      for (const y of [0.5, 2])
        box(g, [1.35, 0.13, 0.14], [0, y, -0.41], "#4a4639");
      cylinder(g, 0.06, 0.05, [0.4, 1.2, -0.35], "#a58850").rotation.x =
        Math.PI / 2;
    } else if (type === "stretcher") {
      const cloth = new THREE.PlaneGeometry(2.35, 1.02, 32, 16);
      cloth.rotateX(-Math.PI / 2);
      const points = cloth.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < points.count; i++) {
        const x = points.getX(i),
          z = points.getZ(i);
        const head = 0.18 * Math.exp(-Math.pow((x + 0.78) / 0.2, 2));
        const torso = 0.3 * Math.exp(-Math.pow((x + 0.1) / 0.43, 2));
        const legs = 0.12 * Math.exp(-Math.pow((x - 0.63) / 0.4, 2));
        const cross = Math.pow(
          Math.max(0, Math.cos(((z / 0.51) * Math.PI) / 2)),
          1.1,
        );
        points.setY(i, 0.59 + (0.035 + head + torso + legs) * cross);
      }
      cloth.computeVertexNormals();
      const shroud = new THREE.Mesh(cloth, material("#b5b2a4"));
      shroud.castShadow = shroud.receiveShadow = true;
      g.add(shroud);
      box(g, [2.5, 0.17, 0.9], [0, 0.52, 0], "#a09b8b");
      for (const z of [-0.5, 0.5])
        box(g, [3, 0.06, 0.07], [0, 0.48, z], "#68543b");
      for (const x of [-1, 1])
        for (const z of [-0.35, 0.35])
          box(g, [0.09, 0.48, 0.09], [x, 0.24, z], "#766046");
    } else if (type === "coat") {
      box(g, [0.75, 0.08, 0.6], [0, 0, 0], "#42636a", 0.06);
      for (const x of [-0.4, 0.4])
        box(g, [0.27, 0.06, 0.4], [x, -0.01, 0.1], "#36565f", 0.04);
    } else if (type === "feather") {
      const stem = box(g, [0.015, 0.45, 0.015], [0, 0, 0], "#b9b6a4", 0.004);
      stem.rotation.z = -0.14;
      for (let i = 0; i < 7; i++) {
        const length = 0.11 * Math.sin(((i + 1) / 8) * Math.PI);
        for (const side of [-1, 1]) {
          const barb = box(
            g,
            [length, 0.018, 0.012],
            [(side * length) / 2, -0.17 + i * 0.05, 0.01],
            "#eee6cb",
            0.004,
          );
          barb.rotation.z = side * 0.42;
        }
      }
      updaters.set(g, (t) => {
        const q = t - (p.cue ?? 1.5);
        g.visible = q < 0.7;
        g.position.x = p.x + 0.16 * Math.sin(q * 2);
        g.position.y = p.y - 0.3 * q;
        g.rotation.z = -0.7 + q * 0.2;
      });
    } else if (type === "easel") {
      for (const x of [-0.65, 0.65]) {
        const leg = box(g, [0.09, 2.3, 0.1], [x * 0.5, 1.15, -0.16], "#9b754b");
        leg.rotation.z = x * 0.2;
      }
      const leg = box(g, [0.09, 2.1, 0.1], [0, 1.05, -0.45], "#72593c");
      leg.rotation.x = -0.3;
      box(g, [1.7, 0.12, 0.2], [0, 1.25, -0.18], "#8e6b43");
    } else if (["blankCanvas", "canvasBack"].includes(type)) {
      box(g, [1.5, 1.8, 0.08], [0, 0, 0], "#a88a5c");
      if (type === "blankCanvas")
        plane(g, label("", "#746348", "#c6b898"), 1.43, 1.73, [0, 0, 0.05]);
      else {
        box(g, [1.5, 0.08, 0.12], [0, 0, 0.05], "#c7a577");
        box(g, [0.08, 1.8, 0.12], [0, 0, 0.05], "#c7a577");
      }
    } else if (type === "portrait" || type === "museumPortrait") {
      portrait(
        g,
        type === "museumPortrait" ? 2.2 : 1.5,
        type === "museumPortrait" ? 2.65 : 1.8,
      );
      if (type === "museumPortrait") {
        box(g, [3.3, 3.8, 0.1], [0, 0, -0.15], "#233944");
        plane(
          g,
          label("1650", "#d2b377", "#233944", 768, 256),
          0.65,
          0.23,
          [0, -1.55, 0.01],
        );
      }
    } else if (type === "palette") {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.27, 20, 12),
        material("#936b43"),
      );
      m.scale.set(1, 0.1, 0.7);
      g.add(m);
      for (let i = 0; i < 5; i++)
        cylinder(
          g,
          0.035,
          0.01,
          [Math.sin(i) * 0.16, 0.04, Math.cos(i) * 0.1],
          ["#725140", "#8c904f", "#536d75", "#bfa077", "#773c37"][i],
        );
    } else if (type === "camera1839") {
      if (cameraModel) {
        g.add(cameraModel.clone(true));
      } else {
        box(g, [1.2, 0.85, 0.85], [0, 1.7, 0], "#a37644");
        box(g, [0.95, 0.7, 0.7], [0, 1.7, -0.5], "#7d5b39");
        const lens = cylinder(g, 0.17, 0.38, [0, 1.7, 0.6], "#b29755");
        lens.rotation.x = Math.PI / 2;
        const glass = cylinder(g, 0.13, 0.02, [0, 1.7, 0.805], "#152b30");
        glass.rotation.x = Math.PI / 2;
        for (let i = 0; i < 3; i++) {
          const angle = (i * Math.PI * 2) / 3;
          const leg = box(
            g,
            [0.07, 1.6, 0.07],
            [Math.sin(angle) * 0.3, 0.8, Math.cos(angle) * 0.3],
            "#826444",
          );
          leg.rotation.x = Math.cos(angle) * 0.35;
          leg.rotation.z = -Math.sin(angle) * 0.35;
        }
      }
      g.rotation.y = p.yaw ?? Math.PI / 2;
      const inner = g.getObjectByName("GEO_InnerSlidingBox");
      if (inner)
        updaters.set(g, (t) => {
          inner.position.z = -0.44 - 0.1 * smooth(t / 0.9);
        });
    } else if (type === "cameraBox") {
      box(g, [0.75, 0.7, 0.42], [0, 1.4, 0], "#2d3b40");
      const lens = cylinder(g, 0.19, 0.15, [0, 1.4, 0.28], "#52656a");
      lens.rotation.x = Math.PI / 2;
    } else if (type === "photoPlate") {
      box(g, [2.5, 1.8, 0.06], [0, 0, 0], "#5b5750");
      const c = document.createElement("canvas");
      c.width = 1200;
      c.height = 850;
      const ctx = c.getContext("2d")!;
      const studio = textures.get(plan.backgrounds.photoStudio)!
        .image as CanvasImageSource;
      ctx.filter = "grayscale(1) sepia(.5)";
      ctx.drawImage(studio, 0, 0, 1200, 850);
      const image = textures.get(
        actors.get("norbert-industrial-photo")!.asset.url,
      )!.image as CanvasImageSource;
      ctx.drawImage(image, 390, 30, 370, 790);
      ctx.save();
      ctx.beginPath();
      ctx.rect(350, 15, 450, 300);
      ctx.clip();
      ctx.drawImage(studio, 0, 0, 1200, 850);
      ctx.filter = "grayscale(1) sepia(.5) blur(16px)";
      for (let i = -2; i <= 2; i++) {
        ctx.globalAlpha = 0.25;
        ctx.drawImage(image, 390 + i * 25, 30, 370, 790);
      }
      ctx.restore();
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      plane(g, t, 2.4, 1.7, [0, 0, 0.04]);
    } else if (
      ["phone", "socialPhoto", "familyTree", "airportMonitor"].includes(type)
    ) {
      const phone = type === "phone",
        w = phone ? 0.62 : 2.9,
        h = phone ? 1.22 : 1.9;
      box(g, [w + 0.12, h + 0.12, 0.12], [0, 0, 0], "#1d3039", 0.07);
      plane(g, label("", "#e2dfca", "#203c46"), w, h, [0, 0, 0.07]);
      if (type === "familyTree") {
        plane(
          g,
          textures.get(plan.backgrounds.familyTreeGraphic)!,
          2.85,
          1.9,
          [0, 0, 0.085],
        );
      } else if (type === "airportMonitor") {
        plane(g, textures.get(plan.portrait)!, 1.13, 1.55, [-0.7, 0.05, 0.08]);
        const a = actors.get("norbert-modern-neutral")!;
        const t = textures.get(a.asset.url)!.clone();
        t.repeat.set(1, 0.57);
        t.offset.set(0, 0.43);
        plane(g, t, 1.13, 1.55, [0.7, 0.05, 0.081]);
        plane(
          g,
          label("1650     2026", "#bed3d2", "#203c46", 1024, 256),
          2.4,
          0.22,
          [0, -0.82, 0.085],
        );
      } else {
        const a = actors.get("norbert-modern-neutral")!;
        const t = textures.get(a.asset.url)!;
        plane(g, t, phone ? 0.43 : 0.9, phone ? 0.82 : 1.45, [0, -0.05, 0.085]);
        if (type === "socialPhoto") {
          plane(
            g,
            textures.get(actors.get("traveler-jacket")!.asset.url)!,
            0.75,
            1.3,
            [-0.9, -0.15, 0.08],
          );
          plane(
            g,
            textures.get(actors.get("traveler-coat")!.asset.url)!,
            0.65,
            1.15,
            [0.95, -0.2, 0.08],
          );
        }
      }
    } else if (type === "bench") {
      for (let i = 0; i < 3; i++) {
        box(g, [1.05, 0.15, 0.65], [-1.2 + i * 1.2, 0.77, 0], "#344f5a", 0.06);
        box(
          g,
          [1.05, 0.85, 0.13],
          [-1.2 + i * 1.2, 1.2, -0.3],
          "#3c5862",
          0.06,
        );
      }
      for (const x of [-1.7, 1.7])
        box(g, [0.12, 0.72, 0.12], [x, 0.36, 0], "#66787b");
    } else if (type === "rockTray") {
      box(g, [1.6, 0.11, 0.75], [0, 0, 0], "#9ba7a9");
      const r = new THREE.Group();
      g.add(r);
      stone(r);
      updaters.set(g, (t) => {
        r.position.set(lerp(-0.55, 0.55, smooth(t / 1.6)), 0.19, 0);
        r.rotation.z = -t * 0.4;
      });
    } else if (type === "rockBlink") {
      const rock = stone(g, 3);
      rock.position.y = 0.08;
      box(g, [2.3, 0.2, 1.2], [0, -0.37, -0.15], "#365460", 0.08);
      const eyes: THREE.Mesh[] = [];
      for (const x of [-0.16, 0.16]) {
        const eye = new THREE.Mesh(
          new THREE.SphereGeometry(0.035, 12, 10),
          material("#242e30"),
        );
        eye.position.set(x, 0.14, 0.37);
        g.add(eye);
        eyes.push(eye);
      }
      updaters.set(g, (t) => {
        const blink = t > 0.75 && t < 0.93;
        for (const eye of eyes) {
          eye.visible = t > 0.45;
          eye.scale.y = blink ? 0.12 : 1;
        }
      });
    } else throw new Error(`Unknown immortal prop: ${type}`);
    g.userData.prop = p;
    return g;
  }
  function hide() {
    root.visible = false;
    propsRoot.children.forEach((x) => {
      x.visible = false;
    });
  }
  function render(shot: Plan["shots"][number], time: number) {
    const s = shot.stage!;
    const local = time - shot.start;
    const p = smooth(local / shot.duration);
    root.visible = true;
    const [cx, cy, zoom] = s.camera;
    const isPlate = !!s.plate;
    camera.position.set(cx, cy + (isPlate ? 0 : (s.tilt ?? 0.8)), 14);
    camera.lookAt(cx, cy, 0);
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
    bg.position
      .set(cx, cy, 0)
      .addScaledVector(camera.getWorldDirection(new THREE.Vector3()), 4.5);
    bg.quaternion.copy(camera.quaternion);
    bg.scale.set(1.004 / zoom, 1.004 / zoom, 1);
    bgMaterial.map = textures.get(plan.backgrounds[s.background]) ?? null;
    if (!bgMaterial.map) throw new Error(`Missing background ${s.background}`);
    shadow.visible = !isPlate;
    dust.visible = !isPlate;
    if (s.plate) {
      const plate = actors.get(s.plate);
      if (!plate) throw new Error(`Missing scene animation ${s.plate}`);
      const frame =
        s.plateFrame ??
        Math.floor(
          local / ((plate.asset.animation?.frameDurationMs ?? 300) / 1000),
        );
      plate.show(0, 0, -4, camera, frame);
      plate.mesh.visible = false;
      bgMaterial.map = plate.texture;
      if (s.plateFocus) {
        const [u, v, scale] = s.plateFocus;
        const rx = plate.texture.repeat.x,
          ry = plate.texture.repeat.y;
        plate.texture.repeat.set(rx / scale, ry / scale);
        plate.texture.offset.x += rx * (u - 0.5 / scale);
        plate.texture.offset.y += ry * (v - 0.5 / scale);
      }
    }
    for (const a of s.actors) {
      const q = a.reaction ? local - a.reaction.at : -99;
      const reacting = a.reaction && q >= 0 && q < a.reaction.duration;
      const actor = actors.get(reacting ? a.reaction!.id : a.id);
      if (!actor) throw new Error(`Missing full-film actor ${a.id}`);
      const frame =
        a.frame ??
        Math.floor(
          local / ((actor.asset.animation?.frameDurationMs ?? 200) / 1000),
        );
      const x =
        a.endX === undefined
          ? a.x
          : lerp(a.x, a.endX, smooth(local / Math.min(2.3, shot.duration)));
      const y =
        a.y +
        (a.walk && local < 2.3 ? Math.abs(Math.sin(local * 7)) * 0.018 : 0);
      actor.show(x, y, a.z, camera, frame, a.flip, a.scale);
      // Small purposeful shifts only; no general-purpose body bounce or camera orbit.
      if (a.walk && a.endX !== undefined)
        actor.mesh.rotation.z = Math.sin(local * 7) * 0.012 * (1 - p);
      else if (a.reaction) {
        const anticipation = q < 0 ? Math.max(0, 1 + q / 0.35) * 0.025 : 0;
        const recoil = reacting
          ? -0.075 * Math.sin(Math.min(1, q / a.reaction.duration) * Math.PI)
          : 0;
        actor.mesh.rotation.z = anticipation + recoil;
      } else actor.mesh.rotation.z = 0;
    }
    if (!propsByShot.has(shot.id))
      propsByShot.set(shot.id, s.props.map(makeProp));
    for (const g of propsByShot.get(shot.id)!) {
      g.visible = true;
      updaters.get(g)?.(local);
    }
    const arr = dust.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < 54; i++)
      arr.setY(i, -0.2 + ((i * 0.071 + time * 0.015) % 1) * 4);
    arr.needsUpdate = true;
  }
  return { hide, render };
}

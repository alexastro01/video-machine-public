import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { FateAsset, FatePlan } from "./types";

type V3 = [number, number, number];
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => {
  const p = clamp(v);
  return p * p * (3 - 2 * p);
};
const out = (v: number) => 1 - Math.pow(1 - clamp(v), 3);
const mix = (a: number, b: number, p: number) => a + (b - a) * p;
const fract = (v: number) => v - Math.floor(v);
function seed(index: number) {
  const v = Math.sin(index * 127.1 + 311.7) * 43758.5453123;
  return fract(v);
}

const materials = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: string, emit = 0, metal = 0) {
  const key = `${color}-${emit}-${metal}`;
  if (!materials.has(key))
    materials.set(
      key,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.72,
        metalness: metal,
        emissive: color,
        emissiveIntensity: emit,
      }),
    );
  return materials.get(key)!;
}
function box(
  parent: THREE.Object3D,
  size: V3,
  pos: V3,
  color: string,
  emit = 0,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat(color, emit));
  mesh.position.set(...pos);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function ball(
  parent: THREE.Object3D,
  radius: number,
  pos: V3,
  color: string,
  emit = 0,
  detail = 1,
) {
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(radius, detail),
    mat(color, emit),
  );
  mesh.position.set(...pos);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
function tube(
  parent: THREE.Object3D,
  points: V3[],
  color: string,
  radius = 0.02,
  emit = 0,
) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
  );
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 24, radius, 5, false),
    mat(color, emit),
  );
  parent.add(mesh);
  return mesh;
}
function point(
  parent: THREE.Object3D,
  color: string,
  power: number,
  pos: V3,
  distance = 9,
) {
  const light = new THREE.PointLight(color, power, distance, 2);
  light.position.set(...pos);
  parent.add(light);
  return light;
}
function label(
  text: string,
  color: string,
  background: string,
  w = 768,
  h = 512,
) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${Math.round(h * 0.23)}px Inter`;
  text
    .split("\n")
    .forEach((line, i, arr) =>
      ctx.fillText(line, w / 2, h / 2 + (i - (arr.length - 1) / 2) * h * 0.26),
    );
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

class Actor {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  texture: THREE.Texture;
  constructor(
    public asset: FateAsset,
    texture: THREE.Texture,
    parent: THREE.Group,
  ) {
    this.texture = texture;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      alphaTest: 0.45,
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide,
      emissive: 0xffffff,
      emissiveMap: texture,
      emissiveIntensity: 0.42,
      roughness: 1,
    });
    const height = asset.worldHeight;
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry((height * asset.width) / asset.height, height),
      material,
    );
    this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
      map: texture,
      alphaTest: 0.45,
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
    opacity = 1,
  ) {
    const a = this.asset,
      anim = a.animation;
    let foot = a.footY,
      pivot = a.pivotX;
    if (anim) {
      const index = Math.max(0, Math.min(anim.frameCount - 1, frame));
      const col = index % anim.columns,
        row = Math.floor(index / anim.columns),
        c = anim.crop;
      this.texture.repeat.set(c.width / anim.width, c.height / anim.height);
      this.texture.offset.set(
        (col * anim.cellWidth + c.x) / anim.width,
        1 - (row * anim.cellHeight + c.y + c.height) / anim.height,
      );
      foot = anim.cells[index].bottom + 1 - c.y;
      pivot = anim.cellWidth / 2 - c.x;
    }
    const width = (a.worldHeight * a.width) / a.height;
    this.mesh.position.set(
      x + width * (0.5 - pivot / a.width),
      y + a.worldHeight * (foot / a.height - 0.5),
      z,
    );
    this.mesh.rotation.y = Math.atan2(
      camera.position.x - x,
      camera.position.z - z,
    );
    this.mesh.material.opacity = opacity;
    this.mesh.visible = opacity > 0.01;
  }
}

export async function boot(canvas: HTMLCanvasElement, plan: FatePlan) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
  });
  renderer.setSize(plan.width, plan.height);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#182a3e");
  scene.fog = new THREE.Fog("#182a3e", 9, 27);
  const camera = new THREE.PerspectiveCamera(
    34,
    plan.width / plan.height,
    0.05,
    80,
  );
  const street = new THREE.Group(),
    mind = new THREE.Group(),
    busRoom = new THREE.Group();
  scene.add(street, mind, busRoom);
  const actors = new THREE.Group();
  scene.add(actors);
  const hemi = new THREE.HemisphereLight(0xbdd9e8, 0x34273b, 1.45);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffddb2, 2.4);
  key.position.set(-3, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -7;
  key.shadow.bias = -0.0003;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x83b5d9, 1.5);
  rim.position.set(3, 4, -4);
  scene.add(rim);
  const spellLight = point(scene, "#b5d993", 0, [0, 1.6, 2], 6);

  // Rainy street: the floor, curb, shelter, bus and buildings are real geometry.
  box(street, [36, 0.15, 24], [0, -0.15, -6], "#223344");
  box(street, [18, 0.18, 3.6], [0, -0.055, 0.65], "#647479");
  box(street, [18, 0.12, 0.16], [0, 0.03, -1.08], "#b7b9a5");
  for (let i = -8; i < 9; i++) {
    box(street, [0.018, 0.005, 3.3], [i * 0.6, 0.039, 0.7], "#465a66");
    box(street, [0.62, 0.006, 0.07], [i * 1.2, -0.06, -2.7], "#aaa989");
  }
  for (let i = 0; i < 12; i++) {
    const x = (i - 5.5) * 2.15,
      h = 2.7 + seed(i + 1) * 4;
    box(
      street,
      [1.8, h, 1.8],
      [x, h / 2 - 0.1, -7.4 - seed(i + 21) * 3],
      i % 2 ? "#354858" : "#40505d",
    );
    for (let row = 0; row < Math.floor(h / 0.6); row++)
      for (let col = 0; col < 3; col++) {
        if (seed(i * 21 + row * 3 + col) > 0.25)
          box(
            street,
            [0.24, 0.31, 0.025],
            [x - 0.55 + col * 0.55, 0.45 + row * 0.6, -6.48 - seed(i + 21) * 3],
            "#c2aa79",
            0.7,
          );
      }
  }
  // Warm shelter practicals contrast with the cool street.
  for (const x of [-1.65, 1.65])
    box(street, [0.08, 3.2, 0.08], [x, 1.6, -0.35], "#213946");
  box(street, [3.55, 0.13, 1.45], [0, 3.15, -0.5], "#314e59");
  box(street, [2.65, 0.035, 0.08], [0, 3.06, -0.1], "#f0c78b", 1.8);
  point(street, "#ffcb8b", 7, [0, 2.75, 0.75], 7);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: "#9bbdc5",
    transparent: true,
    opacity: 0.1,
    roughness: 0.2,
    metalness: 0.1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.9), glassMat);
  glass.position.set(0, 1.55, -0.42);
  street.add(glass);
  box(street, [2.65, 0.12, 0.48], [0, 0.48, -0.13], "#8e8878");
  for (const x of [-1, 1])
    box(street, [0.08, 0.43, 0.36], [x, 0.22, -0.13], "#263a46");
  const pole = box(street, [0.075, 3.1, 0.075], [1.15, 1.55, -0.5], "#667e84");
  const sign = box(street, [0.55, 0.45, 0.06], [1.15, 2.65, -0.48], "#c2c4ae");
  const busIcon = new THREE.Mesh(
    new THREE.PlaneGeometry(0.44, 0.34),
    new THREE.MeshBasicMaterial({
      map: label("BUS", "#243e4c", "#ded6b6", 384, 256),
    }),
  );
  busIcon.position.set(1.15, 2.65, -0.44);
  street.add(busIcon);
  pole.name = "bus-stop-pole";
  sign.name = "bus-stop-sign";
  for (let i = 0; i < 10; i++) {
    const puddle = new THREE.Mesh(
      new THREE.CircleGeometry(0.2 + seed(i + 92) * 0.4, 24),
      new THREE.MeshStandardMaterial({
        color: "#698a9a",
        roughness: 0.12,
        metalness: 0.45,
        transparent: true,
        opacity: 0.3,
      }),
    );
    puddle.rotation.x = -Math.PI / 2;
    puddle.scale.y = 0.35;
    puddle.position.set((seed(i + 7) - 0.5) * 7, 0.042, seed(i + 31) * 2 - 0.5);
    street.add(puddle);
  }
  function makeBus(parent: THREE.Group) {
    const b = new THREE.Group();
    parent.add(b);
    box(b, [3.8, 1.55, 1.2], [0, 1.03, 0], "#396e7d");
    box(b, [3.85, 0.16, 1.23], [0, 1.88, 0], "#9daea8");
    box(b, [3.72, 0.15, 1.23], [0, 0.66, 0], "#c1b99b");
    for (let i = 0; i < 5; i++) {
      box(b, [0.51, 0.57, 0.025], [-1.35 + i * 0.63, 1.47, 0.616], "#253a49");
      box(
        b,
        [0.4, 0.035, 0.028],
        [-1.35 + i * 0.63, 1.66, 0.636],
        "#c3a16e",
        0.8,
      );
    }
    for (const x of [-1.28, 1.28])
      for (const z of [-0.61, 0.61]) {
        const tyre = new THREE.Mesh(
          new THREE.CylinderGeometry(0.32, 0.32, 0.13, 16),
          mat("#1a2731"),
        );
        tyre.rotation.x = Math.PI / 2;
        tyre.name = "bus-wheel";
        tyre.position.set(x, 0.38, z);
        b.add(tyre);
        const hub = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.15, 0.142, 12),
          mat("#7b8d91"),
        );
        hub.rotation.x = Math.PI / 2;
        hub.name = "bus-wheel";
        hub.position.copy(tyre.position);
        b.add(hub);
      }
    box(b, [0.08, 0.18, 0.24], [-1.92, 1.05, 0.38], "#efd5a0", 1.5);
    box(b, [0.06, 0.16, 0.16], [1.92, 0.95, 0.4], "#c27461", 0.65);
    box(b, [0.035, 0.66, 0.92], [-1.93, 1.46, 0], "#253a49");
    for (const z of [-0.38, 0.38])
      box(b, [0.055, 0.17, 0.16], [-1.97, 0.86, z], "#efd5a0", 1.2);
    return b;
  }
  const bus = makeBus(street);
  bus.scale.setScalar(0.72);
  bus.position.z = -1.9;
  const splash = new THREE.Group();
  street.add(splash);
  for (let i = 0; i < 26; i++)
    ball(splash, 0.018 + seed(i + 201) * 0.027, [0, 0, 0], "#a8c7cf", 0.1, 0);

  const rainCount = 420,
    rainGeo = new THREE.BufferGeometry(),
    rainData = new Float32Array(rainCount * 6);
  rainGeo.setAttribute("position", new THREE.BufferAttribute(rainData, 3));
  const rain = new THREE.LineSegments(
    rainGeo,
    new THREE.LineBasicMaterial({
      color: "#b4d3df",
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    }),
  );
  street.add(rain);

  // Imported meshes retain authored page curvature, brain folds and cloud form.
  // Blender normalizes their scale and splits the book at its natural gutter.
  if (!plan.models)
    throw new Error("Fate prop models are missing from the plan");
  const loader = new GLTFLoader();
  const [bookFile, brainFile, cloudFile] = await Promise.all([
    loader.loadAsync(plan.models.book),
    loader.loadAsync(plan.models.brain),
    loader.loadAsync(plan.models.cloud),
  ]);
  for (const file of [bookFile, brainFile, cloudFile])
    file.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  const book = new THREE.Group();
  scene.add(book);
  book.add(bookFile.scene);
  function bookHalf(name: string): THREE.Object3D {
    const node = bookFile.scene.getObjectByName(name);
    if (!node) throw new Error(`Imported book is missing ${name}`);
    return node;
  }
  const left = bookHalf("Book_Left"),
    right = bookHalf("Book_Right");
  const title = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 0.6),
    new THREE.MeshStandardMaterial({
      map: label("BOOK\nOF FATE", "#e0c78a", "#573937"),
      emissive: 0x4e392d,
      emissiveIntensity: 0.08,
      roughness: 0.8,
    }),
  );
  title.position.set(-0.46, 0, -0.32);
  title.rotation.y = Math.PI;
  left.add(title);
  const brain = new THREE.Group();
  mind.add(brain);
  brain.add(brainFile.scene);
  const brainAura = new THREE.PointLight(0xe9bb85, 1.1, 5, 2);
  brain.add(brainAura);
  brainAura.position.set(0, 0.4, 0.7);
  const mindFloor = box(mind, [24, 0.1, 20], [0, -0.4, -5], "#29283d");
  mindFloor.visible = false;
  const neural = new THREE.Group();
  mind.add(neural);
  for (let i = 0; i < 14; i++) {
    const angle = i * 2.39996;
    ball(
      neural,
      0.028,
      [
        Math.cos(angle) * (1.0 + seed(i) * 0.5),
        1.5 + Math.sin(angle) * 1.1,
        -0.4 - seed(i + 64),
      ],
      "#c8ac77",
      0.6,
      0,
    );
  }

  const clouds = new THREE.Group();
  mind.add(clouds);
  const cloudMesh = cloudFile.scene;
  cloudMesh.scale.setScalar(0.64);
  cloudMesh.position.y = 1.7;
  clouds.add(cloudMesh);
  // A brief translucent profile traces an interpretation in the cloud.
  // No attached eyes, glowing pupils or smiling mouth.
  const profileCurve = new THREE.CatmullRomCurve3(
    [
      [-0.28, 0.48, 0.7],
      [0.02, 0.48, 0.76],
      [0.23, 0.36, 0.8],
      [0.28, 0.16, 0.82],
      [0.47, -0.01, 0.84],
      [0.29, -0.06, 0.83],
      [0.28, -0.17, 0.81],
      [0.34, -0.23, 0.8],
      [0.24, -0.35, 0.78],
      [0.03, -0.4, 0.73],
    ].map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  );
  const cloudProfile = new THREE.Mesh(
    new THREE.TubeGeometry(profileCurve, 48, 0.018, 6, false),
    new THREE.MeshBasicMaterial({
      color: "#ead6b2",
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    }),
  );
  cloudProfile.renderOrder = 3;
  cloudMesh.add(cloudProfile);
  cloudMesh.traverse((object) => {
    if (
      object instanceof THREE.Mesh &&
      object.material instanceof THREE.MeshStandardMaterial
    ) {
      object.material.emissive.set("#728390");
      object.material.emissiveIntensity = 0.28;
    }
  });
  const pattern = new THREE.Group();
  mind.add(pattern);
  const patternPoints: V3[] = [
    [-0.48, 1.9, 0.2],
    [0.48, 1.9, 0.2],
    [-0.6, 1.3, 0.2],
    [0, 1.14, 0.2],
    [0.6, 1.3, 0.2],
    [-0.2, 2.3, 0.2],
    [0.7, 2.3, 0.2],
    [-0.8, 2.12, 0.2],
  ];
  for (const p of patternPoints) ball(pattern, 0.055, p, "#e1c68b", 0.4, 1);
  const links = new THREE.Group();
  pattern.add(links);
  for (const [a, b] of [
    [0, 5],
    [5, 1],
    [1, 4],
    [4, 3],
    [3, 2],
  ])
    tube(links, [patternPoints[a], patternPoints[b]], "#b4bda2", 0.013, 0.12);

  // Bus interior: the pixel actors sit against native seat and window geometry.
  box(busRoom, [5, 0.15, 5], [0, -0.09, 0], "#514e49");
  box(busRoom, [4.6, 3.7, 0.16], [0, 1.8, -0.75], "#465f69");
  box(busRoom, [4.65, 0.16, 2], [0, 3.5, -0.1], "#b6b4a1");
  box(busRoom, [3.6, 0.035, 0.1], [0, 3.35, 0.4], "#e5bd7c", 1.8);
  point(busRoom, "#ffd09a", 9, [0, 2.7, 1.2], 7);
  for (const x of [-1.1, 1.1]) {
    box(busRoom, [1.7, 1.15, 0.06], [x, 2.3, -0.65], "#162e42");
    for (const y of [1.7, 2.89])
      box(busRoom, [1.8, 0.055, 0.11], [x, y, -0.59], "#c5b89b");
    for (const xx of [x - 0.87, x + 0.87])
      box(busRoom, [0.055, 1.25, 0.11], [xx, 2.3, -0.59], "#c5b89b");
  }
  for (const x of [-0.59, 0.59]) {
    box(busRoom, [1.02, 0.18, 0.75], [x, 0.6, -0.03], "#9a977d");
    box(busRoom, [1.03, 0.76, 0.17], [x, 1.06, -0.38], "#8e9f8f");
    for (const xx of [x - 0.38, x + 0.38])
      box(busRoom, [0.065, 0.52, 0.5], [xx, 0.27, -0.09], "#344a54");
  }
  const passingLights = new THREE.Group();
  busRoom.add(passingLights);
  for (let i = 0; i < 12; i++)
    box(
      passingLights,
      [0.025, 0.33, 0.005],
      [-2 + i * 0.36, 2.4, -0.61],
      "#d3b580",
      0.6,
    );
  // Foreground bus window for the street-side witch reaction. Its aperture is
  // open geometry, so the actor and rainy street remain behind the frame.
  const reactionWindow = new THREE.Group();
  scene.add(reactionWindow);
  for (const x of [-0.62, 1.12])
    box(reactionWindow, [0.13, 2.6, 0.16], [x, 1.88, 1.02], "#c1b493");
  box(reactionWindow, [1.87, 0.14, 0.24], [0.25, 0.94, 1.03], "#c1b493");
  box(reactionWindow, [1.87, 0.11, 0.18], [0.25, 2.97, 1.02], "#c1b493");
  box(reactionWindow, [2.1, 1.4, 0.14], [0.25, 0.17, 1.0], "#465f69");
  const puffGroup = new THREE.Group();
  scene.add(puffGroup);
  const puffMaterials: THREE.MeshStandardMaterial[] = [];
  for (let i = 0; i < 24; i++) {
    const material = new THREE.MeshStandardMaterial({
      color: i % 2 ? "#90b6a0" : "#658f85",
      emissive: "#698e7a",
      emissiveIntensity: 0.12,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      roughness: 1,
    });
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.16, 1),
      material,
    );
    puffGroup.add(mesh);
    puffMaterials.push(material);
  }

  const loaded = await Promise.all(
    plan.assets.map(async (asset) => {
      const texture = await new THREE.TextureLoader().loadAsync(asset.url);
      return [asset.id, new Actor(asset, texture, actors)] as const;
    }),
  );
  const cast = new Map(loaded);
  let skyPlate: THREE.Mesh | undefined;
  await Promise.all(
    Object.entries(plan.scenery ?? {}).map(async ([kind, url]) => {
      const texture = await new THREE.TextureLoader().loadAsync(url);
      texture.colorSpace = THREE.SRGBColorSpace;
      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(
          kind === "street" ? 11.5 : 4.4,
          kind === "street" ? 6.47 : 6.6,
        ),
        new THREE.MeshBasicMaterial({
          map: texture,
          color: kind === "street" ? 0xb2c0c7 : 0xffffff,
        }),
      );
      if (kind === "street") {
        plate.position.set(0, 3.15, -5.45);
        street.add(plate);
      } else {
        plate.position.set(0, 1.7, -2.7);
        mind.add(plate);
        skyPlate = plate;
      }
    }),
  );
  const show = (
    id: string,
    x: number,
    y = 0,
    z = 0.72,
    frame = 0,
    opacity = 1,
  ) => cast.get(id)?.show(x, y, z, camera, frame, opacity);
  const gifFrame = (id: string, t: number, cue: number) => {
    const asset = cast.get(id)?.asset.animation;
    return asset
      ? Math.min(
          asset.frameCount - 1,
          Math.floor(Math.max(0, t - cue) / (asset.frameDurationMs / 1000)),
        )
      : 0;
  };

  function renderAt(input: number) {
    const frame = Math.round(input * plan.fps);
    let t = frame / plan.fps;
    const E = plan.events;
    if (t >= plan.duration - 2 / plan.fps) t = 0;
    const shot =
      plan.shots.find((s) => t >= s.start && t < s.start + s.duration) ??
      plan.shots[0];
    const local = t - shot.start,
      progress = clamp(local / shot.duration);
    for (const actor of cast.values()) actor.mesh.visible = false;
    street.visible = true;
    mind.visible = false;
    busRoom.visible = false;
    reactionWindow.visible = false;
    book.visible = false;
    puffGroup.visible = false;
    spellLight.intensity = 0;
    brain.visible = false;
    clouds.visible = false;
    pattern.visible = false;
    neural.visible = false;
    if (skyPlate) skyPlate.visible = false;
    hemi.intensity = 0.75;
    key.intensity = 1.2;
    key.color.set("#ffdfb7");
    rim.intensity = 0.6;
    scene.background = new THREE.Color("#182a3e");
    scene.fog = new THREE.Fog("#182a3e", 9, 27);
    renderer.toneMappingExposure = 0.95;
    camera.fov = 34;
    const position = new THREE.Vector3(0, 1.75, 8.3),
      target = new THREE.Vector3(0, 1.42, 0.4);
    if (shot.id === "missed-bus") {
      position.set(
        mix(0.3, 0.12, out(progress)),
        1.72,
        mix(10.0, 7.7, ease(progress)),
      );
      target.set(0.05, 1.6, 0.6);
    } else if (shot.id === "witch") {
      position.set(0.1, 1.85, 8.4 - 0.25 * ease(progress));
      target.set(0.1, 1.5, 0.5);
    } else if (shot.id === "hope") {
      position.set(-0.58, 1.78, 4.35 - 0.18 * ease(progress));
      target.set(-0.57, 1.6, 0.7);
    } else if (shot.id === "empty-book") {
      position.set(0, 1.72, 7.2 - 0.12 * ease(progress));
      target.set(0, 1.4, 0.8);
    } else if (shot.id === "excuse") {
      position.set(-0.6, 1.75, 4.25);
      target.set(-0.58, 1.62, 0.75);
    } else if (shot.id === "answer") {
      position.set(0.1, 1.8, 9.1 - 0.15 * ease(progress));
      target.set(0.24, 1.52, 0.7);
    } else if (["brain", "clouds", "patterns"].includes(shot.id)) {
      street.visible = false;
      mind.visible = true;
      scene.background = new THREE.Color("#29283d");
      scene.fog = new THREE.Fog("#29283d", 8, 22);
      position.set(
        mix(0.12, -0.1, ease(progress)),
        1.7,
        5.8 - 0.22 * ease(progress),
      );
      target.set(0, 1.7, 0);
      key.color.set("#e9d4b6");
      key.intensity = 1.3;
      if (skyPlate) skyPlate.visible = shot.id !== "brain";
    } else if (shot.id === "even-me") {
      position.set(-0.55, 1.8, 4.35);
      target.set(-0.57, 1.65, 0.7);
    } else if (shot.id === "everyone") {
      position.set(0.58, 1.97, 5.4 - 0.12 * ease(progress));
      target.set(0.64, 1.8, 0.7);
    } else if (shot.id === "bus") {
      street.visible = false;
      busRoom.visible = true;
      position.set(0, 1.5, 7.2 - 0.15 * ease(progress));
      target.set(0, 1.1, 0.45);
      key.color.set("#ffe2b7");
      key.intensity = 1.1;
      scene.background = new THREE.Color("#3d4b54");
      scene.fog = null;
    } else if (shot.id === "eye-roll") {
      reactionWindow.visible = true;
      position.set(0.25, 1.92, 5.9);
      target.set(0.25, 1.8, 0.55);
      key.color.set("#ffe2b7");
      key.intensity = 1.1;
      scene.fog = null;
    }
    camera.position.copy(position);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    const busTime = shot.id === "missed-bus" ? t : t + 2.8;
    bus.position.set(
      -0.1 - 2.45 * busTime - 1.3 * busTime * busTime,
      -0.13,
      -1.9,
    );
    bus.rotation.y = 0.24;
    bus.children.forEach((child) => {
      if (child.name === "bus-wheel") child.rotation.z = -bus.position.x / 0.32;
    });
    splash.visible = t < 1.0;
    splash.children.forEach((child, i) => {
      const age = t + seed(i + 251) * 0.2;
      child.position.set(
        -0.45 - seed(i + 100) * 1.7 - age * 1.2,
        0.05 + Math.max(0, Math.sin(age * 4 + i * 0.25)) * 0.5,
        -0.9 + seed(i + 17) * 0.7,
      );
      child.scale.setScalar(Math.max(0.05, 1 - age));
    });
    for (let i = 0; i < rainCount; i++) {
      const x = (seed(i + 3) - 0.5) * 13,
        y = fract(seed(i + 999) - t * 0.85) * 7,
        z = seed(i + 173) * 12 - 6;
      rainData.set([x, y, z, x - 0.035, y - 0.2, z], i * 6);
    }
    rainGeo.attributes.position.needsUpdate = true;
    passingLights.position.x = fract(t * 0.2) * 0.36;
    const baseMiko =
      shot.id === "hope" || shot.id === "witch"
        ? "miko-hopeful"
        : shot.id === "bus"
          ? "miko-seated"
          : "miko-baffled";
    if (street.visible && shot.id !== "eye-roll") {
      if (shot.id === "missed-bus")
        show(
          cast.has("miko-wet-gif") ? "miko-wet-gif" : "miko-wet",
          0.32,
          0,
          0.78,
          gifFrame("miko-wet-gif", t, 0),
        );
      else show(baseMiko, -0.63, 0, 0.78);
      if (t >= E.witchAppear) {
        if (shot.id === "everyone") show("witch-idle", 0.65, 0, 0.7);
        else if (
          t >= E.wand &&
          t < E.bookAppear + 0.3 &&
          cast.has("witch-cast-gif")
        )
          show(
            "witch-cast-gif",
            0.66,
            0,
            0.68,
            gifFrame("witch-cast-gif", t, E.wand),
          );
        else
          show(
            t >= E.bookAppear ? "witch-present" : "witch-idle",
            0.65,
            0,
            0.68,
            0,
            out((t - E.witchAppear) / 0.28),
          );
      }
    }
    if (t >= E.witchAppear - 0.05 && t < E.witchAppear + 0.75) {
      puffGroup.visible = true;
      const age = clamp((t - E.witchAppear + 0.05) / 0.8);
      puffGroup.children.forEach((child, i) => {
        const angle = i * 2.4;
        child.position.set(
          0.66 + Math.cos(angle) * (0.12 + age * 0.6),
          0.3 + (i % 7) * 0.27 + age * 0.45,
          0.9 + Math.sin(angle) * 0.25,
        );
        child.scale.setScalar(0.6 + Math.sin(age * Math.PI) * 1.5);
        puffMaterials[i].opacity = Math.sin(age * Math.PI) * 0.32;
      });
      spellLight.intensity = Math.sin(age * Math.PI) * 3;
    }
    if (t >= E.bookAppear - 0.18 && t < E.brain + 0.33) {
      book.visible = true;
      const arrival = out((t - E.bookAppear + 0.18) / 0.4),
        opened = ease((t - E.bookOpen) / 0.42),
        morph = ease((t - E.brain) / 0.33);
      book.position.set(-0.4 * (1 - opened), 1.1 + 0.18 * (1 - arrival), 1.0);
      book.scale.setScalar(Math.max(0.001, arrival * (1 - morph)));
      book.rotation.set(
        0.07 * (1 - opened),
        0,
        0.06 * (1 - arrival) + morph * 0.2,
      );
      left.rotation.y = mix(Math.PI - 0.1, -0.1, opened);
      left.position.z = mix(0.08, 0, opened);
      right.rotation.y = 0.1;
      if (shot.id === "empty-book") {
        cast.forEach((actor) => (actor.mesh.visible = false));
        book.position.y = 1.72;
        book.scale.multiplyScalar(1.02);
      } else if (shot.id === "excuse" || shot.id === "answer") {
        book.position.y = 0.73;
        book.scale.multiplyScalar(0.65);
      }
    }
    if (shot.id === "brain") {
      brain.visible = true;
      const appear = out((t - E.brain) / 0.4);
      brain.position.set(0, 1.66, 0);
      brain.scale.setScalar(Math.max(0.001, appear));
      brain.rotation.y = 0.85 + progress * 0.3;
      neural.visible = true;
      neural.rotation.z = progress * 0.16;
    }
    if (shot.id === "clouds") {
      clouds.visible = true;
      clouds.position.x = mix(-0.12, 0.1, ease(progress));
      cloudMesh.rotation.y = mix(-0.12, 0.12, ease(progress));
      const interpretation = clamp((t - E.face) / 0.95);
      cloudProfile.material.opacity = Math.sin(interpretation * Math.PI) * 0.8;
    }
    if (shot.id === "patterns") {
      pattern.visible = true;
      const hasPattern = t < E.noPattern;
      links.visible = t >= E.connections && hasPattern;
      pattern.children.forEach((child, i) => {
        if (i < patternPoints.length) {
          const release = out((t - E.noPattern) / 0.5);
          child.position.x =
            patternPoints[i][0] + release * Math.cos(i * 2.1) * 0.25;
          child.position.y =
            patternPoints[i][1] + release * Math.sin(i * 1.7) * 0.2;
        }
      });
      pattern.rotation.z = hasPattern ? 0 : mix(0, 0.12, ease(progress));
    }
    if (busRoom.visible) {
      if (shot.id === "bus") {
        show("miko-seated", -0.54, 0, 0.6);
        show(
          cast.has("girl-smile-gif") ? "girl-smile-gif" : "girl-seated-curious",
          0.58,
          0,
          0.68,
          gifFrame("girl-smile-gif", t, E.girlSmile),
        );
      }
    }
    if (shot.id === "eye-roll") {
      show(
        cast.has("witch-eye-roll-gif")
          ? "witch-eye-roll-gif"
          : "witch-eye-roll",
        0.25,
        0,
        0.62,
        gifFrame("witch-eye-roll-gif", t, E.eyeRoll),
      );
    }
    // The passing bus provides a physical wipe before the replay frame.
    if (t >= E.loop && t < plan.duration - 2 / plan.fps) {
      busRoom.visible = false;
      reactionWindow.visible = false;
      street.visible = true;
      mind.visible = false;
      book.visible = false;
      cast.forEach((actor) => (actor.mesh.visible = false));
      const p = out((t - E.loop) / (plan.duration - E.loop));
      bus.position.set(mix(3.8, -3.8, p), 0, 2.3);
    }
    const zero = document.getElementById("empty-label");
    if (zero)
      zero.style.opacity = shot.id === "empty-book" && t >= E.empty ? "1" : "0";
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

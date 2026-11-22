import * as THREE from "three";
import type { SpyAsset, SpyPlan } from "./types";

type V3 = [number, number, number];
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => {
  const p = clamp(v);
  return p * p * (3 - 2 * p);
};
const out = (v: number) => 1 - (1 - clamp(v)) ** 3;
const mix = (a: number, b: number, p: number) => a + (b - a) * p;
const seed = (i: number) => {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const materials = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: string, emit = 0, metalness = 0) {
  const key = `${color}:${emit}:${metalness}`;
  if (!materials.has(key))
    materials.set(
      key,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.68,
        metalness,
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
  metal = 0,
) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    mat(color, emit, metal),
  );
  mesh.position.set(...pos);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function cylinder(
  parent: THREE.Object3D,
  radius: number,
  height: number,
  pos: V3,
  color: string,
  segments = 12,
  emit = 0,
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, segments),
    mat(color, emit),
  );
  mesh.position.set(...pos);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function point(
  parent: THREE.Object3D,
  color: string,
  power: number,
  pos: V3,
  distance = 8,
) {
  const light = new THREE.PointLight(color, power, distance, 2);
  light.position.set(...pos);
  parent.add(light);
  return light;
}
function label(text: string, color: string, w = 768, h = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${Math.round(h * 0.62)}px 'DM Sans'`;
  ctx.fillText(text, w / 2, h / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function textPlane(
  parent: THREE.Object3D,
  text: string,
  color: string,
  size: [number, number],
  pos: V3,
) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(...size),
    new THREE.MeshBasicMaterial({
      map: label(text, color),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  mesh.position.set(...pos);
  parent.add(mesh);
  return mesh;
}

class Actor {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  texture: THREE.Texture;
  constructor(
    public asset: SpyAsset,
    texture: THREE.Texture,
    parent: THREE.Object3D,
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
      emissiveIntensity: 0.38,
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
    scale = 1,
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
      x + width * (0.5 - pivot / a.width) * scale,
      y + a.worldHeight * (foot / a.height - 0.5) * scale,
      z,
    );
    this.mesh.rotation.set(
      0,
      Math.atan2(camera.position.x - x, camera.position.z - z),
      0,
    );
    this.mesh.scale.setScalar(scale);
    this.mesh.material.opacity = opacity;
    this.mesh.visible = opacity > 0.01;
  }
}

function gpuModel(parent: THREE.Object3D) {
  const root = new THREE.Group();
  parent.add(root);
  // Whole card: PCB, shroud, two inset fans, heatsink, connector and bracket.
  box(root, [1.48, 0.62, 0.13], [0, 0, 0], "#243731", 0, 0.15);
  box(root, [1.42, 0.57, 0.12], [0, 0.025, 0.095], "#303c44", 0, 0.35);
  for (let i = 0; i < 16; i++)
    box(
      root,
      [0.04, 0.45, 0.1],
      [-0.61 + i * 0.082, 0.02, -0.1],
      "#88949a",
      0,
      0.65,
    );
  for (const x of [-0.36, 0.36]) {
    const ring = cylinder(root, 0.245, 0.045, [x, 0.035, 0.185], "#131d23", 20);
    ring.rotation.x = Math.PI / 2;
    const inner = cylinder(
      root,
      0.204,
      0.052,
      [x, 0.035, 0.211],
      "#53636b",
      20,
    );
    inner.rotation.x = Math.PI / 2;
    for (let i = 0; i < 9; i++) {
      const a = (i * Math.PI * 2) / 9;
      const blade = box(
        root,
        [0.095, 0.166, 0.018],
        [x + Math.sin(a) * 0.115, 0.035 + Math.cos(a) * 0.115, 0.246],
        "#273943",
        0,
        0.2,
      );
      blade.rotation.z = -a - 0.45;
    }
    const hub = cylinder(root, 0.063, 0.035, [x, 0.035, 0.267], "#8b9f9b", 12);
    hub.rotation.x = Math.PI / 2;
  }
  box(root, [1.05, 0.068, 0.11], [0.06, -0.326, -0.005], "#c6a15d", 0, 0.6);
  for (let i = 0; i < 21; i++)
    box(
      root,
      [0.008, 0.064, 0.014],
      [-0.44 + i * 0.047, -0.326, 0.06],
      "#766847",
    );
  box(root, [0.065, 0.76, 0.18], [-0.775, -0.015, -0.01], "#9da9ab", 0, 0.7);
  for (let i = 0; i < 3; i++)
    box(root, [0.055, 0.08, 0.012], [-0.78, -0.19 + i * 0.15, 0.09], "#17272f");
  box(root, [0.62, 0.022, 0.02], [0.1, 0.322, 0.09], "#9ba78a", 0.12);
  return root;
}
function laptopModel(parent: THREE.Object3D) {
  const root = new THREE.Group();
  parent.add(root);
  box(root, [1.18, 0.045, 0.69], [0, 0, 0], "#93a2a5", 0, 0.4);
  box(root, [0.98, 0.012, 0.38], [0, 0.029, -0.08], "#30454e");
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 10; col++)
      box(
        root,
        [0.064, 0.008, 0.048],
        [-0.414 + col * 0.092, 0.039, -0.225 + row * 0.081],
        "#71848a",
      );
  box(root, [0.26, 0.008, 0.12], [0, 0.034, 0.224], "#798f95");
  const hinge = new THREE.Group();
  hinge.position.set(0, 0, -0.31);
  root.add(hinge);
  const panel = box(
    hinge,
    [1.18, 0.73, 0.045],
    [0, 0.365, 0],
    "#86999e",
    0,
    0.4,
  );
  const screen = box(
    hinge,
    [1.07, 0.62, 0.015],
    [0, 0.365, 0.035],
    "#1c3947",
    0.1,
  );
  const chip = box(
    hinge,
    [0.28, 0.25, 0.018],
    [0, 0.365, 0.053],
    "#94afa6",
    0.1,
  );
  for (let i = 0; i < 5; i++) {
    box(
      hinge,
      [0.035, 0.012, 0.01],
      [-0.158, 0.28 + i * 0.041, 0.065],
      "#bac5b3",
    );
    box(
      hinge,
      [0.035, 0.012, 0.01],
      [0.158, 0.28 + i * 0.041, 0.065],
      "#bac5b3",
    );
  }
  const igpu = textPlane(
    hinge,
    "iGPU",
    "#233d48",
    [0.24, 0.08],
    [0, 0.365, 0.07],
  );
  hinge.rotation.x = -0.12;
  return { root, hinge, screen, chip, panel, igpu };
}

export async function boot(canvas: HTMLCanvasElement, plan: SpyPlan) {
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
  renderer.toneMappingExposure = 0.96;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#152b3c");
  scene.fog = new THREE.Fog("#152b3c", 10, 23);
  const camera = new THREE.PerspectiveCamera(
    36,
    plan.width / plan.height,
    0.06,
    45,
  );
  const hemi = new THREE.HemisphereLight("#b7d5df", "#9b7958", 1.0);
  scene.add(hemi);
  const key = new THREE.DirectionalLight("#ffdbab", 1.55);
  key.position.set(-3, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -5;
  key.shadow.camera.right = 5;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -3;
  key.shadow.normalBias = 0.035;
  scene.add(key);
  const rim = new THREE.DirectionalLight("#8ab6c7", 0.65);
  rim.position.set(4, 4, -4);
  scene.add(rim);
  const castRoot = new THREE.Group();
  scene.add(castRoot);
  const loader = new THREE.TextureLoader();
  const textures = await Promise.all(
    plan.assets.map((a) => loader.loadAsync(a.url)),
  );
  const cast = new Map(
    plan.assets.map((a, i) => [a.id, new Actor(a, textures[i], castRoot)]),
  );
  const home = new THREE.Group(),
    servers = new THREE.Group(),
    bar = new THREE.Group();
  scene.add(home, servers, bar);
  // Home is a real room, with a door opening rather than a door pasted onto a wall.
  box(home, [9, 0.15, 8], [0, -0.1, -1], "#b29870");
  for (let i = 0; i < 28; i++)
    box(home, [0.012, 0.009, 8], [-4.4 + i * 0.33, -0.018, -1], "#8e805f");
  box(home, [5.4, 4.8, 0.18], [-1.8, 2.4, -2.15], "#3e676b");
  box(home, [2.2, 4.8, 0.18], [3.4, 2.4, -2.15], "#3e676b");
  box(home, [1.5, 1.8, 0.18], [1.6, 3.9, -2.15], "#3e676b");
  box(home, [0.16, 4.8, 8], [-4.5, 2.4, -1], "#304e5a");
  box(home, [9, 0.13, 0.2], [0, 0.05, -2.03], "#c2a278");
  box(home, [2.15, 1.65, 0.04], [-1.88, 2.65, -2.025], "#71949f", 0.06);
  for (const x of [-2.96, -1.88, -0.8])
    box(home, [0.065, 1.76, 0.1], [x, 2.65, -1.98], "#c2ac84");
  for (const y of [1.8, 2.65, 3.5])
    box(home, [2.23, 0.065, 0.1], [-1.88, y, -1.98], "#c2ac84");
  for (let i = 0; i < 13; i++) {
    const h = 0.12 + seed(i + 21) * 0.56;
    box(
      home,
      [0.12 + seed(i) * 0.12, h, 0.015],
      [-2.8 + i * 0.145, 1.86 + h / 2, -2.0],
      "#526e7a",
    );
  }
  // Sofa, rug, book shelf, a warm lamp and a low GPU pedestal give scale.
  box(home, [2.1, 0.52, 0.85], [-2.35, 0.35, -0.6], "#4d6d6d");
  box(home, [2.15, 0.55, 0.22], [-2.35, 0.83, -0.96], "#587b79");
  for (const x of [-3.46, -1.24])
    box(home, [0.2, 0.68, 0.91], [x, 0.54, -0.6], "#3c5d64");
  box(home, [2.5, 0.012, 1.8], [-0.1, -0.005, 0.45], "#6e827d");
  for (let i = 0; i < 5; i++)
    box(home, [2.38, 0.006, 0.018], [-0.1, 0.004, -0.25 + i * 0.35], "#9caa90");
  box(home, [1.2, 0.12, 0.5], [3.6, 0.1, -1.7], "#775f47");
  for (const y of [0.65, 1.35, 2.05]) {
    box(home, [1.2, 0.055, 0.45], [3.6, y, -1.7], "#9e865f");
    for (let i = 0; i < 7; i++) {
      const h = 0.27 + seed(i + y * 100) * 0.25;
      box(
        home,
        [0.11, h, 0.27],
        [3.12 + i * 0.15, y + h / 2 + 0.035, -1.68],
        ["#829587", "#baa27d", "#536873"][i % 3],
      );
    }
  }
  for (const x of [3.01, 4.19])
    box(home, [0.08, 2.5, 0.5], [x, 1.26, -1.7], "#927452");
  cylinder(home, 0.25, 0.035, [-1.64, 0.02, -1.3], "#3b4a4b");
  cylinder(home, 0.03, 1.6, [-1.64, 0.82, -1.3], "#536364");
  const lamp = new THREE.Mesh(
    new THREE.ConeGeometry(0.29, 0.4, 8, 1, true),
    new THREE.MeshStandardMaterial({
      color: "#d8c79d",
      emissive: "#efc98e",
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide,
    }),
  );
  lamp.position.set(-1.64, 1.76, -1.3);
  home.add(lamp);
  point(home, "#ffd4a0", 1.8, [-1.64, 1.6, -1.25], 5);
  // Door's hinge remains attached to the frame through the entire exit.
  const doorHinge = new THREE.Group();
  doorHinge.position.set(0.95, 0, -2.02);
  home.add(doorHinge);
  box(home, [1.3, 3.0, 0.05], [1.6, 1.5, -2.34], "#182d3a");
  for (const x of [0.9, 2.3])
    box(home, [0.1, 3.02, 0.25], [x, 1.51, -2.01], "#c2a278");
  box(home, [1.5, 0.11, 0.25], [1.6, 3.04, -2.01], "#c2a278");
  box(doorHinge, [1.3, 2.97, 0.1], [0.65, 1.485, 0], "#916d4f");
  for (const y of [0.8, 2.18])
    box(doorHinge, [1.04, 0.92, 0.025], [0.65, y, 0.065], "#9e7e59");
  const knob = cylinder(
    doorHinge,
    0.045,
    0.08,
    [1.16, 1.38, 0.1],
    "#b0aa89",
    10,
  );
  knob.rotation.x = Math.PI / 2;
  const pedestal = new THREE.Group();
  home.add(pedestal);
  box(pedestal, [1.7, 0.09, 0.72], [-0.16, 0.74, 0.85], "#967f5d");
  for (const x of [-0.87, 0.55])
    box(pedestal, [0.08, 0.73, 0.52], [x, 0.34, 0.85], "#657777");
  const gpu = gpuModel(home);
  gpu.position.set(-0.16, 1.14, 0.86);
  gpu.rotation.y = -0.08;
  const gpuLight = point(home, "#e2cfa0", 0, [-0.2, 1.65, 2.4], 4);
  const laptop = laptopModel(home);
  laptop.root.scale.setScalar(0.82);
  // Server stage: racks and response lights establish the AI work visually.
  box(servers, [9, 0.15, 8], [0, -0.1, -1], "#596f78");
  box(servers, [9, 4.8, 0.15], [0, 2.4, -2.3], "#264451");
  const leds: THREE.Mesh[] = [];
  for (const x of [-2.8, -1.5, 1.3, 2.6]) {
    box(servers, [1.1, 3.15, 0.7], [x, 1.575, -1.64], "#182b35");
    for (let row = 0; row < 9; row++) {
      box(
        servers,
        [0.95, 0.245, 0.06],
        [x, 0.2 + row * 0.31, -1.245],
        "#334b58",
      );
      for (let i = 0; i < 3; i++)
        leds.push(
          box(
            servers,
            [0.035, 0.025, 0.018],
            [x - 0.35 + i * 0.07, 0.2 + row * 0.31, -1.202],
            "#85ab96",
            0.12,
          ),
        );
      for (let i = 0; i < 4; i++)
        box(
          servers,
          [0.045, 0.11, 0.02],
          [x + 0.1 + i * 0.1, 0.2 + row * 0.31, -1.2],
          "#1f3542",
        );
    }
  }
  box(servers, [2.1, 0.09, 0.85], [0, 0.91, 0.38], "#94a6a3");
  for (const x of [-0.9, 0.9])
    box(servers, [0.07, 0.88, 0.7], [x, 0.43, 0.38], "#465f68");
  box(servers, [0.8, 0.04, 0.32], [-0.4, 0.99, 0.54], "#203a47");
  box(servers, [0.08, 0.4, 0.08], [0.76, 1.12, 0.03], "#6f8991");
  const monitor = box(
    servers,
    [1.0, 0.67, 0.08],
    [0.77, 1.53, 0.02],
    "#172f3c",
  );
  box(servers, [0.88, 0.55, 0.02], [0.77, 1.53, 0.072], "#618d95", 0.2);
  for (let i = 0; i < 5; i++)
    box(
      servers,
      [0.49 - i * 0.055, 0.025, 0.01],
      [0.65, 1.71 - i * 0.08, 0.088],
      "#b0bd9d",
      0.07,
    );
  monitor.rotation.y = -0.06;
  // Taipei bar with a readable place cue inside the set, not a topic label.
  box(bar, [9, 0.15, 8], [0, -0.1, -1], "#967851");
  box(bar, [9, 4.8, 0.16], [0, 2.4, -2.2], "#3c3c53");
  box(bar, [2.9, 1.85, 0.04], [1.1, 2.65, -2.08], "#263c54");
  for (let i = 0; i < 12; i++) {
    const h = 0.13 + seed(i + 44) * 0.55;
    box(
      bar,
      [0.17, h, 0.03],
      [-0.15 + i * 0.22, 1.84 + h / 2, -2.04],
      "#4c566e",
    );
  }
  for (let i = 0; i < 7; i++)
    box(
      bar,
      [0.3 - i * 0.024, 0.1, 0.06],
      [1.72, 2.11 + i * 0.14, -1.99],
      "#75808b",
    );
  box(bar, [0.04, 0.26, 0.04], [1.72, 3.11, -1.99], "#a0aaa1");
  textPlane(bar, "TAIPEI", "#c6b28b", [1.45, 0.48], [0.02, 3.02, -1.95]);
  box(bar, [2.6, 0.08, 0.35], [-1.98, 1.56, -1.84], "#a3845d");
  for (let i = 0; i < 10; i++) {
    const bottle = new THREE.Group();
    bottle.position.set(-3.1 + i * 0.25, 1.6, -1.82);
    bar.add(bottle);
    const h = 0.24 + seed(i + 83) * 0.19;
    cylinder(
      bottle,
      0.052,
      h,
      [0, h / 2, 0],
      ["#638278", "#a28c66", "#857b8c"][i % 3],
      8,
    );
    cylinder(bottle, 0.026, 0.1, [0, h + 0.05, 0], "#667769", 8);
  }
  box(bar, [5.0, 0.13, 0.9], [0, 0.97, 0.88], "#b19567");
  box(bar, [4.94, 0.91, 0.75], [0, 0.45, 0.88], "#655554");
  for (let i = 0; i < 12; i++)
    box(bar, [0.018, 0.83, 0.015], [-2.3 + i * 0.42, 0.45, 1.27], "#9b7b5e");
  const glasses: THREE.Group[] = [];
  for (const x of [-0.57, 0.54]) {
    const drink = new THREE.Group();
    drink.position.set(x, 1.05, 1.0);
    bar.add(drink);
    cylinder(drink, 0.083, 0.26, [0, 0.13, 0], "#a58f65", 12);
    cylinder(drink, 0.084, 0.035, [0, 0.275, 0], "#d7c8a1", 12);
    glasses.push(drink);
  }
  for (const x of [-1.8, 1.8]) {
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.26, 0.3, 8, 1, true),
      mat("#b29c7b", 0.1),
    );
    shade.position.set(x, 3.3, 0.3);
    bar.add(shade);
    point(bar, "#f4cc98", 1.8, [x, 3.16, 0.3], 5);
  }
  const beacon = cylinder(
    bar,
    0.12,
    0.18,
    [-0.95, 2.9, -1.2],
    "#a56059",
    12,
    0.2,
  );
  const alarmLight = point(scene, "#d29483", 0, [1.0, 3.3, 2], 5);
  // Local smoke cloud uses neutral translucent pieces; it never flashes the frame.
  const smoke = new THREE.Group();
  scene.add(smoke);
  const smokePieces: THREE.Mesh<
    THREE.IcosahedronGeometry,
    THREE.MeshStandardMaterial
  >[] = [];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.12 + seed(i + 150) * 0.15, 0),
      new THREE.MeshStandardMaterial({
        color: i % 3 ? "#b8b8a5" : "#8b9da0",
        roughness: 1,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    smoke.add(m);
    smokePieces.push(m);
  }
  const dust = new THREE.Group();
  scene.add(dust);
  const specks: THREE.Mesh[] = [];
  for (let i = 0; i < 34; i++)
    specks.push(box(dust, [0.012, 0.012, 0.012], [0, 0, 0], "#c7c4ac", 0.05));
  const show = (
    id: string,
    x: number,
    y: number,
    z: number,
    frame = 0,
    opacity = 1,
    scale = 1,
  ) => cast.get(id)?.show(x, y, z, camera, frame, opacity, scale);
  function gif(id: string, t: number, at: number) {
    const asset = cast.get(id)?.asset.animation;
    return asset
      ? Math.min(
          asset.frameCount - 1,
          Math.max(0, Math.floor((t - at) / (asset.frameDurationMs / 1000))),
        )
      : 0;
  }
  function choose(animated: string, still: string) {
    return cast.has(animated) ? animated : still;
  }
  function renderAt(input: number) {
    const frame = Math.round(input * plan.fps);
    let t = frame / plan.fps;
    if (frame >= plan.frames - 2) t = 0;
    const E = plan.events;
    const shot =
      plan.shots.find((s) => t >= s.start && t < s.start + s.duration) ??
      plan.shots[0];
    const p = clamp((t - shot.start) / shot.duration);
    cast.forEach((a) => {
      a.mesh.visible = false;
    });
    home.visible = true;
    servers.visible = false;
    bar.visible = false;
    gpu.visible = false;
    pedestal.visible = false;
    pedestal.position.set(0, 0, 0);
    laptop.root.visible = false;
    smoke.visible = false;
    gpuLight.intensity = 0;
    alarmLight.intensity = 0;
    doorHinge.rotation.y = 0;
    key.color.set("#ffdbab");
    key.intensity = 1.55;
    hemi.intensity = 1;
    rim.intensity = 0.65;
    const position = new THREE.Vector3(0.0, 1.7, 6.8),
      target = new THREE.Vector3(0, 1.45, 0.2);
    camera.fov = 36;
    if (shot.id === "hook") {
      position.set(0.05, 1.8, mix(5.85, 5.55, out(p)));
      target.set(0, 1.47, 0.4);
    } else if (shot.id === "point") {
      position.set(0, 1.95, 4.2 - 0.08 * out(p));
      target.set(0, 1.61, 0.4);
    } else if (shot.id === "league") {
      position.set(0.12, 1.75, 7.5 - 0.25 * ease(p));
      target.set(0.1, 1.35, 0.25);
    } else if (shot.id === "servers") {
      position.set(0.1, 1.9, 7.4 - 0.25 * ease(p));
      target.set(0, 1.48, 0.1);
      servers.visible = true;
      home.visible = false;
      key.color.set("#d9dfc4");
      rim.intensity = 0.95;
    } else if (shot.id === "gpu") {
      position.set(0.08, 1.83, 7.4 - 0.15 * out(p));
      target.set(0.1, 1.47, 0.75);
    } else if (shot.id === "ignored") {
      position.set(-0.63, 1.82, 5.2);
      target.set(-0.55, 1.49, 0.2);
    } else if (shot.id === "taipei" || shot.id === "alarm") {
      const barStart =
        plan.shots.find((s) => s.id === "taipei")?.start ?? shot.start;
      const barProgress = clamp(
        (t - barStart) / Math.max(0.1, E.lower - barStart),
      );
      position.set(0.08, 1.88, 7.1 - 0.2 * ease(barProgress));
      target.set(0, 1.42, 0.3);
      bar.visible = true;
      home.visible = false;
      key.color.set("#efcca1");
      hemi.intensity = 0.86;
    } else if (shot.id === "asset") {
      position.set(0, 1.88, 5.7 - 0.25 * ease(p));
      target.set(0, 1.47, 0.4);
    } else if (shot.id === "laptop") {
      position.set(-0.1, 1.86, 6.8 - 0.2 * ease(p));
      target.set(0.05, 1.4, 0.5);
    } else if (shot.id === "exit") {
      position.set(0.35, 1.88, 9.1);
      target.set(0.4, 1.42, -0.1);
    } else if (shot.id === "complete") {
      position.set(0, 1.85, 5.6);
      target.set(0, 1.47, 0.4);
    }
    const alarmP =
      t >= E.alarm && t < E.lower + 0.55
        ? 0.5 + 0.5 * Math.sin((t - E.alarm) * 13)
        : 0;
    beacon.material = mat("#a56059", 0.2);
    if (alarmP > 0) {
      alarmLight.intensity = 0.8 * alarmP;
      beacon.material = mat("#ad7165", 0.2 + 0.15 * alarmP);
    }
    // One damped impact at the alarm, not continuous camera shaking.
    const shake =
      t >= E.alarm && t < E.alarm + 0.2
        ? Math.sin((t - E.alarm) * 70) * 0.014 * (1 - (t - E.alarm) / 0.2)
        : 0;
    position.x += shake;
    camera.position.copy(position);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    if (shot.id === "hook") {
      const id = choose("miko-talk-gif", "miko-clipboard-talk");
      show(id, 0, 0, 0.42, gif(id, t, 0));
    } else if (shot.id === "point") {
      show("miko-point", 0, 0, 0.42);
    } else if (shot.id === "league") {
      show("nerd-leather", -0.68, 0, 0.38);
      show("girlfriend-smile", 0.73, 0, 0.3);
    } else if (shot.id === "servers") {
      const id = choose("nerd-type-gif", "nerd-hoodie");
      show(id, -0.42, 0, 0.09, gif(id, t, E.typing ?? shot.start));
      leds.forEach((led, i) => {
        const bright = (Math.floor((t - shot.start) * 11) + i * 7) % 19 < 3;
        led.material = mat(
          bright ? "#aec5a2" : "#6b928d",
          bright ? 0.32 : 0.08,
        );
      });
    } else if (shot.id === "gpu" || shot.id === "ignored") {
      gpu.visible = true;
      pedestal.visible = true;
      const reveal = out((t - E.gpuReveal + 0.16) / 0.4);
      gpu.position.set(mix(0.2, -0.16, reveal), 1.14, 0.86);
      gpu.rotation.set(0, mix(0.15, -0.08, reveal), 0.02 * (1 - reveal));
      gpuLight.intensity = 1.4 * reveal;
      show(
        shot.id === "ignored" ? "nerd-surprised" : "nerd-leather",
        -0.55,
        0,
        0.28,
      );
      const id = choose("girlfriend-love-gif", "girlfriend-gpu-love");
      if (shot.id === "gpu") show(id, 0.82, 0, 0.22, gif(id, t, E.gpuReveal));
    } else if (shot.id === "taipei" || shot.id === "alarm") {
      show("nerd-leather", -0.66, 0, 0.22);
      show("girlfriend-bar", 0.7, 0, 0.18);
      glasses.forEach((g, i) => {
        const settle = out((t - E.barMeet) / 0.28);
        g.position.x = (i ? 0.54 : -0.57) + (i ? -0.06 : 0.06) * settle;
      });
    } else if (shot.id === "asset") {
      const id = choose("miko-lower-gif", "miko-clipboard-asset");
      show(id, 0, 0, 0.42, gif(id, t, E.lower));
    } else if (shot.id === "laptop") {
      const id = choose("nerd-talk-gif", "nerd-relieved");
      show(id, -0.55, 0, 0.35, gif(id, t, E.laptop));
      show("girlfriend-smile", 0.86, 0, 0.15);
      laptop.root.visible = true;
      pedestal.visible = true;
      pedestal.position.set(-0.26, 0, 0);
      laptop.root.position.set(-0.42, 0.806, 0.88);
      laptop.root.rotation.set(0.035, -0.02, 0);
      const chipP = out((t - E.chip) / 0.18);
      laptop.chip.material = mat(
        chipP > 0.1 ? "#b0c4a7" : "#94afa6",
        0.1 + 0.1 * chipP,
      );
    } else if (shot.id === "exit") {
      show("nerd-surprised", -0.55, 0, 0.35);
      laptop.root.visible = true;
      pedestal.visible = true;
      pedestal.position.set(-0.26, 0, 0);
      laptop.root.position.set(-0.42, 0.806, 0.88);
      laptop.root.rotation.set(0.035, -0.02, 0);
      laptop.chip.material = mat("#b0c4a7", 0.2);
      const exitP = ease((t - E.exit - 0.09) / 0.67);
      const id = choose("girlfriend-exit-gif", "girlfriend-exit");
      show(
        id,
        mix(0.84, 1.7, exitP),
        0,
        mix(0.2, -2.3, exitP),
        gif(id, t, E.exit),
        1 - ease((t - E.exit - 0.65) / 0.14),
      );
      const dt = Math.max(0, t - E.door);
      doorHinge.rotation.y =
        -1.35 *
        (1 - Math.exp(-dt * 19)) *
        Math.exp(-Math.max(0, dt - 0.18) * 0.9) *
        (0.82 + 0.18 * Math.cos(Math.max(0, dt - 0.2) * 5));
      const age = t - E.smoke;
      smoke.visible = age >= 0 && age < 0.72;
      if (smoke.visible)
        smokePieces.forEach((m, i) => {
          const spread = 0.15 + age * 0.7,
            angle = seed(i + 280) * Math.PI * 2;
          m.position.set(
            1.35 + Math.cos(angle) * spread * seed(i + 281),
            0.35 + seed(i + 282) * 1.1 + age * 0.3,
            -0.7 + Math.sin(angle) * spread,
          );
          m.scale.setScalar(1 + age * 0.8);
          m.material.opacity = (1 - ease(age / 0.72)) * 0.4;
        });
    } else if (shot.id === "complete") {
      const id = choose("miko-complete-gif", "miko-clipboard-complete");
      show(id, 0, 0, 0.42, gif(id, t, E.complete));
    }
    specks.forEach((m, i) => {
      const phase = (seed(i + 800) + t * 0.014) % 1;
      m.position.set(
        (seed(i + 803) - 0.5) * 6,
        0.2 + phase * 3.9,
        -1.1 + seed(i + 809) * 3.4,
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

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Asset, Plan } from "./types";
import { createFilmStage } from "./film";

type V3 = [number, number, number];
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => {
  const p = clamp(n);
  return p * p * (3 - 2 * p);
};
const mix = (a: number, b: number, p: number) => a + (b - a) * p;
const seed = (i: number) => {
  const n = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
};
const cache = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: string, emission = 0, metalness = 0) {
  const key = `${color}/${emission}/${metalness}`;
  if (!cache.has(key))
    cache.set(
      key,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.7,
        metalness,
        emissive: color,
        emissiveIntensity: emission,
      }),
    );
  return cache.get(key)!;
}
function box(
  parent: THREE.Object3D,
  size: V3,
  pos: V3,
  color: string,
  radius = 0.025,
  emission = 0,
) {
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(
      ...size,
      2,
      Math.min(radius, ...size.map((v) => v / 3)),
    ),
    mat(color, emission),
  );
  mesh.position.set(...pos);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function cylinder(
  parent: THREE.Object3D,
  r: number,
  h: number,
  pos: V3,
  color: string,
  segments = 20,
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, h, segments),
    mat(color),
  );
  mesh.position.set(...pos);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function canvasTexture(
  text: string,
  color: string,
  bg: string,
  w = 768,
  h = 256,
) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = color;
  g.font = `700 ${Math.round(h * 0.58)}px 'DM Sans'`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, w / 2, h / 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function picture(
  parent: THREE.Object3D,
  texture: THREE.Texture,
  size: [number, number],
  pos: V3,
) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(...size),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      toneMapped: false,
      depthWrite: false,
    }),
  );
  m.position.set(...pos);
  parent.add(m);
  return m;
}
class Actor {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  texture: THREE.Texture;
  constructor(
    public asset: Asset,
    texture: THREE.Texture,
    parent: THREE.Object3D,
  ) {
    this.texture = texture.clone();
    this.texture.needsUpdate = true;
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    const material = new THREE.MeshStandardMaterial({
      map: this.texture,
      color: 0xd5d5d5,
      alphaTest: 0.42,
      transparent: true,
      depthWrite: true,
      roughness: 1,
      emissive: 0xffffff,
      emissiveMap: this.texture,
      emissiveIntensity: 0.38,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(
        (asset.worldHeight * asset.width) / asset.height,
        asset.worldHeight,
      ),
      material,
    );
    this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
      map: this.texture,
      alphaTest: 0.42,
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
    flip = false,
    scale = 1,
  ) {
    const a = this.asset,
      anim = a.animation;
    let pivot = a.pivotX,
      foot = a.footY;
    if (anim) {
      const i = Math.max(0, Math.min(anim.frameCount - 1, Math.floor(frame))),
        c = anim.crop,
        b = anim.cells[i];
      this.texture.repeat.set(c.width / anim.width, c.height / anim.height);
      this.texture.offset.set(
        ((i % anim.columns) * anim.cellWidth + c.x) / anim.width,
        1 -
          (Math.floor(i / anim.columns) * anim.cellHeight + c.y + c.height) /
            anim.height,
      );
      pivot = anim.cellWidth / 2 - c.x;
      foot = b.bottom - c.y + 1;
    }
    const h = a.worldHeight * scale,
      w = (h * a.width) / a.height;
    this.mesh.visible = true;
    this.mesh.scale.set(flip ? -scale : scale, scale, scale);
    this.mesh.position.set(
      x + (((a.width / 2 - pivot) * h) / a.height) * (flip ? -1 : 1),
      y + (foot / a.height - 0.5) * h,
      z,
    );
    this.mesh.rotation.y = Math.atan2(
      camera.position.x - x,
      camera.position.z - z,
    );
    return { x, y, z, width: w, height: h };
  }
}

export async function boot(canvas: HTMLCanvasElement, plan: Plan) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(1920, 1080, false);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#18232b");
  const camera = new THREE.OrthographicCamera(-4.8, 4.8, 2.7, -2.7, 0.1, 80);
  const ambient = new THREE.HemisphereLight("#c4d7e5", "#544432", 1.1);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight("#ffe0ae", 2.0);
  sun.position.set(-3.5, 7, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -7;
  sun.shadow.camera.right = 7;
  sun.shadow.camera.top = 7;
  sun.shadow.camera.bottom = -5;
  sun.shadow.normalBias = 0.025;
  sun.shadow.bias = -0.0001;
  scene.add(sun);
  scene.add(sun.target);
  const rim = new THREE.DirectionalLight("#719aca", 1.1);
  rim.position.set(4, 4, -4);
  scene.add(rim);
  const loader = new THREE.TextureLoader();
  const files = new Set([
    ...plan.assets.map((a) => a.url),
    ...Object.values(plan.backgrounds),
    plan.portrait,
  ]);
  const textures = new Map<string, THREE.Texture>();
  await Promise.all(
    [...files].map(async (file) => {
      const t = await loader.loadAsync(file);
      t.colorSpace = THREE.SRGBColorSpace;
      textures.set(file, t);
    }),
  );
  const actors = new Map(
    plan.assets.map((a) => [a.id, new Actor(a, textures.get(a.url)!, scene)]),
  );
  const bgMaterial = new THREE.MeshBasicMaterial({
    map: textures.get(plan.backgrounds.airport),
    toneMapped: false,
    depthWrite: false,
  });
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(12.3, 6.92), bgMaterial);
  bg.renderOrder = -10;
  scene.add(bg);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.ShadowMaterial({ opacity: 0.34 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.014;
  shadow.receiveShadow = true;
  scene.add(shadow);
  const airport = new THREE.Group(),
    farm = new THREE.Group(),
    hut = new THREE.Group();
  scene.add(airport, farm, hut);
  const scanner = new THREE.Group();
  airport.add(scanner);
  scanner.position.set(-1.65, 0, -0.8);
  box(scanner, [2.1, 1.65, 1.7], [0, 1.48, -0.5], "#34434a", 0.1);
  box(scanner, [1.68, 1.32, 0.03], [0, 1.45, 0.37], "#10171d");
  for (let i = 0; i < 13; i++)
    box(
      scanner,
      [0.105, 1.13, 0.04],
      [-0.72 + i * 0.12, 1.46, 0.43],
      i % 2 ? "#1c2225" : "#2d3336",
      0.005,
    );
  box(scanner, [2.02, 0.15, 3.25], [0, 0.72, 0.85], "#596169", 0.05);
  const rollers: THREE.Mesh[] = [];
  for (let i = 0; i < 25; i++) {
    const r = cylinder(
      scanner,
      0.043,
      1.87,
      [0, 0.82, -0.7 + i * 0.128],
      i % 2 ? "#6c7378" : "#454e55",
      16,
    );
    r.rotation.z = Math.PI / 2;
    rollers.push(r);
  }
  for (const x of [-0.87, 0.87])
    for (const z of [-0.3, 1.9])
      box(scanner, [0.13, 0.7, 0.13], [x, 0.36, z], "#344149");
  const red = box(
    scanner,
    [0.17, 0.14, 0.17],
    [0.71, 2.39, -0.05],
    "#a33128",
    0.035,
    1.6,
  );
  const alarm = new THREE.PointLight("#ef4d32", 0, 3);
  alarm.position.set(-0.94, 2.4, -0.85);
  airport.add(alarm);
  const tray = new THREE.Group();
  scanner.add(tray);
  box(tray, [0.85, 0.06, 0.64], [0, 0, 0], "#aab0ac");
  for (const z of [-0.31, 0.31])
    box(tray, [0.85, 0.08, 0.035], [0, 0.06, z], "#b7bab0");
  box(tray, [0.5, 0.026, 0.34], [0, 0.063, 0], "#1c3b4a", 0.012);
  box(tray, [0.13, 0.003, 0.12], [0, 0.078, 0], "#ad9563", 0.007);
  const rock = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.16, 1),
    mat("#8d8878"),
  );
  rock.scale.set(1.22, 0.7, 0.85);
  rock.castShadow = true;
  scene.add(rock);

  const screen = new THREE.Group();
  airport.add(screen);
  screen.position.set(0.8, 1.65, 0.5);
  box(screen, [3.45, 2.15, 0.14], [0, 0, 0], "#23343b", 0.07);
  box(screen, [3.24, 1.95, 0.025], [0, 0, 0.085], "#0d1c24", 0.02);
  const portraitTexture = textures.get(plan.portrait)!.clone();
  portraitTexture.repeat.set(1, 0.84);
  portraitTexture.offset.set(0, 0.16);
  portraitTexture.needsUpdate = true;
  picture(screen, portraitTexture, [1.33, 1.69], [-0.82, 0.09, 0.115]);
  const liveAsset = plan.assets.find((a) => a.id === "norbert-modern-neutral")!;
  const liveTexture = textures.get(liveAsset.url)!.clone();
  liveTexture.repeat.set(1, 0.57);
  liveTexture.offset.set(0, 0.43);
  liveTexture.needsUpdate = true;
  picture(screen, liveTexture, [1.32, 1.69], [0.82, 0.09, 0.116]);
  picture(
    screen,
    canvasTexture("1650", "#b8d2d7", "#17333c"),
    [0.92, 0.25],
    [-0.82, -0.94, 0.15],
  );
  picture(
    screen,
    canvasTexture("2026", "#b8d2d7", "#17333c"),
    [0.92, 0.25],
    [0.82, -0.94, 0.15],
  );
  box(screen, [0.16, 0.62, 0.18], [0, -1.35, 0], "#26393f");
  box(screen, [1, 0.08, 0.5], [0, -1.68, 0.14], "#273c43");

  const basket = new THREE.Group();
  farm.add(basket);
  basket.position.set(1.25, 1.25, 0.42);
  const side = new THREE.Mesh(
    new THREE.CylinderGeometry(0.44, 0.32, 0.48, 24, 1, true),
    mat("#977348"),
  );
  side.castShadow = true;
  basket.add(side);
  cylinder(basket, 0.32, 0.05, [0, -0.25, 0], "#755434");
  for (let i = 0; i < 7; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(mix(0.32, 0.44, i / 6), 0.016, 5, 36),
      mat(i % 2 ? "#b09058" : "#80643f"),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.24 + i * 0.08;
    basket.add(ring);
  }
  for (let i = 0; i < 20; i++) {
    const angle = (i * Math.PI) / 10;
    const slat = box(
      basket,
      [0.024, 0.49, 0.025],
      [Math.cos(angle) * 0.38, 0, Math.sin(angle) * 0.38],
      "#c2a16a",
      0.004,
    );
    slat.rotation.z = Math.cos(angle) * -0.18;
    slat.rotation.x = Math.sin(angle) * 0.18;
  }
  const turnip = new THREE.Group();
  farm.add(turnip);
  const tuber = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 20, 14),
    mat("#d2c7ae"),
  );
  tuber.scale.set(1, 1.12, 1);
  tuber.castShadow = true;
  turnip.add(tuber);
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.158, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    mat("#8a6474"),
  );
  cap.position.y = 0.04;
  turnip.add(cap);
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(
      new THREE.PlaneGeometry(0.14, 0.4),
      mat(i % 2 ? "#5e7449" : "#7b8c50"),
    );
    leaf.position.set(Math.sin(i) * 0.08, 0.26, Math.cos(i) * 0.08);
    leaf.rotation.set(-0.3 + i * 0.12, i * 0.9, Math.sin(i) * 0.7);
    leaf.material.side = THREE.DoubleSide;
    turnip.add(leaf);
  }
  const root = new THREE.Mesh(
    new THREE.ConeGeometry(0.04, 0.22, 8),
    mat("#c5b493"),
  );
  root.rotation.z = Math.PI;
  root.position.y = -0.23;
  turnip.add(root);

  const table = new THREE.Group();
  hut.add(table);
  table.position.set(0, 0, 0.6);
  const woodCanvas = document.createElement("canvas");
  woodCanvas.width = 256;
  woodCanvas.height = 256;
  const grain = woodCanvas.getContext("2d")!;
  grain.fillStyle = "#a58b69";
  grain.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 95; i++) {
    grain.strokeStyle = i % 3 ? "#766345" : "#c2a47b";
    grain.globalAlpha = 0.12 + seed(i + 95) * 0.15;
    grain.lineWidth = i % 5 === 0 ? 2 : 1;
    grain.beginPath();
    const y = seed(i + 251) * 256;
    for (let x = 0; x <= 256; x += 8) {
      const gy = y + Math.sin(x * 0.034 + i) * (2 + seed(i) * 4);
      if (!x) grain.moveTo(x, gy);
      else grain.lineTo(x, gy);
    }
    grain.stroke();
  }
  const wood = new THREE.CanvasTexture(woodCanvas);
  wood.colorSpace = THREE.SRGBColorSpace;
  for (let i = 0; i < 7; i++) {
    const plank = box(
      table,
      [0.396, 0.13, 1.25],
      [-1.2 + i * 0.4, 1.45, 0],
      "#997447",
      0.022,
    );
    plank.material = new THREE.MeshStandardMaterial({
      map: wood,
      color: i % 2 ? "#a78151" : "#b58b59",
      roughness: 0.92,
    });
  }
  for (const z of [-0.46, 0.46])
    box(table, [2.5, 0.16, 0.09], [0, 1.28, z], "#6d4e33", 0.015);
  for (const x of [-1.15, 1.15])
    for (const z of [-0.43, 0.43])
      box(table, [0.13, 1.38, 0.13], [x, 0.69, z], "#5e432f");
  const chair = new THREE.Group();
  hut.add(chair);
  chair.position.set(1.6, 0, -0.1);
  box(chair, [0.8, 0.12, 0.65], [0, 1.02, 0], "#654a33");
  box(chair, [0.8, 0.7, 0.08], [0, 1.4, -0.29], "#694c35");
  for (const x of [-0.31, 0.31])
    for (const z of [-0.24, 0.24])
      box(chair, [0.09, 0.96, 0.09], [x, 0.48, z], "#55412f");
  const parchment = new THREE.Group();
  hut.add(parchment);
  parchment.position.set(0.45, 1.535, 0.8);
  const paperTexture = canvasTexture("", "#423326", "#d6c398", 1024, 768);
  const paperCanvas = paperTexture.image as HTMLCanvasElement,
    ink = paperCanvas.getContext("2d")!;
  ink.strokeStyle = "#8c795b";
  ink.lineWidth = 2;
  for (let y = 110; y < 600; y += 36) {
    ink.beginPath();
    ink.moveTo(80, y);
    ink.lineTo(850 + (y % 70), y);
    ink.stroke();
  }
  paperTexture.needsUpdate = true;
  const paper = picture(parchment, paperTexture, [1.75, 1.25], [0, 0, 0]);
  paper.rotation.x = -Math.PI / 2;
  const roll = cylinder(parchment, 0.08, 1.3, [-0.88, 0.03, 0], "#c3ac79");
  roll.rotation.x = Math.PI / 2;
  const signatureCanvas = document.createElement("canvas");
  signatureCanvas.width = 512;
  signatureCanvas.height = 192;
  const signatureInk = signatureCanvas.getContext("2d")!;
  signatureInk.font = "italic 120px Georgia";
  signatureInk.fillStyle = "#463323";
  signatureInk.fillText("X", 6, 142);
  const signatureTexture = new THREE.CanvasTexture(signatureCanvas);
  signatureTexture.colorSpace = THREE.SRGBColorSpace;
  const signature = picture(
    parchment,
    signatureTexture,
    [0.68, 0.25],
    [0.25, 0.006, 0.37],
  );
  signature.rotation.x = -Math.PI / 2;
  const candle = new THREE.Group();
  hut.add(candle);
  candle.position.set(-0.8, 1.54, 0.3);
  cylinder(candle, 0.11, 0.25, [0, 0.12, 0], "#d7c99b");
  const flame = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 10, 12),
    mat("#ffc46b", 3),
  );
  flame.scale.y = 1.7;
  flame.position.y = 0.34;
  candle.add(flame);
  const candlelight = new THREE.PointLight("#ffc37c", 1.1, 5, 2);
  candlelight.position.set(-0.8, 1.94, 0.4);
  hut.add(candlelight);
  const dust = new THREE.Group();
  scene.add(dust);
  const specks: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  for (let i = 0; i < 28; i++) {
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(0.01, 0.01),
      new THREE.MeshBasicMaterial({
        color: "#d7b983",
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
    );
    dust.add(p);
    specks.push(p);
  }

  const E = plan.events;
  const film = await createFilmStage({ scene, camera, actors, textures, plan });
  function show(
    id: string,
    x: number,
    y = 0,
    z = 0.6,
    at?: number,
    flip = false,
    scale = 1,
    loop = false,
  ) {
    const actor = actors.get(id);
    if (!actor) throw new Error(`Missing actor ${id}`);
    const animation = actor.asset.animation;
    const elapsed = at === undefined ? 0 : Math.max(0, time - at);
    let frame = animation
      ? Math.floor(elapsed / (animation.frameDurationMs / 1000))
      : 0;
    if (animation && loop) frame %= animation.frameCount;
    return actor.show(x, y, z, camera, frame, flip, scale);
  }
  const animated = (gif: string, pose: string) =>
    actors.has(gif) ? gif : pose;
  let time = 0;
  function renderAt(seconds: number) {
    time =
      Math.floor(
        Math.max(0, Math.min(plan.duration - 1 / 30, seconds)) * 30 + 1e-5,
      ) / 30;
    const shot =
      plan.shots.find((s) => {
        const frame = Math.round(time * plan.fps);
        return (
          frame >= Math.round(s.start * plan.fps) &&
          frame < Math.round((s.start + s.duration) * plan.fps)
        );
      }) ?? plan.shots[plan.shots.length - 1];
    const local = time - shot.start,
      p = ease(local / shot.duration),
      sid = shot.id;
    actors.forEach((a) => {
      a.mesh.visible = false;
    });
    airport.visible = shot.set === "immortal-airport";
    farm.visible = shot.set === "immortal-farm";
    hut.visible = shot.set === "immortal-hut";
    rock.visible = false;
    screen.visible = false;
    scanner.visible = false;
    basket.visible = false;
    turnip.visible = false;
    table.visible = false;
    chair.visible = false;
    parchment.visible = false;
    paper.scale.x = 1;
    roll.position.x = -0.88;
    candle.visible = false;
    film.hide();
    if (shot.stage) {
      bg.visible = false;
      shadow.visible = false;
      dust.visible = false;
      sun.color.set(shot.stage.background === "plague" ? "#c1d3de" : "#ffe0ad");
      sun.intensity = shot.stage.background === "plague" ? 1.05 : 1.7;
      ambient.intensity = 0.95;
      film.render(shot, time);
      if (["airport-return", "rock-return"].includes(sid)) {
        scanner.visible = true;
        screen.visible = true;
        screen.rotation.y = -0.05;
        tray.position.set(0, 0.89, mix(-0.2, 1.9, p));
        rollers.forEach((r, i) => {
          r.rotation.x = time * 1.7 + i * 0.06;
        });
        red.material = mat("#bd392d", local % 0.7 < 0.38 ? 2.3 : 0.3);
        alarm.intensity = local % 0.7 < 0.38 ? 0.6 : 0.08;
      }
      renderer.render(scene, camera);
      return;
    }
    shadow.visible = true;
    dust.visible = true;

    let bx = "airport",
      cx = 0,
      cy = 1.35,
      zoom = 1.03 + 0.025 * p;
    if (shot.set === "immortal-farm") {
      bx = sid === "farm-wide" ? "farm" : "farmSide";
      sun.color.set("#ffdda5");
      sun.intensity = 2.2;
      ambient.intensity = 0.95;
    } else if (shot.set === "immortal-forest") {
      bx = "forest";
      sun.color.set("#a0b9d1");
      sun.intensity = 0.75;
      ambient.intensity = 0.85;
    } else if (shot.set === "immortal-hut") {
      bx = "hut";
      sun.color.set("#ffd296");
      sun.intensity = 1.3;
      ambient.intensity = 0.65;
    } else {
      sun.color.set("#e4d3bb");
      sun.intensity = 1.5;
      ambient.intensity = 0.95;
    }
    if (["excuse", "explain"].includes(sid)) {
      cx = 1.3;
      cy = 1.5;
      zoom = 1.32 + 0.025 * p;
      bx = "airportReverse";
    }
    if (sid === "officer") {
      cx = 1.5;
      cy = 2;
      zoom = 1.65;
    }
    if (sid === "portrait") {
      cx = 0.4;
      cy = 1.6;
      zoom = 1.43 + 0.035 * p;
    }
    if (sid === "scanner") {
      cx = 0.2;
      cy = 1.55;
      zoom = 1.26 + 0.04 * p;
    }
    if (sid === "rock-belt") {
      cx = -0.95 + 0.35 * p;
      cy = 1.0;
      zoom = 1.3;
    }
    if (sid === "farm-work") {
      cx = -0.65;
      cy = 1.1;
      zoom = 1.3;
    }
    if (sid === "farm-age") {
      cx = -1.2;
      cy = 1.9;
      zoom = 1.4 + 0.035 * p;
    }
    if (sid === "turnips") {
      cx = mix(1.15, -1.15, ease(local / 1.2));
      cy = 1.8;
      zoom = 1.4;
    }
    if (sid === "cart") {
      cx = 1.15;
      cy = 1.55;
      zoom = 1.45 + 0.05 * p;
    }
    if (sid === "chase") {
      cx = mix(-1.4, 1.1, p);
      cy = 1.1;
      zoom = 1.12;
    }
    if (sid === "door") {
      cx = 1.4;
      cy = 1.4;
      zoom = 1.16;
    }
    if (sid === "witch" || sid === "question") {
      cx = -1.2;
      cy = 2;
      zoom = 1.5 + 0.025 * p;
    }
    if (sid === "terms") {
      cx = 1.4;
      cy = 2;
      zoom = 1.4 + 0.04 * p;
    }
    if (sid === "age-joke") {
      cx = 1.25;
      cy = 1.9;
      zoom = 1.5;
    }
    if (sid === "signature") {
      cx = 1.05;
      cy = 1.55;
      zoom = 1.6;
    }
    if (sid === "healing") {
      cx = 0;
      cy = 1.35;
      zoom = 1.02 + 0.025 * p;
      bx = "healing";
    }
    if (sid === "fees") {
      cx = 0.3;
      cy = 1.5;
      zoom = 1.45;
    }
    if (sid === "handoff" || sid === "listener") {
      cx = 0;
      cy = 1.7;
      zoom = 1.3 + 0.03 * p;
    }
    if (shot.set === "immortal-hut")
      zoom =
        (
          {
            witch: 1.5,
            question: 1.5,
            terms: 1.4,
            handoff: 1.3,
            listener: 1.3,
            healing: 1.02,
          } as Record<string, number>
        )[sid] ?? zoom;
    const writing = actors.get("signing-scene");
    if (writing && ["signature", "fees"].includes(sid)) {
      cx = 0;
      cy = 1.35;
      zoom = 1;
      bx = "signing";
    }
    const tilt =
      sid === "signature"
        ? 3.8
        : ["fees", "contract"].includes(sid)
          ? 3.1
          : 1.5;
    camera.position.set(
      cx + (shot.set === "immortal-hut" ? 0 : 0.06 * p),
      cy + tilt,
      14,
    );
    camera.lookAt(cx, cy, 0);
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
    bg.position.set(cx * 0.35, 1.5, -4.2);
    bg.scale.set(1, 1, 1);
    bg.quaternion.copy(camera.quaternion);
    bgMaterial.map = textures.get(plan.backgrounds[bx])!;
    const healing = actors.get("healing-closeup");
    if (healing && sid === "healing") {
      healing.show(
        0,
        0,
        -4.1,
        camera,
        Math.floor(Math.max(0, time - E.heal) / 0.2),
      );
      healing.mesh.visible = false;
      bgMaterial.map = healing.texture;
    }
    if (writing && ["signature", "fees"].includes(sid)) {
      const frame =
        sid === "signature"
          ? Math.min(4, Math.floor(local / 0.4))
          : Math.min(7, 5 + Math.floor(local / 0.4));
      writing.show(0, 0, -4.1, camera, frame);
      writing.mesh.visible = false;
      bgMaterial.map = writing.texture;
      bg.position
        .set(cx, cy, 0)
        .addScaledVector(camera.getWorldDirection(new THREE.Vector3()), 4.2);
      bg.scale.set((9.6 / zoom / 12.3) * 1.002, (5.4 / zoom / 6.92) * 1.002, 1);
    }
    bg.visible = true;
    rollers.forEach((r, i) => {
      r.rotation.x = time * 1.7 + i * 0.06;
    });
    red.material = mat("#bd392d", time % 0.7 < 0.38 ? 2.3 : 0.3);
    alarm.intensity = time % 0.7 < 0.38 ? 0.6 : 0.08;
    if (sid === "scanner") {
      scanner.visible = true;
      screen.visible = true;
      screen.rotation.y = mix(-0.2, -0.05, ease(local / 0.7));
      tray.position.set(0, 0.89, mix(-0.2, 1.9, p));
    } else if (sid === "portrait") {
      screen.visible = true;
      screen.rotation.y = mix(-0.28, -0.05, ease(local / 0.6));
      show("norbert-modern-neutral", -1.65, 0, -0.1, undefined, true);
    } else if (sid === "excuse" || sid === "explain")
      show(
        animated("norbert-talk", "norbert-modern-talk"),
        1.3,
        0,
        0.4,
        shot.start,
        true,
      );
    else if (sid === "officer")
      show(
        animated("officer-talk", "officer-talk"),
        1.5,
        0,
        0.3,
        shot.start,
        false,
      );
    else if (sid === "rock-belt") {
      scanner.visible = true;
      tray.position.set(0, 0.89, mix(1.15, 2.15, ease(local / 3.4)));
      screen.visible = true;
      screen.rotation.y = -0.05;
    } else if (sid === "farm-wide" || sid === "farm-work") {
      show(
        animated("norbert-harvest", "norbert-476-harvest"),
        -1.0,
        0,
        0.5,
        sid === "farm-wide" ? shot.start : E.harvest,
      );
      show(
        animated("marcus-basket", "marcus-basket"),
        1.4,
        0,
        0.2,
        (sid === "farm-wide" ? shot.start : E.harvest) + 1.1,
        true,
      );
    } else if (sid === "farm-age") {
      show("norbert-476-neutral", -1.0, 0, 0.5, undefined, true);
    } else if (sid === "messenger") {
      show("norbert-476-neutral", -1.8, 0, 0.4, undefined, true);
      show("marcus-question", 1.35, 0, 0.2);
      show(
        local < 0.55 ? "support-messenger-run" : "support-messenger",
        mix(-4.5, 0, ease(local / 0.55)),
        0,
        0.8,
        undefined,
        false,
        0.93,
      );
    } else if (sid === "turnips") {
      show("marcus-question", 1.2, 0, 0.2);
      show("norbert-476-neutral", -1.25, 0, 0.5, undefined, true);
    } else if (sid === "cart") {
      show(
        animated("marcus-basket", "marcus-basket"),
        0.9,
        0,
        0.3,
        shot.start,
        true,
      );
      show("norbert-476-neutral", -1.4, 0, 0.5, E.harvest);
    } else if (sid === "chase") {
      const travel = ease(local / shot.duration);
      show(
        animated("norbert-run", "norbert-476-run"),
        mix(-2.5, 2.6, travel),
        0,
        0.6,
        shot.start,
        true,
        1,
        true,
      );
      show(
        local % 0.24 < 0.12 ? "wolf-run-a" : "wolf-run-b",
        mix(-4.1, 0.9, travel),
        0,
        0.25,
      );
    } else if (sid === "door") {
      show(
        local < 0.6 ? "norbert-476-run" : "norbert-476-neutral",
        mix(3.7, 1.6, ease(local / 0.65)),
        0,
        0.3,
        undefined,
        false,
      );
    } else if (sid === "witch" || sid === "question")
      show(
        sid === "question"
          ? animated("witch-alert-talk", "witch-alert-talk")
          : animated("witch-alert-talk", "witch-alert-neutral"),
        -1.2,
        0,
        0.3,
        shot.start,
        true,
      );
    else if (sid === "age-joke")
      show("norbert-476-neutral", 1.25, 0, 0.5, undefined, false);
    else if (sid === "age-context") {
      show(
        local < 2.3 ? "support-farmer" : "support-farmer-adjust",
        -0.4,
        0,
        0.2,
      );
    } else if (sid === "wolf-door") {
      show("wolf-sniff", 1.7, 0, 0.4, undefined, false, 1.05);
    } else if (sid === "contract" || sid === "terms") {
      show(
        animated("witch-alert-contract", "witch-alert-scroll"),
        -1.4,
        0,
        0.1,
        E.contract,
        true,
      );
      show("norbert-476-neutral", 1.55, 0, 0.1);
      table.visible = true;
      candle.visible = true;
      parchment.visible = true;
      const u = ease((time - E.contract - 0.3) / 1.2);
      paper.scale.x = 0.12 + 0.88 * u;
      roll.position.x = mix(0.7, -0.88, u);
    } else if (sid === "signature" && !writing) {
      show(animated("norbert-sign", "norbert-476-seated"), 1.2, 0, 1.0, E.sign);
      table.visible = true;
      chair.visible = true;
      chair.position.z = 1.0;
      parchment.visible = true;
      candle.visible = true;
    } else if (sid === "fees" && !writing) {
      show("norbert-476-seated", 1.0, 0, 1.0);
      show("witch-alert-neutral", -1.6, 0, 0.0, undefined, true);
      table.visible = true;
      chair.visible = true;
      chair.position.z = 1.0;
      parchment.visible = true;
      candle.visible = true;
      parchment.rotation.x = mix(0, 0.7, ease(local / 0.7));
    } else if (sid === "handoff" || sid === "listener") {
      show("rock-handoff-alert", 0, 0, 0.5, E.handoff);
    }
    if (sid !== "fees") parchment.rotation.x = 0;
    parchment.position.y = 1.535 + 0.625 * Math.sin(parchment.rotation.x);
    const inkProgress = ease((time - E.sign - 0.2) / 0.9);
    signature.visible = inkProgress > 0;
    signature.scale.x = Math.max(0.001, inkProgress);
    signatureTexture.repeat.x = Math.max(0.001, inkProgress);
    signature.position.x = -0.09 + 0.34 * inkProgress;
    candlelight.intensity = hut.visible
      ? 0.8 + 0.12 * Math.sin(time * 6.7) + 0.06 * Math.sin(time * 11.3)
      : 0;
    flame.scale.y = 1.6 + 0.13 * Math.sin(time * 7.3);
    specks.forEach((s, i) => {
      s.visible = hut.visible || farm.visible;
      s.position.set(
        (seed(i + 2) - 0.5) * 8,
        0.4 + ((seed(i + 4) + time * 0.018) % 1) * 3.1,
        -0.8 + seed(i + 7) * 0.8,
      );
      s.quaternion.copy(camera.quaternion);
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

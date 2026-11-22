import * as THREE from "three";
import type { Asset } from "../paid/types";

export class PixelActor {
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

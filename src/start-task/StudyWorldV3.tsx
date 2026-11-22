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
import { cameraAt, cupAt } from "./v3-motion";

export const useV3Study = () => {
  const [handle] = useState(() =>
    delayRender("Loading the local Blender study"),
  );
  const [asset, setAsset] = useState<GLTF | null>(null);
  useEffect(() => {
    new GLTFLoader()
      .loadAsync(staticFile("episodes/start-the-task/study-room-v1.glb"))
      .then(setAsset)
      .catch(cancelRender);
  }, []);
  useEffect(() => {
    if (asset) continueRender(handle);
  }, [asset, handle]);
  return asset;
};
const Camera = ({ t }: { t: number }) => {
  const { camera } = useThree();
  const c = cameraAt(t);
  useLayoutEffect(() => {
    camera.position.set(...c.position);
    camera.lookAt(...c.target);
    camera.updateMatrixWorld();
  }, [camera, c.position, c.target]);
  return null;
};
const Room = ({ asset, t }: { asset: GLTF; t: number }) => {
  const room = useMemo(() => {
    const root = asset.scene.clone(true);
    for (const name of [
      "Task_Block",
      "Coffee_1",
      "Coffee_2",
      "Coffee_3",
      "Cleaning_cloth",
      "Blank_page",
    ])
      root.getObjectByName(name)?.removeFromParent();
    root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return root;
  }, [asset]);
  const cups = useMemo(
    () =>
      [1, 2, 3].map((i) => {
        const obj = asset.scene.getObjectByName(`Coffee_${i}`)!.clone(true);
        obj.position.set(0, 0, 0);
        obj.traverse((o) => {
          if (o instanceof THREE.Mesh) o.castShadow = true;
        });
        return obj;
      }),
    [asset],
  );
  return (
    <>
      <Camera t={t} />
      <color attach="background" args={["#6e8d8b"]} />
      <ambientLight intensity={0.3} />
      <hemisphereLight args={["#e5f1f6", "#b59574", 1.25]} />
      <directionalLight
        position={[-3.4, 5, 4]}
        color="#ffe0b0"
        intensity={3.1}
        castShadow
        shadow-mapSize={[1536, 1536]}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={5}
        shadow-camera-bottom={-3}
        shadow-normalBias={0.015}
      />
      <directionalLight position={[3, 3, -2]} color="#a8daeb" intensity={1.6} />
      <pointLight
        position={[1.06, 1.5, 0.2]}
        color="#ffdfb0"
        intensity={4}
        distance={3}
      />
      <primitive object={room} />
      {cups.map((cup, i) => {
        const p = cupAt(t, i);
        return (
          <group key={i} position={[p.x, p.y, p.z]}>
            <primitive object={cup} />
            {[0, 1].map((j) => {
              const drift = (t * 0.11 + j * 0.09) % 0.3;
              return (
                <mesh key={j} position={[j * 0.045 - 0.02, 0.25 + drift, 0]}>
                  <sphereGeometry args={[0.011, 7, 5]} />
                  <meshBasicMaterial
                    color="#f2e7d0"
                    transparent
                    opacity={0.18 * (1 - drift / 0.3)}
                  />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </>
  );
};
export const StudyWorldV3 = ({ asset, t }: { asset: GLTF; t: number }) => (
  <ThreeCanvas
    width={1080}
    height={1920}
    camera={{ position: [0, 2.35, 7.4], fov: 36, near: 0.1, far: 45 }}
    gl={{
      antialias: true,
      alpha: false,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.05,
    }}
    shadows
    style={{ position: "absolute", inset: 0 }}
  >
    <Room asset={asset} t={t} />
  </ThreeCanvas>
);

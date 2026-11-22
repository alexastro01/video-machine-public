import { useMemo } from "react";
import * as THREE from "three";
import { e, propState, smooth, stageAt, type Vec3 } from "./motion";

function Rod({
  from,
  to,
  radius,
  color,
  endRadius,
}: {
  from: Vec3;
  to: Vec3;
  radius: number;
  color: string;
  endRadius?: number;
}) {
  const a = new THREE.Vector3(...from),
    b = new THREE.Vector3(...to),
    delta = b.sub(a);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    delta.clone().normalize(),
  );
  return (
    <mesh
      position={a.addScaledVector(delta, 0.5)}
      quaternion={q}
      castShadow
      receiveShadow
    >
      {endRadius === undefined ? (
        <capsuleGeometry
          args={[radius, Math.max(0.002, delta.length() - radius), 5, 12]}
        />
      ) : (
        <cylinderGeometry args={[endRadius, radius, delta.length(), 24]} />
      )}
      <meshStandardMaterial color={color} roughness={0.86} />
    </mesh>
  );
}

export function DrawerHand({ t }: { t: number }) {
  const age = t - e.drawer;
  if (age < 0 || age >= 0.79) return null;
  const reach = smooth(age / 0.17) * (1 - smooth((age - 0.59) / 0.2));
  const position: Vec3 = [
    -0.18 - (1 - reach) * 2.15,
    0.86 + (1 - reach) * 0.21,
    0.752 + propState(t).drawer + (1 - reach) * 0.47,
  ];
  const skin = "#efbe8a";
  return (
    <group position={position}>
      <Rod
        from={[-1.7, -0.25, 0.67]}
        to={[-0.44, 0.065, 0.18]}
        radius={0.163}
        endRadius={0.102}
        color="#829ea9"
      />
      <Rod
        from={[-0.448, 0.064, 0.181]}
        to={[-0.344, 0.088, 0.15]}
        radius={0.107}
        endRadius={0.093}
        color="#a8bfca"
      />
      <Rod
        from={[-0.346, 0.088, 0.15]}
        to={[-0.084, 0.09, 0.075]}
        radius={0.076}
        endRadius={0.06}
        color={skin}
      />
      <mesh
        position={[-0.02, 0.097, 0.055]}
        scale={[0.143, 0.049, 0.077]}
        castShadow
      >
        <sphereGeometry args={[1, 20, 12]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      {[-0.085, -0.03, 0.027, 0.079].map((x, i) => (
        <group key={x}>
          <Rod
            from={[x, 0.093, 0.062]}
            to={[x + 0.022, 0.047, 0.007]}
            radius={0.023 - i * 0.0016}
            color={skin}
          />
          <Rod
            from={[x + 0.022, 0.047, 0.007]}
            to={[x + 0.02, 0.004, 0.018]}
            radius={0.021 - i * 0.0015}
            color={skin}
          />
        </group>
      ))}
      <Rod
        from={[-0.113, 0.078, 0.08]}
        to={[-0.085, 0.014, 0.07]}
        radius={0.032}
        color={skin}
      />
    </group>
  );
}

export function SampleChip() {
  return (
    <group rotation={[0.34, -0.2, -0.07]} scale={0.83}>
      <mesh position={[0, 0.037, 0]} castShadow>
        <boxGeometry args={[0.215, 0.06, 0.12]} />
        <meshStandardMaterial color="#263e35" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.073, 0.004]}>
        <boxGeometry args={[0.088, 0.018, 0.07]} />
        <meshStandardMaterial
          color="#79b38e"
          metalness={0.45}
          roughness={0.34}
        />
      </mesh>
      {[-1, 1].map((side) =>
        [-0.068, -0.023, 0.023, 0.068].map((x) => (
          <mesh key={side + "-" + x} position={[x, 0.02, side * 0.07]}>
            <boxGeometry args={[0.017, 0.016, 0.037]} />
            <meshStandardMaterial
              color="#d1b477"
              metalness={0.48}
              roughness={0.43}
            />
          </mesh>
        )),
      )}
    </group>
  );
}

export function LapNotebook({ t }: { t: number }) {
  // Pencil-tip registration in the generated drawing: [-.081, .77, 0] in actor space.
  const progress = smooth((t - e.diner - 0.48) / 1.85);
  return (
    <group position={[-0.094, 0.753, 0.018]} rotation={[0.13, 0, -0.015]}>
      <mesh position={[0, -0.024, 0.07]} castShadow>
        <boxGeometry args={[0.6, 0.042, 0.32]} />
        <meshStandardMaterial color="#593f37" />
      </mesh>
      <mesh position={[0, 0.002, 0.07]} receiveShadow>
        <boxGeometry args={[0.57, 0.016, 0.3]} />
        <meshStandardMaterial color="#f9e8c7" />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[-0.11 + 0.09 * progress, 0.012, 0.035 + i * 0.047]}
          scale={[Math.max(0.001, progress), 1, 1]}
        >
          <boxGeometry args={[0.18 - i * 0.022, 0.003, 0.009]} />
          <meshBasicMaterial color="#595d56" />
        </mesh>
      ))}
    </group>
  );
}

export function RackMonitor({ t }: { t: number }) {
  const pulse = smooth((t - e.ai) / 1.15);
  return (
    <group position={[0, 3.19, -2.24]}>
      {Array.from({ length: 15 }, (_, i) => {
        const h =
          0.15 +
          pulse * (0.23 + 0.47 * (0.5 + 0.5 * Math.sin(i * 0.58 - t * 1.6)));
        return (
          <mesh key={i} position={[-0.94 + i * 0.135, -0.38 + h / 2, 0.002]}>
            <boxGeometry args={[0.083, h, 0.012]} />
            <meshBasicMaterial color={i < 11 ? "#99c596" : "#75aaa1"} />
          </mesh>
        );
      })}
      <mesh position={[0, -0.43, 0]}>
        <boxGeometry args={[2.1, 0.014, 0.01]} />
        <meshBasicMaterial color="#6f8a8c" />
      </mesh>
    </group>
  );
}

export function SetLighting({ t }: { t: number }) {
  const stage = stageAt(t),
    workshop = stage === "workshop",
    diner = stage === "diner",
    servers = stage === "servers";
  const crisis = workshop
    ? t < e.diner
      ? smooth((t - e.impact) / 0.34)
      : smooth((t - e.fail) / 0.38) * (1 - smooth((t - e.boardLock) / 0.5))
    : 0;
  const flash = workshop
    ? Math.max(
        ...[e.impact, e.fail].map((at) => {
          const age = t - at;
          return age >= 0 && age < 0.21 ? Math.exp(-age * 18) * 3.0 : 0;
        }),
      )
    : 0;
  const aim = useMemo(() => {
    const target = new THREE.Object3D();
    target.position.set(-0.31, 1.05, -0.07);
    return target;
  }, []);
  const keyPos: Vec3 = diner
    ? [-3.6, 4.7, 3.1]
    : servers
      ? [-2.55, 4.45, 3.5]
      : [-3.75, 4.95, 3.18];
  const intensity = workshop
    ? 2.35 - 0.92 * crisis
    : diner
      ? 2.68
      : servers
        ? 2.35
        : 2.3;
  return (
    <>
      <ambientLight
        intensity={workshop ? 0.38 - 0.105 * crisis : servers ? 0.32 : 0.4}
      />
      <hemisphereLight
        args={[
          servers ? "#b2d6e8" : "#d2e0ec",
          diner ? "#ad7152" : servers ? "#5c797c" : "#71818a",
          diner ? 0.95 : servers ? 0.83 : 0.8,
        ]}
      />
      <directionalLight
        position={keyPos}
        color={
          diner
            ? "#ffdfab"
            : servers
              ? "#d0e7ef"
              : workshop
                ? "#ffe2bd"
                : "#fff1dc"
        }
        intensity={intensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-4.8}
        shadow-camera-right={4.8}
        shadow-camera-top={5.1}
        shadow-camera-bottom={-3.8}
        shadow-normalBias={0.012}
        shadow-bias={-0.00016}
        shadow-radius={2.4}
      />
      <directionalLight
        position={[2.8, 3.8, -2.6]}
        color={servers ? "#86ddb9" : "#afcbed"}
        intensity={servers ? 2.45 : workshop ? 1.28 + 0.48 * crisis : 1.12}
      />
      {workshop && (
        <>
          <primitive object={aim} />
          <spotLight
            position={[1.53, 1.77, -0.65]}
            target={aim}
            color="#ffc079"
            intensity={5.4 + crisis * 2.1}
            angle={0.82}
            penumbra={0.92}
            distance={5}
          />
          <pointLight
            position={[0.65, 1.68, 0.24]}
            color={crisis > 0.5 ? "#db8e74" : "#9bdbe8"}
            intensity={0.85 + 1.4 * (1 - crisis)}
            distance={2.9}
          />
          <pointLight
            position={[-0.27, 1.45, 0.02]}
            intensity={flash}
            color="#ffd79c"
            distance={3.2}
          />
        </>
      )}
      {diner && (
        <>
          <pointLight
            position={[-1.9, 3.18, -0.35]}
            color="#ffc981"
            intensity={6.1}
            distance={5}
          />
          <pointLight
            position={[1.9, 3.18, -0.35]}
            color="#ffd49c"
            intensity={4.8}
            distance={5}
          />
        </>
      )}
      {servers && (
        <>
          <pointLight
            position={[1.34, 2.4, -0.3]}
            color="#8debc0"
            intensity={4.5}
            distance={5}
          />
          <pointLight
            position={[-1.2, 2.95, 0.8]}
            color="#a3cafa"
            intensity={2.7}
            distance={4.5}
          />
        </>
      )}
    </>
  );
}

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function SpaceStation() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.05;
  });

  return (
    <group ref={groupRef} position={[60, 10, -40]} scale={0.4}>
      {/* Central torus ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.5, 0.4, 12, 40]} />
        <meshStandardMaterial color="#334455" metalness={0.8} roughness={0.3} emissive="#112233" emissiveIntensity={0.3} />
      </mesh>
      {/* Central hub */}
      <mesh>
        <cylinderGeometry args={[0.6, 0.6, 2, 12]} />
        <meshStandardMaterial color="#445566" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Spokes */}
      {[0, 1, 2, 3].map(i => (
        <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
          <boxGeometry args={[3.5, 0.15, 0.15]} />
          <meshStandardMaterial color="#556677" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* Window lights */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
        <mesh key={i} position={[
          Math.cos((i / 8) * Math.PI * 2) * 3.5,
          0,
          Math.sin((i / 8) * Math.PI * 2) * 3.5
        ]}>
          <boxGeometry args={[0.2, 0.2, 0.1]} />
          <meshBasicMaterial color="#aaddff" transparent opacity={0.8} />
        </mesh>
      ))}
      {/* Ambient light from station */}
      <pointLight color="#88aaff" intensity={0.5} distance={20} />
    </group>
  );
}

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SatelliteProps {
  orbitRadius?: number;
  orbitSpeed?: number;
  size?: number;
}

export function Satellite({ orbitRadius = 15, orbitSpeed = 0.5, size = 0.8 }: SatelliteProps) {
  const groupRef = useRef<THREE.Group>(null);
  const blinkRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime * orbitSpeed;
    if (groupRef.current) {
      groupRef.current.position.set(Math.cos(t) * orbitRadius, Math.sin(t * 0.3) * 1.5, Math.sin(t) * orbitRadius);
      groupRef.current.rotation.y += 0.01;
      groupRef.current.rotation.x += 0.005;
    }
    // Blinking light
    if (blinkRef.current) {
      const mat = blinkRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 8);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh>
        <boxGeometry args={[size * 1.5, size * 1.5, size * 1.5]} />
        <meshStandardMaterial color="#aaaaaa" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Solar panels */}
      <mesh position={[size * 1.8, 0, 0]}>
        <boxGeometry args={[size * 2.5, size * 0.1, size * 1.5]} />
        <meshStandardMaterial color="#1a3a6a" metalness={0.5} roughness={0.3} emissive="#002244" />
      </mesh>
      <mesh position={[-size * 1.8, 0, 0]}>
        <boxGeometry args={[size * 2.5, size * 0.1, size * 1.5]} />
        <meshStandardMaterial color="#1a3a6a" metalness={0.5} roughness={0.3} emissive="#002244" />
      </mesh>
      {/* Blinking light */}
      <mesh ref={blinkRef} position={[0, size * 1.2, 0]}>
        <sphereGeometry args={[size * 0.3, 8, 8]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

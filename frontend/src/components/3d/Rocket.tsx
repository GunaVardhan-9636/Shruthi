import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function Rocket() {
  const groupRef = useRef<THREE.Group>(null);
  
  // Create a cinematic spline path crossing the solar system
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-60, -15, -40),
      new THREE.Vector3(-30, 8, -20),
      new THREE.Vector3(0, 18, 15),
      new THREE.Vector3(30, 5, 25),
      new THREE.Vector3(50, -5, 10),
      new THREE.Vector3(70, -20, -20)
    ], false, 'catmullrom', 0.5);
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Animate along the path: reset every 25 seconds
    const t = (state.clock.elapsedTime % 25) / 25; 
    
    // Get position and a point slightly ahead to look at
    const pos = curve.getPointAt(t);
    // Add small avoidance so it doesn't crash on end of path
    const targetT = Math.min(t + 0.01, 1.0);
    const target = curve.getPointAt(targetT);
    
    groupRef.current.position.copy(pos);
    groupRef.current.lookAt(target);
  });

  return (
    <group ref={groupRef}>
      {/* Main body */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.6, 4, 16]} />
        <meshStandardMaterial color="#dddddd" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Nose cone */}
      <mesh position={[0, 0, 2.5]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.4, 1.5, 16]} />
        <meshStandardMaterial color="#ff2222" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Fins */}
      <mesh position={[0, 0, -1.5]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[2.5, 1.2, 0.1]} />
        <meshStandardMaterial color="#ff2222" metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, -1.5]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
        <boxGeometry args={[2.5, 1.2, 0.1]} />
        <meshStandardMaterial color="#ff2222" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Engine glow core */}
      <mesh position={[0, 0, -2.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.05, 1.5, 16]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.9} />
      </mesh>
      {/* Engine glow halo */}
      <mesh position={[0, 0, -2.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.6, 0.1, 2.5, 16]} />
        <meshBasicMaterial color="#0088ff" transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* Point light for engine */}
      <pointLight position={[0, 0, -2.5]} color="#00ffff" distance={25} intensity={3} />
    </group>
  );
}

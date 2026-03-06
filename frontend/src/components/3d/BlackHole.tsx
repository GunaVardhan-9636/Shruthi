import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Gravitational lensing / accretion disk shader
const blackHoleFragShader = `
  precision highp float;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec2 uv = vUv - 0.5;
    float r = length(uv);
    float angle = atan(uv.y, uv.x);
    
    // Swirling accretion disk
    float swirl = angle + r * 6.0 - uTime * 1.5;
    float disk = pow(max(0.0, sin(swirl * 3.0) * 0.5 + 0.5), 3.0);
    disk *= smoothstep(0.48, 0.15, r) * smoothstep(0.05, 0.15, r);
    
    // Color: white-hot center → orange → deep red
    vec3 hotCol = mix(vec3(1.0, 0.8, 0.3), vec3(1.0, 0.2, 0.0), r * 2.5);
    hotCol = mix(hotCol, vec3(0.7, 0.0, 0.3), smoothstep(0.2, 0.5, r));
    
    // Black hole event horizon
    float horizon = smoothstep(0.12, 0.08, r);
    vec3 col = hotCol * disk * (1.0 - horizon);
    float alpha = disk * 0.9 + horizon * 0.0;
    
    gl_FragColor = vec4(col, alpha);
  }
`;

const blackHoleVertShader = `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

interface BlackHoleProps {
  visible: boolean;
  position?: [number, number, number];
}

export function BlackHole({ visible, position = [35, 5, -20] }: BlackHoleProps) {
  const diskRef = useRef<THREE.Mesh>(null);
  const disk2Ref = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const uniforms = useRef({ uTime: { value: 0 } });

  useFrame((_, delta) => {
    uniforms.current.uTime.value += delta;
    if (diskRef.current) diskRef.current.rotation.z += delta * 0.4;
    if (disk2Ref.current) disk2Ref.current.rotation.z -= delta * 0.25;
    if (coreRef.current) {
      const s = 1.0 + 0.05 * Math.sin(uniforms.current.uTime.value * 3);
      coreRef.current.scale.setScalar(s);
    }
  });

  if (!visible) return null;

  return (
    <group position={position}>
      {/* Event horizon — pure black sphere */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Gravitational lens corona */}
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color="#1a0030" transparent opacity={0.6} side={THREE.BackSide} />
      </mesh>

      {/* Accretion disk plane 1 */}
      <mesh ref={diskRef} rotation={[Math.PI * 0.15, 0, 0]}>
        <planeGeometry args={[7, 7, 1, 1]} />
        <shaderMaterial
          vertexShader={blackHoleVertShader}
          fragmentShader={blackHoleFragShader}
          uniforms={uniforms.current}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Accretion disk plane 2 — offset angle */}
      <mesh ref={disk2Ref} rotation={[Math.PI * 0.22, Math.PI * 0.1, 0]}>
        <planeGeometry args={[5.5, 5.5, 1, 1]} />
        <shaderMaterial
          vertexShader={blackHoleVertShader}
          fragmentShader={blackHoleFragShader}
          uniforms={uniforms.current}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Red alert light from black hole */}
      <pointLight color="#FF0044" intensity={3} distance={30} decay={1.5} />
    </group>
  );
}

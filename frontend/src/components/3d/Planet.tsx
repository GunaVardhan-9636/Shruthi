import { useRef, useState, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import type { PlanetConfig, ModuleKey } from '../../types';

// Atmosphere scattering shader (Rayleigh-style fresnel)
const atmosphereVertShader = `
  precision highp float;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const atmosphereFragShader = `
  precision highp float;
  uniform vec3 uAtmColor;
  uniform float uHovered;
  uniform float uSelected;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);
    float intensity = fresnel * (0.6 + uHovered * 0.4 + uSelected * 0.6);
    // Light scattering: fade toward top
    float scatter = 0.7 + 0.3 * vNormal.y;
    vec3 col = uAtmColor * scatter;
    gl_FragColor = vec4(col, intensity * 0.85);
  }
`;

// Map planet ID to NASA texture file
const PLANET_TEXTURES: Record<string, string> = {
  settings: '/textures/mercury.jpg',   // Mercury-like metallic
  reports: '/textures/jupiter.jpg',    // Jupiter gas giant
  upload: '/textures/mars.jpg',        // Mars rocky
  live: '/textures/neptune.jpg',       // Neptune ice giant
  manual: '/textures/moon.jpg',        // Moon/volcanic
};

interface PlanetProps {
  config: PlanetConfig;
  position: THREE.Vector3;
  isActive: boolean;
  onClick: (id: ModuleKey) => void;
}

export function Planet({ config, position, isActive, onClick }: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const atmRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const texturePath = PLANET_TEXTURES[config.id ?? ''] || '/textures/moon.jpg';
  const planetTexture = useLoader(TextureLoader, texturePath);

  const atmUniforms = useRef({
    uAtmColor: { value: new THREE.Color(config.color) },
    uHovered: { value: 0 },
    uSelected: { value: 0 },
  });

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    atmUniforms.current.uHovered.value = THREE.MathUtils.lerp(atmUniforms.current.uHovered.value, hovered ? 1 : 0, 0.1);
    atmUniforms.current.uSelected.value = THREE.MathUtils.lerp(atmUniforms.current.uSelected.value, isActive ? 1 : 0, 0.08);

    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.18;
      meshRef.current.position.copy(position);
    }
    if (atmRef.current) atmRef.current.position.copy(position);
    if (ringRef.current) { ringRef.current.rotation.x += delta * 0.3; ringRef.current.position.copy(position); }
    if (ring2Ref.current) { ring2Ref.current.rotation.y += delta * 0.15; ring2Ref.current.position.copy(position); }
    if (pulseRef.current) {
      const s = 1.0 + 0.25 * Math.sin(t * 2.5);
      pulseRef.current.scale.setScalar(s);
      pulseRef.current.position.copy(position);
      (pulseRef.current.material as THREE.MeshBasicMaterial).opacity = 0.06 + 0.04 * Math.sin(t * 2);
    }
  });

  // Saturn-like rings for Threat Intelligence (Jupiter-inspired)

  const ringGeometry = useMemo(() => {
    if (!config.hasRings) return null;
    const geo = new THREE.RingGeometry(config.size * 1.8, config.size * 2.8, 64);
    return geo;
  }, [config.hasRings, config.size]);

  return (
    <group>
      {/* PBR Planet sphere with NASA texture */}
      <mesh
        ref={meshRef}
        position={position}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => { e.stopPropagation(); onClick(config.id); }}
        castShadow receiveShadow
      >
        <sphereGeometry args={[config.size, 64, 64]} />
        <meshStandardMaterial
          map={planetTexture}
          roughness={config.id === 'settings' ? 0.3 : 0.7}
          metalness={config.id === 'settings' ? 0.8 : 0.1}
          emissive={new THREE.Color(config.emissive)}
          emissiveIntensity={isActive ? 0.25 : hovered ? 0.12 : 0.0}
        />
      </mesh>

      {/* Atmospheric scattering halo */}
      <mesh ref={atmRef} position={position}>
        <sphereGeometry args={[config.size * 1.18, 32, 32]} />
        <shaderMaterial
          vertexShader={atmosphereVertShader}
          fragmentShader={atmosphereFragShader}
          uniforms={atmUniforms.current}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Physical data rings for Threat Intelligence */}
      {config.hasRings && ringGeometry && (
        <>
          <mesh ref={ringRef} position={position} rotation={[Math.PI * 0.4, 0, 0]}>
            <primitive object={ringGeometry} />
            <meshBasicMaterial color={config.color} transparent opacity={0.5} side={THREE.DoubleSide} />
          </mesh>
          <mesh ref={ring2Ref} position={position} rotation={[Math.PI * 0.35, 0.4, 0]}>
            <torusGeometry args={[config.size * 3.2, 0.02, 4, 80]} />
            <meshBasicMaterial color={config.emissive} transparent opacity={0.3} />
          </mesh>
        </>
      )}

      {/* Signal pulse wireframe for Live Stream */}
      {config.hasSignalPulse && (
        <mesh ref={pulseRef} position={position}>
          <sphereGeometry args={[config.size * 2.2, 12, 12]} />
          <meshBasicMaterial color={config.color} transparent opacity={0.07} wireframe />
        </mesh>
      )}

      {/* Hover / Active label */}
      {(hovered || isActive) && (
        <Html
          position={[position.x, position.y + config.size + 1.1, position.z]}
          center zIndexRange={[1, 0]}
        >
          <div style={{
            background: 'rgba(0,0,0,0.75)',
            border: `1px solid ${config.color}66`,
            color: config.color,
            padding: '5px 14px',
            borderRadius: '20px',
            fontSize: '10px',
            fontFamily: 'Orbitron, monospace',
            letterSpacing: '2px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: `0 0 20px ${config.color}33`,
            backdropFilter: 'blur(8px)',
          }}>
            {config.icon} {config.name.toUpperCase()}
          </div>
        </Html>
      )}
    </group>
  );
}

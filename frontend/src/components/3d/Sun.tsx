import { useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { TextureLoader } from 'three';
import * as THREE from 'three';

// Advanced volumetric solar shader
const sunFragShader = `
  precision highp float;
  uniform float uTime;
  uniform sampler2D uSunTexture;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  // FBM noise for plasma distortion
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i+vec2(1.0,0.0)),f.x),
               mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)),f.x),f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 6; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
    return v;
  }

  void main() {
    float t = uTime * 0.15;
    vec2 q = vec2(fbm(vUv * 2.5 + vec2(t, t*0.8)),
                  fbm(vUv * 2.5 + vec2(t*0.7, t*1.1)));
    vec2 r = vec2(fbm(vUv * 3.5 + 4.0 * q + vec2(1.7, 9.2) + t * 0.15),
                  fbm(vUv * 3.5 + 4.0 * q + vec2(8.3, 2.8) + t * 0.126));
    float f = fbm(vUv * 3.0 + 4.0 * r);
    
    vec2 distortedUv = vUv + (r - 0.5) * 0.18;
    vec4 texColor = texture2D(uSunTexture, distortedUv);
    
    vec3 sunCore = vec3(1.0, 0.98, 0.82);
    vec3 sunEdge = vec3(1.0, 0.45, 0.05);
    vec3 plasma = mix(sunEdge, sunCore, f * 0.8 + 0.1);
    
    vec3 col = mix(texColor.rgb * 1.8, plasma, 0.4);
    
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.5);
    col += fresnel * vec3(1.0, 0.7, 0.2) * 2.0;
    
    float pulse = 0.5 + 0.5 * sin(uTime * 1.4);
    col += pulse * 0.12 * vec3(1.0, 0.8, 0.4);
    
    col = clamp(col * 1.5, 0.0, 3.0);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const sunVertShader = `
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

// Corona glow shader
const coronaFragShader = `
  precision highp float;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.5);
    float pulse = 0.7 + 0.3 * sin(uTime * 0.8);
    vec3 coronaColor = mix(vec3(1.0, 0.5, 0.1), vec3(1.0, 0.9, 0.4), fresnel);
    gl_FragColor = vec4(coronaColor, fresnel * 0.7 * pulse);
  }
`;

const coronaVertShader = `
  precision highp float;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

interface SunProps {
  isProcessing: boolean;
  isAlertMode: boolean;
  onClick: () => void;
}

export function Sun({ isProcessing, isAlertMode, onClick }: SunProps) {
  const coreRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);

  const sunTexture = useLoader(TextureLoader, '/textures/sun.jpg');
  sunTexture.wrapS = sunTexture.wrapT = THREE.RepeatWrapping;

  const coreUniforms = useRef({
    uTime: { value: 0 },
    uSunTexture: { value: sunTexture },
  });
  const coronaUniforms = useRef({ uTime: { value: 0 } });

  useFrame((_, delta) => {
    coreUniforms.current.uTime.value += delta;
    coronaUniforms.current.uTime.value += delta;
    if (coreRef.current) coreRef.current.rotation.y += delta * 0.04;
    if (coronaRef.current) coronaRef.current.rotation.y += delta * 0.02;
    if (ring1Ref.current) ring1Ref.current.rotation.z += delta * (isProcessing ? 0.6 : 0.12);
    if (ring2Ref.current) ring2Ref.current.rotation.x += delta * (isProcessing ? -0.45 : -0.08);
    if (ring3Ref.current) ring3Ref.current.rotation.y += delta * 0.05;
  });

  return (
    <group onClick={onClick}>
      {/* Volumetric core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[2.6, 64, 64]} />
        <shaderMaterial
          vertexShader={sunVertShader}
          fragmentShader={sunFragShader}
          uniforms={coreUniforms.current}
        />
      </mesh>

      {/* Corona glow halo */}
      <mesh ref={coronaRef}>
        <sphereGeometry args={[4.0, 32, 32]} />
        <shaderMaterial
          vertexShader={coronaVertShader}
          fragmentShader={coronaFragShader}
          uniforms={coronaUniforms.current}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer atmosphere glow */}
      <mesh>
        <sphereGeometry args={[5.5, 16, 16]} />
        <meshBasicMaterial
          color={isAlertMode ? '#FF2200' : '#FF6600'}
          transparent
          opacity={0.025}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Energy rings */}
      <mesh ref={ring1Ref} rotation={[Math.PI * 0.5, 0, 0]}>
        <torusGeometry args={[4.0, 0.03, 6, 100]} />
        <meshBasicMaterial color="#FFD700" transparent opacity={0.5} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[0.4, 0.4, 0]}>
        <torusGeometry args={[4.8, 0.02, 6, 100]} />
        <meshBasicMaterial color="#FFA040" transparent opacity={0.35} />
      </mesh>
      <mesh ref={ring3Ref} rotation={[1.2, 0.8, 0.4]}>
        <torusGeometry args={[5.5, 0.015, 6, 100]} />
        <meshBasicMaterial color={isAlertMode ? '#FF3300' : '#FF6600'} transparent opacity={0.2} />
      </mesh>

      {/* Sun as dominant point light */}
      <pointLight
        color={isAlertMode ? '#FF3300' : '#FFF0CC'}
        intensity={isProcessing ? 12 : 7}
        distance={150}
        decay={1.2}
      />
      <pointLight color="#FFD700" intensity={3} distance={60} decay={1.5} />

      {/* Label */}
      <Html center position={[0, 4.5, 0]} zIndexRange={[1, 0]}>
        <div style={{
          background: 'rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,200,50,0.5)',
          color: '#FFD060',
          padding: '5px 14px',
          borderRadius: '20px',
          fontSize: '10px',
          fontFamily: 'Orbitron, monospace',
          letterSpacing: '3px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          textShadow: '0 0 15px #FFD060',
          backdropFilter: 'blur(6px)',
        }}>
          ⚡ AI CORE PROCESSING
        </div>
      </Html>
    </group>
  );
}

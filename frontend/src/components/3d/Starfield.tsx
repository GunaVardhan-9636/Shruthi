import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';

export function Starfield() {
  const nearRef = useRef<THREE.Points>(null);
  const midRef = useRef<THREE.Points>(null);
  const farRef = useRef<THREE.Points>(null);
  const bgMeshRef = useRef<THREE.Mesh>(null);
  
  const milkyWayTexture = useLoader(TextureLoader, '/textures/stars.jpg');

  // GPU-particle starfields: 100k+ stars across 3 layers
  const [nearGeo, midGeo, farGeo] = useMemo(() => {
    const makeStars = (count: number, spread: number, minSize: number, maxSize: number) => {
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      
      // Star color temperature palette
      const starColors = [
        new THREE.Color('#fffbe4'), // G-type (sun-like, yellowish white)
        new THREE.Color('#fff4d6'), // K-type (orange tint)
        new THREE.Color('#cce8ff'), // A-type (blue-white)
        new THREE.Color('#ffffff'), // pure white
        new THREE.Color('#ffddaa'), // orange giant
        new THREE.Color('#aaccff'), // B-type (blue)
      ];

      for (let i = 0; i < count; i++) {
        // Distribute stars in a sphere shell for depth
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = spread * (0.7 + Math.random() * 0.3);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        // Slightly varied star color
        const col = starColors[Math.floor(Math.random() * starColors.length)];
        colors[i * 3] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;

        sizes[i] = minSize + Math.random() * (maxSize - minSize);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      return geo;
    };

    return [
      makeStars(30000, 150, 0.4, 2.2),  // near: bright, varied
      makeStars(50000, 300, 0.2, 1.2),  // mid: medium
      makeStars(20000, 500, 0.1, 0.7),  // far: faint, tiny
    ];
  }, []);

  // Shader material for realistic stars with twinkling
  const starMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      precision highp float;
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      varying float vSize;
      uniform float uTime;
      void main() {
        vColor = color;
        vSize = size;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        // Subtle twinkle via size modulation per star
        float twinkle = 1.0 + 0.15 * sin(uTime * 2.3 + position.x * 4.7 + position.y * 3.1);
        gl_PointSize = size * twinkle * (300.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec3 vColor;
      varying float vSize;
      void main() {
        // Circular star disc with soft edge
        vec2 uv = gl_PointCoord - 0.5;
        float r = length(uv);
        if (r > 0.5) discard;
        float alpha = 1.0 - smoothstep(0.2, 0.5, r);
        // Bright center spike for larger stars
        float spike = exp(-r * 12.0 * (1.0 / max(vSize, 0.5)));
        vec3 col = vColor + vec3(0.8, 0.9, 1.0) * spike * 0.6;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  }), []);

  const farMaterial = useMemo(() => starMaterial.clone(), [starMaterial]);

  useFrame((state) => {
    starMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    farMaterial.uniforms.uTime.value = state.clock.elapsedTime * 0.5;
    // Very slow rotation for parallax depth
    if (nearRef.current) nearRef.current.rotation.y = state.clock.elapsedTime * 0.004;
    if (midRef.current) midRef.current.rotation.y = state.clock.elapsedTime * 0.002;
  });

  return (
    <group>
      {/* Milky Way background sphere */}
      <mesh ref={bgMeshRef} renderOrder={-1}>
        <sphereGeometry args={[490, 32, 32]} />
        <meshBasicMaterial map={milkyWayTexture} side={THREE.BackSide} transparent opacity={0.5} />
      </mesh>

      {/* Deep space nebula tint */}
      <mesh renderOrder={-2}>
        <sphereGeometry args={[480, 16, 16]} />
        <meshBasicMaterial color="#0a0015" side={THREE.BackSide} transparent opacity={0.6} />
      </mesh>

      {/* 3-layer GPU particle stars */}
      <points ref={nearRef} geometry={nearGeo} material={starMaterial} />
      <points ref={midRef} geometry={midGeo} material={starMaterial} />
      <points ref={farRef} geometry={farGeo} material={farMaterial} />
    </group>
  );
}

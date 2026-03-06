import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ModuleKey } from '../../types';
import { PLANETS, PLANET_START_ANGLES } from '../../types';
import { Planet } from './Planet';
import { OrbitPath } from './OrbitPath';
import { Sun } from './Sun';
import { Satellite } from './Satellite';
import { SpaceStation } from './SpaceStation';
import { BlackHole } from './BlackHole';
import { Rocket } from './Rocket';

interface SolarSystemProps {
  activeModule: ModuleKey;
  isProcessing: boolean;
  isAlertMode: boolean;
  onPlanetClick: (id: ModuleKey) => void;
  onSunClick: () => void;
  onPositionsUpdate: (positions: Record<string, THREE.Vector3>) => void;
}

export function SolarSystem({
  activeModule, isProcessing, isAlertMode,
  onPlanetClick, onSunClick, onPositionsUpdate
}: SolarSystemProps) {
  // Track each planet's angle
  const angles = useRef<Record<string, number>>(
    Object.fromEntries(PLANETS.map(p => [p.id!, PLANET_START_ANGLES[p.id!] ?? 0]))
  );
  const positions = useRef<Record<string, THREE.Vector3>>(
    Object.fromEntries(PLANETS.map(p => [p.id!, new THREE.Vector3()]))
  );

  useFrame((_, delta) => {
    PLANETS.forEach(planet => {
      if (!planet.id) return;
      // Slow down planets that aren't active; pause all when one is focused
      const slowFactor = activeModule && activeModule !== planet.id ? 0.2 : 1.0;
      angles.current[planet.id] += delta * planet.orbitSpeed * slowFactor * 0.5;
      const a = angles.current[planet.id];
      
      // Update local position ref for rendering
      positions.current[planet.id].set(
        Math.cos(a) * planet.orbitRadius,
        0,
        Math.sin(a) * planet.orbitRadius
      );
    });

    // Directly mutate the shared mutable ref to avoid React renders
    if (onPositionsUpdate) {
       onPositionsUpdate(positions.current);
    }
  });

  // Asteroid belt geometry (instanced between orbits 20 and 25)
  const asteroidPositions = useMemo(() => {
    const positions = new Float32Array(800 * 3);
    for (let i = 0; i < 800; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 22 + Math.random() * 4;
      const ySpread = (Math.random() - 0.5) * 0.8;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = ySpread;
      positions[i * 3 + 2] = Math.sin(angle) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  return (
    <group>
      {/* Sun at center */}
      <Sun isProcessing={isProcessing} isAlertMode={isAlertMode} onClick={onSunClick} />

      {/* Scene lighting */}
      <ambientLight intensity={0.08} color="#0d0020" />

      {/* Orbit paths */}
      {PLANETS.map(planet => (
        <OrbitPath
          key={`orbit-${planet.id}`}
          radius={planet.orbitRadius}
          color={planet.color}
          isActive={activeModule === planet.id}
        />
      ))}

      {/* Asteroid belt */}
      <points geometry={asteroidPositions}>
        <pointsMaterial color="#aaaaaa" size={0.07} sizeAttenuation transparent opacity={0.6} />
      </points>

      {/* Planets */}
      {PLANETS.map(planet => (
        <Planet
          key={planet.id}
          config={planet}
          position={positions.current[planet.id!] ?? new THREE.Vector3()}
          isActive={activeModule === planet.id}
          onClick={onPlanetClick}
        />
      ))}

      {/* Satellites */}
      <Satellite orbitRadius={12} orbitSpeed={0.3} size={0.6} />
      <Satellite orbitRadius={18} orbitSpeed={-0.2} size={0.5} />
      <Satellite orbitRadius={28} orbitSpeed={0.15} size={0.8} />

      {/* Cinematic Rocket */}
      <Rocket />

      {/* Space station */}
      <SpaceStation />

      {/* Black hole — appears when alert mode active */}
      <BlackHole visible={isAlertMode} position={[35, 5, -20]} />
    </group>
  );
}


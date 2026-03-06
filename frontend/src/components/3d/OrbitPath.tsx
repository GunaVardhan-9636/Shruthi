import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

interface OrbitPathProps {
  radius: number;
  color: string;
  isActive?: boolean;
}

export function OrbitPath({ radius, color, isActive }: OrbitPathProps) {
  const lineMatRef = useRef<THREE.LineBasicMaterial>(null);

  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      pts.push([Math.cos(angle) * radius, 0, Math.sin(angle) * radius]);
    }
    return pts;
  }, [radius]);

  useFrame((state) => {
    if (lineMatRef.current) {
      const pulse = 0.06 + 0.04 * Math.sin(state.clock.elapsedTime + radius);
      lineMatRef.current.opacity = isActive ? 0.45 : pulse;
    }
  });

  return (
    <Line points={points} color={color} transparent opacity={0.1} lineWidth={1}>
      <lineBasicMaterial ref={lineMatRef} attach="material" color={color} transparent />
    </Line>
  );
}


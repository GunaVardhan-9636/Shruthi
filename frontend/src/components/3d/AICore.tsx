import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';

interface AICoreProps {
  isProcessing: boolean;
  isAlertMode: boolean;
}

export const AICore: React.FC<AICoreProps> = ({ isProcessing, isAlertMode }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += isProcessing ? 0.02 : 0.005;
      meshRef.current.rotation.x += 0.002;
    }
  });

  const baseColor = isAlertMode ? "#ff0000" : "#ff2e2e";
  
  return (
    <Sphere ref={meshRef} args={[1.5, 64, 64]} position={[0,0,0]}>
      <MeshDistortMaterial 
         color={baseColor} 
         emissive={baseColor} 
         emissiveIntensity={isProcessing ? 2 : 0.5} 
         wireframe={true} 
         distort={isProcessing ? 0.5 : 0.1} 
         speed={isProcessing ? 5 : 1}
      />
    </Sphere>
  );
};

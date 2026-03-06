import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { spatialNodes } from '../../types';
import type { ModuleKey } from '../../types';

export const CameraRig = ({ activeModule }: { activeModule: ModuleKey }) => {
  const currentTarget = useRef(new THREE.Vector3(0, 0, 0));
  
  useFrame((state) => {
    const targetPos = new THREE.Vector3(0, 0, 12);
    const targetLook = new THREE.Vector3(0, 0, 0);

    if (activeModule && spatialNodes[activeModule]) {
       const [x, y, z] = spatialNodes[activeModule].position;
       targetPos.set(x, y, 6); // Pull camera slightly further back
       targetLook.set(x, y, z);
    }
    
    // Add subtle parallax depth horizontally based on mouse
    if (!activeModule) {
      targetPos.x += (state.pointer.x * 2);
      targetPos.y += (state.pointer.y * 2);
    }
    
    state.camera.position.lerp(targetPos, 0.05);
    currentTarget.current.lerp(targetLook, 0.05);
    state.camera.lookAt(currentTarget.current);
  });
  
  return null;
};

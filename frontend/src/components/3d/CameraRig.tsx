import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import type { ModuleKey } from '../../types';

interface CameraRigProps {
  activeModule: ModuleKey;
  planetPositions: Record<string, THREE.Vector3>;
  introComplete: boolean;
  onIntroEnd: () => void;
}

export function CameraRig({ activeModule, planetPositions, introComplete, onIntroEnd }: CameraRigProps) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 18, 42));
  const targetLook = useRef(new THREE.Vector3(0, 0, 0));
  const currentLook = useRef(new THREE.Vector3(0, 0, 0));
  const mouse = useRef({ x: 0, y: 0 });
  const introRan = useRef(false);

  // Mouse parallax
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Cinematic intro
  useEffect(() => {
    if (introRan.current) return;
    introRan.current = true;

    camera.position.set(0, 5, 200);
    camera.lookAt(0, 0, 0);

    const tl = gsap.timeline({ onComplete: onIntroEnd });
    tl.to(camera.position, { z: 42, y: 18, duration: 4.5, ease: 'power2.inOut' });
  }, [camera, onIntroEnd]);

  // Fly to planet when module selected
  useEffect(() => {
    if (!introComplete) return;

    if (activeModule && planetPositions[activeModule]) {
      const pos = planetPositions[activeModule];
      const offset = pos.clone().normalize().multiplyScalar(8);
      gsap.to(targetPos.current, {
        x: pos.x + offset.x,
        y: pos.y + 4,
        z: pos.z + offset.z + 8,
        duration: 1.8,
        ease: 'power2.inOut',
      });
      gsap.to(targetLook.current, {
        x: pos.x, y: pos.y, z: pos.z,
        duration: 1.8, ease: 'power2.inOut',
      });
    } else {
      gsap.to(targetPos.current, {
        x: 0, y: 18, z: 42,
        duration: 2.0, ease: 'power2.inOut',
      });
      gsap.to(targetLook.current, {
        x: 0, y: 0, z: 0,
        duration: 2.0, ease: 'power2.inOut',
      });
    }
  }, [activeModule, introComplete]); // removed planetPositions to prevent infinite react loop

  useFrame(() => {
    // Idle float + parallax
    const time = Date.now() * 0.0003;
    const idleX = Math.sin(time * 0.7) * (activeModule ? 0 : 1.5);
    const idleY = Math.cos(time * 0.4) * (activeModule ? 0 : 0.8);

    const parallaxX = mouse.current.x * (activeModule ? 0.5 : 2);
    const parallaxY = -mouse.current.y * (activeModule ? 0.3 : 1);

    camera.position.lerp(
      new THREE.Vector3(
        targetPos.current.x + idleX + parallaxX,
        targetPos.current.y + idleY + parallaxY,
        targetPos.current.z
      ),
      0.04
    );

    currentLook.current.lerp(targetLook.current, 0.05);
    camera.lookAt(currentLook.current);
  });

  return null;
}

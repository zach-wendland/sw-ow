"use client";

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { Vector3, type Mesh } from "three";
import { usePlayerStore } from "@/lib/stores/usePlayerStore";

interface PlayerProps {
  position?: [number, number, number];
}

const MOVE_SPEED = 5;
const SPRINT_MULTIPLIER = 1.8;
const JUMP_FORCE = 8;
const GRAVITY = -20;

export function Player({ position = [0, 0, 0] }: PlayerProps) {
  const meshRef = useRef<Mesh>(null);
  const velocityRef = useRef(new Vector3(0, 0, 0));
  const isGroundedRef = useRef(true);

  const setPosition = usePlayerStore((state) => state.setPosition);

  const [, getKeys] = useKeyboardControls();

  // Initialize position
  useEffect(() => {
    setPosition({ x: position[0], y: position[1], z: position[2] });
  }, [position, setPosition]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const { forward, backward, left, right, jump, sprint } = getKeys();

    // Calculate movement direction
    const moveX = (right ? 1 : 0) - (left ? 1 : 0);
    const moveZ = (backward ? 1 : 0) - (forward ? 1 : 0);

    // Apply sprint multiplier
    const speed = sprint ? MOVE_SPEED * SPRINT_MULTIPLIER : MOVE_SPEED;

    // Update horizontal velocity
    velocityRef.current.x = moveX * speed;
    velocityRef.current.z = moveZ * speed;

    // Handle jumping
    if (jump && isGroundedRef.current) {
      velocityRef.current.y = JUMP_FORCE;
      isGroundedRef.current = false;
    }

    // Apply gravity
    if (!isGroundedRef.current) {
      velocityRef.current.y += GRAVITY * delta;
    }

    // Update position
    meshRef.current.position.x += velocityRef.current.x * delta;
    meshRef.current.position.y += velocityRef.current.y * delta;
    meshRef.current.position.z += velocityRef.current.z * delta;

    // Ground check (simple floor at y=0)
    if (meshRef.current.position.y <= 1) {
      meshRef.current.position.y = 1;
      velocityRef.current.y = 0;
      isGroundedRef.current = true;
    }

    // Update store
    setPosition({
      x: meshRef.current.position.x,
      y: meshRef.current.position.y,
      z: meshRef.current.position.z,
    });
  });

  return (
    <mesh ref={meshRef} position={position} castShadow>
      {/* Placeholder player model - capsule shape */}
      <capsuleGeometry args={[0.5, 1, 8, 16]} />
      <meshStandardMaterial color="#4a9eff" />
    </mesh>
  );
}

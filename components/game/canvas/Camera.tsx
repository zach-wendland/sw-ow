"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { usePlayerStore } from "@/lib/stores/usePlayerStore";
import { useCombatStore } from "@/lib/stores/useCombatStore";

const CAMERA_DISTANCE = 10;
const CAMERA_HEIGHT = 4;
const CAMERA_LERP = 0.1;

export function ThirdPersonCamera() {
  const { camera } = useThree();
  const targetPosition = useRef(new Vector3());
  const currentPosition = useRef(new Vector3(0, 5, 10));

  const playerPosition = usePlayerStore((state) => state.position);
  const getScreenShake = useCombatStore((state) => state.getScreenShake);

  useFrame(() => {
    // Calculate target camera position behind player
    targetPosition.current.set(
      playerPosition.x,
      playerPosition.y + CAMERA_HEIGHT,
      playerPosition.z + CAMERA_DISTANCE
    );

    // Smoothly interpolate camera position
    currentPosition.current.lerp(targetPosition.current, CAMERA_LERP);

    // Apply screen shake offset
    const shake = getScreenShake();
    camera.position.set(
      currentPosition.current.x + shake.x,
      currentPosition.current.y + shake.y,
      currentPosition.current.z
    );

    // Look at player (with slight shake offset for more dramatic effect)
    camera.lookAt(
      playerPosition.x + shake.x * 0.5,
      playerPosition.y + 1 + shake.y * 0.5,
      playerPosition.z
    );
  });

  return null;
}

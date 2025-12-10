"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { usePlayerStore } from "@/lib/stores/usePlayerStore";

const CAMERA_DISTANCE = 10;
const CAMERA_HEIGHT = 4;
const CAMERA_LERP = 0.1;

export function ThirdPersonCamera() {
  const { camera } = useThree();
  const targetPosition = useRef(new Vector3());
  const currentPosition = useRef(new Vector3(0, 5, 10));

  const playerPosition = usePlayerStore((state) => state.position);

  useFrame(() => {
    // Calculate target camera position behind player
    targetPosition.current.set(
      playerPosition.x,
      playerPosition.y + CAMERA_HEIGHT,
      playerPosition.z + CAMERA_DISTANCE
    );

    // Smoothly interpolate camera position
    currentPosition.current.lerp(targetPosition.current, CAMERA_LERP);
    camera.position.copy(currentPosition.current);

    // Look at player
    camera.lookAt(playerPosition.x, playerPosition.y + 1, playerPosition.z);
  });

  return null;
}

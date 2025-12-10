"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Scene } from "./Scene";
import { KeyboardControls, type KeyboardControlsEntry } from "@react-three/drei";

// Define keyboard controls
enum Controls {
  forward = "forward",
  backward = "backward",
  left = "left",
  right = "right",
  jump = "jump",
  sprint = "sprint",
  interact = "interact",
}

const keyboardMap: KeyboardControlsEntry<Controls>[] = [
  { name: Controls.forward, keys: ["KeyW", "ArrowUp"] },
  { name: Controls.backward, keys: ["KeyS", "ArrowDown"] },
  { name: Controls.left, keys: ["KeyA", "ArrowLeft"] },
  { name: Controls.right, keys: ["KeyD", "ArrowRight"] },
  { name: Controls.jump, keys: ["Space"] },
  { name: Controls.sprint, keys: ["ShiftLeft", "ShiftRight"] },
  { name: Controls.interact, keys: ["KeyE"] },
];

export function GameCanvas() {
  return (
    <KeyboardControls map={keyboardMap}>
      <Canvas
        className="game-canvas"
        shadows
        camera={{
          fov: 75,
          near: 0.1,
          far: 1000,
          position: [0, 5, 10],
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </KeyboardControls>
  );
}

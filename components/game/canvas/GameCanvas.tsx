"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useState, useEffect } from "react";
import { Scene } from "./Scene";
import { KeyboardControls, type KeyboardControlsEntry } from "@react-three/drei";
import { WebGLFallback } from "../WebGLFallback";

function detectWebGL(): { supported: boolean; error?: string } {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) {
      return { supported: false, error: "WebGL context not available" };
    }
    return { supported: true };
  } catch (e) {
    return { supported: false, error: String(e) };
  }
}

// Define keyboard controls
enum Controls {
  forward = "forward",
  backward = "backward",
  left = "left",
  right = "right",
  jump = "jump",
  sprint = "sprint",
  interact = "interact",
  attack = "attack",
}

const keyboardMap: KeyboardControlsEntry<Controls>[] = [
  { name: Controls.forward, keys: ["KeyW", "ArrowUp"] },
  { name: Controls.backward, keys: ["KeyS", "ArrowDown"] },
  { name: Controls.left, keys: ["KeyA", "ArrowLeft"] },
  { name: Controls.right, keys: ["KeyD", "ArrowRight"] },
  { name: Controls.jump, keys: ["Space"] },
  { name: Controls.sprint, keys: ["ShiftLeft", "ShiftRight"] },
  { name: Controls.interact, keys: ["KeyE"] },
  { name: Controls.attack, keys: ["KeyF"] },
];

export function GameCanvas() {
  const [webglStatus, setWebglStatus] = useState<{
    checked: boolean;
    supported: boolean;
    error?: string;
  }>({ checked: false, supported: false });

  useEffect(() => {
    const result = detectWebGL();
    setWebglStatus({
      checked: true,
      supported: result.supported,
      error: result.error,
    });
  }, []);

  if (!webglStatus.checked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900">
        <p className="text-white">Checking graphics support...</p>
      </div>
    );
  }

  if (!webglStatus.supported) {
    return <WebGLFallback error={webglStatus.error} />;
  }

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

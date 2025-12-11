"use client";

import { useEffect } from "react";
import { Stars, Sky } from "@react-three/drei";
import { Player } from "../entities/Player";
import { EnemyList } from "../entities/Enemy";
import { DamageNumbers } from "../effects/DamageNumber";
import { Terrain } from "../world/Terrain";
import { ThirdPersonCamera } from "./Camera";
import { useEnemyStore } from "@/lib/stores/useEnemyStore";

// Initial enemy spawns for testing
const INITIAL_SPAWNS = [
  { type: "slime", position: { x: 10, y: 1, z: 10 } },
  { type: "slime", position: { x: -8, y: 1, z: 12 } },
  { type: "wolf", position: { x: 15, y: 1, z: -5 } },
  { type: "wolf", position: { x: -12, y: 1, z: -10 } },
  { type: "bandit", position: { x: 20, y: 1, z: 20 } },
  { type: "skeleton", position: { x: -20, y: 1, z: 15 } },
  { type: "golem", position: { x: 30, y: 1, z: 0 } },
];

export function Scene() {
  const spawnEnemies = useEnemyStore((state) => state.spawnEnemies);
  const clearAllEnemies = useEnemyStore((state) => state.clearAllEnemies);

  // Spawn initial enemies on mount
  useEffect(() => {
    clearAllEnemies();
    spawnEnemies(INITIAL_SPAWNS);

    return () => {
      clearAllEnemies();
    };
  }, [spawnEnemies, clearAllEnemies]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[50, 50, 25]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />

      {/* Sky and Environment */}
      <Stars
        radius={300}
        depth={60}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />
      <Sky
        distance={450000}
        sunPosition={[5, 1, 8]}
        inclination={0.6}
        azimuth={0.25}
        rayleigh={0.5}
      />
      <fog attach="fog" args={["#1a1a2e", 50, 200]} />

      {/* World */}
      <Terrain />

      {/* Enemies */}
      <EnemyList />

      {/* Effects */}
      <DamageNumbers />

      {/* Player */}
      <Player position={[0, 2, 0]} />
      <ThirdPersonCamera />
    </>
  );
}

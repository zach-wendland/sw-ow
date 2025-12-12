"use client";

import { useEffect } from "react";
import { Stars, Sky } from "@react-three/drei";
import { Player } from "../entities/Player";
import { EnemyList } from "../entities/Enemy";
import { DamageNumbers } from "../effects/DamageNumber";
import { VoxelTerrain } from "../world/VoxelTerrain";
import { ThirdPersonCamera } from "./Camera";
import { useEnemyStore } from "@/lib/stores/useEnemyStore";
import { useTutorialStore, selectTutorialActive, selectCurrentStep } from "@/lib/stores/useTutorialStore";

// ============================================================================
// FIRST MISSION: "ECHOES OF THE CLONE WARS"
// An abandoned Separatist shipyard graveyard where dormant droids reactivate
// ============================================================================

// Phase 1: Tutorial B1 droids - easy targets to learn combat
const MISSION_PHASE_1 = [
  { type: "b1_droid", position: { x: 8, y: 22, z: 8 } },   // First encounter
  { type: "b1_droid", position: { x: 12, y: 22, z: 6 } },  // Pair after first
  { type: "b1_droid", position: { x: 10, y: 22, z: 12 } }, // Third to practice combo
];

// Phase 2: B2 Super Battle Droids - real challenge
const MISSION_PHASE_2 = [
  { type: "b2_droid", position: { x: 20, y: 22, z: 15 } },
  { type: "b2_droid", position: { x: 25, y: 22, z: 20 } },
];

// Phase 3: Droideka mini-boss
const MISSION_PHASE_3 = [
  { type: "droideka", position: { x: 35, y: 22, z: 10 } },
];

// Full first mission spawns (all phases at once for now)
const FIRST_MISSION_SPAWNS = [
  ...MISSION_PHASE_1,
  ...MISSION_PHASE_2,
  ...MISSION_PHASE_3,
];

// Legacy fantasy spawns for variety/testing
const FANTASY_SPAWNS = [
  { type: "slime", position: { x: -10, y: 20, z: 10 } },
  { type: "wolf", position: { x: -15, y: 20, z: -5 } },
  { type: "bandit", position: { x: -20, y: 20, z: 20 } },
  { type: "skeleton", position: { x: -25, y: 20, z: 15 } },
  { type: "golem", position: { x: -30, y: 20, z: 0 } },
];

// Combined spawns: Star Wars mission + fantasy enemies
const INITIAL_SPAWNS = [
  ...FIRST_MISSION_SPAWNS,
  ...FANTASY_SPAWNS,
];

// Tutorial enemy spawns - B1 droid for Star Wars theme
const TUTORIAL_COMBAT_SPAWN = [
  { type: "b1_droid", position: { x: 5, y: 22, z: 5 } }, // Single B1 for combat step
];

const TUTORIAL_COMBO_SPAWN = [
  { type: "b1_droid", position: { x: 4, y: 22, z: 4 } }, // B1 for combo practice
];

export function Scene() {
  const spawnEnemies = useEnemyStore((state) => state.spawnEnemies);
  const clearAllEnemies = useEnemyStore((state) => state.clearAllEnemies);

  // Tutorial state
  const tutorialActive = useTutorialStore(selectTutorialActive);
  const currentStep = useTutorialStore(selectCurrentStep);

  // Spawn enemies based on tutorial state
  useEffect(() => {
    clearAllEnemies();

    if (tutorialActive) {
      // During tutorial, only spawn enemies for specific steps
      if (currentStep === "combat") {
        spawnEnemies(TUTORIAL_COMBAT_SPAWN);
      } else if (currentStep === "combo") {
        spawnEnemies(TUTORIAL_COMBO_SPAWN);
      }
      // Other steps: no enemies
    } else {
      // Normal gameplay: spawn all enemies
      spawnEnemies(INITIAL_SPAWNS);
    }

    return () => {
      clearAllEnemies();
    };
  }, [spawnEnemies, clearAllEnemies, tutorialActive, currentStep]);

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

      {/* World - reduced render distance during tutorial for performance */}
      <VoxelTerrain seed={42} renderDistance={tutorialActive ? 2 : 4} />

      {/* Enemies */}
      <EnemyList />

      {/* Effects */}
      <DamageNumbers />

      {/* Player */}
      <Player position={[0, 22, 0]} />
      <ThirdPersonCamera />
    </>
  );
}

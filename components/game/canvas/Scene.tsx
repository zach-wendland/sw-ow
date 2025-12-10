"use client";

import { Environment, Stars, Sky } from "@react-three/drei";
import { Player } from "../entities/Player";
import { Terrain } from "../world/Terrain";
import { ThirdPersonCamera } from "./Camera";

export function Scene() {
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

      {/* Player */}
      <Player position={[0, 2, 0]} />
      <ThirdPersonCamera />
    </>
  );
}

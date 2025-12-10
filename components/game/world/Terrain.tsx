"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { type Mesh, RepeatWrapping, TextureLoader } from "three";
import { useTexture, Grid } from "@react-three/drei";

export function Terrain() {
  return (
    <group>
      {/* Ground plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200, 32, 32]} />
        <meshStandardMaterial
          color="#2d4a3e"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Grid helper for development */}
      <Grid
        position={[0, 0.01, 0]}
        args={[200, 200]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#3d5a4e"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#4d6a5e"
        fadeDistance={100}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

      {/* Some placeholder terrain features */}
      <TerrainFeatures />
    </group>
  );
}

function TerrainFeatures() {
  // Add some basic 3D objects for visual interest
  return (
    <group>
      {/* Rock formations */}
      {Array.from({ length: 20 }).map((_, i) => {
        const x = Math.sin(i * 0.8) * 30 + Math.random() * 10;
        const z = Math.cos(i * 0.8) * 30 + Math.random() * 10;
        const scale = 0.5 + Math.random() * 2;

        return (
          <mesh
            key={i}
            position={[x, scale / 2, z]}
            castShadow
            receiveShadow
          >
            <dodecahedronGeometry args={[scale, 0]} />
            <meshStandardMaterial
              color="#4a4a4a"
              roughness={0.8}
              metalness={0.2}
            />
          </mesh>
        );
      })}

      {/* Trees (simple cones) */}
      {Array.from({ length: 30 }).map((_, i) => {
        const x = Math.sin(i * 1.2) * 40 + Math.random() * 15;
        const z = Math.cos(i * 1.2) * 40 + Math.random() * 15;
        const height = 3 + Math.random() * 4;

        return (
          <group key={`tree-${i}`} position={[x, 0, z]}>
            {/* Trunk */}
            <mesh position={[0, height / 4, 0]} castShadow>
              <cylinderGeometry args={[0.3, 0.4, height / 2, 8]} />
              <meshStandardMaterial color="#5d4037" />
            </mesh>
            {/* Foliage */}
            <mesh position={[0, height / 2 + 1, 0]} castShadow>
              <coneGeometry args={[2, height, 8]} />
              <meshStandardMaterial color="#2e7d32" />
            </mesh>
          </group>
        );
      })}

      {/* Distant mountains (low poly) */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const distance = 80 + Math.random() * 20;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        const height = 15 + Math.random() * 20;

        return (
          <mesh key={`mountain-${i}`} position={[x, height / 2, z]}>
            <coneGeometry args={[20 + Math.random() * 10, height, 6]} />
            <meshStandardMaterial
              color="#5d6d7e"
              flatShading
            />
          </mesh>
        );
      })}
    </group>
  );
}

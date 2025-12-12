"use client";

import React, { useRef, useEffect, useMemo, useCallback, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayerStore } from "@/lib/stores/usePlayerStore";
import { getChunkManager, resetChunkManager } from "@/lib/voxel/ChunkManager";
import { ChunkKey, ChunkMeshData } from "@/lib/voxel/types";
import { CHUNK_SIZE } from "@/lib/voxel/constants";

// ============================================================================
// CHUNK MESH COMPONENT
// ============================================================================

interface ChunkMeshProps {
  chunkKey: ChunkKey;
  meshData: ChunkMeshData;
}

function ChunkMesh({ chunkKey, meshData }: ChunkMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Create geometry from mesh data
  const geometry = useMemo(() => {
    if (meshData.vertexCount === 0) {
      return null;
    }

    const geo = new THREE.BufferGeometry();

    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(meshData.positions, 3)
    );
    geo.setAttribute(
      "normal",
      new THREE.BufferAttribute(meshData.normals, 3)
    );
    geo.setAttribute(
      "color",
      new THREE.BufferAttribute(meshData.colors, 3)
    );
    geo.setIndex(new THREE.BufferAttribute(meshData.indices, 1));

    geo.computeBoundingSphere();

    return geo;
  }, [meshData]);

  // Don't render empty chunks
  if (!geometry) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      receiveShadow
      castShadow
    >
      <meshStandardMaterial
        vertexColors
        side={THREE.FrontSide}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
}

// ============================================================================
// VOXEL TERRAIN COMPONENT
// ============================================================================

interface VoxelTerrainProps {
  seed?: number;
  renderDistance?: number;
}

export function VoxelTerrain({
  seed = 12345,
  renderDistance = 6,
}: VoxelTerrainProps) {
  // Chunk manager ref (stable across renders)
  const managerRef = useRef<ReturnType<typeof getChunkManager> | null>(null);

  // Track visible chunk meshes
  const [chunkMeshes, setChunkMeshes] = useState<Map<ChunkKey, ChunkMeshData>>(
    new Map()
  );

  // Track last update position to avoid unnecessary updates
  const lastUpdatePos = useRef<{ x: number; z: number }>({ x: 0, z: 0 });

  // Initialize chunk manager
  useEffect(() => {
    // Ensure gameplay queries and rendering share the same manager instance.
    resetChunkManager();
    const manager = getChunkManager({ renderDistance }, { seed });

    // Set up callbacks for mesh updates
    manager.onChunkMeshReady = (key, mesh) => {
      setChunkMeshes((prev) => {
        const next = new Map(prev);
        next.set(key, mesh);
        return next;
      });
    };

    manager.onChunkUnloaded = (key) => {
      setChunkMeshes((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
    };

    managerRef.current = manager;

    // Initial update at origin
    manager.update(0, 0);

    return () => {
      managerRef.current = null;
      resetChunkManager();
    };
  }, [seed, renderDistance]);

  // Get player position (non-reactive - read directly)
  const getPlayerPosition = useCallback(
    () => usePlayerStore.getState().position,
    []
  );

  // Update chunks based on player position
  useFrame(() => {
    const manager = managerRef.current;
    if (!manager) return;

    const playerPos = getPlayerPosition();

    // Update if player moved enough to risk hitting unloaded terrain.
    // Keep this conservative since gameplay queries depend on loaded chunks.
    const dx = Math.abs(playerPos.x - lastUpdatePos.current.x);
    const dz = Math.abs(playerPos.z - lastUpdatePos.current.z);

    if (dx > CHUNK_SIZE / 4 || dz > CHUNK_SIZE / 4) {
      manager.update(playerPos.x, playerPos.z);
      lastUpdatePos.current = { x: playerPos.x, z: playerPos.z };
    }
  });

  // Render all chunk meshes
  const meshElements = useMemo(() => {
    const elements: React.ReactNode[] = [];

    chunkMeshes.forEach((meshData, key) => {
      if (meshData.vertexCount > 0) {
        elements.push(
          <ChunkMesh key={key} chunkKey={key} meshData={meshData} />
        );
      }
    });

    return elements;
  }, [chunkMeshes]);

  return <group name="voxel-terrain">{meshElements}</group>;
}

// ============================================================================
// SIMPLE GROUND PLANE (fallback/debug)
// ============================================================================

export function SimpleGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#567d46" />
    </mesh>
  );
}

// ============================================================================
// DEBUG COMPONENT
// ============================================================================

interface VoxelDebugProps {
  manager: ChunkManager | null;
}

export function VoxelDebug({ manager }: VoxelDebugProps) {
  // DISABLED: This was causing performance issues by running getStats() every frame
  // Stats collection iterates all chunks which is expensive during gameplay
  // Re-enable only if debug display is needed in HUD
  return null;
}

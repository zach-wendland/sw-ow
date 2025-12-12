"use client";

import React, { useRef, useEffect, useMemo, useCallback, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayerStore } from "@/lib/stores/usePlayerStore";
import { ChunkManager } from "@/lib/voxel/ChunkManager";
import { ChunkKey, ChunkMeshData, coordFromChunkKey } from "@/lib/voxel/types";
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

  // Calculate chunk world position
  const position = useMemo(() => {
    const coord = coordFromChunkKey(chunkKey);
    return new THREE.Vector3(
      coord.x * CHUNK_SIZE,
      0,
      coord.z * CHUNK_SIZE
    );
  }, [chunkKey]);

  // Don't render empty chunks
  if (!geometry) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      position={position}
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
  const managerRef = useRef<ChunkManager | null>(null);

  // Track visible chunk meshes
  const [chunkMeshes, setChunkMeshes] = useState<Map<ChunkKey, ChunkMeshData>>(
    new Map()
  );

  // Track last update position to avoid unnecessary updates
  const lastUpdatePos = useRef<{ x: number; z: number }>({ x: 0, z: 0 });

  // Initialize chunk manager
  useEffect(() => {
    const manager = new ChunkManager(
      { renderDistance },
      { seed }
    );

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
      manager.dispose();
      managerRef.current = null;
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

    // Only update if player moved more than half a chunk
    const dx = Math.abs(playerPos.x - lastUpdatePos.current.x);
    const dz = Math.abs(playerPos.z - lastUpdatePos.current.z);

    if (dx > CHUNK_SIZE / 2 || dz > CHUNK_SIZE / 2) {
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
  const [stats, setStats] = useState({
    loadedChunks: 0,
    meshes: 0,
    meshQueueLength: 0,
    totalBlocks: 0,
  });

  useFrame(() => {
    if (manager) {
      setStats(manager.getStats());
    }
  });

  return null; // Stats could be displayed in HUD if needed
}

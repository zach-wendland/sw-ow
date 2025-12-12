import { Vector3 } from "three";

// ============================================================================
// BLOCK TYPES
// ============================================================================

/**
 * Block IDs are stored as Uint8 (0-255)
 * Organized by category for easy reference
 */
export type BlockId = number;

export interface BlockDefinition {
  id: BlockId;
  name: string;
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  solid: boolean; // Can entities pass through?
  // Future: texture coordinates in atlas
}

// ============================================================================
// CHUNK TYPES
// ============================================================================

export interface ChunkCoord {
  x: number;
  z: number;
  y?: number; // Optional for 2D chunk grid with fixed height
}

export interface ChunkData {
  coord: ChunkCoord;
  blocks: Uint8Array; // CHUNK_SIZE^3 entries
  isDirty: boolean; // Needs mesh rebuild
  isEmpty: boolean; // All air - skip rendering
  lastAccessed: number; // For LRU unloading
}

export interface ChunkMeshData {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  vertexCount: number;
}

// ============================================================================
// FACE TYPES (for meshing)
// ============================================================================

export type FaceDirection = "top" | "bottom" | "north" | "south" | "east" | "west";

export interface Face {
  direction: FaceDirection;
  blockId: BlockId;
  x: number;
  y: number;
  z: number;
  // For greedy meshing - merged face dimensions
  width: number;
  height: number;
}

// Direction vectors for each face
export const FACE_NORMALS: Record<FaceDirection, [number, number, number]> = {
  top: [0, 1, 0],
  bottom: [0, -1, 0],
  north: [0, 0, -1],
  south: [0, 0, 1],
  east: [1, 0, 0],
  west: [-1, 0, 0],
};

// Neighbor offsets for each face direction
export const FACE_NEIGHBORS: Record<FaceDirection, [number, number, number]> = {
  top: [0, 1, 0],
  bottom: [0, -1, 0],
  north: [0, 0, -1],
  south: [0, 0, 1],
  east: [1, 0, 0],
  west: [-1, 0, 0],
};

// ============================================================================
// WORLD POSITION HELPERS
// ============================================================================

export interface WorldPosition {
  x: number;
  y: number;
  z: number;
}

export interface BlockPosition {
  chunkCoord: ChunkCoord;
  localX: number;
  localY: number;
  localZ: number;
}

// ============================================================================
// CHUNK MANAGER TYPES
// ============================================================================

export interface ChunkManagerConfig {
  renderDistance: number; // In chunks
  chunkSize: number;
  worldHeight: number; // In blocks
  maxChunksInMemory: number;
  meshBudgetPerFrame: number; // Max chunks to mesh per frame
}

export interface LoadedChunk {
  data: ChunkData;
  mesh: ChunkMeshData | null;
}

// ============================================================================
// TERRAIN GENERATION TYPES
// ============================================================================

export interface TerrainGeneratorConfig {
  seed: number;
  baseHeight: number;
  heightVariation: number;
  // Noise parameters
  noiseScale: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type ChunkKey = string; // Format: "x,z" or "x,y,z"

export function chunkKeyFromCoord(coord: ChunkCoord): ChunkKey {
  // Back-compat: keep y=0 as 2D key ("x,z") to avoid churn across code/tests.
  // Non-zero y uses 3D key ("x,y,z").
  return coord.y !== undefined && coord.y !== 0
    ? `${coord.x},${coord.y},${coord.z}`
    : `${coord.x},${coord.z}`;
}

export function coordFromChunkKey(key: ChunkKey): ChunkCoord {
  const parts = key.split(",").map(Number);
  if (parts.length === 3) {
    return { x: parts[0], y: parts[1], z: parts[2] };
  }
  return { x: parts[0], z: parts[1] };
}

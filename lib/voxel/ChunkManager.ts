import {
  ChunkCoord,
  ChunkKey,
  ChunkMeshData,
  ChunkManagerConfig,
  TerrainGeneratorConfig,
  BlockId,
  chunkKeyFromCoord,
  coordFromChunkKey,
} from "./types";
import { Chunk, worldToChunkCoord, worldToLocalCoord } from "./Chunk";
import { generateChunkMesh } from "./meshing/greedyMesh";
import {
  CHUNK_SIZE,
  DEFAULT_CHUNK_MANAGER_CONFIG,
  DEFAULT_TERRAIN_CONFIG,
  BLOCKS,
} from "./constants";

// ============================================================================
// SIMPLE NOISE IMPLEMENTATION
// ============================================================================

/**
 * Simple seeded pseudo-random number generator
 */
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/**
 * Simple 2D value noise for terrain height
 */
function noise2D(x: number, z: number, seed: number): number {
  // Simple hash-based noise
  const hash = (x: number, z: number): number => {
    let h = seed;
    h = ((h << 5) + h) ^ x;
    h = ((h << 5) + h) ^ z;
    h = ((h * 2654435761) >>> 0) % 4294967296;
    return h / 4294967296;
  };

  // Bilinear interpolation
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const x1 = x0 + 1;
  const z1 = z0 + 1;

  const fx = x - x0;
  const fz = z - z0;

  // Smoothstep
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);

  const n00 = hash(x0, z0);
  const n10 = hash(x1, z0);
  const n01 = hash(x0, z1);
  const n11 = hash(x1, z1);

  const nx0 = n00 + sx * (n10 - n00);
  const nx1 = n01 + sx * (n11 - n01);

  return nx0 + sz * (nx1 - nx0);
}

/**
 * Fractal brownian motion noise
 */
function fbm(
  x: number,
  z: number,
  seed: number,
  octaves: number,
  persistence: number,
  lacunarity: number,
  scale: number
): number {
  let total = 0;
  let amplitude = 1;
  let frequency = scale;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += noise2D(x * frequency, z * frequency, seed + i * 1000) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return total / maxValue;
}

// ============================================================================
// CHUNK MANAGER
// ============================================================================

export class ChunkManager {
  private chunks: Map<ChunkKey, Chunk>;
  private meshes: Map<ChunkKey, ChunkMeshData>;
  private meshQueue: ChunkKey[];
  private config: ChunkManagerConfig;
  private terrainConfig: TerrainGeneratorConfig;

  // Callbacks for React integration
  public onChunkMeshReady?: (key: ChunkKey, mesh: ChunkMeshData) => void;
  public onChunkUnloaded?: (key: ChunkKey) => void;

  constructor(
    config: Partial<ChunkManagerConfig> = {},
    terrainConfig: Partial<TerrainGeneratorConfig> = {}
  ) {
    this.chunks = new Map();
    this.meshes = new Map();
    this.meshQueue = [];
    this.config = { ...DEFAULT_CHUNK_MANAGER_CONFIG, ...config };
    this.terrainConfig = { ...DEFAULT_TERRAIN_CONFIG, ...terrainConfig };
  }

  /**
   * Get the vertical chunk range needed for current terrain config.
   * Outdoor-first: load only the chunk layers that can contain terrain.
   */
  private getTerrainChunkYRange(): { minY: number; maxY: number } {
    // Terrain occupies [0 .. baseHeight + heightVariation] (approx).
    // We include a small buffer so the surface isn't clipped by rounding.
    const maxTerrainY = this.terrainConfig.baseHeight + this.terrainConfig.heightVariation + 2;
    const maxLayerCount = Math.max(1, Math.ceil(maxTerrainY / CHUNK_SIZE));
    return { minY: 0, maxY: maxLayerCount - 1 };
  }

  /**
   * Update chunk loading based on player position
   * Call this every frame or when player moves significantly
   */
  update(playerX: number, playerZ: number): void {
    const playerChunk = worldToChunkCoord(playerX, 0, playerZ);
    const renderDist = this.config.renderDistance;
    const { minY, maxY } = this.getTerrainChunkYRange();

    // Track which chunks should be loaded
    const neededChunks = new Set<ChunkKey>();

    // Determine which chunks need to be loaded
    for (let dx = -renderDist; dx <= renderDist; dx++) {
      for (let dz = -renderDist; dz <= renderDist; dz++) {
        // Circular render distance
        if (dx * dx + dz * dz > renderDist * renderDist) continue;

        for (let cy = minY; cy <= maxY; cy++) {
          const coord: ChunkCoord = {
            x: playerChunk.x + dx,
            z: playerChunk.z + dz,
            ...(cy === 0 ? {} : { y: cy }),
          };
          const key = chunkKeyFromCoord(coord);
          neededChunks.add(key);

          // Load chunk if not already loaded
          if (!this.chunks.has(key)) {
            this.loadChunk(coord);
          }
        }
      }
    }

    // Unload distant chunks
    for (const [key, chunk] of this.chunks) {
      if (!neededChunks.has(key)) {
        this.unloadChunk(key);
      }
    }

    // Process mesh queue (limited per frame for performance)
    this.processMeshQueue();
  }

  /**
   * Load or generate a chunk
   */
  private loadChunk(coord: ChunkCoord): Chunk {
    const key = chunkKeyFromCoord(coord);

    // Check if already loading/loaded
    if (this.chunks.has(key)) {
      return this.chunks.get(key)!;
    }

    // Generate new chunk
    const chunk = new Chunk(coord);
    this.generateTerrain(chunk);
    this.chunks.set(key, chunk);

    // Queue for meshing
    this.queueForMeshing(key);

    return chunk;
  }

  /**
   * Unload a chunk
   */
  private unloadChunk(key: ChunkKey): void {
    this.chunks.delete(key);
    this.meshes.delete(key);

    // Remove from mesh queue
    const queueIndex = this.meshQueue.indexOf(key);
    if (queueIndex !== -1) {
      this.meshQueue.splice(queueIndex, 1);
    }

    this.onChunkUnloaded?.(key);
  }

  /**
   * Generate terrain for a chunk
   */
  private generateTerrain(chunk: Chunk): void {
    const { seed, baseHeight, heightVariation, noiseScale, octaves, persistence, lacunarity } =
      this.terrainConfig;

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        // Get world coordinates
        const [wx, , wz] = chunk.localToWorld(lx, 0, lz);

        // Calculate height using noise
        const noiseVal = fbm(wx, wz, seed, octaves, persistence, lacunarity, noiseScale);
        const height = Math.floor(baseHeight + noiseVal * heightVariation);

        // Fill column
        for (let ly = 0; ly < CHUNK_SIZE; ly++) {
          const [, wy] = chunk.localToWorld(0, ly, 0);

          if (wy < height - 3) {
            chunk.setBlock(lx, ly, lz, BLOCKS.STONE);
          } else if (wy < height - 1) {
            chunk.setBlock(lx, ly, lz, BLOCKS.DIRT);
          } else if (wy < height) {
            // Top layer varies by height
            if (height > baseHeight + heightVariation * 0.7) {
              chunk.setBlock(lx, ly, lz, BLOCKS.STONE); // Mountains
            } else if (height < baseHeight - heightVariation * 0.3) {
              chunk.setBlock(lx, ly, lz, BLOCKS.SAND); // Low areas
            } else {
              chunk.setBlock(lx, ly, lz, BLOCKS.GRASS);
            }
          } else if (wy < baseHeight - heightVariation * 0.5 && wy >= height) {
            // Water in low areas
            chunk.setBlock(lx, ly, lz, BLOCKS.WATER);
          }
        }
      }
    }
  }

  /**
   * Queue a chunk for mesh generation
   */
  private queueForMeshing(key: ChunkKey): void {
    if (!this.meshQueue.includes(key)) {
      this.meshQueue.push(key);
    }
  }

  /**
   * Process mesh generation queue
   */
  private processMeshQueue(): void {
    const budget = this.config.meshBudgetPerFrame;
    let processed = 0;

    while (this.meshQueue.length > 0 && processed < budget) {
      const key = this.meshQueue.shift()!;
      const chunk = this.chunks.get(key);

      if (chunk && chunk.isDirty) {
        const mesh = generateChunkMesh(chunk, this.getBlockAt.bind(this));
        this.meshes.set(key, mesh);
        chunk.markClean();
        this.onChunkMeshReady?.(key, mesh);
        processed++;
      }
    }
  }

  /**
   * Get block at world coordinates (for cross-chunk lookups)
   */
  getBlockAt(wx: number, wy: number, wz: number): BlockId {
    const chunkCoord = worldToChunkCoord(wx, wy, wz);
    const key = chunkKeyFromCoord(chunkCoord);
    const chunk = this.chunks.get(key);

    if (!chunk) {
      return BLOCKS.AIR;
    }

    const [lx, ly, lz] = worldToLocalCoord(wx, wy, wz);
    return chunk.getBlock(lx, ly, lz);
  }

  /**
   * Set block at world coordinates
   */
  setBlockAt(wx: number, wy: number, wz: number, blockId: BlockId): boolean {
    const chunkCoord = worldToChunkCoord(wx, wy, wz);
    const key = chunkKeyFromCoord(chunkCoord);
    const chunk = this.chunks.get(key);

    if (!chunk) {
      return false;
    }

    const [lx, ly, lz] = worldToLocalCoord(wx, wy, wz);
    const changed = chunk.setBlock(lx, ly, lz, blockId);

    if (changed) {
      // Re-mesh this chunk
      this.queueForMeshing(key);

      // Also re-mesh neighbors if block is on edge
      const cy = chunkCoord.y ?? 0;
      if (lx === 0) this.markNeighborDirty(chunkCoord.x - 1, cy, chunkCoord.z);
      if (lx === CHUNK_SIZE - 1) this.markNeighborDirty(chunkCoord.x + 1, cy, chunkCoord.z);
      if (lz === 0) this.markNeighborDirty(chunkCoord.x, cy, chunkCoord.z - 1);
      if (lz === CHUNK_SIZE - 1) this.markNeighborDirty(chunkCoord.x, cy, chunkCoord.z + 1);
      if (ly === 0 && cy > 0) this.markNeighborDirty(chunkCoord.x, cy - 1, chunkCoord.z);
      if (ly === CHUNK_SIZE - 1) this.markNeighborDirty(chunkCoord.x, cy + 1, chunkCoord.z);
    }

    return changed;
  }

  /**
   * Mark a neighboring chunk as dirty
   */
  private markNeighborDirty(cx: number, cy: number, cz: number): void {
    const key = chunkKeyFromCoord({ x: cx, y: cy, z: cz });
    const chunk = this.chunks.get(key);
    if (chunk) {
      chunk.markDirty();
      this.queueForMeshing(key);
    }
  }

  /**
   * Get a chunk by key
   */
  getChunk(key: ChunkKey): Chunk | undefined {
    return this.chunks.get(key);
  }

  /**
   * Get mesh data by key
   */
  getMesh(key: ChunkKey): ChunkMeshData | undefined {
    return this.meshes.get(key);
  }

  /**
   * Get all loaded chunk keys
   */
  getLoadedChunkKeys(): ChunkKey[] {
    return Array.from(this.chunks.keys());
  }

  /**
   * Get all chunk meshes
   */
  getAllMeshes(): Map<ChunkKey, ChunkMeshData> {
    return this.meshes;
  }

  /**
   * Force rebuild all meshes
   */
  rebuildAllMeshes(): void {
    for (const [key, chunk] of this.chunks) {
      chunk.markDirty();
      this.queueForMeshing(key);
    }
  }

  /**
   * Get statistics for debugging
   */
  getStats(): {
    loadedChunks: number;
    meshes: number;
    meshQueueLength: number;
    totalBlocks: number;
  } {
    let totalBlocks = 0;
    for (const chunk of this.chunks.values()) {
      totalBlocks += chunk.getBlockCount();
    }

    return {
      loadedChunks: this.chunks.size,
      meshes: this.meshes.size,
      meshQueueLength: this.meshQueue.length,
      totalBlocks,
    };
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.chunks.clear();
    this.meshes.clear();
    this.meshQueue = [];
  }
}

// ============================================================================
// SINGLETON / ZUSTAND INTEGRATION
// ============================================================================

// Create a default instance for simple usage
let defaultManager: ChunkManager | null = null;

export function getChunkManager(
  config: Partial<ChunkManagerConfig> = {},
  terrainConfig: Partial<TerrainGeneratorConfig> = {}
): ChunkManager {
  if (!defaultManager) {
    defaultManager = new ChunkManager(config, terrainConfig);
  }
  return defaultManager;
}

export function resetChunkManager(): void {
  defaultManager?.dispose();
  defaultManager = null;
}

import { ChunkCoord, ChunkData, BlockId, chunkKeyFromCoord, ChunkKey } from "./types";
import { CHUNK_SIZE, CHUNK_VOLUME, BLOCKS, coordToIndex, indexToCoord, isBlockEmpty } from "./constants";

/**
 * Chunk class - manages a 16x16x16 volume of blocks
 *
 * Block storage is a flat Uint8Array indexed by:
 *   index = x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_SIZE
 *
 * This gives us O(1) access and minimal memory footprint (~4KB per chunk)
 */
export class Chunk implements ChunkData {
  public coord: ChunkCoord;
  public blocks: Uint8Array;
  public isDirty: boolean;
  public isEmpty: boolean;
  public lastAccessed: number;

  private nonAirCount: number;

  constructor(coord: ChunkCoord) {
    this.coord = coord;
    this.blocks = new Uint8Array(CHUNK_VOLUME);
    this.isDirty = true; // New chunks need initial mesh
    this.isEmpty = true;
    this.lastAccessed = Date.now();
    this.nonAirCount = 0;
  }

  /**
   * Get block at local coordinates (0 to CHUNK_SIZE-1)
   */
  getBlock(x: number, y: number, z: number): BlockId {
    if (!this.isValidCoord(x, y, z)) {
      return BLOCKS.AIR;
    }
    return this.blocks[coordToIndex(x, y, z)];
  }

  /**
   * Set block at local coordinates
   * Returns true if the block changed
   */
  setBlock(x: number, y: number, z: number, blockId: BlockId): boolean {
    if (!this.isValidCoord(x, y, z)) {
      return false;
    }

    const index = coordToIndex(x, y, z);
    const oldBlock = this.blocks[index];

    if (oldBlock === blockId) {
      return false; // No change
    }

    // Update non-air count
    if (isBlockEmpty(oldBlock) && !isBlockEmpty(blockId)) {
      this.nonAirCount++;
    } else if (!isBlockEmpty(oldBlock) && isBlockEmpty(blockId)) {
      this.nonAirCount--;
    }

    this.blocks[index] = blockId;
    this.isEmpty = this.nonAirCount === 0;
    this.isDirty = true;
    this.lastAccessed = Date.now();

    return true;
  }

  /**
   * Fill the entire chunk with a single block type
   */
  fill(blockId: BlockId): void {
    this.blocks.fill(blockId);
    this.nonAirCount = isBlockEmpty(blockId) ? 0 : CHUNK_VOLUME;
    this.isEmpty = this.nonAirCount === 0;
    this.isDirty = true;
    this.lastAccessed = Date.now();
  }

  /**
   * Fill a rectangular region within the chunk
   */
  fillRegion(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    blockId: BlockId
  ): void {
    const minX = Math.max(0, Math.min(x1, x2));
    const maxX = Math.min(CHUNK_SIZE - 1, Math.max(x1, x2));
    const minY = Math.max(0, Math.min(y1, y2));
    const maxY = Math.min(CHUNK_SIZE - 1, Math.max(y1, y2));
    const minZ = Math.max(0, Math.min(z1, z2));
    const maxZ = Math.min(CHUNK_SIZE - 1, Math.max(z1, z2));

    for (let z = minZ; z <= maxZ; z++) {
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          this.setBlock(x, y, z, blockId);
        }
      }
    }
  }

  /**
   * Check if local coordinates are valid
   */
  isValidCoord(x: number, y: number, z: number): boolean {
    return (
      x >= 0 && x < CHUNK_SIZE &&
      y >= 0 && y < CHUNK_SIZE &&
      z >= 0 && z < CHUNK_SIZE
    );
  }

  /**
   * Get the chunk's unique key
   */
  getKey(): ChunkKey {
    return chunkKeyFromCoord(this.coord);
  }

  /**
   * Get world position of a local block coordinate
   */
  localToWorld(x: number, y: number, z: number): [number, number, number] {
    return [
      this.coord.x * CHUNK_SIZE + x,
      (this.coord.y ?? 0) * CHUNK_SIZE + y,
      this.coord.z * CHUNK_SIZE + z,
    ];
  }

  /**
   * Convert world position to local chunk coordinates
   * Returns null if position is outside this chunk
   */
  worldToLocal(wx: number, wy: number, wz: number): [number, number, number] | null {
    const lx = wx - this.coord.x * CHUNK_SIZE;
    const ly = wy - (this.coord.y ?? 0) * CHUNK_SIZE;
    const lz = wz - this.coord.z * CHUNK_SIZE;

    if (this.isValidCoord(lx, ly, lz)) {
      return [lx, ly, lz];
    }
    return null;
  }

  /**
   * Mark chunk as accessed (for LRU tracking)
   */
  touch(): void {
    this.lastAccessed = Date.now();
  }

  /**
   * Mark chunk as needing mesh rebuild
   */
  markDirty(): void {
    this.isDirty = true;
  }

  /**
   * Mark chunk mesh as up-to-date
   */
  markClean(): void {
    this.isDirty = false;
  }

  /**
   * Get count of non-air blocks
   */
  getBlockCount(): number {
    return this.nonAirCount;
  }

  /**
   * Iterate over all non-air blocks
   * Callback receives (x, y, z, blockId)
   */
  forEachBlock(callback: (x: number, y: number, z: number, blockId: BlockId) => void): void {
    for (let i = 0; i < CHUNK_VOLUME; i++) {
      const blockId = this.blocks[i];
      if (!isBlockEmpty(blockId)) {
        const [x, y, z] = indexToCoord(i);
        callback(x, y, z, blockId);
      }
    }
  }

  /**
   * Serialize chunk data for storage/network
   */
  serialize(): { coord: ChunkCoord; blocks: number[] } {
    return {
      coord: this.coord,
      blocks: Array.from(this.blocks),
    };
  }

  /**
   * Deserialize chunk data from storage/network
   */
  static deserialize(data: { coord: ChunkCoord; blocks: number[] }): Chunk {
    const chunk = new Chunk(data.coord);
    chunk.blocks = new Uint8Array(data.blocks);

    // Recalculate non-air count
    let count = 0;
    for (let i = 0; i < CHUNK_VOLUME; i++) {
      if (!isBlockEmpty(chunk.blocks[i])) {
        count++;
      }
    }
    chunk.nonAirCount = count;
    chunk.isEmpty = count === 0;
    chunk.isDirty = true;

    return chunk;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert world coordinates to chunk coordinates
 */
export function worldToChunkCoord(wx: number, wy: number, wz: number): ChunkCoord {
  return {
    x: Math.floor(wx / CHUNK_SIZE),
    y: Math.floor(wy / CHUNK_SIZE),
    z: Math.floor(wz / CHUNK_SIZE),
  };
}

/**
 * Convert world coordinates to local chunk coordinates
 */
export function worldToLocalCoord(wx: number, wy: number, wz: number): [number, number, number] {
  // Handle negative coordinates properly with modulo
  const mod = (n: number, m: number) => ((n % m) + m) % m;
  return [
    mod(Math.floor(wx), CHUNK_SIZE),
    mod(Math.floor(wy), CHUNK_SIZE),
    mod(Math.floor(wz), CHUNK_SIZE),
  ];
}

/**
 * Get the chunk key for a world position
 */
export function worldToChunkKey(wx: number, wy: number, wz: number): ChunkKey {
  const coord = worldToChunkCoord(wx, wy, wz);
  return chunkKeyFromCoord(coord);
}

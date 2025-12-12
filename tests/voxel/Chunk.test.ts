import { describe, it, expect, beforeEach } from "vitest";
import { Chunk, worldToChunkCoord, worldToLocalCoord, worldToChunkKey } from "@/lib/voxel/Chunk";
import { BLOCKS, CHUNK_SIZE, CHUNK_VOLUME } from "@/lib/voxel/constants";
import { chunkKeyFromCoord } from "@/lib/voxel/types";

/**
 * Chunk Data Structure Tests
 *
 * Tests for the core Chunk class that manages 16x16x16 volumes of blocks.
 * Verifies block storage, coordinate conversion, and state tracking.
 */

describe("Chunk", () => {
  let chunk: Chunk;

  beforeEach(() => {
    chunk = new Chunk({ x: 0, z: 0 });
  });

  describe("Construction", () => {
    it("should create an empty chunk with correct dimensions", () => {
      expect(chunk.blocks.length).toBe(CHUNK_VOLUME);
      expect(chunk.isEmpty).toBe(true);
      expect(chunk.isDirty).toBe(true); // New chunks need initial mesh
    });

    it("should store chunk coordinates", () => {
      const chunk = new Chunk({ x: 5, z: -3 });
      expect(chunk.coord.x).toBe(5);
      expect(chunk.coord.z).toBe(-3);
    });

    it("should initialize all blocks as air", () => {
      for (let i = 0; i < CHUNK_VOLUME; i++) {
        expect(chunk.blocks[i]).toBe(BLOCKS.AIR);
      }
    });
  });

  describe("Block Operations", () => {
    it("should get/set blocks correctly", () => {
      expect(chunk.getBlock(0, 0, 0)).toBe(BLOCKS.AIR);

      chunk.setBlock(0, 0, 0, BLOCKS.STONE);
      expect(chunk.getBlock(0, 0, 0)).toBe(BLOCKS.STONE);
    });

    it("should return AIR for invalid coordinates", () => {
      expect(chunk.getBlock(-1, 0, 0)).toBe(BLOCKS.AIR);
      expect(chunk.getBlock(CHUNK_SIZE, 0, 0)).toBe(BLOCKS.AIR);
      expect(chunk.getBlock(0, -1, 0)).toBe(BLOCKS.AIR);
      expect(chunk.getBlock(0, CHUNK_SIZE, 0)).toBe(BLOCKS.AIR);
      expect(chunk.getBlock(0, 0, -1)).toBe(BLOCKS.AIR);
      expect(chunk.getBlock(0, 0, CHUNK_SIZE)).toBe(BLOCKS.AIR);
    });

    it("should return false when setting block at invalid coordinates", () => {
      expect(chunk.setBlock(-1, 0, 0, BLOCKS.STONE)).toBe(false);
      expect(chunk.setBlock(CHUNK_SIZE, 0, 0, BLOCKS.STONE)).toBe(false);
    });

    it("should return false when setting same block type", () => {
      expect(chunk.setBlock(0, 0, 0, BLOCKS.AIR)).toBe(false);

      chunk.setBlock(0, 0, 0, BLOCKS.STONE);
      expect(chunk.setBlock(0, 0, 0, BLOCKS.STONE)).toBe(false);
    });

    it("should return true when block type changes", () => {
      expect(chunk.setBlock(0, 0, 0, BLOCKS.STONE)).toBe(true);
      expect(chunk.setBlock(0, 0, 0, BLOCKS.DIRT)).toBe(true);
      expect(chunk.setBlock(0, 0, 0, BLOCKS.AIR)).toBe(true);
    });

    it("should handle boundary coordinates correctly", () => {
      // Max valid coordinates
      chunk.setBlock(CHUNK_SIZE - 1, CHUNK_SIZE - 1, CHUNK_SIZE - 1, BLOCKS.STONE);
      expect(chunk.getBlock(CHUNK_SIZE - 1, CHUNK_SIZE - 1, CHUNK_SIZE - 1)).toBe(BLOCKS.STONE);

      // Min valid coordinates
      chunk.setBlock(0, 0, 0, BLOCKS.DIRT);
      expect(chunk.getBlock(0, 0, 0)).toBe(BLOCKS.DIRT);
    });
  });

  describe("Empty State Tracking", () => {
    it("should track empty state correctly", () => {
      expect(chunk.isEmpty).toBe(true);

      chunk.setBlock(0, 0, 0, BLOCKS.STONE);
      expect(chunk.isEmpty).toBe(false);

      chunk.setBlock(0, 0, 0, BLOCKS.AIR);
      expect(chunk.isEmpty).toBe(true);
    });

    it("should not be empty when multiple blocks exist", () => {
      chunk.setBlock(0, 0, 0, BLOCKS.STONE);
      chunk.setBlock(1, 1, 1, BLOCKS.DIRT);
      expect(chunk.isEmpty).toBe(false);

      chunk.setBlock(0, 0, 0, BLOCKS.AIR);
      expect(chunk.isEmpty).toBe(false);

      chunk.setBlock(1, 1, 1, BLOCKS.AIR);
      expect(chunk.isEmpty).toBe(true);
    });
  });

  describe("Dirty State Tracking", () => {
    it("should mark dirty on block modification", () => {
      chunk.markClean();
      expect(chunk.isDirty).toBe(false);

      chunk.setBlock(0, 0, 0, BLOCKS.STONE);
      expect(chunk.isDirty).toBe(true);
    });

    it("should not mark dirty when block unchanged", () => {
      chunk.markClean();
      chunk.setBlock(0, 0, 0, BLOCKS.AIR); // Already air
      expect(chunk.isDirty).toBe(false);
    });

    it("should support manual dirty marking", () => {
      chunk.markClean();
      expect(chunk.isDirty).toBe(false);

      chunk.markDirty();
      expect(chunk.isDirty).toBe(true);
    });
  });

  describe("Block Count", () => {
    it("should count non-air blocks correctly", () => {
      expect(chunk.getBlockCount()).toBe(0);

      chunk.setBlock(0, 0, 0, BLOCKS.STONE);
      expect(chunk.getBlockCount()).toBe(1);

      chunk.setBlock(1, 0, 0, BLOCKS.DIRT);
      expect(chunk.getBlockCount()).toBe(2);

      chunk.setBlock(0, 0, 0, BLOCKS.AIR);
      expect(chunk.getBlockCount()).toBe(1);
    });

    it("should iterate all non-air blocks", () => {
      chunk.setBlock(0, 0, 0, BLOCKS.STONE);
      chunk.setBlock(5, 5, 5, BLOCKS.DIRT);
      chunk.setBlock(15, 15, 15, BLOCKS.GRASS);

      const blocks: Array<{ x: number; y: number; z: number; blockId: number }> = [];
      chunk.forEachBlock((x, y, z, blockId) => {
        blocks.push({ x, y, z, blockId });
      });

      expect(blocks.length).toBe(3);
      expect(blocks).toContainEqual({ x: 0, y: 0, z: 0, blockId: BLOCKS.STONE });
      expect(blocks).toContainEqual({ x: 5, y: 5, z: 5, blockId: BLOCKS.DIRT });
      expect(blocks).toContainEqual({ x: 15, y: 15, z: 15, blockId: BLOCKS.GRASS });
    });
  });

  describe("Coordinate Conversion", () => {
    it("should convert local to world coordinates", () => {
      const chunk = new Chunk({ x: 2, z: 3 });
      const [wx, wy, wz] = chunk.localToWorld(5, 10, 7);

      expect(wx).toBe(2 * CHUNK_SIZE + 5);
      expect(wy).toBe(10);
      expect(wz).toBe(3 * CHUNK_SIZE + 7);
    });

    it("should convert local to world with negative chunk coords", () => {
      const chunk = new Chunk({ x: -1, z: -2 });
      const [wx, wy, wz] = chunk.localToWorld(0, 0, 0);

      expect(wx).toBe(-CHUNK_SIZE);
      expect(wy).toBe(0);
      expect(wz).toBe(-2 * CHUNK_SIZE);
    });

    it("should convert world to local coordinates", () => {
      const chunk = new Chunk({ x: 2, z: 3 });
      const result = chunk.worldToLocal(2 * CHUNK_SIZE + 5, 10, 3 * CHUNK_SIZE + 7);

      expect(result).toEqual([5, 10, 7]);
    });

    it("should return null for world coords outside chunk", () => {
      const chunk = new Chunk({ x: 0, z: 0 });

      expect(chunk.worldToLocal(-1, 0, 0)).toBeNull();
      expect(chunk.worldToLocal(CHUNK_SIZE, 0, 0)).toBeNull();
      expect(chunk.worldToLocal(0, -1, 0)).toBeNull();
      expect(chunk.worldToLocal(0, CHUNK_SIZE, 0)).toBeNull();
    });
  });

  describe("Fill Operations", () => {
    it("should fill entire chunk with a block type", () => {
      chunk.fill(BLOCKS.STONE);

      expect(chunk.isEmpty).toBe(false);
      expect(chunk.getBlockCount()).toBe(CHUNK_VOLUME);
      expect(chunk.getBlock(0, 0, 0)).toBe(BLOCKS.STONE);
      expect(chunk.getBlock(CHUNK_SIZE - 1, CHUNK_SIZE - 1, CHUNK_SIZE - 1)).toBe(BLOCKS.STONE);
    });

    it("should clear chunk when filled with air", () => {
      chunk.fill(BLOCKS.STONE);
      chunk.fill(BLOCKS.AIR);

      expect(chunk.isEmpty).toBe(true);
      expect(chunk.getBlockCount()).toBe(0);
    });

    it("should fill a rectangular region", () => {
      chunk.fillRegion(0, 0, 0, 2, 2, 2, BLOCKS.STONE);

      // Check corners of region
      expect(chunk.getBlock(0, 0, 0)).toBe(BLOCKS.STONE);
      expect(chunk.getBlock(2, 2, 2)).toBe(BLOCKS.STONE);

      // Check outside region
      expect(chunk.getBlock(3, 0, 0)).toBe(BLOCKS.AIR);

      // 3x3x3 = 27 blocks
      expect(chunk.getBlockCount()).toBe(27);
    });

    it("should clamp fill region to chunk bounds", () => {
      chunk.fillRegion(-5, -5, -5, 5, 5, 5, BLOCKS.STONE);

      // Should only fill from 0,0,0 to 5,5,5 due to clamping
      expect(chunk.getBlock(0, 0, 0)).toBe(BLOCKS.STONE);
      expect(chunk.getBlock(5, 5, 5)).toBe(BLOCKS.STONE);

      // 6x6x6 = 216 blocks
      expect(chunk.getBlockCount()).toBe(216);
    });
  });

  describe("Chunk Key", () => {
    it("should generate unique key", () => {
      const chunk1 = new Chunk({ x: 0, z: 0 });
      const chunk2 = new Chunk({ x: 1, z: 0 });
      const chunk3 = new Chunk({ x: 0, z: 1 });

      expect(chunk1.getKey()).toBe("0,0");
      expect(chunk2.getKey()).toBe("1,0");
      expect(chunk3.getKey()).toBe("0,1");

      expect(chunk1.getKey()).not.toBe(chunk2.getKey());
      expect(chunk1.getKey()).not.toBe(chunk3.getKey());
    });

    it("should handle negative coordinates in key", () => {
      const chunk = new Chunk({ x: -5, z: -3 });
      expect(chunk.getKey()).toBe("-5,-3");
    });
  });

  describe("Coordinate Validation", () => {
    it("should validate coordinates correctly", () => {
      expect(chunk.isValidCoord(0, 0, 0)).toBe(true);
      expect(chunk.isValidCoord(CHUNK_SIZE - 1, CHUNK_SIZE - 1, CHUNK_SIZE - 1)).toBe(true);

      expect(chunk.isValidCoord(-1, 0, 0)).toBe(false);
      expect(chunk.isValidCoord(CHUNK_SIZE, 0, 0)).toBe(false);
      expect(chunk.isValidCoord(0, -1, 0)).toBe(false);
      expect(chunk.isValidCoord(0, CHUNK_SIZE, 0)).toBe(false);
      expect(chunk.isValidCoord(0, 0, -1)).toBe(false);
      expect(chunk.isValidCoord(0, 0, CHUNK_SIZE)).toBe(false);
    });
  });

  describe("LRU Tracking", () => {
    it("should update lastAccessed on touch", () => {
      const initialTime = chunk.lastAccessed;

      // Wait a bit and touch
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          chunk.touch();
          expect(chunk.lastAccessed).toBeGreaterThan(initialTime);
          resolve();
        }, 10);
      });
    });

    it("should update lastAccessed on setBlock", () => {
      const initialTime = chunk.lastAccessed;

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          chunk.setBlock(0, 0, 0, BLOCKS.STONE);
          expect(chunk.lastAccessed).toBeGreaterThan(initialTime);
          resolve();
        }, 10);
      });
    });
  });

  describe("Serialization", () => {
    it("should serialize and deserialize correctly", () => {
      chunk.setBlock(0, 0, 0, BLOCKS.STONE);
      chunk.setBlock(5, 5, 5, BLOCKS.DIRT);
      chunk.setBlock(15, 15, 15, BLOCKS.GRASS);

      const serialized = chunk.serialize();
      const restored = Chunk.deserialize(serialized);

      expect(restored.coord).toEqual(chunk.coord);
      expect(restored.getBlock(0, 0, 0)).toBe(BLOCKS.STONE);
      expect(restored.getBlock(5, 5, 5)).toBe(BLOCKS.DIRT);
      expect(restored.getBlock(15, 15, 15)).toBe(BLOCKS.GRASS);
      expect(restored.getBlockCount()).toBe(3);
      expect(restored.isEmpty).toBe(false);
    });

    it("should preserve chunk coordinates during serialization", () => {
      const chunk = new Chunk({ x: -5, z: 10 });
      chunk.setBlock(0, 0, 0, BLOCKS.STONE);

      const serialized = chunk.serialize();
      const restored = Chunk.deserialize(serialized);

      expect(restored.coord.x).toBe(-5);
      expect(restored.coord.z).toBe(10);
    });
  });
});

describe("World-Chunk Coordinate Helpers", () => {
  describe("worldToChunkCoord", () => {
    it("should convert positive world coords to chunk coords", () => {
      const coord = worldToChunkCoord(32, 0, 48);
      expect(coord.x).toBe(2); // 32 / 16 = 2
      expect(coord.z).toBe(3); // 48 / 16 = 3
    });

    it("should convert negative world coords to chunk coords", () => {
      const coord = worldToChunkCoord(-16, 0, -32);
      expect(coord.x).toBe(-1);
      expect(coord.z).toBe(-2);
    });

    it("should handle boundary values", () => {
      const coord1 = worldToChunkCoord(15, 0, 15);
      expect(coord1.x).toBe(0);
      expect(coord1.z).toBe(0);

      const coord2 = worldToChunkCoord(16, 0, 16);
      expect(coord2.x).toBe(1);
      expect(coord2.z).toBe(1);
    });
  });

  describe("worldToLocalCoord", () => {
    it("should convert positive world coords to local coords", () => {
      const [lx, ly, lz] = worldToLocalCoord(35, 10, 50);
      expect(lx).toBe(3);  // 35 % 16 = 3
      expect(ly).toBe(10);
      expect(lz).toBe(2);  // 50 % 16 = 2
    });

    it("should convert negative world coords to local coords", () => {
      const [lx, ly, lz] = worldToLocalCoord(-1, 0, -1);
      expect(lx).toBe(15); // Wraps to 15
      expect(lz).toBe(15);
    });
  });

  describe("worldToChunkKey", () => {
    it("should generate correct chunk key from world position", () => {
      // worldToChunkKey uses 3D coordinates (includes y)
      const key = worldToChunkKey(32, 0, 48);
      // Back-compat: y=0 uses 2D key format.
      expect(key).toBe("2,3");
    });

    it("should handle negative coordinates", () => {
      const key = worldToChunkKey(-16, 0, -32);
      // Back-compat: y=0 uses 2D key format.
      expect(key).toBe("-1,-2");
    });
  });

  describe("chunkKeyFromCoord", () => {
    it("should create key from 2D coordinates", () => {
      const key = chunkKeyFromCoord({ x: 5, z: -3 });
      expect(key).toBe("5,-3");
    });

    it("should create key from 3D coordinates", () => {
      const key = chunkKeyFromCoord({ x: 5, y: 2, z: -3 });
      expect(key).toBe("5,2,-3");
    });
  });
});

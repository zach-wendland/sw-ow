import { describe, it, expect, beforeEach } from "vitest";
import { generateChunkMesh, generateSimpleMesh } from "@/lib/voxel/meshing/greedyMesh";
import { Chunk } from "@/lib/voxel/Chunk";
import { BLOCKS, CHUNK_SIZE } from "@/lib/voxel/constants";

/**
 * Greedy Meshing Algorithm Tests
 *
 * Tests for the mesh generation that converts voxel data into renderable geometry.
 * Greedy meshing combines adjacent same-type faces into larger quads for efficiency.
 */

describe("Greedy Meshing", () => {
  let chunk: Chunk;

  beforeEach(() => {
    chunk = new Chunk({ x: 0, z: 0 });
  });

  describe("Empty Chunk", () => {
    it("should generate no mesh for empty chunk", () => {
      const mesh = generateChunkMesh(chunk);

      expect(mesh.vertexCount).toBe(0);
      expect(mesh.positions.length).toBe(0);
      expect(mesh.normals.length).toBe(0);
      expect(mesh.colors.length).toBe(0);
      expect(mesh.indices.length).toBe(0);
    });

    it("should mark chunk as empty", () => {
      expect(chunk.isEmpty).toBe(true);

      const mesh = generateChunkMesh(chunk);
      expect(mesh.vertexCount).toBe(0);
    });
  });

  describe("Single Block", () => {
    it("should generate mesh for single block", () => {
      chunk.setBlock(8, 8, 8, BLOCKS.STONE);

      const mesh = generateChunkMesh(chunk);

      // A single cube has 6 faces, each face has 4 vertices
      expect(mesh.vertexCount).toBe(24); // 6 faces * 4 vertices
      expect(mesh.positions.length).toBe(72); // 24 vertices * 3 components
      expect(mesh.normals.length).toBe(72);
      expect(mesh.colors.length).toBe(72);
      expect(mesh.indices.length).toBe(36); // 6 faces * 2 triangles * 3 indices
    });

    it("should position single block correctly in world space", () => {
      const chunk = new Chunk({ x: 2, z: 3 });
      chunk.setBlock(5, 5, 5, BLOCKS.STONE);

      const mesh = generateChunkMesh(chunk);

      // Block should be at world position (2*16+5, 5, 3*16+5) = (37, 5, 53)
      // Check that positions are in the expected range
      const positions = Array.from(mesh.positions);

      // Find min/max x positions
      const xPositions = [];
      for (let i = 0; i < positions.length; i += 3) {
        xPositions.push(positions[i]);
      }
      const minX = Math.min(...xPositions);
      const maxX = Math.max(...xPositions);

      // Block at local (5,5,5) in chunk (2,3) should have x positions around 37
      expect(minX).toBeGreaterThanOrEqual(37);
      expect(maxX).toBeLessThanOrEqual(38);
    });
  });

  describe("Adjacent Blocks", () => {
    it("should not generate internal faces between adjacent blocks", () => {
      // Place two adjacent blocks
      chunk.setBlock(8, 8, 8, BLOCKS.STONE);
      chunk.setBlock(9, 8, 8, BLOCKS.STONE);

      const mesh = generateChunkMesh(chunk);

      // Two blocks would have 12 faces total if separate
      // But 2 internal faces should be culled, leaving 10 faces
      // Greedy meshing might merge some faces too
      // At minimum: 10 faces * 4 vertices = 40
      // With greedy merging: could be fewer vertices
      expect(mesh.vertexCount).toBeLessThan(48); // Less than two separate cubes
    });

    it("should combine adjacent same-type faces with greedy meshing", () => {
      // Create a 2x1x1 row of blocks
      chunk.setBlock(5, 5, 5, BLOCKS.STONE);
      chunk.setBlock(6, 5, 5, BLOCKS.STONE);

      const mesh = generateChunkMesh(chunk);

      // Greedy meshing should combine the top and bottom faces
      // into single 2x1 quads instead of two 1x1 quads
      // This reduces vertex count
      expect(mesh.vertexCount).toBeLessThan(48);
    });

    it("should generate larger quads for flat surfaces", () => {
      // Create a 4x1x4 platform
      for (let x = 0; x < 4; x++) {
        for (let z = 0; z < 4; z++) {
          chunk.setBlock(x, 5, z, BLOCKS.STONE);
        }
      }

      const mesh = generateChunkMesh(chunk);

      // Without greedy meshing: 16 blocks * 6 faces = 96 faces
      // But internal faces are culled, and top/bottom should merge
      // Greedy meshing should produce far fewer vertices
      // Top face: 1 quad = 4 vertices
      // Bottom face: 1 quad = 4 vertices
      // 4 side faces per column = 16 edge faces (some merge)

      // Should be much less than naive 16*24 = 384 vertices
      expect(mesh.vertexCount).toBeLessThan(100);
    });
  });

  describe("Different Block Types", () => {
    it("should not merge faces of different block types", () => {
      chunk.setBlock(5, 5, 5, BLOCKS.STONE);
      chunk.setBlock(6, 5, 5, BLOCKS.DIRT);

      const mesh = generateChunkMesh(chunk);

      // Different types cannot be merged
      // Internal face between them is still culled though
      expect(mesh.vertexCount).toBeGreaterThan(0);
    });

    it("should assign correct colors to different block types", () => {
      chunk.setBlock(5, 5, 5, BLOCKS.STONE);
      chunk.setBlock(7, 5, 5, BLOCKS.GRASS); // Separated so all faces visible

      const mesh = generateChunkMesh(chunk);

      // Check that we have multiple distinct colors
      const colors = Array.from(mesh.colors);
      const uniqueColors = new Set<string>();

      for (let i = 0; i < colors.length; i += 3) {
        const colorKey = `${colors[i].toFixed(2)},${colors[i + 1].toFixed(2)},${colors[i + 2].toFixed(2)}`;
        uniqueColors.add(colorKey);
      }

      // Should have at least 2 different colors (stone gray, grass green)
      expect(uniqueColors.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Transparent Blocks", () => {
    it("should handle transparent blocks correctly", () => {
      // Place water surrounded by stone
      chunk.setBlock(8, 8, 8, BLOCKS.WATER);
      chunk.setBlock(7, 8, 8, BLOCKS.STONE);

      const mesh = generateChunkMesh(chunk);

      // Should generate faces between solid and transparent
      expect(mesh.vertexCount).toBeGreaterThan(0);
    });

    it("should generate faces between different transparent types", () => {
      chunk.setBlock(8, 8, 8, BLOCKS.WATER);
      chunk.setBlock(9, 8, 8, BLOCKS.ICE);

      const mesh = generateChunkMesh(chunk);

      // Different transparent types should have a face between them
      expect(mesh.vertexCount).toBeGreaterThan(0);
    });
  });

  describe("Chunk Boundaries", () => {
    it("should generate edge faces without neighbor lookup", () => {
      // Block at chunk edge
      chunk.setBlock(0, 8, 0, BLOCKS.STONE);

      const mesh = generateChunkMesh(chunk);

      // Should still generate all 6 faces since we have no neighbor info
      expect(mesh.vertexCount).toBe(24);
    });

    it("should use neighbor lookup for edge face culling", () => {
      chunk.setBlock(CHUNK_SIZE - 1, 8, 8, BLOCKS.STONE);

      // Mock neighbor block lookup that returns stone at the adjacent position
      const getNeighborBlock = (wx: number, wy: number, wz: number) => {
        if (wx === CHUNK_SIZE && wy === 8 && wz === 8) {
          return BLOCKS.STONE;
        }
        return BLOCKS.AIR;
      };

      const mesh = generateChunkMesh(chunk, getNeighborBlock);

      // The +X face should be culled since neighbor is stone
      // 5 faces * 4 vertices = 20
      expect(mesh.vertexCount).toBe(20);
    });
  });

  describe("Normals", () => {
    it("should generate correct normals for all faces", () => {
      chunk.setBlock(8, 8, 8, BLOCKS.STONE);

      const mesh = generateChunkMesh(chunk);
      const normals = Array.from(mesh.normals);

      // Collect unique normals
      const uniqueNormals = new Set<string>();
      for (let i = 0; i < normals.length; i += 3) {
        const normalKey = `${normals[i]},${normals[i + 1]},${normals[i + 2]}`;
        uniqueNormals.add(normalKey);
      }

      // Should have 6 unique normals for 6 faces
      expect(uniqueNormals.size).toBe(6);

      // Check for expected normals
      expect(uniqueNormals.has("1,0,0")).toBe(true);   // +X
      expect(uniqueNormals.has("-1,0,0")).toBe(true);  // -X
      expect(uniqueNormals.has("0,1,0")).toBe(true);   // +Y
      expect(uniqueNormals.has("0,-1,0")).toBe(true);  // -Y
      expect(uniqueNormals.has("0,0,1")).toBe(true);   // +Z
      expect(uniqueNormals.has("0,0,-1")).toBe(true);  // -Z
    });
  });

  describe("Index Buffer", () => {
    it("should generate valid triangle indices", () => {
      chunk.setBlock(8, 8, 8, BLOCKS.STONE);

      const mesh = generateChunkMesh(chunk);

      // All indices should be within vertex count
      for (const index of mesh.indices) {
        expect(index).toBeLessThan(mesh.vertexCount);
        expect(index).toBeGreaterThanOrEqual(0);
      }

      // Indices should form triangles (multiples of 3)
      expect(mesh.indices.length % 3).toBe(0);
    });
  });

  describe("Simple Mesh (Fallback)", () => {
    it("should generate mesh without greedy merging", () => {
      chunk.setBlock(8, 8, 8, BLOCKS.STONE);

      const simpleMesh = generateSimpleMesh(chunk);

      // Simple mesh should also produce 24 vertices for single block
      expect(simpleMesh.vertexCount).toBe(24);
    });

    it("should not merge adjacent faces in simple mesh", () => {
      // Create a 2x1x1 row
      chunk.setBlock(5, 5, 5, BLOCKS.STONE);
      chunk.setBlock(6, 5, 5, BLOCKS.STONE);

      const simpleMesh = generateSimpleMesh(chunk);
      const greedyMesh = generateChunkMesh(chunk);

      // Simple mesh doesn't merge, so might have more vertices
      // (internal faces are still culled though)
      expect(simpleMesh.vertexCount).toBeGreaterThanOrEqual(greedyMesh.vertexCount);
    });
  });

  describe("Performance Characteristics", () => {
    it("should handle large solid regions efficiently", () => {
      // Fill half the chunk
      for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let y = 0; y < 8; y++) {
          for (let z = 0; z < CHUNK_SIZE; z++) {
            chunk.setBlock(x, y, z, BLOCKS.STONE);
          }
        }
      }

      const start = performance.now();
      const mesh = generateChunkMesh(chunk);
      const duration = performance.now() - start;

      // Should complete in reasonable time (< 100ms even on slow systems)
      expect(duration).toBeLessThan(100);

      // Greedy meshing should produce relatively few vertices for solid region
      // Top: 1 large quad, Bottom: 1 large quad, 4 sides: 4 * 16 quads
      // Much less than naive 16*8*16 * 6 = 12288 faces
      expect(mesh.vertexCount).toBeLessThan(1000);
    });

    it("should handle checkerboard pattern (worst case)", () => {
      // Checkerboard is worst case for greedy meshing
      for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
          for (let z = 0; z < 8; z++) {
            if ((x + y + z) % 2 === 0) {
              chunk.setBlock(x, y, z, BLOCKS.STONE);
            }
          }
        }
      }

      const start = performance.now();
      const mesh = generateChunkMesh(chunk);
      const duration = performance.now() - start;

      // Should still complete in reasonable time
      expect(duration).toBeLessThan(200);

      // Will have many faces due to no merging opportunities
      expect(mesh.vertexCount).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle single block at origin", () => {
      chunk.setBlock(0, 0, 0, BLOCKS.STONE);

      const mesh = generateChunkMesh(chunk);
      expect(mesh.vertexCount).toBe(24);
    });

    it("should handle single block at max corner", () => {
      chunk.setBlock(CHUNK_SIZE - 1, CHUNK_SIZE - 1, CHUNK_SIZE - 1, BLOCKS.STONE);

      const mesh = generateChunkMesh(chunk);
      expect(mesh.vertexCount).toBe(24);
    });

    it("should handle full chunk", () => {
      chunk.fill(BLOCKS.STONE);

      const mesh = generateChunkMesh(chunk);

      // Full chunk with no neighbors visible = only outer shell faces
      // 6 faces of 16x16 = 6 large quads
      // With greedy meshing: 6 quads * 4 vertices = 24 vertices
      expect(mesh.vertexCount).toBe(24);
    });

    it("should handle hollow cube", () => {
      // Fill chunk then hollow it out
      chunk.fill(BLOCKS.STONE);
      for (let x = 1; x < CHUNK_SIZE - 1; x++) {
        for (let y = 1; y < CHUNK_SIZE - 1; y++) {
          for (let z = 1; z < CHUNK_SIZE - 1; z++) {
            chunk.setBlock(x, y, z, BLOCKS.AIR);
          }
        }
      }

      const mesh = generateChunkMesh(chunk);

      // Should have both outer and inner faces
      // Outer: 6 large quads
      // Inner: 6 large quads (slightly smaller)
      expect(mesh.vertexCount).toBeGreaterThan(24);
    });
  });
});

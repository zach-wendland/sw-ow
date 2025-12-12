import { ChunkMeshData, BlockId, FaceDirection } from "../types";
import { Chunk } from "../Chunk";
import {
  CHUNK_SIZE,
  BLOCKS,
  getBlockDefinition,
  isBlockEmpty,
  isBlockTransparent,
} from "../constants";

/**
 * Greedy Meshing Algorithm for Voxel Chunks
 *
 * Based on the algorithm described by Mikola Lysenko:
 * https://0fps.net/2012/06/30/meshing-in-a-block-world/
 *
 * This implementation:
 * 1. Iterates through each axis direction (6 faces)
 * 2. For each slice perpendicular to that axis, builds a 2D mask
 * 3. Greedily combines adjacent same-type faces into larger quads
 * 4. Generates optimized mesh data with minimal vertices
 */

interface MeshBuilder {
  positions: number[];
  normals: number[];
  colors: number[];
  indices: number[];
  vertexCount: number;
}

/**
 * Generate mesh data for a chunk using greedy meshing
 */
export function generateChunkMesh(
  chunk: Chunk,
  getNeighborBlock?: (wx: number, wy: number, wz: number) => BlockId
): ChunkMeshData {
  const builder: MeshBuilder = {
    positions: [],
    normals: [],
    colors: [],
    indices: [],
    vertexCount: 0,
  };

  if (chunk.isEmpty) {
    return createEmptyMeshData();
  }

  // Process each of the 6 face directions
  // For each direction, we sweep through slices perpendicular to that axis
  meshFaces(chunk, builder, getNeighborBlock);

  return finalizeMesh(builder);
}

/**
 * Process all 6 face directions
 */
function meshFaces(
  chunk: Chunk,
  builder: MeshBuilder,
  getNeighborBlock?: (wx: number, wy: number, wz: number) => BlockId
): void {
  // Axis info: [axis index, u axis, v axis, normal direction]
  const axes: Array<{
    d: number; // primary axis (0=x, 1=y, 2=z)
    u: number; // first perpendicular axis
    v: number; // second perpendicular axis
    backFace: boolean;
  }> = [
    { d: 0, u: 2, v: 1, backFace: false }, // +X (East)
    { d: 0, u: 2, v: 1, backFace: true },  // -X (West)
    { d: 1, u: 0, v: 2, backFace: false }, // +Y (Top)
    { d: 1, u: 0, v: 2, backFace: true },  // -Y (Bottom)
    { d: 2, u: 0, v: 1, backFace: false }, // +Z (South)
    { d: 2, u: 0, v: 1, backFace: true },  // -Z (North)
  ];

  // Mask for greedy meshing - stores block IDs or 0 for no face
  const mask = new Int32Array(CHUNK_SIZE * CHUNK_SIZE);

  for (const { d, u, v, backFace } of axes) {
    const normal: [number, number, number] = [0, 0, 0];
    normal[d] = backFace ? -1 : 1;

    // Sweep through slices perpendicular to this axis
    for (let slice = 0; slice < CHUNK_SIZE; slice++) {
      // Build the mask for this slice
      let maskIndex = 0;

      for (let vCoord = 0; vCoord < CHUNK_SIZE; vCoord++) {
        for (let uCoord = 0; uCoord < CHUNK_SIZE; uCoord++) {
          // Convert u,v,slice to x,y,z based on axis
          const pos: [number, number, number] = [0, 0, 0];
          pos[d] = slice;
          pos[u] = uCoord;
          pos[v] = vCoord;

          const [x, y, z] = pos;
          const block = chunk.getBlock(x, y, z);

          // Check if we need a face here
          let needsFace = false;
          let neighborBlock: BlockId = BLOCKS.AIR;

          // Get neighbor position
          const neighborPos: [number, number, number] = [x, y, z];
          neighborPos[d] += backFace ? -1 : 1;
          const [nx, ny, nz] = neighborPos;

          // Check if neighbor is within chunk
          if (nx >= 0 && nx < CHUNK_SIZE &&
              ny >= 0 && ny < CHUNK_SIZE &&
              nz >= 0 && nz < CHUNK_SIZE) {
            neighborBlock = chunk.getBlock(nx, ny, nz);
          } else if (getNeighborBlock) {
            // Get from neighboring chunk
            const [wx, wy, wz] = chunk.localToWorld(nx, ny, nz);
            neighborBlock = getNeighborBlock(wx, wy, wz);
          }

          // Face is needed if:
          // - Current block is solid and neighbor is air/transparent
          // - OR current block is transparent and neighbor is air (but not same transparent type)
          if (!isBlockEmpty(block)) {
            if (isBlockEmpty(neighborBlock)) {
              needsFace = true;
            } else if (isBlockTransparent(neighborBlock) && !isBlockTransparent(block)) {
              needsFace = true;
            } else if (isBlockTransparent(block) && isBlockTransparent(neighborBlock) && block !== neighborBlock) {
              needsFace = true;
            }
          }

          // Store in mask: positive = front face, negative = back face
          // Value is the block ID (shifted by 1 to avoid 0)
          mask[maskIndex++] = needsFace ? (backFace ? -(block + 1) : (block + 1)) : 0;
        }
      }

      // Greedy mesh the mask
      greedyMeshSlice(chunk, builder, mask, d, u, v, slice, backFace, normal);
    }
  }
}

/**
 * Greedy mesh a single slice
 */
function greedyMeshSlice(
  chunk: Chunk,
  builder: MeshBuilder,
  mask: Int32Array,
  d: number,
  u: number,
  v: number,
  slice: number,
  backFace: boolean,
  normal: [number, number, number]
): void {
  // Sweep through the mask, finding rectangles of same-type faces
  for (let j = 0; j < CHUNK_SIZE; j++) {
    for (let i = 0; i < CHUNK_SIZE;) {
      const maskVal = mask[i + j * CHUNK_SIZE];

      if (maskVal === 0) {
        i++;
        continue;
      }

      // Found a face - now greedily expand it

      // Calculate width (along u axis)
      let width = 1;
      while (i + width < CHUNK_SIZE &&
             mask[(i + width) + j * CHUNK_SIZE] === maskVal) {
        width++;
      }

      // Calculate height (along v axis)
      let height = 1;
      let done = false;
      while (j + height < CHUNK_SIZE && !done) {
        for (let k = 0; k < width; k++) {
          if (mask[(i + k) + (j + height) * CHUNK_SIZE] !== maskVal) {
            done = true;
            break;
          }
        }
        if (!done) height++;
      }

      // Extract block ID from mask value
      const blockId = Math.abs(maskVal) - 1;
      const blockDef = getBlockDefinition(blockId);

      // Convert i,j (in u,v space) to world position
      const pos: [number, number, number] = [0, 0, 0];
      pos[d] = slice + (backFace ? 0 : 1); // Offset for front faces
      pos[u] = i;
      pos[v] = j;

      // Get world position
      const [lx, ly, lz] = pos;
      const [wx, wy, wz] = chunk.localToWorld(lx, ly, lz);

      // Add quad to mesh
      addQuad(
        builder,
        wx, wy, wz,
        d, u, v,
        width, height,
        normal,
        blockDef.color,
        backFace
      );

      // Clear the mask region we just meshed
      for (let l = 0; l < height; l++) {
        for (let k = 0; k < width; k++) {
          mask[(i + k) + (j + l) * CHUNK_SIZE] = 0;
        }
      }

      i += width;
    }
  }
}

/**
 * Add a quad (two triangles) to the mesh
 */
function addQuad(
  builder: MeshBuilder,
  x: number, y: number, z: number,
  d: number, u: number, v: number,
  width: number, height: number,
  normal: [number, number, number],
  color: string,
  backFace: boolean
): void {
  // Parse color
  const [r, g, b] = hexToRgb(color);

  // Calculate the 4 corners of the quad
  // du and dv are unit vectors in the u and v directions
  const du: [number, number, number] = [0, 0, 0];
  const dv: [number, number, number] = [0, 0, 0];
  du[u] = 1;
  dv[v] = 1;

  // Four corners: origin, +width, +height, +width+height
  const v0: [number, number, number] = [x, y, z];
  const v1: [number, number, number] = [
    x + du[0] * width,
    y + du[1] * width,
    z + du[2] * width,
  ];
  const v2: [number, number, number] = [
    x + du[0] * width + dv[0] * height,
    y + du[1] * width + dv[1] * height,
    z + du[2] * width + dv[2] * height,
  ];
  const v3: [number, number, number] = [
    x + dv[0] * height,
    y + dv[1] * height,
    z + dv[2] * height,
  ];

  const baseIndex = builder.vertexCount;

  // Add vertices
  const vertices = backFace ? [v0, v3, v2, v1] : [v0, v1, v2, v3];
  for (const vert of vertices) {
    builder.positions.push(vert[0], vert[1], vert[2]);
    builder.normals.push(normal[0], normal[1], normal[2]);
    builder.colors.push(r, g, b);
  }

  // Add indices for two triangles
  if (backFace) {
    builder.indices.push(
      baseIndex, baseIndex + 1, baseIndex + 2,
      baseIndex, baseIndex + 2, baseIndex + 3
    );
  } else {
    builder.indices.push(
      baseIndex, baseIndex + 1, baseIndex + 2,
      baseIndex, baseIndex + 2, baseIndex + 3
    );
  }

  builder.vertexCount += 4;
}

/**
 * Convert hex color to RGB (0-1 range)
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ];
  }
  return [1, 1, 1]; // Default white
}

/**
 * Create empty mesh data
 */
function createEmptyMeshData(): ChunkMeshData {
  return {
    positions: new Float32Array(0),
    normals: new Float32Array(0),
    colors: new Float32Array(0),
    indices: new Uint32Array(0),
    vertexCount: 0,
  };
}

/**
 * Finalize mesh builder into typed arrays
 */
function finalizeMesh(builder: MeshBuilder): ChunkMeshData {
  return {
    positions: new Float32Array(builder.positions),
    normals: new Float32Array(builder.normals),
    colors: new Float32Array(builder.colors),
    indices: new Uint32Array(builder.indices),
    vertexCount: builder.vertexCount,
  };
}

/**
 * Simple face-per-visible-block meshing (for comparison/fallback)
 * Much simpler but generates more geometry
 */
export function generateSimpleMesh(
  chunk: Chunk,
  getNeighborBlock?: (wx: number, wy: number, wz: number) => BlockId
): ChunkMeshData {
  const builder: MeshBuilder = {
    positions: [],
    normals: [],
    colors: [],
    indices: [],
    vertexCount: 0,
  };

  if (chunk.isEmpty) {
    return createEmptyMeshData();
  }

  chunk.forEachBlock((x, y, z, blockId) => {
    const blockDef = getBlockDefinition(blockId);
    const [wx, wy, wz] = chunk.localToWorld(x, y, z);

    // Check each face
    const faces: Array<{ offset: [number, number, number]; normal: [number, number, number] }> = [
      { offset: [1, 0, 0], normal: [1, 0, 0] },   // +X
      { offset: [-1, 0, 0], normal: [-1, 0, 0] }, // -X
      { offset: [0, 1, 0], normal: [0, 1, 0] },   // +Y
      { offset: [0, -1, 0], normal: [0, -1, 0] }, // -Y
      { offset: [0, 0, 1], normal: [0, 0, 1] },   // +Z
      { offset: [0, 0, -1], normal: [0, 0, -1] }, // -Z
    ];

    for (const { offset, normal } of faces) {
      const [ox, oy, oz] = offset;
      const nx = x + ox;
      const ny = y + oy;
      const nz = z + oz;

      let neighborBlock: BlockId = BLOCKS.AIR;
      if (chunk.isValidCoord(nx, ny, nz)) {
        neighborBlock = chunk.getBlock(nx, ny, nz);
      } else if (getNeighborBlock) {
        const [wnx, wny, wnz] = chunk.localToWorld(nx, ny, nz);
        neighborBlock = getNeighborBlock(wnx, wny, wnz);
      }

      // Add face if neighbor is air or transparent
      if (isBlockEmpty(neighborBlock) ||
          (isBlockTransparent(neighborBlock) && !isBlockTransparent(blockId))) {
        addSimpleFace(builder, wx, wy, wz, normal, blockDef.color);
      }
    }
  });

  return finalizeMesh(builder);
}

/**
 * Add a single 1x1 face
 */
function addSimpleFace(
  builder: MeshBuilder,
  x: number, y: number, z: number,
  normal: [number, number, number],
  color: string
): void {
  const [r, g, b] = hexToRgb(color);
  const [nx, ny, nz] = normal;
  const baseIndex = builder.vertexCount;

  // Calculate face vertices based on normal direction
  let v0: [number, number, number];
  let v1: [number, number, number];
  let v2: [number, number, number];
  let v3: [number, number, number];

  if (nx === 1) {
    // +X face
    v0 = [x + 1, y, z];
    v1 = [x + 1, y + 1, z];
    v2 = [x + 1, y + 1, z + 1];
    v3 = [x + 1, y, z + 1];
  } else if (nx === -1) {
    // -X face
    v0 = [x, y, z + 1];
    v1 = [x, y + 1, z + 1];
    v2 = [x, y + 1, z];
    v3 = [x, y, z];
  } else if (ny === 1) {
    // +Y face
    v0 = [x, y + 1, z];
    v1 = [x, y + 1, z + 1];
    v2 = [x + 1, y + 1, z + 1];
    v3 = [x + 1, y + 1, z];
  } else if (ny === -1) {
    // -Y face
    v0 = [x, y, z + 1];
    v1 = [x, y, z];
    v2 = [x + 1, y, z];
    v3 = [x + 1, y, z + 1];
  } else if (nz === 1) {
    // +Z face
    v0 = [x + 1, y, z + 1];
    v1 = [x + 1, y + 1, z + 1];
    v2 = [x, y + 1, z + 1];
    v3 = [x, y, z + 1];
  } else {
    // -Z face
    v0 = [x, y, z];
    v1 = [x, y + 1, z];
    v2 = [x + 1, y + 1, z];
    v3 = [x + 1, y, z];
  }

  // Add vertices
  for (const vert of [v0, v1, v2, v3]) {
    builder.positions.push(vert[0], vert[1], vert[2]);
    builder.normals.push(nx, ny, nz);
    builder.colors.push(r, g, b);
  }

  // Add indices
  builder.indices.push(
    baseIndex, baseIndex + 1, baseIndex + 2,
    baseIndex, baseIndex + 2, baseIndex + 3
  );

  builder.vertexCount += 4;
}

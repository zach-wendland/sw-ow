import { BlockDefinition, BlockId, ChunkManagerConfig, TerrainGeneratorConfig } from "./types";

// ============================================================================
// CHUNK CONFIGURATION
// ============================================================================

export const CHUNK_SIZE = 16; // 16x16x16 blocks per chunk
export const CHUNK_HEIGHT = 64; // Total world height in blocks (4 vertical chunks)
export const CHUNK_VOLUME = CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE; // 4096

// ============================================================================
// DEFAULT CONFIGS
// ============================================================================

export const DEFAULT_CHUNK_MANAGER_CONFIG: ChunkManagerConfig = {
  renderDistance: 6, // 6 chunks = 96 blocks visibility
  chunkSize: CHUNK_SIZE,
  worldHeight: CHUNK_HEIGHT,
  maxChunksInMemory: 500, // ~25MB max
  meshBudgetPerFrame: 2, // Max 2 chunk meshes built per frame
};

export const DEFAULT_TERRAIN_CONFIG: TerrainGeneratorConfig = {
  seed: 12345,
  baseHeight: 16, // Base ground level
  heightVariation: 12, // Max height variation
  noiseScale: 0.02,
  octaves: 4,
  persistence: 0.5,
  lacunarity: 2.0,
};

// ============================================================================
// BLOCK IDS
// ============================================================================

export const BLOCKS = {
  // Air (empty)
  AIR: 0,

  // Natural terrain
  SAND: 1,
  SANDSTONE: 2,
  DIRT: 3,
  GRASS: 4,
  STONE: 5,
  SNOW: 6,
  ICE: 7,
  WATER: 8,
  LAVA: 9,

  // Constructed - Imperial/General
  DURASTEEL: 10,
  DURASTEEL_DARK: 11,
  DURACRETE: 12,
  DURACRETE_LIGHT: 13,
  TRANSPARISTEEL: 14,
  HULL_PLATING: 15,
  GRATING: 16,
  VENT: 17,

  // Constructed - Organic/Rebel
  WOOD: 20,
  WOOD_DARK: 21,
  CLAY: 22,
  THATCH: 23,
  ADOBE: 24,

  // Organic/Nature
  TREE_TRUNK: 30,
  LEAVES: 31,
  LEAVES_DARK: 32,
  FUNGUS: 33,
  MOSS: 34,
  CORAL: 35,

  // Lighting
  LIGHT_PANEL: 40,
  LIGHT_WARM: 41,
  NEON_BLUE: 42,
  NEON_RED: 43,
  NEON_GREEN: 44,
  NEON_YELLOW: 45,
  HOLOGRAM_BASE: 46,

  // Special/Rare
  KYBER_CRYSTAL: 50,
  KYBER_CRYSTAL_RED: 51,
  BESKAR: 52,
  CORTOSIS: 53,
  CARBONITE: 54,

  // Hazards
  ACID: 60,
  TOXIC_WASTE: 61,
  ELECTRIC_FLOOR: 62,
} as const;

export type BlockType = (typeof BLOCKS)[keyof typeof BLOCKS];

// ============================================================================
// BLOCK DEFINITIONS
// ============================================================================

export const BLOCK_DEFINITIONS: Record<BlockId, BlockDefinition> = {
  // Air
  [BLOCKS.AIR]: {
    id: BLOCKS.AIR,
    name: "Air",
    color: "#000000",
    solid: false,
    transparent: true,
    opacity: 0,
  },

  // Natural terrain
  [BLOCKS.SAND]: {
    id: BLOCKS.SAND,
    name: "Sand",
    color: "#c2b280",
    solid: true,
  },
  [BLOCKS.SANDSTONE]: {
    id: BLOCKS.SANDSTONE,
    name: "Sandstone",
    color: "#d4a574",
    solid: true,
  },
  [BLOCKS.DIRT]: {
    id: BLOCKS.DIRT,
    name: "Dirt",
    color: "#8b7355",
    solid: true,
  },
  [BLOCKS.GRASS]: {
    id: BLOCKS.GRASS,
    name: "Grass",
    color: "#567d46",
    solid: true,
  },
  [BLOCKS.STONE]: {
    id: BLOCKS.STONE,
    name: "Stone",
    color: "#808080",
    solid: true,
  },
  [BLOCKS.SNOW]: {
    id: BLOCKS.SNOW,
    name: "Snow",
    color: "#fffafa",
    solid: true,
  },
  [BLOCKS.ICE]: {
    id: BLOCKS.ICE,
    name: "Ice",
    color: "#b0e0e6",
    solid: true,
    transparent: true,
    opacity: 0.8,
  },
  [BLOCKS.WATER]: {
    id: BLOCKS.WATER,
    name: "Water",
    color: "#1e90ff",
    solid: false,
    transparent: true,
    opacity: 0.6,
  },
  [BLOCKS.LAVA]: {
    id: BLOCKS.LAVA,
    name: "Lava",
    color: "#ff4500",
    emissive: "#ff2200",
    emissiveIntensity: 1.0,
    solid: false,
    transparent: true,
    opacity: 0.9,
  },

  // Imperial/General structures
  [BLOCKS.DURASTEEL]: {
    id: BLOCKS.DURASTEEL,
    name: "Durasteel",
    color: "#4a4a4a",
    solid: true,
  },
  [BLOCKS.DURASTEEL_DARK]: {
    id: BLOCKS.DURASTEEL_DARK,
    name: "Dark Durasteel",
    color: "#2a2a2a",
    solid: true,
  },
  [BLOCKS.DURACRETE]: {
    id: BLOCKS.DURACRETE,
    name: "Duracrete",
    color: "#a0a0a0",
    solid: true,
  },
  [BLOCKS.DURACRETE_LIGHT]: {
    id: BLOCKS.DURACRETE_LIGHT,
    name: "Light Duracrete",
    color: "#c8c8c8",
    solid: true,
  },
  [BLOCKS.TRANSPARISTEEL]: {
    id: BLOCKS.TRANSPARISTEEL,
    name: "Transparisteel",
    color: "#87ceeb",
    solid: true,
    transparent: true,
    opacity: 0.4,
  },
  [BLOCKS.HULL_PLATING]: {
    id: BLOCKS.HULL_PLATING,
    name: "Hull Plating",
    color: "#3d3d3d",
    solid: true,
  },
  [BLOCKS.GRATING]: {
    id: BLOCKS.GRATING,
    name: "Grating",
    color: "#555555",
    solid: true,
  },
  [BLOCKS.VENT]: {
    id: BLOCKS.VENT,
    name: "Vent",
    color: "#333333",
    solid: true,
  },

  // Organic/Rebel structures
  [BLOCKS.WOOD]: {
    id: BLOCKS.WOOD,
    name: "Wood",
    color: "#8b4513",
    solid: true,
  },
  [BLOCKS.WOOD_DARK]: {
    id: BLOCKS.WOOD_DARK,
    name: "Dark Wood",
    color: "#5c3317",
    solid: true,
  },
  [BLOCKS.CLAY]: {
    id: BLOCKS.CLAY,
    name: "Clay",
    color: "#cd853f",
    solid: true,
  },
  [BLOCKS.THATCH]: {
    id: BLOCKS.THATCH,
    name: "Thatch",
    color: "#daa520",
    solid: true,
  },
  [BLOCKS.ADOBE]: {
    id: BLOCKS.ADOBE,
    name: "Adobe",
    color: "#d2691e",
    solid: true,
  },

  // Nature
  [BLOCKS.TREE_TRUNK]: {
    id: BLOCKS.TREE_TRUNK,
    name: "Tree Trunk",
    color: "#654321",
    solid: true,
  },
  [BLOCKS.LEAVES]: {
    id: BLOCKS.LEAVES,
    name: "Leaves",
    color: "#228b22",
    solid: true,
    transparent: true,
    opacity: 0.9,
  },
  [BLOCKS.LEAVES_DARK]: {
    id: BLOCKS.LEAVES_DARK,
    name: "Dark Leaves",
    color: "#006400",
    solid: true,
    transparent: true,
    opacity: 0.9,
  },
  [BLOCKS.FUNGUS]: {
    id: BLOCKS.FUNGUS,
    name: "Fungus",
    color: "#9370db",
    solid: true,
  },
  [BLOCKS.MOSS]: {
    id: BLOCKS.MOSS,
    name: "Moss",
    color: "#6b8e23",
    solid: true,
  },
  [BLOCKS.CORAL]: {
    id: BLOCKS.CORAL,
    name: "Coral",
    color: "#ff7f50",
    solid: true,
  },

  // Lighting
  [BLOCKS.LIGHT_PANEL]: {
    id: BLOCKS.LIGHT_PANEL,
    name: "Light Panel",
    color: "#ffffff",
    emissive: "#ffffff",
    emissiveIntensity: 1.0,
    solid: true,
  },
  [BLOCKS.LIGHT_WARM]: {
    id: BLOCKS.LIGHT_WARM,
    name: "Warm Light",
    color: "#ffddaa",
    emissive: "#ffaa55",
    emissiveIntensity: 0.8,
    solid: true,
  },
  [BLOCKS.NEON_BLUE]: {
    id: BLOCKS.NEON_BLUE,
    name: "Neon Blue",
    color: "#00bfff",
    emissive: "#00bfff",
    emissiveIntensity: 1.2,
    solid: true,
  },
  [BLOCKS.NEON_RED]: {
    id: BLOCKS.NEON_RED,
    name: "Neon Red",
    color: "#ff4444",
    emissive: "#ff0000",
    emissiveIntensity: 1.2,
    solid: true,
  },
  [BLOCKS.NEON_GREEN]: {
    id: BLOCKS.NEON_GREEN,
    name: "Neon Green",
    color: "#44ff44",
    emissive: "#00ff00",
    emissiveIntensity: 1.2,
    solid: true,
  },
  [BLOCKS.NEON_YELLOW]: {
    id: BLOCKS.NEON_YELLOW,
    name: "Neon Yellow",
    color: "#ffff44",
    emissive: "#ffff00",
    emissiveIntensity: 1.2,
    solid: true,
  },
  [BLOCKS.HOLOGRAM_BASE]: {
    id: BLOCKS.HOLOGRAM_BASE,
    name: "Hologram Base",
    color: "#1a1a2e",
    emissive: "#4444ff",
    emissiveIntensity: 0.3,
    solid: true,
  },

  // Special/Rare
  [BLOCKS.KYBER_CRYSTAL]: {
    id: BLOCKS.KYBER_CRYSTAL,
    name: "Kyber Crystal",
    color: "#87ceeb",
    emissive: "#4488ff",
    emissiveIntensity: 0.8,
    solid: true,
    transparent: true,
    opacity: 0.7,
  },
  [BLOCKS.KYBER_CRYSTAL_RED]: {
    id: BLOCKS.KYBER_CRYSTAL_RED,
    name: "Corrupted Kyber Crystal",
    color: "#ff6b6b",
    emissive: "#ff0000",
    emissiveIntensity: 0.8,
    solid: true,
    transparent: true,
    opacity: 0.7,
  },
  [BLOCKS.BESKAR]: {
    id: BLOCKS.BESKAR,
    name: "Beskar",
    color: "#c0c0c0",
    emissive: "#ffffff",
    emissiveIntensity: 0.1,
    solid: true,
  },
  [BLOCKS.CORTOSIS]: {
    id: BLOCKS.CORTOSIS,
    name: "Cortosis",
    color: "#b8860b",
    solid: true,
  },
  [BLOCKS.CARBONITE]: {
    id: BLOCKS.CARBONITE,
    name: "Carbonite",
    color: "#2f4f4f",
    solid: true,
  },

  // Hazards
  [BLOCKS.ACID]: {
    id: BLOCKS.ACID,
    name: "Acid",
    color: "#adff2f",
    emissive: "#88ff00",
    emissiveIntensity: 0.5,
    solid: false,
    transparent: true,
    opacity: 0.7,
  },
  [BLOCKS.TOXIC_WASTE]: {
    id: BLOCKS.TOXIC_WASTE,
    name: "Toxic Waste",
    color: "#7cfc00",
    emissive: "#44ff00",
    emissiveIntensity: 0.3,
    solid: false,
    transparent: true,
    opacity: 0.8,
  },
  [BLOCKS.ELECTRIC_FLOOR]: {
    id: BLOCKS.ELECTRIC_FLOOR,
    name: "Electric Floor",
    color: "#4169e1",
    emissive: "#0066ff",
    emissiveIntensity: 0.6,
    solid: true,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getBlockDefinition(blockId: BlockId): BlockDefinition {
  return BLOCK_DEFINITIONS[blockId] || BLOCK_DEFINITIONS[BLOCKS.AIR];
}

export function isBlockSolid(blockId: BlockId): boolean {
  const def = getBlockDefinition(blockId);
  return def.solid;
}

export function isBlockTransparent(blockId: BlockId): boolean {
  const def = getBlockDefinition(blockId);
  return def.transparent || false;
}

export function isBlockEmpty(blockId: BlockId): boolean {
  return blockId === BLOCKS.AIR;
}

// Convert 3D local coords to 1D array index
export function coordToIndex(x: number, y: number, z: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_SIZE;
}

// Convert 1D array index to 3D local coords
export function indexToCoord(index: number): [number, number, number] {
  const z = Math.floor(index / (CHUNK_SIZE * CHUNK_SIZE));
  const remainder = index % (CHUNK_SIZE * CHUNK_SIZE);
  const y = Math.floor(remainder / CHUNK_SIZE);
  const x = remainder % CHUNK_SIZE;
  return [x, y, z];
}

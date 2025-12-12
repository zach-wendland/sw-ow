// ============================================================================
// ENEMY TYPE DEFINITIONS
// ============================================================================

export interface Position {
  x: number;
  y: number;
  z: number;
}

export type EnemyState = 'idle' | 'patrol' | 'chase' | 'attack' | 'windup' | 'recovery' | 'staggered' | 'dead';

export interface EnemyTypeConfig {
  id: string;
  name: string;
  health: number;
  damage: number;
  xpReward: number;
  goldReward: { min: number; max: number };
  detectionRange: number;
  attackRange: number;
  attackCooldown: number; // seconds between attacks
  speed: number;
  color: string; // For placeholder model
  scale: number;
  lootTable: string;
  // Combat feel - attack telegraph
  windupTime: number; // ms before attack lands (telegraph window)
  recoveryTime: number; // ms after attack where enemy is vulnerable
}

export interface Enemy {
  id: string;
  type: string;
  position: Position;
  rotation: number;
  health: number;
  maxHealth: number;
  state: EnemyState;
  target: string | null;
  lastAttackTime: number;
  spawnPosition: Position; // For patrol behavior
  patrolRadius: number;
  patrolTarget: Position | null;
}

// ============================================================================
// ENEMY TYPE CONFIGURATIONS
// ============================================================================

export const ENEMY_TYPES: Record<string, EnemyTypeConfig> = {
  // ============================================================================
  // STAR WARS DROID ENEMIES - First Mission "Echoes of the Clone Wars"
  // ============================================================================

  b1_droid: {
    id: 'b1_droid',
    name: 'B1 Battle Droid',
    health: 30,
    damage: 5,
    xpReward: 15,
    goldReward: { min: 5, max: 10 },
    detectionRange: 15,
    attackRange: 6,        // Ranged blaster
    attackCooldown: 2,     // Slow fire rate - "Roger Roger"
    speed: 2,
    color: '#C4A46B',      // Tan/rust color
    scale: 1,
    lootTable: 'droid',
    windupTime: 600,       // Clear telegraph - arm raises
    recoveryTime: 800,     // Big punish window
  },

  b2_droid: {
    id: 'b2_droid',
    name: 'B2 Super Battle Droid',
    health: 80,
    damage: 12,
    xpReward: 40,
    goldReward: { min: 15, max: 25 },
    detectionRange: 12,
    attackRange: 4,        // Wrist blaster, closer range
    attackCooldown: 1.5,
    speed: 3,
    color: '#4A5568',      // Gunmetal blue-gray
    scale: 1.2,
    lootTable: 'droid',
    windupTime: 400,       // Faster telegraph
    recoveryTime: 600,     // Smaller punish window
  },

  droideka: {
    id: 'droideka',
    name: 'Droideka',
    health: 150,
    damage: 20,
    xpReward: 100,
    goldReward: { min: 40, max: 60 },
    detectionRange: 20,
    attackRange: 8,        // Twin blasters, long range
    attackCooldown: 0.8,   // Rapid fire bursts
    speed: 2,              // Slow when deployed (not in wheel mode)
    color: '#2D3748',      // Dark chrome
    scale: 1.3,
    lootTable: 'droid_boss',
    windupTime: 300,       // Quick attacks
    recoveryTime: 1500,    // Long recovery after burst - punish window!
  },

  // ============================================================================
  // ORIGINAL FANTASY ENEMIES
  // ============================================================================

  wolf: {
    id: 'wolf',
    name: 'Wild Wolf',
    health: 50,
    damage: 8,
    xpReward: 25,
    goldReward: { min: 5, max: 15 },
    detectionRange: 15,
    attackRange: 2,
    attackCooldown: 1.2,
    speed: 5,
    color: '#6B4423',
    scale: 0.8,
    lootTable: 'wolf',
    windupTime: 300, // Fast attacker - short telegraph
    recoveryTime: 400,
  },
  bandit: {
    id: 'bandit',
    name: 'Forest Bandit',
    health: 80,
    damage: 12,
    xpReward: 50,
    goldReward: { min: 10, max: 30 },
    detectionRange: 20,
    attackRange: 2.5,
    attackCooldown: 1.5,
    speed: 4,
    color: '#8B0000',
    scale: 1,
    lootTable: 'bandit',
    windupTime: 400, // Medium telegraph
    recoveryTime: 500,
  },
  golem: {
    id: 'golem',
    name: 'Stone Golem',
    health: 200,
    damage: 25,
    xpReward: 150,
    goldReward: { min: 30, max: 60 },
    detectionRange: 12,
    attackRange: 3,
    attackCooldown: 2.5,
    speed: 2,
    color: '#4A4A4A',
    scale: 1.5,
    lootTable: 'golem',
    windupTime: 800, // Slow heavy hitter - long telegraph
    recoveryTime: 1000, // Long recovery = big punish window
  },
  skeleton: {
    id: 'skeleton',
    name: 'Skeleton Warrior',
    health: 60,
    damage: 10,
    xpReward: 35,
    goldReward: { min: 8, max: 20 },
    detectionRange: 18,
    attackRange: 2.5,
    attackCooldown: 1.3,
    speed: 3.5,
    color: '#E8E8E8',
    scale: 1,
    lootTable: 'skeleton',
    windupTime: 350, // Medium-fast
    recoveryTime: 450,
  },
  slime: {
    id: 'slime',
    name: 'Forest Slime',
    health: 30,
    damage: 5,
    xpReward: 15,
    goldReward: { min: 2, max: 8 },
    detectionRange: 10,
    attackRange: 1.5,
    attackCooldown: 2,
    speed: 2,
    color: '#32CD32',
    scale: 0.6,
    lootTable: 'slime',
    windupTime: 500, // Slow, easy to read
    recoveryTime: 600,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getEnemyConfig(type: string): EnemyTypeConfig {
  return ENEMY_TYPES[type] || ENEMY_TYPES.slime;
}

export function createEnemy(
  type: string,
  position: Position,
  id?: string
): Enemy {
  const config = getEnemyConfig(type);

  return {
    id: id || `enemy_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    position: { ...position },
    rotation: Math.random() * Math.PI * 2,
    health: config.health,
    maxHealth: config.health,
    state: 'idle',
    target: null,
    lastAttackTime: 0,
    spawnPosition: { ...position },
    patrolRadius: 10,
    patrolTarget: null,
  };
}

export function getRandomGoldDrop(type: string): number {
  const config = getEnemyConfig(type);
  return Math.floor(
    Math.random() * (config.goldReward.max - config.goldReward.min + 1) +
      config.goldReward.min
  );
}

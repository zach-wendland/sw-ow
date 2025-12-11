// ============================================================================
// ENEMY TYPE DEFINITIONS
// ============================================================================

export interface Position {
  x: number;
  y: number;
  z: number;
}

export type EnemyState = 'idle' | 'patrol' | 'chase' | 'attack' | 'dead';

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

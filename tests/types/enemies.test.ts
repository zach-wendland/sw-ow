import { describe, it, expect } from 'vitest';
import {
  ENEMY_TYPES,
  createEnemy,
  getEnemyConfig,
  getRandomGoldDrop,
  type EnemyTypeConfig,
  type Position,
} from '@/types/enemies';

describe('Enemy Types', () => {
  describe('ENEMY_TYPES', () => {
    it('should have slime enemy type', () => {
      expect(ENEMY_TYPES.slime).toBeDefined();
      expect(ENEMY_TYPES.slime.name).toBe('Forest Slime');
    });

    it('should have wolf enemy type', () => {
      expect(ENEMY_TYPES.wolf).toBeDefined();
      expect(ENEMY_TYPES.wolf.name).toBe('Wild Wolf');
    });

    it('should have bandit enemy type', () => {
      expect(ENEMY_TYPES.bandit).toBeDefined();
      expect(ENEMY_TYPES.bandit.name).toBe('Forest Bandit');
    });

    it('should have golem enemy type', () => {
      expect(ENEMY_TYPES.golem).toBeDefined();
      expect(ENEMY_TYPES.golem.name).toBe('Stone Golem');
    });

    it('should have skeleton enemy type', () => {
      expect(ENEMY_TYPES.skeleton).toBeDefined();
      expect(ENEMY_TYPES.skeleton.name).toBe('Skeleton Warrior');
    });

    it('should have all required fields for each enemy type', () => {
      Object.values(ENEMY_TYPES).forEach((config: EnemyTypeConfig) => {
        expect(config.id).toBeDefined();
        expect(config.name).toBeDefined();
        expect(config.health).toBeGreaterThan(0);
        expect(config.damage).toBeGreaterThan(0);
        expect(config.xpReward).toBeGreaterThan(0);
        expect(config.goldReward).toBeDefined();
        expect(config.goldReward.min).toBeDefined();
        expect(config.goldReward.max).toBeDefined();
        expect(config.color).toBeDefined();
        expect(config.scale).toBeGreaterThan(0);
        expect(config.detectionRange).toBeGreaterThan(0);
        expect(config.attackRange).toBeGreaterThan(0);
        expect(config.attackCooldown).toBeGreaterThan(0);
        expect(config.speed).toBeGreaterThan(0);
      });
    });
  });

  describe('getEnemyConfig', () => {
    it('should return correct config for slime', () => {
      const config = getEnemyConfig('slime');
      expect(config.name).toBe('Forest Slime');
      expect(config).toEqual(ENEMY_TYPES.slime);
    });

    it('should return correct config for wolf', () => {
      const config = getEnemyConfig('wolf');
      expect(config.name).toBe('Wild Wolf');
    });

    it('should return slime config as fallback for unknown type', () => {
      const config = getEnemyConfig('unknown_type');
      expect(config).toEqual(ENEMY_TYPES.slime);
    });
  });

  describe('createEnemy', () => {
    it('should create enemy with correct type', () => {
      const enemy = createEnemy('wolf', { x: 0, y: 0, z: 0 });
      expect(enemy.type).toBe('wolf');
    });

    it('should create enemy at correct position', () => {
      const position: Position = { x: 10, y: 5, z: 15 };
      const enemy = createEnemy('slime', position);
      expect(enemy.position).toEqual(position);
    });

    it('should create enemy with full health', () => {
      const enemy = createEnemy('wolf', { x: 0, y: 0, z: 0 });
      const config = getEnemyConfig('wolf');

      expect(enemy.health).toBe(config.health);
      expect(enemy.maxHealth).toBe(config.health);
    });

    it('should create enemy in idle state', () => {
      const enemy = createEnemy('slime', { x: 0, y: 0, z: 0 });
      expect(enemy.state).toBe('idle');
    });

    it('should create enemy with no target', () => {
      const enemy = createEnemy('slime', { x: 0, y: 0, z: 0 });
      expect(enemy.target).toBeNull();
    });

    it('should create enemy with random rotation', () => {
      const enemy = createEnemy('slime', { x: 0, y: 0, z: 0 });
      expect(enemy.rotation).toBeGreaterThanOrEqual(0);
      expect(enemy.rotation).toBeLessThanOrEqual(Math.PI * 2);
    });

    it('should create enemy with zero last attack time', () => {
      const enemy = createEnemy('slime', { x: 0, y: 0, z: 0 });
      expect(enemy.lastAttackTime).toBe(0);
    });

    it('should generate unique IDs for each enemy', () => {
      const enemy1 = createEnemy('slime', { x: 0, y: 0, z: 0 });
      const enemy2 = createEnemy('slime', { x: 0, y: 0, z: 0 });

      expect(enemy1.id).not.toBe(enemy2.id);
    });

    it('should create enemy ID with correct prefix', () => {
      const enemy = createEnemy('slime', { x: 0, y: 0, z: 0 });
      expect(enemy.id).toMatch(/^enemy_/);
    });

    it('should use custom ID when provided', () => {
      const customId = 'custom_enemy_123';
      const enemy = createEnemy('slime', { x: 0, y: 0, z: 0 }, customId);
      expect(enemy.id).toBe(customId);
    });

    it('should set spawn position same as initial position', () => {
      const position = { x: 10, y: 5, z: 15 };
      const enemy = createEnemy('slime', position);
      expect(enemy.spawnPosition).toEqual(position);
    });
  });

  describe('getRandomGoldDrop', () => {
    it('should return gold within slime range', () => {
      const config = getEnemyConfig('slime');

      for (let i = 0; i < 100; i++) {
        const gold = getRandomGoldDrop('slime');
        expect(gold).toBeGreaterThanOrEqual(config.goldReward.min);
        expect(gold).toBeLessThanOrEqual(config.goldReward.max);
      }
    });

    it('should return gold within wolf range', () => {
      const config = getEnemyConfig('wolf');

      for (let i = 0; i < 100; i++) {
        const gold = getRandomGoldDrop('wolf');
        expect(gold).toBeGreaterThanOrEqual(config.goldReward.min);
        expect(gold).toBeLessThanOrEqual(config.goldReward.max);
      }
    });

    it('should return integer values', () => {
      for (let i = 0; i < 100; i++) {
        const gold = getRandomGoldDrop('wolf');
        expect(Number.isInteger(gold)).toBe(true);
      }
    });
  });

  describe('Enemy Config Values', () => {
    it('slime should be weak enemy', () => {
      const slime = ENEMY_TYPES.slime;
      expect(slime.health).toBeLessThan(50);
      expect(slime.damage).toBeLessThan(15);
      expect(slime.xpReward).toBeLessThan(30);
    });

    it('wolf should be medium enemy', () => {
      const wolf = ENEMY_TYPES.wolf;
      expect(wolf.health).toBeGreaterThan(ENEMY_TYPES.slime.health);
      expect(wolf.damage).toBeGreaterThan(ENEMY_TYPES.slime.damage);
      expect(wolf.xpReward).toBeGreaterThan(ENEMY_TYPES.slime.xpReward);
    });

    it('golem should be strongest enemy', () => {
      const golem = ENEMY_TYPES.golem;
      expect(golem.health).toBeGreaterThan(ENEMY_TYPES.wolf.health);
      expect(golem.damage).toBeGreaterThan(ENEMY_TYPES.wolf.damage);
    });

    it('all enemies should have positive attack cooldown', () => {
      Object.values(ENEMY_TYPES).forEach((config) => {
        expect(config.attackCooldown).toBeGreaterThan(0);
      });
    });

    it('detection range should be greater than attack range', () => {
      Object.values(ENEMY_TYPES).forEach((config) => {
        expect(config.detectionRange).toBeGreaterThan(config.attackRange);
      });
    });
  });
});

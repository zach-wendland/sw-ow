import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useEnemyStore, selectSelectedEnemy, selectEnemyCount, selectAliveEnemyCount } from '@/lib/stores/useEnemyStore';

describe('useEnemyStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useEnemyStore.setState({
      enemies: new Map(),
      selectedEnemyId: null,
    });
  });

  describe('Spawning', () => {
    it('should spawn a single enemy', () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });

      expect(enemyId).toBeDefined();
      expect(useEnemyStore.getState().enemies.size).toBe(1);
    });

    it('should spawn enemy with correct type and position', () => {
      const store = useEnemyStore.getState();
      const position = { x: 5, y: 0, z: 10 };
      const enemyId = store.spawnEnemy('wolf', position);

      const enemy = useEnemyStore.getState().enemies.get(enemyId);
      expect(enemy?.type).toBe('wolf');
      expect(enemy?.position).toEqual(position);
    });

    it('should spawn enemy with full health', () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });

      const enemy = useEnemyStore.getState().enemies.get(enemyId);
      expect(enemy?.health).toBe(enemy?.maxHealth);
    });

    it('should spawn enemy in idle state', () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });

      const enemy = useEnemyStore.getState().enemies.get(enemyId);
      expect(enemy?.state).toBe('idle');
    });

    it('should spawn multiple enemies at once', () => {
      const store = useEnemyStore.getState();
      store.spawnEnemies([
        { type: 'slime', position: { x: 0, y: 0, z: 0 } },
        { type: 'wolf', position: { x: 5, y: 0, z: 5 } },
        { type: 'wolf', position: { x: 10, y: 0, z: 10 } },
      ]);

      expect(useEnemyStore.getState().enemies.size).toBe(3);
    });

    it('should remove enemy', () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });

      expect(useEnemyStore.getState().enemies.size).toBe(1);

      store.removeEnemy(enemyId);

      expect(useEnemyStore.getState().enemies.size).toBe(0);
    });

    it('should clear selected enemy when removed', () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });
      store.selectEnemy(enemyId);

      expect(useEnemyStore.getState().selectedEnemyId).toBe(enemyId);

      store.removeEnemy(enemyId);

      expect(useEnemyStore.getState().selectedEnemyId).toBeNull();
    });

    it('should clear all enemies', () => {
      const store = useEnemyStore.getState();
      store.spawnEnemies([
        { type: 'slime', position: { x: 0, y: 0, z: 0 } },
        { type: 'wolf', position: { x: 5, y: 0, z: 5 } },
      ]);
      store.selectEnemy(Array.from(useEnemyStore.getState().enemies.keys())[0]);

      store.clearAllEnemies();

      expect(useEnemyStore.getState().enemies.size).toBe(0);
      expect(useEnemyStore.getState().selectedEnemyId).toBeNull();
    });
  });

  describe('Combat', () => {
    it('should damage enemy', () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });

      const enemy = useEnemyStore.getState().enemies.get(enemyId)!;
      const initialHealth = enemy.health;

      store.damageEnemy(enemyId, 10);

      const updatedEnemy = useEnemyStore.getState().enemies.get(enemyId)!;
      expect(updatedEnemy.health).toBe(initialHealth - 10);
    });

    it('should kill enemy when health reaches 0', () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });

      const enemy = useEnemyStore.getState().enemies.get(enemyId)!;
      const result = store.damageEnemy(enemyId, enemy.maxHealth + 100);

      expect(result.killed).toBe(true);
      expect(useEnemyStore.getState().enemies.get(enemyId)?.state).toBe('dead');
    });

    it('should return xp and gold on kill', () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });

      const enemy = useEnemyStore.getState().enemies.get(enemyId)!;
      const result = store.damageEnemy(enemyId, enemy.maxHealth + 100);

      expect(result.xp).toBeGreaterThan(0);
      expect(result.gold).toBeGreaterThanOrEqual(0);
    });

    it('should not damage dead enemy', () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });

      const enemy = useEnemyStore.getState().enemies.get(enemyId)!;
      store.damageEnemy(enemyId, enemy.maxHealth + 100); // Kill

      const result = store.damageEnemy(enemyId, 50); // Try to damage dead enemy

      expect(result.killed).toBe(false);
      expect(result.xp).toBe(0);
      expect(result.gold).toBe(0);
    });

    it('should return nothing when damaging non-existent enemy', () => {
      const store = useEnemyStore.getState();
      const result = store.damageEnemy('non-existent', 50);

      expect(result.killed).toBe(false);
      expect(result.xp).toBe(0);
      expect(result.gold).toBe(0);
    });

    it('should not allow health to go below 0', () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });

      store.damageEnemy(enemyId, 9999);

      expect(useEnemyStore.getState().enemies.get(enemyId)?.health).toBe(0);
    });
  });

  describe('Enemy State Management', () => {
    it('should select enemy', () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });

      store.selectEnemy(enemyId);

      expect(useEnemyStore.getState().selectedEnemyId).toBe(enemyId);
    });

    it('should deselect enemy', () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });
      store.selectEnemy(enemyId);
      store.selectEnemy(null);

      expect(useEnemyStore.getState().selectedEnemyId).toBeNull();
    });

    it('should set enemy state', () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });

      store.setEnemyState(enemyId, 'chase');

      expect(useEnemyStore.getState().enemies.get(enemyId)?.state).toBe('chase');
    });

    it('should set enemy target', () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });

      store.setEnemyTarget(enemyId, 'player');

      expect(useEnemyStore.getState().enemies.get(enemyId)?.target).toBe('player');
    });

    it('should set enemy position', () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });
      const newPosition = { x: 10, y: 5, z: 15 };

      store.setEnemyPosition(enemyId, newPosition);

      expect(useEnemyStore.getState().enemies.get(enemyId)?.position).toEqual(newPosition);
    });

    it('should set enemy rotation', () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });

      store.setEnemyRotation(enemyId, Math.PI);

      expect(useEnemyStore.getState().enemies.get(enemyId)?.rotation).toBe(Math.PI);
    });

    it('should record enemy attack time', () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });

      const beforeTime = Date.now();
      store.recordEnemyAttack(enemyId);
      const afterTime = Date.now();

      const lastAttackTime = useEnemyStore.getState().enemies.get(enemyId)?.lastAttackTime;
      expect(lastAttackTime).toBeGreaterThanOrEqual(beforeTime);
      expect(lastAttackTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Getters', () => {
    it('should get enemy by id', () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy('wolf', { x: 5, y: 0, z: 5 });

      const enemy = store.getEnemy(enemyId);

      expect(enemy).toBeDefined();
      expect(enemy?.type).toBe('wolf');
    });

    it('should return undefined for non-existent enemy', () => {
      const store = useEnemyStore.getState();
      const enemy = store.getEnemy('non-existent');

      expect(enemy).toBeUndefined();
    });

    it('should get enemies in range', () => {
      const store = useEnemyStore.getState();
      store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });
      store.spawnEnemy('wolf', { x: 5, y: 0, z: 0 });
      store.spawnEnemy('bandit', { x: 100, y: 0, z: 0 });

      const nearbyEnemies = store.getEnemiesInRange({ x: 0, y: 0, z: 0 }, 10);

      expect(nearbyEnemies).toHaveLength(2);
    });

    it('should not include dead enemies in range search', () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });

      // Kill the enemy - re-fetch state to get updated enemy
      const enemy = useEnemyStore.getState().getEnemy(enemyId)!;
      useEnemyStore.getState().damageEnemy(enemyId, enemy.maxHealth + 100);

      const nearbyEnemies = useEnemyStore.getState().getEnemiesInRange({ x: 0, y: 0, z: 0 }, 10);

      expect(nearbyEnemies).toHaveLength(0);
    });

    it('should get all enemies as array', () => {
      const store = useEnemyStore.getState();
      store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });
      store.spawnEnemy('wolf', { x: 5, y: 0, z: 5 });

      const enemies = store.getEnemiesArray();

      expect(enemies).toHaveLength(2);
      expect(Array.isArray(enemies)).toBe(true);
    });

    it('should get only alive enemies', () => {
      const store = useEnemyStore.getState();
      const slimeId = store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });
      store.spawnEnemy('wolf', { x: 5, y: 0, z: 5 });

      // Kill the slime - re-fetch state to get updated enemy
      const slime = useEnemyStore.getState().getEnemy(slimeId)!;
      useEnemyStore.getState().damageEnemy(slimeId, slime.maxHealth + 100);

      const aliveEnemies = useEnemyStore.getState().getAliveEnemies();

      expect(aliveEnemies).toHaveLength(1);
      expect(aliveEnemies[0].type).toBe('wolf');
    });
  });

  describe('Selectors', () => {
    it('selectSelectedEnemy should return selected enemy', () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });
      store.selectEnemy(enemyId);

      const selectedEnemy = selectSelectedEnemy(useEnemyStore.getState());

      expect(selectedEnemy).toBeDefined();
      expect(selectedEnemy?.id).toBe(enemyId);
    });

    it('selectSelectedEnemy should return null when nothing selected', () => {
      const store = useEnemyStore.getState();
      store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });

      const selectedEnemy = selectSelectedEnemy(useEnemyStore.getState());

      expect(selectedEnemy).toBeNull();
    });

    it('selectEnemyCount should return total enemy count', () => {
      const store = useEnemyStore.getState();
      store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });
      store.spawnEnemy('wolf', { x: 5, y: 0, z: 5 });

      const count = selectEnemyCount(useEnemyStore.getState());

      expect(count).toBe(2);
    });

    it('selectAliveEnemyCount should return only alive enemies', () => {
      const store = useEnemyStore.getState();
      const slimeId = store.spawnEnemy('slime', { x: 0, y: 0, z: 0 });
      store.spawnEnemy('wolf', { x: 5, y: 0, z: 5 });

      // Kill slime - re-fetch state to get updated enemy
      const slime = useEnemyStore.getState().getEnemy(slimeId)!;
      useEnemyStore.getState().damageEnemy(slimeId, slime.maxHealth + 100);

      const aliveCount = selectAliveEnemyCount(useEnemyStore.getState());

      expect(aliveCount).toBe(1);
    });
  });
});

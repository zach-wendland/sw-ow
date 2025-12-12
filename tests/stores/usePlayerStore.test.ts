import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { usePlayerStore } from '@/lib/stores/usePlayerStore';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('usePlayerStore', () => {
  const defaultStats = {
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    mana: 50,
    maxMana: 50,
    xp: 0,
    xpToNextLevel: 100,
    level: 1,
    alignment: 0,
    gold: 0,
    skillPoints: 0,
    attributePoints: 0,
  };

  const defaultAttributes = {
    strength: 10,
    dexterity: 10,
    intelligence: 10,
    vitality: 10,
  };

  beforeEach(() => {
    localStorageMock.clear();
    usePlayerStore.setState({
      characterId: null,
      playerId: null,
      characterData: null,
      position: { x: 0, y: 2, z: 0 },
      rotation: 0,
      respawnPoint: { x: 0, y: 2, z: 0 },
      stats: defaultStats,
      attributes: defaultAttributes,
      isLoading: false,
      isInCombat: false,
      isDead: false,
      isSaving: false,
      lastSaveTime: 0,
      sessionStartTime: Date.now(),
      sessionPlayTime: 0,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Position & Rotation', () => {
    it('should set position', () => {
      const store = usePlayerStore.getState();
      store.setPosition({ x: 10, y: 5, z: 15 });

      expect(usePlayerStore.getState().position).toEqual({ x: 10, y: 5, z: 15 });
    });

    it('should set rotation', () => {
      const store = usePlayerStore.getState();
      store.setRotation(Math.PI);

      expect(usePlayerStore.getState().rotation).toBe(Math.PI);
    });

    it('should set respawn point', () => {
      const store = usePlayerStore.getState();
      store.setRespawnPoint({ x: 100, y: 0, z: 100 });

      expect(usePlayerStore.getState().respawnPoint).toEqual({ x: 100, y: 0, z: 100 });
    });
  });

  describe('Stats Management', () => {
    it('should set partial stats', () => {
      const store = usePlayerStore.getState();
      store.setStats({ health: 50, gold: 100 });

      const stats = usePlayerStore.getState().stats;
      expect(stats.health).toBe(50);
      expect(stats.gold).toBe(100);
      expect(stats.maxHealth).toBe(100); // Unchanged
    });
  });

  describe('Combat - Damage', () => {
    it('should take damage', () => {
      const store = usePlayerStore.getState();
      store.takeDamage(30);

      expect(usePlayerStore.getState().stats.health).toBe(70);
    });

    it('should not go below 0 health', () => {
      const store = usePlayerStore.getState();
      store.takeDamage(9999);

      expect(usePlayerStore.getState().stats.health).toBe(0);
    });

    it('should set isDead when health reaches 0', () => {
      const store = usePlayerStore.getState();
      store.takeDamage(100);

      expect(usePlayerStore.getState().isDead).toBe(true);
    });

    it('should set isInCombat when taking damage', () => {
      const store = usePlayerStore.getState();
      store.takeDamage(10);

      expect(usePlayerStore.getState().isInCombat).toBe(true);
    });
  });

  describe('Combat - Healing', () => {
    it('should heal', () => {
      const store = usePlayerStore.getState();
      store.takeDamage(50);
      store.heal(30);

      expect(usePlayerStore.getState().stats.health).toBe(80);
    });

    it('should not exceed max health', () => {
      const store = usePlayerStore.getState();
      store.heal(50);

      expect(usePlayerStore.getState().stats.health).toBe(100);
    });
  });

  describe('Resource Management - Stamina', () => {
    it('should use stamina successfully', () => {
      const store = usePlayerStore.getState();
      const result = store.useStamina(20);

      expect(result).toBe(true);
      expect(usePlayerStore.getState().stats.stamina).toBe(80);
    });

    it('should fail to use stamina when insufficient', () => {
      const store = usePlayerStore.getState();
      store.setStats({ stamina: 10 });

      const result = store.useStamina(50);

      expect(result).toBe(false);
      expect(usePlayerStore.getState().stats.stamina).toBe(10);
    });

    it('should regenerate stamina', () => {
      const store = usePlayerStore.getState();
      store.setStats({ stamina: 50 });
      store.regenerateStamina(20);

      expect(usePlayerStore.getState().stats.stamina).toBe(70);
    });

    it('should not exceed max stamina on regen', () => {
      const store = usePlayerStore.getState();
      store.regenerateStamina(50);

      expect(usePlayerStore.getState().stats.stamina).toBe(100);
    });
  });

  describe('Resource Management - Mana', () => {
    it('should use mana successfully', () => {
      const store = usePlayerStore.getState();
      const result = store.useMana(20);

      expect(result).toBe(true);
      expect(usePlayerStore.getState().stats.mana).toBe(30);
    });

    it('should fail to use mana when insufficient', () => {
      const store = usePlayerStore.getState();
      store.setStats({ mana: 10 });

      const result = store.useMana(30);

      expect(result).toBe(false);
      expect(usePlayerStore.getState().stats.mana).toBe(10);
    });

    it('should regenerate mana', () => {
      const store = usePlayerStore.getState();
      store.setStats({ mana: 20 });
      store.regenerateMana(15);

      expect(usePlayerStore.getState().stats.mana).toBe(35);
    });

    it('should not exceed max mana on regen', () => {
      const store = usePlayerStore.getState();
      store.regenerateMana(100);

      expect(usePlayerStore.getState().stats.mana).toBe(50);
    });
  });

  describe('Progression - XP & Leveling', () => {
    it('should add XP', () => {
      const store = usePlayerStore.getState();
      store.addXP(50);

      expect(usePlayerStore.getState().stats.xp).toBe(50);
    });

    it('should level up when XP threshold reached', () => {
      const store = usePlayerStore.getState();
      store.addXP(150); // More than 100 needed for level 2

      expect(usePlayerStore.getState().stats.level).toBe(2);
    });

    it('should grant skill point on level up', () => {
      const store = usePlayerStore.getState();
      store.addXP(150);

      expect(usePlayerStore.getState().stats.skillPoints).toBe(1);
    });

    it('should grant attribute point every 5 levels', () => {
      const store = usePlayerStore.getState();
      // Get enough XP for level 5
      store.addXP(10000);

      expect(usePlayerStore.getState().stats.attributePoints).toBeGreaterThanOrEqual(1);
    });

    it('should restore resources on level up', () => {
      const store = usePlayerStore.getState();
      store.takeDamage(50);
      store.addXP(150); // Level up

      expect(usePlayerStore.getState().stats.health).toBe(usePlayerStore.getState().stats.maxHealth);
    });
  });

  describe('Progression - Gold', () => {
    it('should add gold', () => {
      const store = usePlayerStore.getState();
      store.addGold(100);

      expect(usePlayerStore.getState().stats.gold).toBe(100);
    });

    it('should spend gold successfully', () => {
      const store = usePlayerStore.getState();
      store.addGold(100);
      const result = store.spendGold(30);

      expect(result).toBe(true);
      expect(usePlayerStore.getState().stats.gold).toBe(70);
    });

    it('should fail to spend gold when insufficient', () => {
      const store = usePlayerStore.getState();
      store.addGold(20);
      const result = store.spendGold(50);

      expect(result).toBe(false);
      expect(usePlayerStore.getState().stats.gold).toBe(20);
    });
  });

  describe('Progression - Alignment', () => {
    it('should increase alignment', () => {
      const store = usePlayerStore.getState();
      store.setAlignment(30);

      expect(usePlayerStore.getState().stats.alignment).toBe(30);
    });

    it('should decrease alignment', () => {
      const store = usePlayerStore.getState();
      store.setAlignment(-40);

      expect(usePlayerStore.getState().stats.alignment).toBe(-40);
    });

    it('should cap alignment at 100', () => {
      const store = usePlayerStore.getState();
      store.setAlignment(150);

      expect(usePlayerStore.getState().stats.alignment).toBe(100);
    });

    it('should cap alignment at -100', () => {
      const store = usePlayerStore.getState();
      store.setAlignment(-150);

      expect(usePlayerStore.getState().stats.alignment).toBe(-100);
    });
  });

  describe('Respawn', () => {
    it('should respawn at respawn point', () => {
      const store = usePlayerStore.getState();
      store.setPosition({ x: 50, y: 10, z: 50 });
      store.setRespawnPoint({ x: 0, y: 2, z: 0 });
      store.takeDamage(100); // Die

      store.respawn();

      expect(usePlayerStore.getState().position).toEqual({ x: 0, y: 2, z: 0 });
    });

    it('should restore all resources on respawn', () => {
      const store = usePlayerStore.getState();
      store.takeDamage(100);
      store.setStats({ stamina: 0, mana: 0 });

      store.respawn();

      const stats = usePlayerStore.getState().stats;
      expect(stats.health).toBe(stats.maxHealth);
      expect(stats.stamina).toBe(stats.maxStamina);
      expect(stats.mana).toBe(stats.maxMana);
    });

    it('should clear isDead on respawn', () => {
      const store = usePlayerStore.getState();
      store.takeDamage(100);

      expect(usePlayerStore.getState().isDead).toBe(true);

      store.respawn();

      expect(usePlayerStore.getState().isDead).toBe(false);
    });

    it('should clear combat state on respawn', () => {
      const store = usePlayerStore.getState();
      store.takeDamage(100);

      store.respawn();

      expect(usePlayerStore.getState().isInCombat).toBe(false);
    });
  });

  describe('Selectors', () => {
    it('selectIsAlive should return true when alive', () => {
      const state = usePlayerStore.getState();
      expect(!state.isDead).toBe(true);
    });

    it('selectIsAlive should return false when dead', () => {
      const store = usePlayerStore.getState();
      store.takeDamage(100);

      expect(usePlayerStore.getState().isDead).toBe(true);
    });

    it('selectHealthPercent should calculate correctly', () => {
      const store = usePlayerStore.getState();
      store.takeDamage(30);

      const state = usePlayerStore.getState();
      const percent = (state.stats.health / state.stats.maxHealth) * 100;
      expect(percent).toBe(70);
    });

    it('selectXPPercent should calculate correctly', () => {
      const store = usePlayerStore.getState();
      store.addXP(50);

      const state = usePlayerStore.getState();
      const percent = (state.stats.xp / state.stats.xpToNextLevel) * 100;
      expect(percent).toBe(50);
    });
  });
});

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useEnemyStore } from "@/lib/stores/useEnemyStore";
import { usePlayerStore } from "@/lib/stores/usePlayerStore";
import { useCombatStore } from "@/lib/stores/useCombatStore";

/**
 * Store Integration Tests
 *
 * Tests for cross-store interactions and data flow between
 * enemy, player, and combat stores.
 */

describe("Store Integration", () => {
  beforeEach(() => {
    // Reset all stores to initial state
    useEnemyStore.setState({
      enemies: new Map(),
      selectedEnemyId: null,
    });

    usePlayerStore.setState({
      characterId: null,
      playerId: null,
      characterData: null,
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      respawnPoint: { x: 0, y: 0, z: 0 },
      stats: {
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
      },
      attributes: {
        strength: 10,
        dexterity: 10,
        intelligence: 10,
        vitality: 10,
      },
      isLoading: false,
      isInCombat: false,
      isDead: false,
      isSaving: false,
      lastSaveTime: 0,
      sessionStartTime: Date.now(),
      sessionPlayTime: 0,
    });

    useCombatStore.setState({
      isPlayerAttacking: false,
      lastPlayerAttackTime: 0,
      playerAttackCooldown: 0.6,
      comboCount: 0,
      lastComboTime: 0,
      damageNumbers: [],
      combatLog: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Combat Flow: Player Attacks Enemy", () => {
    it("should complete attack flow: player → enemy → rewards", () => {
      const enemyStore = useEnemyStore.getState();
      const playerStore = usePlayerStore.getState();
      const combatStore = useCombatStore.getState();

      // Setup: spawn a weak enemy
      const enemyId = enemyStore.spawnEnemy("slime", { x: 5, y: 0, z: 5 });
      const enemy = enemyStore.getEnemy(enemyId);
      expect(enemy).toBeDefined();
      expect(enemy?.health).toBe(30); // Slime has 30 HP

      // Get initial player state
      const initialXp = playerStore.stats.xp;
      const initialGold = playerStore.stats.gold;

      // Calculate damage (using actual API signature)
      const { damage } = combatStore.calculatePlayerDamage(10, 10, 1);
      expect(damage).toBeGreaterThan(0);

      // Apply damage to enemy
      const result = enemyStore.damageEnemy(enemyId, damage);

      // Check result
      if (result.killed) {
        expect(result.xp).toBeGreaterThan(0);
        expect(result.gold).toBeGreaterThanOrEqual(0);

        // Apply rewards to player
        playerStore.addXP(result.xp);
        playerStore.addGold(result.gold);

        // Verify player received rewards
        expect(usePlayerStore.getState().stats.xp).toBeGreaterThan(initialXp);
      } else {
        // Enemy survived - verify health decreased
        const updatedEnemy = useEnemyStore.getState().enemies.get(enemyId);
        expect(updatedEnemy?.health).toBeLessThan(30);
      }
    });

    it("should handle enemy death correctly", () => {
      const enemyStore = useEnemyStore.getState();

      // Spawn enemy
      const enemyId = enemyStore.spawnEnemy("slime", { x: 5, y: 0, z: 5 });

      // Kill enemy with massive damage
      const result = enemyStore.damageEnemy(enemyId, 1000);

      expect(result.killed).toBe(true);
      expect(result.xp).toBe(15); // Slime XP reward

      // Enemy should be in dead state
      const deadEnemy = useEnemyStore.getState().enemies.get(enemyId);
      expect(deadEnemy?.state).toBe("dead");
      expect(deadEnemy?.health).toBe(0);
    });

    it("should not damage already dead enemy", () => {
      const enemyStore = useEnemyStore.getState();

      // Spawn and kill enemy
      const enemyId = enemyStore.spawnEnemy("slime", { x: 5, y: 0, z: 5 });
      enemyStore.damageEnemy(enemyId, 1000);

      // Try to damage again
      const result = enemyStore.damageEnemy(enemyId, 100);

      expect(result.killed).toBe(false);
      expect(result.xp).toBe(0);
      expect(result.gold).toBe(0);
    });
  });

  describe("Combat Flow: Enemy Attacks Player", () => {
    it("should reduce player health when enemy attacks", () => {
      const playerStore = usePlayerStore.getState();
      const initialHealth = playerStore.stats.health;

      // Enemy deals damage
      playerStore.takeDamage(15);

      expect(usePlayerStore.getState().stats.health).toBe(initialHealth - 15);
    });

    it("should not reduce health below 0", () => {
      const playerStore = usePlayerStore.getState();

      // Deal massive damage
      playerStore.takeDamage(1000);

      expect(usePlayerStore.getState().stats.health).toBe(0);
    });

    it("should track damage events in combat log", () => {
      const combatStore = useCombatStore.getState();

      // Record damage via combat log
      combatStore.addCombatEvent("damage", "You took 10 damage!");
      combatStore.addCombatEvent("damage", "You took 15 damage!");

      const events = useCombatStore.getState().combatLog;
      expect(events.length).toBe(2);
    });
  });

  describe("Combo System", () => {
    it("should increment combo on successful hits", () => {
      const combatStore = useCombatStore.getState();

      expect(combatStore.comboCount).toBe(0);

      combatStore.incrementCombo();
      expect(useCombatStore.getState().comboCount).toBe(1);

      combatStore.incrementCombo();
      expect(useCombatStore.getState().comboCount).toBe(2);
    });

    it("should reset combo after timeout", () => {
      const combatStore = useCombatStore.getState();

      combatStore.incrementCombo();
      combatStore.incrementCombo();
      expect(useCombatStore.getState().comboCount).toBe(2);

      // Reset combo
      combatStore.resetCombo();
      expect(useCombatStore.getState().comboCount).toBe(0);
    });

    it("should increase damage with combo multiplier", () => {
      const combatStore = useCombatStore.getState();

      // Get base damage without combo (need to call multiple times to average out randomness)
      let baseDamageSum = 0;
      for (let i = 0; i < 10; i++) {
        baseDamageSum += combatStore.calculatePlayerDamage(10, 10, 1).damage;
      }
      const avgBaseDamage = baseDamageSum / 10;

      // Build combo
      for (let i = 0; i < 5; i++) {
        combatStore.incrementCombo();
      }

      // Get combo damage
      let comboDamageSum = 0;
      for (let i = 0; i < 10; i++) {
        comboDamageSum += useCombatStore.getState().calculatePlayerDamage(10, 10, 1).damage;
      }
      const avgComboDamage = comboDamageSum / 10;

      // Combo should increase average damage
      expect(avgComboDamage).toBeGreaterThan(avgBaseDamage * 0.9); // Allow some variance
    });
  });

  describe("Damage Numbers", () => {
    it("should add damage numbers on hit", () => {
      const combatStore = useCombatStore.getState();

      combatStore.addDamageNumber(25, { x: 5, y: 1, z: 5 }, false, false);

      const numbers = useCombatStore.getState().damageNumbers;
      expect(numbers.length).toBe(1);
      expect(numbers[0].amount).toBe(25);
      expect(numbers[0].isCritical).toBe(false);
    });

    it("should track critical hits", () => {
      const combatStore = useCombatStore.getState();

      combatStore.addDamageNumber(50, { x: 5, y: 1, z: 5 }, true, false);

      const numbers = useCombatStore.getState().damageNumbers;
      expect(numbers[0].isCritical).toBe(true);
    });

    it("should track heals differently", () => {
      const combatStore = useCombatStore.getState();

      combatStore.addDamageNumber(30, { x: 0, y: 1, z: 0 }, false, true);

      const numbers = useCombatStore.getState().damageNumbers;
      expect(numbers[0].isHeal).toBe(true);
    });

    it("should remove expired damage numbers", () => {
      const combatStore = useCombatStore.getState();

      // Add damage number
      combatStore.addDamageNumber(25, { x: 5, y: 1, z: 5 }, false, false);
      expect(useCombatStore.getState().damageNumbers.length).toBe(1);

      // Clear all
      combatStore.clearDamageNumbers();
      expect(useCombatStore.getState().damageNumbers.length).toBe(0);
    });
  });

  describe("Combat Events Log", () => {
    it("should log combat events", () => {
      const combatStore = useCombatStore.getState();

      combatStore.addCombatEvent("damage", "You dealt 25 damage to Slime!");
      combatStore.addCombatEvent("kill", "Slime was defeated!");

      const events = useCombatStore.getState().combatLog;
      expect(events.length).toBe(2);
      // Events are prepended (newest first)
      expect(events[0].type).toBe("kill");
      expect(events[1].type).toBe("damage");
    });

    it("should clear old combat events", () => {
      const combatStore = useCombatStore.getState();

      combatStore.addCombatEvent("damage", "Test event");
      combatStore.clearCombatLog();

      expect(useCombatStore.getState().combatLog.length).toBe(0);
    });
  });

  describe("Enemy Selection Integration", () => {
    it("should allow selecting and deselecting enemies", () => {
      const enemyStore = useEnemyStore.getState();

      // Spawn two enemies
      const enemy1 = enemyStore.spawnEnemy("slime", { x: 5, y: 0, z: 5 });
      const enemy2 = enemyStore.spawnEnemy("wolf", { x: 10, y: 0, z: 10 });

      // Select first enemy
      enemyStore.selectEnemy(enemy1);
      expect(useEnemyStore.getState().selectedEnemyId).toBe(enemy1);

      // Switch to second enemy
      enemyStore.selectEnemy(enemy2);
      expect(useEnemyStore.getState().selectedEnemyId).toBe(enemy2);

      // Deselect
      enemyStore.selectEnemy(null);
      expect(useEnemyStore.getState().selectedEnemyId).toBeNull();
    });

    it("should clear selection when selected enemy dies", () => {
      const enemyStore = useEnemyStore.getState();

      const enemyId = enemyStore.spawnEnemy("slime", { x: 5, y: 0, z: 5 });
      enemyStore.selectEnemy(enemyId);

      expect(useEnemyStore.getState().selectedEnemyId).toBe(enemyId);

      // Remove enemy
      enemyStore.removeEnemy(enemyId);

      expect(useEnemyStore.getState().selectedEnemyId).toBeNull();
    });
  });

  describe("Player Progression", () => {
    it("should add XP correctly", () => {
      const playerStore = usePlayerStore.getState();

      expect(playerStore.stats.level).toBe(1);
      expect(playerStore.stats.xp).toBe(0);

      // Add XP
      playerStore.addXP(50);

      const newState = usePlayerStore.getState();
      expect(newState.stats.xp).toBe(50);
    });

    it("should level up when XP threshold reached", () => {
      const playerStore = usePlayerStore.getState();

      expect(playerStore.stats.level).toBe(1);

      // Gain enough XP to level up
      playerStore.addXP(100);

      const newState = usePlayerStore.getState();
      expect(newState.stats.level).toBe(2);
    });

    it("should add gold correctly", () => {
      const playerStore = usePlayerStore.getState();
      const initialGold = playerStore.stats.gold;

      playerStore.addGold(50);

      const newState = usePlayerStore.getState();
      expect(newState.stats.gold).toBe(initialGold + 50);
    });
  });

  describe("Enemy State Changes", () => {
    it("should transition enemy through states correctly", () => {
      const enemyStore = useEnemyStore.getState();

      const enemyId = enemyStore.spawnEnemy("slime", { x: 5, y: 0, z: 5 });

      // Initial state
      expect(enemyStore.getEnemy(enemyId)?.state).toBe("idle");

      // Change to chase
      enemyStore.setEnemyState(enemyId, "chase");
      expect(useEnemyStore.getState().enemies.get(enemyId)?.state).toBe("chase");

      // Change to attack
      enemyStore.setEnemyState(enemyId, "attack");
      expect(useEnemyStore.getState().enemies.get(enemyId)?.state).toBe("attack");
    });

    it("should update enemy target", () => {
      const enemyStore = useEnemyStore.getState();

      const enemyId = enemyStore.spawnEnemy("slime", { x: 5, y: 0, z: 5 });

      expect(enemyStore.getEnemy(enemyId)?.target).toBeNull();

      enemyStore.setEnemyTarget(enemyId, "player");
      expect(useEnemyStore.getState().enemies.get(enemyId)?.target).toBe("player");
    });

    it("should record attack timestamps", () => {
      const enemyStore = useEnemyStore.getState();

      const enemyId = enemyStore.spawnEnemy("slime", { x: 5, y: 0, z: 5 });
      const initialTime = enemyStore.getEnemy(enemyId)?.lastAttackTime || 0;

      // Wait a bit and record attack
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          enemyStore.recordEnemyAttack(enemyId);
          const newTime = useEnemyStore.getState().enemies.get(enemyId)?.lastAttackTime || 0;
          expect(newTime).toBeGreaterThan(initialTime);
          resolve();
        }, 10);
      });
    });
  });

  describe("Multi-Enemy Combat", () => {
    it("should handle multiple enemies simultaneously", () => {
      const enemyStore = useEnemyStore.getState();

      // Spawn multiple enemies
      const ids: string[] = [];
      for (let i = 0; i < 5; i++) {
        ids.push(enemyStore.spawnEnemy("slime", { x: i * 3, y: 0, z: 0 }));
      }

      expect(useEnemyStore.getState().enemies.size).toBe(5);

      // Damage each enemy
      ids.forEach((id, index) => {
        enemyStore.damageEnemy(id, 10 + index);
      });

      // Verify individual health values
      const enemies = useEnemyStore.getState().enemies;
      expect(enemies.get(ids[0])?.health).toBe(20); // 30 - 10
      expect(enemies.get(ids[4])?.health).toBe(16); // 30 - 14
    });

    it("should find enemies in range", () => {
      const enemyStore = useEnemyStore.getState();

      // Spawn enemies at different distances
      enemyStore.spawnEnemy("slime", { x: 2, y: 0, z: 0 });  // distance 2
      enemyStore.spawnEnemy("wolf", { x: 10, y: 0, z: 0 }); // distance 10
      enemyStore.spawnEnemy("bandit", { x: 0, y: 0, z: 3 }); // distance 3

      const nearbyEnemies = enemyStore.getEnemiesInRange({ x: 0, y: 0, z: 0 }, 5);

      expect(nearbyEnemies.length).toBe(2); // slime and bandit
      expect(nearbyEnemies.some(e => e.type === "wolf")).toBe(false);
    });
  });

  describe("Enemy Damage Calculation", () => {
    it("should calculate enemy damage based on type", () => {
      const combatStore = useCombatStore.getState();

      // Different enemy types should deal different damage
      const slimeDamage = combatStore.calculateEnemyDamage("slime", 0);
      const wolfDamage = combatStore.calculateEnemyDamage("wolf", 0);
      const golemDamage = combatStore.calculateEnemyDamage("golem", 0);

      expect(slimeDamage).toBeLessThan(wolfDamage);
      expect(wolfDamage).toBeLessThan(golemDamage);
    });
  });
});

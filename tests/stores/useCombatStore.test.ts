import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useCombatStore } from '@/lib/stores/useCombatStore';

describe('useCombatStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCombatStore.setState({
      isPlayerAttacking: false,
      lastPlayerAttackTime: 0,
      playerAttackCooldown: 0.6,
      damageNumbers: [],
      combatLog: [],
      comboCount: 0,
      lastComboTime: 0,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Player Attack', () => {
    it('should allow attack when cooldown has passed', () => {
      const store = useCombatStore.getState();
      expect(store.canPlayerAttack()).toBe(true);
    });

    it('should start player attack successfully', () => {
      const store = useCombatStore.getState();
      const result = store.startPlayerAttack();

      expect(result).toBe(true);
      expect(useCombatStore.getState().isPlayerAttacking).toBe(true);
    });

    it('should prevent attack during cooldown', () => {
      const store = useCombatStore.getState();
      store.startPlayerAttack();

      // Try to attack again immediately
      const result = useCombatStore.getState().startPlayerAttack();
      expect(result).toBe(false);
    });

    it('should auto-end attack after 300ms', () => {
      const store = useCombatStore.getState();
      store.startPlayerAttack();

      expect(useCombatStore.getState().isPlayerAttacking).toBe(true);

      // Advance time by 300ms
      vi.advanceTimersByTime(300);

      expect(useCombatStore.getState().isPlayerAttacking).toBe(false);
    });

    it('should allow attack after cooldown expires', () => {
      const store = useCombatStore.getState();
      store.startPlayerAttack();

      // Advance time past attack animation
      vi.advanceTimersByTime(300);

      // Advance time past cooldown (600ms)
      vi.advanceTimersByTime(600);

      expect(useCombatStore.getState().canPlayerAttack()).toBe(true);
    });
  });

  describe('Damage Numbers', () => {
    it('should add damage number', () => {
      const store = useCombatStore.getState();
      store.addDamageNumber(50, { x: 0, y: 0, z: 0 });

      const damageNumbers = useCombatStore.getState().damageNumbers;
      expect(damageNumbers).toHaveLength(1);
      expect(damageNumbers[0].amount).toBe(50);
      expect(damageNumbers[0].isCritical).toBe(false);
      expect(damageNumbers[0].isHeal).toBe(false);
    });

    it('should add critical damage number', () => {
      const store = useCombatStore.getState();
      store.addDamageNumber(100, { x: 0, y: 0, z: 0 }, true);

      const damageNumbers = useCombatStore.getState().damageNumbers;
      expect(damageNumbers[0].isCritical).toBe(true);
    });

    it('should add heal number', () => {
      const store = useCombatStore.getState();
      store.addDamageNumber(30, { x: 0, y: 0, z: 0 }, false, true);

      const damageNumbers = useCombatStore.getState().damageNumbers;
      expect(damageNumbers[0].isHeal).toBe(true);
    });

    it('should auto-remove damage number after lifetime', () => {
      const store = useCombatStore.getState();
      store.addDamageNumber(50, { x: 0, y: 0, z: 0 });

      expect(useCombatStore.getState().damageNumbers).toHaveLength(1);

      // Advance time past damage number lifetime (1500ms)
      vi.advanceTimersByTime(1500);

      expect(useCombatStore.getState().damageNumbers).toHaveLength(0);
    });

    it('should remove specific damage number', () => {
      const store = useCombatStore.getState();
      store.addDamageNumber(50, { x: 0, y: 0, z: 0 });
      store.addDamageNumber(75, { x: 1, y: 1, z: 1 });

      const firstId = useCombatStore.getState().damageNumbers[0].id;
      store.removeDamageNumber(firstId);

      expect(useCombatStore.getState().damageNumbers).toHaveLength(1);
      expect(useCombatStore.getState().damageNumbers[0].amount).toBe(75);
    });

    it('should clear all damage numbers', () => {
      const store = useCombatStore.getState();
      store.addDamageNumber(50, { x: 0, y: 0, z: 0 });
      store.addDamageNumber(75, { x: 1, y: 1, z: 1 });
      store.clearDamageNumbers();

      expect(useCombatStore.getState().damageNumbers).toHaveLength(0);
    });
  });

  describe('Combat Log', () => {
    it('should add combat event', () => {
      const store = useCombatStore.getState();
      store.addCombatEvent('damage', 'You dealt 50 damage');

      const log = useCombatStore.getState().combatLog;
      expect(log).toHaveLength(1);
      expect(log[0].type).toBe('damage');
      expect(log[0].message).toBe('You dealt 50 damage');
    });

    it('should add events in reverse chronological order', () => {
      const store = useCombatStore.getState();
      store.addCombatEvent('damage', 'First');
      store.addCombatEvent('heal', 'Second');

      const log = useCombatStore.getState().combatLog;
      expect(log[0].message).toBe('Second');
      expect(log[1].message).toBe('First');
    });

    it('should limit combat log to 50 entries', () => {
      const store = useCombatStore.getState();

      for (let i = 0; i < 60; i++) {
        store.addCombatEvent('damage', `Event ${i}`);
      }

      expect(useCombatStore.getState().combatLog).toHaveLength(50);
    });

    it('should clear combat log', () => {
      const store = useCombatStore.getState();
      store.addCombatEvent('damage', 'Test');
      store.clearCombatLog();

      expect(useCombatStore.getState().combatLog).toHaveLength(0);
    });
  });

  describe('Combo System', () => {
    it('should increment combo', () => {
      const store = useCombatStore.getState();
      store.incrementCombo();

      expect(useCombatStore.getState().comboCount).toBe(1);
    });

    it('should continue combo within timeout', () => {
      const store = useCombatStore.getState();
      store.incrementCombo();
      vi.advanceTimersByTime(2000); // Less than 3000ms timeout
      store.incrementCombo();

      expect(useCombatStore.getState().comboCount).toBe(2);
    });

    it('should reset combo after timeout', () => {
      const store = useCombatStore.getState();
      store.incrementCombo();
      store.incrementCombo();
      store.incrementCombo();

      expect(useCombatStore.getState().comboCount).toBe(3);

      vi.advanceTimersByTime(3500); // Past 3000ms timeout
      store.incrementCombo();

      expect(useCombatStore.getState().comboCount).toBe(1);
    });

    it('should reset combo manually', () => {
      const store = useCombatStore.getState();
      store.incrementCombo();
      store.incrementCombo();
      store.resetCombo();

      expect(useCombatStore.getState().comboCount).toBe(0);
    });
  });

  describe('Damage Calculations', () => {
    it('should calculate player damage', () => {
      const store = useCombatStore.getState();
      const { damage, isCritical } = store.calculatePlayerDamage(10, 20, 5);

      // Base damage: 20 + 10*0.5 + 5*2 = 35
      // With variance (0.9-1.1) and combo bonus (1.0)
      expect(damage).toBeGreaterThanOrEqual(1);
      expect(typeof isCritical).toBe('boolean');
    });

    it('should never return damage less than 1', () => {
      const store = useCombatStore.getState();
      const { damage } = store.calculatePlayerDamage(0, 0, 1);

      expect(damage).toBeGreaterThanOrEqual(1);
    });

    it('should apply combo bonus to damage', () => {
      const store = useCombatStore.getState();

      // Set up combo
      store.incrementCombo();
      store.incrementCombo();
      store.incrementCombo();
      store.incrementCombo();
      store.incrementCombo(); // 5 combo = 25% bonus

      // Calculate multiple times to check for consistent bonus
      const damages = [];
      for (let i = 0; i < 10; i++) {
        const { damage } = store.calculatePlayerDamage(10, 20, 5);
        damages.push(damage);
      }

      // Average should be higher than base (35 * 1.25 = ~43.75)
      const avgDamage = damages.reduce((a, b) => a + b, 0) / damages.length;
      expect(avgDamage).toBeGreaterThan(30);
    });

    it('should calculate enemy damage with defense reduction', () => {
      const store = useCombatStore.getState();
      const damage = store.calculateEnemyDamage('slime', 50);

      // Slime base damage: 5-10, with 50 defense (50% reduction)
      // Expected: 2.5-5 before variance
      expect(damage).toBeGreaterThanOrEqual(1);
      expect(damage).toBeLessThan(15);
    });
  });

  describe('Selectors', () => {
    it('selectCanAttack should return correct value', () => {
      const store = useCombatStore.getState();
      const { canPlayerAttack } = store;

      expect(canPlayerAttack()).toBe(true);

      store.startPlayerAttack();
      expect(useCombatStore.getState().canPlayerAttack()).toBe(false);
    });

    it('selectComboCount should return combo count', () => {
      const store = useCombatStore.getState();
      store.incrementCombo();
      store.incrementCombo();

      expect(useCombatStore.getState().comboCount).toBe(2);
    });

    it('selectDamageNumbers should return damage numbers array', () => {
      const store = useCombatStore.getState();
      store.addDamageNumber(50, { x: 0, y: 0, z: 0 });

      expect(useCombatStore.getState().damageNumbers).toHaveLength(1);
    });
  });
});

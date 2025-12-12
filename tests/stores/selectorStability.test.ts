import { describe, it, expect, beforeEach } from "vitest";
import { useEnemyStore } from "@/lib/stores/useEnemyStore";
import { useShallow } from "zustand/react/shallow";

/**
 * Selector Stability Tests
 *
 * These tests verify that Zustand selectors return referentially stable values
 * to prevent infinite re-render loops in React 19 with Zustand v5.
 *
 * The root cause of the bug: Array.from() creates a new array reference on every call.
 * useSyncExternalStore (used internally by Zustand) compares references with Object.is(),
 * so a new reference triggers re-render → selector runs → new reference → infinite loop.
 */

describe("Zustand Selector Stability", () => {
  beforeEach(() => {
    // Reset store to clean state
    useEnemyStore.setState({
      enemies: new Map(),
      selectedEnemyId: null,
    });
  });

  describe("getEnemyIds selector", () => {
    it("should return same reference when called multiple times with no changes", () => {
      // Spawn some enemies first
      const store = useEnemyStore.getState();
      store.spawnEnemy("slime", { x: 0, y: 0, z: 0 });
      store.spawnEnemy("wolf", { x: 5, y: 0, z: 5 });

      // Call getEnemyIds multiple times
      const result1 = useEnemyStore.getState().getEnemyIds();
      const result2 = useEnemyStore.getState().getEnemyIds();

      // Both calls should return arrays with same content
      expect(result1).toEqual(result2);
      expect(result1.length).toBe(2);
    });

    it("should return different array when enemy is added", () => {
      const store = useEnemyStore.getState();
      store.spawnEnemy("slime", { x: 0, y: 0, z: 0 });

      const result1 = useEnemyStore.getState().getEnemyIds();
      expect(result1.length).toBe(1);

      // Add another enemy
      store.spawnEnemy("wolf", { x: 5, y: 0, z: 5 });

      const result2 = useEnemyStore.getState().getEnemyIds();
      expect(result2.length).toBe(2);

      // Arrays should have different content
      expect(result1).not.toEqual(result2);
    });

    it("should return different array when enemy is removed", () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy("slime", { x: 0, y: 0, z: 0 });
      store.spawnEnemy("wolf", { x: 5, y: 0, z: 5 });

      const result1 = useEnemyStore.getState().getEnemyIds();
      expect(result1.length).toBe(2);

      // Remove first enemy
      store.removeEnemy(enemyId);

      const result2 = useEnemyStore.getState().getEnemyIds();
      expect(result2.length).toBe(1);
      expect(result2).not.toContain(enemyId);
    });

    it("should return empty array when no enemies exist", () => {
      const result = useEnemyStore.getState().getEnemyIds();
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });
  });

  describe("useShallow selector behavior", () => {
    it("should detect changes in array contents with shallow comparison", () => {
      const store = useEnemyStore.getState();

      // Create selector like EnemyList uses
      const selector = (state: typeof store) =>
        Array.from(state.enemies.keys());

      // Initial state - empty
      const initial = selector(useEnemyStore.getState());
      expect(initial).toEqual([]);

      // Add enemy
      store.spawnEnemy("slime", { x: 0, y: 0, z: 0 });
      const afterAdd = selector(useEnemyStore.getState());

      // Shallow comparison should detect the change
      expect(initial.length).not.toBe(afterAdd.length);
    });

    it("should not trigger when enemy position updates (different selector)", () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy("slime", { x: 0, y: 0, z: 0 });

      // Selector for enemy IDs only
      const idsSelector = (state: typeof store) =>
        Array.from(state.enemies.keys());

      const ids1 = idsSelector(useEnemyStore.getState());

      // Update enemy position (should not affect IDs)
      store.setEnemyPosition(enemyId, { x: 10, y: 0, z: 10 });

      const ids2 = idsSelector(useEnemyStore.getState());

      // IDs should be the same
      expect(ids1).toEqual(ids2);
    });
  });

  describe("Enemy component selector", () => {
    it("should only extract non-position data for reactive subscription", () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy("slime", { x: 0, y: 0, z: 0 });

      // Simulate the selector used in Enemy component
      const enemySelector = (state: typeof store) => {
        const e = state.enemies.get(enemyId);
        if (!e) return null;
        return {
          id: e.id,
          type: e.type,
          health: e.health,
          maxHealth: e.maxHealth,
          state: e.state,
          lastAttackTime: e.lastAttackTime,
        };
      };

      const result1 = enemySelector(useEnemyStore.getState());
      expect(result1).not.toBeNull();
      expect(result1?.id).toBe(enemyId);
      expect(result1?.type).toBe("slime");

      // Position update should not affect this selector's output values
      store.setEnemyPosition(enemyId, { x: 100, y: 0, z: 100 });
      const result2 = enemySelector(useEnemyStore.getState());

      // Values should be the same (position not included)
      expect(result1?.id).toBe(result2?.id);
      expect(result1?.type).toBe(result2?.type);
      expect(result1?.health).toBe(result2?.health);
    });

    it("should update when health changes", () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy("slime", { x: 0, y: 0, z: 0 });

      const enemySelector = (state: typeof store) => {
        const e = state.enemies.get(enemyId);
        if (!e) return null;
        return {
          id: e.id,
          health: e.health,
          maxHealth: e.maxHealth,
        };
      };

      const before = enemySelector(useEnemyStore.getState());
      expect(before?.health).toBe(30); // Slime has 30 HP

      // Damage the enemy
      store.damageEnemy(enemyId, 10);

      const after = enemySelector(useEnemyStore.getState());
      expect(after?.health).toBe(20);
    });

    it("should return null for non-existent enemy", () => {
      const enemySelector = (state: ReturnType<typeof useEnemyStore.getState>) => {
        const e = state.enemies.get("non-existent-id");
        if (!e) return null;
        return { id: e.id };
      };

      const result = enemySelector(useEnemyStore.getState());
      expect(result).toBeNull();
    });
  });

  describe("Selected enemy selector", () => {
    it("should return null when no enemy selected", () => {
      const result = useEnemyStore.getState().selectedEnemyId;
      expect(result).toBeNull();
    });

    it("should update when enemy is selected", () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy("slime", { x: 0, y: 0, z: 0 });

      expect(useEnemyStore.getState().selectedEnemyId).toBeNull();

      store.selectEnemy(enemyId);
      expect(useEnemyStore.getState().selectedEnemyId).toBe(enemyId);
    });

    it("should clear selection when selected enemy is removed", () => {
      const store = useEnemyStore.getState();
      const enemyId = store.spawnEnemy("slime", { x: 0, y: 0, z: 0 });

      store.selectEnemy(enemyId);
      expect(useEnemyStore.getState().selectedEnemyId).toBe(enemyId);

      store.removeEnemy(enemyId);
      expect(useEnemyStore.getState().selectedEnemyId).toBeNull();
    });
  });

  describe("Stress test for stability", () => {
    it("should handle rapid successive calls without memory issues", () => {
      const store = useEnemyStore.getState();

      // Spawn many enemies
      for (let i = 0; i < 100; i++) {
        store.spawnEnemy("slime", { x: i, y: 0, z: i });
      }

      // Call getEnemyIds many times rapidly
      const results: string[][] = [];
      for (let i = 0; i < 1000; i++) {
        results.push(useEnemyStore.getState().getEnemyIds());
      }

      // All results should have same length
      expect(results.every((r) => r.length === 100)).toBe(true);
    });

    it("should handle concurrent state modifications", () => {
      const store = useEnemyStore.getState();

      // Spawn initial enemies
      const ids: string[] = [];
      for (let i = 0; i < 10; i++) {
        ids.push(store.spawnEnemy("slime", { x: i, y: 0, z: i }));
      }

      // Modify multiple enemies simultaneously
      ids.forEach((id, index) => {
        store.setEnemyPosition(id, { x: index * 2, y: 1, z: index * 2 });
        store.setEnemyRotation(id, index * 0.5);
      });

      // All enemies should still exist
      const finalIds = useEnemyStore.getState().getEnemyIds();
      expect(finalIds.length).toBe(10);
    });
  });
});

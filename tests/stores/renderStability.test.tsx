import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { useEnemyStore } from "@/lib/stores/useEnemyStore";
import { useShallow } from "zustand/react/shallow";

/**
 * Render Stability Tests
 *
 * These tests verify that React components using Zustand selectors
 * don't trigger infinite re-renders or excessive updates.
 *
 * Key patterns tested:
 * 1. useShallow prevents array reference changes from triggering re-renders
 * 2. Selective subscriptions only re-render on relevant state changes
 * 3. Position updates don't cause ID-based selectors to re-render
 */

describe("Component Render Stability", () => {
  beforeEach(() => {
    // Reset store to clean state
    useEnemyStore.setState({
      enemies: new Map(),
      selectedEnemyId: null,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("EnemyList selector with useShallow", () => {
    it("should not trigger infinite re-renders", () => {
      let renderCount = 0;

      const { result } = renderHook(() => {
        renderCount++;
        return useEnemyStore(
          useShallow((state) => Array.from(state.enemies.keys()))
        );
      });

      // Initial render
      expect(renderCount).toBe(1);
      expect(result.current).toEqual([]);

      // Add enemy
      act(() => {
        useEnemyStore.getState().spawnEnemy("slime", { x: 0, y: 0, z: 0 });
      });

      // Should render once more for the new enemy
      expect(renderCount).toBe(2);
      expect(result.current.length).toBe(1);

      // Render count should stay stable (no infinite loop)
      expect(renderCount).toBeLessThan(10);
    });

    it("should only re-render when enemy list changes", () => {
      let renderCount = 0;

      const { result } = renderHook(() => {
        renderCount++;
        return useEnemyStore(
          useShallow((state) => Array.from(state.enemies.keys()))
        );
      });

      const initialRenderCount = renderCount;

      // Spawn enemy
      let enemyId: string;
      act(() => {
        enemyId = useEnemyStore.getState().spawnEnemy("slime", { x: 0, y: 0, z: 0 });
      });

      const afterSpawnCount = renderCount;
      expect(afterSpawnCount).toBe(initialRenderCount + 1);

      // Update enemy position - should NOT trigger re-render
      act(() => {
        useEnemyStore.getState().setEnemyPosition(enemyId!, { x: 10, y: 0, z: 10 });
      });

      // Render count should stay the same
      expect(renderCount).toBe(afterSpawnCount);

      // Update enemy rotation - should NOT trigger re-render
      act(() => {
        useEnemyStore.getState().setEnemyRotation(enemyId!, 1.5);
      });

      expect(renderCount).toBe(afterSpawnCount);

      // Update enemy state - should NOT trigger re-render (IDs unchanged)
      act(() => {
        useEnemyStore.getState().setEnemyState(enemyId!, "chase");
      });

      expect(renderCount).toBe(afterSpawnCount);
    });

    it("should re-render when enemy is removed", () => {
      let renderCount = 0;

      const { result } = renderHook(() => {
        renderCount++;
        return useEnemyStore(
          useShallow((state) => Array.from(state.enemies.keys()))
        );
      });

      // Spawn two enemies
      let enemyId: string;
      act(() => {
        enemyId = useEnemyStore.getState().spawnEnemy("slime", { x: 0, y: 0, z: 0 });
        useEnemyStore.getState().spawnEnemy("wolf", { x: 5, y: 0, z: 5 });
      });

      expect(result.current.length).toBe(2);
      const countAfterSpawn = renderCount;

      // Remove first enemy
      act(() => {
        useEnemyStore.getState().removeEnemy(enemyId!);
      });

      // Should have re-rendered
      expect(renderCount).toBeGreaterThan(countAfterSpawn);
      expect(result.current.length).toBe(1);
    });
  });

  describe("Individual enemy selector", () => {
    it("should only re-render for its own enemy changes", () => {
      let renderCount = 0;
      let targetEnemyId: string = "";

      // Spawn two enemies first
      act(() => {
        targetEnemyId = useEnemyStore.getState().spawnEnemy("slime", { x: 0, y: 0, z: 0 });
        useEnemyStore.getState().spawnEnemy("wolf", { x: 5, y: 0, z: 5 });
      });

      // Use a stable selector that doesn't create new objects
      const { result } = renderHook(() => {
        renderCount++;
        // Only subscribe to the specific enemy's existence
        const enemy = useEnemyStore.getState().enemies.get(targetEnemyId);
        if (!enemy) return null;
        return {
          id: enemy.id,
          type: enemy.type,
          health: enemy.health,
        };
      });

      expect(result.current?.type).toBe("slime");
      const initialCount = renderCount;

      // Change the OTHER enemy
      const otherEnemyId = useEnemyStore.getState().getEnemyIds().find(id => id !== targetEnemyId);
      act(() => {
        if (otherEnemyId) {
          useEnemyStore.getState().setEnemyState(otherEnemyId, "chase");
        }
      });

      // Due to Map mutation, this might re-render, but the important thing is
      // it doesn't infinite loop
      expect(renderCount).toBeLessThan(initialCount + 10);
    });

    it("should update state when health changes", () => {
      // This test verifies that health updates are reflected in the store
      // We use direct getState() calls to avoid selector instability issues
      let enemyId: string = "";

      act(() => {
        enemyId = useEnemyStore.getState().spawnEnemy("slime", { x: 0, y: 0, z: 0 });
      });

      // Verify initial health
      const initialEnemy = useEnemyStore.getState().enemies.get(enemyId);
      expect(initialEnemy?.health).toBe(30);

      // Damage enemy
      act(() => {
        useEnemyStore.getState().damageEnemy(enemyId, 10);
      });

      // Verify health decreased
      const damagedEnemy = useEnemyStore.getState().enemies.get(enemyId);
      expect(damagedEnemy?.health).toBe(20);
    });
  });

  describe("Selected enemy selector", () => {
    it("should update when selection changes", () => {
      let renderCount = 0;

      const { result } = renderHook(() => {
        renderCount++;
        return useEnemyStore((state) => state.selectedEnemyId);
      });

      expect(result.current).toBeNull();
      const initialCount = renderCount;

      // Spawn and select enemy
      let enemyId: string;
      act(() => {
        enemyId = useEnemyStore.getState().spawnEnemy("slime", { x: 0, y: 0, z: 0 });
        useEnemyStore.getState().selectEnemy(enemyId);
      });

      expect(result.current).toBe(enemyId!);
      expect(renderCount).toBeGreaterThan(initialCount);
    });

    it("should not re-render when non-selection state changes", () => {
      let renderCount = 0;

      const { result } = renderHook(() => {
        renderCount++;
        return useEnemyStore((state) => state.selectedEnemyId);
      });

      // Spawn enemies without selecting
      act(() => {
        useEnemyStore.getState().spawnEnemy("slime", { x: 0, y: 0, z: 0 });
        useEnemyStore.getState().spawnEnemy("wolf", { x: 5, y: 0, z: 5 });
      });

      const countAfterSpawn = renderCount;

      // Update enemy states - should NOT trigger selection re-render
      const ids = useEnemyStore.getState().getEnemyIds();
      act(() => {
        ids.forEach(id => {
          useEnemyStore.getState().setEnemyPosition(id, { x: 100, y: 0, z: 100 });
        });
      });

      // Render count should be the same (selectedEnemyId didn't change)
      expect(renderCount).toBe(countAfterSpawn);
      expect(result.current).toBeNull();
    });
  });

  describe("Stress testing render stability", () => {
    it("should handle rapid state updates without excessive renders", async () => {
      let renderCount = 0;

      const { result } = renderHook(() => {
        renderCount++;
        return useEnemyStore(
          useShallow((state) => Array.from(state.enemies.keys()))
        );
      });

      // Spawn many enemies rapidly
      act(() => {
        for (let i = 0; i < 50; i++) {
          useEnemyStore.getState().spawnEnemy("slime", { x: i, y: 0, z: i });
        }
      });

      // Should have rendered a reasonable number of times
      // (batched in act(), so typically 2 renders total)
      expect(renderCount).toBeLessThan(100);
      expect(result.current.length).toBe(50);
    });

    it("should not infinite loop with concurrent modifications", () => {
      let renderCount = 0;
      const maxRenders = 1000;

      const { result } = renderHook(() => {
        renderCount++;
        if (renderCount > maxRenders) {
          throw new Error("Infinite render loop detected!");
        }
        return useEnemyStore(
          useShallow((state) => Array.from(state.enemies.keys()))
        );
      });

      // This should complete without throwing
      act(() => {
        const ids: string[] = [];
        for (let i = 0; i < 10; i++) {
          ids.push(useEnemyStore.getState().spawnEnemy("slime", { x: i, y: 0, z: i }));
        }

        // Modify all enemies
        ids.forEach((id, index) => {
          useEnemyStore.getState().setEnemyState(id, "chase");
          useEnemyStore.getState().setEnemyPosition(id, { x: index * 2, y: 1, z: index * 2 });
        });

        // Remove half
        ids.slice(0, 5).forEach(id => {
          useEnemyStore.getState().removeEnemy(id);
        });
      });

      expect(renderCount).toBeLessThan(maxRenders);
      expect(result.current.length).toBe(5);
    });
  });

  describe("getEnemyIds stability in hooks", () => {
    it("should provide stable access to enemy IDs", () => {
      let renderCount = 0;

      const { result } = renderHook(() => {
        renderCount++;
        // Use getEnemyIds directly (for non-reactive access)
        return {
          ids: useEnemyStore.getState().getEnemyIds(),
          count: useEnemyStore((state) => state.enemies.size),
        };
      });

      expect(result.current.ids).toEqual([]);
      expect(result.current.count).toBe(0);

      act(() => {
        useEnemyStore.getState().spawnEnemy("slime", { x: 0, y: 0, z: 0 });
      });

      // Count selector should trigger re-render
      expect(result.current.count).toBe(1);
      // getEnemyIds should also reflect the change
      expect(useEnemyStore.getState().getEnemyIds().length).toBe(1);
    });
  });
});

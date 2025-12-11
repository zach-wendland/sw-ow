import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
  Enemy,
  Position,
  EnemyState,
  createEnemy,
  getEnemyConfig,
  getRandomGoldDrop,
  ENEMY_TYPES,
} from "@/types/enemies";

// ============================================================================
// TYPES
// ============================================================================

interface EnemyStore {
  // State
  enemies: Map<string, Enemy>;
  selectedEnemyId: string | null;

  // Actions - Spawning
  spawnEnemy: (type: string, position: Position) => string;
  spawnEnemies: (spawns: { type: string; position: Position }[]) => void;
  removeEnemy: (id: string) => void;
  clearAllEnemies: () => void;

  // Actions - Combat
  damageEnemy: (id: string, damage: number) => { killed: boolean; xp: number; gold: number };
  selectEnemy: (id: string | null) => void;
  setEnemyState: (id: string, state: EnemyState) => void;
  setEnemyTarget: (id: string, target: string | null) => void;
  setEnemyPosition: (id: string, position: Position) => void;
  setEnemyRotation: (id: string, rotation: number) => void;
  recordEnemyAttack: (id: string) => void;

  // Getters
  getEnemy: (id: string) => Enemy | undefined;
  getEnemiesInRange: (position: Position, range: number) => Enemy[];
  getEnemiesArray: () => Enemy[];
  getAliveEnemies: () => Enemy[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function distanceBetween(a: Position, b: Position): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// ============================================================================
// STORE
// ============================================================================

export const useEnemyStore = create<EnemyStore>()(
  subscribeWithSelector((set, get) => ({
    // ========================================
    // Initial State
    // ========================================
    enemies: new Map<string, Enemy>(),
    selectedEnemyId: null,

    // ========================================
    // Spawning Actions
    // ========================================
    spawnEnemy: (type, position) => {
      const enemy = createEnemy(type, position);

      set((state) => {
        const newEnemies = new Map(state.enemies);
        newEnemies.set(enemy.id, enemy);
        return { enemies: newEnemies };
      });

      console.log(`[EnemyStore] Spawned ${type} at`, position);
      return enemy.id;
    },

    spawnEnemies: (spawns) => {
      set((state) => {
        const newEnemies = new Map(state.enemies);

        for (const spawn of spawns) {
          const enemy = createEnemy(spawn.type, spawn.position);
          newEnemies.set(enemy.id, enemy);
        }

        return { enemies: newEnemies };
      });

      console.log(`[EnemyStore] Spawned ${spawns.length} enemies`);
    },

    removeEnemy: (id) => {
      set((state) => {
        const newEnemies = new Map(state.enemies);
        newEnemies.delete(id);

        return {
          enemies: newEnemies,
          selectedEnemyId:
            state.selectedEnemyId === id ? null : state.selectedEnemyId,
        };
      });
    },

    clearAllEnemies: () => {
      set({ enemies: new Map(), selectedEnemyId: null });
    },

    // ========================================
    // Combat Actions
    // ========================================
    damageEnemy: (id, damage) => {
      const state = get();
      const enemy = state.enemies.get(id);

      if (!enemy || enemy.state === "dead") {
        return { killed: false, xp: 0, gold: 0 };
      }

      const newHealth = Math.max(0, enemy.health - damage);
      const killed = newHealth <= 0;

      set((state) => {
        const newEnemies = new Map(state.enemies);
        const updatedEnemy = {
          ...enemy,
          health: newHealth,
          state: killed ? ("dead" as EnemyState) : enemy.state,
        };
        newEnemies.set(id, updatedEnemy);
        return { enemies: newEnemies };
      });

      if (killed) {
        const config = getEnemyConfig(enemy.type);
        const gold = getRandomGoldDrop(enemy.type);

        console.log(
          `[EnemyStore] ${config.name} killed! XP: ${config.xpReward}, Gold: ${gold}`
        );

        // Note: Cleanup is handled by Enemy component useEffect to prevent memory leaks
        return { killed: true, xp: config.xpReward, gold };
      }

      return { killed: false, xp: 0, gold: 0 };
    },

    selectEnemy: (id) => {
      set({ selectedEnemyId: id });
    },

    setEnemyState: (id, state) => {
      set((store) => {
        const enemy = store.enemies.get(id);
        if (!enemy) return store;

        const newEnemies = new Map(store.enemies);
        newEnemies.set(id, { ...enemy, state });
        return { enemies: newEnemies };
      });
    },

    setEnemyTarget: (id, target) => {
      set((store) => {
        const enemy = store.enemies.get(id);
        if (!enemy) return store;

        const newEnemies = new Map(store.enemies);
        newEnemies.set(id, { ...enemy, target });
        return { enemies: newEnemies };
      });
    },

    setEnemyPosition: (id, position) => {
      set((store) => {
        const enemy = store.enemies.get(id);
        if (!enemy) return store;

        const newEnemies = new Map(store.enemies);
        newEnemies.set(id, { ...enemy, position });
        return { enemies: newEnemies };
      });
    },

    setEnemyRotation: (id, rotation) => {
      set((store) => {
        const enemy = store.enemies.get(id);
        if (!enemy) return store;

        const newEnemies = new Map(store.enemies);
        newEnemies.set(id, { ...enemy, rotation });
        return { enemies: newEnemies };
      });
    },

    recordEnemyAttack: (id) => {
      set((store) => {
        const enemy = store.enemies.get(id);
        if (!enemy) return store;

        const newEnemies = new Map(store.enemies);
        newEnemies.set(id, { ...enemy, lastAttackTime: Date.now() });
        return { enemies: newEnemies };
      });
    },

    // ========================================
    // Getters
    // ========================================
    getEnemy: (id) => {
      return get().enemies.get(id);
    },

    getEnemiesInRange: (position, range) => {
      const enemies = Array.from(get().enemies.values());
      return enemies.filter(
        (enemy) =>
          enemy.state !== "dead" &&
          distanceBetween(position, enemy.position) <= range
      );
    },

    getEnemiesArray: () => {
      return Array.from(get().enemies.values());
    },

    getAliveEnemies: () => {
      return Array.from(get().enemies.values()).filter(
        (enemy) => enemy.state !== "dead"
      );
    },
  }))
);

// ============================================================================
// SELECTORS
// ============================================================================

export const selectSelectedEnemy = (state: EnemyStore) => {
  if (!state.selectedEnemyId) return null;
  return state.enemies.get(state.selectedEnemyId) || null;
};

export const selectEnemyCount = (state: EnemyStore) => state.enemies.size;

export const selectAliveEnemyCount = (state: EnemyStore) =>
  Array.from(state.enemies.values()).filter((e) => e.state !== "dead").length;

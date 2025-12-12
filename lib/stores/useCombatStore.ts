import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { Position, getEnemyConfig } from "@/types/enemies";

// ============================================================================
// TYPES
// ============================================================================

export interface DamageNumber {
  id: string;
  amount: number;
  position: Position;
  isCritical: boolean;
  isHeal: boolean;
  createdAt: number;
}

export interface CombatEvent {
  id: string;
  type: "damage" | "heal" | "kill" | "xp" | "gold" | "levelup";
  message: string;
  timestamp: number;
}

interface CombatStore {
  // State
  isPlayerAttacking: boolean;
  lastPlayerAttackTime: number;
  playerAttackCooldown: number;
  damageNumbers: DamageNumber[];
  combatLog: CombatEvent[];
  comboCount: number;
  lastComboTime: number;

  // Combat Feel - Hitstop
  hitStopEndTime: number;

  // Combat Feel - Screen Shake
  screenShakeIntensity: number;
  screenShakeEndTime: number;

  // Actions - Player Attack
  startPlayerAttack: () => boolean;
  endPlayerAttack: () => void;
  canPlayerAttack: () => boolean;

  // Actions - Damage Numbers
  addDamageNumber: (
    amount: number,
    position: Position,
    isCritical?: boolean,
    isHeal?: boolean
  ) => void;
  removeDamageNumber: (id: string) => void;
  clearDamageNumbers: () => void;

  // Actions - Combat Log
  addCombatEvent: (
    type: CombatEvent["type"],
    message: string
  ) => void;
  clearCombatLog: () => void;

  // Actions - Combo
  incrementCombo: () => void;
  resetCombo: () => void;

  // Actions - Combat Feel
  triggerHitStop: (frames: number) => void;
  triggerScreenShake: (intensity: number, durationMs: number) => void;
  getTimeScale: () => number;
  getScreenShake: () => { x: number; y: number };

  // Calculations
  calculatePlayerDamage: (
    baseStrength: number,
    weaponDamage: number,
    level: number
  ) => { damage: number; isCritical: boolean };
  calculateEnemyDamage: (
    enemyType: string,
    playerDefense: number
  ) => number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PLAYER_BASE_ATTACK_COOLDOWN = 0.6; // seconds
const CRITICAL_HIT_CHANCE = 0.15;
const CRITICAL_HIT_MULTIPLIER = 2;
const COMBO_TIMEOUT = 3000; // ms to reset combo
const MAX_COMBAT_LOG_ENTRIES = 50;
const DAMAGE_NUMBER_LIFETIME = 1500; // ms

// Combat Feel Constants
const FRAME_DURATION_MS = 1000 / 60; // ~16.67ms per frame at 60fps
const HITSTOP_FRAMES_NORMAL = 3; // 3 frames (~50ms) for normal hits
const HITSTOP_FRAMES_CRITICAL = 6; // 6 frames (~100ms) for critical hits
const HITSTOP_FRAMES_KILL = 8; // 8 frames (~133ms) for kills
const SCREEN_SHAKE_DECAY = 0.9; // How fast shake diminishes per frame

// ============================================================================
// STORE
// ============================================================================

export const useCombatStore = create<CombatStore>()(
  subscribeWithSelector((set, get) => ({
    // ========================================
    // Initial State
    // ========================================
    isPlayerAttacking: false,
    lastPlayerAttackTime: 0,
    playerAttackCooldown: PLAYER_BASE_ATTACK_COOLDOWN,
    damageNumbers: [],
    combatLog: [],
    comboCount: 0,
    lastComboTime: 0,

    // Combat Feel State
    hitStopEndTime: 0,
    screenShakeIntensity: 0,
    screenShakeEndTime: 0,

    // ========================================
    // Player Attack Actions
    // ========================================
    startPlayerAttack: () => {
      const state = get();
      if (!state.canPlayerAttack()) {
        return false;
      }

      set({
        isPlayerAttacking: true,
        lastPlayerAttackTime: Date.now(),
      });

      // Auto-end attack after animation duration
      setTimeout(() => {
        get().endPlayerAttack();
      }, 300);

      return true;
    },

    endPlayerAttack: () => {
      set({ isPlayerAttacking: false });
    },

    canPlayerAttack: () => {
      const state = get();
      const now = Date.now();
      const timeSinceLastAttack = (now - state.lastPlayerAttackTime) / 1000;
      return (
        !state.isPlayerAttacking &&
        timeSinceLastAttack >= state.playerAttackCooldown
      );
    },

    // ========================================
    // Damage Numbers Actions
    // ========================================
    addDamageNumber: (amount, position, isCritical = false, isHeal = false) => {
      const id = `dmg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Add random offset to prevent overlap
      const offsetPosition = {
        x: position.x + (Math.random() - 0.5) * 0.5,
        y: position.y + 1.5 + Math.random() * 0.5,
        z: position.z + (Math.random() - 0.5) * 0.5,
      };

      const damageNumber: DamageNumber = {
        id,
        amount,
        position: offsetPosition,
        isCritical,
        isHeal,
        createdAt: Date.now(),
      };

      set((state) => ({
        damageNumbers: [...state.damageNumbers, damageNumber],
      }));

      // Auto-remove after lifetime
      setTimeout(() => {
        get().removeDamageNumber(id);
      }, DAMAGE_NUMBER_LIFETIME);
    },

    removeDamageNumber: (id) => {
      set((state) => ({
        damageNumbers: state.damageNumbers.filter((dn) => dn.id !== id),
      }));
    },

    clearDamageNumbers: () => {
      set({ damageNumbers: [] });
    },

    // ========================================
    // Combat Log Actions
    // ========================================
    addCombatEvent: (type, message) => {
      const event: CombatEvent = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        message,
        timestamp: Date.now(),
      };

      set((state) => {
        const newLog = [event, ...state.combatLog].slice(
          0,
          MAX_COMBAT_LOG_ENTRIES
        );
        return { combatLog: newLog };
      });
    },

    clearCombatLog: () => {
      set({ combatLog: [] });
    },

    // ========================================
    // Combo Actions
    // ========================================
    incrementCombo: () => {
      const now = Date.now();
      set((state) => {
        // Reset combo if too much time has passed
        if (now - state.lastComboTime > COMBO_TIMEOUT) {
          return { comboCount: 1, lastComboTime: now };
        }
        return { comboCount: state.comboCount + 1, lastComboTime: now };
      });
    },

    resetCombo: () => {
      set({ comboCount: 0, lastComboTime: 0 });
    },

    // ========================================
    // Combat Feel Actions
    // ========================================

    /**
     * Trigger hitstop - freezes game time for impact feel
     * @param frames Number of frames to pause (at 60fps)
     */
    triggerHitStop: (frames: number) => {
      const durationMs = frames * FRAME_DURATION_MS;
      set({ hitStopEndTime: Date.now() + durationMs });
    },

    /**
     * Trigger screen shake for visual impact
     * @param intensity Shake magnitude (0.1 = subtle, 0.5 = heavy)
     * @param durationMs How long the shake lasts
     */
    triggerScreenShake: (intensity: number, durationMs: number) => {
      set({
        screenShakeIntensity: intensity,
        screenShakeEndTime: Date.now() + durationMs,
      });
    },

    /**
     * Get current time scale (0 during hitstop, 1 otherwise)
     * Used to pause animations/movement during hit impact
     */
    getTimeScale: () => {
      const now = Date.now();
      const { hitStopEndTime } = get();
      return now < hitStopEndTime ? 0 : 1;
    },

    /**
     * Get current screen shake offset
     * Returns random offset based on intensity, decaying over time
     */
    getScreenShake: () => {
      const now = Date.now();
      const { screenShakeIntensity, screenShakeEndTime } = get();

      if (now >= screenShakeEndTime || screenShakeIntensity === 0) {
        return { x: 0, y: 0 };
      }

      // Calculate remaining intensity based on time
      const remainingTime = screenShakeEndTime - now;
      const totalDuration = screenShakeEndTime - (screenShakeEndTime - 200); // Assume 200ms default
      const decay = Math.min(remainingTime / 200, 1); // Decay over time
      const currentIntensity = screenShakeIntensity * decay;

      // Random offset within intensity range
      return {
        x: (Math.random() - 0.5) * 2 * currentIntensity,
        y: (Math.random() - 0.5) * 2 * currentIntensity,
      };
    },

    // ========================================
    // Calculations
    // ========================================
    calculatePlayerDamage: (baseStrength, weaponDamage, level) => {
      // Base damage formula
      const baseDamage = weaponDamage + baseStrength * 0.5 + level * 2;

      // Check for critical hit
      const isCritical = Math.random() < CRITICAL_HIT_CHANCE;
      const critMultiplier = isCritical ? CRITICAL_HIT_MULTIPLIER : 1;

      // Add some variance (±10%)
      const variance = 0.9 + Math.random() * 0.2;

      // Combo bonus (5% per combo, max 50%)
      const comboBonus = 1 + Math.min(get().comboCount * 0.05, 0.5);

      const finalDamage = Math.floor(
        baseDamage * critMultiplier * variance * comboBonus
      );

      return {
        damage: Math.max(1, finalDamage),
        isCritical,
      };
    },

    calculateEnemyDamage: (enemyType, playerDefense) => {
      const config = getEnemyConfig(enemyType);
      const baseDamage = config.damage;

      // Reduce by defense (each point reduces 1% damage, max 50%)
      const defenseReduction = Math.min(playerDefense * 0.01, 0.5);
      const reducedDamage = baseDamage * (1 - defenseReduction);

      // Add variance (±15%)
      const variance = 0.85 + Math.random() * 0.3;

      return Math.max(1, Math.floor(reducedDamage * variance));
    },
  }))
);

// ============================================================================
// SELECTORS
// ============================================================================

export const selectCanAttack = (state: CombatStore) => state.canPlayerAttack();
export const selectComboCount = (state: CombatStore) => state.comboCount;
export const selectDamageNumbers = (state: CombatStore) => state.damageNumbers;
export const selectCombatLog = (state: CombatStore) => state.combatLog;

// ============================================================================
// EXPORTED CONSTANTS (for use in components)
// ============================================================================

export const COMBAT_FEEL = {
  HITSTOP_FRAMES_NORMAL,
  HITSTOP_FRAMES_CRITICAL,
  HITSTOP_FRAMES_KILL,
  FRAME_DURATION_MS,
} as const;

import { create } from "zustand";
import { subscribeWithSelector, persist, createJSONStorage } from "zustand/middleware";
import {
  loadCharacterSave,
  saveCharacterSave,
  type SaveData,
} from "@/lib/storage/localStorage";

// ============================================================================
// TYPES
// ============================================================================

interface Position {
  x: number;
  y: number;
  z: number;
}

interface PlayerStats {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  mana: number;
  maxMana: number;
  xp: number;
  xpToNextLevel: number;
  level: number;
  alignment: number; // -100 to 100 (dark to light)
  gold: number;
  skillPoints: number;
  attributePoints: number;
}

interface CharacterAttributes {
  strength: number;
  dexterity: number;
  intelligence: number;
  vitality: number;
}

interface CharacterData {
  id: string;
  name: string;
  slotNumber: number;
  currentZone: string;
  totalPlayTime: number;
  enemiesKilled: number;
  deaths: number;
  questsCompleted: number;
  distanceTraveled: number;
}

interface PlayerState {
  // Identity
  characterId: string | null;
  playerId: string | null;
  characterData: CharacterData | null;

  // Position
  position: Position;
  rotation: number;
  respawnPoint: Position;

  // Stats
  stats: PlayerStats;
  attributes: CharacterAttributes;

  // State flags
  isLoading: boolean;
  isInCombat: boolean;
  isDead: boolean;
  isSaving: boolean;
  lastSaveTime: number;

  // Session tracking
  sessionStartTime: number;
  sessionPlayTime: number;

  // Actions - Core
  setPosition: (position: Position) => void;
  setRotation: (rotation: number) => void;
  setStats: (stats: Partial<PlayerStats>) => void;

  // Actions - Combat
  takeDamage: (amount: number) => void;
  heal: (amount: number) => void;
  useStamina: (amount: number) => boolean;
  useMana: (amount: number) => boolean;
  regenerateStamina: (amount: number) => void;
  regenerateMana: (amount: number) => void;

  // Actions - Progression
  addXP: (amount: number) => void;
  setAlignment: (delta: number) => void;
  addGold: (amount: number) => void;
  spendGold: (amount: number) => boolean;

  // Actions - State
  respawn: () => void;
  setRespawnPoint: (position: Position) => void;

  // Actions - Persistence
  loadCharacter: (characterId: string) => Promise<boolean>;
  saveCharacter: () => Promise<boolean>;
  autoSave: () => void;
  unloadCharacter: () => void;

  // Actions - Session
  updateSessionTime: () => void;
  getSessionPlayTime: () => number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_STATS: PlayerStats = {
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

const DEFAULT_ATTRIBUTES: CharacterAttributes = {
  strength: 10,
  dexterity: 10,
  intelligence: 10,
  vitality: 10,
};

const SPAWN_POSITION: Position = { x: 0, y: 2, z: 0 };
const AUTO_SAVE_INTERVAL = 60000; // 60 seconds

// ============================================================================
// STORE
// ============================================================================

export const usePlayerStore = create<PlayerState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // ========================================
        // Initial State
        // ========================================
        characterId: null,
        playerId: null,
        characterData: null,
        position: SPAWN_POSITION,
        rotation: 0,
        respawnPoint: SPAWN_POSITION,
        stats: DEFAULT_STATS,
        attributes: DEFAULT_ATTRIBUTES,
        isLoading: false,
        isInCombat: false,
        isDead: false,
        isSaving: false,
        lastSaveTime: 0,
        sessionStartTime: Date.now(),
        sessionPlayTime: 0,

        // ========================================
        // Core Actions
        // ========================================
        setPosition: (position) => set({ position }),

        setRotation: (rotation) => set({ rotation }),

        setStats: (newStats) =>
          set((state) => ({
            stats: { ...state.stats, ...newStats },
          })),

        // ========================================
        // Combat Actions
        // ========================================
        takeDamage: (amount) =>
          set((state) => {
            const newHealth = Math.max(0, state.stats.health - amount);
            const isDead = newHealth <= 0;

            if (isDead) {
              // Increment deaths counter
              if (state.characterData) {
                state.characterData.deaths++;
              }
            }

            return {
              stats: { ...state.stats, health: newHealth },
              isDead,
              isInCombat: true,
              characterData: state.characterData,
            };
          }),

        heal: (amount) =>
          set((state) => ({
            stats: {
              ...state.stats,
              health: Math.min(state.stats.maxHealth, state.stats.health + amount),
            },
          })),

        useStamina: (amount) => {
          const state = get();
          if (state.stats.stamina < amount) return false;

          set({
            stats: {
              ...state.stats,
              stamina: state.stats.stamina - amount,
            },
          });
          return true;
        },

        useMana: (amount) => {
          const state = get();
          if (state.stats.mana < amount) return false;

          set({
            stats: {
              ...state.stats,
              mana: state.stats.mana - amount,
            },
          });
          return true;
        },

        regenerateStamina: (amount) =>
          set((state) => ({
            stats: {
              ...state.stats,
              stamina: Math.min(state.stats.maxStamina, state.stats.stamina + amount),
            },
          })),

        regenerateMana: (amount) =>
          set((state) => ({
            stats: {
              ...state.stats,
              mana: Math.min(state.stats.maxMana, state.stats.mana + amount),
            },
          })),

        // ========================================
        // Progression Actions
        // ========================================
        addXP: (amount) =>
          set((state) => {
            let newXP = state.stats.xp + amount;
            let newLevel = state.stats.level;
            let xpToNext = state.stats.xpToNextLevel;
            let skillPoints = state.stats.skillPoints;
            let attributePoints = state.stats.attributePoints;

            // Check for level up
            while (newXP >= xpToNext && newLevel < 100) {
              newXP -= xpToNext;
              newLevel++;
              xpToNext = Math.floor(100 * Math.pow(newLevel, 1.5)); // Match DB formula
              skillPoints++;

              // Attribute point every 5 levels
              if (newLevel % 5 === 0) {
                attributePoints++;
              }
            }

            // Level up bonuses
            const levelUps = newLevel - state.stats.level;
            const { vitality, dexterity, intelligence } = state.attributes;
            const newMaxHealth = 100 + (newLevel - 1) * 10 + vitality * 5;
            const newMaxStamina = 100 + (newLevel - 1) * 5 + dexterity * 2;
            const newMaxMana = 50 + (newLevel - 1) * 5 + intelligence * 3;

            return {
              stats: {
                ...state.stats,
                xp: newXP,
                level: newLevel,
                xpToNextLevel: xpToNext,
                maxHealth: newMaxHealth,
                maxStamina: newMaxStamina,
                maxMana: newMaxMana,
                skillPoints,
                attributePoints,
                // Full restore on level up
                health: levelUps > 0 ? newMaxHealth : state.stats.health,
                stamina: levelUps > 0 ? newMaxStamina : state.stats.stamina,
                mana: levelUps > 0 ? newMaxMana : state.stats.mana,
              },
            };
          }),

        setAlignment: (delta) =>
          set((state) => ({
            stats: {
              ...state.stats,
              alignment: Math.max(-100, Math.min(100, state.stats.alignment + delta)),
            },
          })),

        addGold: (amount) =>
          set((state) => ({
            stats: {
              ...state.stats,
              gold: state.stats.gold + amount,
            },
          })),

        spendGold: (amount) => {
          const state = get();
          if (state.stats.gold < amount) return false;

          set({
            stats: {
              ...state.stats,
              gold: state.stats.gold - amount,
            },
          });
          return true;
        },

        // ========================================
        // State Actions
        // ========================================
        respawn: () =>
          set((state) => ({
            position: state.respawnPoint,
            stats: {
              ...state.stats,
              health: state.stats.maxHealth,
              stamina: state.stats.maxStamina,
              mana: state.stats.maxMana,
            },
            isDead: false,
            isInCombat: false,
          })),

        setRespawnPoint: (position) => set({ respawnPoint: position }),

        // ========================================
        // Persistence Actions (localStorage)
        // ========================================
        loadCharacter: async (characterId: string) => {
          set({ isLoading: true });

          try {
            const data = loadCharacterSave(characterId);

            if (!data) {
              console.error("Failed to load character: not found");
              set({ isLoading: false });
              return false;
            }

            // Load from localStorage save
            set({
              characterId: data.characterId,
              playerId: "local",
              characterData: data.characterData,
              position: data.position,
              rotation: data.rotation,
              respawnPoint: data.respawnPoint,
              stats: data.stats,
              attributes: data.attributes,
              isDead: data.isDead,
              isLoading: false,
              sessionStartTime: Date.now(),
              sessionPlayTime: 0,
            });

            console.log("[PlayerStore] Character loaded:", data.characterData.name);
            return true;
          } catch (err) {
            console.error("Failed to load character:", err);
            set({ isLoading: false });
            return false;
          }
        },

        saveCharacter: async () => {
          const state = get();

          if (!state.characterId || !state.characterData) {
            console.warn("[PlayerStore] No character to save");
            return false;
          }

          set({ isSaving: true });

          try {
            // Update session play time
            const currentSessionTime = Math.floor(
              (Date.now() - state.sessionStartTime) / 1000
            );

            const totalPlayTime =
              (state.characterData.totalPlayTime || 0) +
              currentSessionTime -
              state.sessionPlayTime;

            const saveData: SaveData = {
              characterId: state.characterId,
              characterData: {
                ...state.characterData,
                totalPlayTime,
              },
              position: state.position,
              rotation: state.rotation,
              respawnPoint: state.respawnPoint,
              stats: state.stats,
              attributes: state.attributes,
              isDead: state.isDead,
              lastSaved: Date.now(),
            };

            const success = saveCharacterSave(state.characterId, saveData);

            if (!success) {
              console.error("Failed to save character to localStorage");
              set({ isSaving: false });
              return false;
            }

            set({
              isSaving: false,
              lastSaveTime: Date.now(),
              sessionPlayTime: currentSessionTime,
              characterData: saveData.characterData,
            });

            console.log("[PlayerStore] Character saved successfully");
            return true;
          } catch (err) {
            console.error("Failed to save character:", err);
            set({ isSaving: false });
            return false;
          }
        },

        autoSave: () => {
          const state = get();
          const now = Date.now();

          // Only auto-save if enough time has passed and not currently saving
          if (
            state.characterId &&
            !state.isSaving &&
            now - state.lastSaveTime >= AUTO_SAVE_INTERVAL
          ) {
            get().saveCharacter();
          }
        },

        unloadCharacter: () => {
          // Save before unloading
          const state = get();
          if (state.characterId) {
            state.saveCharacter();
          }

          set({
            characterId: null,
            playerId: null,
            characterData: null,
            position: SPAWN_POSITION,
            rotation: 0,
            respawnPoint: SPAWN_POSITION,
            stats: DEFAULT_STATS,
            attributes: DEFAULT_ATTRIBUTES,
            isLoading: false,
            isInCombat: false,
            isDead: false,
            isSaving: false,
            lastSaveTime: 0,
            sessionStartTime: Date.now(),
            sessionPlayTime: 0,
          });
        },

        // ========================================
        // Session Actions
        // ========================================
        updateSessionTime: () => {
          const state = get();
          const currentSessionTime = Math.floor(
            (Date.now() - state.sessionStartTime) / 1000
          );
          set({ sessionPlayTime: currentSessionTime });
        },

        getSessionPlayTime: () => {
          const state = get();
          return Math.floor((Date.now() - state.sessionStartTime) / 1000);
        },
      }),
      {
        name: "player-store",
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Only persist essential data for session recovery
          characterId: state.characterId,
        }),
      }
    )
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

export const selectIsAlive = (state: PlayerState) => !state.isDead;
export const selectHealthPercent = (state: PlayerState) =>
  (state.stats.health / state.stats.maxHealth) * 100;
export const selectStaminaPercent = (state: PlayerState) =>
  (state.stats.stamina / state.stats.maxStamina) * 100;
export const selectManaPercent = (state: PlayerState) =>
  (state.stats.mana / state.stats.maxMana) * 100;
export const selectXPPercent = (state: PlayerState) =>
  (state.stats.xp / state.stats.xpToNextLevel) * 100;
export const selectAlignmentSide = (state: PlayerState) =>
  state.stats.alignment > 30
    ? "light"
    : state.stats.alignment < -30
      ? "dark"
      : "neutral";

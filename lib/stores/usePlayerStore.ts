import { create } from "zustand";
import { subscribeWithSelector, persist, createJSONStorage } from "zustand/middleware";
import { getSupabase } from "@/lib/supabase/client";

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
        // Persistence Actions
        // ========================================
        loadCharacter: async (characterId: string) => {
          set({ isLoading: true });

          try {
            const supabase = getSupabase();

            const { data, error } = await supabase
              .from("characters")
              .select("*")
              .eq("id", characterId)
              .single();

            if (error || !data) {
              console.error("Failed to load character:", error);
              set({ isLoading: false });
              return false;
            }

            // Map database fields to store state
            set({
              characterId: data.id,
              playerId: data.player_id,
              characterData: {
                id: data.id,
                name: data.name,
                slotNumber: data.slot_number,
                currentZone: data.current_zone,
                totalPlayTime: data.total_play_time_seconds,
                enemiesKilled: data.enemies_killed,
                deaths: data.deaths,
                questsCompleted: data.quests_completed,
                distanceTraveled: data.distance_traveled,
              },
              position: {
                x: data.position_x,
                y: data.position_y,
                z: data.position_z,
              },
              rotation: data.rotation_y,
              respawnPoint: {
                x: data.respawn_point_x,
                y: data.respawn_point_y,
                z: data.respawn_point_z,
              },
              stats: {
                health: data.health,
                maxHealth: data.max_health,
                stamina: data.stamina,
                maxStamina: data.max_stamina,
                mana: data.mana,
                maxMana: data.max_mana,
                xp: data.experience,
                xpToNextLevel: data.experience_to_next_level,
                level: data.level,
                alignment: data.alignment,
                gold: data.gold,
                skillPoints: data.skill_points,
                attributePoints: data.attribute_points,
              },
              attributes: {
                strength: data.strength,
                dexterity: data.dexterity,
                intelligence: data.intelligence,
                vitality: data.vitality,
              },
              isDead: data.is_dead,
              isLoading: false,
              sessionStartTime: Date.now(),
              sessionPlayTime: 0,
            });

            console.log("[PlayerStore] Character loaded:", data.name);
            return true;
          } catch (err) {
            console.error("Failed to load character:", err);
            set({ isLoading: false });
            return false;
          }
        },

        saveCharacter: async () => {
          const state = get();

          if (!state.characterId) {
            console.warn("[PlayerStore] No character to save");
            return false;
          }

          set({ isSaving: true });

          try {
            const supabase = getSupabase();

            // Update session play time
            const currentSessionTime = Math.floor(
              (Date.now() - state.sessionStartTime) / 1000
            );

            const totalPlayTime =
              (state.characterData?.totalPlayTime || 0) +
              currentSessionTime -
              state.sessionPlayTime;

            const saveData = {
              // Position
              position_x: state.position.x,
              position_y: state.position.y,
              position_z: state.position.z,
              rotation_y: state.rotation,
              current_zone: state.characterData?.currentZone || "starting_area",

              // Stats
              health: state.stats.health,
              stamina: state.stats.stamina,
              mana: state.stats.mana,
              experience: state.stats.xp,
              gold: state.stats.gold,
              skill_points: state.stats.skillPoints,
              attribute_points: state.stats.attributePoints,
              alignment: state.stats.alignment,

              // State
              is_dead: state.isDead,
              respawn_point_x: state.respawnPoint.x,
              respawn_point_y: state.respawnPoint.y,
              respawn_point_z: state.respawnPoint.z,

              // Stats tracking
              total_play_time_seconds: totalPlayTime,
              enemies_killed: state.characterData?.enemiesKilled || 0,
              deaths: state.characterData?.deaths || 0,
              quests_completed: state.characterData?.questsCompleted || 0,
              distance_traveled: state.characterData?.distanceTraveled || 0,

              // Updated timestamp
              last_played_at: new Date().toISOString(),
            };

            const { error } = await supabase
              .from("characters")
              .update(saveData)
              .eq("id", state.characterId);

            if (error) {
              console.error("Failed to save character:", error);
              set({ isSaving: false });
              return false;
            }

            set({
              isSaving: false,
              lastSaveTime: Date.now(),
              sessionPlayTime: currentSessionTime,
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

/**
 * Game-specific type definitions
 */

// Vector types
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Vector2 {
  x: number;
  y: number;
}

// Entity types
export interface Entity {
  id: string;
  name: string;
  position: Vector3;
  rotation: number;
}

export interface Character extends Entity {
  health: number;
  maxHealth: number;
  level: number;
}

export interface NPC extends Character {
  type: "friendly" | "neutral" | "hostile";
  dialogueId?: string;
  questIds?: string[];
}

export interface Enemy extends Character {
  aggroRange: number;
  attackDamage: number;
  attackSpeed: number;
  xpReward: number;
}

// Item types
export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  type: "weapon" | "armor" | "consumable" | "quest" | "misc";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  stackable: boolean;
  maxStack: number;
  stats?: ItemStats;
  icon?: string;
  model?: string;
}

export interface ItemStats {
  damage?: number;
  defense?: number;
  health?: number;
  stamina?: number;
}

export interface InventoryItem {
  id: string;
  itemDefId: string;
  quantity: number;
  equipped: boolean;
  slot?: EquipmentSlot;
}

export type EquipmentSlot =
  | "head"
  | "chest"
  | "legs"
  | "feet"
  | "mainHand"
  | "offHand"
  | "accessory1"
  | "accessory2";

// Quest types
export interface QuestDefinition {
  id: string;
  title: string;
  description: string;
  type: "main" | "side" | "daily";
  objectives: QuestObjective[];
  rewards: QuestReward[];
  prerequisites?: string[];
  level?: number;
}

export interface QuestObjective {
  id: string;
  type: "kill" | "collect" | "interact" | "explore" | "talk";
  description: string;
  target: string;
  required: number;
}

export interface QuestReward {
  type: "xp" | "item" | "currency" | "alignment";
  value: number | string;
  quantity?: number;
}

export interface QuestProgress {
  questId: string;
  status: "available" | "active" | "completed" | "failed";
  objectives: {
    objectiveId: string;
    current: number;
    completed: boolean;
  }[];
  startedAt?: string;
  completedAt?: string;
}

// World types
export interface WorldZone {
  id: string;
  name: string;
  description: string;
  bounds: {
    min: Vector3;
    max: Vector3;
  };
  level: {
    min: number;
    max: number;
  };
  enemies: string[];
  resources: string[];
  weather?: WeatherType;
}

export type WeatherType = "clear" | "cloudy" | "rain" | "storm" | "snow" | "fog";

// Game state types
export interface GameState {
  isLoading: boolean;
  isPaused: boolean;
  currentZone: string | null;
  playTime: number;
  lastSaved: string | null;
}

// ============================================================================
// LOCAL STORAGE PERSISTENCE
// ============================================================================

const SAVE_KEY = "sw-ow-save";
const CHARACTERS_KEY = "sw-ow-characters";

// ============================================================================
// TYPES
// ============================================================================

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  mana: number;
  maxMana: number;
  xp: number;
  xpToNextLevel: number;
  level: number;
  alignment: number;
  gold: number;
  skillPoints: number;
  attributePoints: number;
}

export interface CharacterAttributes {
  strength: number;
  dexterity: number;
  intelligence: number;
  vitality: number;
}

export interface CharacterData {
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

export interface SaveData {
  characterId: string;
  characterData: CharacterData;
  position: Position;
  rotation: number;
  respawnPoint: Position;
  stats: PlayerStats;
  attributes: CharacterAttributes;
  isDead: boolean;
  lastSaved: number;
}

export interface CharacterSummary {
  id: string;
  name: string;
  slotNumber: number;
  level: number;
  currentZone: string;
  totalPlayTime: number;
  lastPlayed: number;
}

// ============================================================================
// SAVE/LOAD FUNCTIONS
// ============================================================================

export function loadSave(): SaveData | null {
  if (typeof window === "undefined") return null;

  try {
    const data = localStorage.getItem(SAVE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error("[Storage] Failed to load save:", err);
    return null;
  }
}

export function saveSave(data: SaveData): boolean {
  if (typeof window === "undefined") return false;

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error("[Storage] Failed to save:", err);
    return false;
  }
}

export function clearSave(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SAVE_KEY);
}

// ============================================================================
// CHARACTER LIST FUNCTIONS
// ============================================================================

export function loadCharacterList(): CharacterSummary[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(CHARACTERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("[Storage] Failed to load character list:", err);
    return [];
  }
}

export function saveCharacterList(characters: CharacterSummary[]): boolean {
  if (typeof window === "undefined") return false;

  try {
    localStorage.setItem(CHARACTERS_KEY, JSON.stringify(characters));
    return true;
  } catch (err) {
    console.error("[Storage] Failed to save character list:", err);
    return false;
  }
}

export function createCharacter(name: string, attributes: CharacterAttributes): CharacterSummary {
  const characters = loadCharacterList();
  const slotNumber = characters.length + 1;

  const newCharacter: CharacterSummary = {
    id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    slotNumber,
    level: 1,
    currentZone: "starting_area",
    totalPlayTime: 0,
    lastPlayed: Date.now(),
  };

  // Also create initial save data for this character
  const initialSave: SaveData = {
    characterId: newCharacter.id,
    characterData: {
      id: newCharacter.id,
      name,
      slotNumber,
      currentZone: "starting_area",
      totalPlayTime: 0,
      enemiesKilled: 0,
      deaths: 0,
      questsCompleted: 0,
      distanceTraveled: 0,
    },
    position: { x: 0, y: 2, z: 0 },
    rotation: 0,
    respawnPoint: { x: 0, y: 2, z: 0 },
    stats: {
      health: 100 + attributes.vitality * 5,
      maxHealth: 100 + attributes.vitality * 5,
      stamina: 100 + attributes.dexterity * 2,
      maxStamina: 100 + attributes.dexterity * 2,
      mana: 50 + attributes.intelligence * 3,
      maxMana: 50 + attributes.intelligence * 3,
      xp: 0,
      xpToNextLevel: 100,
      level: 1,
      alignment: 0,
      gold: 0,
      skillPoints: 0,
      attributePoints: 0,
    },
    attributes,
    isDead: false,
    lastSaved: Date.now(),
  };

  // Save character to list
  characters.push(newCharacter);
  saveCharacterList(characters);

  // Save initial game state
  saveCharacterSave(newCharacter.id, initialSave);

  return newCharacter;
}

export function deleteCharacter(characterId: string): boolean {
  const characters = loadCharacterList();
  const filtered = characters.filter((c) => c.id !== characterId);

  if (filtered.length === characters.length) {
    return false; // Character not found
  }

  saveCharacterList(filtered);

  // Also remove character's save data
  if (typeof window !== "undefined") {
    localStorage.removeItem(`${SAVE_KEY}-${characterId}`);
  }

  return true;
}

// ============================================================================
// CHARACTER-SPECIFIC SAVES
// ============================================================================

export function loadCharacterSave(characterId: string): SaveData | null {
  if (typeof window === "undefined") return null;

  try {
    const data = localStorage.getItem(`${SAVE_KEY}-${characterId}`);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error("[Storage] Failed to load character save:", err);
    return null;
  }
}

export function saveCharacterSave(characterId: string, data: SaveData): boolean {
  if (typeof window === "undefined") return false;

  try {
    localStorage.setItem(`${SAVE_KEY}-${characterId}`, JSON.stringify(data));

    // Also update character summary
    const characters = loadCharacterList();
    const charIndex = characters.findIndex((c) => c.id === characterId);
    if (charIndex !== -1) {
      characters[charIndex].level = data.stats.level;
      characters[charIndex].currentZone = data.characterData.currentZone;
      characters[charIndex].totalPlayTime = data.characterData.totalPlayTime;
      characters[charIndex].lastPlayed = Date.now();
      saveCharacterList(characters);
    }

    return true;
  } catch (err) {
    console.error("[Storage] Failed to save character:", err);
    return false;
  }
}

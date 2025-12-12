import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  loadSave,
  saveSave,
  clearSave,
  loadCharacterList,
  saveCharacterList,
  createCharacter,
  deleteCharacter,
  loadCharacterSave,
  saveCharacterSave,
  type SaveData,
  type CharacterSummary,
  type CharacterAttributes,
} from '@/lib/storage/localStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get store() {
      return store;
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('localStorage utilities', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('loadSave / saveSave', () => {
    it('should save and load data', () => {
      const testData: SaveData = {
        characterId: 'test-123',
        characterData: {
          id: 'test-123',
          name: 'TestChar',
          slotNumber: 1,
          currentZone: 'starting_area',
          totalPlayTime: 3600,
          enemiesKilled: 10,
          deaths: 2,
          questsCompleted: 5,
          distanceTraveled: 1000,
        },
        position: { x: 10, y: 2, z: 15 },
        rotation: 0.5,
        respawnPoint: { x: 0, y: 2, z: 0 },
        stats: {
          health: 80,
          maxHealth: 100,
          stamina: 90,
          maxStamina: 100,
          mana: 40,
          maxMana: 50,
          xp: 50,
          xpToNextLevel: 100,
          level: 1,
          alignment: 0,
          gold: 100,
          skillPoints: 0,
          attributePoints: 0,
        },
        attributes: {
          strength: 10,
          dexterity: 10,
          intelligence: 10,
          vitality: 10,
        },
        isDead: false,
        lastSaved: Date.now(),
      };

      const saved = saveSave(testData);
      expect(saved).toBe(true);

      const loaded = loadSave();
      expect(loaded).toEqual(testData);
    });

    it('should return null when no save exists', () => {
      const loaded = loadSave();
      expect(loaded).toBeNull();
    });

    it('should clear save', () => {
      saveSave({
        characterId: 'test',
        characterData: {
          id: 'test',
          name: 'Test',
          slotNumber: 1,
          currentZone: 'starting_area',
          totalPlayTime: 0,
          enemiesKilled: 0,
          deaths: 0,
          questsCompleted: 0,
          distanceTraveled: 0,
        },
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
        isDead: false,
        lastSaved: Date.now(),
      });

      clearSave();
      expect(loadSave()).toBeNull();
    });
  });

  describe('Character List', () => {
    it('should load empty list when none exists', () => {
      const list = loadCharacterList();
      expect(list).toEqual([]);
    });

    it('should save and load character list', () => {
      const characters: CharacterSummary[] = [
        {
          id: 'char-1',
          name: 'Hero',
          slotNumber: 1,
          level: 5,
          currentZone: 'forest',
          totalPlayTime: 7200,
          lastPlayed: Date.now(),
        },
        {
          id: 'char-2',
          name: 'Mage',
          slotNumber: 2,
          level: 3,
          currentZone: 'starting_area',
          totalPlayTime: 3600,
          lastPlayed: Date.now() - 86400000,
        },
      ];

      const saved = saveCharacterList(characters);
      expect(saved).toBe(true);

      const loaded = loadCharacterList();
      expect(loaded).toEqual(characters);
    });
  });

  describe('createCharacter', () => {
    it('should create a new character', () => {
      const attributes: CharacterAttributes = {
        strength: 12,
        dexterity: 10,
        intelligence: 8,
        vitality: 10,
      };

      const character = createCharacter('NewHero', attributes);

      expect(character.name).toBe('NewHero');
      expect(character.level).toBe(1);
      expect(character.currentZone).toBe('starting_area');
      expect(character.id).toMatch(/^char_/);
    });

    it('should assign correct slot number', () => {
      const attributes: CharacterAttributes = {
        strength: 10,
        dexterity: 10,
        intelligence: 10,
        vitality: 10,
      };

      const char1 = createCharacter('First', attributes);
      expect(char1.slotNumber).toBe(1);

      const char2 = createCharacter('Second', attributes);
      expect(char2.slotNumber).toBe(2);
    });

    it('should create initial save data for character', () => {
      const attributes: CharacterAttributes = {
        strength: 10,
        dexterity: 12,
        intelligence: 11,
        vitality: 7,
      };

      const character = createCharacter('Test', attributes);
      const saveData = loadCharacterSave(character.id);

      expect(saveData).not.toBeNull();
      expect(saveData?.characterId).toBe(character.id);
      expect(saveData?.attributes).toEqual(attributes);
    });

    it('should calculate initial stats based on attributes', () => {
      const attributes: CharacterAttributes = {
        strength: 10,
        dexterity: 12,
        intelligence: 11,
        vitality: 15,
      };

      const character = createCharacter('StatsTest', attributes);
      const saveData = loadCharacterSave(character.id);

      // HP: 100 + vitality * 5 = 100 + 75 = 175
      expect(saveData?.stats.maxHealth).toBe(175);
      // Stamina: 100 + dexterity * 2 = 100 + 24 = 124
      expect(saveData?.stats.maxStamina).toBe(124);
      // Mana: 50 + intelligence * 3 = 50 + 33 = 83
      expect(saveData?.stats.maxMana).toBe(83);
    });

    it('should add character to character list', () => {
      const attributes: CharacterAttributes = {
        strength: 10,
        dexterity: 10,
        intelligence: 10,
        vitality: 10,
      };

      createCharacter('ListTest', attributes);

      const list = loadCharacterList();
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('ListTest');
    });
  });

  describe('deleteCharacter', () => {
    it('should delete existing character', () => {
      const attributes: CharacterAttributes = {
        strength: 10,
        dexterity: 10,
        intelligence: 10,
        vitality: 10,
      };

      const character = createCharacter('ToDelete', attributes);
      expect(loadCharacterList()).toHaveLength(1);

      const result = deleteCharacter(character.id);

      expect(result).toBe(true);
      expect(loadCharacterList()).toHaveLength(0);
    });

    it('should return false for non-existent character', () => {
      const result = deleteCharacter('non-existent-id');
      expect(result).toBe(false);
    });

    it('should remove character save data', () => {
      const attributes: CharacterAttributes = {
        strength: 10,
        dexterity: 10,
        intelligence: 10,
        vitality: 10,
      };

      const character = createCharacter('ToDelete', attributes);
      expect(loadCharacterSave(character.id)).not.toBeNull();

      deleteCharacter(character.id);

      expect(loadCharacterSave(character.id)).toBeNull();
    });
  });

  describe('Character Save/Load', () => {
    it('should save and load character-specific data', () => {
      const characterId = 'test-char-123';
      const saveData: SaveData = {
        characterId,
        characterData: {
          id: characterId,
          name: 'SaveTest',
          slotNumber: 1,
          currentZone: 'forest',
          totalPlayTime: 5000,
          enemiesKilled: 50,
          deaths: 3,
          questsCompleted: 10,
          distanceTraveled: 5000,
        },
        position: { x: 50, y: 2, z: 50 },
        rotation: 1.5,
        respawnPoint: { x: 0, y: 2, z: 0 },
        stats: {
          health: 75,
          maxHealth: 150,
          stamina: 80,
          maxStamina: 120,
          mana: 30,
          maxMana: 80,
          xp: 75,
          xpToNextLevel: 200,
          level: 3,
          alignment: 25,
          gold: 500,
          skillPoints: 2,
          attributePoints: 0,
        },
        attributes: {
          strength: 12,
          dexterity: 11,
          intelligence: 13,
          vitality: 14,
        },
        isDead: false,
        lastSaved: Date.now(),
      };

      // First create the character in the list
      saveCharacterList([
        {
          id: characterId,
          name: 'SaveTest',
          slotNumber: 1,
          level: 3,
          currentZone: 'forest',
          totalPlayTime: 5000,
          lastPlayed: Date.now(),
        },
      ]);

      const saved = saveCharacterSave(characterId, saveData);
      expect(saved).toBe(true);

      const loaded = loadCharacterSave(characterId);
      expect(loaded).toEqual(saveData);
    });

    it('should update character summary on save', () => {
      const attributes: CharacterAttributes = {
        strength: 10,
        dexterity: 10,
        intelligence: 10,
        vitality: 10,
      };

      const character = createCharacter('SummaryTest', attributes);
      const saveData = loadCharacterSave(character.id)!;

      // Modify save data
      saveData.stats.level = 5;
      saveData.characterData.currentZone = 'desert';
      saveData.characterData.totalPlayTime = 10000;

      saveCharacterSave(character.id, saveData);

      const summary = loadCharacterList().find((c) => c.id === character.id);
      expect(summary?.level).toBe(5);
      expect(summary?.currentZone).toBe('desert');
      expect(summary?.totalPlayTime).toBe(10000);
    });

    it('should return null for non-existent character save', () => {
      const loaded = loadCharacterSave('non-existent');
      expect(loaded).toBeNull();
    });
  });
});

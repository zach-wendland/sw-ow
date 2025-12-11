"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  loadCharacterList,
  createCharacter,
  deleteCharacter,
  type CharacterSummary,
  type CharacterAttributes,
} from "@/lib/storage/localStorage";

// ============================================================================
// TYPES
// ============================================================================

export interface PlayerSettings {
  graphics: {
    quality: string;
    shadows: boolean;
    particles: boolean;
    viewDistance: number;
  };
  audio: {
    master: number;
    music: number;
    sfx: number;
    voice: number;
  };
  controls: {
    mouseSensitivity: number;
    invertY: boolean;
  };
}

// Re-export for compatibility
export type { CharacterSummary };

export interface GameState {
  characters: CharacterSummary[];
  activeCharacterId: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface GameContextType extends GameState {
  // Character actions
  refreshCharacters: () => void;
  selectCharacter: (characterId: string) => void;
  createNewCharacter: (name: string, attributes: CharacterAttributes) => CharacterSummary;
  deleteCharacterById: (characterId: string) => boolean;
  clearError: () => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const GameContext = createContext<GameContextType | null>(null);

export function useAuth() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<GameState>({
    characters: [],
    activeCharacterId: null,
    isLoading: true,
    error: null,
  });

  // ============================================================================
  // LOAD CHARACTERS ON MOUNT
  // ============================================================================

  useEffect(() => {
    const characters = loadCharacterList();
    const savedCharacterId =
      typeof window !== "undefined"
        ? localStorage.getItem("activeCharacterId")
        : null;

    setState({
      characters,
      activeCharacterId: savedCharacterId,
      isLoading: false,
      error: null,
    });
  }, []);

  // ============================================================================
  // CHARACTER ACTIONS
  // ============================================================================

  const refreshCharacters = useCallback(() => {
    const characters = loadCharacterList();
    setState((prev) => ({ ...prev, characters }));
  }, []);

  const selectCharacter = useCallback((characterId: string) => {
    setState((prev) => ({ ...prev, activeCharacterId: characterId }));
    localStorage.setItem("activeCharacterId", characterId);
  }, []);

  const createNewCharacter = useCallback(
    (name: string, attributes: CharacterAttributes) => {
      const newCharacter = createCharacter(name, attributes);
      setState((prev) => ({
        ...prev,
        characters: [...prev.characters, newCharacter],
      }));
      return newCharacter;
    },
    []
  );

  const deleteCharacterById = useCallback((characterId: string) => {
    const success = deleteCharacter(characterId);
    if (success) {
      setState((prev) => ({
        ...prev,
        characters: prev.characters.filter((c) => c.id !== characterId),
        activeCharacterId:
          prev.activeCharacterId === characterId ? null : prev.activeCharacterId,
      }));
    }
    return success;
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value: GameContextType = {
    ...state,
    refreshCharacters,
    selectCharacter,
    createNewCharacter,
    deleteCharacterById,
    clearError,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

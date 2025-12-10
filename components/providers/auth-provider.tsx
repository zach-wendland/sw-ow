"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { User, Session, AuthError } from "@supabase/supabase-js";

// ============================================================================
// TYPES
// ============================================================================

export interface Player {
  id: string;
  auth_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  settings: PlayerSettings;
  total_play_time_seconds: number;
  last_login: string | null;
  login_count: number;
  created_at: string;
  updated_at: string;
}

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

export interface CharacterSummary {
  id: string;
  name: string;
  slot_number: number;
  level: number;
  current_zone: string;
  total_play_time_seconds: number;
  last_played_at: string;
  alignment: number;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  player: Player | null;
  characters: CharacterSummary[];
  activeCharacterId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  // Auth actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithProvider: (provider: "google" | "discord" | "github") => Promise<void>;

  // Player actions
  refreshPlayer: () => Promise<void>;
  updatePlayer: (updates: Partial<Player>) => Promise<void>;

  // Character actions
  refreshCharacters: () => Promise<void>;
  selectCharacter: (characterId: string) => void;
  clearError: () => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
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
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    player: null,
    characters: [],
    activeCharacterId: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  const supabase = getSupabase();

  // ============================================================================
  // FETCH PLAYER DATA
  // ============================================================================

  const fetchPlayer = useCallback(async (userId: string): Promise<Player | null> => {
    try {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("auth_id", userId)
        .single();

      if (error) {
        console.error("Error fetching player:", error);
        return null;
      }

      return data as Player;
    } catch (err) {
      console.error("Failed to fetch player:", err);
      return null;
    }
  }, [supabase]);

  const fetchCharacters = useCallback(async (playerId: string): Promise<CharacterSummary[]> => {
    try {
      const { data, error } = await supabase
        .from("characters")
        .select("id, name, slot_number, level, current_zone, total_play_time_seconds, last_played_at, alignment")
        .eq("player_id", playerId)
        .order("slot_number");

      if (error) {
        console.error("Error fetching characters:", error);
        return [];
      }

      return data as CharacterSummary[];
    } catch (err) {
      console.error("Failed to fetch characters:", err);
      return [];
    }
  }, [supabase]);

  // ============================================================================
  // AUTH STATE LISTENER
  // ============================================================================

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const player = await fetchPlayer(session.user.id);
        const characters = player ? await fetchCharacters(player.id) : [];

        // Restore active character from localStorage
        const savedCharacterId = typeof window !== "undefined"
          ? localStorage.getItem("activeCharacterId")
          : null;

        setState({
          user: session.user,
          session,
          player,
          characters,
          activeCharacterId: savedCharacterId,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isAuthenticated: false,
        }));
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[Auth] State changed:", event);

        if (event === "SIGNED_IN" && session?.user) {
          const player = await fetchPlayer(session.user.id);
          const characters = player ? await fetchCharacters(player.id) : [];

          setState({
            user: session.user,
            session,
            player,
            characters,
            activeCharacterId: null,
            isLoading: false,
            isAuthenticated: true,
            error: null,
          });
        } else if (event === "SIGNED_OUT") {
          localStorage.removeItem("activeCharacterId");
          setState({
            user: null,
            session: null,
            player: null,
            characters: [],
            activeCharacterId: null,
            isLoading: false,
            isAuthenticated: false,
            error: null,
          });
        } else if (event === "TOKEN_REFRESHED" && session) {
          setState((prev) => ({
            ...prev,
            session,
          }));
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchPlayer, fetchCharacters]);

  // ============================================================================
  // AUTH ACTIONS
  // ============================================================================

  const signIn = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (err) {
      const error = err as AuthError;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || "Failed to sign in",
      }));
      throw error;
    }
  }, [supabase]);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            display_name: username,
          },
        },
      });

      if (error) throw error;
    } catch (err) {
      const error = err as AuthError;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || "Failed to sign up",
      }));
      throw error;
    }
  }, [supabase]);

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      const error = err as AuthError;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || "Failed to sign out",
      }));
      throw error;
    }
  }, [supabase]);

  const signInWithProvider = useCallback(async (provider: "google" | "discord" | "github") => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (err) {
      const error = err as AuthError;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || "Failed to sign in with provider",
      }));
      throw error;
    }
  }, [supabase]);

  // ============================================================================
  // PLAYER ACTIONS
  // ============================================================================

  const refreshPlayer = useCallback(async () => {
    if (!state.user) return;

    const player = await fetchPlayer(state.user.id);
    if (player) {
      setState((prev) => ({ ...prev, player }));
    }
  }, [state.user, fetchPlayer]);

  const updatePlayer = useCallback(async (updates: Partial<Player>) => {
    if (!state.player) return;

    try {
      const { data, error } = await supabase
        .from("players")
        .update(updates)
        .eq("id", state.player.id)
        .select()
        .single();

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        player: data as Player,
      }));
    } catch (err) {
      console.error("Failed to update player:", err);
      throw err;
    }
  }, [state.player, supabase]);

  // ============================================================================
  // CHARACTER ACTIONS
  // ============================================================================

  const refreshCharacters = useCallback(async () => {
    if (!state.player) return;

    const characters = await fetchCharacters(state.player.id);
    setState((prev) => ({ ...prev, characters }));
  }, [state.player, fetchCharacters]);

  const selectCharacter = useCallback((characterId: string) => {
    setState((prev) => ({ ...prev, activeCharacterId: characterId }));
    localStorage.setItem("activeCharacterId", characterId);
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    signInWithProvider,
    refreshPlayer,
    updatePlayer,
    refreshCharacters,
    selectCharacter,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

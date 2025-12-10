/**
 * Database types for Supabase.
 *
 * Run `npx supabase gen types typescript --project-id your-project-id > lib/supabase/types.ts`
 * to regenerate after schema changes.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
          auth_id: string;
          username: string;
          email: string | null;
          avatar_url: string | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_id: string;
          username: string;
          email?: string | null;
          avatar_url?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_id?: string;
          username?: string;
          email?: string | null;
          avatar_url?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      characters: {
        Row: {
          id: string;
          player_id: string;
          name: string;
          class: string;
          level: number;
          xp: number;
          health: number;
          max_health: number;
          stamina: number;
          max_stamina: number;
          position_x: number;
          position_y: number;
          position_z: number;
          rotation_y: number;
          alignment: number;
          stats: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          name: string;
          class?: string;
          level?: number;
          xp?: number;
          health?: number;
          max_health?: number;
          stamina?: number;
          max_stamina?: number;
          position_x?: number;
          position_y?: number;
          position_z?: number;
          rotation_y?: number;
          alignment?: number;
          stats?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          name?: string;
          class?: string;
          level?: number;
          xp?: number;
          health?: number;
          max_health?: number;
          stamina?: number;
          max_stamina?: number;
          position_x?: number;
          position_y?: number;
          position_z?: number;
          rotation_y?: number;
          alignment?: number;
          stats?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      inventory: {
        Row: {
          id: string;
          character_id: string;
          item_def_id: string;
          quantity: number;
          equipped: boolean;
          slot: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          character_id: string;
          item_def_id: string;
          quantity?: number;
          equipped?: boolean;
          slot?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          character_id?: string;
          item_def_id?: string;
          quantity?: number;
          equipped?: boolean;
          slot?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
      quests: {
        Row: {
          id: string;
          character_id: string;
          quest_def_id: string;
          status: string;
          progress: Json;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          character_id: string;
          quest_def_id: string;
          status?: string;
          progress?: Json;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          character_id?: string;
          quest_def_id?: string;
          status?: string;
          progress?: Json;
          started_at?: string;
          completed_at?: string | null;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

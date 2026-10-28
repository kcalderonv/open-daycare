export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      children: {
        Row: {
          allergy_tags: string[]
          birth_date: string
          created_at: string
          daycare_id: string
          enrolled_at: string
          full_name: string
          id: string
          medical_notes: string | null
          photo_consent: boolean
          room_id: string | null
          status: Database["public"]["Enums"]["child_status"]
          updated_at: string
        }
        Insert: {
          allergy_tags?: string[]
          birth_date: string
          created_at?: string
          daycare_id: string
          enrolled_at?: string
          full_name: string
          id?: string
          medical_notes?: string | null
          photo_consent?: boolean
          room_id?: string | null
          status?: Database["public"]["Enums"]["child_status"]
          updated_at?: string
        }
        Update: {
          allergy_tags?: string[]
          birth_date?: string
          created_at?: string
          daycare_id?: string
          enrolled_at?: string
          full_name?: string
          id?: string
          medical_notes?: string | null
          photo_consent?: boolean
          room_id?: string | null
          status?: Database["public"]["Enums"]["child_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_daycare_fkey"
            columns: ["daycare_id"]
            isOneToOne: false
            referencedRelation: "daycares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_room_fkey"
            columns: ["room_id", "daycare_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id", "daycare_id"]
          },
        ]
      }
      daycares: {
        Row: {
          address: string | null
          city: string | null
          country: string
          created_at: string
          email: string | null
          id: string
          locale: string
          name: string
          phone: string | null
          slug: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country: string
          created_at?: string
          email?: string | null
          id?: string
          locale: string
          name: string
          phone?: string | null
          slug: string
          status?: string
          timezone: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string
          created_at?: string
          email?: string | null
          id?: string
          locale?: string
          name?: string
          phone?: string | null
          slug?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          child_id: string
          code: string
          created_at: string
          daycare_id: string
          email: string
          expires_at: string
          full_name: string
          id: string
          invited_by: string
          relationship: Database["public"]["Enums"]["relationship_type"]
          sent_at: string | null
          status: Database["public"]["Enums"]["invitation_status"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          child_id: string
          code: string
          created_at?: string
          daycare_id: string
          email: string
          expires_at?: string
          full_name: string
          id?: string
          invited_by: string
          relationship: Database["public"]["Enums"]["relationship_type"]
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          child_id?: string
          code?: string
          created_at?: string
          daycare_id?: string
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          invited_by?: string
          relationship?: Database["public"]["Enums"]["relationship_type"]
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_child_fkey"
            columns: ["child_id", "daycare_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id", "daycare_id"]
          },
          {
            foreignKeyName: "invitations_daycare_fkey"
            columns: ["daycare_id"]
            isOneToOne: false
            referencedRelation: "daycares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_children: {
        Row: {
          child_id: string
          created_at: string
          id: string
          parent_id: string
          relationship: Database["public"]["Enums"]["relationship_type"]
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          parent_id: string
          relationship: Database["public"]["Enums"]["relationship_type"]
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          parent_id?: string
          relationship?: Database["public"]["Enums"]["relationship_type"]
        }
        Relationships: [
          {
            foreignKeyName: "parent_children_child_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_children_parent_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_children: {
        Row: {
          child_id: string
          daycare_id: string
          post_id: string
        }
        Insert: {
          child_id: string
          daycare_id: string
          post_id: string
        }
        Update: {
          child_id?: string
          daycare_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_children_child_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_children_daycare_fkey"
            columns: ["daycare_id"]
            isOneToOne: false
            referencedRelation: "daycares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_children_post_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_photos: {
        Row: {
          created_at: string
          daycare_id: string
          height: number | null
          id: string
          position: number
          post_id: string
          storage_path: string
          width: number | null
        }
        Insert: {
          created_at?: string
          daycare_id: string
          height?: number | null
          id?: string
          position: number
          post_id: string
          storage_path: string
          width?: number | null
        }
        Update: {
          created_at?: string
          daycare_id?: string
          height?: number | null
          id?: string
          position?: number
          post_id?: string
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_photos_daycare_fkey"
            columns: ["daycare_id"]
            isOneToOne: false
            referencedRelation: "daycares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_photos_post_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          daycare_id: string
          id: string
          published_at: string
          room_id: string | null
          room_wide: boolean
          title: string | null
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          daycare_id: string
          id?: string
          published_at?: string
          room_id?: string | null
          room_wide?: boolean
          title?: string | null
          type: Database["public"]["Enums"]["post_type"]
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          daycare_id?: string
          id?: string
          published_at?: string
          room_id?: string | null
          room_wide?: boolean
          title?: string | null
          type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_daycare_fkey"
            columns: ["daycare_id"]
            isOneToOne: false
            referencedRelation: "daycares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_room_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          daycare_id: string
          id: string
          name: string
          position: number
          slug: string
        }
        Insert: {
          created_at?: string
          daycare_id: string
          id?: string
          name: string
          position?: number
          slug: string
        }
        Update: {
          created_at?: string
          daycare_id?: string
          id?: string
          name?: string
          position?: number
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_daycare_fkey"
            columns: ["daycare_id"]
            isOneToOne: false
            referencedRelation: "daycares"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          daily_summary_enabled: boolean
          daycare_id: string
          full_name: string
          id: string
          notify_on_post: boolean
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          daily_summary_enabled?: boolean
          daycare_id: string
          full_name: string
          id?: string
          notify_on_post?: boolean
          role: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          daily_summary_enabled?: boolean
          daycare_id?: string
          full_name?: string
          id?: string
          notify_on_post?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_daycare_fkey"
            columns: ["daycare_id"]
            isOneToOne: false
            referencedRelation: "daycares"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { p_code: string }; Returns: undefined }
      create_post: {
        Args: {
          p_body: string
          p_child_ids: string[]
          p_photos: Json
          p_room_id: string
          p_room_wide: boolean
          p_type: Database["public"]["Enums"]["post_type"]
        }
        Returns: string
      }
      current_daycare_id: { Args: never; Returns: string }
      current_staff_daycare_id: { Args: never; Returns: string }
      daycare_overview: {
        Args: never
        Returns: {
          children_count: number
          name: string
        }[]
      }
      email_has_account: { Args: { p_email: string }; Returns: boolean }
      family_overview: {
        Args: never
        Returns: {
          child_id: string
          daycare_name: string
          first_name: string
          relationship: Database["public"]["Enums"]["relationship_type"]
          room_id: string
          room_name: string
        }[]
      }
      get_invitation_preview: {
        Args: { p_code: string }
        Returns: {
          child_first_name: string
          child_full_name: string
          email: string
          parent_full_name: string
          room_name: string
          status: string
        }[]
      }
      post_is_own: {
        Args: { p_daycare_id: string; p_post_id: string }
        Returns: boolean
      }
    }
    Enums: {
      child_status: "active" | "archived"
      invitation_status: "pending" | "accepted" | "expired" | "cancelled"
      post_type:
        | "meal"
        | "nap"
        | "activity"
        | "achievement"
        | "mood"
        | "photo"
        | "announcement"
      relationship_type: "father" | "mother" | "guardian"
      user_role: "admin" | "staff" | "parent"
      user_status: "pending" | "active"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      child_status: ["active", "archived"],
      invitation_status: ["pending", "accepted", "expired", "cancelled"],
      post_type: [
        "meal",
        "nap",
        "activity",
        "achievement",
        "mood",
        "photo",
        "announcement",
      ],
      relationship_type: ["father", "mother", "guardian"],
      user_role: ["admin", "staff", "parent"],
      user_status: ["pending", "active"],
    },
  },
} as const

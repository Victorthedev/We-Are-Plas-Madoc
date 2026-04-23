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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action_type: string
          content_id: string | null
          content_title: string | null
          content_type: string
          created_at: string
          id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action_type: string
          content_id?: string | null
          content_title?: string | null
          content_type: string
          created_at?: string
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action_type?: string
          content_id?: string | null
          content_title?: string | null
          content_type?: string
          created_at?: string
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      event_rsvps: {
        Row: {
          cancellation_token: string
          created_at: string
          email: string
          event_id: string
          first_name: string
          id: string
          last_name: string
          party_size: number
          phone: string | null
          reminder_sent: boolean
        }
        Insert: {
          cancellation_token?: string
          created_at?: string
          email: string
          event_id: string
          first_name: string
          id?: string
          last_name?: string
          party_size?: number
          phone?: string | null
          reminder_sent?: boolean
        }
        Update: {
          cancellation_token?: string
          created_at?: string
          email?: string
          event_id?: string
          first_name?: string
          id?: string
          last_name?: string
          party_size?: number
          phone?: string | null
          reminder_sent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          end_datetime: string | null
          event_type: string | null
          external_link: string | null
          id: string
          is_free: boolean | null
          location: string | null
          poster_image_url: string | null
          start_datetime: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_datetime?: string | null
          event_type?: string | null
          external_link?: string | null
          id?: string
          is_free?: boolean | null
          location?: string | null
          poster_image_url?: string | null
          start_datetime: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_datetime?: string | null
          event_type?: string | null
          external_link?: string | null
          id?: string
          is_free?: boolean | null
          location?: string | null
          poster_image_url?: string | null
          start_datetime?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          caption: string | null
          category: string | null
          created_at: string
          display_order: number | null
          id: string
          image_url: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          category?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          image_url: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          category?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          read: boolean | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          read?: boolean | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          read?: boolean | null
          subject?: string | null
        }
        Relationships: []
      }
      news_posts: {
        Row: {
          author_id: string | null
          category: string | null
          content: string | null
          created_at: string
          excerpt: string | null
          featured: boolean | null
          featured_image_url: string | null
          id: string
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean | null
          featured_image_url?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean | null
          featured_image_url?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          last_sign_in: string | null
          notification_preferences: Json | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          last_sign_in?: string | null
          notification_preferences?: Json | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_sign_in?: string | null
          notification_preferences?: Json | null
        }
        Relationships: []
      }
      services: {
        Row: {
          contact_info: string | null
          content: string | null
          description: string | null
          display_order: number | null
          how_to_access: string | null
          icon: string | null
          id: string
          image_url: string | null
          name: string
          opening_hours: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          contact_info?: string | null
          content?: string | null
          description?: string | null
          display_order?: number | null
          how_to_access?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name: string
          opening_hours?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          contact_info?: string | null
          content?: string | null
          description?: string | null
          display_order?: number | null
          how_to_access?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string
          opening_hours?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          bio: string | null
          display_order: number | null
          id: string
          is_trustee: boolean | null
          name: string
          photo_url: string | null
          role: string
          social_link: string | null
        }
        Insert: {
          bio?: string | null
          display_order?: number | null
          id?: string
          is_trustee?: boolean | null
          name: string
          photo_url?: string | null
          role: string
          social_link?: string | null
        }
        Update: {
          bio?: string | null
          display_order?: number | null
          id?: string
          is_trustee?: boolean | null
          name?: string
          photo_url?: string | null
          role?: string
          social_link?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      volunteer_positions: {
        Row: {
          commitment: string
          created_at: string | null
          display_order: number
          id: string
          involved: string
          is_active: boolean
          requirements: string
          title: string
          updated_at: string | null
        }
        Insert: {
          commitment: string
          created_at?: string | null
          display_order?: number
          id?: string
          involved?: string
          is_active?: boolean
          requirements?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          commitment?: string
          created_at?: string | null
          display_order?: number
          id?: string
          involved?: string
          is_active?: boolean
          requirements?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      volunteers: {
        Row: {
          created_at: string
          cv_link: string | null
          email: string
          first_name: string
          id: string
          internal_notes: string | null
          last_name: string
          message: string | null
          phone: string
          position: string
          start_date: string | null
          status: string
        }
        Insert: {
          created_at?: string
          cv_link?: string | null
          email: string
          first_name: string
          id?: string
          internal_notes?: string | null
          last_name: string
          message?: string | null
          phone: string
          position: string
          start_date?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          cv_link?: string | null
          email?: string
          first_name?: string
          id?: string
          internal_notes?: string | null
          last_name?: string
          message?: string | null
          phone?: string
          position?: string
          start_date?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "editor" | "contributor" | "gallery_only"
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
      app_role: ["super_admin", "editor", "contributor", "gallery_only"],
    },
  },
} as const

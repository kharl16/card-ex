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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analytics_daily: {
        Row: {
          card_id: string
          cta_clicks: number | null
          date: string
          id: string
          qr_scans: number | null
          vcard_downloads: number | null
          views: number | null
        }
        Insert: {
          card_id: string
          cta_clicks?: number | null
          date: string
          id?: string
          qr_scans?: number | null
          vcard_downloads?: number | null
          views?: number | null
        }
        Update: {
          card_id?: string
          cta_clicks?: number | null
          date?: string
          id?: string
          qr_scans?: number | null
          vcard_downloads?: number | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_daily_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      "Branches and IBCs": {
        Row: {
          Address: string | null
          "Facebook Page": string | null
          id: number
          Location: string | null
          "Maps Link": string | null
          "Operating Hours": string | null
          Owner: string | null
          "Phone 1": string | null
          "Phone 2": string | null
          "Phone 3": string | null
          Sites: string | null
        }
        Insert: {
          Address?: string | null
          "Facebook Page"?: string | null
          id: number
          Location?: string | null
          "Maps Link"?: string | null
          "Operating Hours"?: string | null
          Owner?: string | null
          "Phone 1"?: string | null
          "Phone 2"?: string | null
          "Phone 3"?: string | null
          Sites?: string | null
        }
        Update: {
          Address?: string | null
          "Facebook Page"?: string | null
          id?: number
          Location?: string | null
          "Maps Link"?: string | null
          "Operating Hours"?: string | null
          Owner?: string | null
          "Phone 1"?: string | null
          "Phone 2"?: string | null
          "Phone 3"?: string | null
          Sites?: string | null
        }
        Relationships: []
      }
      card_events: {
        Row: {
          card_id: string
          created_at: string
          event_type: string
          id: string
          ip_hash: string | null
          link_id: string | null
          referrer: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          card_id: string
          created_at?: string
          event_type: string
          id?: string
          ip_hash?: string | null
          link_id?: string | null
          referrer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          card_id?: string
          created_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          link_id?: string | null
          referrer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_events_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_events_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "card_links"
            referencedColumns: ["id"]
          },
        ]
      }
      card_links: {
        Row: {
          card_id: string
          created_at: string
          icon: string | null
          id: string
          label: string
          position: number
          type: string
          value: string
        }
        Insert: {
          card_id: string
          created_at?: string
          icon?: string | null
          id?: string
          label: string
          position?: number
          type: string
          value: string
        }
        Update: {
          card_id?: string
          created_at?: string
          icon?: string | null
          id?: string
          label?: string
          position?: number
          type?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_links_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company: string | null
          cover_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_published: boolean | null
          location: string | null
          logo_url: string | null
          organization_id: string | null
          phone: string | null
          qr_code_url: string | null
          slug: string
          theme: Json | null
          title: string | null
          updated_at: string
          user_id: string
          vcard_url: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          cover_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_published?: boolean | null
          location?: string | null
          logo_url?: string | null
          organization_id?: string | null
          phone?: string | null
          qr_code_url?: string | null
          slug: string
          theme?: Json | null
          title?: string | null
          updated_at?: string
          user_id: string
          vcard_url?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          cover_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_published?: boolean | null
          location?: string | null
          logo_url?: string | null
          organization_id?: string | null
          phone?: string | null
          qr_code_url?: string | null
          slug?: string
          theme?: Json | null
          title?: string | null
          updated_at?: string
          user_id?: string
          vcard_url?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      Files: {
        Row: {
          "Check Match": string | null
          Description: string | null
          "Drive Link Download": string | null
          "Drive Link share": string | null
          "File Name": string | null
          "Folder Name": string | null
          "Give Me 5": string | null
          id: number
          Images: string | null
          Infinity: string | null
          "Just 4 You": string | null
          "Package Points (SMC)": string | null
          "Price (DP)": string | null
          "Price (SRP)": string | null
          RQV: string | null
          "Unilevel Points": number | null
          "View Video URL": string | null
          "Wholesale Package Commission": string | null
        }
        Insert: {
          "Check Match"?: string | null
          Description?: string | null
          "Drive Link Download"?: string | null
          "Drive Link share"?: string | null
          "File Name"?: string | null
          "Folder Name"?: string | null
          "Give Me 5"?: string | null
          id: number
          Images?: string | null
          Infinity?: string | null
          "Just 4 You"?: string | null
          "Package Points (SMC)"?: string | null
          "Price (DP)"?: string | null
          "Price (SRP)"?: string | null
          RQV?: string | null
          "Unilevel Points"?: number | null
          "View Video URL"?: string | null
          "Wholesale Package Commission"?: string | null
        }
        Update: {
          "Check Match"?: string | null
          Description?: string | null
          "Drive Link Download"?: string | null
          "Drive Link share"?: string | null
          "File Name"?: string | null
          "Folder Name"?: string | null
          "Give Me 5"?: string | null
          id?: number
          Images?: string | null
          Infinity?: string | null
          "Just 4 You"?: string | null
          "Package Points (SMC)"?: string | null
          "Price (DP)"?: string | null
          "Price (SRP)"?: string | null
          RQV?: string | null
          "Unilevel Points"?: number | null
          "View Video URL"?: string | null
          "Wholesale Package Commission"?: string | null
        }
        Relationships: []
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_tokens: {
        Row: {
          attempts: number | null
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          phone: string
        }
        Insert: {
          attempts?: number | null
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
        }
        Update: {
          attempts?: number | null
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          phone_verified: boolean | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          phone_verified?: boolean | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          phone_verified?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

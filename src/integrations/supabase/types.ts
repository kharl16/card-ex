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
          day: string
          id: string
          qr_scans: number | null
          unique_views: number | null
          vcard_downloads: number | null
          views: number | null
        }
        Insert: {
          card_id: string
          cta_clicks?: number | null
          day: string
          id?: string
          qr_scans?: number | null
          unique_views?: number | null
          vcard_downloads?: number | null
          views?: number | null
        }
        Update: {
          card_id?: string
          cta_clicks?: number | null
          day?: string
          id?: string
          qr_scans?: number | null
          unique_views?: number | null
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
          created_at: string | null
          id: string
          ip_hash: string | null
          kind: Database["public"]["Enums"]["event_kind"]
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          card_id: string
          created_at?: string | null
          id?: string
          ip_hash?: string | null
          kind: Database["public"]["Enums"]["event_kind"]
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          card_id?: string
          created_at?: string | null
          id?: string
          ip_hash?: string | null
          kind?: Database["public"]["Enums"]["event_kind"]
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_events_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_links: {
        Row: {
          card_id: string
          created_at: string | null
          icon: string | null
          id: string
          kind: Database["public"]["Enums"]["link_kind"]
          label: string
          sort_index: number | null
          value: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          icon?: string | null
          id?: string
          kind: Database["public"]["Enums"]["link_kind"]
          label: string
          sort_index?: number | null
          value: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["link_kind"]
          label?: string
          sort_index?: number | null
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
          unique_views: number | null
          updated_at: string
          user_id: string
          vcard_url: string | null
          views_count: number | null
          wallet_pass_url: string | null
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
          unique_views?: number | null
          updated_at?: string
          user_id: string
          vcard_url?: string | null
          views_count?: number | null
          wallet_pass_url?: string | null
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
          unique_views?: number | null
          updated_at?: string
          user_id?: string
          vcard_url?: string | null
          views_count?: number | null
          wallet_pass_url?: string | null
          website?: string | null
        }
        Relationships: [
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
          created_at: string | null
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
          created_at: string | null
          created_by: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          theme_color: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          theme_color?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          theme_color?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
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
          is_super_admin: boolean | null
          phone: string | null
          phone_verified: boolean | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_super_admin?: boolean | null
          phone?: string | null
          phone_verified?: boolean | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_super_admin?: boolean | null
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
      app_role: "owner" | "admin" | "member"
      event_kind:
        | "view"
        | "qr_scan"
        | "vcard_download"
        | "cta_click"
        | "unique_view"
      link_kind:
        | "phone"
        | "sms"
        | "email"
        | "url"
        | "whatsapp"
        | "messenger"
        | "telegram"
        | "viber"
        | "facebook"
        | "instagram"
        | "tiktok"
        | "x"
        | "youtube"
        | "linkedin"
        | "custom"
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
      app_role: ["owner", "admin", "member"],
      event_kind: [
        "view",
        "qr_scan",
        "vcard_download",
        "cta_click",
        "unique_view",
      ],
      link_kind: [
        "phone",
        "sms",
        "email",
        "url",
        "whatsapp",
        "messenger",
        "telegram",
        "viber",
        "facebook",
        "instagram",
        "tiktok",
        "x",
        "youtube",
        "linkedin",
        "custom",
      ],
    },
  },
} as const

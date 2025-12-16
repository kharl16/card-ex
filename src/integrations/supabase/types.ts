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
      app_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
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
          share_code: string | null
          user_agent: string | null
        }
        Insert: {
          card_id: string
          created_at?: string | null
          id?: string
          ip_hash?: string | null
          kind: Database["public"]["Enums"]["event_kind"]
          referrer?: string | null
          share_code?: string | null
          user_agent?: string | null
        }
        Update: {
          card_id?: string
          created_at?: string | null
          id?: string
          ip_hash?: string | null
          kind?: Database["public"]["Enums"]["event_kind"]
          referrer?: string | null
          share_code?: string | null
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
      card_images: {
        Row: {
          card_id: string
          created_at: string
          id: string
          sort_index: number
          url: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          sort_index?: number
          url: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          sort_index?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_images_card_id_fkey"
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
      card_plans: {
        Row: {
          code: string
          created_at: string
          description: string | null
          has_reseller_access: boolean
          id: string
          is_active: boolean
          name: string
          profit: number
          referral_eligible: boolean
          retail_price: number
          updated_at: string
          wholesale_price: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          has_reseller_access?: boolean
          id?: string
          is_active?: boolean
          name: string
          profit: number
          referral_eligible?: boolean
          retail_price: number
          updated_at?: string
          wholesale_price: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          has_reseller_access?: boolean
          id?: string
          is_active?: boolean
          name?: string
          profit?: number
          referral_eligible?: boolean
          retail_price?: number
          updated_at?: string
          wholesale_price?: number
        }
        Relationships: []
      }
      card_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_global: boolean
          layout_data: Json
          name: string
          owner_id: string
          thumbnail_url: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_global?: boolean
          layout_data: Json
          name: string
          owner_id: string
          thumbnail_url?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_global?: boolean
          layout_data?: Json
          name?: string
          owner_id?: string
          thumbnail_url?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      cards: {
        Row: {
          avatar_url: string | null
          bio: string | null
          card_type: string | null
          carousel_enabled: boolean
          company: string | null
          cover_url: string | null
          created_at: string
          custom_slug: string | null
          email: string | null
          first_name: string | null
          full_name: string
          id: string
          is_paid: boolean
          is_published: boolean | null
          is_template: boolean
          last_name: string | null
          location: string | null
          logo_url: string | null
          middle_name: string | null
          organization_id: string | null
          owner_name: string | null
          paid_at: string | null
          paid_overridden_by_admin: boolean
          phone: string | null
          plan_id: string | null
          prefix: string | null
          public_url: string | null
          published_at: string | null
          qr_code_url: string | null
          share_url: string | null
          slug: string
          social_links: Json | null
          suffix: string | null
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
          card_type?: string | null
          carousel_enabled?: boolean
          company?: string | null
          cover_url?: string | null
          created_at?: string
          custom_slug?: string | null
          email?: string | null
          first_name?: string | null
          full_name: string
          id?: string
          is_paid?: boolean
          is_published?: boolean | null
          is_template?: boolean
          last_name?: string | null
          location?: string | null
          logo_url?: string | null
          middle_name?: string | null
          organization_id?: string | null
          owner_name?: string | null
          paid_at?: string | null
          paid_overridden_by_admin?: boolean
          phone?: string | null
          plan_id?: string | null
          prefix?: string | null
          public_url?: string | null
          published_at?: string | null
          qr_code_url?: string | null
          share_url?: string | null
          slug: string
          social_links?: Json | null
          suffix?: string | null
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
          card_type?: string | null
          carousel_enabled?: boolean
          company?: string | null
          cover_url?: string | null
          created_at?: string
          custom_slug?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string
          id?: string
          is_paid?: boolean
          is_published?: boolean | null
          is_template?: boolean
          last_name?: string | null
          location?: string | null
          logo_url?: string | null
          middle_name?: string | null
          organization_id?: string | null
          owner_name?: string | null
          paid_at?: string | null
          paid_overridden_by_admin?: boolean
          phone?: string | null
          plan_id?: string | null
          prefix?: string | null
          public_url?: string | null
          published_at?: string | null
          qr_code_url?: string | null
          share_url?: string | null
          slug?: string
          social_links?: Json | null
          suffix?: string | null
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
            foreignKeyName: "cards_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "card_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "card_plans_public"
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
      payments: {
        Row: {
          amount: number
          card_id: string
          created_at: string
          currency: string
          evidence_url: string | null
          id: string
          payment_method: string
          plan_id: string
          provider_reference: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          card_id: string
          created_at?: string
          currency?: string
          evidence_url?: string | null
          id?: string
          payment_method: string
          plan_id: string
          provider_reference?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          card_id?: string
          created_at?: string
          currency?: string
          evidence_url?: string | null
          id?: string
          payment_method?: string
          plan_id?: string
          provider_reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "card_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "card_plans_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          card_id: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string
          owner: string
          sort_order: number | null
        }
        Insert: {
          alt_text?: string | null
          card_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url: string
          owner: string
          sort_order?: number | null
        }
        Update: {
          alt_text?: string | null
          card_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string
          owner?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          has_referral_access: boolean
          id: string
          phone: string | null
          phone_verified: boolean | null
          referral_code: string | null
          referred_by_user_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          has_referral_access?: boolean
          id: string
          phone?: string | null
          phone_verified?: boolean | null
          referral_code?: string | null
          referred_by_user_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          has_referral_access?: boolean
          id?: string
          phone?: string | null
          phone_verified?: boolean | null
          referral_code?: string | null
          referred_by_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_user_id_fkey"
            columns: ["referred_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          card_id: string
          created_at: string
          event_count: number
          id: string
          ip_hash: string
          updated_at: string
          window_start: string
        }
        Insert: {
          card_id: string
          created_at?: string
          event_count?: number
          id?: string
          ip_hash: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          card_id?: string
          created_at?: string
          event_count?: number
          id?: string
          ip_hash?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          payment_id: string | null
          plan_id: string | null
          referred_card_id: string | null
          referred_user_id: string
          referrer_user_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_id?: string | null
          plan_id?: string | null
          referred_card_id?: string | null
          referred_user_id: string
          referrer_user_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_id?: string | null
          plan_id?: string | null
          referred_card_id?: string | null
          referred_user_id?: string
          referrer_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "card_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "card_plans_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_card_id_fkey"
            columns: ["referred_card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_user_id_fkey"
            columns: ["referrer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      share_links: {
        Row: {
          card_id: string
          code: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          label: string | null
        }
        Insert: {
          card_id: string
          code: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
        }
        Update: {
          card_id?: string
          code?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_links_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      card_plans_public: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          has_reseller_access: boolean | null
          id: string | null
          is_active: boolean | null
          name: string | null
          referral_eligible: boolean | null
          retail_price: number | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          has_reseller_access?: boolean | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          referral_eligible?: boolean | null
          retail_price?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          has_reseller_access?: boolean | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          referral_eligible?: boolean | null
          retail_price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_referral_access: {
        Args: { p_plan_id: string; p_user_id: string }
        Returns: undefined
      }
      assemble_display_name: {
        Args: {
          p_first_name: string
          p_last_name: string
          p_middle_name: string
          p_prefix: string
          p_suffix: string
        }
        Returns: string
      }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      process_card_payment: {
        Args: {
          p_amount: number
          p_card_id: string
          p_evidence_url?: string
          p_is_admin_override?: boolean
          p_payment_method: string
          p_plan_id: string
          p_provider_reference?: string
          p_user_id: string
        }
        Returns: string
      }
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

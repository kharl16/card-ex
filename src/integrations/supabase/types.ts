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
      admin_patches: {
        Row: {
          admin_user_id: string
          before_states: Json | null
          cards_affected: number
          created_at: string
          id: string
          patch_options: Json
          results: Json
          snapshot_template: Json | null
          status: string
          target_card_ids: Json
          target_mode: string
          template_id: string | null
        }
        Insert: {
          admin_user_id: string
          before_states?: Json | null
          cards_affected?: number
          created_at?: string
          id?: string
          patch_options?: Json
          results?: Json
          snapshot_template?: Json | null
          status?: string
          target_card_ids?: Json
          target_mode: string
          template_id?: string | null
        }
        Update: {
          admin_user_id?: string
          before_states?: Json | null
          cards_affected?: number
          created_at?: string
          id?: string
          patch_options?: Json
          results?: Json
          snapshot_template?: Json | null
          status?: string
          target_card_ids?: Json
          target_mode?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_patches_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "card_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassadors_library: {
        Row: {
          allowed_sites: string[] | null
          created_at: string
          drive_link: string | null
          drive_share_link: string | null
          endorser: string | null
          folder_name: string | null
          id: string
          is_active: boolean
          product_endorsed: string | null
          thumbnail: string | null
          updated_at: string
          video_file_url: string | null
          visibility_level: Database["public"]["Enums"]["visibility_level"]
        }
        Insert: {
          allowed_sites?: string[] | null
          created_at?: string
          drive_link?: string | null
          drive_share_link?: string | null
          endorser?: string | null
          folder_name?: string | null
          id?: string
          is_active?: boolean
          product_endorsed?: string | null
          thumbnail?: string | null
          updated_at?: string
          video_file_url?: string | null
          visibility_level?: Database["public"]["Enums"]["visibility_level"]
        }
        Update: {
          allowed_sites?: string[] | null
          created_at?: string
          drive_link?: string | null
          drive_share_link?: string | null
          endorser?: string | null
          folder_name?: string | null
          id?: string
          is_active?: boolean
          product_endorsed?: string | null
          thumbnail?: string | null
          updated_at?: string
          video_file_url?: string | null
          visibility_level?: Database["public"]["Enums"]["visibility_level"]
        }
        Relationships: []
      }
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
          carousel_settings: Json | null
          company: string | null
          cover_url: string | null
          created_at: string
          custom_slug: string | null
          design_version: number
          email: string | null
          first_name: string | null
          full_name: string
          id: string
          is_paid: boolean
          is_published: boolean | null
          is_template: boolean
          last_design_patch_id: string | null
          last_name: string | null
          location: string | null
          logo_url: string | null
          middle_name: string | null
          organization_id: string | null
          owner_name: string | null
          owner_referral_code: string | null
          package_images: Json
          paid_at: string | null
          paid_overridden_by_admin: boolean
          phone: string | null
          plan_id: string | null
          prefix: string | null
          product_images: Json | null
          public_url: string | null
          published_at: string | null
          qr_code_url: string | null
          referred_by_code: string | null
          referred_by_name: string | null
          referred_by_user_id: string | null
          share_url: string | null
          slug: string
          social_links: Json | null
          suffix: string | null
          testimony_images: Json
          theme: Json | null
          title: string | null
          unique_views: number | null
          updated_at: string
          user_id: string
          vcard_url: string | null
          video_items: Json
          views_count: number | null
          wallet_pass_url: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          card_type?: string | null
          carousel_enabled?: boolean
          carousel_settings?: Json | null
          company?: string | null
          cover_url?: string | null
          created_at?: string
          custom_slug?: string | null
          design_version?: number
          email?: string | null
          first_name?: string | null
          full_name: string
          id?: string
          is_paid?: boolean
          is_published?: boolean | null
          is_template?: boolean
          last_design_patch_id?: string | null
          last_name?: string | null
          location?: string | null
          logo_url?: string | null
          middle_name?: string | null
          organization_id?: string | null
          owner_name?: string | null
          owner_referral_code?: string | null
          package_images?: Json
          paid_at?: string | null
          paid_overridden_by_admin?: boolean
          phone?: string | null
          plan_id?: string | null
          prefix?: string | null
          product_images?: Json | null
          public_url?: string | null
          published_at?: string | null
          qr_code_url?: string | null
          referred_by_code?: string | null
          referred_by_name?: string | null
          referred_by_user_id?: string | null
          share_url?: string | null
          slug: string
          social_links?: Json | null
          suffix?: string | null
          testimony_images?: Json
          theme?: Json | null
          title?: string | null
          unique_views?: number | null
          updated_at?: string
          user_id: string
          vcard_url?: string | null
          video_items?: Json
          views_count?: number | null
          wallet_pass_url?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          card_type?: string | null
          carousel_enabled?: boolean
          carousel_settings?: Json | null
          company?: string | null
          cover_url?: string | null
          created_at?: string
          custom_slug?: string | null
          design_version?: number
          email?: string | null
          first_name?: string | null
          full_name?: string
          id?: string
          is_paid?: boolean
          is_published?: boolean | null
          is_template?: boolean
          last_design_patch_id?: string | null
          last_name?: string | null
          location?: string | null
          logo_url?: string | null
          middle_name?: string | null
          organization_id?: string | null
          owner_name?: string | null
          owner_referral_code?: string | null
          package_images?: Json
          paid_at?: string | null
          paid_overridden_by_admin?: boolean
          phone?: string | null
          plan_id?: string | null
          prefix?: string | null
          product_images?: Json | null
          public_url?: string | null
          published_at?: string | null
          qr_code_url?: string | null
          referred_by_code?: string | null
          referred_by_name?: string | null
          referred_by_user_id?: string | null
          share_url?: string | null
          slug?: string
          social_links?: Json | null
          suffix?: string | null
          testimony_images?: Json
          theme?: Json | null
          title?: string | null
          unique_views?: number | null
          updated_at?: string
          user_id?: string
          vcard_url?: string | null
          video_items?: Json
          views_count?: number | null
          wallet_pass_url?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_last_design_patch_id_fkey"
            columns: ["last_design_patch_id"]
            isOneToOne: false
            referencedRelation: "admin_patches"
            referencedColumns: ["id"]
          },
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
      directory_entries: {
        Row: {
          address: string | null
          allowed_sites: string[] | null
          created_at: string
          facebook_page: string | null
          id: number
          is_active: boolean
          location: string | null
          location_image_url: string | null
          maps_link: string | null
          operating_hours: string | null
          owner: string | null
          owner_photo_url: string | null
          phone_1: string | null
          phone_2: string | null
          phone_3: string | null
          sites: string | null
          sort_order: number | null
          updated_at: string
          visibility_level: Database["public"]["Enums"]["visibility_level"]
        }
        Insert: {
          address?: string | null
          allowed_sites?: string[] | null
          created_at?: string
          facebook_page?: string | null
          id?: number
          is_active?: boolean
          location?: string | null
          location_image_url?: string | null
          maps_link?: string | null
          operating_hours?: string | null
          owner?: string | null
          owner_photo_url?: string | null
          phone_1?: string | null
          phone_2?: string | null
          phone_3?: string | null
          sites?: string | null
          sort_order?: number | null
          updated_at?: string
          visibility_level?: Database["public"]["Enums"]["visibility_level"]
        }
        Update: {
          address?: string | null
          allowed_sites?: string[] | null
          created_at?: string
          facebook_page?: string | null
          id?: number
          is_active?: boolean
          location?: string | null
          location_image_url?: string | null
          maps_link?: string | null
          operating_hours?: string | null
          owner?: string | null
          owner_photo_url?: string | null
          phone_1?: string | null
          phone_2?: string | null
          phone_3?: string | null
          sites?: string | null
          sort_order?: number | null
          updated_at?: string
          visibility_level?: Database["public"]["Enums"]["visibility_level"]
        }
        Relationships: []
      }
      files_repository: {
        Row: {
          allowed_sites: string[] | null
          check_match: string | null
          created_at: string
          description: string | null
          drive_link_download: string | null
          drive_link_share: string | null
          file_name: string
          folder_name: string | null
          give_me_5: string | null
          id: number
          images: string | null
          infinity: string | null
          is_active: boolean
          just_4_you: string | null
          package_points_smc: string | null
          price_dp: string | null
          price_srp: string | null
          rqv: string | null
          sort_order: number | null
          unilevel_points: number | null
          updated_at: string
          view_video_url: string | null
          visibility_level: Database["public"]["Enums"]["visibility_level"]
          wholesale_package_commission: string | null
        }
        Insert: {
          allowed_sites?: string[] | null
          check_match?: string | null
          created_at?: string
          description?: string | null
          drive_link_download?: string | null
          drive_link_share?: string | null
          file_name: string
          folder_name?: string | null
          give_me_5?: string | null
          id?: number
          images?: string | null
          infinity?: string | null
          is_active?: boolean
          just_4_you?: string | null
          package_points_smc?: string | null
          price_dp?: string | null
          price_srp?: string | null
          rqv?: string | null
          sort_order?: number | null
          unilevel_points?: number | null
          updated_at?: string
          view_video_url?: string | null
          visibility_level?: Database["public"]["Enums"]["visibility_level"]
          wholesale_package_commission?: string | null
        }
        Update: {
          allowed_sites?: string[] | null
          check_match?: string | null
          created_at?: string
          description?: string | null
          drive_link_download?: string | null
          drive_link_share?: string | null
          file_name?: string
          folder_name?: string | null
          give_me_5?: string | null
          id?: number
          images?: string | null
          infinity?: string | null
          is_active?: boolean
          just_4_you?: string | null
          package_points_smc?: string | null
          price_dp?: string | null
          price_srp?: string | null
          rqv?: string | null
          sort_order?: number | null
          unilevel_points?: number | null
          updated_at?: string
          view_video_url?: string | null
          visibility_level?: Database["public"]["Enums"]["visibility_level"]
          wholesale_package_commission?: string | null
        }
        Relationships: []
      }
      "IAM Files": {
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
      iam_links: {
        Row: {
          allowed_sites: string[] | null
          category: string | null
          created_at: string
          icon_url: string | null
          id: string
          is_active: boolean
          link: string
          name: string
          sort_order: number | null
          updated_at: string
          visibility_level: Database["public"]["Enums"]["visibility_level"]
        }
        Insert: {
          allowed_sites?: string[] | null
          category?: string | null
          created_at?: string
          icon_url?: string | null
          id?: string
          is_active?: boolean
          link: string
          name: string
          sort_order?: number | null
          updated_at?: string
          visibility_level?: Database["public"]["Enums"]["visibility_level"]
        }
        Update: {
          allowed_sites?: string[] | null
          category?: string | null
          created_at?: string
          icon_url?: string | null
          id?: string
          is_active?: boolean
          link?: string
          name?: string
          sort_order?: number | null
          updated_at?: string
          visibility_level?: Database["public"]["Enums"]["visibility_level"]
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
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
      presentations: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          download_url: string | null
          id: string
          is_active: boolean
          presentation_url: string | null
          sort_order: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          visibility_level: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          id?: string
          is_active?: boolean
          presentation_url?: string | null
          sort_order?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          visibility_level?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          id?: string
          is_active?: boolean
          presentation_url?: string | null
          sort_order?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          visibility_level?: string
        }
        Relationships: []
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
          referred_by_code: string | null
          referred_by_name: string | null
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
          referred_by_code?: string | null
          referred_by_name?: string | null
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
          referred_by_code?: string | null
          referred_by_name?: string | null
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
      resource_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          resource_id: string
          resource_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          resource_id: string
          resource_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          resource_id?: string
          resource_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      resource_favorites: {
        Row: {
          created_at: string
          id: string
          resource_id: string
          resource_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          resource_id: string
          resource_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          resource_id?: string
          resource_type?: string
          user_id?: string
        }
        Relationships: []
      }
      resource_folders: {
        Row: {
          created_at: string
          folder_name: string
          id: string
          images: string | null
          is_active: boolean
          updated_at: string
          visibility_level: Database["public"]["Enums"]["visibility_level"]
        }
        Insert: {
          created_at?: string
          folder_name: string
          id?: string
          images?: string | null
          is_active?: boolean
          updated_at?: string
          visibility_level?: Database["public"]["Enums"]["visibility_level"]
        }
        Update: {
          created_at?: string
          folder_name?: string
          id?: string
          images?: string | null
          is_active?: boolean
          updated_at?: string
          visibility_level?: Database["public"]["Enums"]["visibility_level"]
        }
        Relationships: []
      }
      resource_user_roles: {
        Row: {
          assigned_sites: string[] | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["resource_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_sites?: string[] | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["resource_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_sites?: string[] | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["resource_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      sites: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          sites: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          sites: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          sites?: string
          updated_at?: string
        }
        Relationships: []
      }
      superadmin_audit_log: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      tools: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          title: string
          tool_url: string
          updated_at: string
          visibility: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          title: string
          tool_url: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          title?: string
          tool_url?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      tools_orb_settings: {
        Row: {
          enabled: boolean
          id: string
          items: Json
          orb_image_url: string | null
          orb_label: string | null
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          id?: string
          items?: Json
          orb_image_url?: string | null
          orb_label?: string | null
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          id?: string
          items?: Json
          orb_image_url?: string | null
          orb_label?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      training_folders: {
        Row: {
          created_at: string
          folder_name: string
          id: string
          images: string | null
          is_active: boolean
          updated_at: string
          visibility_level: Database["public"]["Enums"]["visibility_level"]
        }
        Insert: {
          created_at?: string
          folder_name: string
          id?: string
          images?: string | null
          is_active?: boolean
          updated_at?: string
          visibility_level?: Database["public"]["Enums"]["visibility_level"]
        }
        Update: {
          created_at?: string
          folder_name?: string
          id?: string
          images?: string | null
          is_active?: boolean
          updated_at?: string
          visibility_level?: Database["public"]["Enums"]["visibility_level"]
        }
        Relationships: []
      }
      training_items: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          sort_order: number | null
          source_type: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
          visibility_level: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number | null
          source_type?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
          visibility_level?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number | null
          source_type?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
          visibility_level?: string
        }
        Relationships: []
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
      Videos: {
        Row: {
          Author: string | null
          Description: string | null
          "Drive Link": string | null
          "Drive Link Share": string | null
          "Duration (minutes)": number | null
          "Folder Name": string | null
          ID: number
          "Thumbnail Image": string | null
          Title: string | null
          "Video File URL": string | null
        }
        Insert: {
          Author?: string | null
          Description?: string | null
          "Drive Link"?: string | null
          "Drive Link Share"?: string | null
          "Duration (minutes)"?: number | null
          "Folder Name"?: string | null
          ID: number
          "Thumbnail Image"?: string | null
          Title?: string | null
          "Video File URL"?: string | null
        }
        Update: {
          Author?: string | null
          Description?: string | null
          "Drive Link"?: string | null
          "Drive Link Share"?: string | null
          "Duration (minutes)"?: number | null
          "Folder Name"?: string | null
          ID?: number
          "Thumbnail Image"?: string | null
          Title?: string | null
          "Video File URL"?: string | null
        }
        Relationships: []
      }
      ways_13: {
        Row: {
          allowed_sites: string[] | null
          content: string
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
          visibility_level: Database["public"]["Enums"]["visibility_level"]
        }
        Insert: {
          allowed_sites?: string[] | null
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          visibility_level?: Database["public"]["Enums"]["visibility_level"]
        }
        Update: {
          allowed_sites?: string[] | null
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          visibility_level?: Database["public"]["Enums"]["visibility_level"]
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
      can_view_resource: {
        Args: {
          p_allowed_sites?: string[]
          p_user_id: string
          p_visibility: Database["public"]["Enums"]["visibility_level"]
        }
        Returns: boolean
      }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      ensure_user_referral_code: {
        Args: { p_user_id: string }
        Returns: string
      }
      generate_referral_code: { Args: never; Returns: string }
      get_referral_code_for_user: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_resource_role: {
        Args: { p_user_id: string }
        Returns: Database["public"]["Enums"]["resource_role"]
      }
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
      is_resource_admin: { Args: { p_user_id: string }; Returns: boolean }
      is_resource_super_admin: { Args: { p_user_id: string }; Returns: boolean }
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
      resource_role: "member" | "leader" | "admin" | "super_admin"
      visibility_level:
        | "public_members"
        | "leaders_only"
        | "admins_only"
        | "super_admin_only"
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
      resource_role: ["member", "leader", "admin", "super_admin"],
      visibility_level: [
        "public_members",
        "leaders_only",
        "admins_only",
        "super_admin_only",
      ],
    },
  },
} as const

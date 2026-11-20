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
      admin_memberships: {
        Row: {
          created_at: string
          is_active: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      homepage_content: {
        Row: {
          about_description: string | null
          about_title: string | null
          cooperation_cta_href: string | null
          cooperation_cta_label: string | null
          cooperation_description: string | null
          cooperation_title: string | null
          created_at: string
          hero_description: string | null
          hero_image_alt: string | null
          hero_image_path: string | null
          hero_primary_cta_href: string | null
          hero_primary_cta_label: string | null
          hero_secondary_cta_href: string | null
          hero_secondary_cta_label: string | null
          hero_title: string | null
          id: string
          updated_at: string
        }
        Insert: {
          about_description?: string | null
          about_title?: string | null
          cooperation_cta_href?: string | null
          cooperation_cta_label?: string | null
          cooperation_description?: string | null
          cooperation_title?: string | null
          created_at?: string
          hero_description?: string | null
          hero_image_alt?: string | null
          hero_image_path?: string | null
          hero_primary_cta_href?: string | null
          hero_primary_cta_label?: string | null
          hero_secondary_cta_href?: string | null
          hero_secondary_cta_label?: string | null
          hero_title?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          about_description?: string | null
          about_title?: string | null
          cooperation_cta_href?: string | null
          cooperation_cta_label?: string | null
          cooperation_description?: string | null
          cooperation_title?: string | null
          created_at?: string
          hero_description?: string | null
          hero_image_alt?: string | null
          hero_image_path?: string | null
          hero_primary_cta_href?: string | null
          hero_primary_cta_label?: string | null
          hero_secondary_cta_href?: string | null
          hero_secondary_cta_label?: string | null
          hero_title?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      institution_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      institutions: {
        Row: {
          acronym: string | null
          category_id: string
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          logo_alt: string | null
          logo_path: string | null
          name: string
          published_at: string | null
          sort_order: number
          state: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          acronym?: string | null
          category_id: string
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          logo_alt?: string | null
          logo_path?: string | null
          name: string
          published_at?: string | null
          sort_order?: number
          state?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          acronym?: string | null
          category_id?: string
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          logo_alt?: string | null
          logo_path?: string | null
          name?: string
          published_at?: string | null
          sort_order?: number
          state?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institutions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "institution_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      page_content: {
        Row: {
          created_at: string
          description: string | null
          eyebrow: string | null
          page_key: string
          seo_description: string | null
          seo_image_path: string | null
          seo_title: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          eyebrow?: string | null
          page_key: string
          seo_description?: string | null
          seo_image_path?: string | null
          seo_title?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          eyebrow?: string | null
          page_key?: string
          seo_description?: string | null
          seo_image_path?: string | null
          seo_title?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      page_sections: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          page_key: string
          section_type: string
          settings: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          page_key: string
          section_type: string
          settings?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          page_key?: string
          section_type?: string
          settings?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      project_research_lines: {
        Row: {
          created_at: string
          project_id: string
          research_line_id: string
        }
        Insert: {
          created_at?: string
          project_id: string
          research_line_id: string
        }
        Update: {
          created_at?: string
          project_id?: string
          research_line_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_research_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_research_lines_research_line_id_fkey"
            columns: ["research_line_id"]
            isOneToOne: false
            referencedRelation: "research_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          coordination: string | null
          created_at: string
          description: string | null
          end_date: string | null
          external_url: string | null
          funding: string | null
          id: string
          image_alt: string | null
          image_path: string | null
          is_featured: boolean
          is_published: boolean
          project_status: string | null
          published_at: string | null
          result_or_contribution: string | null
          short_description: string | null
          slug: string
          sort_order: number
          start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          coordination?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          external_url?: string | null
          funding?: string | null
          id?: string
          image_alt?: string | null
          image_path?: string | null
          is_featured?: boolean
          is_published?: boolean
          project_status?: string | null
          published_at?: string | null
          result_or_contribution?: string | null
          short_description?: string | null
          slug: string
          sort_order?: number
          start_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          coordination?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          external_url?: string | null
          funding?: string | null
          id?: string
          image_alt?: string | null
          image_path?: string | null
          is_featured?: boolean
          is_published?: boolean
          project_status?: string | null
          published_at?: string | null
          result_or_contribution?: string | null
          short_description?: string | null
          slug?: string
          sort_order?: number
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      publication_projects: {
        Row: {
          created_at: string
          project_id: string
          publication_id: string
        }
        Insert: {
          created_at?: string
          project_id: string
          publication_id: string
        }
        Update: {
          created_at?: string
          project_id?: string
          publication_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_projects_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_research_lines: {
        Row: {
          created_at: string
          publication_id: string
          research_line_id: string
        }
        Insert: {
          created_at?: string
          publication_id: string
          research_line_id: string
        }
        Update: {
          created_at?: string
          publication_id?: string
          research_line_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_research_lines_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_research_lines_research_line_id_fkey"
            columns: ["research_line_id"]
            isOneToOne: false
            referencedRelation: "research_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      publications: {
        Row: {
          abstract: string | null
          authors: string
          citation: string | null
          created_at: string
          doi: string | null
          external_url: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          publication_venue: string | null
          publication_year: number | null
          published_at: string | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          abstract?: string | null
          authors: string
          citation?: string | null
          created_at?: string
          doi?: string | null
          external_url?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          publication_venue?: string | null
          publication_year?: number | null
          published_at?: string | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          abstract?: string | null
          authors?: string
          citation?: string | null
          created_at?: string
          doi?: string | null
          external_url?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          publication_venue?: string | null
          publication_year?: number | null
          published_at?: string | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      research_lines: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_alt: string | null
          image_path: string | null
          is_featured: boolean
          is_published: boolean
          published_at: string | null
          short_description: string | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_alt?: string | null
          image_path?: string | null
          is_featured?: boolean
          is_published?: boolean
          published_at?: string | null
          short_description?: string | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_alt?: string | null
          image_path?: string | null
          is_featured?: boolean
          is_published?: boolean
          published_at?: string | null
          short_description?: string | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_appearance: {
        Row: {
          accent_color: string | null
          button_shape: string
          card_style: string
          corner_style: string
          created_at: string
          heading_font: string
          id: string
          primary_color: string | null
          secondary_color: string | null
          section_background: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          button_shape?: string
          card_style?: string
          corner_style?: string
          created_at?: string
          heading_font?: string
          id?: string
          primary_color?: string | null
          secondary_color?: string | null
          section_background?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          button_shape?: string
          card_style?: string
          corner_style?: string
          created_at?: string
          heading_font?: string
          id?: string
          primary_color?: string | null
          secondary_color?: string | null
          section_background?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_navigation: {
        Row: {
          created_at: string
          href: string
          id: string
          is_visible: boolean
          label: string
          location: string
          open_in_new_tab: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          href: string
          id?: string
          is_visible?: boolean
          label: string
          location: string
          open_in_new_tab?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          href?: string
          id?: string
          is_visible?: boolean
          label?: string
          location?: string
          open_in_new_tab?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_pillars: {
        Row: {
          created_at: string
          description: string | null
          icon: string
          id: string
          is_visible: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_visible?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_visible?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          favicon_path: string | null
          footer_contact_title: string | null
          footer_description: string | null
          footer_logo_mode: string
          footer_logo_path: string | null
          footer_nav_title: string | null
          footer_note: string | null
          footer_social_title: string | null
          header_style: string
          id: string
          institutional_name: string | null
          logo_path: string | null
          short_description: string | null
          site_name: string
          state: string | null
          tagline: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          favicon_path?: string | null
          footer_contact_title?: string | null
          footer_description?: string | null
          footer_logo_mode?: string
          footer_logo_path?: string | null
          footer_nav_title?: string | null
          footer_note?: string | null
          footer_social_title?: string | null
          header_style?: string
          id?: string
          institutional_name?: string | null
          logo_path?: string | null
          short_description?: string | null
          site_name: string
          state?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          favicon_path?: string | null
          footer_contact_title?: string | null
          footer_description?: string | null
          footer_logo_mode?: string
          footer_logo_path?: string | null
          footer_nav_title?: string | null
          footer_note?: string | null
          footer_social_title?: string | null
          header_style?: string
          id?: string
          institutional_name?: string | null
          logo_path?: string | null
          short_description?: string | null
          site_name?: string
          state?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      social_links: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          platform: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          platform: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          platform?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assert_list_unchanged: {
        Args: { p_current: Json; p_expected: Json }
        Returns: undefined
      }
      has_cms_role: { Args: { allowed_roles: string[] }; Returns: boolean }
      is_media_object_name: { Args: { value: string }; Returns: boolean }
      is_short_text: {
        Args: { max_length: number; value: Json }
        Returns: boolean
      }
      is_valid_image_reference: { Args: { value: string }; Returns: boolean }
      is_valid_section_settings: {
        Args: { p_settings: Json; p_type: string }
        Returns: boolean
      }
      is_valid_site_href: { Args: { value: string }; Returns: boolean }
      list_media: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_unused_only?: boolean
        }
        Returns: {
          created_at: string
          height: number
          mime_type: string
          name: string
          original_name: string
          size_bytes: number
          total_count: number
          usage_count: number
          width: number
        }[]
      }
      lock_media_object: { Args: { p_name: string }; Returns: undefined }
      media_object_deletable: { Args: { p_name: string }; Returns: boolean }
      media_usage: {
        Args: { p_name: string }
        Returns: {
          entity: string
          label: string
          record_id: string
        }[]
      }
      save_page_sections: {
        Args: { p_expected: Json; p_items: Json; p_page_key: string }
        Returns: {
          created_at: string
          id: string
          is_visible: boolean
          page_key: string
          section_type: string
          settings: Json
          sort_order: number
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "page_sections"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      save_project: {
        Args: {
          p_coordination: string
          p_description: string
          p_end_date: string
          p_expected_updated_at: string
          p_external_url: string
          p_funding: string
          p_id: string
          p_image_alt: string
          p_image_path: string
          p_is_featured: boolean
          p_is_published: boolean
          p_project_status: string
          p_research_line_ids: string[]
          p_result_or_contribution: string
          p_short_description: string
          p_slug: string
          p_sort_order: number
          p_start_date: string
          p_title: string
        }
        Returns: {
          coordination: string | null
          created_at: string
          description: string | null
          end_date: string | null
          external_url: string | null
          funding: string | null
          id: string
          image_alt: string | null
          image_path: string | null
          is_featured: boolean
          is_published: boolean
          project_status: string | null
          published_at: string | null
          result_or_contribution: string | null
          short_description: string | null
          slug: string
          sort_order: number
          start_date: string | null
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "projects"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_publication: {
        Args: {
          p_abstract: string
          p_authors: string
          p_citation: string
          p_doi: string
          p_expected_updated_at: string
          p_external_url: string
          p_id: string
          p_is_featured: boolean
          p_is_published: boolean
          p_project_ids: string[]
          p_publication_venue: string
          p_publication_year: number
          p_research_line_ids: string[]
          p_slug: string
          p_sort_order: number
          p_title: string
        }
        Returns: {
          abstract: string | null
          authors: string
          citation: string | null
          created_at: string
          doi: string | null
          external_url: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          publication_venue: string | null
          publication_year: number | null
          published_at: string | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "publications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_site_navigation: {
        Args: { p_expected: Json; p_items: Json; p_location: string }
        Returns: {
          created_at: string
          href: string
          id: string
          is_visible: boolean
          label: string
          location: string
          open_in_new_tab: boolean
          sort_order: number
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "site_navigation"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      save_site_pillars: {
        Args: { p_expected: Json; p_items: Json }
        Returns: {
          created_at: string
          description: string | null
          icon: string
          id: string
          is_visible: boolean
          sort_order: number
          title: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "site_pillars"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      section_image_paths: { Args: { p_settings: Json }; Returns: string[] }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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

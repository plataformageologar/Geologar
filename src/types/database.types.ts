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
          project_status: string
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
          project_status: string
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
          project_status?: string
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
      site_settings: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          favicon_path: string | null
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
      has_cms_role: { Args: { allowed_roles: string[] }; Returns: boolean }
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
          project_status: string
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

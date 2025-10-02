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
      builder_scoring_details: {
        Row: {
          calculated_at: string | null
          company_id: string
          confidence: string | null
          contact_total: number | null
          created_at: string | null
          decision_authority_score: number | null
          digital_total: number | null
          firmographic_total: number | null
          geographic_score: number | null
          id: string
          linkedin_professional_score: number | null
          price_point_score: number | null
          priority_tier: string | null
          social_media_score: number | null
          stability_score: number | null
          technology_adoption_score: number | null
          total_score: number | null
          volume_score: number | null
          website_quality_score: number | null
        }
        Insert: {
          calculated_at?: string | null
          company_id: string
          confidence?: string | null
          contact_total?: number | null
          created_at?: string | null
          decision_authority_score?: number | null
          digital_total?: number | null
          firmographic_total?: number | null
          geographic_score?: number | null
          id?: string
          linkedin_professional_score?: number | null
          price_point_score?: number | null
          priority_tier?: string | null
          social_media_score?: number | null
          stability_score?: number | null
          technology_adoption_score?: number | null
          total_score?: number | null
          volume_score?: number | null
          website_quality_score?: number | null
        }
        Update: {
          calculated_at?: string | null
          company_id?: string
          confidence?: string | null
          contact_total?: number | null
          created_at?: string | null
          decision_authority_score?: number | null
          digital_total?: number | null
          firmographic_total?: number | null
          geographic_score?: number | null
          id?: string
          linkedin_professional_score?: number | null
          price_point_score?: number | null
          priority_tier?: string | null
          social_media_score?: number | null
          stability_score?: number | null
          technology_adoption_score?: number | null
          total_score?: number | null
          volume_score?: number | null
          website_quality_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "builder_scoring_details_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address_line1: string | null
          annual_revenue_range: string | null
          annual_volume: number | null
          annual_volume_range: string | null
          average_home_price: number | null
          average_home_price_range: string | null
          city: string | null
          company_logo: string | null
          company_name: string
          company_type: string | null
          contractor_specialty: string | null
          created_at: string | null
          created_by: string
          current_smart_home_offerings: string[] | null
          emergency_service_percentage: number | null
          facebook_url: string | null
          franchise_name: string | null
          has_google_business_profile: boolean | null
          id: string
          industry_type: string
          instagram_url: string | null
          is_franchise: boolean | null
          is_parent_company: boolean | null
          last_contact_date: string | null
          lead_score: number | null
          linkedin_activity_level: string | null
          linkedin_company_url: string | null
          linkedin_followers_range: string | null
          maintenance_contract_percentage: number | null
          nest_installation_volume_range: string | null
          nest_pro_industry: string | null
          nest_pro_partner_id: string | null
          nest_product_mix: string[] | null
          next_activity_date: string | null
          next_activity_type: string | null
          notes: string | null
          offers_home_automation: boolean | null
          offers_smart_security: boolean | null
          offers_smart_thermostats: boolean | null
          online_review_count_range: string | null
          online_review_rating: number | null
          owner_name: string | null
          parent_company_id: string | null
          partner_introduction_date: string | null
          partner_relationship_status: string | null
          price_point_category: string | null
          primary_email: string | null
          primary_phone: string | null
          priority_tier: string | null
          score_calculated_at: string | null
          segment: string | null
          segment_confidence: string | null
          service_area_type: string | null
          social_media_presence: string | null
          state: string | null
          status: string | null
          technology_adoption_level: string | null
          total_employees: number | null
          total_employees_range: string | null
          updated_at: string | null
          website_has_smart_home_content: boolean | null
          website_last_updated: string | null
          website_quality: string | null
          website_url: string | null
          years_in_business: number | null
          years_in_business_range: string | null
          youtube_url: string | null
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          annual_revenue_range?: string | null
          annual_volume?: number | null
          annual_volume_range?: string | null
          average_home_price?: number | null
          average_home_price_range?: string | null
          city?: string | null
          company_logo?: string | null
          company_name: string
          company_type?: string | null
          contractor_specialty?: string | null
          created_at?: string | null
          created_by: string
          current_smart_home_offerings?: string[] | null
          emergency_service_percentage?: number | null
          facebook_url?: string | null
          franchise_name?: string | null
          has_google_business_profile?: boolean | null
          id?: string
          industry_type: string
          instagram_url?: string | null
          is_franchise?: boolean | null
          is_parent_company?: boolean | null
          last_contact_date?: string | null
          lead_score?: number | null
          linkedin_activity_level?: string | null
          linkedin_company_url?: string | null
          linkedin_followers_range?: string | null
          maintenance_contract_percentage?: number | null
          nest_installation_volume_range?: string | null
          nest_pro_industry?: string | null
          nest_pro_partner_id?: string | null
          nest_product_mix?: string[] | null
          next_activity_date?: string | null
          next_activity_type?: string | null
          notes?: string | null
          offers_home_automation?: boolean | null
          offers_smart_security?: boolean | null
          offers_smart_thermostats?: boolean | null
          online_review_count_range?: string | null
          online_review_rating?: number | null
          owner_name?: string | null
          parent_company_id?: string | null
          partner_introduction_date?: string | null
          partner_relationship_status?: string | null
          price_point_category?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          priority_tier?: string | null
          score_calculated_at?: string | null
          segment?: string | null
          segment_confidence?: string | null
          service_area_type?: string | null
          social_media_presence?: string | null
          state?: string | null
          status?: string | null
          technology_adoption_level?: string | null
          total_employees?: number | null
          total_employees_range?: string | null
          updated_at?: string | null
          website_has_smart_home_content?: boolean | null
          website_last_updated?: string | null
          website_quality?: string | null
          website_url?: string | null
          years_in_business?: number | null
          years_in_business_range?: string | null
          youtube_url?: string | null
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          annual_revenue_range?: string | null
          annual_volume?: number | null
          annual_volume_range?: string | null
          average_home_price?: number | null
          average_home_price_range?: string | null
          city?: string | null
          company_logo?: string | null
          company_name?: string
          company_type?: string | null
          contractor_specialty?: string | null
          created_at?: string | null
          created_by?: string
          current_smart_home_offerings?: string[] | null
          emergency_service_percentage?: number | null
          facebook_url?: string | null
          franchise_name?: string | null
          has_google_business_profile?: boolean | null
          id?: string
          industry_type?: string
          instagram_url?: string | null
          is_franchise?: boolean | null
          is_parent_company?: boolean | null
          last_contact_date?: string | null
          lead_score?: number | null
          linkedin_activity_level?: string | null
          linkedin_company_url?: string | null
          linkedin_followers_range?: string | null
          maintenance_contract_percentage?: number | null
          nest_installation_volume_range?: string | null
          nest_pro_industry?: string | null
          nest_pro_partner_id?: string | null
          nest_product_mix?: string[] | null
          next_activity_date?: string | null
          next_activity_type?: string | null
          notes?: string | null
          offers_home_automation?: boolean | null
          offers_smart_security?: boolean | null
          offers_smart_thermostats?: boolean | null
          online_review_count_range?: string | null
          online_review_rating?: number | null
          owner_name?: string | null
          parent_company_id?: string | null
          partner_introduction_date?: string | null
          partner_relationship_status?: string | null
          price_point_category?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          priority_tier?: string | null
          score_calculated_at?: string | null
          segment?: string | null
          segment_confidence?: string | null
          service_area_type?: string | null
          social_media_presence?: string | null
          state?: string | null
          status?: string | null
          technology_adoption_level?: string | null
          total_employees?: number | null
          total_employees_range?: string | null
          updated_at?: string | null
          website_has_smart_home_content?: boolean | null
          website_last_updated?: string | null
          website_quality?: string | null
          website_url?: string | null
          years_in_business?: number | null
          years_in_business_range?: string | null
          youtube_url?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_parent_company_id_fkey"
            columns: ["parent_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_branches: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          annual_volume: number | null
          branch_name: string
          branch_revenue: number | null
          city: string | null
          company_id: string
          created_at: string | null
          email: string | null
          geographic_coverage: string[] | null
          id: string
          is_headquarters: boolean | null
          phone: string | null
          state: string | null
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          annual_volume?: number | null
          branch_name: string
          branch_revenue?: number | null
          city?: string | null
          company_id: string
          created_at?: string | null
          email?: string | null
          geographic_coverage?: string[] | null
          id?: string
          is_headquarters?: boolean | null
          phone?: string | null
          state?: string | null
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          annual_volume?: number | null
          branch_name?: string
          branch_revenue?: number | null
          city?: string | null
          company_id?: string
          created_at?: string | null
          email?: string | null
          geographic_coverage?: string[] | null
          id?: string
          is_headquarters?: boolean | null
          phone?: string | null
          state?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_partner_matches: {
        Row: {
          company_id: string
          created_at: string
          id: string
          introduction_date: string | null
          match_reason: string | null
          match_score: number | null
          partner_id: string
          relationship_status: Database["public"]["Enums"]["relationship_status"]
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          introduction_date?: string | null
          match_reason?: string | null
          match_score?: number | null
          partner_id: string
          relationship_status?: Database["public"]["Enums"]["relationship_status"]
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          introduction_date?: string | null
          match_reason?: string | null
          match_score?: number | null
          partner_id?: string
          relationship_status?: Database["public"]["Enums"]["relationship_status"]
        }
        Relationships: [
          {
            foreignKeyName: "company_partner_matches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_partner_matches_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "nest_pro_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string | null
          decision_tier: Database["public"]["Enums"]["decision_tier"] | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          linkedin_activity_score: number | null
          linkedin_connections: number | null
          linkedin_url: string | null
          mobile: string | null
          notes: string | null
          phone: string | null
          preferred_contact_method:
            | Database["public"]["Enums"]["contact_method"]
            | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string | null
          decision_tier?: Database["public"]["Enums"]["decision_tier"] | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          linkedin_activity_score?: number | null
          linkedin_connections?: number | null
          linkedin_url?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string | null
          decision_tier?: Database["public"]["Enums"]["decision_tier"] | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          linkedin_activity_score?: number | null
          linkedin_connections?: number | null
          linkedin_url?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "company_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_scoring_details: {
        Row: {
          business_model_score: number | null
          calculated_at: string | null
          company_id: string
          confidence: string | null
          contact_total: number | null
          created_at: string | null
          decision_authority_score: number | null
          digital_total: number | null
          firmographic_total: number | null
          geographic_score: number | null
          id: string
          linkedin_professional_score: number | null
          priority_tier: string | null
          revenue_score: number | null
          social_media_score: number | null
          stability_score: number | null
          technology_adoption_score: number | null
          total_score: number | null
          volume_score: number | null
          website_quality_score: number | null
        }
        Insert: {
          business_model_score?: number | null
          calculated_at?: string | null
          company_id: string
          confidence?: string | null
          contact_total?: number | null
          created_at?: string | null
          decision_authority_score?: number | null
          digital_total?: number | null
          firmographic_total?: number | null
          geographic_score?: number | null
          id?: string
          linkedin_professional_score?: number | null
          priority_tier?: string | null
          revenue_score?: number | null
          social_media_score?: number | null
          stability_score?: number | null
          technology_adoption_score?: number | null
          total_score?: number | null
          volume_score?: number | null
          website_quality_score?: number | null
        }
        Update: {
          business_model_score?: number | null
          calculated_at?: string | null
          company_id?: string
          confidence?: string | null
          contact_total?: number | null
          created_at?: string | null
          decision_authority_score?: number | null
          digital_total?: number | null
          firmographic_total?: number | null
          geographic_score?: number | null
          id?: string
          linkedin_professional_score?: number | null
          priority_tier?: string | null
          revenue_score?: number | null
          social_media_score?: number | null
          stability_score?: number | null
          technology_adoption_score?: number | null
          total_score?: number | null
          volume_score?: number | null
          website_quality_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_scoring_details_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_history: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          id: string
          installation_date: string
          notes: string | null
          pro_id_reference: string | null
          product_type: Database["public"]["Enums"]["product_type"]
          project_name: string | null
          quantity: number
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          installation_date: string
          notes?: string | null
          pro_id_reference?: string | null
          product_type: Database["public"]["Enums"]["product_type"]
          project_name?: string | null
          quantity?: number
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          installation_date?: string
          notes?: string | null
          pro_id_reference?: string | null
          product_type?: Database["public"]["Enums"]["product_type"]
          project_name?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "installation_history_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "company_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      nest_pro_partners: {
        Row: {
          builder_capacity: boolean | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contractor_capacity: boolean | null
          created_at: string
          id: string
          partner_name: string
          service_areas: string[] | null
          specializations: string[] | null
        }
        Insert: {
          builder_capacity?: boolean | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contractor_capacity?: boolean | null
          created_at?: string
          id?: string
          partner_name: string
          service_areas?: string[] | null
          specializations?: string[] | null
        }
        Update: {
          builder_capacity?: boolean | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contractor_capacity?: boolean | null
          created_at?: string
          id?: string
          partner_name?: string
          service_areas?: string[] | null
          specializations?: string[] | null
        }
        Relationships: []
      }
      outreach_activities: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          assigned_to: string | null
          branch_id: string | null
          company_id: string
          completed_date: string | null
          contact_id: string | null
          created_at: string | null
          created_by: string
          duration_minutes: number | null
          id: string
          message_content: string | null
          next_action: string | null
          notes: string | null
          outcome: Database["public"]["Enums"]["activity_outcome"] | null
          scheduled_date: string | null
          sequence_day: number | null
          sequence_name: string | null
          sequence_phase: string | null
          status: string | null
          subject_line: string | null
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          assigned_to?: string | null
          branch_id?: string | null
          company_id: string
          completed_date?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by: string
          duration_minutes?: number | null
          id?: string
          message_content?: string | null
          next_action?: string | null
          notes?: string | null
          outcome?: Database["public"]["Enums"]["activity_outcome"] | null
          scheduled_date?: string | null
          sequence_day?: number | null
          sequence_name?: string | null
          sequence_phase?: string | null
          status?: string | null
          subject_line?: string | null
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          assigned_to?: string | null
          branch_id?: string | null
          company_id?: string
          completed_date?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string
          duration_minutes?: number | null
          id?: string
          message_content?: string | null
          next_action?: string | null
          notes?: string | null
          outcome?: Database["public"]["Enums"]["activity_outcome"] | null
          scheduled_date?: string | null
          sequence_day?: number | null
          sequence_name?: string | null
          sequence_phase?: string | null
          status?: string | null
          subject_line?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_activities_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "company_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_programs: {
        Row: {
          actual_end_date: string | null
          actual_installations: number | null
          assigned_to: string | null
          branch_id: string | null
          budget: number | null
          company_id: string
          created_at: string
          end_date: string | null
          id: string
          notes: string | null
          pilot_name: string | null
          program_type: Database["public"]["Enums"]["program_type"]
          roi_data: Json | null
          start_date: string | null
          status: Database["public"]["Enums"]["program_status"]
          success_metrics: Json | null
          target_installations: number | null
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          actual_installations?: number | null
          assigned_to?: string | null
          branch_id?: string | null
          budget?: number | null
          company_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          pilot_name?: string | null
          program_type: Database["public"]["Enums"]["program_type"]
          roi_data?: Json | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["program_status"]
          success_metrics?: Json | null
          target_installations?: number | null
          updated_at?: string
        }
        Update: {
          actual_end_date?: string | null
          actual_installations?: number | null
          assigned_to?: string | null
          branch_id?: string | null
          budget?: number | null
          company_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          pilot_name?: string | null
          program_type?: Database["public"]["Enums"]["program_type"]
          roi_data?: Json | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["program_status"]
          success_metrics?: Json | null
          target_installations?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilot_programs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "company_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_programs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string | null
        }
        Insert: {
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
        }
        Update: {
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_views: {
        Row: {
          configuration: Json | null
          created_at: string | null
          created_by: string | null
          display_order: number | null
          id: string
          is_default: boolean | null
          is_favorite: boolean | null
          table_name: string
          updated_at: string | null
          view_name: string
          view_permission_type: string | null
          view_section: string | null
          view_type: string
        }
        Insert: {
          configuration?: Json | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_default?: boolean | null
          is_favorite?: boolean | null
          table_name: string
          updated_at?: string | null
          view_name: string
          view_permission_type?: string | null
          view_section?: string | null
          view_type: string
        }
        Update: {
          configuration?: Json | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_default?: boolean | null
          is_favorite?: boolean | null
          table_name?: string
          updated_at?: string | null
          view_name?: string
          view_permission_type?: string | null
          view_section?: string | null
          view_type?: string
        }
        Relationships: []
      }
      scoring_configuration: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          field_name: string
          id: string
          industry_type: string | null
          range_value: string
          score_points: number
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          field_name: string
          id?: string
          industry_type?: string | null
          range_value: string
          score_points: number
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          field_name?: string
          id?: string
          industry_type?: string | null
          range_value?: string
          score_points?: number
        }
        Relationships: []
      }
      segmentation_scores: {
        Row: {
          builder_geographic_score: number | null
          builder_price_point_score: number | null
          builder_stability_score: number | null
          builder_volume_score: number | null
          calculated_at: string
          company_id: string
          contractor_emergency_score: number | null
          contractor_growth_score: number | null
          contractor_premium_score: number | null
          contractor_technology_score: number | null
          contractor_volume_score: number | null
          decision_authority_score: number | null
          id: string
          linkedin_professional_score: number | null
          social_media_score: number | null
          technology_adoption_score: number | null
          total_score: number | null
          website_quality_score: number | null
        }
        Insert: {
          builder_geographic_score?: number | null
          builder_price_point_score?: number | null
          builder_stability_score?: number | null
          builder_volume_score?: number | null
          calculated_at?: string
          company_id: string
          contractor_emergency_score?: number | null
          contractor_growth_score?: number | null
          contractor_premium_score?: number | null
          contractor_technology_score?: number | null
          contractor_volume_score?: number | null
          decision_authority_score?: number | null
          id?: string
          linkedin_professional_score?: number | null
          social_media_score?: number | null
          technology_adoption_score?: number | null
          total_score?: number | null
          website_quality_score?: number | null
        }
        Update: {
          builder_geographic_score?: number | null
          builder_price_point_score?: number | null
          builder_stability_score?: number | null
          builder_volume_score?: number | null
          calculated_at?: string
          company_id?: string
          contractor_emergency_score?: number | null
          contractor_growth_score?: number | null
          contractor_premium_score?: number | null
          contractor_technology_score?: number | null
          contractor_volume_score?: number | null
          decision_authority_score?: number | null
          id?: string
          linkedin_professional_score?: number | null
          social_media_score?: number | null
          technology_adoption_score?: number | null
          total_score?: number | null
          website_quality_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "segmentation_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      training_certifications: {
        Row: {
          certification_issued: boolean | null
          certification_number: string | null
          company_id: string
          completed_date: string | null
          contact_id: string
          created_at: string
          expiration_date: string | null
          id: string
          notes: string | null
          scheduled_date: string | null
          score: number | null
          training_type: Database["public"]["Enums"]["training_type"]
        }
        Insert: {
          certification_issued?: boolean | null
          certification_number?: string | null
          company_id: string
          completed_date?: string | null
          contact_id: string
          created_at?: string
          expiration_date?: string | null
          id?: string
          notes?: string | null
          scheduled_date?: string | null
          score?: number | null
          training_type: Database["public"]["Enums"]["training_type"]
        }
        Update: {
          certification_issued?: boolean | null
          certification_number?: string | null
          company_id?: string
          completed_date?: string | null
          contact_id?: string
          created_at?: string
          expiration_date?: string | null
          id?: string
          notes?: string | null
          scheduled_date?: string | null
          score?: number | null
          training_type?: Database["public"]["Enums"]["training_type"]
        }
        Relationships: [
          {
            foreignKeyName: "training_certifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_certifications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_view_preferences: {
        Row: {
          created_at: string | null
          custom_configuration: Json | null
          id: string
          is_favorite: boolean | null
          last_accessed: string | null
          saved_view_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          custom_configuration?: Json | null
          id?: string
          is_favorite?: boolean | null
          last_accessed?: string | null
          saved_view_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          custom_configuration?: Json | null
          id?: string
          is_favorite?: boolean | null
          last_accessed?: string | null
          saved_view_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_view_preferences_saved_view_id_fkey"
            columns: ["saved_view_id"]
            isOneToOne: false
            referencedRelation: "saved_views"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      company_hierarchy: {
        Row: {
          company_name: string | null
          full_path: string | null
          id: string | null
          level: number | null
          parent_company_id: string | null
          path: string[] | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_company_hierarchy: {
        Args: Record<PropertyKey, never>
        Returns: {
          company_name: string
          full_path: string
          id: string
          level: number
          parent_company_id: string
          path: string[]
        }[]
      }
      get_company_hierarchy_for_company: {
        Args: { _company_id: string }
        Returns: {
          company_name: string
          full_path: string
          id: string
          level: number
          parent_company_id: string
          path: string[]
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_elevated_access: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_user_approved: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      activity_outcome:
        | "Sent"
        | "Opened"
        | "Clicked"
        | "Replied"
        | "Connected"
        | "Completed"
        | "No Answer"
        | "Bounced"
      activity_type:
        | "Email"
        | "Phone"
        | "LinkedIn Connection"
        | "LinkedIn Message"
        | "Meeting"
        | "Demo"
        | "Training"
      app_role: "admin" | "sales_manager" | "sales_rep" | "read_only"
      approval_status: "pending" | "approved" | "rejected"
      contact_method: "Email" | "Phone" | "LinkedIn" | "Text"
      decision_tier: "Primary" | "Secondary" | "Influencer"
      product_type:
        | "Thermostat NT"
        | "Thermostat NLT4"
        | "Doorbell Wired"
        | "Doorbell Wireless"
        | "Camera Indoor"
        | "Camera Outdoor Wired"
        | "Camera Outdoor Wireless"
        | "Camera Floodlight"
        | "Nest Hub"
      program_status:
        | "Proposed"
        | "Approved"
        | "Active"
        | "Completed"
        | "Cancelled"
      program_type:
        | "HVAC Monitoring"
        | "Smart Home Ecosystem"
        | "Builder Integration"
      relationship_status: "Matched" | "Introduced" | "Active" | "Inactive"
      training_type:
        | "Touch 1: Business Benefits"
        | "Touch 2: Product Training"
        | "Touch 3: Sales Training"
        | "HVAC Monitoring Certification"
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
      activity_outcome: [
        "Sent",
        "Opened",
        "Clicked",
        "Replied",
        "Connected",
        "Completed",
        "No Answer",
        "Bounced",
      ],
      activity_type: [
        "Email",
        "Phone",
        "LinkedIn Connection",
        "LinkedIn Message",
        "Meeting",
        "Demo",
        "Training",
      ],
      app_role: ["admin", "sales_manager", "sales_rep", "read_only"],
      approval_status: ["pending", "approved", "rejected"],
      contact_method: ["Email", "Phone", "LinkedIn", "Text"],
      decision_tier: ["Primary", "Secondary", "Influencer"],
      product_type: [
        "Thermostat NT",
        "Thermostat NLT4",
        "Doorbell Wired",
        "Doorbell Wireless",
        "Camera Indoor",
        "Camera Outdoor Wired",
        "Camera Outdoor Wireless",
        "Camera Floodlight",
        "Nest Hub",
      ],
      program_status: [
        "Proposed",
        "Approved",
        "Active",
        "Completed",
        "Cancelled",
      ],
      program_type: [
        "HVAC Monitoring",
        "Smart Home Ecosystem",
        "Builder Integration",
      ],
      relationship_status: ["Matched", "Introduced", "Active", "Inactive"],
      training_type: [
        "Touch 1: Business Benefits",
        "Touch 2: Product Training",
        "Touch 3: Sales Training",
        "HVAC Monitoring Certification",
      ],
    },
  },
} as const

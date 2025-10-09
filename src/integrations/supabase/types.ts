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
      ai_usage_logs: {
        Row: {
          ai_model: string
          communication_id: string | null
          company_id: string | null
          completion_tokens: number | null
          contact_id: string | null
          created_at: string | null
          error_message: string | null
          feature_type: string
          id: string
          prompt_tokens: number | null
          request_metadata: Json | null
          response_metadata: Json | null
          status: string
          total_tokens: number | null
          user_id: string
        }
        Insert: {
          ai_model: string
          communication_id?: string | null
          company_id?: string | null
          completion_tokens?: number | null
          contact_id?: string | null
          created_at?: string | null
          error_message?: string | null
          feature_type: string
          id?: string
          prompt_tokens?: number | null
          request_metadata?: Json | null
          response_metadata?: Json | null
          status?: string
          total_tokens?: number | null
          user_id: string
        }
        Update: {
          ai_model?: string
          communication_id?: string | null
          company_id?: string | null
          completion_tokens?: number | null
          contact_id?: string | null
          created_at?: string | null
          error_message?: string | null
          feature_type?: string
          id?: string
          prompt_tokens?: number | null
          request_metadata?: Json | null
          response_metadata?: Json | null
          status?: string
          total_tokens?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "company_communications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_audit_log: {
        Row: {
          approved_by: string | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          new_status: Database["public"]["Enums"]["approval_status"]
          notes: string | null
          previous_status: Database["public"]["Enums"]["approval_status"] | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_status: Database["public"]["Enums"]["approval_status"]
          notes?: string | null
          previous_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_status?: Database["public"]["Enums"]["approval_status"]
          notes?: string | null
          previous_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
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
      bulk_access_alerts: {
        Row: {
          alert_details: Json | null
          alert_type: string
          created_at: string
          id: string
          record_count: number
          reviewed: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          alert_details?: Json | null
          alert_type: string
          created_at?: string
          id?: string
          record_count: number
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          alert_details?: Json | null
          alert_type?: string
          created_at?: string
          id?: string
          record_count?: number
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      business_context_settings: {
        Row: {
          business_description: string | null
          communication_guidelines: string | null
          created_at: string | null
          id: string
          key_products_services: string | null
          target_customer_profile: string | null
          team_mission: string | null
          updated_at: string | null
          updated_by: string | null
          value_proposition: string | null
        }
        Insert: {
          business_description?: string | null
          communication_guidelines?: string | null
          created_at?: string | null
          id?: string
          key_products_services?: string | null
          target_customer_profile?: string | null
          team_mission?: string | null
          updated_at?: string | null
          updated_by?: string | null
          value_proposition?: string | null
        }
        Update: {
          business_description?: string | null
          communication_guidelines?: string | null
          created_at?: string | null
          id?: string
          key_products_services?: string | null
          target_customer_profile?: string | null
          team_mission?: string | null
          updated_at?: string | null
          updated_by?: string | null
          value_proposition?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          address_line1: string | null
          annual_revenue_range: string | null
          annual_volume: number | null
          annual_volume_range: string | null
          assigned_to: string | null
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
          financial_health_rating: string | null
          franchise_name: string | null
          has_google_business_profile: boolean | null
          hvac_monitoring: string | null
          id: string
          industry_awards_recognition: boolean | null
          industry_specialties: string[] | null
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
          multiple_active_projects: boolean | null
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
          positive_reviews_reputation: boolean | null
          price_point_category: string | null
          primary_email: string | null
          primary_phone: string | null
          priority_tier: string | null
          profitability_level: string | null
          revenue_growth_indicators: boolean | null
          revenue_growth_trend: string | null
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
          assigned_to?: string | null
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
          financial_health_rating?: string | null
          franchise_name?: string | null
          has_google_business_profile?: boolean | null
          hvac_monitoring?: string | null
          id?: string
          industry_awards_recognition?: boolean | null
          industry_specialties?: string[] | null
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
          multiple_active_projects?: boolean | null
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
          positive_reviews_reputation?: boolean | null
          price_point_category?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          priority_tier?: string | null
          profitability_level?: string | null
          revenue_growth_indicators?: boolean | null
          revenue_growth_trend?: string | null
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
          assigned_to?: string | null
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
          financial_health_rating?: string | null
          franchise_name?: string | null
          has_google_business_profile?: boolean | null
          hvac_monitoring?: string | null
          id?: string
          industry_awards_recognition?: boolean | null
          industry_specialties?: string[] | null
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
          multiple_active_projects?: boolean | null
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
          positive_reviews_reputation?: boolean | null
          price_point_category?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          priority_tier?: string | null
          profitability_level?: string | null
          revenue_growth_indicators?: boolean | null
          revenue_growth_trend?: string | null
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
      company_ai_insights: {
        Row: {
          company_id: string
          competitive_advantages: string[] | null
          confidence_level: string | null
          created_at: string | null
          enriched_by: string | null
          growth_indicators: string[] | null
          id: string
          last_enriched_at: string | null
          market_positioning: string | null
          recommended_approach: string | null
          segment_rationale: string | null
          smart_home_readiness_score: number | null
        }
        Insert: {
          company_id: string
          competitive_advantages?: string[] | null
          confidence_level?: string | null
          created_at?: string | null
          enriched_by?: string | null
          growth_indicators?: string[] | null
          id?: string
          last_enriched_at?: string | null
          market_positioning?: string | null
          recommended_approach?: string | null
          segment_rationale?: string | null
          smart_home_readiness_score?: number | null
        }
        Update: {
          company_id?: string
          competitive_advantages?: string[] | null
          confidence_level?: string | null
          created_at?: string | null
          enriched_by?: string | null
          growth_indicators?: string[] | null
          id?: string
          last_enriched_at?: string | null
          market_positioning?: string | null
          recommended_approach?: string | null
          segment_rationale?: string | null
          smart_home_readiness_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_ai_insights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
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
      company_communications: {
        Row: {
          ai_model: string | null
          attempted_at: string | null
          communication_type: string
          company_id: string
          contact_id: string | null
          content: string
          conversation_active: boolean | null
          created_at: string | null
          generated_at: string | null
          id: string
          notes: string | null
          previous_context: string | null
          sent_at: string | null
          subject: string | null
          used: boolean | null
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          attempted_at?: string | null
          communication_type: string
          company_id: string
          contact_id?: string | null
          content: string
          conversation_active?: boolean | null
          created_at?: string | null
          generated_at?: string | null
          id?: string
          notes?: string | null
          previous_context?: string | null
          sent_at?: string | null
          subject?: string | null
          used?: boolean | null
          user_id: string
        }
        Update: {
          ai_model?: string | null
          attempted_at?: string | null
          communication_type?: string
          company_id?: string
          contact_id?: string | null
          content?: string
          conversation_active?: boolean | null
          created_at?: string | null
          generated_at?: string | null
          id?: string
          notes?: string | null
          previous_context?: string | null
          sent_at?: string | null
          subject?: string | null
          used?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_communications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_communications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
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
      contact_access_logs: {
        Row: {
          accessed_at: string | null
          action: string
          company_id: string | null
          contact_id: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accessed_at?: string | null
          action: string
          company_id?: string | null
          contact_id: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accessed_at?: string | null
          action?: string
          company_id?: string | null
          contact_id?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_access_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_access_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
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
      data_retention_policies: {
        Row: {
          created_at: string
          date_column: string
          enabled: boolean
          id: string
          last_cleanup_at: string | null
          retention_days: number
          table_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_column?: string
          enabled?: boolean
          id?: string
          last_cleanup_at?: string | null
          retention_days: number
          table_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_column?: string
          enabled?: boolean
          id?: string
          last_cleanup_at?: string | null
          retention_days?: number
          table_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      deletion_requests: {
        Row: {
          created_at: string | null
          id: string
          reason: string | null
          record_details: Json | null
          record_id: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          table_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason?: string | null
          record_details?: Json | null
          record_id: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          table_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string | null
          record_details?: Json | null
          record_id?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          table_name?: string
        }
        Relationships: []
      }
      duplicate_search_logs: {
        Row: {
          action_taken: string | null
          created_at: string | null
          id: string
          results_found: number | null
          search_parameters: Json | null
          search_type: string
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          id?: string
          results_found?: number | null
          search_parameters?: Json | null
          search_type: string
          user_id: string
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          id?: string
          results_found?: number | null
          search_parameters?: Json | null
          search_type?: string
          user_id?: string
        }
        Relationships: []
      }
      enrichment_logs: {
        Row: {
          company_id: string
          confidence_score: number | null
          created_at: string | null
          created_by: string | null
          enrichment_type: string
          error_message: string | null
          fields_enriched: Json | null
          id: string
          provider: string
          status: string
        }
        Insert: {
          company_id: string
          confidence_score?: number | null
          created_at?: string | null
          created_by?: string | null
          enrichment_type: string
          error_message?: string | null
          fields_enriched?: Json | null
          id?: string
          provider: string
          status: string
        }
        Update: {
          company_id?: string
          confidence_score?: number | null
          created_at?: string | null
          created_by?: string | null
          enrichment_type?: string
          error_message?: string | null
          fields_enriched?: Json | null
          id?: string
          provider?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      import_export_logs: {
        Row: {
          activity_type: string
          created_at: string
          detailed_errors: Json | null
          duplicate_count: number
          error_summary: string | null
          failed_count: number
          file_format: string | null
          filters_applied: Json | null
          id: string
          record_count: number
          successful_count: number
          table_name: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          detailed_errors?: Json | null
          duplicate_count?: number
          error_summary?: string | null
          failed_count?: number
          file_format?: string | null
          filters_applied?: Json | null
          id?: string
          record_count?: number
          successful_count?: number
          table_name: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          detailed_errors?: Json | null
          duplicate_count?: number
          error_summary?: string | null
          failed_count?: number
          file_format?: string | null
          filters_applied?: Json | null
          id?: string
          record_count?: number
          successful_count?: number
          table_name?: string
          user_id?: string
        }
        Relationships: []
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
      rate_limit_rules: {
        Row: {
          created_at: string
          enabled: boolean
          endpoint: string
          id: string
          requests_per_hour: number
          requests_per_minute: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          endpoint: string
          id?: string
          requests_per_hour: number
          requests_per_minute: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          endpoint?: string
          id?: string
          requests_per_hour?: number
          requests_per_minute?: number
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_tracking: {
        Row: {
          blocked: boolean | null
          created_at: string
          endpoint: string
          id: string
          request_count: number
          user_id: string | null
          window_end: string
          window_start: string
        }
        Insert: {
          blocked?: boolean | null
          created_at?: string
          endpoint: string
          id?: string
          request_count?: number
          user_id?: string | null
          window_end: string
          window_start: string
        }
        Update: {
          blocked?: boolean | null
          created_at?: string
          endpoint?: string
          id?: string
          request_count?: number
          user_id?: string | null
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      sales_reps: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          email: string
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          territory: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          email: string
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          territory?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          territory?: string | null
          updated_at?: string
        }
        Relationships: []
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
      user_roles: {
        Row: {
          access_expires_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          last_access_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          access_expires_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_access_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          access_expires_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_access_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      anonymize_ipv4: {
        Args: { ip_addr: unknown }
        Returns: unknown
      }
      anonymize_old_ip_addresses: {
        Args: { _days_old?: number }
        Returns: {
          records_anonymized: number
          table_name: string
        }[]
      }
      can_access_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: { _endpoint: string; _user_id: string; _window_minutes?: number }
        Returns: Json
      }
      cleanup_old_records: {
        Args: Record<PropertyKey, never>
        Returns: {
          cleaned_table: string
          records_deleted: number
          retention_days: number
        }[]
      }
      cleanup_rate_limit_tracking: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      find_duplicate_companies: {
        Args: { max_results?: number; similarity_threshold?: number }
        Returns: {
          company1_created_by: string
          company1_id: string
          company1_name: string
          company2_created_by: string
          company2_id: string
          company2_name: string
          same_industry: boolean
          same_state: boolean
          similarity_score: number
        }[]
      }
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_with_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_role_active: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_approved: {
        Args: { _user_id: string }
        Returns: boolean
      }
      log_security_event: {
        Args: { _event_details?: Json; _event_type: string }
        Returns: undefined
      }
      revoke_expired_access: {
        Args: Record<PropertyKey, never>
        Returns: {
          expired_at: string
          revoked_role: Database["public"]["Enums"]["app_role"]
          revoked_user_id: string
        }[]
      }
      user_approved_with_grace_period: {
        Args: { _hours?: number; _user_id: string }
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

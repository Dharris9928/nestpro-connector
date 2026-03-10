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
      access_reviews: {
        Row: {
          access_expires_at: string | null
          created_at: string
          id: string
          justification: string | null
          new_role: Database["public"]["Enums"]["app_role"] | null
          previous_role: Database["public"]["Enums"]["app_role"] | null
          review_type: string
          reviewed_at: string | null
          reviewer_id: string
          reviewer_notes: string | null
          status: string
          user_id: string
        }
        Insert: {
          access_expires_at?: string | null
          created_at?: string
          id?: string
          justification?: string | null
          new_role?: Database["public"]["Enums"]["app_role"] | null
          previous_role?: Database["public"]["Enums"]["app_role"] | null
          review_type: string
          reviewed_at?: string | null
          reviewer_id: string
          reviewer_notes?: string | null
          status?: string
          user_id: string
        }
        Update: {
          access_expires_at?: string | null
          created_at?: string
          id?: string
          justification?: string | null
          new_role?: Database["public"]["Enums"]["app_role"] | null
          previous_role?: Database["public"]["Enums"]["app_role"] | null
          review_type?: string
          reviewed_at?: string | null
          reviewer_id?: string
          reviewer_notes?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      account_status_changes: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          new_status: string
          old_status: string
          reason: string | null
          user_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          new_status: string
          old_status: string
          reason?: string | null
          user_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          new_status?: string
          old_status?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      activity_contacts: {
        Row: {
          activity_id: string
          contact_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          activity_id: string
          contact_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          activity_id?: string
          contact_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_contacts_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "outreach_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_masked"
            referencedColumns: ["id"]
          },
        ]
      }
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
            foreignKeyName: "ai_usage_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_financial_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      allowed_email_domains: {
        Row: {
          added_at: string
          added_by: string | null
          domain: string
          domain_type: string
          id: string
          is_active: boolean
          last_verified_at: string | null
          mx_records_valid: boolean | null
          notes: string | null
          verification_status: string | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          domain: string
          domain_type?: string
          id?: string
          is_active?: boolean
          last_verified_at?: string | null
          mx_records_valid?: boolean | null
          notes?: string | null
          verification_status?: string | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          domain?: string
          domain_type?: string
          id?: string
          is_active?: boolean
          last_verified_at?: string | null
          mx_records_valid?: boolean | null
          notes?: string | null
          verification_status?: string | null
        }
        Relationships: []
      }
      api_audit_log: {
        Row: {
          api_key_id: string | null
          created_at: string
          created_date: string
          endpoint: string
          error_message: string | null
          id: string
          ip_address: unknown
          method: string
          query_parameters: Json | null
          request_body: Json | null
          request_headers: Json | null
          response_time_ms: number | null
          status_code: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          created_date?: string
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          method: string
          query_parameters?: Json | null
          request_body?: Json | null
          request_headers?: Json | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          created_date?: string
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          method?: string
          query_parameters?: Json | null
          request_body?: Json | null
          request_headers?: Json | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_audit_log_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          allowed_endpoints: string[] | null
          allowed_ips: unknown[] | null
          created_at: string
          expires_at: string | null
          id: string
          key_hash: string
          key_name: string
          key_prefix: string
          last_used_at: string | null
          permission_level: Database["public"]["Enums"]["api_permission"]
          rate_limit_per_hour: number | null
          rate_limit_per_minute: number | null
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          status: Database["public"]["Enums"]["api_key_status"]
          updated_at: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          allowed_endpoints?: string[] | null
          allowed_ips?: unknown[] | null
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_name: string
          key_prefix: string
          last_used_at?: string | null
          permission_level?: Database["public"]["Enums"]["api_permission"]
          rate_limit_per_hour?: number | null
          rate_limit_per_minute?: number | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: Database["public"]["Enums"]["api_key_status"]
          updated_at?: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          allowed_endpoints?: string[] | null
          allowed_ips?: unknown[] | null
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_name?: string
          key_prefix?: string
          last_used_at?: string | null
          permission_level?: Database["public"]["Enums"]["api_permission"]
          rate_limit_per_hour?: number | null
          rate_limit_per_minute?: number | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: Database["public"]["Enums"]["api_key_status"]
          updated_at?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      apollo_email_activities: {
        Row: {
          activity_date: string
          activity_type: string
          apollo_activity_id: string | null
          apollo_contact_email: string | null
          apollo_metadata: Json | null
          click_count: number | null
          clicked_at: string | null
          company_id: string | null
          contact_id: string | null
          content: string | null
          created_at: string
          created_by: string
          id: string
          import_batch_id: string | null
          open_count: number | null
          opened_at: string | null
          previous_engagement_values: Json | null
          replied_at: string | null
          reply_count: number | null
          sent_at: string | null
          sequence_name: string | null
          sequence_step: number | null
          status: string | null
          subject: string | null
          updated_at: string
        }
        Insert: {
          activity_date: string
          activity_type: string
          apollo_activity_id?: string | null
          apollo_contact_email?: string | null
          apollo_metadata?: Json | null
          click_count?: number | null
          clicked_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          content?: string | null
          created_at?: string
          created_by: string
          id?: string
          import_batch_id?: string | null
          open_count?: number | null
          opened_at?: string | null
          previous_engagement_values?: Json | null
          replied_at?: string | null
          reply_count?: number | null
          sent_at?: string | null
          sequence_name?: string | null
          sequence_step?: number | null
          status?: string | null
          subject?: string | null
          updated_at?: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          apollo_activity_id?: string | null
          apollo_contact_email?: string | null
          apollo_metadata?: Json | null
          click_count?: number | null
          clicked_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string
          id?: string
          import_batch_id?: string | null
          open_count?: number | null
          opened_at?: string | null
          previous_engagement_values?: Json | null
          replied_at?: string | null
          reply_count?: number | null
          sent_at?: string | null
          sequence_name?: string | null
          sequence_step?: number | null
          status?: string | null
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apollo_email_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apollo_email_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apollo_email_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_financial_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apollo_email_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apollo_email_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apollo_email_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apollo_email_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_audit_log: {
        Row: {
          approved_by: string | null
          created_at: string | null
          id: string
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
      audit_logs: {
        Row: {
          created_at: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          operation: string
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          operation: string
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          operation?: string
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      auth_events_log: {
        Row: {
          created_at: string
          email_attempted: string | null
          event_type: string
          failure_reason: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email_attempted?: string | null
          event_type: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email_attempted?: string | null
          event_type?: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blocked_signup_attempts: {
        Row: {
          additional_details: Json | null
          attempted_at: string
          blocked_reason: string
          email: string
          email_domain: string
          id: string
          ip_address: unknown
          is_disposable: boolean | null
          mx_records_checked: boolean | null
          user_agent: string | null
        }
        Insert: {
          additional_details?: Json | null
          attempted_at?: string
          blocked_reason: string
          email: string
          email_domain: string
          id?: string
          ip_address?: unknown
          is_disposable?: boolean | null
          mx_records_checked?: boolean | null
          user_agent?: string | null
        }
        Update: {
          additional_details?: Json | null
          attempted_at?: string
          blocked_reason?: string
          email?: string
          email_domain?: string
          id?: string
          ip_address?: unknown
          is_disposable?: boolean | null
          mx_records_checked?: boolean | null
          user_agent?: string | null
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
          {
            foreignKeyName: "builder_scoring_details_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builder_scoring_details_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies_financial_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      building_permits: {
        Row: {
          address_line1: string | null
          applicant_email: string | null
          applicant_name: string | null
          applicant_phone: string | null
          builder_company_id: string | null
          builder_name: string | null
          city: string
          county: string | null
          created_at: string
          created_by: string
          data_source: string | null
          estimated_value: number | null
          filed_date: string | null
          id: string
          is_high_value: boolean | null
          is_matched_to_company: boolean | null
          issued_date: string | null
          match_confidence: number | null
          metro_area: string | null
          notes: string | null
          num_units: number | null
          permit_number: string | null
          project_description: string | null
          project_name: string
          project_type: string | null
          region: string | null
          scraped_at: string | null
          search_vector: unknown
          state: string
          status: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          applicant_email?: string | null
          applicant_name?: string | null
          applicant_phone?: string | null
          builder_company_id?: string | null
          builder_name?: string | null
          city: string
          county?: string | null
          created_at?: string
          created_by: string
          data_source?: string | null
          estimated_value?: number | null
          filed_date?: string | null
          id?: string
          is_high_value?: boolean | null
          is_matched_to_company?: boolean | null
          issued_date?: string | null
          match_confidence?: number | null
          metro_area?: string | null
          notes?: string | null
          num_units?: number | null
          permit_number?: string | null
          project_description?: string | null
          project_name: string
          project_type?: string | null
          region?: string | null
          scraped_at?: string | null
          search_vector?: unknown
          state: string
          status?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          applicant_email?: string | null
          applicant_name?: string | null
          applicant_phone?: string | null
          builder_company_id?: string | null
          builder_name?: string | null
          city?: string
          county?: string | null
          created_at?: string
          created_by?: string
          data_source?: string | null
          estimated_value?: number | null
          filed_date?: string | null
          id?: string
          is_high_value?: boolean | null
          is_matched_to_company?: boolean | null
          issued_date?: string | null
          match_confidence?: number | null
          metro_area?: string | null
          notes?: string | null
          num_units?: number | null
          permit_number?: string | null
          project_description?: string | null
          project_name?: string
          project_type?: string | null
          region?: string | null
          scraped_at?: string | null
          search_vector?: unknown
          state?: string
          status?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "building_permits_builder_company_id_fkey"
            columns: ["builder_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "building_permits_builder_company_id_fkey"
            columns: ["builder_company_id"]
            isOneToOne: false
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "building_permits_builder_company_id_fkey"
            columns: ["builder_company_id"]
            isOneToOne: false
            referencedRelation: "companies_financial_masked"
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
      business_continuity_tests: {
        Row: {
          conducted_by: string | null
          corrective_actions: string | null
          created_at: string | null
          duration_minutes: number | null
          findings: string | null
          id: string
          issues_identified: string | null
          next_test_date: string | null
          result: string
          rpo_actual_minutes: number | null
          rpo_target_minutes: number | null
          rto_actual_minutes: number | null
          rto_target_minutes: number | null
          test_date: string | null
          test_description: string
          test_type: string
        }
        Insert: {
          conducted_by?: string | null
          corrective_actions?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          findings?: string | null
          id?: string
          issues_identified?: string | null
          next_test_date?: string | null
          result: string
          rpo_actual_minutes?: number | null
          rpo_target_minutes?: number | null
          rto_actual_minutes?: number | null
          rto_target_minutes?: number | null
          test_date?: string | null
          test_description: string
          test_type: string
        }
        Update: {
          conducted_by?: string | null
          corrective_actions?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          findings?: string | null
          id?: string
          issues_identified?: string | null
          next_test_date?: string | null
          result?: string
          rpo_actual_minutes?: number | null
          rpo_target_minutes?: number | null
          rto_actual_minutes?: number | null
          rto_target_minutes?: number | null
          test_date?: string | null
          test_description?: string
          test_type?: string
        }
        Relationships: []
      }
      change_management_log: {
        Row: {
          affected_systems: string[] | null
          approved_by: string | null
          change_description: string
          change_type: string
          change_window: string | null
          created_at: string | null
          documentation_url: string | null
          id: string
          impact_assessment: string | null
          implemented_at: string | null
          implemented_by: string | null
          requested_by: string | null
          risk_level: string
          rollback_plan: string | null
          scheduled_date: string | null
          stakeholders_notified: boolean | null
          status: string
          testing_evidence: string | null
          updated_at: string | null
        }
        Insert: {
          affected_systems?: string[] | null
          approved_by?: string | null
          change_description: string
          change_type: string
          change_window?: string | null
          created_at?: string | null
          documentation_url?: string | null
          id?: string
          impact_assessment?: string | null
          implemented_at?: string | null
          implemented_by?: string | null
          requested_by?: string | null
          risk_level: string
          rollback_plan?: string | null
          scheduled_date?: string | null
          stakeholders_notified?: boolean | null
          status?: string
          testing_evidence?: string | null
          updated_at?: string | null
        }
        Update: {
          affected_systems?: string[] | null
          approved_by?: string | null
          change_description?: string
          change_type?: string
          change_window?: string | null
          created_at?: string | null
          documentation_url?: string | null
          id?: string
          impact_assessment?: string | null
          implemented_at?: string | null
          implemented_by?: string | null
          requested_by?: string | null
          risk_level?: string
          rollback_plan?: string | null
          scheduled_date?: string | null
          stakeholders_notified?: boolean | null
          status?: string
          testing_evidence?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      communication_contacts: {
        Row: {
          communication_id: string
          contact_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          communication_id: string
          contact_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          communication_id?: string
          contact_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_contacts_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "company_communications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_masked"
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
          assigned_to: string | null
          assigned_to_sales_rep_id: string | null
          average_home_price: number | null
          average_home_price_range: string | null
          buying_intent_last_detected: string | null
          buying_intent_strength: string | null
          buying_intent_topics: string[] | null
          city: string | null
          company_logo: string | null
          company_name: string
          company_type: string | null
          contractor_specialty: string | null
          created_at: string | null
          created_by: string
          current_smart_home_offerings: string[] | null
          currently_using_technologies: string[] | null
          emergency_service_percentage: number | null
          encryption_version: number | null
          facebook_url: string | null
          financial_health_rating: string | null
          franchise_name: string | null
          has_google_business_profile: boolean | null
          hvac_monitoring: string | null
          id: string
          import_batch_id: string | null
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
          primary_email_encrypted: string | null
          primary_phone: string | null
          primary_phone_encrypted: string | null
          priority_tier: string | null
          profitability_level: string | null
          region: string | null
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
          assigned_to_sales_rep_id?: string | null
          average_home_price?: number | null
          average_home_price_range?: string | null
          buying_intent_last_detected?: string | null
          buying_intent_strength?: string | null
          buying_intent_topics?: string[] | null
          city?: string | null
          company_logo?: string | null
          company_name: string
          company_type?: string | null
          contractor_specialty?: string | null
          created_at?: string | null
          created_by: string
          current_smart_home_offerings?: string[] | null
          currently_using_technologies?: string[] | null
          emergency_service_percentage?: number | null
          encryption_version?: number | null
          facebook_url?: string | null
          financial_health_rating?: string | null
          franchise_name?: string | null
          has_google_business_profile?: boolean | null
          hvac_monitoring?: string | null
          id?: string
          import_batch_id?: string | null
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
          primary_email_encrypted?: string | null
          primary_phone?: string | null
          primary_phone_encrypted?: string | null
          priority_tier?: string | null
          profitability_level?: string | null
          region?: string | null
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
          assigned_to_sales_rep_id?: string | null
          average_home_price?: number | null
          average_home_price_range?: string | null
          buying_intent_last_detected?: string | null
          buying_intent_strength?: string | null
          buying_intent_topics?: string[] | null
          city?: string | null
          company_logo?: string | null
          company_name?: string
          company_type?: string | null
          contractor_specialty?: string | null
          created_at?: string | null
          created_by?: string
          current_smart_home_offerings?: string[] | null
          currently_using_technologies?: string[] | null
          emergency_service_percentage?: number | null
          encryption_version?: number | null
          facebook_url?: string | null
          financial_health_rating?: string | null
          franchise_name?: string | null
          has_google_business_profile?: boolean | null
          hvac_monitoring?: string | null
          id?: string
          import_batch_id?: string | null
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
          primary_email_encrypted?: string | null
          primary_phone?: string | null
          primary_phone_encrypted?: string | null
          priority_tier?: string | null
          profitability_level?: string | null
          region?: string | null
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
            foreignKeyName: "companies_assigned_to_sales_rep_id_fkey"
            columns: ["assigned_to_sales_rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "companies_parent_company_id_fkey"
            columns: ["parent_company_id"]
            isOneToOne: false
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_parent_company_id_fkey"
            columns: ["parent_company_id"]
            isOneToOne: false
            referencedRelation: "companies_financial_masked"
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
          {
            foreignKeyName: "company_ai_insights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_ai_insights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies_financial_masked"
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
          {
            foreignKeyName: "company_branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_financial_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      company_communications: {
        Row: {
          ai_model: string | null
          assigned_to: string | null
          attempted_at: string | null
          communication_type: string
          company_id: string
          contact_id: string | null
          content: string
          conversation_active: boolean | null
          created_at: string | null
          email_opened_at: string | null
          email_responded_at: string | null
          generated_at: string | null
          id: string
          import_batch_id: string | null
          notes: string | null
          opportunity_id: string | null
          previous_context: string | null
          sent_at: string | null
          subject: string | null
          used: boolean | null
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          assigned_to?: string | null
          attempted_at?: string | null
          communication_type: string
          company_id: string
          contact_id?: string | null
          content: string
          conversation_active?: boolean | null
          created_at?: string | null
          email_opened_at?: string | null
          email_responded_at?: string | null
          generated_at?: string | null
          id?: string
          import_batch_id?: string | null
          notes?: string | null
          opportunity_id?: string | null
          previous_context?: string | null
          sent_at?: string | null
          subject?: string | null
          used?: boolean | null
          user_id: string
        }
        Update: {
          ai_model?: string | null
          assigned_to?: string | null
          attempted_at?: string | null
          communication_type?: string
          company_id?: string
          contact_id?: string | null
          content?: string
          conversation_active?: boolean | null
          created_at?: string | null
          email_opened_at?: string | null
          email_responded_at?: string | null
          generated_at?: string | null
          id?: string
          import_batch_id?: string | null
          notes?: string | null
          opportunity_id?: string | null
          previous_context?: string | null
          sent_at?: string | null
          subject?: string | null
          used?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_communications_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_communications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_communications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_communications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_financial_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_communications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_communications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_communications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_communications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_communications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
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
          relationship_status: Database["public"]["Enums"]["relationship_status"]
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          introduction_date?: string | null
          match_reason?: string | null
          match_score?: number | null
          relationship_status?: Database["public"]["Enums"]["relationship_status"]
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          introduction_date?: string | null
          match_reason?: string | null
          match_score?: number | null
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
            foreignKeyName: "company_partner_matches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_partner_matches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_financial_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_documents: {
        Row: {
          change_summary: string | null
          content: string
          created_at: string | null
          document_type: string
          effective_date: string
          id: string
          is_current: boolean | null
          published_at: string | null
          published_by: string | null
          requires_user_acceptance: boolean | null
          updated_at: string | null
          version: string
        }
        Insert: {
          change_summary?: string | null
          content: string
          created_at?: string | null
          document_type: string
          effective_date: string
          id?: string
          is_current?: boolean | null
          published_at?: string | null
          published_by?: string | null
          requires_user_acceptance?: boolean | null
          updated_at?: string | null
          version: string
        }
        Update: {
          change_summary?: string | null
          content?: string
          created_at?: string | null
          document_type?: string
          effective_date?: string
          id?: string
          is_current?: boolean | null
          published_at?: string | null
          published_by?: string | null
          requires_user_acceptance?: boolean | null
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      contact_access_logs: {
        Row: {
          accessed_at: string | null
          action: string
          company_id: string | null
          contact_id: string | null
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accessed_at?: string | null
          action: string
          company_id?: string | null
          contact_id?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accessed_at?: string | null
          action?: string
          company_id?: string | null
          contact_id?: string | null
          id?: string
          ip_address?: unknown
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
            foreignKeyName: "contact_access_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_access_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_financial_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_access_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_access_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_access_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_access_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          assigned_to: string | null
          branch_id: string | null
          company_id: string | null
          created_at: string | null
          decision_tier: Database["public"]["Enums"]["decision_tier"] | null
          email: string | null
          email_encrypted: string | null
          encryption_version: number | null
          first_name: string
          id: string
          import_batch_id: string | null
          last_name: string
          linkedin_activity_score: number | null
          linkedin_connections: number | null
          linkedin_url: string | null
          mobile: string | null
          mobile_encrypted: string | null
          notes: string | null
          phone: string | null
          phone_encrypted: string | null
          preferred_contact_method:
            | Database["public"]["Enums"]["contact_method"]
            | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          branch_id?: string | null
          company_id?: string | null
          created_at?: string | null
          decision_tier?: Database["public"]["Enums"]["decision_tier"] | null
          email?: string | null
          email_encrypted?: string | null
          encryption_version?: number | null
          first_name: string
          id?: string
          import_batch_id?: string | null
          last_name: string
          linkedin_activity_score?: number | null
          linkedin_connections?: number | null
          linkedin_url?: string | null
          mobile?: string | null
          mobile_encrypted?: string | null
          notes?: string | null
          phone?: string | null
          phone_encrypted?: string | null
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          branch_id?: string | null
          company_id?: string | null
          created_at?: string | null
          decision_tier?: Database["public"]["Enums"]["decision_tier"] | null
          email?: string | null
          email_encrypted?: string | null
          encryption_version?: number | null
          first_name?: string
          id?: string
          import_batch_id?: string | null
          last_name?: string
          linkedin_activity_score?: number | null
          linkedin_connections?: number | null
          linkedin_url?: string | null
          mobile?: string | null
          mobile_encrypted?: string | null
          notes?: string | null
          phone?: string | null
          phone_encrypted?: string | null
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_financial_masked"
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
          {
            foreignKeyName: "contractor_scoring_details_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_scoring_details_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies_financial_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      data_export_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          expires_at: string | null
          export_url: string | null
          file_size_bytes: number | null
          id: string
          record_count: Json | null
          request_type: string
          status: string
          tables_requested: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          export_url?: string | null
          file_size_bytes?: number | null
          id?: string
          record_count?: Json | null
          request_type?: string
          status?: string
          tables_requested?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          export_url?: string | null
          file_size_bytes?: number | null
          id?: string
          record_count?: Json | null
          request_type?: string
          status?: string
          tables_requested?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      document_acceptances: {
        Row: {
          acceptance_method: string | null
          accepted_at: string | null
          document_id: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string
        }
        Insert: {
          acceptance_method?: string | null
          accepted_at?: string | null
          document_id: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id: string
        }
        Update: {
          acceptance_method?: string | null
          accepted_at?: string | null
          document_id?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_acceptances_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "compliance_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      dpa_agreements: {
        Row: {
          agreement_url: string | null
          counterparty_name: string
          counterparty_type: string
          created_at: string | null
          data_categories: string[] | null
          expiry_date: string | null
          id: string
          notes: string | null
          processing_purposes: string[] | null
          renewal_reminder_sent: boolean | null
          retention_period: string | null
          signed_by_them: string | null
          signed_by_us: string | null
          signed_date: string | null
          status: string
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          agreement_url?: string | null
          counterparty_name: string
          counterparty_type: string
          created_at?: string | null
          data_categories?: string[] | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          processing_purposes?: string[] | null
          renewal_reminder_sent?: boolean | null
          retention_period?: string | null
          signed_by_them?: string | null
          signed_by_us?: string | null
          signed_date?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          agreement_url?: string | null
          counterparty_name?: string
          counterparty_type?: string
          created_at?: string | null
          data_categories?: string[] | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          processing_purposes?: string[] | null
          renewal_reminder_sent?: boolean | null
          retention_period?: string | null
          signed_by_them?: string | null
          signed_by_us?: string | null
          signed_date?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dpa_agreements_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "dpa_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      dpa_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          jurisdiction: string
          last_reviewed_date: string | null
          legal_approved: boolean | null
          legal_approved_at: string | null
          legal_approved_by: string | null
          next_review_date: string | null
          notes: string | null
          template_content: string
          template_name: string
          template_type: string
          updated_at: string | null
          version: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          jurisdiction: string
          last_reviewed_date?: string | null
          legal_approved?: boolean | null
          legal_approved_at?: string | null
          legal_approved_by?: string | null
          next_review_date?: string | null
          notes?: string | null
          template_content: string
          template_name: string
          template_type: string
          updated_at?: string | null
          version: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          jurisdiction?: string
          last_reviewed_date?: string | null
          legal_approved?: boolean | null
          legal_approved_at?: string | null
          legal_approved_by?: string | null
          next_review_date?: string | null
          notes?: string | null
          template_content?: string
          template_name?: string
          template_type?: string
          updated_at?: string | null
          version?: string
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
      email_logs: {
        Row: {
          created_at: string
          delivered_at: string | null
          email_type: string
          error_message: string | null
          id: string
          metadata: Json | null
          opened_at: string | null
          recipient_email: string
          recipient_user_id: string | null
          resend_email_id: string | null
          sender_email: string
          sent_at: string
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          email_type: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_email: string
          recipient_user_id?: string | null
          resend_email_id?: string | null
          sender_email?: string
          sent_at?: string
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_email?: string
          recipient_user_id?: string | null
          resend_email_id?: string | null
          sender_email?: string
          sent_at?: string
          status?: string
          subject?: string
        }
        Relationships: []
      }
      encryption_audit_log: {
        Row: {
          encryption_version: number | null
          error_details: string | null
          id: string
          metadata: Json | null
          operation_type: string
          performed_at: string
          performed_by: string | null
          record_count: number | null
          status: string
          table_name: string
        }
        Insert: {
          encryption_version?: number | null
          error_details?: string | null
          id?: string
          metadata?: Json | null
          operation_type: string
          performed_at?: string
          performed_by?: string | null
          record_count?: number | null
          status: string
          table_name: string
        }
        Update: {
          encryption_version?: number | null
          error_details?: string | null
          id?: string
          metadata?: Json | null
          operation_type?: string
          performed_at?: string
          performed_by?: string | null
          record_count?: number | null
          status?: string
          table_name?: string
        }
        Relationships: []
      }
      encryption_config: {
        Row: {
          id: string
          is_active: boolean
          key_rotated_at: string | null
          key_value: string | null
          key_version: number
          notes: string | null
          rotated_by: string | null
        }
        Insert: {
          id?: string
          is_active?: boolean
          key_rotated_at?: string | null
          key_value?: string | null
          key_version?: number
          notes?: string | null
          rotated_by?: string | null
        }
        Update: {
          id?: string
          is_active?: boolean
          key_rotated_at?: string | null
          key_value?: string | null
          key_version?: number
          notes?: string | null
          rotated_by?: string | null
        }
        Relationships: []
      }
      encryption_rotation_progress: {
        Row: {
          completed_at: string | null
          id: string
          initiated_by: string | null
          migrated_companies: number | null
          migrated_contacts: number | null
          new_version: number
          old_version: number
          started_at: string | null
          status: string | null
          total_companies: number | null
          total_contacts: number | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          initiated_by?: string | null
          migrated_companies?: number | null
          migrated_contacts?: number | null
          new_version: number
          old_version: number
          started_at?: string | null
          status?: string | null
          total_companies?: number | null
          total_contacts?: number | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          initiated_by?: string | null
          migrated_companies?: number | null
          migrated_contacts?: number | null
          new_version?: number
          old_version?: number
          started_at?: string | null
          status?: string | null
          total_companies?: number | null
          total_contacts?: number | null
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
          {
            foreignKeyName: "enrichment_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrichment_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_financial_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      export_approval_requests: {
        Row: {
          business_justification: string
          created_at: string
          expires_at: string
          export_type: string
          filter_criteria: Json | null
          id: string
          record_count: number
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          table_name: string
        }
        Insert: {
          business_justification: string
          created_at?: string
          expires_at?: string
          export_type: string
          filter_criteria?: Json | null
          id?: string
          record_count: number
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          table_name: string
        }
        Update: {
          business_justification?: string
          created_at?: string
          expires_at?: string
          export_type?: string
          filter_criteria?: Json | null
          id?: string
          record_count?: number
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          table_name?: string
        }
        Relationships: []
      }
      export_logs: {
        Row: {
          created_at: string
          error_message: string | null
          export_type: string
          filter_criteria: Json | null
          id: string
          ip_address: unknown
          record_count: number
          status: string
          table_name: string
          user_agent: string | null
          user_id: string
          watermark: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          export_type: string
          filter_criteria?: Json | null
          id?: string
          ip_address?: unknown
          record_count: number
          status?: string
          table_name: string
          user_agent?: string | null
          user_id: string
          watermark?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          export_type?: string
          filter_criteria?: Json | null
          id?: string
          ip_address?: unknown
          record_count?: number
          status?: string
          table_name?: string
          user_agent?: string | null
          user_id?: string
          watermark?: string | null
        }
        Relationships: []
      }
      export_quotas: {
        Row: {
          created_at: string
          daily_limit: number
          id: string
          requires_approval_threshold: number
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_limit: number
          id?: string
          requires_approval_threshold?: number
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_limit?: number
          id?: string
          requires_approval_threshold?: number
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      field_access_audit_log: {
        Row: {
          access_granted: boolean
          accessed_at: string
          created_at: string | null
          field_name: string
          id: string
          record_id: string
          table_name: string
          user_id: string
        }
        Insert: {
          access_granted: boolean
          accessed_at?: string
          created_at?: string | null
          field_name: string
          id?: string
          record_id: string
          table_name: string
          user_id: string
        }
        Update: {
          access_granted?: boolean
          accessed_at?: string
          created_at?: string | null
          field_name?: string
          id?: string
          record_id?: string
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      field_access_log: {
        Row: {
          access_granted: boolean
          accessed_at: string
          field_name: string
          id: string
          record_id: string
          table_name: string
          user_agent: string | null
          user_id: string
          user_ip: string | null
        }
        Insert: {
          access_granted?: boolean
          accessed_at?: string
          field_name: string
          id?: string
          record_id: string
          table_name: string
          user_agent?: string | null
          user_id: string
          user_ip?: string | null
        }
        Update: {
          access_granted?: boolean
          accessed_at?: string
          field_name?: string
          id?: string
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_id?: string
          user_ip?: string | null
        }
        Relationships: []
      }
      field_permissions: {
        Row: {
          created_at: string
          field_name: string
          id: string
          is_pii: boolean
          masking_pattern: string | null
          min_role_required: string
          table_name: string
        }
        Insert: {
          created_at?: string
          field_name: string
          id?: string
          is_pii?: boolean
          masking_pattern?: string | null
          min_role_required: string
          table_name: string
        }
        Update: {
          created_at?: string
          field_name?: string
          id?: string
          is_pii?: boolean
          masking_pattern?: string | null
          min_role_required?: string
          table_name?: string
        }
        Relationships: []
      }
      impersonation_sessions: {
        Row: {
          admin_user_id: string
          created_at: string | null
          ended_at: string | null
          expires_at: string
          id: string
          impersonated_user_id: string
          ip_address: unknown
          is_active: boolean | null
          session_token: string
          user_agent: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string | null
          ended_at?: string | null
          expires_at: string
          id?: string
          impersonated_user_id: string
          ip_address?: unknown
          is_active?: boolean | null
          session_token: string
          user_agent?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string | null
          ended_at?: string | null
          expires_at?: string
          id?: string
          impersonated_user_id?: string
          ip_address?: unknown
          is_active?: boolean | null
          session_token?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      import_ai_sessions: {
        Row: {
          ai_mappings: Json
          completed_at: string | null
          confidence_scores: Json
          created_at: string | null
          file_name: string
          file_size: number
          id: string
          raw_headers: Json
          rows_accepted: number | null
          rows_parsed: number
          rows_rejected: number | null
          status: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          ai_mappings: Json
          completed_at?: string | null
          confidence_scores: Json
          created_at?: string | null
          file_name: string
          file_size: number
          id?: string
          raw_headers: Json
          rows_accepted?: number | null
          rows_parsed: number
          rows_rejected?: number | null
          status?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          ai_mappings?: Json
          completed_at?: string | null
          confidence_scores?: Json
          created_at?: string | null
          file_name?: string
          file_size?: number
          id?: string
          raw_headers?: Json
          rows_accepted?: number | null
          rows_parsed?: number
          rows_rejected?: number | null
          status?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      import_export_logs: {
        Row: {
          activity_type: string
          affected_tables: string[] | null
          batch_id: string | null
          created_at: string
          detailed_errors: Json | null
          duplicate_count: number
          error_summary: string | null
          failed_count: number
          file_format: string | null
          file_name: string | null
          filters_applied: Json | null
          id: string
          record_count: number
          rollback_available: boolean | null
          rolled_back_at: string | null
          rolled_back_by: string | null
          successful_count: number
          table_name: string
          user_id: string
        }
        Insert: {
          activity_type: string
          affected_tables?: string[] | null
          batch_id?: string | null
          created_at?: string
          detailed_errors?: Json | null
          duplicate_count?: number
          error_summary?: string | null
          failed_count?: number
          file_format?: string | null
          file_name?: string | null
          filters_applied?: Json | null
          id?: string
          record_count?: number
          rollback_available?: boolean | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          successful_count?: number
          table_name: string
          user_id: string
        }
        Update: {
          activity_type?: string
          affected_tables?: string[] | null
          batch_id?: string | null
          created_at?: string
          detailed_errors?: Json | null
          duplicate_count?: number
          error_summary?: string | null
          failed_count?: number
          file_format?: string | null
          file_name?: string | null
          filters_applied?: Json | null
          id?: string
          record_count?: number
          rollback_available?: boolean | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
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
          {
            foreignKeyName: "installation_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_financial_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      job_quote_contacts: {
        Row: {
          contact_id: string
          contact_type: string
          created_at: string
          id: string
          job_quote_id: string
        }
        Insert: {
          contact_id: string
          contact_type?: string
          created_at?: string
          id?: string
          job_quote_id: string
        }
        Update: {
          contact_id?: string
          contact_type?: string
          created_at?: string
          id?: string
          job_quote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_quote_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_quote_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_quote_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_quote_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_quote_contacts_job_quote_id_fkey"
            columns: ["job_quote_id"]
            isOneToOne: false
            referencedRelation: "job_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      job_quote_products: {
        Row: {
          created_at: string | null
          id: string
          job_quote_id: string
          product_name: string
          quantity: number
          total_price: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_quote_id: string
          product_name: string
          quantity?: number
          total_price?: number | null
          unit_price?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          job_quote_id?: string
          product_name?: string
          quantity?: number
          total_price?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_quote_products_job_quote_id_fkey"
            columns: ["job_quote_id"]
            isOneToOne: false
            referencedRelation: "job_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      job_quotes: {
        Row: {
          assigned_to: string | null
          assigned_to_sales_rep_id: string | null
          comments: string | null
          contractor_id: string | null
          created_at: string
          created_by: string
          date_received: string
          date_won: string | null
          distributor_id: string | null
          id: string
          notes: string | null
          price: number | null
          product: string | null
          quantity: number | null
          quote_number: string | null
          status: string
          updated_at: string
          wholesaler_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_sales_rep_id?: string | null
          comments?: string | null
          contractor_id?: string | null
          created_at?: string
          created_by: string
          date_received?: string
          date_won?: string | null
          distributor_id?: string | null
          id?: string
          notes?: string | null
          price?: number | null
          product?: string | null
          quantity?: number | null
          quote_number?: string | null
          status?: string
          updated_at?: string
          wholesaler_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          assigned_to_sales_rep_id?: string | null
          comments?: string | null
          contractor_id?: string | null
          created_at?: string
          created_by?: string
          date_received?: string
          date_won?: string | null
          distributor_id?: string | null
          id?: string
          notes?: string | null
          price?: number | null
          product?: string | null
          quantity?: number | null
          quote_number?: string | null
          status?: string
          updated_at?: string
          wholesaler_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_quotes_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_quotes_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_quotes_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_quotes_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "companies_financial_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_quotes_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_quotes_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_quotes_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "companies_financial_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_quotes_wholesaler_id_fkey"
            columns: ["wholesaler_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_quotes_wholesaler_id_fkey"
            columns: ["wholesaler_id"]
            isOneToOne: false
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_quotes_wholesaler_id_fkey"
            columns: ["wholesaler_id"]
            isOneToOne: false
            referencedRelation: "companies_financial_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      metro_areas: {
        Row: {
          created_at: string
          id: string
          included_cities: string[] | null
          is_active: boolean | null
          metro_name: string
          primary_city: string
          state: string
        }
        Insert: {
          created_at?: string
          id?: string
          included_cities?: string[] | null
          is_active?: boolean | null
          metro_name: string
          primary_city: string
          state: string
        }
        Update: {
          created_at?: string
          id?: string
          included_cities?: string[] | null
          is_active?: boolean | null
          metro_name?: string
          primary_city?: string
          state?: string
        }
        Relationships: []
      }
      mfa_requirements: {
        Row: {
          created_at: string
          grace_period_days: number
          id: string
          is_required: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          grace_period_days?: number
          id?: string
          is_required?: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          grace_period_days?: number
          id?: string
          is_required?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          access_expiring: boolean
          access_requests: boolean
          access_revoked: boolean
          access_status: boolean
          appeal_submitted: boolean
          communication_requests: boolean
          created_at: string
          delivery_method: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_expiring?: boolean
          access_requests?: boolean
          access_revoked?: boolean
          access_status?: boolean
          appeal_submitted?: boolean
          communication_requests?: boolean
          created_at?: string
          delivery_method?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_expiring?: boolean
          access_requests?: boolean
          access_revoked?: boolean
          access_status?: boolean
          appeal_submitted?: boolean
          communication_requests?: boolean
          created_at?: string
          delivery_method?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_required: boolean
          created_at: string
          id: string
          link_url: string | null
          message: string
          read: boolean
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_required?: boolean
          created_at?: string
          id?: string
          link_url?: string | null
          message: string
          read?: boolean
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_required?: boolean
          created_at?: string
          id?: string
          link_url?: string | null
          message?: string
          read?: boolean
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          amount: number | null
          assigned_to: string | null
          assigned_to_sales_rep_id: string | null
          closed_date: string | null
          company_id: string
          confidence: number | null
          contractor_id: string | null
          created_at: string | null
          created_by: string
          distributor: string | null
          expected_close_date: string | null
          id: string
          notes: string | null
          opportunity_name: string
          probability: number | null
          sales_personnel_contact_id: string | null
          source: string | null
          stage: string
          unit_needed_date: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          assigned_to?: string | null
          assigned_to_sales_rep_id?: string | null
          closed_date?: string | null
          company_id: string
          confidence?: number | null
          contractor_id?: string | null
          created_at?: string | null
          created_by: string
          distributor?: string | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          opportunity_name: string
          probability?: number | null
          sales_personnel_contact_id?: string | null
          source?: string | null
          stage?: string
          unit_needed_date?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          assigned_to?: string | null
          assigned_to_sales_rep_id?: string | null
          closed_date?: string | null
          company_id?: string
          confidence?: number | null
          contractor_id?: string | null
          created_at?: string | null
          created_by?: string
          distributor?: string | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          opportunity_name?: string
          probability?: number | null
          sales_personnel_contact_id?: string | null
          source?: string | null
          stage?: string
          unit_needed_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_assigned_to_sales_rep_id_fkey"
            columns: ["assigned_to_sales_rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_financial_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "companies_financial_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_sales_personnel_contact_id_fkey"
            columns: ["sales_personnel_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_sales_personnel_contact_id_fkey"
            columns: ["sales_personnel_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_sales_personnel_contact_id_fkey"
            columns: ["sales_personnel_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_sales_personnel_contact_id_fkey"
            columns: ["sales_personnel_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_contacts: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          opportunity_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          opportunity_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          opportunity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_contacts_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_products: {
        Row: {
          created_at: string | null
          discount_percent: number | null
          id: string
          opportunity_id: string
          product_name: string
          quantity: number
          total_price: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          discount_percent?: number | null
          id?: string
          opportunity_id: string
          product_name: string
          quantity?: number
          total_price?: number | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          discount_percent?: number | null
          id?: string
          opportunity_id?: string
          product_name?: string
          quantity?: number
          total_price?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_products_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
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
          email_opened_at: string | null
          email_responded_at: string | null
          id: string
          message_content: string | null
          next_action: string | null
          notes: string | null
          opportunity_id: string | null
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
          email_opened_at?: string | null
          email_responded_at?: string | null
          id?: string
          message_content?: string | null
          next_action?: string | null
          notes?: string | null
          opportunity_id?: string | null
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
          email_opened_at?: string | null
          email_responded_at?: string | null
          id?: string
          message_content?: string | null
          next_action?: string | null
          notes?: string | null
          opportunity_id?: string | null
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
            foreignKeyName: "outreach_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_financial_masked"
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
            foreignKeyName: "outreach_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_codes: {
        Row: {
          code: string
          code_hash: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          code_hash: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          code_hash?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      permit_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          id: string
          is_acknowledged: boolean | null
          message: string | null
          permit_id: string
          priority: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          id?: string
          is_acknowledged?: boolean | null
          message?: string | null
          permit_id: string
          priority?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          id?: string
          is_acknowledged?: boolean | null
          message?: string | null
          permit_id?: string
          priority?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permit_alerts_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "building_permits"
            referencedColumns: ["id"]
          },
        ]
      }
      permit_regions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          region_name: string
          states: string[]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          region_name: string
          states: string[]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          region_name?: string
          states?: string[]
        }
        Relationships: []
      }
      permit_scraping_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          data_source: string
          error_message: string | null
          id: string
          new_companies_created: number | null
          permits_found: number | null
          permits_imported: number | null
          permits_matched: number | null
          search_params: Json | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          data_source: string
          error_message?: string | null
          id?: string
          new_companies_created?: number | null
          permits_found?: number | null
          permits_imported?: number | null
          permits_matched?: number | null
          search_params?: Json | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          data_source?: string
          error_message?: string | null
          id?: string
          new_companies_created?: number | null
          permits_found?: number | null
          permits_imported?: number | null
          permits_matched?: number | null
          search_params?: Json | null
          status?: string | null
        }
        Relationships: []
      }
      permit_search_schedules: {
        Row: {
          created_at: string
          created_by: string
          frequency: string
          id: string
          is_active: boolean | null
          last_run: string | null
          next_run: string | null
          schedule_name: string
          search_params: Json
          search_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          frequency: string
          id?: string
          is_active?: boolean | null
          last_run?: string | null
          next_run?: string | null
          schedule_name: string
          search_params: Json
          search_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_run?: string | null
          next_run?: string | null
          schedule_name?: string
          search_params?: Json
          search_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      perspective_usage_analytics: {
        Row: {
          created_at: string | null
          id: string
          page_name: string
          perspective_type: string
          record_count: number | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          page_name: string
          perspective_type: string
          record_count?: number | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          page_name?: string
          perspective_type?: string
          record_count?: number | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pii_inventory: {
        Row: {
          can_be_deleted: boolean
          can_be_exported: boolean
          column_name: string
          created_at: string
          data_type: string
          encryption_method: string | null
          id: string
          is_encrypted: boolean
          legal_basis: string | null
          pii_category: string
          purpose: string | null
          retention_period_days: number | null
          table_name: string
          updated_at: string
        }
        Insert: {
          can_be_deleted?: boolean
          can_be_exported?: boolean
          column_name: string
          created_at?: string
          data_type: string
          encryption_method?: string | null
          id?: string
          is_encrypted?: boolean
          legal_basis?: string | null
          pii_category: string
          purpose?: string | null
          retention_period_days?: number | null
          table_name: string
          updated_at?: string
        }
        Update: {
          can_be_deleted?: boolean
          can_be_exported?: boolean
          column_name?: string
          created_at?: string
          data_type?: string
          encryption_method?: string | null
          id?: string
          is_encrypted?: boolean
          legal_basis?: string | null
          pii_category?: string
          purpose?: string | null
          retention_period_days?: number | null
          table_name?: string
          updated_at?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "pilot_programs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_programs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_financial_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      presentation_access_logs: {
        Row: {
          accessed_at: string | null
          duration_seconds: number | null
          id: string
          ip_address: string | null
          presentation_id: string | null
          user_agent: string | null
        }
        Insert: {
          accessed_at?: string | null
          duration_seconds?: number | null
          id?: string
          ip_address?: string | null
          presentation_id?: string | null
          user_agent?: string | null
        }
        Update: {
          accessed_at?: string | null
          duration_seconds?: number | null
          id?: string
          ip_address?: string | null
          presentation_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presentation_access_logs_presentation_id_fkey"
            columns: ["presentation_id"]
            isOneToOne: false
            referencedRelation: "presentations"
            referencedColumns: ["id"]
          },
        ]
      }
      presentation_token_attempts: {
        Row: {
          attempted_at: string | null
          id: string
          ip_address: unknown
          success: boolean | null
          token_attempted: string
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string | null
          id?: string
          ip_address: unknown
          success?: boolean | null
          token_attempted: string
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string | null
          id?: string
          ip_address?: unknown
          success?: boolean | null
          token_attempted?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      presentations: {
        Row: {
          ai_conversation: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          slides: Json
          title: string
          token: string
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          ai_conversation?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          slides?: Json
          title: string
          token?: string
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_conversation?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          slides?: Json
          title?: string
          token?: string
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presentations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          first_name: string | null
          id: string
          invitation_email_delivered_at: string | null
          invitation_email_opened_at: string | null
          invitation_email_sent_at: string | null
          invitation_email_status: string | null
          last_name: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          status_change_reason: string | null
          status_changed_at: string | null
          status_changed_by: string | null
          temp_password: string | null
          updated_at: string | null
        }
        Insert: {
          account_status?: string
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          first_name?: string | null
          id: string
          invitation_email_delivered_at?: string | null
          invitation_email_opened_at?: string | null
          invitation_email_sent_at?: string | null
          invitation_email_status?: string | null
          last_name?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          status_change_reason?: string | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          temp_password?: string | null
          updated_at?: string | null
        }
        Update: {
          account_status?: string
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          invitation_email_delivered_at?: string | null
          invitation_email_opened_at?: string | null
          invitation_email_sent_at?: string | null
          invitation_email_status?: string | null
          last_name?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          status_change_reason?: string | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          temp_password?: string | null
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
      record_access_approvals: {
        Row: {
          access_level: string
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          record_id: string
          table_name: string
          user_id: string
        }
        Insert: {
          access_level?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          record_id: string
          table_name: string
          user_id: string
        }
        Update: {
          access_level?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          record_id?: string
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      record_access_requests: {
        Row: {
          created_at: string | null
          id: string
          justification: string | null
          record_id: string
          requested_at: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          table_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          justification?: string | null
          record_id: string
          requested_at?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          table_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          justification?: string | null
          record_id?: string
          requested_at?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          table_name?: string
          updated_at?: string | null
          user_id?: string
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
      security_alert_acknowledgments: {
        Row: {
          acknowledged_at: string
          acknowledged_by: string | null
          alert_id: string
          id: string
          notes: string | null
        }
        Insert: {
          acknowledged_at?: string
          acknowledged_by?: string | null
          alert_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          acknowledged_at?: string
          acknowledged_by?: string | null
          alert_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_alert_acknowledgments_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "bulk_access_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      security_incidents: {
        Row: {
          affected_systems: string[] | null
          affected_users_count: number | null
          assigned_to: string | null
          contained_at: string | null
          created_at: string | null
          detected_at: string | null
          follow_up_actions: string | null
          id: string
          impact_description: string | null
          incident_summary: string
          incident_type: string
          lessons_learned: string | null
          remediation_steps: string | null
          reported_at: string | null
          reported_by: string | null
          resolved_at: string | null
          root_cause: string | null
          severity: string
          status: string
          updated_at: string | null
        }
        Insert: {
          affected_systems?: string[] | null
          affected_users_count?: number | null
          assigned_to?: string | null
          contained_at?: string | null
          created_at?: string | null
          detected_at?: string | null
          follow_up_actions?: string | null
          id?: string
          impact_description?: string | null
          incident_summary: string
          incident_type: string
          lessons_learned?: string | null
          remediation_steps?: string | null
          reported_at?: string | null
          reported_by?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          severity: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          affected_systems?: string[] | null
          affected_users_count?: number | null
          assigned_to?: string | null
          contained_at?: string | null
          created_at?: string | null
          detected_at?: string | null
          follow_up_actions?: string | null
          id?: string
          impact_description?: string | null
          incident_summary?: string
          incident_type?: string
          lessons_learned?: string | null
          remediation_steps?: string | null
          reported_at?: string | null
          reported_by?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          severity?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      security_patches: {
        Row: {
          affected_components: string[] | null
          applied_at: string | null
          applied_by: string | null
          created_at: string | null
          description: string | null
          id: string
          notes: string | null
          patch_name: string
          patch_type: string
          patch_version: string | null
          severity: string
          status: string
          updated_at: string | null
        }
        Insert: {
          affected_components?: string[] | null
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          patch_name: string
          patch_type: string
          patch_version?: string | null
          severity: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          affected_components?: string[] | null
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          patch_name?: string
          patch_type?: string
          patch_version?: string | null
          severity?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      security_tests: {
        Row: {
          created_at: string | null
          description: string | null
          findings: string | null
          id: string
          remediation: string | null
          result: string
          test_date: string | null
          test_name: string
          test_type: string
          tested_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          findings?: string | null
          id?: string
          remediation?: string | null
          result: string
          test_date?: string | null
          test_name: string
          test_type: string
          tested_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          findings?: string | null
          id?: string
          remediation?: string | null
          result?: string
          test_date?: string | null
          test_name?: string
          test_type?: string
          tested_by?: string | null
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
          {
            foreignKeyName: "segmentation_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segmentation_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_financial_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      session_config: {
        Row: {
          absolute_timeout_hours: number
          created_at: string | null
          id: string
          idle_timeout_minutes: number
          max_concurrent_sessions: number
          updated_at: string | null
        }
        Insert: {
          absolute_timeout_hours?: number
          created_at?: string | null
          id?: string
          idle_timeout_minutes?: number
          max_concurrent_sessions?: number
          updated_at?: string | null
        }
        Update: {
          absolute_timeout_hours?: number
          created_at?: string | null
          id?: string
          idle_timeout_minutes?: number
          max_concurrent_sessions?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      signup_rate_limit: {
        Row: {
          attempt_count: number | null
          blocked: boolean | null
          created_at: string | null
          email: string
          id: string
          ip_address: unknown
          window_end: string
          window_start: string
        }
        Insert: {
          attempt_count?: number | null
          blocked?: boolean | null
          created_at?: string | null
          email: string
          id?: string
          ip_address?: unknown
          window_end?: string
          window_start?: string
        }
        Update: {
          attempt_count?: number | null
          blocked?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          ip_address?: unknown
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      sync_configurations: {
        Row: {
          configuration: Json | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          last_sync_at: string | null
          last_sync_status: string | null
          schedule_cron: string
          sync_name: string
          sync_type: string
          updated_at: string | null
        }
        Insert: {
          configuration?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          schedule_cron?: string
          sync_name: string
          sync_type: string
          updated_at?: string | null
        }
        Update: {
          configuration?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          schedule_cron?: string
          sync_name?: string
          sync_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_details: Json | null
          error_message: string | null
          id: string
          records_synced: number | null
          started_at: string | null
          status: string
          sync_config_id: string | null
          sync_duration_ms: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          records_synced?: number | null
          started_at?: string | null
          status: string
          sync_config_id?: string | null
          sync_duration_ms?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          records_synced?: number | null
          started_at?: string | null
          status?: string
          sync_config_id?: string | null
          sync_duration_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_sync_config_id_fkey"
            columns: ["sync_config_id"]
            isOneToOne: false
            referencedRelation: "sync_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_availability_log: {
        Row: {
          check_type: string
          checked_at: string | null
          created_at: string | null
          details: Json | null
          error_count: number | null
          id: string
          response_time_ms: number | null
          status: string
          system_name: string
          uptime_percentage: number | null
        }
        Insert: {
          check_type: string
          checked_at?: string | null
          created_at?: string | null
          details?: Json | null
          error_count?: number | null
          id?: string
          response_time_ms?: number | null
          status: string
          system_name: string
          uptime_percentage?: number | null
        }
        Update: {
          check_type?: string
          checked_at?: string | null
          created_at?: string | null
          details?: Json | null
          error_count?: number | null
          id?: string
          response_time_ms?: number | null
          status?: string
          system_name?: string
          uptime_percentage?: number | null
        }
        Relationships: []
      }
      team_memberships: {
        Row: {
          added_at: string | null
          added_by: string | null
          id: string
          is_active: boolean | null
          manager_id: string
          notes: string | null
          team_member_id: string
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          id?: string
          is_active?: boolean | null
          manager_id: string
          notes?: string | null
          team_member_id: string
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string
          notes?: string | null
          team_member_id?: string
        }
        Relationships: []
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
            foreignKeyName: "training_certifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_certifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_financial_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_certifications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_certifications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_certifications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_decrypted_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_certifications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          consent_type: string
          created_at: string
          granted: boolean
          granted_at: string | null
          id: string
          ip_address: unknown
          revoked_at: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          consent_type: string
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: unknown
          revoked_at?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
          version?: string
        }
        Update: {
          consent_type?: string
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: unknown
          revoked_at?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      user_mfa_status: {
        Row: {
          created_at: string
          enrolled_at: string | null
          grace_period_expires_at: string | null
          id: string
          last_prompted_at: string | null
          mfa_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enrolled_at?: string | null
          grace_period_expires_at?: string | null
          id?: string
          last_prompted_at?: string | null
          mfa_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enrolled_at?: string | null
          grace_period_expires_at?: string | null
          id?: string
          last_prompted_at?: string | null
          mfa_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          access_expires_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          last_access_at: string | null
          last_activity_at: string | null
          last_reviewed_at: string | null
          last_reviewed_by: string | null
          review_required_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          access_expires_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_access_at?: string | null
          last_activity_at?: string | null
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          review_required_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          access_expires_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_access_at?: string | null
          last_activity_at?: string | null
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          review_required_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown
          last_activity_at: string
          session_token_hash: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: unknown
          last_activity_at?: string
          session_token_hash: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          last_activity_at?: string
          session_token_hash?: string
          user_agent?: string | null
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
      vendor_risk_assessments: {
        Row: {
          assessed_by: string | null
          assessment_date: string | null
          compliance_issues: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string | null
          data_access_level: string | null
          has_gdpr_compliance: boolean | null
          has_iso27001_certification: boolean | null
          has_soc2_certification: boolean | null
          id: string
          next_review_date: string | null
          risk_level: string
          risk_mitigation_measures: string | null
          security_assessment_score: number | null
          services_provided: string
          status: string
          updated_at: string | null
          vendor_category: string
          vendor_name: string
        }
        Insert: {
          assessed_by?: string | null
          assessment_date?: string | null
          compliance_issues?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string | null
          data_access_level?: string | null
          has_gdpr_compliance?: boolean | null
          has_iso27001_certification?: boolean | null
          has_soc2_certification?: boolean | null
          id?: string
          next_review_date?: string | null
          risk_level: string
          risk_mitigation_measures?: string | null
          security_assessment_score?: number | null
          services_provided: string
          status?: string
          updated_at?: string | null
          vendor_category: string
          vendor_name: string
        }
        Update: {
          assessed_by?: string | null
          assessment_date?: string | null
          compliance_issues?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string | null
          data_access_level?: string | null
          has_gdpr_compliance?: boolean | null
          has_iso27001_certification?: boolean | null
          has_soc2_certification?: boolean | null
          id?: string
          next_review_date?: string | null
          risk_level?: string
          risk_mitigation_measures?: string | null
          security_assessment_score?: number | null
          services_provided?: string
          status?: string
          updated_at?: string | null
          vendor_category?: string
          vendor_name?: string
        }
        Relationships: []
      }
      vulnerability_scans: {
        Row: {
          created_at: string | null
          critical_count: number | null
          findings_count: number | null
          high_count: number | null
          id: string
          low_count: number | null
          medium_count: number | null
          notes: string | null
          report_url: string | null
          scan_date: string | null
          scan_type: string
          scanned_by: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          critical_count?: number | null
          findings_count?: number | null
          high_count?: number | null
          id?: string
          low_count?: number | null
          medium_count?: number | null
          notes?: string | null
          report_url?: string | null
          scan_date?: string | null
          scan_type: string
          scanned_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          critical_count?: number | null
          findings_count?: number | null
          high_count?: number | null
          id?: string
          low_count?: number | null
          medium_count?: number | null
          notes?: string | null
          report_url?: string | null
          scan_date?: string | null
          scan_type?: string
          scanned_by?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      companies_decrypted: {
        Row: {
          address_line1: string | null
          annual_revenue_range: string | null
          assigned_to: string | null
          assigned_to_sales_rep_id: string | null
          city: string | null
          company_name: string | null
          created_at: string | null
          created_by: string | null
          encryption_version: number | null
          id: string | null
          industry_type: string | null
          lead_score: number | null
          linkedin_company_url: string | null
          primary_email: string | null
          primary_phone: string | null
          priority_tier: string | null
          segment: string | null
          state: string | null
          status: string | null
          total_employees: number | null
          updated_at: string | null
          website_url: string | null
          years_in_business: number | null
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          annual_revenue_range?: string | null
          assigned_to?: string | null
          assigned_to_sales_rep_id?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          encryption_version?: number | null
          id?: string | null
          industry_type?: string | null
          lead_score?: number | null
          linkedin_company_url?: string | null
          primary_email?: never
          primary_phone?: never
          priority_tier?: string | null
          segment?: string | null
          state?: string | null
          status?: string | null
          total_employees?: number | null
          updated_at?: string | null
          website_url?: string | null
          years_in_business?: number | null
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          annual_revenue_range?: string | null
          assigned_to?: string | null
          assigned_to_sales_rep_id?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          encryption_version?: number | null
          id?: string | null
          industry_type?: string | null
          lead_score?: number | null
          linkedin_company_url?: string | null
          primary_email?: never
          primary_phone?: never
          priority_tier?: string | null
          segment?: string | null
          state?: string | null
          status?: string | null
          total_employees?: number | null
          updated_at?: string | null
          website_url?: string | null
          years_in_business?: number | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_assigned_to_sales_rep_id_fkey"
            columns: ["assigned_to_sales_rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies_financial_masked: {
        Row: {
          annual_revenue_range: string | null
          company_name: string | null
          created_at: string | null
          financial_health_rating: string | null
          id: string | null
          industry_type: string | null
          profitability_level: string | null
          updated_at: string | null
        }
        Insert: {
          annual_revenue_range?: string | null
          company_name?: string | null
          created_at?: string | null
          financial_health_rating?: string | null
          id?: string | null
          industry_type?: string | null
          profitability_level?: string | null
          updated_at?: string | null
        }
        Update: {
          annual_revenue_range?: string | null
          company_name?: string | null
          created_at?: string | null
          financial_health_rating?: string | null
          id?: string | null
          industry_type?: string | null
          profitability_level?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
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
      contacts_decrypted: {
        Row: {
          branch_id: string | null
          company_id: string | null
          created_at: string | null
          decision_tier: Database["public"]["Enums"]["decision_tier"] | null
          email: string | null
          encryption_version: number | null
          first_name: string | null
          id: string | null
          last_name: string | null
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
          company_id?: string | null
          created_at?: string | null
          decision_tier?: Database["public"]["Enums"]["decision_tier"] | null
          email?: never
          encryption_version?: number | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          linkedin_activity_score?: number | null
          linkedin_connections?: number | null
          linkedin_url?: string | null
          mobile?: never
          notes?: string | null
          phone?: never
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string | null
          created_at?: string | null
          decision_tier?: Database["public"]["Enums"]["decision_tier"] | null
          email?: never
          encryption_version?: number | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          linkedin_activity_score?: number | null
          linkedin_connections?: number | null
          linkedin_url?: string | null
          mobile?: never
          notes?: string | null
          phone?: never
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
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_financial_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts_decrypted_secure: {
        Row: {
          branch_id: string | null
          company_id: string | null
          created_at: string | null
          decision_tier: Database["public"]["Enums"]["decision_tier"] | null
          email: string | null
          encryption_version: number | null
          first_name: string | null
          id: string | null
          last_name: string | null
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
          company_id?: string | null
          created_at?: string | null
          decision_tier?: Database["public"]["Enums"]["decision_tier"] | null
          email?: never
          encryption_version?: number | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          linkedin_activity_score?: number | null
          linkedin_connections?: number | null
          linkedin_url?: string | null
          mobile?: never
          notes?: string | null
          phone?: never
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string | null
          created_at?: string | null
          decision_tier?: Database["public"]["Enums"]["decision_tier"] | null
          email?: never
          encryption_version?: number | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          linkedin_activity_score?: number | null
          linkedin_connections?: number | null
          linkedin_url?: string | null
          mobile?: never
          notes?: string | null
          phone?: never
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
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_financial_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts_masked: {
        Row: {
          branch_id: string | null
          company_id: string | null
          created_at: string | null
          decision_tier: Database["public"]["Enums"]["decision_tier"] | null
          email: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
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
          company_id?: string | null
          created_at?: string | null
          decision_tier?: Database["public"]["Enums"]["decision_tier"] | null
          email?: never
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          linkedin_activity_score?: number | null
          linkedin_connections?: number | null
          linkedin_url?: string | null
          mobile?: never
          notes?: string | null
          phone?: never
          preferred_contact_method?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string | null
          created_at?: string | null
          decision_tier?: Database["public"]["Enums"]["decision_tier"] | null
          email?: never
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          linkedin_activity_score?: number | null
          linkedin_connections?: number | null
          linkedin_url?: string | null
          mobile?: never
          notes?: string | null
          phone?: never
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
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_financial_masked"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_get_all_profiles: {
        Args: never
        Returns: {
          approval_status: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
        }[]
      }
      admin_get_profile: {
        Args: { _user_id: string }
        Returns: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_at: string
          created_at: string
          first_name: string
          id: string
          last_name: string
          role_frozen: boolean
          role_frozen_at: string
          role_frozen_reason: string
          user_email: string
          user_role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      anonymize_ipv4: { Args: { ip_addr: unknown }; Returns: unknown }
      anonymize_old_ip_addresses: {
        Args: { _days_old?: number }
        Returns: {
          records_anonymized: number
          table_name: string
        }[]
      }
      approve_access_request: {
        Args: { _access_level?: string; _request_id: string }
        Returns: boolean
      }
      auto_revoke_expired_access: { Args: never; Returns: number }
      batch_migrate_companies_encryption: {
        Args: { _batch_size?: number }
        Returns: {
          completion_percentage: number
          total_companies: number
          total_migrated: number
        }[]
      }
      batch_migrate_contacts_encryption: {
        Args: { batch_size?: number }
        Returns: {
          completion_percentage: number
          total_contacts: number
          total_migrated: number
        }[]
      }
      can_access_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_company_decrypted: {
        Args: { _company_id: string }
        Returns: boolean
      }
      can_access_contact_decrypted: {
        Args: { _contact_id: string }
        Returns: boolean
      }
      can_access_field: {
        Args: { _field_name: string; _table_name: string; _user_id: string }
        Returns: boolean
      }
      can_view_basic_info: {
        Args: { _record_id: string; _table_name: string; _user_id: string }
        Returns: boolean
      }
      check_and_alert_brute_force: {
        Args: { _ip_address: unknown }
        Returns: undefined
      }
      check_api_key_rate_limit: {
        Args: { _api_key_id: string; _endpoint: string }
        Returns: Json
      }
      check_email_domain_allowed: {
        Args: { email_address: string }
        Returns: boolean
      }
      check_export_quota: {
        Args: { _record_count: number; _table_name: string; _user_id: string }
        Returns: Json
      }
      check_key_rotation_due: {
        Args: never
        Returns: {
          current_key_version: number
          days_until_rotation: number
          is_due: boolean
          next_rotation_date: string
        }[]
      }
      check_past_due_meetings: { Args: never; Returns: undefined }
      check_presentation_token_rate_limit: {
        Args: {
          _ip_address: unknown
          _max_attempts?: number
          _window_minutes?: number
        }
        Returns: Json
      }
      check_rate_limit: {
        Args: { _endpoint: string; _user_id: string; _window_minutes?: number }
        Returns: Json
      }
      check_signup_rate_limit: {
        Args: { _email: string; _ip_address?: unknown }
        Returns: Json
      }
      cleanup_expired_approvals: { Args: never; Returns: number }
      cleanup_expired_reset_codes: { Args: never; Returns: number }
      cleanup_old_api_logs: {
        Args: { _retention_days?: number }
        Returns: number
      }
      cleanup_old_records: {
        Args: never
        Returns: {
          rows_deleted: number
          table_cleaned: string
        }[]
      }
      cleanup_old_sync_logs: {
        Args: { retention_days?: number }
        Returns: number
      }
      cleanup_rate_limit_tracking: { Args: never; Returns: number }
      create_notification: {
        Args: {
          p_action_required?: boolean
          p_link_url?: string
          p_message: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      decrypt_text: { Args: { encrypted_text: string }; Returns: string }
      deny_access_request: {
        Args: { _request_id: string; _review_notes?: string }
        Returns: boolean
      }
      detect_bulk_export: {
        Args: { _current_export_count: number; _user_id: string }
        Returns: undefined
      }
      detect_inactive_users: {
        Args: { _days_inactive?: number }
        Returns: {
          days_inactive: number
          email: string
          last_activity: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      detect_repeated_access_denials: {
        Args: { _field_name: string; _table_name: string; _user_id: string }
        Returns: undefined
      }
      encrypt_text: { Args: { plain_text: string }; Returns: string }
      execute_admin_sql: { Args: { sql_query: string }; Returns: string }
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
        Args: never
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
      get_encryption_key: { Args: never; Returns: string }
      get_encryption_stats: {
        Args: never
        Returns: {
          encrypted_records: number
          encryption_percentage: number
          pending_records: number
          table_name: string
          total_records: number
        }[]
      }
      get_table_columns: {
        Args: { table_name_param: string }
        Returns: {
          column_default: string
          column_name: string
          data_type: string
          is_nullable: string
        }[]
      }
      get_table_list: {
        Args: never
        Returns: {
          table_name: string
        }[]
      }
      get_team_member_ids: { Args: { _manager_id: string }; Returns: string[] }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_elevated_access: { Args: { _user_id: string }; Returns: boolean }
      has_record_access: {
        Args: { _record_id: string; _table_name: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_account_active: { Args: { _user_id: string }; Returns: boolean }
      is_approved_with_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_mfa_required: { Args: { _user_id: string }; Returns: boolean }
      is_role_active: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team_member: {
        Args: { _manager_id: string; _user_id: string }
        Returns: boolean
      }
      is_user_approved: { Args: { _user_id: string }; Returns: boolean }
      log_api_call: {
        Args: {
          _api_key_id: string
          _endpoint: string
          _error_message?: string
          _ip_address?: unknown
          _method: string
          _query_parameters?: Json
          _request_body?: Json
          _request_headers?: Json
          _response_time_ms?: number
          _status_code: number
          _user_agent?: string
          _user_id: string
        }
        Returns: string
      }
      log_auth_event: {
        Args: {
          _email_attempted?: string
          _event_type: string
          _failure_reason?: string
          _ip_address?: unknown
          _metadata?: Json
          _user_agent?: string
          _user_id: string
        }
        Returns: string
      }
      log_blocked_signup: {
        Args: {
          _details?: Json
          _email: string
          _ip_address?: unknown
          _is_disposable?: boolean
          _reason: string
        }
        Returns: string
      }
      log_email: {
        Args: {
          p_email_type: string
          p_error_message?: string
          p_metadata?: Json
          p_recipient_email: string
          p_recipient_user_id: string
          p_resend_email_id?: string
          p_status?: string
          p_subject: string
        }
        Returns: string
      }
      log_export_activity: {
        Args: {
          _export_type: string
          _filter_criteria?: Json
          _ip_address?: unknown
          _record_count: number
          _table_name: string
          _user_agent?: string
          _user_id: string
        }
        Returns: string
      }
      log_field_access: {
        Args: {
          _access_granted: boolean
          _field_name: string
          _record_id: string
          _table_name: string
        }
        Returns: undefined
      }
      log_presentation_access: {
        Args: {
          _duration_seconds?: number
          _ip_address: string
          _presentation_id: string
          _user_agent: string
        }
        Returns: string
      }
      log_security_event: {
        Args: { _event_details?: Json; _event_type: string }
        Returns: undefined
      }
      log_sensitive_field_access: {
        Args: {
          _access_granted: boolean
          _field_name: string
          _record_id: string
          _table_name: string
          _user_id: string
        }
        Returns: undefined
      }
      log_token_validation_attempt: {
        Args: {
          _ip_address: unknown
          _success: boolean
          _token_attempted: string
          _user_agent?: string
        }
        Returns: undefined
      }
      mask_pii_field: {
        Args: { _field_name: string; _field_value: string; _table_name: string }
        Returns: string
      }
      migrate_company_encryption: {
        Args: { _company_id: string }
        Returns: boolean
      }
      migrate_contact_encryption: {
        Args: { contact_id: string }
        Returns: boolean
      }
      notify_expiring_access: {
        Args: { _days_before: number }
        Returns: {
          days_remaining: number
          expires_at: string
          record_id: string
          table_name: string
          user_id: string
        }[]
      }
      reverify_all_active_domains: { Args: never; Returns: Json }
      revoke_api_key: {
        Args: { _key_id: string; _reason?: string }
        Returns: boolean
      }
      revoke_expired_access: {
        Args: never
        Returns: {
          expired_at: string
          revoked_role: Database["public"]["Enums"]["app_role"]
          revoked_user_id: string
        }[]
      }
      rotate_encryption_key: {
        Args: { _batch_size?: number; _new_key: string; _new_version: number }
        Returns: {
          companies_migrated: number
          contacts_migrated: number
          status: string
        }[]
      }
      schedule_key_rotation: {
        Args: { _days_until_rotation?: number }
        Returns: Json
      }
      terminate_expired_sessions: { Args: never; Returns: number }
      track_user_session: {
        Args: {
          _ip_address?: unknown
          _session_token_hash: string
          _user_agent?: string
          _user_id: string
        }
        Returns: string
      }
      user_approved_with_grace_period: {
        Args: { _hours?: number; _user_id: string }
        Returns: boolean
      }
      validate_api_key: {
        Args: { _endpoint: string; _ip_address?: unknown; _key_hash: string }
        Returns: {
          error_reason: string
          is_valid: boolean
          key_id: string
          permission_level: Database["public"]["Enums"]["api_permission"]
          user_id: string
        }[]
      }
      validate_presentation_token: {
        Args: { token_text: string }
        Returns: Json
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
        | "Scheduled"
        | "Cancelled"
      activity_type:
        | "Email"
        | "Phone"
        | "LinkedIn Connection"
        | "LinkedIn Message"
        | "Meeting"
        | "Demo"
        | "Training"
      api_key_status: "active" | "revoked" | "expired"
      api_permission: "read_only" | "read_write" | "admin"
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
        "Scheduled",
        "Cancelled",
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
      api_key_status: ["active", "revoked", "expired"],
      api_permission: ["read_only", "read_write", "admin"],
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

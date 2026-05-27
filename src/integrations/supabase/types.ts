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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          assigned_to: string | null
          company_id: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          handoff_from: string | null
          handoff_to: string | null
          id: string
          opportunity_id: string | null
          outcome: Database["public"]["Enums"]["activity_outcome"]
          scheduled_at: string | null
          subject: string | null
          type: Database["public"]["Enums"]["activity_type"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          handoff_from?: string | null
          handoff_to?: string | null
          id?: string
          opportunity_id?: string | null
          outcome?: Database["public"]["Enums"]["activity_outcome"]
          scheduled_at?: string | null
          subject?: string | null
          type: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          handoff_from?: string | null
          handoff_to?: string | null
          id?: string
          opportunity_id?: string | null
          outcome?: Database["public"]["Enums"]["activity_outcome"]
          scheduled_at?: string | null
          subject?: string | null
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["approval_status"]
          target_id: string | null
          target_table: string | null
          type: Database["public"]["Enums"]["approval_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          target_id?: string | null
          target_table?: string | null
          type: Database["public"]["Enums"]["approval_type"]
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          target_id?: string | null
          target_table?: string | null
          type?: Database["public"]["Enums"]["approval_type"]
        }
        Relationships: []
      }
      auth_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      building_permits: {
        Row: {
          address: string | null
          city: string | null
          company_id: string | null
          contractor_name: string | null
          created_at: string
          expiration_date: string | null
          id: string
          issue_date: string | null
          jurisdiction: string | null
          lat: number | null
          lng: number | null
          owner_name: string | null
          permit_number: string
          project_type: string | null
          project_value: number | null
          region: Database["public"]["Enums"]["region"] | null
          square_footage: number | null
          state: string | null
          status: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id?: string | null
          contractor_name?: string | null
          created_at?: string
          expiration_date?: string | null
          id?: string
          issue_date?: string | null
          jurisdiction?: string | null
          lat?: number | null
          lng?: number | null
          owner_name?: string | null
          permit_number: string
          project_type?: string | null
          project_value?: number | null
          region?: Database["public"]["Enums"]["region"] | null
          square_footage?: number | null
          state?: string | null
          status?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string | null
          contractor_name?: string | null
          created_at?: string
          expiration_date?: string | null
          id?: string
          issue_date?: string | null
          jurisdiction?: string | null
          lat?: number | null
          lng?: number | null
          owner_name?: string | null
          permit_number?: string
          project_type?: string | null
          project_value?: number | null
          region?: Database["public"]["Enums"]["region"] | null
          square_footage?: number | null
          state?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_permits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          body: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          engagement_score: number | null
          id: string
          meeting_scheduled_at: string | null
          opened_at: string | null
          replied_at: string | null
          sent_at: string | null
          subject: string | null
          type: Database["public"]["Enums"]["communication_type"]
        }
        Insert: {
          body?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          engagement_score?: number | null
          id?: string
          meeting_scheduled_at?: string | null
          opened_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          subject?: string | null
          type: Database["public"]["Enums"]["communication_type"]
        }
        Update: {
          body?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          engagement_score?: number | null
          id?: string
          meeting_scheduled_at?: string | null
          opened_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          subject?: string | null
          type?: Database["public"]["Enums"]["communication_type"]
        }
        Relationships: [
          {
            foreignKeyName: "communications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          annual_volume: number | null
          assigned_to_sales_rep_id: string | null
          city: string | null
          contact_quality_score: number | null
          created_at: string
          created_by: string | null
          engagement_score: number | null
          financial_health: string | null
          firmographic_score: number | null
          id: string
          industry: Database["public"]["Enums"]["company_industry"] | null
          lead_score: number | null
          name: string
          notes: string | null
          price_point: string | null
          priority_tier: Database["public"]["Enums"]["priority_tier"] | null
          region: Database["public"]["Enums"]["region"] | null
          revenue_range: string | null
          segment: string | null
          state: string | null
          status: Database["public"]["Enums"]["company_status"]
          updated_at: string
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          annual_volume?: number | null
          assigned_to_sales_rep_id?: string | null
          city?: string | null
          contact_quality_score?: number | null
          created_at?: string
          created_by?: string | null
          engagement_score?: number | null
          financial_health?: string | null
          firmographic_score?: number | null
          id?: string
          industry?: Database["public"]["Enums"]["company_industry"] | null
          lead_score?: number | null
          name: string
          notes?: string | null
          price_point?: string | null
          priority_tier?: Database["public"]["Enums"]["priority_tier"] | null
          region?: Database["public"]["Enums"]["region"] | null
          revenue_range?: string | null
          segment?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          annual_volume?: number | null
          assigned_to_sales_rep_id?: string | null
          city?: string | null
          contact_quality_score?: number | null
          created_at?: string
          created_by?: string | null
          engagement_score?: number | null
          financial_health?: string | null
          firmographic_score?: number | null
          id?: string
          industry?: Database["public"]["Enums"]["company_industry"] | null
          lead_score?: number | null
          name?: string
          notes?: string | null
          price_point?: string | null
          priority_tier?: Database["public"]["Enums"]["priority_tier"] | null
          region?: Database["public"]["Enums"]["region"] | null
          revenue_range?: string | null
          segment?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      contact_access_log: {
        Row: {
          action: string
          contact_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          contact_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_access_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          assigned_to_sales_rep_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          decision_authority: string | null
          email: string | null
          id: string
          is_primary: boolean
          linkedin_url: string | null
          mobile: string | null
          name: string
          notes: string | null
          phone: string | null
          pii_encrypted: boolean
          title: string | null
          updated_at: string
        }
        Insert: {
          assigned_to_sales_rep_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          decision_authority?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          linkedin_url?: string | null
          mobile?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          pii_encrypted?: boolean
          title?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to_sales_rep_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          decision_authority?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          linkedin_url?: string | null
          mobile?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          pii_encrypted?: boolean
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      exports: {
        Row: {
          approved_by: string | null
          created_at: string
          id: string
          row_count: number | null
          status: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          id?: string
          row_count?: number | null
          status?: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          id?: string
          row_count?: number | null
          status?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      job_quotes: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          line_items: Json | null
          opportunity_id: string | null
          po_filename: string | null
          quote_number: string
          status: string
          title: string
          total_amount: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          line_items?: Json | null
          opportunity_id?: string | null
          po_filename?: string | null
          quote_number: string
          status?: string
          title: string
          total_amount?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          line_items?: Json | null
          opportunity_id?: string | null
          po_filename?: string | null
          quote_number?: string
          status?: string
          title?: string
          total_amount?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_quotes_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          assigned_to: string | null
          assigned_to_sales_rep_id: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          estimated_value: number | null
          expected_close_date: string | null
          id: string
          name: string
          notes: string | null
          probability: number | null
          stage: Database["public"]["Enums"]["opportunity_stage"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_sales_rep_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          name: string
          notes?: string | null
          probability?: number | null
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assigned_to_sales_rep_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          probability?: number | null
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      presentations: {
        Row: {
          content: Json | null
          created_at: string
          created_by: string | null
          id: string
          share_enabled: boolean
          share_token: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          share_enabled?: boolean
          share_token?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          share_enabled?: boolean
          share_token?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          mfa_enabled: boolean
          phone: string | null
          session_timeout_minutes: number
          title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          mfa_enabled?: boolean
          phone?: string | null
          session_timeout_minutes?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          mfa_enabled?: boolean
          phone?: string | null
          session_timeout_minutes?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_elevated_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      activity_outcome: "Scheduled" | "Completed" | "Cancelled"
      activity_type: "Call" | "Email" | "Meeting" | "Demo" | "Follow-up"
      app_role: "admin" | "sales_manager" | "sales_rep" | "read_only"
      approval_status: "pending" | "approved" | "rejected"
      approval_type: "user_signup" | "deletion" | "export"
      communication_type: "Email" | "Call"
      company_industry:
        | "Builder"
        | "Contractor"
        | "Energy Implementer"
        | "Engineer/Architect"
        | "Partner/Other"
      company_status: "Lead" | "Active" | "Inactive"
      opportunity_stage:
        | "Open"
        | "Proposal"
        | "Committed"
        | "Purchased"
        | "Declined"
      priority_tier: "P1" | "P2" | "P3" | "P4"
      region: "East" | "West"
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
      activity_outcome: ["Scheduled", "Completed", "Cancelled"],
      activity_type: ["Call", "Email", "Meeting", "Demo", "Follow-up"],
      app_role: ["admin", "sales_manager", "sales_rep", "read_only"],
      approval_status: ["pending", "approved", "rejected"],
      approval_type: ["user_signup", "deletion", "export"],
      communication_type: ["Email", "Call"],
      company_industry: [
        "Builder",
        "Contractor",
        "Energy Implementer",
        "Engineer/Architect",
        "Partner/Other",
      ],
      company_status: ["Lead", "Active", "Inactive"],
      opportunity_stage: [
        "Open",
        "Proposal",
        "Committed",
        "Purchased",
        "Declined",
      ],
      priority_tier: ["P1", "P2", "P3", "P4"],
      region: ["East", "West"],
    },
  },
} as const

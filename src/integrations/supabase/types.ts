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
      companies: {
        Row: {
          annual_revenue_range:
            | Database["public"]["Enums"]["revenue_range"]
            | null
          builder_segment: Database["public"]["Enums"]["builder_segment"] | null
          company_name: string
          contractor_segment:
            | Database["public"]["Enums"]["contractor_segment"]
            | null
          created_at: string | null
          created_by: string | null
          id: string
          industry_type: Database["public"]["Enums"]["industry_type"]
          is_franchise: boolean | null
          lead_score: number | null
          linkedin_company_url: string | null
          nest_pro_partner_id: string | null
          parent_company_id: string | null
          primary_phone: string | null
          priority_tier: Database["public"]["Enums"]["priority_tier"] | null
          segment_confidence:
            | Database["public"]["Enums"]["segment_confidence"]
            | null
          status: Database["public"]["Enums"]["company_status"] | null
          total_employees: number | null
          updated_at: string | null
          website_url: string | null
          years_in_business: number | null
        }
        Insert: {
          annual_revenue_range?:
            | Database["public"]["Enums"]["revenue_range"]
            | null
          builder_segment?:
            | Database["public"]["Enums"]["builder_segment"]
            | null
          company_name: string
          contractor_segment?:
            | Database["public"]["Enums"]["contractor_segment"]
            | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          industry_type: Database["public"]["Enums"]["industry_type"]
          is_franchise?: boolean | null
          lead_score?: number | null
          linkedin_company_url?: string | null
          nest_pro_partner_id?: string | null
          parent_company_id?: string | null
          primary_phone?: string | null
          priority_tier?: Database["public"]["Enums"]["priority_tier"] | null
          segment_confidence?:
            | Database["public"]["Enums"]["segment_confidence"]
            | null
          status?: Database["public"]["Enums"]["company_status"] | null
          total_employees?: number | null
          updated_at?: string | null
          website_url?: string | null
          years_in_business?: number | null
        }
        Update: {
          annual_revenue_range?:
            | Database["public"]["Enums"]["revenue_range"]
            | null
          builder_segment?:
            | Database["public"]["Enums"]["builder_segment"]
            | null
          company_name?: string
          contractor_segment?:
            | Database["public"]["Enums"]["contractor_segment"]
            | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          industry_type?: Database["public"]["Enums"]["industry_type"]
          is_franchise?: boolean | null
          lead_score?: number | null
          linkedin_company_url?: string | null
          nest_pro_partner_id?: string | null
          parent_company_id?: string | null
          primary_phone?: string | null
          priority_tier?: Database["public"]["Enums"]["priority_tier"] | null
          segment_confidence?:
            | Database["public"]["Enums"]["segment_confidence"]
            | null
          status?: Database["public"]["Enums"]["company_status"] | null
          total_employees?: number | null
          updated_at?: string | null
          website_url?: string | null
          years_in_business?: number | null
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
      outreach_activities: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          branch_id: string | null
          company_id: string
          completed_date: string | null
          contact_id: string | null
          created_at: string | null
          created_by: string
          id: string
          message_content: string | null
          notes: string | null
          outcome: Database["public"]["Enums"]["activity_outcome"] | null
          scheduled_date: string | null
          sequence_day: number | null
          sequence_name: string | null
          sequence_phase: string | null
          subject_line: string | null
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          branch_id?: string | null
          company_id: string
          completed_date?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          message_content?: string | null
          notes?: string | null
          outcome?: Database["public"]["Enums"]["activity_outcome"] | null
          scheduled_date?: string | null
          sequence_day?: number | null
          sequence_name?: string | null
          sequence_phase?: string | null
          subject_line?: string | null
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          branch_id?: string | null
          company_id?: string
          completed_date?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          message_content?: string | null
          notes?: string | null
          outcome?: Database["public"]["Enums"]["activity_outcome"] | null
          scheduled_date?: string | null
          sequence_day?: number | null
          sequence_name?: string | null
          sequence_phase?: string | null
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
      profiles: {
        Row: {
          created_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
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
      builder_segment:
        | "Production/Tract Builders"
        | "Regional Mid-Volume Builders"
        | "Spec Home Builders"
        | "Luxury Custom Builders"
        | "Multi-Family Developers"
        | "Affordable Housing Builders"
        | "Active Adult/55+ Specialists"
      company_status:
        | "Lead"
        | "Contacted"
        | "Engaged"
        | "Pilot"
        | "Active"
        | "Inactive"
        | "Lost"
      contact_method: "Email" | "Phone" | "LinkedIn" | "Text"
      contractor_segment:
        | "Smart Home Champions"
        | "Customer Experience Innovators"
        | "High-Volume Installers"
        | "Premium Service Specialists"
        | "Regional Growth Contractors"
        | "Specialty HVAC Integrators"
        | "Service-First Traditionalists"
        | "Emergency/Repair Specialists"
      decision_tier: "Primary" | "Secondary" | "Influencer"
      industry_type: "Builder" | "Contractor"
      priority_tier: "P1: 80-100" | "P2: 60-79" | "P3: 40-59"
      revenue_range:
        | "<$500K"
        | "$500K-$999K"
        | "$1M-$2.9M"
        | "$3M-$5.9M"
        | "$6M-$10M"
        | "$10M+"
      segment_confidence: "High 90%+" | "Medium 70-89%" | "Low <70%"
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
      builder_segment: [
        "Production/Tract Builders",
        "Regional Mid-Volume Builders",
        "Spec Home Builders",
        "Luxury Custom Builders",
        "Multi-Family Developers",
        "Affordable Housing Builders",
        "Active Adult/55+ Specialists",
      ],
      company_status: [
        "Lead",
        "Contacted",
        "Engaged",
        "Pilot",
        "Active",
        "Inactive",
        "Lost",
      ],
      contact_method: ["Email", "Phone", "LinkedIn", "Text"],
      contractor_segment: [
        "Smart Home Champions",
        "Customer Experience Innovators",
        "High-Volume Installers",
        "Premium Service Specialists",
        "Regional Growth Contractors",
        "Specialty HVAC Integrators",
        "Service-First Traditionalists",
        "Emergency/Repair Specialists",
      ],
      decision_tier: ["Primary", "Secondary", "Influencer"],
      industry_type: ["Builder", "Contractor"],
      priority_tier: ["P1: 80-100", "P2: 60-79", "P3: 40-59"],
      revenue_range: [
        "<$500K",
        "$500K-$999K",
        "$1M-$2.9M",
        "$3M-$5.9M",
        "$6M-$10M",
        "$10M+",
      ],
      segment_confidence: ["High 90%+", "Medium 70-89%", "Low <70%"],
    },
  },
} as const

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          organization_id: string
          name: string
          document_number: string | null
          phone: string | null
          email: string | null
          street: string | null
          number: string | null
          complement: string | null
          neighborhood: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          current_project_stage_id: string | null
          system_type: string | null
          estimated_kwp: number | null
          contract_signed_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          document_number?: string | null
          phone?: string | null
          email?: string | null
          street?: string | null
          number?: string | null
          complement?: string | null
          neighborhood?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          current_project_stage_id?: string | null
          system_type?: string | null
          estimated_kwp?: number | null
          contract_signed_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          document_number?: string | null
          phone?: string | null
          email?: string | null
          street?: string | null
          number?: string | null
          complement?: string | null
          neighborhood?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          current_project_stage_id?: string | null
          system_type?: string | null
          estimated_kwp?: number | null
          contract_signed_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_current_project_stage_id_fkey"
            columns: ["current_project_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          id: string
          organization_id: string
          client_id: string
          proposal_id: string | null
          signature_date: string | null
          status: string
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          client_id: string
          proposal_id?: string | null
          signature_date?: string | null
          status?: string
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          client_id?: string
          proposal_id?: string | null
          signature_date?: string | null
          status?: string
          rejection_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          id: string
          organization_id: string
          client_id: string | null
          contract_id: string | null
          description: string | null
          entry_type: Database["public"]["Enums"]["financial_entry_type"]
          due_date: string
          value: number
          status: Database["public"]["Enums"]["payment_status"]
          payment_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          client_id?: string | null
          contract_id?: string | null
          description?: string | null
          entry_type?: Database["public"]["Enums"]["financial_entry_type"]
          due_date?: string
          value?: number
          status?: Database["public"]["Enums"]["payment_status"]
          payment_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          client_id?: string | null
          contract_id?: string | null
          description?: string | null
          entry_type?: Database["public"]["Enums"]["financial_entry_type"]
          due_date?: string
          value?: number
          status?: Database["public"]["Enums"]["payment_status"]
          payment_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          id: string
          organization_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          id: string
          organization_id: string
          name: string
          phone: string
          city: string | null
          lead_source_id: string | null
          observations: string | null
          next_action_date: string | null
          current_stage_id: string
          assigned_to_user_id: string | null
          system_type: string | null
          estimated_kwp: number | null
          estimated_value: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          phone: string
          city?: string | null
          lead_source_id?: string | null
          observations?: string | null
          next_action_date?: string | null
          current_stage_id: string
          assigned_to_user_id?: string | null
          system_type?: string | null
          estimated_kwp?: number | null
          estimated_value?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          phone?: string
          city?: string | null
          lead_source_id?: string | null
          observations?: string | null
          next_action_date?: string | null
          current_stage_id?: string
          assigned_to_user_id?: string | null
          system_type?: string | null
          estimated_kwp?: number | null
          estimated_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          message: string
          is_read: boolean
          notification_type: string | null
          related_entity: string | null
          related_entity_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          message: string
          is_read?: boolean
          notification_type?: string | null
          related_entity?: string | null
          related_entity_id?: string | null
          created_at?: string
        }
        Update: {
          is_read?: boolean
          notification_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          id: string
          organization_id: string
          setting_key: string
          setting_value: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          setting_key: string
          setting_value?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          setting_key?: string
          setting_value?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          id: string
          name: string
          plan: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          plan?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          plan?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          id: string
          organization_id: string
          name: string
          order: number
          color: string
          is_final_stage: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          order: number
          color?: string
          is_final_stage?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          order?: number
          color?: string
          is_final_stage?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          full_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          id: string
          organization_id: string
          client_id: string
          assigned_engineer_id: string | null
          status: Database["public"]["Enums"]["project_status"]
          submission_date: string | null
          approval_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          client_id: string
          assigned_engineer_id?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          submission_date?: string | null
          approval_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          client_id?: string
          assigned_engineer_id?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          submission_date?: string | null
          approval_date?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_assigned_engineer_id_fkey"
            columns: ["assigned_engineer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          id: string
          organization_id: string
          client_id: string
          lead_id: string | null
          version_number: number
          total_modules: number
          module_power_wp: number
          total_inverters: number
          inverter_power_w: number
          supplier_id: string | null
          kit_value: number
          total_power_kwp: number
          monthly_generation_kwh: number
          final_value: number
          status: Database["public"]["Enums"]["proposal_status"]
          created_by_user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          client_id: string
          lead_id?: string | null
          version_number?: number
          total_modules?: number
          module_power_wp?: number
          total_inverters?: number
          inverter_power_w?: number
          supplier_id?: string | null
          kit_value?: number
          total_power_kwp?: number
          monthly_generation_kwh?: number
          final_value?: number
          status?: Database["public"]["Enums"]["proposal_status"]
          created_by_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          client_id?: string
          lead_id?: string | null
          version_number?: number
          total_modules?: number
          module_power_wp?: number
          total_inverters?: number
          inverter_power_w?: number
          supplier_id?: string | null
          kit_value?: number
          total_power_kwp?: number
          monthly_generation_kwh?: number
          final_value?: number
          status?: Database["public"]["Enums"]["proposal_status"]
          created_by_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          id: string
          organization_id: string
          client_id: string | null
          supplier_id: string
          purchase_date: string
          status: string
          expected_delivery_date: string | null
          actual_delivery_date: string | null
          kit_description: string | null
          invoice_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          client_id?: string | null
          supplier_id: string
          purchase_date?: string
          status?: string
          expected_delivery_date?: string | null
          actual_delivery_date?: string | null
          kit_description?: string | null
          invoice_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          client_id?: string | null
          supplier_id?: string
          purchase_date?: string
          status?: string
          expected_delivery_date?: string | null
          actual_delivery_date?: string | null
          kit_description?: string | null
          invoice_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          id: string
          organization_id: string
          name: string
          contact_person: string | null
          phone: string | null
          email: string | null
          city: string | null
          state: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          city?: string | null
          state?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          city?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          id: string
          organization_id: string
          title: string
          description: string | null
          due_date: string | null
          completed_at: string | null
          assigned_to_user_id: string | null
          related_to_lead_id: string | null
          related_to_client_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          title: string
          description?: string | null
          due_date?: string | null
          completed_at?: string | null
          assigned_to_user_id?: string | null
          related_to_lead_id?: string | null
          related_to_client_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          title?: string
          description?: string | null
          due_date?: string | null
          completed_at?: string | null
          assigned_to_user_id?: string | null
          related_to_lead_id?: string | null
          related_to_client_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      works: {
        Row: {
          id: string
          organization_id: string
          client_id: string
          project_id: string | null
          scheduled_date: string | null
          start_date: string | null
          end_date: string | null
          status: Database["public"]["Enums"]["work_status"]
          street: string | null
          number: string | null
          city: string | null
          state: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          client_id: string
          project_id?: string | null
          scheduled_date?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: Database["public"]["Enums"]["work_status"]
          street?: string | null
          number?: string | null
          city?: string | null
          state?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          client_id?: string
          project_id?: string | null
          scheduled_date?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: Database["public"]["Enums"]["work_status"]
          street?: string | null
          number?: string | null
          city?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "works_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "works_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "works_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_org_ids: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      get_my_role: {
        Args: { org_id: string }
        Returns: string | null
      }
    }
    Enums: {
      financial_entry_type: "revenue" | "expense"
      payment_status: "paid" | "pending" | "overdue" | "cancelled"
      project_status:
        | "not_submitted"
        | "submitted"
        | "awaiting_approval"
        | "approved"
        | "rejected"
      proposal_status:
        | "draft"
        | "sent"
        | "approved"
        | "rejected"
        | "cancelled"
      work_status:
        | "awaiting_scheduling"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

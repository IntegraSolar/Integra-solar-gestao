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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          organization_id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          organization_id: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_attachments: {
        Row: {
          client_id: string
          file_url: string
          id: string
          organization_id: string
          type: string
          uploaded_at: string
        }
        Insert: {
          client_id: string
          file_url: string
          id?: string
          organization_id: string
          type: string
          uploaded_at?: string
        }
        Update: {
          client_id?: string
          file_url?: string
          id?: string
          organization_id?: string
          type?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_attachments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_commissions: {
        Row: {
          client_id: string
          comprovante_url: string | null
          created_at: string
          id: string
          organization_id: string
          paid_at: string | null
          status: string
          updated_at: string
          valor_comissao: number
          vendedor_id: string | null
        }
        Insert: {
          client_id: string
          comprovante_url?: string | null
          created_at?: string
          id?: string
          organization_id: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          valor_comissao: number
          vendedor_id?: string | null
        }
        Update: {
          client_id?: string
          comprovante_url?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          paid_at?: string | null
          status?: string
          updated_at?: string
          valor_comissao?: number
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_commissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_commissions_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contracts: {
        Row: {
          client_id: string
          contract_url: string | null
          created_at: string
          id: string
          organization_id: string
          power_of_attorney_url: string | null
          signed: boolean
          signed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          contract_url?: string | null
          created_at?: string
          id?: string
          organization_id: string
          power_of_attorney_url?: string | null
          signed?: boolean
          signed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          contract_url?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          power_of_attorney_url?: string | null
          signed?: boolean
          signed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_deliveries: {
        Row: {
          checklist: Json
          client_id: string
          created_at: string
          data_entrega: string | null
          id: string
          media_urls: string | null
          organization_id: string
          status: string
          termo_url: string | null
          updated_at: string
        }
        Insert: {
          checklist?: Json
          client_id: string
          created_at?: string
          data_entrega?: string | null
          id?: string
          media_urls?: string | null
          organization_id: string
          status?: string
          termo_url?: string | null
          updated_at?: string
        }
        Update: {
          checklist?: Json
          client_id?: string
          created_at?: string
          data_entrega?: string | null
          id?: string
          media_urls?: string | null
          organization_id?: string
          status?: string
          termo_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_deliveries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_installments: {
        Row: {
          amount: number
          client_id: string
          confirmed_at: string | null
          created_at: string
          due_date: string
          id: string
          notes: string | null
          organization_id: string
          payment_proof_url: string | null
          position: number
          status: string
        }
        Insert: {
          amount: number
          client_id: string
          confirmed_at?: string | null
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          organization_id: string
          payment_proof_url?: string | null
          position: number
          status?: string
        }
        Update: {
          amount?: number
          client_id?: string
          confirmed_at?: string | null
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          organization_id?: string
          payment_proof_url?: string | null
          position?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_installments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_installments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_obra_deliveries: {
        Row: {
          checklist: Json
          client_id: string
          created_at: string
          data_entrega: string | null
          id: string
          monitor_app: string | null
          monitor_pass: string | null
          monitor_user: string | null
          observacoes: string | null
          organization_id: string
          status: string
          termo_url: string | null
          updated_at: string
        }
        Insert: {
          checklist?: Json
          client_id: string
          created_at?: string
          data_entrega?: string | null
          id?: string
          monitor_app?: string | null
          monitor_pass?: string | null
          monitor_user?: string | null
          observacoes?: string | null
          organization_id: string
          status?: string
          termo_url?: string | null
          updated_at?: string
        }
        Update: {
          checklist?: Json
          client_id?: string
          created_at?: string
          data_entrega?: string | null
          id?: string
          monitor_app?: string | null
          monitor_pass?: string | null
          monitor_user?: string | null
          observacoes?: string | null
          organization_id?: string
          status?: string
          termo_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_obra_deliveries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_obras: {
        Row: {
          client_id: string
          created_at: string
          data_inicio: string | null
          data_prevista: string | null
          equipe_nome: string | null
          id: string
          organization_id: string
          responsavel_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          data_inicio?: string | null
          data_prevista?: string | null
          equipe_nome?: string | null
          id?: string
          organization_id: string
          responsavel_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          data_inicio?: string | null
          data_prevista?: string | null
          equipe_nome?: string | null
          id?: string
          organization_id?: string
          responsavel_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_obras_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_obras_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_pos_obra: {
        Row: {
          client_id: string
          created_at: string
          data_ativacao: string | null
          data_contato: string | null
          id: string
          monitoramento: Json | null
          nps: number | null
          observacoes: string | null
          ocorrencias: string | null
          organization_id: string
          parecer_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          data_ativacao?: string | null
          data_contato?: string | null
          id?: string
          monitoramento?: Json | null
          nps?: number | null
          observacoes?: string | null
          ocorrencias?: string | null
          organization_id: string
          parecer_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          data_ativacao?: string | null
          data_contato?: string | null
          id?: string
          monitoramento?: Json | null
          nps?: number | null
          observacoes?: string | null
          ocorrencias?: string | null
          organization_id?: string
          parecer_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_pos_obra_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_projects: {
        Row: {
          art_url: string | null
          checklist: Json
          client_id: string
          created_at: string
          data_protocolo: string | null
          data_solicitacao_vistoria: string | null
          id: string
          numero_processo: string | null
          organization_id: string
          parecer_acesso_url: string | null
          prazo_protocolo: string | null
          prazo_vistoria: string | null
          projeto_url: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          status: string
          updated_at: string
        }
        Insert: {
          art_url?: string | null
          checklist?: Json
          client_id: string
          created_at?: string
          data_protocolo?: string | null
          data_solicitacao_vistoria?: string | null
          id?: string
          numero_processo?: string | null
          organization_id: string
          parecer_acesso_url?: string | null
          prazo_protocolo?: string | null
          prazo_vistoria?: string | null
          projeto_url?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          art_url?: string | null
          checklist?: Json
          client_id?: string
          created_at?: string
          data_protocolo?: string | null
          data_solicitacao_vistoria?: string | null
          id?: string
          numero_processo?: string | null
          organization_id?: string
          parecer_acesso_url?: string | null
          prazo_protocolo?: string | null
          prazo_vistoria?: string | null
          projeto_url?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_projects_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_purchases: {
        Row: {
          client_id: string
          comprovante_url: string | null
          created_at: string
          data_prevista: string | null
          fornecedor: string | null
          id: string
          itens: string | null
          nf_url: string | null
          organization_id: string
          status: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          client_id: string
          comprovante_url?: string | null
          created_at?: string
          data_prevista?: string | null
          fornecedor?: string | null
          id?: string
          itens?: string | null
          nf_url?: string | null
          organization_id: string
          status?: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          client_id?: string
          comprovante_url?: string | null
          created_at?: string
          data_prevista?: string | null
          fornecedor?: string | null
          id?: string
          itens?: string | null
          nf_url?: string | null
          organization_id?: string
          status?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_purchases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_sale: {
        Row: {
          client_id: string
          commission_pct: number | null
          commission_seller: string | null
          created_at: string
          id: string
          nf_notes: string | null
          organization_id: string
          payment_method: string | null
          proposal_id: string | null
          sale_value: number
          updated_at: string
        }
        Insert: {
          client_id: string
          commission_pct?: number | null
          commission_seller?: string | null
          created_at?: string
          id?: string
          nf_notes?: string | null
          organization_id: string
          payment_method?: string | null
          proposal_id?: string | null
          sale_value?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          commission_pct?: number | null
          commission_seller?: string | null
          created_at?: string
          id?: string
          nf_notes?: string | null
          organization_id?: string
          payment_method?: string | null
          proposal_id?: string | null
          sale_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_sale_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sale_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sale_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          adaptation_details: string | null
          city: string | null
          client_notes: string | null
          complement: string | null
          completed_tabs: Json | null
          contract_date: string | null
          contract_max_days: number | null
          contract_signed_date: string | null
          cpf_cnpj: string | null
          created_at: string
          current_project_stage_id: string | null
          delivery_start_date: string | null
          direct_delivery: boolean | null
          document_number: string | null
          email: string | null
          entry_breaker: string | null
          entry_cable_mm: string | null
          estimated_kwp: number | null
          extra_promises: string | null
          has_adaptation_works: boolean | null
          id: string
          inspection_done: boolean | null
          inverter_brand: string | null
          inverter_extra_capacity: string | null
          inverter_power_w: number | null
          lead_id: string | null
          maps_coordinates: string | null
          name: string
          neighborhood: string | null
          number: string | null
          organization_id: string
          panel_brand: string | null
          panel_power_w: number | null
          phone: string | null
          pipeline_flags: Json | null
          pipeline_stage: string | null
          promised_kwh: number | null
          roof_orientation: string | null
          roof_type: string | null
          specific_inverter: boolean | null
          specific_panels: boolean | null
          state: string | null
          street: string | null
          system_power_kwp: number | null
          system_type: string | null
          type: string | null
          updated_at: string
          viability_proposal_id: string | null
          zip: string | null
          zip_code: string | null
        }
        Insert: {
          adaptation_details?: string | null
          city?: string | null
          client_notes?: string | null
          complement?: string | null
          completed_tabs?: Json | null
          contract_date?: string | null
          contract_max_days?: number | null
          contract_signed_date?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          current_project_stage_id?: string | null
          delivery_start_date?: string | null
          direct_delivery?: boolean | null
          document_number?: string | null
          email?: string | null
          entry_breaker?: string | null
          entry_cable_mm?: string | null
          estimated_kwp?: number | null
          extra_promises?: string | null
          has_adaptation_works?: boolean | null
          id?: string
          inspection_done?: boolean | null
          inverter_brand?: string | null
          inverter_extra_capacity?: string | null
          inverter_power_w?: number | null
          lead_id?: string | null
          maps_coordinates?: string | null
          name: string
          neighborhood?: string | null
          number?: string | null
          organization_id: string
          panel_brand?: string | null
          panel_power_w?: number | null
          phone?: string | null
          pipeline_flags?: Json | null
          pipeline_stage?: string | null
          promised_kwh?: number | null
          roof_orientation?: string | null
          roof_type?: string | null
          specific_inverter?: boolean | null
          specific_panels?: boolean | null
          state?: string | null
          street?: string | null
          system_power_kwp?: number | null
          system_type?: string | null
          type?: string | null
          updated_at?: string
          viability_proposal_id?: string | null
          zip?: string | null
          zip_code?: string | null
        }
        Update: {
          adaptation_details?: string | null
          city?: string | null
          client_notes?: string | null
          complement?: string | null
          completed_tabs?: Json | null
          contract_date?: string | null
          contract_max_days?: number | null
          contract_signed_date?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          current_project_stage_id?: string | null
          delivery_start_date?: string | null
          direct_delivery?: boolean | null
          document_number?: string | null
          email?: string | null
          entry_breaker?: string | null
          entry_cable_mm?: string | null
          estimated_kwp?: number | null
          extra_promises?: string | null
          has_adaptation_works?: boolean | null
          id?: string
          inspection_done?: boolean | null
          inverter_brand?: string | null
          inverter_extra_capacity?: string | null
          inverter_power_w?: number | null
          lead_id?: string | null
          maps_coordinates?: string | null
          name?: string
          neighborhood?: string | null
          number?: string | null
          organization_id?: string
          panel_brand?: string | null
          panel_power_w?: number | null
          phone?: string | null
          pipeline_flags?: Json | null
          pipeline_stage?: string | null
          promised_kwh?: number | null
          roof_orientation?: string | null
          roof_type?: string | null
          specific_inverter?: boolean | null
          specific_panels?: boolean | null
          state?: string | null
          street?: string | null
          system_power_kwp?: number | null
          system_type?: string | null
          type?: string | null
          updated_at?: string
          viability_proposal_id?: string | null
          zip?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_current_project_stage_id_fkey"
            columns: ["current_project_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_viability_proposal_id_fkey"
            columns: ["viability_proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          client_id: string
          created_at: string
          id: string
          organization_id: string
          proposal_id: string | null
          rejection_reason: string | null
          signature_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          organization_id: string
          proposal_id?: string | null
          rejection_reason?: string | null
          signature_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          proposal_id?: string | null
          rejection_reason?: string | null
          signature_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          client_id: string | null
          contract_id: string | null
          created_at: string
          description: string | null
          due_date: string
          entry_type: Database["public"]["Enums"]["financial_entry_type"]
          id: string
          organization_id: string
          payment_date: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          value: number
        }
        Insert: {
          client_id?: string | null
          contract_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          entry_type?: Database["public"]["Enums"]["financial_entry_type"]
          id?: string
          organization_id: string
          payment_date?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          value?: number
        }
        Update: {
          client_id?: string | null
          contract_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          entry_type?: Database["public"]["Enums"]["financial_entry_type"]
          id?: string
          organization_id?: string
          payment_date?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          organization_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          organization_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
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
          address: string | null
          assigned_to_user_id: string | null
          avg_kwh: number | null
          city: string | null
          converted: boolean
          converted_to_client_id: string | null
          created_at: string
          current_stage_id: string
          estimated_kwp: number | null
          estimated_value: number | null
          id: string
          installation_type: string | null
          lead_source_id: string | null
          name: string
          next_action_date: string | null
          observations: string | null
          organization_id: string
          phone: string
          system_type: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          assigned_to_user_id?: string | null
          avg_kwh?: number | null
          city?: string | null
          converted?: boolean
          converted_to_client_id?: string | null
          created_at?: string
          current_stage_id: string
          estimated_kwp?: number | null
          estimated_value?: number | null
          id?: string
          installation_type?: string | null
          lead_source_id?: string | null
          name: string
          next_action_date?: string | null
          observations?: string | null
          organization_id: string
          phone: string
          system_type?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          assigned_to_user_id?: string | null
          avg_kwh?: number | null
          city?: string | null
          converted?: boolean
          converted_to_client_id?: string | null
          created_at?: string
          current_stage_id?: string
          estimated_kwp?: number | null
          estimated_value?: number | null
          id?: string
          installation_type?: string | null
          lead_source_id?: string | null
          name?: string
          next_action_date?: string | null
          observations?: string | null
          organization_id?: string
          phone?: string
          system_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_to_client_id_fkey"
            columns: ["converted_to_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
            foreignKeyName: "leads_lead_source_id_fkey"
            columns: ["lead_source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          notification_type: string | null
          organization_id: string
          related_entity: string | null
          related_entity_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          notification_type?: string | null
          organization_id: string
          related_entity?: string | null
          related_entity_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: string | null
          organization_id?: string
          related_entity?: string | null
          related_entity_id?: string | null
          user_id?: string
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
      org_config: {
        Row: {
          agencia: string | null
          bairro: string | null
          banco: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          concessionaria: string | null
          conta: string | null
          cor_principal: string | null
          cor_secundaria: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          kwh_por_kwp: number | null
          logo_url: string | null
          meta_anual: number | null
          nome_fantasia: string | null
          numero: string | null
          organization_id: string
          pct_comissao: number | null
          pct_imposto: number | null
          pct_margem: number | null
          pct_material_ca: number | null
          pix: string | null
          prazo_padrao_contrato: number | null
          quilometragem: number | null
          razao_social: string | null
          telefone: string | null
          tipo_chave_pix: string | null
          updated_at: string
          valor_instalacao_por_placa: number | null
          valor_projeto_por_kwp: number | null
        }
        Insert: {
          agencia?: string | null
          bairro?: string | null
          banco?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          concessionaria?: string | null
          conta?: string | null
          cor_principal?: string | null
          cor_secundaria?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          kwh_por_kwp?: number | null
          logo_url?: string | null
          meta_anual?: number | null
          nome_fantasia?: string | null
          numero?: string | null
          organization_id: string
          pct_comissao?: number | null
          pct_imposto?: number | null
          pct_margem?: number | null
          pct_material_ca?: number | null
          pix?: string | null
          prazo_padrao_contrato?: number | null
          quilometragem?: number | null
          razao_social?: string | null
          telefone?: string | null
          tipo_chave_pix?: string | null
          updated_at?: string
          valor_instalacao_por_placa?: number | null
          valor_projeto_por_kwp?: number | null
        }
        Update: {
          agencia?: string | null
          bairro?: string | null
          banco?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          concessionaria?: string | null
          conta?: string | null
          cor_principal?: string | null
          cor_secundaria?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          kwh_por_kwp?: number | null
          logo_url?: string | null
          meta_anual?: number | null
          nome_fantasia?: string | null
          numero?: string | null
          organization_id?: string
          pct_comissao?: number | null
          pct_imposto?: number | null
          pct_margem?: number | null
          pct_material_ca?: number | null
          pix?: string | null
          prazo_padrao_contrato?: number | null
          quilometragem?: number | null
          razao_social?: string | null
          telefone?: string | null
          tipo_chave_pix?: string | null
          updated_at?: string
          valor_instalacao_por_placa?: number | null
          valor_projeto_por_kwp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "org_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          permissions: Json
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          permissions?: Json
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          permissions?: Json
          role?: string
          user_id?: string
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
          created_at: string
          id: string
          organization_id: string
          setting_key: string
          setting_value: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          setting_key: string
          setting_value?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
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
          created_at: string
          id: string
          name: string
          plan: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          plan?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          plan?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_date: string | null
          provider: string
          provider_payment_id: string | null
          status: string
          subscription_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_date?: string | null
          provider: string
          provider_payment_id?: string | null
          status?: string
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_date?: string | null
          provider?: string
          provider_payment_id?: string | null
          status?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          is_final_stage: boolean
          is_terminal_lost: boolean
          is_terminal_won: boolean
          name: string
          order: number
          organization_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_final_stage?: boolean
          is_terminal_lost?: boolean
          is_terminal_won?: boolean
          name: string
          order: number
          organization_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_final_stage?: boolean
          is_terminal_lost?: boolean
          is_terminal_won?: boolean
          name?: string
          order?: number
          organization_id?: string
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
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          approval_date: string | null
          assigned_engineer_id: string | null
          client_id: string
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          status: Database["public"]["Enums"]["project_status"]
          submission_date: string | null
          updated_at: string
        }
        Insert: {
          approval_date?: string | null
          assigned_engineer_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          status?: Database["public"]["Enums"]["project_status"]
          submission_date?: string | null
          updated_at?: string
        }
        Update: {
          approval_date?: string | null
          assigned_engineer_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          status?: Database["public"]["Enums"]["project_status"]
          submission_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_assigned_engineer_id_fkey"
            columns: ["assigned_engineer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_templates: {
        Row: {
          category: string | null
          created_at: string
          file_path: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          org_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          file_path: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          org_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          file_path?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          client_id: string | null
          created_at: string
          created_by_user_id: string | null
          custo_ca: number | null
          custo_instalacao: number | null
          custo_kit: number | null
          custo_km: number | null
          custo_projeto: number | null
          docx_url: string | null
          final_value: number
          gerado_em: string | null
          id: string
          inverter_brand_model: string | null
          inverter_power_w: number
          kit_value: number
          km_rodados: number | null
          lead_id: string | null
          module_power_wp: number
          monthly_generation_kwh: number
          name: string
          num_parcelas: number | null
          organization_id: string
          panel_brand_model: string | null
          pdf_url: string | null
          preco_total: number | null
          status: Database["public"]["Enums"]["proposal_status"]
          supplier_id: string | null
          supplier_name: string | null
          template_id: string | null
          total_inverters: number
          total_modules: number
          total_power_kwp: number
          updated_at: string
          valor_entrada: number | null
          valor_parcelas: number | null
          version_number: number
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          custo_ca?: number | null
          custo_instalacao?: number | null
          custo_kit?: number | null
          custo_km?: number | null
          custo_projeto?: number | null
          docx_url?: string | null
          final_value?: number
          gerado_em?: string | null
          id?: string
          inverter_brand_model?: string | null
          inverter_power_w?: number
          kit_value?: number
          km_rodados?: number | null
          lead_id?: string | null
          module_power_wp?: number
          monthly_generation_kwh?: number
          name?: string
          num_parcelas?: number | null
          organization_id: string
          panel_brand_model?: string | null
          pdf_url?: string | null
          preco_total?: number | null
          status?: Database["public"]["Enums"]["proposal_status"]
          supplier_id?: string | null
          supplier_name?: string | null
          template_id?: string | null
          total_inverters?: number
          total_modules?: number
          total_power_kwp?: number
          updated_at?: string
          valor_entrada?: number | null
          valor_parcelas?: number | null
          version_number?: number
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          custo_ca?: number | null
          custo_instalacao?: number | null
          custo_kit?: number | null
          custo_km?: number | null
          custo_projeto?: number | null
          docx_url?: string | null
          final_value?: number
          gerado_em?: string | null
          id?: string
          inverter_brand_model?: string | null
          inverter_power_w?: number
          kit_value?: number
          km_rodados?: number | null
          lead_id?: string | null
          module_power_wp?: number
          monthly_generation_kwh?: number
          name?: string
          num_parcelas?: number | null
          organization_id?: string
          panel_brand_model?: string | null
          pdf_url?: string | null
          preco_total?: number | null
          status?: Database["public"]["Enums"]["proposal_status"]
          supplier_id?: string | null
          supplier_name?: string | null
          template_id?: string | null
          total_inverters?: number
          total_modules?: number
          total_power_kwp?: number
          updated_at?: string
          valor_entrada?: number | null
          valor_parcelas?: number | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "proposal_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          actual_delivery_date: string | null
          client_id: string | null
          created_at: string
          expected_delivery_date: string | null
          id: string
          invoice_number: string | null
          kit_description: string | null
          organization_id: string
          purchase_date: string
          status: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          actual_delivery_date?: string | null
          client_id?: string | null
          created_at?: string
          expected_delivery_date?: string | null
          id?: string
          invoice_number?: string | null
          kit_description?: string | null
          organization_id: string
          purchase_date?: string
          status?: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          actual_delivery_date?: string | null
          client_id?: string | null
          created_at?: string
          expected_delivery_date?: string | null
          id?: string
          invoice_number?: string | null
          kit_description?: string | null
          organization_id?: string
          purchase_date?: string
          status?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
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
      simulador_cartao_tabelas: {
        Row: {
          created_at: string
          id: string
          max_parcelas: number
          nome: string
          observacao: string | null
          ordem: number
          organization_id: string
          taxas: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_parcelas?: number
          nome: string
          observacao?: string | null
          ordem?: number
          organization_id: string
          taxas?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_parcelas?: number
          nome?: string
          observacao?: string | null
          ordem?: number
          organization_id?: string
          taxas?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulador_cartao_tabelas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      simulador_concessionarias: {
        Row: {
          aplica_reajuste_1430: boolean
          created_at: string
          demanda_contratada_sem_imp: number
          demanda_geracao_sem_imp: number
          icms: number
          id: string
          nome: string
          organization_id: string
          pis_cofins: number
          te: number
          tipo_processo: string
          tusd: number
          tusd_fio_a: number
          tusd_fio_b: number
          tusd_ped: number
          tusd_tfsee: number
          updated_at: string
        }
        Insert: {
          aplica_reajuste_1430?: boolean
          created_at?: string
          demanda_contratada_sem_imp?: number
          demanda_geracao_sem_imp?: number
          icms?: number
          id?: string
          nome: string
          organization_id: string
          pis_cofins?: number
          te?: number
          tipo_processo?: string
          tusd?: number
          tusd_fio_a?: number
          tusd_fio_b?: number
          tusd_ped?: number
          tusd_tfsee?: number
          updated_at?: string
        }
        Update: {
          aplica_reajuste_1430?: boolean
          created_at?: string
          demanda_contratada_sem_imp?: number
          demanda_geracao_sem_imp?: number
          icms?: number
          id?: string
          nome?: string
          organization_id?: string
          pis_cofins?: number
          te?: number
          tipo_processo?: string
          tusd?: number
          tusd_fio_a?: number
          tusd_fio_b?: number
          tusd_ped?: number
          tusd_tfsee?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulador_concessionarias_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      simulador_viabilidade: {
        Row: {
          cliente_cidade: string | null
          cliente_nome: string | null
          concessionaria_id: string | null
          created_at: string
          id: string
          input: Json
          nome: string
          organization_id: string
          payback_anos: number
          tir: number
          updated_at: string
          vpl: number
        }
        Insert: {
          cliente_cidade?: string | null
          cliente_nome?: string | null
          concessionaria_id?: string | null
          created_at?: string
          id?: string
          input: Json
          nome: string
          organization_id: string
          payback_anos?: number
          tir?: number
          updated_at?: string
          vpl?: number
        }
        Update: {
          cliente_cidade?: string | null
          cliente_nome?: string | null
          concessionaria_id?: string | null
          created_at?: string
          id?: string
          input?: Json
          nome?: string
          organization_id?: string
          payback_anos?: number
          tir?: number
          updated_at?: string
          vpl?: number
        }
        Relationships: [
          {
            foreignKeyName: "simulador_viabilidade_concessionaria_id_fkey"
            columns: ["concessionaria_id"]
            isOneToOne: false
            referencedRelation: "simulador_concessionarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulador_viabilidade_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          quantity: number
          unit_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          quantity?: number
          unit_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          quantity?: number
          unit_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          billing_cycle: string
          created_at: string
          expires_at: string | null
          id: string
          organization_id: string
          payment_method: string
          plan: string
          provider: string
          provider_subscription_id: string | null
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          billing_cycle: string
          created_at?: string
          expires_at?: string | null
          id?: string
          organization_id: string
          payment_method: string
          plan: string
          provider: string
          provider_subscription_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          billing_cycle?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          organization_id?: string
          payment_method?: string
          plan?: string
          provider?: string
          provider_subscription_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          city: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          organization_id: string
          phone: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organization_id: string
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organization_id?: string
          phone?: string | null
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
          assigned_to_user_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          organization_id: string
          related_to_client_id: string | null
          related_to_lead_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id: string
          related_to_client_id?: string | null
          related_to_lead_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string
          related_to_client_id?: string | null
          related_to_lead_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_related_to_client_id_fkey"
            columns: ["related_to_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_related_to_lead_id_fkey"
            columns: ["related_to_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      works: {
        Row: {
          city: string | null
          client_id: string
          created_at: string
          end_date: string | null
          id: string
          number: string | null
          organization_id: string
          project_id: string | null
          scheduled_date: string | null
          start_date: string | null
          state: string | null
          status: Database["public"]["Enums"]["work_status"]
          street: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          client_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          number?: string | null
          organization_id: string
          project_id?: string | null
          scheduled_date?: string | null
          start_date?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["work_status"]
          street?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          client_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          number?: string | null
          organization_id?: string
          project_id?: string | null
          scheduled_date?: string | null
          start_date?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["work_status"]
          street?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "works_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "works_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      get_my_org_ids: { Args: never; Returns: string[] }
      get_my_role: { Args: { org_id: string }; Returns: string }
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
      proposal_status: "draft" | "sent" | "approved" | "rejected" | "cancelled"
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
      financial_entry_type: ["revenue", "expense"],
      payment_status: ["paid", "pending", "overdue", "cancelled"],
      project_status: [
        "not_submitted",
        "submitted",
        "awaiting_approval",
        "approved",
        "rejected",
      ],
      proposal_status: ["draft", "sent", "approved", "rejected", "cancelled"],
      work_status: [
        "awaiting_scheduling",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ],
    },
  },
} as const

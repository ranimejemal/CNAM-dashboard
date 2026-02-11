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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_table: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_table: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_table?: string
          user_id?: string | null
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          blocked_at: string
          blocked_by: string
          created_at: string
          expires_at: string
          id: string
          ip_address: string
          reason: string
        }
        Insert: {
          blocked_at?: string
          blocked_by?: string
          created_at?: string
          expires_at: string
          id?: string
          ip_address: string
          reason?: string
        }
        Update: {
          blocked_at?: string
          blocked_by?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string
          reason?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          event_type: string
          id: string
          related_member_id: string | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type: string
          id?: string
          related_member_id?: string | null
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          related_member_id?: string | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_related_member_id_fkey"
            columns: ["related_member_id"]
            isOneToOne: false
            referencedRelation: "insured_members"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          created_by: string | null
          document_type: string
          expiry_date: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          insured_member_id: string
          reimbursement_id: string | null
          status: Database["public"]["Enums"]["document_status"]
          updated_at: string
          upload_date: string
          validation_date: string | null
          validation_notes: string | null
          validator_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_type: string
          expiry_date?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          insured_member_id: string
          reimbursement_id?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
          upload_date?: string
          validation_date?: string | null
          validation_notes?: string | null
          validator_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_type?: string
          expiry_date?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          insured_member_id?: string
          reimbursement_id?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
          upload_date?: string
          validation_date?: string | null
          validation_notes?: string | null
          validator_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_insured_member_id_fkey"
            columns: ["insured_member_id"]
            isOneToOne: false
            referencedRelation: "insured_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_reimbursement_id_fkey"
            columns: ["reimbursement_id"]
            isOneToOne: false
            referencedRelation: "reimbursements"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          opened_at: string | null
          recipient_email: string
          recipient_user_id: string | null
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email_type: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          recipient_email: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          recipient_email?: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      health_providers: {
        Row: {
          address: string
          approval_date: string | null
          created_at: string
          email: string | null
          error_rate: number | null
          id: string
          invoices_processed: number | null
          name: string
          phone: string | null
          provider_code: string
          specialty: string | null
          status: Database["public"]["Enums"]["provider_status"]
          type: Database["public"]["Enums"]["provider_type"]
          updated_at: string
        }
        Insert: {
          address: string
          approval_date?: string | null
          created_at?: string
          email?: string | null
          error_rate?: number | null
          id?: string
          invoices_processed?: number | null
          name: string
          phone?: string | null
          provider_code: string
          specialty?: string | null
          status?: Database["public"]["Enums"]["provider_status"]
          type: Database["public"]["Enums"]["provider_type"]
          updated_at?: string
        }
        Update: {
          address?: string
          approval_date?: string | null
          created_at?: string
          email?: string | null
          error_rate?: number | null
          id?: string
          invoices_processed?: number | null
          name?: string
          phone?: string | null
          provider_code?: string
          specialty?: string | null
          status?: Database["public"]["Enums"]["provider_status"]
          type?: Database["public"]["Enums"]["provider_type"]
          updated_at?: string
        }
        Relationships: []
      }
      insured_members: {
        Row: {
          address: string | null
          card_expiry_date: string | null
          cin: string
          created_at: string
          created_by: string | null
          date_of_birth: string
          email: string | null
          first_name: string
          id: string
          insurance_number: string
          last_name: string
          phone: string | null
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          card_expiry_date?: string | null
          cin: string
          created_at?: string
          created_by?: string | null
          date_of_birth: string
          email?: string | null
          first_name: string
          id?: string
          insurance_number: string
          last_name: string
          phone?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          card_expiry_date?: string | null
          cin?: string
          created_at?: string
          created_by?: string | null
          date_of_birth?: string
          email?: string | null
          first_name?: string
          id?: string
          insurance_number?: string
          last_name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      registration_otps: {
        Row: {
          attempts: number
          created_at: string
          email: string
          expires_at: string
          first_name: string
          id: string
          last_name: string
          otp_code: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          email: string
          expires_at: string
          first_name: string
          id?: string
          last_name: string
          otp_code: string
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string
          expires_at?: string
          first_name?: string
          id?: string
          last_name?: string
          otp_code?: string
        }
        Relationships: []
      }
      registration_requests: {
        Row: {
          cnam_number: string | null
          created_at: string
          document_url: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          license_number: string | null
          message: string | null
          organization_name: string | null
          organization_type: string | null
          phone: string | null
          rejection_reason: string | null
          request_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cnam_number?: string | null
          created_at?: string
          document_url?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          license_number?: string | null
          message?: string | null
          organization_name?: string | null
          organization_type?: string | null
          phone?: string | null
          rejection_reason?: string | null
          request_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cnam_number?: string | null
          created_at?: string
          document_url?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          license_number?: string | null
          message?: string | null
          organization_name?: string | null
          organization_type?: string | null
          phone?: string | null
          rejection_reason?: string | null
          request_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      reimbursements: {
        Row: {
          amount_approved: number | null
          amount_requested: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          insured_member_id: string
          provider_id: string
          reference_number: string
          rejection_reason: string | null
          service_type: string
          status: Database["public"]["Enums"]["reimbursement_status"]
          submission_date: string
          updated_at: string
          validation_date: string | null
          validator_id: string | null
        }
        Insert: {
          amount_approved?: number | null
          amount_requested: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          insured_member_id: string
          provider_id: string
          reference_number: string
          rejection_reason?: string | null
          service_type: string
          status?: Database["public"]["Enums"]["reimbursement_status"]
          submission_date?: string
          updated_at?: string
          validation_date?: string | null
          validator_id?: string | null
        }
        Update: {
          amount_approved?: number | null
          amount_requested?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          insured_member_id?: string
          provider_id?: string
          reference_number?: string
          rejection_reason?: string | null
          service_type?: string
          status?: Database["public"]["Enums"]["reimbursement_status"]
          submission_date?: string
          updated_at?: string
          validation_date?: string | null
          validator_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reimbursements_insured_member_id_fkey"
            columns: ["insured_member_id"]
            isOneToOne: false
            referencedRelation: "insured_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reimbursements_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "health_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: Database["public"]["Enums"]["security_event_type"]
          id: string
          ip_address: string | null
          location: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["threat_severity"]
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: Database["public"]["Enums"]["security_event_type"]
          id?: string
          ip_address?: string | null
          location?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["threat_severity"]
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: Database["public"]["Enums"]["security_event_type"]
          id?: string
          ip_address?: string | null
          location?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["threat_severity"]
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      threats: {
        Row: {
          actions_taken: string | null
          affected_system: string | null
          affected_user_id: string | null
          category: string
          created_at: string
          description: string | null
          detected_at: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["threat_severity"]
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          actions_taken?: string | null
          affected_system?: string | null
          affected_user_id?: string | null
          category: string
          created_at?: string
          description?: string | null
          detected_at?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity: Database["public"]["Enums"]["threat_severity"]
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          actions_taken?: string | null
          affected_system?: string | null
          affected_user_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          detected_at?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["threat_severity"]
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_login_history: {
        Row: {
          device_fingerprint: string | null
          id: string
          ip_address: string | null
          location: string | null
          login_at: string
          status: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          location?: string | null
          login_at?: string
          status?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          location?: string | null
          login_at?: string
          status?: string
          user_agent?: string | null
          user_id?: string
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
      user_security_settings: {
        Row: {
          created_at: string
          email_verified: boolean | null
          failed_login_attempts: number | null
          id: string
          last_login_at: string | null
          last_login_ip: string | null
          last_login_location: string | null
          locked_until: string | null
          mfa_enabled_at: string | null
          mfa_secret: string | null
          mfa_status: Database["public"]["Enums"]["mfa_status"]
          otp_attempts: number | null
          otp_code: string | null
          otp_expires_at: string | null
          password_changed_at: string | null
          password_must_change: boolean | null
          security_notifications: boolean | null
          trusted_devices: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_verified?: boolean | null
          failed_login_attempts?: number | null
          id?: string
          last_login_at?: string | null
          last_login_ip?: string | null
          last_login_location?: string | null
          locked_until?: string | null
          mfa_enabled_at?: string | null
          mfa_secret?: string | null
          mfa_status?: Database["public"]["Enums"]["mfa_status"]
          otp_attempts?: number | null
          otp_code?: string | null
          otp_expires_at?: string | null
          password_changed_at?: string | null
          password_must_change?: boolean | null
          security_notifications?: boolean | null
          trusted_devices?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_verified?: boolean | null
          failed_login_attempts?: number | null
          id?: string
          last_login_at?: string | null
          last_login_ip?: string | null
          last_login_location?: string | null
          locked_until?: string | null
          mfa_enabled_at?: string | null
          mfa_secret?: string | null
          mfa_status?: Database["public"]["Enums"]["mfa_status"]
          otp_attempts?: number | null
          otp_code?: string | null
          otp_expires_at?: string | null
          password_changed_at?: string | null
          password_must_change?: boolean | null
          security_notifications?: boolean | null
          trusted_devices?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_agent: { Args: never; Returns: boolean }
      is_admin_superieur: { Args: never; Returns: boolean }
      is_agent: { Args: never; Returns: boolean }
      is_prestataire: { Args: never; Returns: boolean }
      is_security_engineer: { Args: never; Returns: boolean }
      is_user: { Args: never; Returns: boolean }
      is_validator: { Args: never; Returns: boolean }
      log_security_event: {
        Args: {
          p_details?: Json
          p_event_type: Database["public"]["Enums"]["security_event_type"]
          p_ip_address?: string
          p_location?: string
          p_severity: Database["public"]["Enums"]["threat_severity"]
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "agent"
        | "validator"
        | "user"
        | "prestataire"
        | "security_engineer"
        | "admin_superieur"
      document_status: "pending" | "approved" | "rejected" | "expired"
      member_status: "active" | "suspended" | "expired"
      mfa_status: "disabled" | "pending" | "enabled" | "enforced"
      provider_status: "approved" | "pending" | "suspended"
      provider_type: "hospital" | "doctor" | "pharmacy" | "laboratory"
      reimbursement_status: "pending" | "processing" | "approved" | "rejected"
      security_event_type:
        | "login_success"
        | "login_failure"
        | "logout"
        | "password_change"
        | "mfa_enabled"
        | "mfa_disabled"
        | "suspicious_activity"
        | "access_denied"
        | "session_expired"
        | "ip_blocked"
      threat_severity: "low" | "medium" | "high" | "critical"
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
      app_role: [
        "admin",
        "agent",
        "validator",
        "user",
        "prestataire",
        "security_engineer",
        "admin_superieur",
      ],
      document_status: ["pending", "approved", "rejected", "expired"],
      member_status: ["active", "suspended", "expired"],
      mfa_status: ["disabled", "pending", "enabled", "enforced"],
      provider_status: ["approved", "pending", "suspended"],
      provider_type: ["hospital", "doctor", "pharmacy", "laboratory"],
      reimbursement_status: ["pending", "processing", "approved", "rejected"],
      security_event_type: [
        "login_success",
        "login_failure",
        "logout",
        "password_change",
        "mfa_enabled",
        "mfa_disabled",
        "suspicious_activity",
        "access_denied",
        "session_expired",
        "ip_blocked",
      ],
      threat_severity: ["low", "medium", "high", "critical"],
    },
  },
} as const

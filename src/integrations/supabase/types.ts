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
      deposit_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          currency: string
          fee: number
          id: string
          net_amount: number | null
          payment_method: string
          payment_method_id: string | null
          payment_reference: string | null
          region: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          currency?: string
          fee?: number
          id?: string
          net_amount?: number | null
          payment_method: string
          payment_method_id?: string | null
          payment_reference?: string | null
          region?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          currency?: string
          fee?: number
          id?: string
          net_amount?: number | null
          payment_method?: string
          payment_method_id?: string | null
          payment_reference?: string | null
          region?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposit_requests_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_plans: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          id: string
          max_amount: number
          min_amount: number
          name: string
          weekly_roi_rate: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          max_amount: number
          min_amount: number
          name: string
          weekly_roi_rate: number
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          max_amount?: number
          min_amount?: number
          name?: string
          weekly_roi_rate?: number
        }
        Relationships: []
      }
      investments: {
        Row: {
          amount: number
          created_at: string
          id: string
          next_payout_date: string
          plan_id: string
          plan_name: string
          start_date: string
          status: Database["public"]["Enums"]["investment_status"]
          user_id: string
          weekly_return: number
          weekly_roi_rate: number
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          next_payout_date: string
          plan_id: string
          plan_name: string
          start_date?: string
          status?: Database["public"]["Enums"]["investment_status"]
          user_id: string
          weekly_return: number
          weekly_roi_rate: number
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          next_payout_date?: string
          plan_id?: string
          plan_name?: string
          start_date?: string
          status?: Database["public"]["Enums"]["investment_status"]
          user_id?: string
          weekly_return?: number
          weekly_roi_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "investments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "investment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_data_uploads: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          portal_username: string
          status: string
          transaction_count: number | null
          uploaded_balance: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          portal_username: string
          status?: string
          transaction_count?: number | null
          uploaded_balance?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          portal_username?: string
          status?: string
          transaction_count?: number | null
          uploaded_balance?: number | null
          user_id?: string
        }
        Relationships: []
      }
      legacy_user_codes: {
        Row: {
          account_balance: number
          active: boolean
          code: string
          created_at: string
          id: string
          portal_username: string
        }
        Insert: {
          account_balance?: number
          active?: boolean
          code: string
          created_at?: string
          id?: string
          portal_username: string
        }
        Update: {
          account_balance?: number
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          portal_username?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          dismissed: boolean
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          dismissed?: boolean
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          dismissed?: boolean
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          force_popup: boolean
          id: string
          link: string | null
          message: string
          read: boolean
          related_request_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          force_popup?: boolean
          id?: string
          link?: string | null
          message: string
          read?: boolean
          related_request_id?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          force_popup?: boolean
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          related_request_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          active: boolean
          code: string
          created_at: string
          currency: string
          direction: string
          display_name: string
          display_order: number
          fee_flat: number
          fee_percent: number
          id: string
          instructions: string | null
          max_amount: number | null
          min_amount: number
          processing_time: string | null
          region: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          currency: string
          direction?: string
          display_name: string
          display_order?: number
          fee_flat?: number
          fee_percent?: number
          id?: string
          instructions?: string | null
          max_amount?: number | null
          min_amount?: number
          processing_time?: string | null
          region: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          currency?: string
          direction?: string
          display_name?: string
          display_order?: number
          fee_flat?: number
          fee_percent?: number
          id?: string
          instructions?: string | null
          max_amount?: number | null
          min_amount?: number
          processing_time?: string | null
          region?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          deposit_alerts: boolean
          email: string
          email_alerts: boolean
          full_name: string
          id: string
          legacy_data_uploaded: boolean
          legacy_upload_date: string | null
          payout_alerts: boolean
          portal_username: string | null
          two_factor_enabled: boolean
          updated_at: string
          wallet_balance: number
          withdrawal_alerts: boolean
        }
        Insert: {
          created_at?: string
          deposit_alerts?: boolean
          email: string
          email_alerts?: boolean
          full_name: string
          id: string
          legacy_data_uploaded?: boolean
          legacy_upload_date?: string | null
          payout_alerts?: boolean
          portal_username?: string | null
          two_factor_enabled?: boolean
          updated_at?: string
          wallet_balance?: number
          withdrawal_alerts?: boolean
        }
        Update: {
          created_at?: string
          deposit_alerts?: boolean
          email?: string
          email_alerts?: boolean
          full_name?: string
          id?: string
          legacy_data_uploaded?: boolean
          legacy_upload_date?: string | null
          payout_alerts?: boolean
          portal_username?: string | null
          two_factor_enabled?: boolean
          updated_at?: string
          wallet_balance?: number
          withdrawal_alerts?: boolean
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          fee: number
          id: string
          reference: string
          related_request_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          fee?: number
          id?: string
          reference: string
          related_request_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          fee?: number
          id?: string
          reference?: string
          related_request_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
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
      verification_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          purpose: string
          used: boolean
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          purpose: string
          used?: boolean
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          purpose?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      admin_messages: {
        Row: {
          id: string
          title: string
          message: string
          target: Database["public"]["Enums"]["message_target"]
          target_user_id: string | null
          auto_clear_seconds: number | null
          has_button: boolean
          button_text: string | null
          button_action: string | null
          sent_by: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          message: string
          target?: Database["public"]["Enums"]["message_target"]
          target_user_id?: string | null
          auto_clear_seconds?: number | null
          has_button?: boolean
          button_text?: string | null
          button_action?: string | null
          sent_by: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          message?: string
          target?: Database["public"]["Enums"]["message_target"]
          target_user_id?: string | null
          auto_clear_seconds?: number | null
          has_button?: boolean
          button_text?: string | null
          button_action?: string | null
          sent_by?: string
          created_at?: string
        }
        Relationships: []
      }
      bonuses: {
        Row: {
          id: string
          type: Database["public"]["Enums"]["bonus_type"]
          amount: number | null
          description: string
          message: string
          target: Database["public"]["Enums"]["message_target"]
          target_user_id: string | null
          expiry_days: number | null
          require_confirmation: boolean
          code: string | null
          sent_by: string
          created_at: string
          expires_at: string | null
          claimed: boolean
          claimed_at: string | null
          claimed_by: string | null
        }
        Insert: {
          id?: string
          type: Database["public"]["Enums"]["bonus_type"]
          amount?: number | null
          description: string
          message?: string
          target?: Database["public"]["Enums"]["message_target"]
          target_user_id?: string | null
          expiry_days?: number | null
          require_confirmation?: boolean
          code?: string | null
          sent_by: string
          created_at?: string
          expires_at?: string | null
          claimed?: boolean
          claimed_at?: string | null
          claimed_by?: string | null
        }
        Update: {
          id?: string
          type?: Database["public"]["Enums"]["bonus_type"]
          amount?: number | null
          description?: string
          message?: string
          target?: Database["public"]["Enums"]["message_target"]
          target_user_id?: string | null
          expiry_days?: number | null
          require_confirmation?: boolean
          code?: string | null
          sent_by?: string
          created_at?: string
          expires_at?: string | null
          claimed?: boolean
          claimed_at?: string | null
          claimed_by?: string | null
        }
        Relationships: []
      }
      fines: {
        Row: {
          id: string
          type: Database["public"]["Enums"]["fine_type"]
          amount: number
          reason: string
          target_user_id: string
          require_payment: boolean
          paid: boolean
          sent_by: string
          created_at: string
        }
        Insert: {
          id?: string
          type: Database["public"]["Enums"]["fine_type"]
          amount: number
          reason: string
          target_user_id: string
          require_payment?: boolean
          paid?: boolean
          sent_by: string
          created_at?: string
        }
        Update: {
          id?: string
          type?: Database["public"]["Enums"]["fine_type"]
          amount?: number
          reason?: string
          target_user_id?: string
          require_payment?: boolean
          paid?: boolean
          sent_by?: string
          created_at?: string
        }
        Relationships: []
      }
      approval_requests: {
        Row: {
          id: string
          purpose: string
          target_user_id: string
          input_type: Database["public"]["Enums"]["input_type"]
          user_input: string | null
          status: Database["public"]["Enums"]["approval_status"]
          admin_response: string | null
          sent_by: string
          created_at: string
          responded_at: string | null
        }
        Insert: {
          id?: string
          purpose: string
          target_user_id: string
          input_type: Database["public"]["Enums"]["input_type"]
          user_input?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          admin_response?: string | null
          sent_by: string
          created_at?: string
          responded_at?: string | null
        }
        Update: {
          id?: string
          purpose?: string
          target_user_id?: string
          input_type?: Database["public"]["Enums"]["input_type"]
          user_input?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          admin_response?: string | null
          sent_by?: string
          created_at?: string
          responded_at?: string | null
        }
        Relationships: []
      }
      withdrawal_details: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_name: string | null
          id: string
          method: Database["public"]["Enums"]["withdrawal_method"]
          network: string | null
          preferred_currency: string | null
          registered_at: string
          sort_code: string | null
          updated_at: string
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          id?: string
          method: Database["public"]["Enums"]["withdrawal_method"]
          network?: string | null
          preferred_currency?: string | null
          registered_at?: string
          sort_code?: string | null
          updated_at?: string
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          id?: string
          method?: Database["public"]["Enums"]["withdrawal_method"]
          network?: string | null
          preferred_currency?: string | null
          registered_at?: string
          sort_code?: string | null
          updated_at?: string
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      withdrawal_popups: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          created_at: string
          created_by: string | null
          id: string
          message: string
          required_fee: number | null
          title: string
          user_id: string
          withdrawal_request_id: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          required_fee?: number | null
          title: string
          user_id: string
          withdrawal_request_id: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          required_fee?: number | null
          title?: string
          user_id?: string
          withdrawal_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_popups_withdrawal_request_id_fkey"
            columns: ["withdrawal_request_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          currency: string
          fee: number
          id: string
          net_amount: number
          payment_method_id: string | null
          region: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          user_id: string
          withdrawal_details_snapshot: Json
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          currency?: string
          fee: number
          id?: string
          net_amount: number
          payment_method_id?: string | null
          region?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          user_id: string
          withdrawal_details_snapshot: Json
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          currency?: string
          fee?: number
          id?: string
          net_amount?: number
          payment_method_id?: string | null
          region?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          user_id?: string
          withdrawal_details_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Enums: {
      app_role: "admin" | "user"
      investment_status: "Active" | "Matured" | "Cancelled"
      request_status: "Pending" | "Approved" | "Rejected" | "Completed"
      transaction_status: "Pending" | "Completed" | "Failed" | "Rejected"
      transaction_type: "Deposit" | "Withdrawal" | "Investment" | "ROI Payout"
      withdrawal_method: "bank" | "crypto"
      message_target: "all" | "specific"
      bonus_type: "coupon" | "gift" | "token" | "bonus"
      fine_type: "fine" | "fee"
      approval_status: "pending" | "approved" | "rejected"
      input_type: "code" | "token" | "key"
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
      app_role: ["admin", "user"],
      investment_status: ["Active", "Matured", "Cancelled"],
      request_status: ["Pending", "Approved", "Rejected", "Completed"],
      transaction_status: ["Pending", "Completed", "Failed", "Rejected"],
      transaction_type: ["Deposit", "Withdrawal", "Investment", "ROI Payout"],
      withdrawal_method: ["bank", "crypto"],
    },
  },
} as const

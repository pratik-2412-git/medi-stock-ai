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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_read: boolean
          medicine_id: string | null
          message: string | null
          pharmacy_id: string
          severity: string
          title: string
        }
        Insert: {
          alert_type?: string
          created_at?: string
          id?: string
          is_read?: boolean
          medicine_id?: string | null
          message?: string | null
          pharmacy_id: string
          severity?: string
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_read?: boolean
          medicine_id?: string | null
          message?: string | null
          pharmacy_id?: string
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      medicines: {
        Row: {
          category: string | null
          composition: string | null
          created_at: string
          dosage: string | null
          id: string
          manufacturer: string | null
          name: string
        }
        Insert: {
          category?: string | null
          composition?: string | null
          created_at?: string
          dosage?: string | null
          id?: string
          manufacturer?: string | null
          name: string
        }
        Update: {
          category?: string | null
          composition?: string | null
          created_at?: string
          dosage?: string | null
          id?: string
          manufacturer?: string | null
          name?: string
        }
        Relationships: []
      }
      pharmacies: {
        Row: {
          address: string | null
          city: string | null
          closing_time: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          opening_time: string | null
          owner_name: string | null
          pharmacy_type: string | null
          phone: string | null
          pincode: string | null
          state: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          closing_time?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          opening_time?: string | null
          owner_name?: string | null
          pharmacy_type?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          closing_time?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          opening_time?: string | null
          owner_name?: string | null
          pharmacy_type?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
        }
        Relationships: []
      }
      predictions: {
        Row: {
          id: string
          medicine_id: string
          message: string | null
          pharmacy_id: string
          predicted_days: number | null
          prediction_date: string
          probability: number | null
          shortage_class: string
        }
        Insert: {
          id?: string
          medicine_id: string
          message?: string | null
          pharmacy_id: string
          predicted_days?: number | null
          prediction_date?: string
          probability?: number | null
          shortage_class?: string
        }
        Update: {
          id?: string
          medicine_id?: string
          message?: string | null
          pharmacy_id?: string
          predicted_days?: number | null
          prediction_date?: string
          probability?: number | null
          shortage_class?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          pharmacy_id: string | null
          phone: string | null
          role: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          pharmacy_id?: string | null
          phone?: string | null
          role?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          pharmacy_id?: string | null
          phone?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          id: string
          medicine_id: string
          pharmacy_id: string
          quantity_sold: number
          sale_date: string
        }
        Insert: {
          id?: string
          medicine_id: string
          pharmacy_id: string
          quantity_sold?: number
          sale_date?: string
        }
        Update: {
          id?: string
          medicine_id?: string
          pharmacy_id?: string
          quantity_sold?: number
          sale_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock: {
        Row: {
          id: string
          medicine_id: string
          pharmacy_id: string
          quantity: number
          reorder_level: number
          updated_at: string
        }
        Insert: {
          id?: string
          medicine_id: string
          pharmacy_id: string
          quantity?: number
          reorder_level?: number
          updated_at?: string
        }
        Update: {
          id?: string
          medicine_id?: string
          pharmacy_id?: string
          quantity?: number
          reorder_level?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      owns_pharmacy: { Args: { _pharmacy_id: string }; Returns: boolean }
      record_sale: {
        Args: { p_pharmacy_id: string; p_medicine_id: string; p_quantity: number }
        Returns: {
          id: string
          medicine_id: string
          pharmacy_id: string
          quantity_sold: number
          sale_date: string
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
    Enums: {},
  },
} as const
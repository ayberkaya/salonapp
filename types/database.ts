export type Database = {
  public: {
    Tables: {
      salons: {
        Row: {
          id: string
          name: string
          working_days: string[] | null
          opening_time: string | null
          closing_time: string | null
          loyalty_bronze_discount: number | null
          loyalty_silver_discount: number | null
          loyalty_gold_discount: number | null
          loyalty_platinum_discount: number | null
          loyalty_vip_discount: number | null
          loyalty_silver_min_visits: number | null
          loyalty_gold_min_visits: number | null
          loyalty_platinum_min_visits: number | null
          loyalty_vip_min_visits: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          working_days?: string[] | null
          opening_time?: string | null
          closing_time?: string | null
          loyalty_bronze_discount?: number | null
          loyalty_silver_discount?: number | null
          loyalty_gold_discount?: number | null
          loyalty_platinum_discount?: number | null
          loyalty_vip_discount?: number | null
          loyalty_silver_min_visits?: number | null
          loyalty_gold_min_visits?: number | null
          loyalty_platinum_min_visits?: number | null
          loyalty_vip_min_visits?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          working_days?: string[] | null
          opening_time?: string | null
          closing_time?: string | null
          loyalty_bronze_discount?: number | null
          loyalty_silver_discount?: number | null
          loyalty_gold_discount?: number | null
          loyalty_platinum_discount?: number | null
          loyalty_vip_discount?: number | null
          loyalty_silver_min_visits?: number | null
          loyalty_gold_min_visits?: number | null
          loyalty_platinum_min_visits?: number | null
          loyalty_vip_min_visits?: number | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          salon_id: string
          full_name: string
          role: 'OWNER' | 'STAFF'
          created_at: string
        }
        Insert: {
          id: string
          salon_id: string
          full_name: string
          role: 'OWNER' | 'STAFF'
          created_at?: string
        }
        Update: {
          id?: string
          salon_id?: string
          full_name?: string
          role?: 'OWNER' | 'STAFF'
          created_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          salon_id: string
          full_name: string
          phone: string
          province: string | null
          district: string | null
          birth_day: number | null
          birth_month: number | null
          hair_color: string | null
          notes: string | null
          kvkk_consent_at: string | null
          created_at: string
          last_visit_at: string | null
          has_welcome_discount: boolean | null
          welcome_discount_used_at: string | null
        }
        Insert: {
          id?: string
          salon_id: string
          full_name: string
          phone: string
          province?: string | null
          district?: string | null
          birth_day?: number | null
          birth_month?: number | null
          hair_color?: string | null
          notes?: string | null
          kvkk_consent_at?: string | null
          created_at?: string
          last_visit_at?: string | null
          has_welcome_discount?: boolean | null
          welcome_discount_used_at?: string | null
        }
        Update: {
          id?: string
          salon_id?: string
          full_name?: string
          phone?: string
          province?: string | null
          district?: string | null
          birth_day?: number | null
          birth_month?: number | null
          hair_color?: string | null
          notes?: string | null
          kvkk_consent_at?: string | null
          created_at?: string
          last_visit_at?: string | null
          has_welcome_discount?: boolean | null
          welcome_discount_used_at?: string | null
        }
      }
      visits: {
        Row: {
          id: string
          salon_id: string
          customer_id: string
          created_by: string
          visited_at: string
        }
        Insert: {
          id?: string
          salon_id: string
          customer_id: string
          created_by: string
          visited_at?: string
        }
        Update: {
          id?: string
          salon_id?: string
          customer_id?: string
          created_by?: string
          visited_at?: string
        }
      }
      visit_tokens: {
        Row: {
          id: string
          salon_id: string
          customer_id: string
          created_by: string
          token: string
          expires_at: string
          used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          salon_id: string
          customer_id: string
          created_by: string
          token: string
          expires_at: string
          used_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          salon_id?: string
          customer_id?: string
          created_by?: string
          token?: string
          expires_at?: string
          used_at?: string | null
          created_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          salon_id: string
          customer_id: string
          staff_id: string | null
          service_id: string | null
          appointment_date: string
          duration_minutes: number
          status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          salon_id: string
          customer_id: string
          staff_id?: string | null
          service_id?: string | null
          appointment_date: string
          duration_minutes?: number
          status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
          notes?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          salon_id?: string
          customer_id?: string
          staff_id?: string | null
          service_id?: string | null
          appointment_date?: string
          duration_minutes?: number
          status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
          notes?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}


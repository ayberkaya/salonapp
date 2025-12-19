export type Database = {
  public: {
    Tables: {
      salons: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
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
          kvkk_consent_at: string | null
          created_at: string
          last_visit_at: string | null
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
          kvkk_consent_at?: string | null
          created_at?: string
          last_visit_at?: string | null
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
          kvkk_consent_at?: string | null
          created_at?: string
          last_visit_at?: string | null
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
    }
  }
}


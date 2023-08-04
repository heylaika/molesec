export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  public: {
    Tables: {
      _prisma_migrations: {
        Row: {
          applied_steps_count: number
          checksum: string
          finished_at: string | null
          id: string
          logs: string | null
          migration_name: string
          rolled_back_at: string | null
          started_at: string
        }
        Insert: {
          applied_steps_count?: number
          checksum: string
          finished_at?: string | null
          id: string
          logs?: string | null
          migration_name: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Update: {
          applied_steps_count?: number
          checksum?: string
          finished_at?: string | null
          id?: string
          logs?: string | null
          migration_name?: string
          rolled_back_at?: string | null
          started_at?: string
        }
      }
      Campaign: {
        Row: {
          attacks: Json
          created_at: string
          creator_user_id: string
          duration_days: number
          id: string
          name: string
          objective: Json
          start_date: string
          team_id: string
        }
        Insert: {
          attacks: Json
          created_at?: string
          creator_user_id: string
          duration_days: number
          id?: string
          name: string
          objective: Json
          start_date?: string
          team_id: string
        }
        Update: {
          attacks?: Json
          created_at?: string
          creator_user_id?: string
          duration_days?: number
          id?: string
          name?: string
          objective?: Json
          start_date?: string
          team_id?: string
        }
      }
      CampaignActivity: {
        Row: {
          activity_type: string
          attack_id: string | null
          attack_log_id: string | null
          campaign_id: string
          id: string
          payload: Json
          performed_at: string
          team_id: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          attack_id?: string | null
          attack_log_id?: string | null
          campaign_id: string
          id?: string
          payload: Json
          performed_at?: string
          team_id: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          attack_id?: string | null
          attack_log_id?: string | null
          campaign_id?: string
          id?: string
          payload?: Json
          performed_at?: string
          team_id?: string
          user_id?: string | null
        }
      }
      Domain: {
        Row: {
          email_provider: string
          id: string
          is_delegated: boolean
          is_verified: boolean
          name: string
          team_id: string
        }
        Insert: {
          email_provider?: string
          id?: string
          is_delegated?: boolean
          is_verified?: boolean
          name: string
          team_id: string
        }
        Update: {
          email_provider?: string
          id?: string
          is_delegated?: boolean
          is_verified?: boolean
          name?: string
          team_id?: string
        }
      }
      ProductInvite: {
        Row: {
          email: string
          invited_at: string
          inviter_email: string
        }
        Insert: {
          email: string
          invited_at?: string
          inviter_email: string
        }
        Update: {
          email?: string
          invited_at?: string
          inviter_email?: string
        }
      }
      Team: {
        Row: {
          email_provider: string
          id: string
          name: string
          org_id: string
          org_name: string
          org_urls: string[] | null
          owner_user_id: string
        }
        Insert: {
          email_provider?: string
          id?: string
          name: string
          org_id?: string
          org_name: string
          org_urls?: string[] | null
          owner_user_id: string
        }
        Update: {
          email_provider?: string
          id?: string
          name?: string
          org_id?: string
          org_name?: string
          org_urls?: string[] | null
          owner_user_id?: string
        }
      }
      TeamInvite: {
        Row: {
          email: string
          invited_at: string
          inviter_email: string
          team_id: string
        }
        Insert: {
          email: string
          invited_at?: string
          inviter_email: string
          team_id: string
        }
        Update: {
          email?: string
          invited_at?: string
          inviter_email?: string
          team_id?: string
        }
      }
      TeamMembership: {
        Row: {
          email: string
          joined_at: string
          team_id: string
          user_id: string
        }
        Insert: {
          email: string
          joined_at?: string
          team_id: string
          user_id: string
        }
        Update: {
          email?: string
          joined_at?: string
          team_id?: string
          user_id?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      team_has_member: {
        Args: {
          team_id: string
          sub: string
        }
        Returns: boolean
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

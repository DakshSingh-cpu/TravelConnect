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
      users: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          account_role: 'traveller' | 'advisor' | 'admin'
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          account_role?: 'traveller' | 'advisor' | 'admin'
          updated_at?: string
        }
        Update: {
          full_name?: string | null
          avatar_url?: string | null
          account_role?: 'traveller' | 'advisor' | 'admin'
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          match_session_id: string | null
          lead_assignment_id: string | null
          status: 'active' | 'archived' | 'completed'
          first_advisor_message_at: string | null
          traveller_replied_after_advisor: boolean | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          match_session_id?: string | null
          lead_assignment_id?: string | null
          status?: 'active' | 'archived' | 'completed'
          first_advisor_message_at?: string | null
          traveller_replied_after_advisor?: boolean | null
        }
        Update: {
          updated_at?: string
          match_session_id?: string | null
          lead_assignment_id?: string | null
          status?: 'active' | 'archived' | 'completed'
          first_advisor_message_at?: string | null
          traveller_replied_after_advisor?: boolean | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          id: string
          user_id: string
          expo_push_token: string
          platform: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          expo_push_token: string
          platform?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          expo_push_token?: string
          platform?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      match_sessions: {
        Row: {
          id: string
          created_at: string
          destination: string | null
          budget_lakh: number | null
          travel_style: string | null
          vibe: string | null
          pace: string | null
          timing: string | null
          duration: string | null
          advisor_ids: number[] | null
          readiness_score: number | null
          readiness_tier: string | null
          low_intent_signals: string[] | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          utm_content: string | null
          fbclid: string | null
          landed_at: string | null
          lead_status: 'pending' | 'accepted' | 'blocked' | 'exhausted' | null
          residential_zip: string | null
        }
        Insert: {
          id?: string
          destination?: string | null
          budget_lakh?: number | null
          travel_style?: string | null
          vibe?: string | null
          pace?: string | null
          timing?: string | null
          duration?: string | null
          advisor_ids?: number[] | null
          readiness_score?: number | null
          readiness_tier?: string | null
          low_intent_signals?: string[] | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          fbclid?: string | null
          landed_at?: string | null
          lead_status?: 'pending' | 'accepted' | 'exhausted' | null
        }
        Update: {
          lead_status?: 'pending' | 'accepted' | 'exhausted' | null
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          text: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          text: string
          created_at?: string
        }
        Update: {
          text?: string
        }
        Relationships: []
      }
      advisor_user_links: {
        Row: {
          advisor_route_id: string
          user_id: string
          custom_bio: string | null
          custom_video_url: string | null
        }
        Insert: {
          advisor_route_id: string
          user_id: string
          custom_bio?: string | null
          custom_video_url?: string | null
        }
        Update: {
          user_id?: string
          custom_bio?: string | null
          custom_video_url?: string | null
        }
        Relationships: []
      }
      lead_assignments: {
        Row: {
          id: string
          match_session_id: string
          traveller_user_id: string
          advisor_user_id: string
          advisor_route_id: string
          rank: number
          status: 'vetting' | 'approved' | 'blocked' | 'dismissed' | 'superseded' | 'pending' | 'accepted' | 'rejected' | 'expired'
          conversation_id: string | null
          created_at: string
          responded_at: string | null
          expires_at: string
          vetting_score: number | null
          vetting_result: Json | null
          seon_transaction_id: string | null
          email_sent_at: string | null
          chat_unlocked_at: string | null
          approved_at: string | null
          vetting_attempts: number
        }
        Insert: {
          id?: string
          match_session_id: string
          traveller_user_id: string
          advisor_user_id: string
          advisor_route_id: string
          rank: number
          status?: 'vetting' | 'approved' | 'blocked' | 'dismissed' | 'superseded' | 'pending' | 'accepted' | 'rejected' | 'expired'
          conversation_id?: string | null
          created_at?: string
          responded_at?: string | null
          expires_at?: string
          vetting_score?: number | null
          vetting_result?: Json | null
          seon_transaction_id?: string | null
          email_sent_at?: string | null
          chat_unlocked_at?: string | null
          approved_at?: string | null
          vetting_attempts?: number
        }
        Update: {
          status?: 'vetting' | 'approved' | 'blocked' | 'dismissed' | 'superseded' | 'pending' | 'accepted' | 'rejected' | 'expired'
          conversation_id?: string | null
          responded_at?: string | null
          vetting_score?: number | null
          vetting_result?: Json | null
          seon_transaction_id?: string | null
          email_sent_at?: string | null
          chat_unlocked_at?: string | null
          approved_at?: string | null
          vetting_attempts?: number
        }
        Relationships: [
          {
            foreignKeyName: 'lead_assignments_match_session_id_fkey'
            columns: ['match_session_id']
            isOneToOne: false
            referencedRelation: 'match_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lead_assignments_traveller_user_id_fkey'
            columns: ['traveller_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lead_assignments_advisor_user_id_fkey'
            columns: ['advisor_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      session_telemetry: {
        Row: {
          id: string
          match_session_id: string | null
          traveller_user_id: string | null
          payload: Json
          created_at: string
        }
        Insert: {
          id?: string
          match_session_id?: string | null
          traveller_user_id?: string | null
          payload: Json
          created_at?: string
        }
        Update: {
          match_session_id?: string | null
          traveller_user_id?: string | null
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'session_telemetry_match_session_id_fkey'
            columns: ['match_session_id']
            isOneToOne: false
            referencedRelation: 'match_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'session_telemetry_traveller_user_id_fkey'
            columns: ['traveller_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      seon_cache: {
        Row: {
          traveller_user_id: string
          result: Json
          expires_at: string
        }
        Insert: {
          traveller_user_id: string
          result: Json
          expires_at: string
        }
        Update: {
          result?: Json
          expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'seon_cache_traveller_user_id_fkey'
            columns: ['traveller_user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      advisor_preferences: {
        Row: {
          user_id: string
          min_readiness_score: number
          min_budget_lakh: number
          accept_nurture_leads: boolean
          active_destinations: string[]
          updated_at: string
        }
        Insert: {
          user_id: string
          min_readiness_score?: number
          min_budget_lakh?: number
          accept_nurture_leads?: boolean
          active_destinations?: string[]
          updated_at?: string
        }
        Update: {
          min_readiness_score?: number
          min_budget_lakh?: number
          accept_nurture_leads?: boolean
          active_destinations?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'advisor_preferences_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      conversation_briefs: {
        Row: {
          conversation_id: string
          brief: Json
          created_at: string
        }
        Insert: {
          conversation_id: string
          brief: Json
          created_at?: string
        }
        Update: {
          brief?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'conversation_briefs_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: true
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      ensure_my_profile: {
        Args: Record<string, never>
        Returns: undefined
      }
      get_conversation_for_match_session: {
        Args: { p_match_session_id: string }
        Returns: string
      }
      get_my_agency_id: {
        Args: Record<string, never>
        Returns: number
      }
      get_or_create_direct_conversation: {
        Args: { peer_user_id: string }
        Returns: string
      }
      is_conversation_participant: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      link_conversation_to_match_session: {
        Args: { p_conversation_id: string; p_match_session_id: string }
        Returns: undefined
      }
      set_my_account_role: {
        Args: { p_role: 'traveller' | 'advisor' }
        Returns: string
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

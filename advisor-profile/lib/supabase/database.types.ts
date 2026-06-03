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
          account_role: 'traveller' | 'advisor'
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          account_role?: 'traveller' | 'advisor'
          updated_at?: string
        }
        Update: {
          full_name?: string | null
          avatar_url?: string | null
          account_role?: 'traveller' | 'advisor'
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          updated_at?: string
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
      get_or_create_direct_conversation: {
        Args: { peer_user_id: string }
        Returns: string
      }
      is_conversation_participant: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      set_my_account_role: {
        Args: { p_role: 'traveller' | 'advisor' }
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

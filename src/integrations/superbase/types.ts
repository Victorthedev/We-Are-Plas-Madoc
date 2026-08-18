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
      activity_log: {
        Row: {
          action_type: string
          content_id: string | null
          content_title: string | null
          content_type: string
          created_at: string
          id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action_type: string
          content_id?: string | null
          content_title?: string | null
          content_type: string
          created_at?: string
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action_type?: string
          content_id?: string | null
          content_title?: string | null
          content_type?: string
          created_at?: string
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      event_rsvps: {
        Row: {
          cancellation_token: string
          created_at: string
          email: string
          event_id: string
          first_name: string
          id: string
          last_name: string
          party_size: number
          phone: string | null
          reminder_sent: boolean
        }
        Insert: {
          cancellation_token?: string
          created_at?: string
          email: string
          event_id: string
          first_name: string
          id?: string
          last_name?: string
          party_size?: number
          phone?: string | null
          reminder_sent?: boolean
        }
        Update: {
          cancellation_token?: string
          created_at?: string
          email?: string
          event_id?: string
          first_name?: string
          id?: string
          last_name?: string
          party_size?: number
          phone?: string | null
          reminder_sent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          end_datetime: string | null
          event_type: string | null
          external_link: string | null
          id: string
          is_free: boolean | null
          location: string | null
          poster_image_url: string | null
          recurrence_parent_id: string | null
          recurrence_rule: string | null
          recurrence_until: string | null
          start_datetime: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_datetime?: string | null
          event_type?: string | null
          external_link?: string | null
          id?: string
          is_free?: boolean | null
          location?: string | null
          poster_image_url?: string | null
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          recurrence_until?: string | null
          start_datetime: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_datetime?: string | null
          event_type?: string | null
          external_link?: string | null
          id?: string
          is_free?: boolean | null
          location?: string | null
          poster_image_url?: string | null
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          recurrence_until?: string | null
          start_datetime?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          caption: string | null
          category: string | null
          created_at: string
          display_order: number | null
          id: string
          image_url: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          category?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          image_url: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          category?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          read: boolean | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          read?: boolean | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          read?: boolean | null
          subject?: string | null
        }
        Relationships: []
      }
      news_posts: {
        Row: {
          author_id: string | null
          category: string | null
          content: string | null
          created_at: string
          excerpt: string | null
          featured: boolean | null
          featured_image_url: string | null
          id: string
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean | null
          featured_image_url?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean | null
          featured_image_url?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          last_sign_in: string | null
          notification_preferences: Json | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          last_sign_in?: string | null
          notification_preferences?: Json | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_sign_in?: string | null
          notification_preferences?: Json | null
        }
        Relationships: []
      }
      services: {
        Row: {
          contact_info: string | null
          content: string | null
          description: string | null
          display_order: number | null
          how_to_access: string | null
          icon: string | null
          id: string
          image_url: string | null
          name: string
          opening_hours: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          contact_info?: string | null
          content?: string | null
          description?: string | null
          display_order?: number | null
          how_to_access?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name: string
          opening_hours?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          contact_info?: string | null
          content?: string | null
          description?: string | null
          display_order?: number | null
          how_to_access?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string
          opening_hours?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          bio: string | null
          display_order: number | null
          id: string
          is_trustee: boolean | null
          name: string
          photo_url: string | null
          role: string
          social_link: string | null
        }
        Insert: {
          bio?: string | null
          display_order?: number | null
          id?: string
          is_trustee?: boolean | null
          name: string
          photo_url?: string | null
          role: string
          social_link?: string | null
        }
        Update: {
          bio?: string | null
          display_order?: number | null
          id?: string
          is_trustee?: boolean | null
          name?: string
          photo_url?: string | null
          role?: string
          social_link?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      volunteer_positions: {
        Row: {
          commitment: string
          created_at: string | null
          display_order: number
          id: string
          involved: string
          is_active: boolean
          requirements: string
          title: string
          updated_at: string | null
        }
        Insert: {
          commitment: string
          created_at?: string | null
          display_order?: number
          id?: string
          involved?: string
          is_active?: boolean
          requirements?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          commitment?: string
          created_at?: string | null
          display_order?: number
          id?: string
          involved?: string
          is_active?: boolean
          requirements?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      volunteers: {
        Row: {
          child_id: string | null
          created_at: string
          cv_link: string | null
          dbs_checked_status: string
          dbs_number: string | null
          email: string
          first_name: string
          id: string
          internal_notes: string | null
          last_name: string
          message: string | null
          phone: string
          position: string
          start_date: string | null
          status: string
          volunteer_type: string | null
        }
        Insert: {
          child_id?: string | null
          created_at?: string
          cv_link?: string | null
          dbs_checked_status?: string
          dbs_number?: string | null
          email: string
          first_name: string
          id?: string
          internal_notes?: string | null
          last_name: string
          message?: string | null
          phone: string
          position: string
          start_date?: string | null
          status?: string
          volunteer_type?: string | null
        }
        Update: {
          child_id?: string | null
          created_at?: string
          cv_link?: string | null
          dbs_checked_status?: string
          dbs_number?: string | null
          email?: string
          first_name?: string
          id?: string
          internal_notes?: string | null
          last_name?: string
          message?: string | null
          phone?: string
          position?: string
          start_date?: string | null
          status?: string
          volunteer_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "volunteers_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          action_taken: string | null
          child_id: string | null
          created_at: string
          description: string
          follow_up_notes: string | null
          follow_up_required: boolean
          id: string
          incident_type: string
          occurred_at: string | null
          occurred_on: string
          parent_id: string | null
          parent_notified: boolean
          person_name: string
          person_type: string
          playground: string | null
          reported_by: string
          volunteer_id: string | null
        }
        Insert: {
          action_taken?: string | null
          child_id?: string | null
          created_at?: string
          description: string
          follow_up_notes?: string | null
          follow_up_required?: boolean
          id?: string
          incident_type: string
          occurred_at?: string | null
          occurred_on?: string
          parent_id?: string | null
          parent_notified?: boolean
          person_name: string
          person_type: string
          playground?: string | null
          reported_by: string
          volunteer_id?: string | null
        }
        Update: {
          action_taken?: string | null
          child_id?: string | null
          created_at?: string
          description?: string
          follow_up_notes?: string | null
          follow_up_required?: boolean
          id?: string
          incident_type?: string
          occurred_at?: string | null
          occurred_on?: string
          parent_id?: string | null
          parent_notified?: boolean
          person_name?: string
          person_type?: string
          playground?: string | null
          reported_by?: string
          volunteer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      adult_visitors: {
        Row: {
          created_at: string
          id: string
          logged_by: string
          name: string
          playground: string | null
          reason: string
          time_from: string | null
          time_to: string | null
          visit_date: string
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logged_by: string
          name: string
          playground?: string | null
          reason: string
          time_from?: string | null
          time_to?: string | null
          visit_date?: string
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logged_by?: string
          name?: string
          playground?: string | null
          reason?: string
          time_from?: string | null
          time_to?: string | null
          visit_date?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adult_visitors_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "external_visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      external_visitors: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          organisation: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          organisation?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          organisation?: string | null
        }
        Relationships: []
      }
      vms_daily_quotes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          quote_date: string
          quote_text: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          quote_date: string
          quote_text: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          quote_date?: string
          quote_text?: string
        }
        Relationships: []
      }
      children: {
        Row: {
          additional_learning_needs: string | null
          allergies: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          archived_reason: string | null
          created_at: string
          date_of_birth: string
          ethnicity: string | null
          first_name: string
          id: string
          internal_notes: string | null
          last_name: string
          medical_conditions: string | null
          photo_url: string | null
          playground: string
          registration_source: string
          updated_at: string
        }
        Insert: {
          additional_learning_needs?: string | null
          allergies?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          archived_reason?: string | null
          created_at?: string
          date_of_birth: string
          ethnicity?: string | null
          first_name: string
          id?: string
          internal_notes?: string | null
          last_name: string
          medical_conditions?: string | null
          photo_url?: string | null
          playground: string
          registration_source?: string
          updated_at?: string
        }
        Update: {
          additional_learning_needs?: string | null
          allergies?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          archived_reason?: string | null
          created_at?: string
          date_of_birth?: string
          ethnicity?: string | null
          first_name?: string
          id?: string
          internal_notes?: string | null
          last_name?: string
          medical_conditions?: string | null
          photo_url?: string | null
          playground?: string
          registration_source?: string
          updated_at?: string
        }
        Relationships: []
      }
      parents: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          cultural_background: string | null
          date_of_birth: string | null
          first_name: string
          id: string
          language: string | null
          last_name: string
          phone: string
          playground: string | null
          religion: string | null
          updated_at: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          cultural_background?: string | null
          date_of_birth?: string | null
          first_name: string
          id?: string
          language?: string | null
          last_name: string
          phone: string
          playground?: string | null
          religion?: string | null
          updated_at?: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          cultural_background?: string | null
          date_of_birth?: string | null
          first_name?: string
          id?: string
          language?: string | null
          last_name?: string
          phone?: string
          playground?: string | null
          religion?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      child_parent_links: {
        Row: {
          child_id: string
          created_at: string
          id: string
          is_primary_contact: boolean
          parent_id: string
          relationship: string | null
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          is_primary_contact?: boolean
          parent_id: string
          relationship?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          is_primary_contact?: boolean
          parent_id?: string
          relationship?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "child_parent_links_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_parent_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          activity_notes: string | null
          attended_on: string
          check_in_time: string | null
          check_out_time: string | null
          child_id: string | null
          created_at: string
          id: string
          parent_id: string | null
          playground: string | null
          recorded_by: string
          service: string
          volunteer_id: string | null
        }
        Insert: {
          activity_notes?: string | null
          attended_on?: string
          check_in_time?: string | null
          check_out_time?: string | null
          child_id?: string | null
          created_at?: string
          id?: string
          parent_id?: string | null
          playground?: string | null
          recorded_by: string
          service?: string
          volunteer_id?: string | null
        }
        Update: {
          activity_notes?: string | null
          attended_on?: string
          check_in_time?: string | null
          check_out_time?: string | null
          child_id?: string | null
          created_at?: string
          id?: string
          parent_id?: string | null
          playground?: string | null
          recorded_by?: string
          service?: string
          volunteer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      vms_activity_log: {
        Row: {
          action_type: string
          content_id: string | null
          content_type: string
          created_at: string
          id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action_type: string
          content_id?: string | null
          content_type: string
          created_at?: string
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action_type?: string
          content_id?: string | null
          content_type?: string
          created_at?: string
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          child_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          notification_type: string
          parent_id: string | null
          person_type: string | null
          volunteer_id: string | null
        }
        Insert: {
          child_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          notification_type: string
          parent_id?: string | null
          person_type?: string | null
          volunteer_id?: string | null
        }
        Update: {
          child_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: string
          parent_id?: string | null
          person_type?: string | null
          volunteer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
          section: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label: string
          section: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          section?: string
          sort_order?: number
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          closing_notes: string | null
          created_at: string
          created_by: string | null
          id: string
          log_date: string
          opening_notes: string | null
          playground: string
          quote_snapshot: string | null
          reflection_notes: string | null
          session_time_from: string | null
          session_time_to: string | null
          staff_team: string | null
          term_type: string | null
          updated_at: string
          weather_snapshot: string | null
        }
        Insert: {
          closing_notes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          log_date: string
          opening_notes?: string | null
          playground: string
          quote_snapshot?: string | null
          reflection_notes?: string | null
          session_time_from?: string | null
          session_time_to?: string | null
          staff_team?: string | null
          term_type?: string | null
          updated_at?: string
          weather_snapshot?: string | null
        }
        Update: {
          closing_notes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          log_date?: string
          opening_notes?: string | null
          playground?: string
          quote_snapshot?: string | null
          reflection_notes?: string | null
          session_time_from?: string | null
          session_time_to?: string | null
          staff_team?: string | null
          term_type?: string | null
          updated_at?: string
          weather_snapshot?: string | null
        }
        Relationships: []
      }
      daily_log_checks: {
        Row: {
          checked: boolean
          checked_by: string | null
          checklist_item_id: string
          comment: string | null
          daily_log_id: string
          id: string
          initials: string | null
        }
        Insert: {
          checked?: boolean
          checked_by?: string | null
          checklist_item_id: string
          comment?: string | null
          daily_log_id: string
          id?: string
          initials?: string | null
        }
        Update: {
          checked?: boolean
          checked_by?: string | null
          checklist_item_id?: string
          comment?: string | null
          daily_log_id?: string
          id?: string
          initials?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_log_checks_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_log_checks_daily_log_id_fkey"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      vms_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          daily_log_check_id: string | null
          description: string | null
          id: string
          last_reminded_at: string | null
          playground: string | null
          resolved_at: string | null
          resolved_notes: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          daily_log_check_id?: string | null
          description?: string | null
          id?: string
          last_reminded_at?: string | null
          playground?: string | null
          resolved_at?: string | null
          resolved_notes?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          daily_log_check_id?: string | null
          description?: string | null
          id?: string
          last_reminded_at?: string | null
          playground?: string | null
          resolved_at?: string | null
          resolved_notes?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vms_tasks_daily_log_check_id_fkey"
            columns: ["daily_log_check_id"]
            isOneToOne: false
            referencedRelation: "daily_log_checks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: { role: Database["public"]["Enums"]["app_role"] }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "editor" | "contributor" | "gallery_only" | "playground_worker"
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
      app_role: ["super_admin", "editor", "contributor", "gallery_only", "playground_worker"],
    },
  },
} as const

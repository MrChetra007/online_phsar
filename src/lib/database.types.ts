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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name_en: string
          name_km: string
          parent_id: string | null
          requires_size: boolean
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_en: string
          name_km: string
          parent_id?: string | null
          requires_size?: boolean
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_en?: string
          name_km?: string
          parent_id?: string | null
          requires_size?: boolean
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          affects_balance: boolean
          amount: number
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          order_id: string | null
          store_id: string
          type: Database["public"]["Enums"]["ledger_type"]
        }
        Insert: {
          affects_balance?: boolean
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id?: string | null
          store_id: string
          type: Database["public"]["Enums"]["ledger_type"]
        }
        Update: {
          affects_balance?: boolean
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id?: string | null
          store_id?: string
          type?: Database["public"]["Enums"]["ledger_type"]
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          event: string
          id: string
          last_error: string | null
          order_id: string | null
          payload: Json
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          store_id: string | null
          target: string
        }
        Insert: {
          attempts?: number
          channel?: string
          created_at?: string
          event: string
          id?: string
          last_error?: string | null
          order_id?: string | null
          payload?: Json
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          store_id?: string | null
          target: string
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          event?: string
          id?: string
          last_error?: string | null
          order_id?: string | null
          payload?: Json
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          store_id?: string | null
          target?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          name_snapshot: string
          order_id: string
          quantity: number
          unit_price: number
          variant_id: string | null
          variant_label_snapshot: string | null
        }
        Insert: {
          id?: string
          name_snapshot: string
          order_id: string
          quantity: number
          unit_price: number
          variant_id?: string | null
          variant_label_snapshot?: string | null
        }
        Update: {
          id?: string
          name_snapshot?: string
          order_id?: string
          quantity?: number
          unit_price?: number
          variant_id?: string | null
          variant_label_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["order_status"]
          note: string | null
          old_status: Database["public"]["Enums"]["order_status"] | null
          order_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["order_status"]
          note?: string | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["order_status"]
          note?: string | null
          old_status?: Database["public"]["Enums"]["order_status"] | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string
          commission_amount: number
          commission_percent: number
          completed_at: string | null
          confirmed_at: string | null
          courier_name: string | null
          created_at: string
          customer_confirmed_at: string | null
          customer_name: string
          customer_phone: string
          customer_phone_norm: string | null
          delivered_at: string | null
          delivery_fee: number
          has_open_dispute: boolean
          id: string
          order_code: string
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          problem_note: string | null
          problem_reported_at: string | null
          province: string
          qr_expires_at: string | null
          qr_string: string | null
          shipped_at: string | null
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          stock_released: boolean
          store_id: string
          store_payout_amount: number
          subtotal: number
          total_amount: number | null
          tracking_note: string | null
          updated_at: string
        }
        Insert: {
          address: string
          commission_amount?: number
          commission_percent: number
          completed_at?: string | null
          confirmed_at?: string | null
          courier_name?: string | null
          created_at?: string
          customer_confirmed_at?: string | null
          customer_name: string
          customer_phone: string
          customer_phone_norm?: string | null
          delivered_at?: string | null
          delivery_fee?: number
          has_open_dispute?: boolean
          id?: string
          order_code?: string
          paid_at?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          problem_note?: string | null
          problem_reported_at?: string | null
          province: string
          qr_expires_at?: string | null
          qr_string?: string | null
          shipped_at?: string | null
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          stock_released?: boolean
          store_id: string
          store_payout_amount?: number
          subtotal?: number
          total_amount?: number | null
          tracking_note?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          commission_amount?: number
          commission_percent?: number
          completed_at?: string | null
          confirmed_at?: string | null
          courier_name?: string | null
          created_at?: string
          customer_confirmed_at?: string | null
          customer_name?: string
          customer_phone?: string
          customer_phone_norm?: string | null
          delivered_at?: string | null
          delivery_fee?: number
          has_open_dispute?: boolean
          id?: string
          order_code?: string
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          problem_note?: string | null
          problem_reported_at?: string | null
          province?: string
          qr_expires_at?: string | null
          qr_string?: string | null
          shipped_at?: string | null
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          stock_released?: boolean
          store_id?: string
          store_payout_amount?: number
          subtotal?: number
          total_amount?: number | null
          tracking_note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          description: string | null
          is_public: boolean
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          is_public?: boolean
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          price: number
          product_id: string
          sku: string | null
          stock: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          price: number
          product_id: string
          sku?: string | null
          stock?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          price?: number
          product_id?: string
          sku?: string | null
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["product_status"]
          store_id: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["product_status"]
          store_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["product_status"]
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_hits: {
        Row: {
          created_at: string
          id: number
          key: string
        }
        Insert: {
          created_at?: string
          id?: never
          key: string
        }
        Update: {
          created_at?: string
          id?: never
          key?: string
        }
        Relationships: []
      }
      settlement_orders: {
        Row: {
          order_id: string
          settlement_id: string
        }
        Insert: {
          order_id: string
          settlement_id: string
        }
        Update: {
          order_id?: string
          settlement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_orders_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          created_at: string
          created_by: string | null
          direction: Database["public"]["Enums"]["settlement_direction"]
          id: string
          net_amount: number
          note: string | null
          period_label: string
          reference: string | null
          store_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          direction?: Database["public"]["Enums"]["settlement_direction"]
          id?: string
          net_amount?: number
          note?: string | null
          period_label: string
          reference?: string | null
          store_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          direction?: Database["public"]["Enums"]["settlement_direction"]
          id?: string
          net_amount?: number
          note?: string | null
          period_label?: string
          reference?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          delta: number
          id: string
          order_id: string | null
          reason: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delta: number
          id?: string
          order_id?: string | null
          reason: string
          variant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delta?: number
          id?: string
          order_id?: string | null
          reason?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_private: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          contact_phone: string | null
          store_id: string
          telegram_chat_id: number | null
          updated_at: string
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          contact_phone?: string | null
          store_id: string
          telegram_chat_id?: number | null
          updated_at?: string
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          contact_phone?: string | null
          store_id?: string
          telegram_chat_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_private_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          delivery_fee_local: number
          delivery_fee_other: number
          description: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          province: string | null
          slug: string
          status: Database["public"]["Enums"]["store_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_fee_local?: number
          delivery_fee_other?: number
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          province?: string | null
          slug: string
          status?: Database["public"]["Enums"]["store_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_fee_local?: number
          delivery_fee_other?: number
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          province?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["store_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_link_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          store_id: string
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          store_id: string
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          store_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_link_codes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          event_id: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          result: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider: string
          result?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          result?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _change_order_status: {
        Args: {
          p_actor: string
          p_new_status: Database["public"]["Enums"]["order_status"]
          p_note?: string
          p_order_id: string
        }
        Returns: undefined
      }
      _check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window: string }
        Returns: undefined
      }
      _enqueue_notification: {
        Args: {
          p_event: string
          p_order_id: string
          p_payload?: Json
          p_store_id: string
          p_target: string
        }
        Returns: undefined
      }
      _generate_order_code: { Args: never; Returns: string }
      _mark_order_paid: {
        Args: { p_order_id: string; p_reference: string }
        Returns: undefined
      }
      _normalize_phone: { Args: { p: string }; Returns: string }
      _request_ip: { Args: never; Returns: string }
      _reserve_variant: {
        Args: { p_qty: number; p_store_id: string; p_variant_id: string }
        Returns: Record<string, unknown>
      }
      _return_stock: {
        Args: { p_order_id: string; p_reason: string }
        Returns: undefined
      }
      _setting_bool: {
        Args: { p_default?: boolean; p_key: string }
        Returns: boolean
      }
      _setting_numeric: {
        Args: { p_default?: number; p_key: string }
        Returns: number
      }
      _setting_text: {
        Args: { p_default?: string; p_key: string }
        Returns: string
      }
      _storage_owner_ok: { Args: { p_name: string }; Returns: boolean }
      _transition_allowed: {
        Args: {
          p_admin: boolean
          p_new: Database["public"]["Enums"]["order_status"]
          p_old: Database["public"]["Enums"]["order_status"]
          p_store: boolean
        }
        Returns: boolean
      }
      can_edit_product: { Args: { p_product_id: string }; Returns: boolean }
      claim_webhook_event: {
        Args: { p_event_id: string; p_payload?: Json; p_provider: string }
        Returns: boolean
      }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      complete_due_orders: { Args: never; Returns: number }
      confirm_payment_manually: {
        Args: { p_note: string; p_order_id: string }
        Returns: undefined
      }
      create_order: {
        Args: {
          p_address: string
          p_customer_name: string
          p_customer_phone: string
          p_items: Json
          p_payment_method: Database["public"]["Enums"]["payment_method"]
          p_province: string
          p_source?: Database["public"]["Enums"]["order_source"]
          p_store_id: string
        }
        Returns: Json
      }
      create_settlement: {
        Args: {
          p_note?: string
          p_order_ids: string[]
          p_reference?: string
          p_store_id: string
        }
        Returns: Json
      }
      create_telegram_link_code: {
        Args: { p_store_id: string }
        Returns: string
      }
      customer_cancel_order: {
        Args: { p_order_code: string; p_phone: string }
        Returns: Json
      }
      customer_confirm_received: {
        Args: { p_order_code: string; p_phone: string }
        Returns: Json
      }
      enqueue_shipping_reminders: { Args: never; Returns: number }
      expire_unpaid_orders: { Args: never; Returns: number }
      finish_webhook_event: {
        Args: { p_event_id: string; p_provider: string; p_result: string }
        Returns: undefined
      }
      get_settlement_summary: {
        Args: never
        Returns: {
          cod_commission_owed: number
          current_balance: number
          eligible_orders: number
          estimated_net: number
          khqr_payable: number
          store_id: string
          store_name: string
        }[]
      }
      get_store_balance: { Args: { p_store_id: string }; Returns: number }
      is_super_admin: { Args: never; Returns: boolean }
      link_telegram_chat: {
        Args: { p_chat_id: number; p_code: string }
        Returns: string
      }
      mark_order_paid: {
        Args: { p_amount: number; p_order_id: string; p_reference: string }
        Returns: string
      }
      mark_payment_refunded: {
        Args: { p_note?: string; p_order_id: string; p_reference: string }
        Returns: undefined
      }
      owns_product: { Args: { p_product_id: string }; Returns: boolean }
      owns_store: { Args: { p_store_id: string }; Returns: boolean }
      record_commission_settled: {
        Args: {
          p_amount: number
          p_note?: string
          p_reference: string
          p_store_id: string
        }
        Returns: undefined
      }
      record_deduction: {
        Args: {
          p_amount: number
          p_note: string
          p_order_id: string
          p_store_id: string
        }
        Returns: undefined
      }
      reopen_expired_order: {
        Args: { p_order_code: string; p_phone: string }
        Returns: Json
      }
      report_problem: {
        Args: { p_note: string; p_order_code: string; p_phone: string }
        Returns: Json
      }
      resolve_dispute: {
        Args: { p_note: string; p_order_id: string }
        Returns: undefined
      }
      restock_order: {
        Args: { p_note?: string; p_order_id: string }
        Returns: undefined
      }
      set_order_qr: {
        Args: { p_expires_at: string; p_order_id: string; p_qr_string: string }
        Returns: undefined
      }
      set_order_status: {
        Args: {
          p_courier_name?: string
          p_new_status: Database["public"]["Enums"]["order_status"]
          p_note?: string
          p_order_id: string
          p_tracking_note?: string
        }
        Returns: undefined
      }
      set_store_status: {
        Args: {
          p_note?: string
          p_status: Database["public"]["Enums"]["store_status"]
          p_store_id: string
        }
        Returns: undefined
      }
      store_can_edit: { Args: { p_store_id: string }; Returns: boolean }
      store_can_see_order: { Args: { p_order_id: string }; Returns: boolean }
      track_order: {
        Args: { p_order_code: string; p_phone: string }
        Returns: Json
      }
    }
    Enums: {
      ledger_type:
        | "customer_payment"
        | "cod_collected_by_store"
        | "commission"
        | "delivery_fee_passthrough"
        | "store_payable"
        | "commission_receivable"
        | "commission_settled"
        | "payout_paid"
        | "refund"
        | "deduction"
      notification_status: "pending" | "sent" | "failed"
      order_source: "platform" | "store_link"
      order_status:
        | "pending"
        | "confirmed"
        | "rejected"
        | "cancelled"
        | "shipped"
        | "delivered"
        | "completed"
        | "paid_out"
        | "refused"
        | "returned"
        | "refunded"
      payment_method: "khqr" | "cod"
      payment_status:
        | "unpaid"
        | "paid"
        | "flagged"
        | "expired"
        | "refund_due"
        | "refunded"
      product_status: "draft" | "active" | "hidden"
      settlement_direction: "platform_pays" | "store_pays"
      store_status: "pending" | "active" | "suspended"
      user_role: "super_admin" | "store_owner"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      ledger_type: [
        "customer_payment",
        "cod_collected_by_store",
        "commission",
        "delivery_fee_passthrough",
        "store_payable",
        "commission_receivable",
        "commission_settled",
        "payout_paid",
        "refund",
        "deduction",
      ],
      notification_status: ["pending", "sent", "failed"],
      order_source: ["platform", "store_link"],
      order_status: [
        "pending",
        "confirmed",
        "rejected",
        "cancelled",
        "shipped",
        "delivered",
        "completed",
        "paid_out",
        "refused",
        "returned",
        "refunded",
      ],
      payment_method: ["khqr", "cod"],
      payment_status: [
        "unpaid",
        "paid",
        "flagged",
        "expired",
        "refund_due",
        "refunded",
      ],
      product_status: ["draft", "active", "hidden"],
      settlement_direction: ["platform_pays", "store_pays"],
      store_status: ["pending", "active", "suspended"],
      user_role: ["super_admin", "store_owner"],
    },
  },
} as const

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../lib/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Copy .env.local.example to .env.local and fill it in.',
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

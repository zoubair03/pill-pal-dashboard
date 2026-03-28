import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "YOUR_SUPABASE_URL_HERE"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY_HERE"

/**
 * Singleton Supabase Client for the Next.js App
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

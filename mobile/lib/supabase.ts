import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

// ── Replace with your actual Supabase project values ──────────────────────────
const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? 'https://YOUR_PROJECT.supabase.co'
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON ?? 'YOUR_ANON_KEY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage:            AsyncStorage,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
})

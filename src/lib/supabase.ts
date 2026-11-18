import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://dlqwkogsstngqictvkou.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ly8EoprjyImLdm9_PAJJhQ_cIswuxBJ';

const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const envKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  '';

const supabaseUrl =
  envUrl && !envUrl.includes('MY_SUPABASE_URL') ? envUrl : DEFAULT_SUPABASE_URL;

const supabasePublishableKey =
  envKey &&
  !envKey.includes('MY_SUPABASE_ANON_KEY') &&
  !envKey.includes('MY_SUPABASE_PUBLISHABLE_KEY')
    ? envKey
    : DEFAULT_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const BOOTSTRAP_ADMIN_EMAIL = 'cs26bt042@iitdh.ac.in';

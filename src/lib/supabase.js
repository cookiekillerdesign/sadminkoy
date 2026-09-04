import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured, MEDIA_BUCKET } from './supabaseConfig';

/*
 * A single client for the whole app. Creating more than one triggers the
 * "Multiple GoTrueClient instances" warning and, worse, makes the two copies
 * fight over the same localStorage session key.
 *
 * When the env vars are missing this stays null instead of throwing at import
 * time, so the admin panel can render a setup screen rather than a blank page.
 */
export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'cc_admin_auth'
      }
    })
  : null;

export { SUPABASE_URL, isSupabaseConfigured, MEDIA_BUCKET };

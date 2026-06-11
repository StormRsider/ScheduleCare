import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Clean up copy-paste artifacts (whitespaces, carriage returns, non-ASCII/invisible Unicode characters)
const sanitizeEnvVar = (val: string) => {
  return val
    .replace(/[\s\n\r]/g, '')            // Remove all spaces, tabs, carriage returns, and newlines
    .replace(/[^\x20-\x7E]/g, '')        // Remove any non-printable or non-ASCII characters (ISO-8859-1 compliance)
    .trim();
};

const supabaseUrl = sanitizeEnvVar(rawUrl);
const supabaseAnonKey = sanitizeEnvVar(rawAnonKey);

// Check if credentials are valid and not the default placeholders
export const isSupabaseConfigured = 
  !!supabaseUrl && 
  !!supabaseAnonKey && 
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-public-key');

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase is not configured yet. The application will run in offline-first Demo Mode using browser storage. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file to connect to your live database.'
  );
}

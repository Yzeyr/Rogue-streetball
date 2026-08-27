import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Om .env er fylt ut. Appen viser en oppsettskjerm i stedet for å krasje. */
export const hasSupabaseConfig = Boolean(url && anonKey);

/**
 * Realtime er skrudd ned til 5 hendelser/sekund. Vi henter uansett hele
 * lista på nytt ved endring, så høyere frekvens gir bare flere runder.
 */
export const supabase: SupabaseClient = createClient(url ?? 'http://localhost', anonKey ?? 'anon', {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 5 } },
});

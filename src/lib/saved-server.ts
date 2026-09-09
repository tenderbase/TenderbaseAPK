import 'server-only';

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config';
import { createClient as createServerClient } from './supabase-server';

/** Number of tenders the user has saved. 0 when signed out/unconfigured. */
export async function countSavedTenders(): Promise<number> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return 0;
  try {
    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;
    const { count, error } = await supabase
      .from('saved_tenders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if (error) {
      console.error('[saved] server count failed:', error.message);
      return 0;
    }
    return count ?? 0;
  } catch {
    return 0;
  }
}

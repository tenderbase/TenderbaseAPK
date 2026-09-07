'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { isSupabaseConfigured } from '@/lib/supabase-config';

export async function signOut() {
  if (isSupabaseConfigured) {
    await createClient().auth.signOut();
  }
  // Clear cached Server Component output so the app can't show stale user data.
  revalidatePath('/', 'layout');
  redirect('/login');
}

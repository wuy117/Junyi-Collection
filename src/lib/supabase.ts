import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export async function uploadWineImage(file: File) {
  if (!supabase) {
    return URL.createObjectURL(file);
  }

  const path = `wine-photos/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from('wine-images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from('wine-images').getPublicUrl(path);
  return data.publicUrl;
}

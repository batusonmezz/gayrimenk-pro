import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const CHUNK_SIZE = 2000;

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const first = await SecureStore.getItemAsync(`${key}.0`);
    if (first !== null) {
      const chunks = [first];
      let i = 1;
      while (true) {
        const chunk = await SecureStore.getItemAsync(`${key}.${i}`);
        if (chunk === null) break;
        chunks.push(chunk);
        i++;
      }
      return chunks.join('');
    }
    return SecureStore.getItemAsync(key);
  },

  setItem: async (key: string, value: string): Promise<void> => {
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }
    if (chunks.length === 0) chunks.push('');
    await Promise.all(
      chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}.${i}`, chunk))
    );
    let idx = chunks.length;
    while (true) {
      const stale = await SecureStore.getItemAsync(`${key}.${idx}`);
      if (stale === null) break;
      await SecureStore.deleteItemAsync(`${key}.${idx}`);
      idx++;
    }
  },

  removeItem: async (key: string): Promise<void> => {
    let i = 0;
    while (true) {
      const existing = await SecureStore.getItemAsync(`${key}.${i}`);
      if (existing === null) break;
      await SecureStore.deleteItemAsync(`${key}.${i}`);
      i++;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage:            ExpoSecureStoreAdapter,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
});

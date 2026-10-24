import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getRedisClient } from '@/lib/redis/client';

export const SIMILARITY_THRESHOLD = 0.93;
const PREFIX = 'sn-iran:hash:';

export async function isHashSeen(hash: string): Promise<boolean> {
  try {
    return (await getRedisClient().exists(`${PREFIX}${hash}`)) === 1;
  } catch {
    return false; // Redis yoksa DB UNIQUE kısıtı nihai güvence
  }
}

export async function markHashSeen(hash: string): Promise<void> {
  try {
    await getRedisClient().set(`${PREFIX}${hash}`, '1', { ex: 60 * 60 * 24 * 14 });
  } catch {
    /* sessiz */
  }
}

export async function isSemanticDuplicate(embedding: number[]): Promise<boolean> {
  if (embedding.length === 0) return false;
  try {
    const { data, error } = await getSupabaseServiceClient().rpc('match_articles_by_embedding', { query_embedding: embedding, match_count: 1 });
    if (error || !data?.length) return false;
    return 1 - (data[0] as { distance: number }).distance >= SIMILARITY_THRESHOLD;
  } catch {
    return false;
  }
}

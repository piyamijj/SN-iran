import { getRedisClient } from '@/lib/redis/client';

/** Redis ile basit IP başına dakikalık sınır; Redis yoksa izin verir. */
export async function allow(key: string, limit: number, windowSec = 60): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const k = `sn-iran:rl:${key}`;
    const n = await redis.incr(k);
    if (n === 1) await redis.expire(k, windowSec);
    return n <= limit;
  } catch {
    return true;
  }
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anon';
}

import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url:
    process.env.REDIS_KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL,
  token:
    process.env.REDIS_KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN,
});

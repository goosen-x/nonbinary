import { z } from "zod";

// Значения в Vercel могут храниться с хвостовым переводом строки
// (артефакт `echo ... | vercel env add`) — всегда обрезаем
const trimmed = z
  .string()
  .optional()
  .transform((val) => {
    const t = val?.trim();
    return t || undefined;
  });

const envSchema = z.object({
  BOT_TOKEN: z
    .string()
    .min(1, "BOT_TOKEN is required")
    .transform((val) => val.trim()),
  WEBHOOK_SECRET: trimmed,
  // Интеграция Vercel Marketplace задаёт KV_*-имена, ручная настройка — UPSTASH_*
  UPSTASH_REDIS_REST_URL: trimmed,
  UPSTASH_REDIS_REST_TOKEN: trimmed,
  KV_REST_API_URL: trimmed,
  KV_REST_API_TOKEN: trimmed,
  BOT_ADMINS: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(",").map(Number) : [])),
});

export type Env = z.infer<typeof envSchema>;

function getEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Invalid environment variables:");
    console.error(result.error.format());
    throw new Error("Invalid environment variables");
  }

  return result.data;
}

export const env = getEnv();

// Реквизиты Redis независимо от способа подключения базы
export const redisConfig =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? { url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN }
    : env.KV_REST_API_URL && env.KV_REST_API_TOKEN
      ? { url: env.KV_REST_API_URL, token: env.KV_REST_API_TOKEN }
      : null;

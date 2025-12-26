import { z } from "zod";

const envSchema = z.object({
  BOT_TOKEN: z.string().min(1, "BOT_TOKEN is required"),
  WEBHOOK_SECRET: z.string().optional(),
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

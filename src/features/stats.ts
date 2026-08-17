import { Bot, Context } from "grammy";
import { Redis } from "@upstash/redis";
import { redisConfig } from "../config/index.js";
import {
  WEEK_TTL_SECONDS,
  mondayOf,
  addDays,
  weekKey,
  fmtDate,
} from "../lib/week.js";

// Статистика сообщений в Upstash Redis:
// stats:{chatId}:{понедельник недели} — hash: userId → счётчик за неделю
// users:{chatId} — hash: userId → { name, username } для отображения в топе

const redis = redisConfig ? new Redis(redisConfig) : null;

const TOP_LIMIT = 10;

// Отчёты: фраза-триггер → недельный счётчик с этим префиксом ключа
const REPORTS = [
  {
    trigger: /кто\s+больше\s+всех\s+пизд/i,
    prefix: "stats",
    header: "Люди без личной жизни за неделю",
    empty: "За прошлую неделю статистики нет. Все занимались личной жизнью.",
  },
  {
    trigger: /кто\s+больше\s+всех\s+расист/i,
    prefix: "racism",
    header: "Топ расистов за неделю",
    empty: "За прошлую неделю расистов не замечено. Так держать!",
  },
];

interface StoredUser {
  name: string;
  username?: string;
}

// Инкремент недельного счётчика (используется и триггерами, см. triggers.ts)
export async function trackWeeklyStat(
  prefix: string,
  ctx: Context,
): Promise<void> {
  if (!redis || !ctx.from || !ctx.chat || !ctx.message) return;

  const key = `${prefix}:${ctx.chat.id}:${weekKey(mondayOf(ctx.message.date))}`;
  try {
    await redis
      .pipeline()
      .hincrby(key, String(ctx.from.id), 1)
      .expire(key, WEEK_TTL_SECONDS)
      .exec();
  } catch (error) {
    console.error(`Stat "${prefix}" increment error:`, error);
  }
}

export function setupStats(bot: Bot): void {
  if (!redis) {
    console.warn(
      "Stats disabled: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set",
    );
    return;
  }
  const db = redis;

  // Счётчик сообщений — регистрируется первым, считает всё, включая команды
  bot.on("message", async (ctx, next) => {
    const from = ctx.from;
    if (!from || from.is_bot) return next();

    const statsKey = `stats:${ctx.chat.id}:${weekKey(mondayOf(ctx.message.date))}`;
    const user: StoredUser = {
      name: [from.first_name, from.last_name].filter(Boolean).join(" "),
      username: from.username,
    };

    try {
      await db
        .pipeline()
        .hincrby(statsKey, String(from.id), 1)
        .expire(statsKey, WEEK_TTL_SECONDS)
        .hset(`users:${ctx.chat.id}`, { [String(from.id)]: user })
        .exec();
    } catch (error) {
      // Статистика не должна ломать бота
      console.error("Stats increment error:", error);
    }

    await next();
  });

  // Фразы-запросы статистики — топ за прошлую неделю
  bot.on("message:text", async (ctx, next) => {
    const report = REPORTS.find((r) => r.trigger.test(ctx.message.text));
    if (!report) return next();

    const thisMonday = mondayOf(ctx.message.date);
    const prevMonday = addDays(thisMonday, -7);
    const prevSunday = addDays(thisMonday, -1);

    try {
      const [counts, users] = await Promise.all([
        db.hgetall<Record<string, number>>(
          `${report.prefix}:${ctx.chat.id}:${weekKey(prevMonday)}`,
        ),
        db.hgetall<Record<string, StoredUser>>(`users:${ctx.chat.id}`),
      ]);

      if (!counts || Object.keys(counts).length === 0) {
        await ctx.reply(report.empty);
        return;
      }

      const top = Object.entries(counts)
        .map(([userId, count]) => ({ userId, count: Number(count) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, TOP_LIMIT);

      const lines = top.map((row, i) => {
        const user = users?.[row.userId];
        const name = user?.name || `id${row.userId}`;
        const label = user?.username ? `${name} (${user.username})` : name;
        return `${i + 1}. ${label} - ${row.count}`;
      });

      await ctx.reply(
        `${report.header} ${fmtDate(prevMonday)} - ${fmtDate(prevSunday)}\n` +
          lines.join("\n"),
      );
    } catch (error) {
      console.error("Stats report error:", error);
      await ctx.reply("Не смог достать статистику, база лежит.");
    }
  });
}

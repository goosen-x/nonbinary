import { Bot } from "grammy";
import { Redis } from "@upstash/redis";
import { env } from "../config/index.js";

// Статистика сообщений в Upstash Redis:
// stats:{chatId}:{понедельник недели} — hash: userId → счётчик за неделю
// users:{chatId} — hash: userId → { name, username } для отображения в топе

const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Недели считаем по Москве (UTC+3)
const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;
// Храним ключ недели 35 дней — хватит, чтобы показать прошлую неделю
const WEEK_TTL_SECONDS = 35 * 24 * 60 * 60;
const TOP_LIMIT = 10;
const STATS_TRIGGER = /кто\s+больше\s+всех\s+пизд/i;

interface StoredUser {
  name: string;
  username?: string;
}

// Понедельник недели, в которую попадает момент времени (по МСК)
function mondayOf(unixSeconds: number): Date {
  const msk = new Date(unixSeconds * 1000 + MSK_OFFSET_MS);
  const daysSinceMonday = (msk.getUTCDay() + 6) % 7;
  return new Date(
    Date.UTC(
      msk.getUTCFullYear(),
      msk.getUTCMonth(),
      msk.getUTCDate() - daysSinceMonday,
    ),
  );
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

function weekKey(monday: Date): string {
  return monday.toISOString().slice(0, 10);
}

function fmtDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getUTCFullYear()}`;
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

  // «кто больше всех пиздит» — топ болтунов за прошлую неделю
  bot.on("message:text", async (ctx, next) => {
    if (!STATS_TRIGGER.test(ctx.message.text)) return next();

    const thisMonday = mondayOf(ctx.message.date);
    const prevMonday = addDays(thisMonday, -7);
    const prevSunday = addDays(thisMonday, -1);

    try {
      const [counts, users] = await Promise.all([
        db.hgetall<Record<string, number>>(
          `stats:${ctx.chat.id}:${weekKey(prevMonday)}`,
        ),
        db.hgetall<Record<string, StoredUser>>(`users:${ctx.chat.id}`),
      ]);

      if (!counts || Object.keys(counts).length === 0) {
        await ctx.reply(
          "За прошлую неделю статистики нет. Все занимались личной жизнью.",
        );
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
        `Люди без личной жизни за неделю ${fmtDate(prevMonday)} - ${fmtDate(prevSunday)}\n` +
          lines.join("\n"),
      );
    } catch (error) {
      console.error("Stats report error:", error);
      await ctx.reply("Не смог достать статистику, база лежит.");
    }
  });
}

import { Bot, Context } from "grammy";
import { Redis } from "@upstash/redis";
import { env, redisConfig } from "../config/index.js";
import triggersData from "../data/triggers.json" with { type: "json" };
import { Matchable, matchTrigger } from "../lib/matching.js";
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

// Триггеры со включённым счётчиком (сейчас — racism), для бэкфила пересылкой
const statTriggers = (
  triggersData.triggers as Array<Matchable & { stats?: string }>
).filter((t) => t.stats);

// Кому разрешён бэкфил пересылкой в личку
const BACKFILL_ADMIN_IDS = new Set<number>([...env.BOT_ADMINS, 204887498]);

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

    // Пересылки в личку — это бэкфил, их считает отдельный обработчик ниже
    if (ctx.chat.type === "private" && ctx.message.forward_origin) {
      return next();
    }

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

  // Бэкфил: админ пересылает боту в личку сообщения из группы —
  // раскладываем по авторам и неделям по оригинальной дате пересылки.
  // Текущую неделю пропускаем: её бот считает сам, иначе будут дубли.
  let backfillGroupId: number | null = null;

  async function detectGroupChatId(): Promise<number | null> {
    if (backfillGroupId !== null) return backfillGroupId;
    const ids = new Set<number>();
    let cursor = "0";
    do {
      const [next, keys] = await db.scan(cursor, {
        match: "stats:*",
        count: 100,
      });
      cursor = String(next);
      for (const key of keys) {
        const id = Number(key.split(":")[1]);
        if (id < 0) ids.add(id); // группы — отрицательные id
      }
    } while (cursor !== "0");
    if (ids.size === 1) backfillGroupId = [...ids][0];
    return backfillGroupId;
  }

  bot.on("message", async (ctx, next) => {
    if (ctx.chat.type !== "private") return next();
    const origin = ctx.message.forward_origin;
    if (!origin) return next();
    if (!ctx.from || !BACKFILL_ADMIN_IDS.has(ctx.from.id)) return;

    try {
      const groupId = await detectGroupChatId();
      if (!groupId) {
        await ctx.reply(
          "Не понял, в какую группу писать: пусть в группе с ботом сначала кто-нибудь напишет.",
        );
        return;
      }

      const week = weekKey(mondayOf(origin.date));
      if (week >= weekKey(mondayOf(ctx.message.date))) {
        return; // текущая неделя — живой счёт, пропускаем молча
      }

      let uid: string;
      let name: string | null = null;
      if (origin.type === "user") {
        uid = String(origin.sender_user.id);
        name = [origin.sender_user.first_name, origin.sender_user.last_name]
          .filter(Boolean)
          .join(" ");
      } else if (origin.type === "hidden_user") {
        // Автор скрыл аккаунт в настройках приватности — есть только имя
        uid = `hidden:${origin.sender_user_name}`;
      } else {
        return; // пересылки из каналов не считаем
      }

      const text = ctx.message.text ?? ctx.message.caption ?? "";

      const pipeline = db.pipeline();
      pipeline.incr(`backfill:${groupId}`);
      pipeline.expire(`backfill:${groupId}`, 24 * 60 * 60);
      const statsKey = `stats:${groupId}:${week}`;
      pipeline.hincrby(statsKey, uid, 1);
      pipeline.expire(statsKey, WEEK_TTL_SECONDS);
      if (name) {
        // Живые данные точнее (в них есть username) — не перетираем
        pipeline.hsetnx(`users:${groupId}`, uid, JSON.stringify({ name }));
      }
      if (text && !text.startsWith("/")) {
        for (const trigger of statTriggers) {
          if (matchTrigger(text, trigger).matched) {
            const key = `${trigger.stats}:${groupId}:${week}`;
            pipeline.hincrby(key, uid, 1);
            pipeline.expire(key, WEEK_TTL_SECONDS);
          }
        }
      }
      const results = await pipeline.exec();

      const received = Number(results[0]);
      if (received === 1) {
        await ctx.reply(
          "Начал приём бэкфила. Пересылай пачками, я отчитаюсь на каждой сотне. Один и тот же кусок дважды не пересылай — задвоится.",
        );
      } else if (received % 100 === 0) {
        await ctx.reply(`Принято ${received} сообщений`);
      }
    } catch (error) {
      console.error("Backfill error:", error);
      await ctx.reply("Ошибка при записи бэкфила, глянь логи.");
    }
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
        // Авторы со скрытым аккаунтом (из бэкфила) хранятся как hidden:{имя}
        if (row.userId.startsWith("hidden:")) {
          return `${i + 1}. ${row.userId.slice("hidden:".length)} - ${row.count}`;
        }
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

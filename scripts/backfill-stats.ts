// Бэкфил недельной статистики из экспорта чата Telegram Desktop (result.json).
//
// Использование:
//   KV_REST_API_URL=... KV_REST_API_TOKEN=... \
//   npx tsx scripts/backfill-stats.ts result.json [--exclude 123,456] [--weeks 4] [--dry-run]
//
// Считает сообщения и срабатывания триггеров со stats-префиксом по пользователям,
// пишет завершённые недели (текущую не трогает — её считает живой бот).
// Счётчики пишутся абсолютным значением (HSET), поэтому запуск идемпотентен.
// Имена пользователей дозаписываются только если их ещё нет (живые данные точнее:
// в экспорте нет username).

import { readFileSync } from "node:fs";
import { Redis } from "@upstash/redis";
import triggersData from "../src/data/triggers.json" with { type: "json" };
import { matchTrigger, Matchable } from "../src/lib/matching.js";
import { WEEK_TTL_SECONDS, mondayOf, weekKey } from "../src/lib/week.js";

interface ExportMessage {
  type: string;
  from?: string;
  from_id?: string;
  date: string;
  date_unixtime?: string;
  text: string | Array<string | { text: string }>;
}

interface ChatExport {
  name?: string;
  type: string;
  id: number;
  messages: ExportMessage[];
}

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const args = process.argv.slice(2);
const filePath = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const excludeArg = args[args.indexOf("--exclude") + 1];
const excludeIds = new Set(
  args.includes("--exclude") ? excludeArg.split(",").map((s) => s.trim()) : [],
);
const weeksArg = args[args.indexOf("--weeks") + 1];
const maxWeeks = args.includes("--weeks") ? Number(weeksArg) : 4;

if (!filePath) {
  console.error(
    "Usage: tsx scripts/backfill-stats.ts result.json [--exclude ids] [--weeks N] [--dry-run]",
  );
  process.exit(1);
}

if (!dryRun && (!url || !token)) {
  console.error("Redis env is required: KV_REST_API_URL / KV_REST_API_TOKEN");
  process.exit(1);
}

// Триггеры, у которых включён счётчик (сейчас — racism)
const statTriggers = (
  triggersData.triggers as Array<Matchable & { stats?: string }>
).filter((t) => t.stats);

// Chat ID из экспорта → chat ID в Bot API
function botApiChatId(exp: ChatExport): number {
  if (exp.type.includes("supergroup") || exp.type === "channel") {
    return Number(`-100${exp.id}`);
  }
  if (exp.type.includes("group")) {
    return -exp.id;
  }
  return exp.id; // личка
}

function messageText(m: ExportMessage): string {
  if (typeof m.text === "string") return m.text;
  return m.text
    .map((part) => (typeof part === "string" ? part : part.text))
    .join("");
}

function messageUnixtime(m: ExportMessage): number {
  if (m.date_unixtime) return Number(m.date_unixtime);
  return Math.floor(Date.parse(m.date) / 1000);
}

async function main(): Promise<void> {
  const exp: ChatExport = JSON.parse(readFileSync(filePath!, "utf8"));
  const chatId = botApiChatId(exp);
  console.log(`Чат: ${exp.name ?? "?"} (${exp.type}, Bot API id: ${chatId})`);
  console.log(`Сообщений в экспорте: ${exp.messages.length}`);

  // Бэкфилим только завершённые недели, не старше maxWeeks назад
  const nowSec = messageUnixtime(exp.messages[exp.messages.length - 1]);
  const currentWeek = weekKey(mondayOf(nowSec));

  // week → userId → count
  const msgCounts = new Map<string, Map<string, number>>();
  const statCounts = new Map<string, Map<string, Map<string, number>>>(); // prefix → week → uid
  const userNames = new Map<string, string>();

  for (const m of exp.messages) {
    if (m.type !== "message") continue;
    if (!m.from_id?.startsWith("user")) continue;

    const uid = m.from_id.slice(4);
    if (excludeIds.has(uid)) continue;

    const week = weekKey(mondayOf(messageUnixtime(m)));
    if (week >= currentWeek) continue; // текущую неделю считает живой бот

    if (m.from) userNames.set(uid, m.from);

    const weekMap = msgCounts.get(week) ?? new Map<string, number>();
    weekMap.set(uid, (weekMap.get(uid) ?? 0) + 1);
    msgCounts.set(week, weekMap);

    const text = messageText(m);
    if (text && !text.startsWith("/")) {
      for (const trigger of statTriggers) {
        if (matchTrigger(text, trigger).matched) {
          const prefix = trigger.stats!;
          const byWeek =
            statCounts.get(prefix) ?? new Map<string, Map<string, number>>();
          const byUser = byWeek.get(week) ?? new Map<string, number>();
          byUser.set(uid, (byUser.get(uid) ?? 0) + 1);
          byWeek.set(week, byUser);
          statCounts.set(prefix, byWeek);
        }
      }
    }
  }

  // Оставляем только последние maxWeeks недель
  const weeks = [...msgCounts.keys()].sort().slice(-maxWeeks);
  console.log(`Недели к записи: ${weeks.join(", ") || "нет"}`);

  for (const week of weeks) {
    console.log(`\n=== Неделя с ${week} ===`);
    const byUser = [...msgCounts.get(week)!.entries()].sort(
      (a, b) => b[1] - a[1],
    );
    for (const [uid, count] of byUser) {
      console.log(`  ${userNames.get(uid) ?? uid}: ${count}`);
    }
    for (const [prefix, byWeek] of statCounts) {
      const stat = byWeek.get(week);
      if (!stat) continue;
      console.log(`  --- ${prefix}:`);
      for (const [uid, count] of [...stat.entries()].sort(
        (a, b) => b[1] - a[1],
      )) {
        console.log(`  ${userNames.get(uid) ?? uid}: ${count}`);
      }
    }
  }

  if (dryRun) {
    console.log("\nDry run — в Redis ничего не записано.");
    return;
  }

  const redis = new Redis({ url: url!, token: token! });

  for (const week of weeks) {
    const pipeline = redis.pipeline();

    const statsKey = `stats:${chatId}:${week}`;
    pipeline.hset(statsKey, Object.fromEntries(msgCounts.get(week)!));
    pipeline.expire(statsKey, WEEK_TTL_SECONDS);

    for (const [prefix, byWeek] of statCounts) {
      const stat = byWeek.get(week);
      if (!stat) continue;
      const key = `${prefix}:${chatId}:${week}`;
      pipeline.hset(key, Object.fromEntries(stat));
      pipeline.expire(key, WEEK_TTL_SECONDS);
    }

    await pipeline.exec();
    console.log(`Записана неделя ${week}`);
  }

  // Имена — только если пользователя ещё нет (у живых данных есть username)
  const usersKey = `users:${chatId}`;
  for (const [uid, name] of userNames) {
    await redis.hsetnx(usersKey, uid, JSON.stringify({ name }));
  }
  console.log(`Имена пользователей дозаписаны в ${usersKey}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

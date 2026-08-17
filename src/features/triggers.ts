import { Bot, Context } from "grammy";
import triggersData from "../data/triggers.json" with { type: "json" };
import { matchTrigger, MatchType } from "../lib/matching.js";
import { trackWeeklyStat } from "./stats.js";

// Типы для триггеров
interface TriggerResponse {
  type: "text" | "sticker" | "animation";
  content: string;
}

interface Trigger {
  pattern?: string;
  patterns?: string[];
  match: MatchType;
  response: TriggerResponse;
  replyToMessage: boolean;
  probability?: number;
  // Префикс недельного счётчика в Redis — считаем срабатывания по пользователям
  stats?: string;
}

const triggers: Trigger[] = triggersData.triggers as Trigger[];

// Отправляет ответ на триггер
async function sendTriggerResponse(
  ctx: Context,
  trigger: Trigger,
  quote?: string,
): Promise<void> {
  const replyOptions = trigger.replyToMessage
    ? {
        reply_parameters: {
          message_id: ctx.message!.message_id,
          quote: quote, // Цитируем конкретное слово
        },
      }
    : {};

  switch (trigger.response.type) {
    case "text":
      await ctx.reply(trigger.response.content, replyOptions);
      break;

    case "sticker":
      await ctx.replyWithSticker(trigger.response.content, replyOptions);
      break;

    case "animation":
      await ctx.replyWithAnimation(trigger.response.content, replyOptions);
      break;
  }
}

export function setupTriggers(bot: Bot): void {
  // Обрабатываем все текстовые сообщения (не команды)
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;

    // Пропускаем команды
    if (text.startsWith("/")) {
      return;
    }

    // Ищем совпадение с триггерами
    for (const trigger of triggers) {
      const match = matchTrigger(text, trigger);
      if (match.matched) {
        // Слово сказано — считаем в статистику независимо от того, ответим ли
        if (trigger.stats) {
          await trackWeeklyStat(trigger.stats, ctx);
        }

        // Проверяем вероятность ответа
        const probability = trigger.probability ?? 1; // По умолчанию 100%
        const random = Math.random();

        if (random <= probability) {
          await sendTriggerResponse(ctx, trigger, match.quote);
        }
        // Можно раскомментировать, если нужен только первый триггер
        // break;
      }
    }
  });
}

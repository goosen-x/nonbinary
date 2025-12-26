import { Bot, Context } from "grammy";
import triggersData from "../data/triggers.json" with { type: "json" };

// Типы для триггеров
interface TriggerResponse {
  type: "text" | "sticker" | "animation";
  content: string;
}

interface Trigger {
  pattern: string;
  match: "exact" | "contains" | "regex";
  response: TriggerResponse;
  replyToMessage: boolean;
}

const triggers: Trigger[] = triggersData.triggers as Trigger[];

// Результат матчинга триггера
interface TriggerMatch {
  matched: boolean;
  quote?: string; // Точный текст из сообщения для цитирования
}

// Проверяет, совпадает ли сообщение с паттерном триггера
function matchTrigger(text: string, trigger: Trigger): TriggerMatch {
  const lowerText = text.toLowerCase();
  const lowerPattern = trigger.pattern.toLowerCase();

  switch (trigger.match) {
    case "exact":
      if (lowerText === lowerPattern) {
        return { matched: true, quote: text };
      }
      return { matched: false };

    case "contains": {
      const index = lowerText.indexOf(lowerPattern);
      if (index !== -1) {
        // Извлекаем точный текст из оригинального сообщения (с оригинальным регистром)
        const quote = text.substring(index, index + trigger.pattern.length);
        return { matched: true, quote };
      }
      return { matched: false };
    }

    case "regex":
      try {
        const regex = new RegExp(trigger.pattern, "i");
        const match = text.match(regex);
        if (match) {
          return { matched: true, quote: match[0] };
        }
        return { matched: false };
      } catch {
        console.error(`Invalid regex pattern: ${trigger.pattern}`);
        return { matched: false };
      }

    default:
      return { matched: false };
  }
}

// Отправляет ответ на триггер
async function sendTriggerResponse(
  ctx: Context,
  trigger: Trigger,
  quote?: string
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
        await sendTriggerResponse(ctx, trigger, match.quote);
        // Можно раскомментировать, если нужен только первый триггер
        // break;
      }
    }
  });
}

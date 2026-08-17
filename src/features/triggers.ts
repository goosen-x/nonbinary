import { Bot, Context } from "grammy";
import triggersData from "../data/triggers.json" with { type: "json" };
import { trackWeeklyStat } from "./stats.js";

// Типы для триггеров
interface TriggerResponse {
  type: "text" | "sticker" | "animation";
  content: string;
}

interface Trigger {
  pattern?: string;
  patterns?: string[];
  match: "exact" | "contains" | "regex";
  response: TriggerResponse;
  replyToMessage: boolean;
  probability?: number;
  // Префикс недельного счётчика в Redis — считаем срабатывания по пользователям
  stats?: string;
}

const triggers: Trigger[] = triggersData.triggers as Trigger[];

// Результат матчинга триггера
interface TriggerMatch {
  matched: boolean;
  quote?: string; // Точный текст из сообщения для цитирования
}

function isWordChar(ch: string | undefined): boolean {
  return !!ch && /[0-9a-zа-яё]/i.test(ch);
}

// Проверяет один паттерн
function matchSinglePattern(
  text: string,
  pattern: string,
  matchType: Trigger["match"]
): TriggerMatch {
  const lowerText = text.toLowerCase();
  const lowerPattern = pattern.toLowerCase();

  switch (matchType) {
    case "exact":
      if (lowerText === lowerPattern) {
        return { matched: true, quote: text };
      }
      return { matched: false };

    case "contains": {
      // Паттерн должен стоять в начале слова: «негра» матчится, «книга» — нет.
      // Окончания слова после паттерна допускаем, чтобы ловить словоформы.
      let index = lowerText.indexOf(lowerPattern);
      while (index > 0 && isWordChar(lowerText[index - 1])) {
        index = lowerText.indexOf(lowerPattern, index + 1);
      }
      if (index !== -1) {
        const quote = text.substring(index, index + pattern.length);
        return { matched: true, quote };
      }
      return { matched: false };
    }

    case "regex":
      try {
        const regex = new RegExp(pattern, "i");
        const match = text.match(regex);
        if (match) {
          return { matched: true, quote: match[0] };
        }
        return { matched: false };
      } catch {
        console.error(`Invalid regex pattern: ${pattern}`);
        return { matched: false };
      }

    default:
      return { matched: false };
  }
}

// Проверяет, совпадает ли сообщение с паттерном триггера
function matchTrigger(text: string, trigger: Trigger): TriggerMatch {
  // Собираем все паттерны в один массив
  const patterns: string[] = [];

  if (trigger.pattern) {
    patterns.push(trigger.pattern);
  }

  if (trigger.patterns) {
    patterns.push(...trigger.patterns);
  }

  // Проверяем каждый паттерн
  for (const pattern of patterns) {
    const result = matchSinglePattern(text, pattern, trigger.match);
    if (result.matched) {
      return result;
    }
  }

  return { matched: false };
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

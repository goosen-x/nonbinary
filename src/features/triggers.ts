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

// Проверяет, совпадает ли сообщение с паттерном триггера
function matchTrigger(text: string, trigger: Trigger): boolean {
  const lowerText = text.toLowerCase();
  const lowerPattern = trigger.pattern.toLowerCase();

  switch (trigger.match) {
    case "exact":
      return lowerText === lowerPattern;

    case "contains":
      return lowerText.includes(lowerPattern);

    case "regex":
      try {
        const regex = new RegExp(trigger.pattern, "i");
        return regex.test(text);
      } catch {
        console.error(`Invalid regex pattern: ${trigger.pattern}`);
        return false;
      }

    default:
      return false;
  }
}

// Отправляет ответ на триггер
async function sendTriggerResponse(
  ctx: Context,
  trigger: Trigger
): Promise<void> {
  const replyOptions = trigger.replyToMessage
    ? { reply_parameters: { message_id: ctx.message!.message_id } }
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
      if (matchTrigger(text, trigger)) {
        await sendTriggerResponse(ctx, trigger);
        // Можно раскомментировать, если нужен только первый триггер
        // break;
      }
    }
  });
}

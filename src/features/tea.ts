import { Bot, Context } from "grammy";

const STICKERS = {
  teaOffer: "CAACAgIAAx0Cb6dRdQABBJt8aWiY8ekuiPMBrGGfvqZwBjH9MuoAAhMAA_NjxCxGtrpj9M9i7TgE",
  teaReady: "CAACAgIAAx0Cb6dRdQABBJt9aWiY9igbynRHen9DhkbEryNmRTgAAhQAA_NjxCw3vV20SVxXKzgE",
};

// Хранилище активных ожиданий: chatId -> { timeoutId, messageId }
const pendingTea = new Map<number, { timeoutId: NodeJS.Timeout; messageId: number }>();

export function setupTeaFeature(bot: Bot): void {
  // Триггер на слово "йцуке"
  bot.on("message:text", async (ctx, next) => {
    const text = ctx.message.text.toLowerCase();

    if (text.includes("йцуке")) {
      const chatId = ctx.chat.id;

      // Отправляем первый стикер (предложение чая)
      const sentMessage = await ctx.replyWithSticker(STICKERS.teaOffer, {
        reply_parameters: {
          message_id: ctx.message.message_id,
        },
      });

      // Устанавливаем таймер на 30 секунд
      const timeoutId = setTimeout(async () => {
        // Если таймер сработал, значит никто не ответил "нет"
        pendingTea.delete(chatId);

        try {
          await ctx.api.sendSticker(chatId, STICKERS.teaReady);
        } catch (error) {
          console.error("Error sending tea ready sticker:", error);
        }
      }, 30000);

      // Сохраняем состояние ожидания
      pendingTea.set(chatId, {
        timeoutId,
        messageId: sentMessage.message_id,
      });
    }

    await next();
  });

  // Отслеживаем ответы "нет"
  bot.on("message:text", async (ctx) => {
    const chatId = ctx.chat.id;
    const text = ctx.message.text.toLowerCase();

    // Проверяем, есть ли активное ожидание для этого чата
    const pending = pendingTea.get(chatId);

    if (pending && text.includes("нет")) {
      // Отменяем таймер
      clearTimeout(pending.timeoutId);
      pendingTea.delete(chatId);

      // Отправляем сообщение о разочаровании
      await ctx.reply("Эх, жаль. Сегодня без чая");
    }
  });
}

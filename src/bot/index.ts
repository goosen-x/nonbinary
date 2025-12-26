import { Bot } from "grammy";
import { env } from "../config/index.js";
import { setupFeatures } from "../features/index.js";

// Создаём бота
export const bot = new Bot(env.BOT_TOKEN);

// Логирование всех входящих сообщений
bot.use(async (ctx, next) => {
  const chat = ctx.chat;
  const from = ctx.from;
  const text = ctx.message?.text;
  const sticker = ctx.message?.sticker;

  console.log("=== Incoming update ===");
  console.log("Chat ID:", chat?.id);
  console.log("Chat Title:", chat?.title);
  console.log("From:", from?.first_name);
  console.log("Text:", text);
  if (sticker) {
    console.log("STICKER FILE_ID:", sticker.file_id);
    console.log("Sticker emoji:", sticker.emoji);
  }
  console.log("=======================");

  await next();
});

// Регистрируем фичи (команды, триггеры)
setupFeatures(bot);

// Обработка ошибок
bot.catch((err) => {
  console.error("Bot error:", err);
});

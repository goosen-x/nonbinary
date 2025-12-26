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

  console.log("=== Incoming update ===");
  console.log("Chat:", JSON.stringify(chat, null, 2));
  console.log("From:", JSON.stringify(from, null, 2));
  console.log("Text:", text);
  console.log("=======================");

  await next();
});

// Регистрируем фичи (команды, триггеры)
setupFeatures(bot);

// Обработка ошибок
bot.catch((err) => {
  console.error("Bot error:", err);
});

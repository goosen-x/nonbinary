import { Bot } from "grammy";
import { env } from "../config/index.js";
import { setupFeatures } from "../features/index.js";

// Создаём бота
export const bot = new Bot(env.BOT_TOKEN);

// Регистрируем фичи (команды, триггеры)
setupFeatures(bot);

// Обработка ошибок
bot.catch((err) => {
  console.error("Bot error:", err);
});

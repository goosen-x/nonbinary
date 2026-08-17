import { Bot } from "grammy";
import { setupStartCommand } from "./start.js";
import { setupTriggers } from "./triggers.js";
import { setupStickerCommands } from "./stickers.js";
import { setupDiceGame } from "./dice.js";
import { setupUserReactions } from "./user-reactions.js";
import { setupStats } from "./stats.js";

export function setupFeatures(bot: Bot): void {
  // Статистика сообщений — первой, чтобы считать всё (включая команды)
  setupStats(bot);

  // Команды /start и /help
  setupStartCommand(bot);

  // Команды стикеров
  setupStickerCommands(bot);

  // Игра в кубик
  setupDiceGame(bot);

  // Реакции на конкретных пользователей
  setupUserReactions(bot);

  // Триггеры на слова в сообщениях
  setupTriggers(bot);
}

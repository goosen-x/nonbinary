import { Bot } from "grammy";
import { setupStartCommand } from "./start.js";
import { setupTriggers } from "./triggers.js";
import { setupStickerCommands } from "./stickers.js";
import { setupDiceGame } from "./dice.js";

export function setupFeatures(bot: Bot): void {
  // Команды /start и /help
  setupStartCommand(bot);

  // Команды стикеров
  setupStickerCommands(bot);

  // Игра в кубик
  setupDiceGame(bot);

  // Триггеры на слова в сообщениях
  setupTriggers(bot);
}

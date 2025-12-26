import { Bot } from "grammy";
import { setupStartCommand } from "./start.js";
import { setupTriggers } from "./triggers.js";

export function setupFeatures(bot: Bot): void {
  // Команды /start и /help
  setupStartCommand(bot);

  // Триггеры на слова в сообщениях
  setupTriggers(bot);
}

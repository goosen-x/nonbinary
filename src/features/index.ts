import { Bot } from "grammy";
import { setupStartCommand } from "./start.js";
import { setupTriggers } from "./triggers.js";
import { setupStickerCommands } from "./stickers.js";
import { setupDiceGame } from "./dice.js";
import { setupUserReactions } from "./user-reactions.js";
import { setupTeaFeature } from "./tea.js";

export function setupFeatures(bot: Bot): void {
  // Команды /start и /help
  setupStartCommand(bot);

  // Команды стикеров
  setupStickerCommands(bot);

  // Игра в кубик
  setupDiceGame(bot);

  // Реакции на конкретных пользователей
  setupUserReactions(bot);

  // Чайная церемония
  setupTeaFeature(bot);

  // Триггеры на слова в сообщениях
  setupTriggers(bot);
}

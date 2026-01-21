import { Bot } from "grammy";

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error("BOT_TOKEN not set");
  process.exit(1);
}

const bot = new Bot(token);

const commands = [
  { command: "start", description: "Начать" },
  { command: "help", description: "Помощь" },
  { command: "sticker", description: "Получить file_id стикера" },
  { command: "emojiid", description: "Получить custom_emoji_id" },
  { command: "emoji", description: "Случайный эмодзи" },
  { command: "random", description: "Случайный стикер" },
  { command: "coffee", description: "Стикер кофе" },
  { command: "party", description: "Праздничный стикер" },
  { command: "mode", description: "Режим работы" },
  { command: "triggers", description: "Список триггеров" },
];

async function main() {
  await bot.api.setMyCommands(commands);
  console.log("Commands set successfully!");
  console.log(commands.map((c) => `/${c.command} - ${c.description}`).join("\n"));
}

main();

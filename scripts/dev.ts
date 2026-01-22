import { bot } from "../src/bot/index.js";

console.log("Starting bot in long polling mode...");
console.log("Press Ctrl+C to stop");

// Запускаем бота в long polling режиме для локальной разработки
bot.start({
  onStart: (botInfo) => {
    console.log(`✓ Bot @${botInfo.username} is running!`);
  },
});

// Graceful shutdown
process.once("SIGINT", () => {
  console.log("\nStopping bot...");
  bot.stop();
});

process.once("SIGTERM", () => {
  console.log("\nStopping bot...");
  bot.stop();
});

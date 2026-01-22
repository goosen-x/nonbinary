import { Bot } from "grammy";

export function setupUserReactions(bot: Bot): void {
  // Реакция на сообщения от конкретного пользователя
  bot.on("message", async (ctx, next) => {
    const username = ctx.from?.username;
    const random = Math.random();

    // Специальные реакции для конкретных пользователей (приоритет)
    if (username === "mputsman2" && random <= 0.01) {
      await ctx.reply("Миш, хватит стату набивать");
    } else if (random <= 0.05) {
      // Общая реакция для всех
      await ctx.reply("пэпэ");
    }

    await next();
  });
}

import { Bot } from "grammy";

export function setupUserReactions(bot: Bot): void {
  // Реакция на сообщения от конкретного пользователя
  bot.on("message", async (ctx, next) => {
    const username = ctx.from?.username;
    const random = Math.random();

    if (random <= 0.05) {
      await ctx.reply("пэпэ");
    }

    if (username === "mputsman2") {
      if (random <= 0.01) {
        await ctx.reply("Миш, хватит стату набивать");
      }
    }

    await next();
  });
}

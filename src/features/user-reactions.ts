import { Bot } from "grammy";

export function setupUserReactions(bot: Bot): void {
  // Реакция на сообщения от конкретного пользователя
  bot.on("message", async (ctx, next) => {
    const username = ctx.from?.username;

    if (username === "djbitchplease") {
      await ctx.reply("пэпэ");
    }

    await next();
  });
}

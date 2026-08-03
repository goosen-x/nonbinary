import { Bot } from "grammy";

export function setupRoulette(bot: Bot): void {
  // /roulette - русская рулетка (шутка, никаких реальных банов/мутов)
  bot.command("roulette", async (ctx) => {
    const name = ctx.from?.first_name || "Игрок";
    const chamber = Math.floor(Math.random() * 6) + 1; // 1..6
    const bullet = 1; // выстрел выпадает при значении 1 (шанс 1/6)

    await ctx.reply(`${name} крутит барабан... 🔫`);

    const deathPhrases = [
      `💥 БАБАХ! ${name}, тебя больше нет. Земля тебе пухом 🪦`,
      `💀 ${name} словил пулю. RIP, легенда 🕯️`,
      `🔫💥 Не повезло, ${name}! Патрон был в этой каморе`,
      `⚰️ ${name} вышел из чата навсегда. Шутка. Но выстрел был настоящий`,
    ];

    const survivePhrases = [
      `😮‍💨 Осечка! ${name} остаётся жить дальше`,
      `🔫 *click* — пусто. ${name}, тебе везёт`,
      `😅 Повезло, ${name}! Патрона в этой каморе не было`,
      `🍀 ${name} выжил. Барабан пуст в этот раз`,
    ];

    const phrases = chamber === bullet ? deathPhrases : survivePhrases;
    const message = phrases[Math.floor(Math.random() * phrases.length)];

    await ctx.reply(message);
  });
}

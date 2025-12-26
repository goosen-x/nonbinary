import { Bot } from "grammy";

export function setupStartCommand(bot: Bot): void {
  // Команда /start
  bot.command("start", async (ctx) => {
    const name = ctx.from?.first_name ?? "друг";

    await ctx.reply(
      `Привет, ${name}!\n\n` +
        `Я бот, который реагирует на определённые слова в чате.\n\n` +
        `Добавь меня в группу, и я буду отвечать на триггерные слова.`
    );
  });

  // Команда /help
  bot.command("help", async (ctx) => {
    await ctx.reply(
      `<b>Доступные команды:</b>\n\n` +
        `/start - Приветствие\n` +
        `/help - Справка\n` +
        `/triggers - Список активных триггеров`,
      { parse_mode: "HTML" }
    );
  });

  // Команда /triggers - показать список триггеров
  bot.command("triggers", async (ctx) => {
    // Импортируем триггеры динамически чтобы избежать циклических зависимостей
    const { triggers } = await import("../data/triggers.json", {
      with: { type: "json" },
    });

    if (triggers.length === 0) {
      await ctx.reply("Триггеры не настроены.");
      return;
    }

    const list = triggers
      .map((t, i) => `${i + 1}. <code>${t.pattern}</code> (${t.match})`)
      .join("\n");

    await ctx.reply(`<b>Активные триггеры:</b>\n\n${list}`, {
      parse_mode: "HTML",
    });
  });
}

import { Bot } from "grammy";

export function setupDiceGame(bot: Bot): void {
  // Реакция на кубик от пользователя — игра!
  bot.on("message:dice", async (ctx) => {
    // Только обычные кубики (не дартс, боулинг и т.д.)
    if (ctx.message.dice.emoji !== "🎲") return;

    const userValue = ctx.message.dice.value;
    const userName = ctx.from?.first_name || "Игрок";

    // Бот бросает свой кубик (анимация происходит на клиенте)
    const botRoll = await ctx.replyWithDice("🎲");
    const botValue = botRoll.dice?.value || 0;

    // Определяем победителя
    let message: string;

    if (userValue > botValue) {
      // Пользователь победил
      const winPhrases = [
        `${userName} - ну ты реально крутой! 🎉 ${userValue} против ${botValue}`,
        `Победа за ${userName}! 🏆 ${userValue}:${botValue}`,
        `Ты меня поимел... ${userValue}:${botValue} 😤`,
        `GG! ${userValue}:${botValue}! Меня унизили 👏`,
      ];
      message = winPhrases[Math.floor(Math.random() * winPhrases.length)];
    } else if (userValue < botValue) {
      // Бот победил
      const losePhrases = [
        `Ебать ты лох! 😎 ${botValue} против ${userValue}`,
        `Хаха, ${botValue}:${userValue}! Лососни тунца 😏`,
        `Сегодня тебя поимели, но тебе не привыкать... ${botValue}:${userValue} 🤷`,
        `${botValue}:${userValue} — я поймал удачу за яйца! 🍀`,
      ];
      message = losePhrases[Math.floor(Math.random() * losePhrases.length)];
    } else {
      // Ничья
      const drawPhrases = [
        `Ничья! ${userValue}:${botValue} 🤝`,
        `Оба выбросили ${userValue}! Реванш или зассал? 🔄`,
        `${userValue}:${botValue} — Тут не ясно кто лох! ⚖️`,
        `Ничья ${userValue}:${botValue}. Давай ещё, я тебя уничтожу! 🎲`,
      ];
      message = drawPhrases[Math.floor(Math.random() * drawPhrases.length)];
    }

    await ctx.reply(message);
  });
}

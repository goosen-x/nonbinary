import { Bot } from "grammy";

// Стикеры для команд
const STICKERS = {
  coffee: "", // добавь file_id стикера кофе
  party: "CAACAgIAAxkBAAPTaU4vPbAAAYfVqIPGD8QbX5C61OACAAKNXAACpYUBSD6CwMNL4kHcNgQ",
  random: [   // массив случайных стикеров
    // добавь несколько file_id
  ],
};

export function setupStickerCommands(bot: Bot): void {
  // /sticker - отправить стикер (нужен reply на стикер)
  bot.command("sticker", async (ctx) => {
    const reply = ctx.message?.reply_to_message;
    if (reply?.sticker) {
      await ctx.reply(`File ID: <code>${reply.sticker.file_id}</code>`, {
        parse_mode: "HTML",
      });
    } else {
      await ctx.reply("Ответь на стикер командой /sticker, чтобы получить его file_id");
    }
  });

  // /emoji - отправить эмодзи
  bot.command("emoji", async (ctx) => {
    const emojis = ["😀", "😎", "🔥", "💀", "🗿", "👀", "🤡", "💩", "🫠", "🤯"];
    const random = emojis[Math.floor(Math.random() * emojis.length)];
    await ctx.reply(random);
  });

  // /random - случайный стикер
  bot.command("random", async (ctx) => {
    if (STICKERS.random.length === 0) {
      await ctx.reply("Случайные стикеры не настроены");
      return;
    }
    const random = STICKERS.random[Math.floor(Math.random() * STICKERS.random.length)];
    await ctx.replyWithSticker(random);
  });

  // /coffee - стикер кофе
  bot.command("coffee", async (ctx) => {
    if (!STICKERS.coffee) {
      await ctx.reply("Стикер кофе не настроен. Отправь стикер и используй /sticker чтобы получить file_id");
      return;
    }
    await ctx.replyWithSticker(STICKERS.coffee);
  });

  // /party - праздничный стикер
  bot.command("party", async (ctx) => {
    if (!STICKERS.party) {
      await ctx.reply("Праздничный стикер не настроен");
      return;
    }
    await ctx.replyWithSticker(STICKERS.party);
  });

  // /mode - режим работы
  bot.command("mode", async (ctx) => {
    const chatType = ctx.chat?.type;
    const mode = chatType === "private" ? "Личные сообщения" : "Групповой чат";
    await ctx.reply(`Режим: ${mode}\nТип чата: ${chatType}`);
  });
}

import { Bot } from "grammy";

// Стикеры для команд
const STICKERS = {
  coffee: "CAACAgIAAxkBAAPlaU4wrKcI7TsFFx-tMFcicTPleu8AAptEAAKXKoBIzDrviqIAAXGZNgQ",
  party: "CAACAgIAAxkBAAPTaU4vPbAAAYfVqIPGD8QbX5C61OACAAKNXAACpYUBSD6CwMNL4kHcNgQ",
  // Название стикер-пака для /random (без https://t.me/addstickers/)
  randomPack: "", // например: "pelosipack" или "HotCherry"
};

export function setupStickerCommands(bot: Bot): void {
  // /sticker - получить file_id и название пака (ответь на стикер)
  bot.command("sticker", async (ctx) => {
    const reply = ctx.message?.reply_to_message;
    if (reply?.sticker) {
      const sticker = reply.sticker;
      let info = `<b>Sticker Info:</b>\n`;
      info += `File ID: <code>${sticker.file_id}</code>\n`;
      if (sticker.set_name) {
        info += `Pack: <code>${sticker.set_name}</code>\n`;
        info += `Link: https://t.me/addstickers/${sticker.set_name}`;
      }
      await ctx.reply(info, { parse_mode: "HTML" });
    } else {
      await ctx.reply("Ответь на стикер командой /sticker, чтобы получить его file_id и название пака");
    }
  });

  // /emoji - получить custom_emoji_id (ответь на сообщение с кастомным эмодзи)
  bot.command("emojiid", async (ctx) => {
    const reply = ctx.message?.reply_to_message;
    if (!reply) {
      await ctx.reply("Ответь на сообщение с кастомным эмодзи командой /emojiid");
      return;
    }

    const entities = reply.entities || reply.caption_entities || [];
    const customEmojis = entities.filter((e) => e.type === "custom_emoji");

    if (customEmojis.length === 0) {
      await ctx.reply("В сообщении нет кастомных эмодзи (только Premium эмодзи имеют ID)");
      return;
    }

    const ids = customEmojis
      .map((e) => `<code>${(e as { custom_emoji_id: string }).custom_emoji_id}</code>`)
      .join("\n");

    await ctx.reply(`<b>Custom Emoji IDs:</b>\n${ids}`, {
      parse_mode: "HTML",
    });
  });

  // /emoji - отправить эмодзи
  bot.command("emoji", async (ctx) => {
    const emojis = ["😀", "😎", "🔥", "💀", "🗿", "👀", "🤡", "💩", "🫠", "🤯"];
    const random = emojis[Math.floor(Math.random() * emojis.length)];
    await ctx.reply(random);
  });

  // /random - случайный стикер из пака
  bot.command("random", async (ctx) => {
    if (!STICKERS.randomPack) {
      await ctx.reply("Стикер-пак не настроен. Укажи название пака в коде.");
      return;
    }

    try {
      // Получаем все стикеры из пака
      const stickerSet = await ctx.api.getStickerSet(STICKERS.randomPack);
      const stickers = stickerSet.stickers;

      if (stickers.length === 0) {
        await ctx.reply("В паке нет стикеров");
        return;
      }

      // Выбираем случайный
      const randomSticker = stickers[Math.floor(Math.random() * stickers.length)];
      await ctx.replyWithSticker(randomSticker.file_id);
    } catch (error) {
      console.error("Error getting sticker set:", error);
      await ctx.reply("Не удалось загрузить стикер-пак. Проверь название.");
    }
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

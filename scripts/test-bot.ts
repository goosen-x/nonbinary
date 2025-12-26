import { Bot } from "grammy";

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is required");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

async function test() {
  try {
    const me = await bot.api.getMe();
    console.log("Bot connected successfully!");
    console.log("Username: @" + me.username);
    console.log("Name:", me.first_name);
    console.log("Can join groups:", me.can_join_groups);
    console.log("Can read group messages:", me.can_read_all_group_messages);
  } catch (error) {
    console.error("Failed to connect:", error);
  }
}

test();

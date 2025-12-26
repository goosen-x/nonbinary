import { Bot } from "grammy";

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is required");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

async function check() {
  const info = await bot.api.getWebhookInfo();
  console.log("Webhook URL:", info.url);
  console.log("Pending updates:", info.pending_update_count);
  console.log("Last error:", info.last_error_message || "None");
  console.log(
    "Last error date:",
    info.last_error_date ? new Date(info.last_error_date * 1000) : "None"
  );
}

check();

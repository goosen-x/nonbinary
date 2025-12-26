import { Bot } from "grammy";

// Загружаем переменные окружения
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is required");
  process.exit(1);
}

if (!WEBHOOK_URL) {
  console.error("WEBHOOK_URL is required (e.g., https://your-app.vercel.app)");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

async function setWebhook(): Promise<void> {
  try {
    // Удаляем старый webhook
    await bot.api.deleteWebhook();
    console.log("Old webhook deleted");

    // Устанавливаем новый webhook
    const webhookUrl = `${WEBHOOK_URL}/api/webhook`;

    await bot.api.setWebhook(webhookUrl, {
      secret_token: WEBHOOK_SECRET,
      allowed_updates: ["message", "callback_query"],
    });

    console.log(`Webhook set to: ${webhookUrl}`);

    // Проверяем информацию о webhook
    const info = await bot.api.getWebhookInfo();
    console.log("\nWebhook info:");
    console.log(`  URL: ${info.url}`);
    console.log(`  Has custom certificate: ${info.has_custom_certificate}`);
    console.log(`  Pending update count: ${info.pending_update_count}`);

    if (info.last_error_message) {
      console.log(`  Last error: ${info.last_error_message}`);
    }
  } catch (error) {
    console.error("Failed to set webhook:", error);
    process.exit(1);
  }
}

setWebhook();

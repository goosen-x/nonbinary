import type { VercelRequest, VercelResponse } from "@vercel/node";
import { webhookCallback } from "grammy";
import { bot } from "../src/bot/index.js";
import { env } from "../src/config/index.js";

// Создаём handler для Vercel
// timeoutMilliseconds меньше maxDuration из vercel.json (10s),
// чтобы успеть ответить Telegram 200 и не получить retry с дублем
const handleUpdate = webhookCallback(bot, "std/http", {
  secretToken: env.WEBHOOK_SECRET,
  timeoutMilliseconds: 9000,
  onTimeout: "return",
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Только POST запросы
  if (req.method !== "POST") {
    res.status(200).json({ status: "ok", method: req.method });
    return;
  }

  try {
    // Преобразуем Vercel request в стандартный Request
    const request = new Request(
      `https://${req.headers.host}${req.url}`,
      {
        method: req.method,
        headers: req.headers as HeadersInit,
        body: JSON.stringify(req.body),
      }
    );

    // Обрабатываем update
    const response = await handleUpdate(request);

    // Отправляем ответ
    res.status(response.status).end();
  } catch (error) {
    // Отвечаем 200, иначе Telegram будет ретраить update и плодить дубли
    console.error("Webhook error:", error);
    res.status(200).end();
  }
}

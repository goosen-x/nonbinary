import type { VercelRequest, VercelResponse } from "@vercel/node";
import { webhookCallback } from "grammy";
import { bot } from "../src/bot/index.js";

// Создаём handler для Vercel
const handleUpdate = webhookCallback(bot, "std/http", {
  secretToken: process.env.WEBHOOK_SECRET,
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
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

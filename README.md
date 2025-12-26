# nonbinary

Telegram-бот с триггерами на слова. Добавь в групповой чат — бот будет реагировать на определённые слова.

## Стек

- **grammY** — Telegram Bot Framework
- **TypeScript**
- **Vercel** — Serverless деплой

## Быстрый старт

```bash
# Установка
npm install

# Локальная разработка
npm run dev

# Проверка типов
npm run typecheck
```

## Настройка

1. Создай бота через [@BotFather](https://t.me/BotFather)
2. Скопируй `.env.example` → `.env.local`
3. Заполни `BOT_TOKEN`

## Триггеры

Редактируй `src/data/triggers.json`:

```json
{
  "triggers": [
    {
      "pattern": "привет",
      "match": "contains",
      "response": {
        "type": "text",
        "content": "Привет!"
      },
      "replyToMessage": true
    }
  ]
}
```

**Типы match:**
- `exact` — точное совпадение
- `contains` — слово содержится в сообщении
- `regex` — регулярное выражение

**Типы response:**
- `text` — текст
- `sticker` — стикер (file_id)
- `animation` — GIF

## Деплой

```bash
vercel --prod
```

## Команды бота

- `/start` — приветствие
- `/help` — справка
- `/triggers` — список триггеров

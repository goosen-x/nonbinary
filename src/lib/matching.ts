// Матчинг текста на паттерны триггеров.
// Используется ботом (features/triggers.ts) и скриптом бэкфила статистики.

export type MatchType = "exact" | "contains" | "regex";

export interface Matchable {
  pattern?: string;
  patterns?: string[];
  match: MatchType;
}

// Результат матчинга
export interface TriggerMatch {
  matched: boolean;
  quote?: string; // Точный текст из сообщения для цитирования
}

function isWordChar(ch: string | undefined): boolean {
  return !!ch && /[0-9a-zа-яё]/i.test(ch);
}

// Проверяет один паттерн
export function matchSinglePattern(
  text: string,
  pattern: string,
  matchType: MatchType,
): TriggerMatch {
  const lowerText = text.toLowerCase();
  const lowerPattern = pattern.toLowerCase();

  switch (matchType) {
    case "exact":
      if (lowerText === lowerPattern) {
        return { matched: true, quote: text };
      }
      return { matched: false };

    case "contains": {
      // Паттерн должен стоять в начале слова: «негра» матчится, «книга» — нет.
      // Окончания слова после паттерна допускаем, чтобы ловить словоформы.
      let index = lowerText.indexOf(lowerPattern);
      while (index > 0 && isWordChar(lowerText[index - 1])) {
        index = lowerText.indexOf(lowerPattern, index + 1);
      }
      if (index !== -1) {
        const quote = text.substring(index, index + pattern.length);
        return { matched: true, quote };
      }
      return { matched: false };
    }

    case "regex":
      try {
        const regex = new RegExp(pattern, "i");
        const match = text.match(regex);
        if (match) {
          return { matched: true, quote: match[0] };
        }
        return { matched: false };
      } catch {
        console.error(`Invalid regex pattern: ${pattern}`);
        return { matched: false };
      }

    default:
      return { matched: false };
  }
}

// Проверяет, совпадает ли сообщение с каким-либо паттерном триггера
export function matchTrigger(text: string, trigger: Matchable): TriggerMatch {
  const patterns: string[] = [];

  if (trigger.pattern) {
    patterns.push(trigger.pattern);
  }

  if (trigger.patterns) {
    patterns.push(...trigger.patterns);
  }

  for (const pattern of patterns) {
    const result = matchSinglePattern(text, pattern, trigger.match);
    if (result.matched) {
      return result;
    }
  }

  return { matched: false };
}

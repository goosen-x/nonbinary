// Недели считаем по Москве (UTC+3), понедельник — начало
const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

// Храним ключ недели 35 дней — хватит, чтобы показать прошлую неделю
export const WEEK_TTL_SECONDS = 35 * 24 * 60 * 60;

// Понедельник недели, в которую попадает момент времени (по МСК)
export function mondayOf(unixSeconds: number): Date {
  const msk = new Date(unixSeconds * 1000 + MSK_OFFSET_MS);
  const daysSinceMonday = (msk.getUTCDay() + 6) % 7;
  return new Date(
    Date.UTC(
      msk.getUTCFullYear(),
      msk.getUTCMonth(),
      msk.getUTCDate() - daysSinceMonday,
    ),
  );
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

export function weekKey(monday: Date): string {
  return monday.toISOString().slice(0, 10);
}

export function fmtDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getUTCFullYear()}`;
}

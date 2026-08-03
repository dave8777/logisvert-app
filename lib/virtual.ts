// Rendez-vous d'estimation virtuelle : créneaux de 30 min, jours ouvrables,
// heures d'affaires 9 h à 17 h (heure de Montréal), 14 jours à l'avance.
// Partagé entre la page /virtuel et les routes API.

export const SLOT_MINUTES = 30;
export const DAY_START_MIN = 9 * 60;
export const DAY_END_MIN = 17 * 60;
export const MAX_DAYS_AHEAD = 14;

export function slotTimes(): string[] {
  const out: string[] = [];
  for (let m = DAY_START_MIN; m + SLOT_MINUTES <= DAY_END_MIN; m += SLOT_MINUTES) {
    const h = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    out.push(`${h}:${mm}`);
  }
  return out;
}

// Date et heure actuelles à Montréal, indépendamment du fuseau du serveur.
export function montrealNow(): { date: string; hm: string } {
  const s = new Date().toLocaleString("sv-SE", { timeZone: "America/Toronto" });
  return { date: s.slice(0, 10), hm: s.slice(11, 16) };
}

export function isWeekday(dateStr: string): boolean {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const dow = d.getUTCDay();
  return dow >= 1 && dow <= 5;
}

export function isBookableSlot(dateStr: string, time: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  if (!slotTimes().includes(time)) return false;
  if (!isWeekday(dateStr)) return false;
  const now = montrealNow();
  if (dateStr < now.date) return false;
  if (dateStr === now.date && time <= now.hm) return false;
  const max = new Date(Date.now() + MAX_DAYS_AHEAD * 86400_000)
    .toISOString()
    .slice(0, 10);
  return dateStr <= max;
}

// Les jours proposables au client, à partir d'aujourd'hui (Montréal).
export function bookableDays(): string[] {
  const out: string[] = [];
  const now = montrealNow();
  const start = new Date(`${now.date}T12:00:00Z`);
  for (let i = 0; i <= MAX_DAYS_AHEAD && out.length < 10; i++) {
    const d = new Date(start.getTime() + i * 86400_000);
    const dateStr = d.toISOString().slice(0, 10);
    if (!isWeekday(dateStr)) continue;
    // aujourd'hui seulement s'il reste au moins un créneau
    if (dateStr === now.date && !slotTimes().some((t) => t > now.hm)) continue;
    out.push(dateStr);
  }
  return out;
}

export const BOOKINGS_PREFIX = "virtual-bookings/";

export function bookingsKey(dateStr: string): string {
  return `${BOOKINGS_PREFIX}${dateStr}.json`;
}

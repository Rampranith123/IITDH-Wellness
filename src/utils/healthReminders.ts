import { DAYS, formatTime12h, toIsoDate } from '../data/wellnessData';

export type ReminderCategory = 'medication' | 'appointment';
export type ReminderFrequency = 'daily' | 'weekdays' | 'weekly';

export interface HealthReminder {
  id: string;
  title: string;
  category: ReminderCategory;
  time: string; // "HH:MM"
  frequency: ReminderFrequency;
  dayOfWeek: number; // 0..6 for weekly
  notes: string;
  enabled: boolean;
  lastTriggeredKey?: string; // "YYYY-MM-DDTHH:MM"
  snoozeUntil?: string; // "YYYY-MM-DDTHH:MM"
  createdAt: string;
}

const STORAGE_KEY = 'iitdh_wellness_reminders_v1';
export const REMINDERS_UPDATED_EVENT = 'iitdh-reminders-updated';
export const TEST_REMINDER_EVENT = 'iitdh-test-reminder';

export function loadHealthReminders(): HealthReminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HealthReminder[]) : [];
  } catch {
    return [];
  }
}

export function saveHealthReminders(list: HealthReminder[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(REMINDERS_UPDATED_EVENT));
  } catch {
    // ignore storage quota errors
  }
}

export function triggerTestReminderAlert(reminder: HealthReminder): void {
  window.dispatchEvent(new CustomEvent(TEST_REMINDER_EVENT, { detail: reminder }));
}

export function formatReminderSchedule(r: HealthReminder): string {
  const timeStr = formatTime12h(r.time);
  if (r.frequency === 'daily') return `Daily · ${timeStr}`;
  if (r.frequency === 'weekdays') return `Weekdays (Mon–Fri) · ${timeStr}`;
  return `Every ${DAYS[r.dayOfWeek] || 'Week'} · ${timeStr}`;
}

export function currentSlotKey(now: Date = new Date()): { date: string; hhmm: string; full: string } {
  const pad = (n: number) => (n < 10 ? '0' : '') + n;
  const date = toIsoDate(now);
  const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return { date, hhmm, full: `${date}T${hhmm}` };
}

export function doesReminderMatchDay(r: HealthReminder, now: Date): boolean {
  const day = now.getDay();
  if (r.frequency === 'daily') return true;
  if (r.frequency === 'weekdays') return day >= 1 && day <= 5;
  return day === r.dayOfWeek;
}

export function checkDueReminders(now: Date = new Date()): HealthReminder[] {
  const list = loadHealthReminders();
  const { hhmm, full } = currentSlotKey(now);
  const due: HealthReminder[] = [];
  let changed = false;

  const next = list.map((r) => {
    if (!r.enabled) return r;

    const snoozeHit = r.snoozeUntil && r.snoozeUntil === full;
    const scheduleHit = doesReminderMatchDay(r, now) && r.time === hhmm;

    if ((snoozeHit || scheduleHit) && r.lastTriggeredKey !== full) {
      due.push(r);
      changed = true;
      return { ...r, lastTriggeredKey: full, snoozeUntil: undefined };
    }
    return r;
  });

  if (changed) {
    saveHealthReminders(next);
  }

  return due;
}

export function snoozeHealthReminder(id: string, minutes = 10): void {
  const target = new Date(Date.now() + minutes * 60000);
  const { full } = currentSlotKey(target);
  const list = loadHealthReminders().map((r) =>
    r.id === id ? { ...r, snoozeUntil: full } : r
  );
  saveHealthReminders(list);
}

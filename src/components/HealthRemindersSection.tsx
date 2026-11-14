import React, { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, Pill, Plus, Trash2 } from 'lucide-react';
import { DAYS } from '../data/wellnessData';
import {
  HealthReminder,
  REMINDERS_UPDATED_EVENT,
  ReminderCategory,
  ReminderFrequency,
  formatReminderSchedule,
  loadHealthReminders,
  saveHealthReminders,
  triggerTestReminderAlert,
} from '../utils/healthReminders';

export function HealthRemindersSection() {
  const [reminders, setReminders] = useState<HealthReminder[]>(() => loadHealthReminders());
  const [category, setCategory] = useState<ReminderCategory>('medication');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00');
  const [frequency, setFrequency] = useState<ReminderFrequency>('daily');
  const [dayOfWeek, setDayOfWeek] = useState<number>(() => new Date().getDay());
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setReminders(loadHealthReminders());
    window.addEventListener(REMINDERS_UPDATED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(REMINDERS_UPDATED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  function handleAddReminder(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setFormError('Enter a reminder title (e.g. Vitamin D3 or OPD Follow-up).');
      return;
    }
    if (!time) {
      setFormError('Select a reminder time.');
      return;
    }

    const newItem: HealthReminder = {
      id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: cleanTitle.slice(0, 80),
      category,
      time,
      frequency,
      dayOfWeek,
      notes: notes.trim().slice(0, 160),
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    const next = [...reminders, newItem].sort((a, b) => a.time.localeCompare(b.time));
    setReminders(next);
    saveHealthReminders(next);
    setTitle('');
    setNotes('');
  }

  function handleToggle(id: string) {
    const next = reminders.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    setReminders(next);
    saveHealthReminders(next);
  }

  function handleDelete(id: string) {
    const next = reminders.filter((r) => r.id !== id);
    setReminders(next);
    saveHealthReminders(next);
  }

  return (
    <section className="space-y-4 pt-2 border-t border-[#cfe0dd]/70 dark:border-white/10">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pt-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0f2422] dark:text-white">
            Health Reminders
          </h2>
          <p className="text-xs sm:text-sm text-[#476360] dark:text-[#9ab3b0] mt-0.5">
            Set recurring medication or appointment alerts stored locally in your browser.
          </p>
        </div>
        <span className="font-mono-tabular text-xs text-[#476360] dark:text-[#9ab3b0]">
          {reminders.filter((r) => r.enabled).length} active
        </span>
      </div>

      <div className="grid xl:grid-cols-12 gap-6 items-start">
        {/* Add Reminder Form */}
        <form onSubmit={handleAddReminder} className="xl:col-span-5 rounded-2xl glass-panel p-5 space-y-4">
          <div
            role="group"
            aria-label="Reminder type"
            className="grid grid-cols-2 rounded-xl glass-inset p-1 gap-1"
          >
            <button
              type="button"
              onClick={() => setCategory('medication')}
              className={`inline-flex items-center justify-center gap-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                category === 'medication'
                  ? 'bg-white dark:bg-[#132623] text-[#0f2422] dark:text-white shadow-xs'
                  : 'text-[#476360] dark:text-[#9ab3b0]'
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              Medication
            </button>
            <button
              type="button"
              onClick={() => setCategory('appointment')}
              className={`inline-flex items-center justify-center gap-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                category === 'appointment'
                  ? 'bg-white dark:bg-[#132623] text-[#0f2422] dark:text-white shadow-xs'
                  : 'text-[#476360] dark:text-[#9ab3b0]'
              }`}
            >
              <BellRing className="w-3.5 h-3.5" />
              Appointment
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
              Reminder Title
            </label>
            <input
              type="text"
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                category === 'medication'
                  ? 'e.g., Vitamin D3 · 1 tablet'
                  : 'e.g., ENT Check-up at Wellness Centre'
              }
              className="w-full min-h-[42px] rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
                Time
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="font-mono-tabular w-full min-h-[42px] rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
                Recurrence
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as ReminderFrequency)}
                className="w-full min-h-[42px] rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
              >
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays (Mon–Fri)</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          {frequency === 'weekly' && (
            <div>
              <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
                Day of Week
              </label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="w-full min-h-[42px] rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
              >
                {DAYS.map((d, idx) => (
                  <option key={d} value={idx}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
              Note (optional)
            </label>
            <input
              type="text"
              maxLength={160}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., After breakfast with water"
              className="w-full min-h-[42px] rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
            />
          </div>

          {formError && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">{formError}</p>
          )}

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#0f766e] text-white text-sm font-semibold hover:bg-[#0d645d] dark:bg-[#2dd4bf] dark:text-[#06201d] dark:hover:bg-[#14b8a6] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add reminder
          </button>
        </form>

        {/* Reminders List */}
        <div className="xl:col-span-7 space-y-3">
          {reminders.length > 0 ? (
            reminders.map((rem) => {
              const Icon = rem.category === 'medication' ? Pill : BellRing;
              return (
                <article
                  key={rem.id}
                  className={`rounded-2xl glass-panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    rem.enabled ? '' : 'opacity-65'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl glass-inset text-[#0f766e] dark:text-[#2dd4bf] shrink-0 mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <h3 className="font-display text-base font-bold text-[#0f2422] dark:text-white">
                          {rem.title}
                        </h3>
                        <span
                          className={`text-xs font-semibold ${
                            rem.enabled
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-[#476360] dark:text-[#9ab3b0]'
                          }`}
                        >
                          {rem.enabled ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono-tabular text-xs text-[#476360] dark:text-[#9ab3b0]">
                        {rem.category === 'medication' ? 'Medication' : 'Appointment'} ·{' '}
                        {formatReminderSchedule(rem)}
                      </p>
                      {rem.notes && (
                        <p className="mt-1 text-xs text-[#476360] dark:text-[#9ab3b0]">
                          {rem.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => triggerTestReminderAlert(rem)}
                      className="min-h-[36px] px-3 py-1.5 rounded-xl glass-input text-xs font-semibold text-[#0f766e] dark:text-[#2dd4bf] hover:border-[#0f766e] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Test alert
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle(rem.id)}
                      aria-label={rem.enabled ? 'Pause reminder' : 'Enable reminder'}
                      className="inline-flex items-center gap-1 min-h-[36px] px-3 py-1.5 rounded-xl glass-input text-xs font-semibold text-[#476360] dark:text-[#9ab3b0] hover:text-[#0f2422] dark:hover:text-white transition-colors cursor-pointer"
                    >
                      {rem.enabled ? (
                        <>
                          <BellOff className="w-3.5 h-3.5" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Bell className="w-3.5 h-3.5" />
                          Resume
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(rem.id)}
                      aria-label={`Delete ${rem.title}`}
                      className="inline-flex items-center justify-center min-h-[36px] min-w-[36px] rounded-xl glass-input text-[#476360] dark:text-[#9ab3b0] hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl glass-panel p-8 text-center space-y-1.5">
              <p className="text-sm font-medium text-[#0f2422] dark:text-white">
                No health reminders configured
              </p>
              <p className="text-xs text-[#476360] dark:text-[#9ab3b0]">
                Add a medication or appointment reminder on the left to receive on-screen alerts
                while using the app.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

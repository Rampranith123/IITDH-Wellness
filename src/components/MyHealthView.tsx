import React, { useMemo, useState } from 'react';
import {
  CalendarCheck2,
  CalendarPlus,
  CheckCircle2,
  Clock,
  RotateCcw,
  Smartphone,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWellnessData } from '../context/WellnessDataContext';
import {
  downloadAppointmentIcs,
  formatTime12h,
  toIsoDate,
} from '../data/wellnessData';
import type { AppView, AppointmentRecord } from '../types/wellness';
import { HealthRemindersSection } from './HealthRemindersSection';
import { MoodTrackerCard } from './MoodTrackerCard';

interface MyHealthViewProps {
  onNavigate: (view: AppView, arg?: string) => void;
}

type AppointmentTab = 'all' | 'upcoming' | 'past';

function getStatusIndicator(appt: AppointmentRecord, isPastTime: boolean) {
  if (appt.status === 'completed') {
    return {
      label: 'Completed',
      colorClass: 'text-emerald-700 dark:text-emerald-400',
      Icon: CalendarCheck2,
    };
  }
  if (appt.status === 'cancelled') {
    return {
      label: 'Cancelled',
      colorClass: 'text-red-600 dark:text-red-400',
      Icon: XCircle,
    };
  }
  if (appt.status === 'confirmed') {
    return {
      label: isPastTime ? 'Confirmed · Past' : 'Confirmed',
      colorClass: 'text-emerald-700 dark:text-emerald-400',
      Icon: CheckCircle2,
    };
  }
  if (appt.isLocalOnly) {
    return {
      label: isPastTime ? 'Saved on device · Past' : 'Saved on device',
      colorClass: 'text-[#0f766e] dark:text-[#2dd4bf]',
      Icon: Smartphone,
    };
  }
  return {
    label: isPastTime ? 'Pending · Elapsed' : 'Pending review',
    colorClass: 'text-amber-700 dark:text-amber-400',
    Icon: Clock,
  };
}

export function MyHealthView({ onNavigate }: MyHealthViewProps) {
  const { firebaseUser } = useAuth();
  const { appointments, moods, cancelAppointment, saveMoodCheckIn } = useWellnessData();

  const now = new Date();
  const today = toIsoDate(now);
  const pad = (n: number) => (n < 10 ? '0' : '') + n;
  const nowKey = `${today}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const [apptTab, setApptTab] = useState<AppointmentTab>('all');

  const { upcomingAppointments, pastAppointments } = useMemo(() => {
    const upcoming: AppointmentRecord[] = [];
    const past: AppointmentRecord[] = [];

    for (const appt of appointments) {
      const slotKey = `${appt.date}T${appt.time}`;
      const isTerminal = appt.status === 'completed' || appt.status === 'cancelled';
      const isElapsed = slotKey < nowKey;

      if (!isTerminal && !isElapsed) {
        upcoming.push(appt);
      } else {
        past.push(appt);
      }
    }

    upcoming.sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
    past.sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));

    return { upcomingAppointments: upcoming, pastAppointments: past };
  }, [appointments, nowKey]);

  function renderAppointmentCard(appt: AppointmentRecord, isPastSection: boolean) {
    const slotKey = `${appt.date}T${appt.time}`;
    const isPastTime = slotKey < nowKey;
    const { label, colorClass, Icon } = getStatusIndicator(appt, isPastTime);
    const isTerminal = appt.status === 'completed' || appt.status === 'cancelled';

    return (
      <article
        key={appt.id}
        className={`rounded-2xl glass-panel p-5 space-y-3 ${isPastSection ? 'opacity-90' : ''}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="font-display text-base font-bold text-[#0f2422] dark:text-white">
              {appt.doctorName}
            </h4>
            <p className="text-xs sm:text-sm text-[#476360] dark:text-[#9ab3b0]">
              {appt.doctorSpec} ·{' '}
              <span className="font-mono-tabular">
                {appt.date} · {formatTime12h(appt.time)}
              </span>
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${colorClass}`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{label}</span>
          </span>
        </div>

        {appt.reason && (
          <p className="text-sm text-[#263f3c] dark:text-[#c7dcd9]">Note: {appt.reason}</p>
        )}

        {appt.doctorNotes && (
          <div className="rounded-xl glass-inset p-3 text-sm text-[#0f2422] dark:text-[#d8efec]">
            <span className="text-xs font-semibold text-[#0f766e] dark:text-[#2dd4bf] block mb-0.5">
              Doctor&apos;s guidance
            </span>
            {appt.doctorNotes}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {!isPastSection && !isTerminal && (
            <button
              type="button"
              onClick={() => downloadAppointmentIcs(appt)}
              className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#0f766e] text-white text-xs font-semibold hover:bg-[#0d645d] dark:bg-[#2dd4bf] dark:text-[#06201d] dark:hover:bg-[#14b8a6] transition-colors cursor-pointer"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              Add to calendar
            </button>
          )}
          {isPastSection && (
            <button
              type="button"
              onClick={() => onNavigate('book', appt.doctorId)}
              className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#0f766e] text-[#0f766e] dark:border-[#2dd4bf] dark:text-[#2dd4bf] text-xs font-semibold hover:bg-teal-50/70 dark:hover:bg-teal-950/30 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Book again
            </button>
          )}
          {((!isTerminal && !isPastSection) || appt.isLocalOnly) && (
            <button
              type="button"
              onClick={() => cancelAppointment(appt)}
              className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-xl glass-input text-xs font-semibold text-[#476360] dark:text-[#9ab3b0] hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {appt.isLocalOnly ? 'Remove' : 'Cancel'}
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#cfe0dd]/70 dark:border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0f2422] dark:text-white">
            My Health
          </h1>
          <p className="mt-1 text-sm text-[#476360] dark:text-[#9ab3b0]">
            {firebaseUser
              ? 'Synced to your private student account.'
              : 'Stored privately on this device. Sign in as a Student to sync across devices.'}
          </p>
        </div>
        {!firebaseUser && (
          <button
            type="button"
            onClick={() => onNavigate('auth')}
            className="min-h-[40px] px-4 py-2 rounded-xl border border-[#0f766e] text-[#0f766e] dark:border-[#2dd4bf] dark:text-[#2dd4bf] text-xs sm:text-sm font-semibold hover:bg-teal-50/70 dark:hover:bg-teal-950/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Student Sign In
          </button>
        )}
      </div>

      <div className="grid xl:grid-cols-12 gap-8 items-start">
        {/* Appointments Column */}
        <section className="xl:col-span-7 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-[#0f2422] dark:text-white">
              My appointments
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('doctors')}
              className="text-xs sm:text-sm font-semibold text-[#0f766e] dark:text-[#2dd4bf] hover:underline cursor-pointer"
            >
              Book new appointment
            </button>
          </div>

          {/* Segmented Filter Tabs */}
          <div
            role="group"
            aria-label="Filter appointments by timeline"
            className="inline-flex items-center rounded-xl glass-inset p-1 gap-1"
          >
            {(
              [
                { id: 'all', label: `All (${appointments.length})` },
                { id: 'upcoming', label: `Upcoming (${upcomingAppointments.length})` },
                { id: 'past', label: `Past (${pastAppointments.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setApptTab(tab.id)}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium font-mono-tabular transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  apptTab === tab.id
                    ? 'bg-white dark:bg-[#132623] text-[#0f2422] dark:text-white shadow-xs'
                    : 'text-[#476360] dark:text-[#9ab3b0] hover:text-[#0f2422] dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {appointments.length === 0 ? (
            <div className="rounded-2xl glass-panel p-8 text-center space-y-3">
              <p className="text-sm text-[#476360] dark:text-[#9ab3b0]">
                No appointments saved yet. Book from the Doctors or Counselling page.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('doctors')}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0f766e] text-white text-xs font-semibold hover:bg-[#0d645d] cursor-pointer"
                >
                  Browse Doctors
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('counselling')}
                  className="min-h-[40px] px-4 py-2 rounded-xl glass-input text-xs font-semibold cursor-pointer"
                >
                  Counselling
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Upcoming Appointments Section */}
              {(apptTab === 'all' || apptTab === 'upcoming') && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-[#476360] dark:text-[#9ab3b0]">
                    Upcoming ({upcomingAppointments.length})
                  </h3>
                  {upcomingAppointments.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingAppointments.map((appt) => renderAppointmentCard(appt, false))}
                    </div>
                  ) : (
                    <div className="rounded-2xl glass-panel p-5 text-sm text-[#476360] dark:text-[#9ab3b0]">
                      No upcoming appointments scheduled.
                    </div>
                  )}
                </div>
              )}

              {/* Past Appointments Section */}
              {(apptTab === 'all' || apptTab === 'past') && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-[#476360] dark:text-[#9ab3b0]">
                    Past &amp; Completed ({pastAppointments.length})
                  </h3>
                  {pastAppointments.length > 0 ? (
                    <div className="space-y-3">
                      {pastAppointments.map((appt) => renderAppointmentCard(appt, true))}
                    </div>
                  ) : (
                    <div className="rounded-2xl glass-panel p-5 text-sm text-[#476360] dark:text-[#9ab3b0]">
                      No past appointments recorded yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Private Mood Tracker Column */}
        <div className="xl:col-span-5">
          <MoodTrackerCard
            moods={moods}
            onSaveMood={saveMoodCheckIn}
            onNavigate={(v) => onNavigate(v)}
          />
        </div>
      </div>

      {/* Local Browser Health Reminders */}
      <HealthRemindersSection />
    </div>
  );
}

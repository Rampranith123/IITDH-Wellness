import React, { useState } from 'react';
import { ArrowLeft, CalendarPlus, CheckCircle2, ExternalLink, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWellnessData } from '../context/WellnessDataContext';
import {
  ALL_PRACTITIONERS,
  COUNSELLORS,
  DOCTORS,
  WELLNESS_LINKS,
  downloadAppointmentIcs,
  toIsoDate,
} from '../data/wellnessData';
import type { AppView, AppointmentRecord } from '../types/wellness';

interface BookingViewProps {
  practitionerId: string;
  onNavigate: (view: AppView, arg?: string) => void;
}

export function BookingView({ practitionerId, onNavigate }: BookingViewProps) {
  const { user, profile } = useAuth();
  const { bookAppointment, localUhid } = useWellnessData();

  const practitioner = ALL_PRACTITIONERS.find((p) => p.id === practitionerId);
  const doctorInfo = DOCTORS.find((d) => d.id === practitionerId);
  const isCounsellor = COUNSELLORS.some((c) => c.id === practitionerId);

  const today = toIsoDate(new Date());
  const defaultTime = doctorInfo?.slots[0]?.start || '15:00';

  const [date, setDate] = useState(today);
  const [time, setTime] = useState(defaultTime);
  const [reason, setReason] = useState('');
  const [studentName, setStudentName] = useState(
    profile?.displayName || localUhid.name || ''
  );
  const [studentRoll, setStudentRoll] = useState(
    profile?.rollNumber || localUhid.roll || ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdAppt, setCreatedAppt] = useState<AppointmentRecord | null>(null);

  if (!practitioner) {
    return (
      <div className="rounded-2xl glass-panel p-8 text-center space-y-3">
        <p className="text-sm text-[#476360] dark:text-[#9ab3b0]">Practitioner not found.</p>
        <button
          type="button"
          onClick={() => onNavigate('doctors')}
          className="text-sm font-semibold text-[#0f766e] dark:text-[#2dd4bf] hover:underline cursor-pointer"
        >
          Back to Doctors
        </button>
      </div>
    );
  }

  const officialBookKey = 'bookKey' in practitioner ? practitioner.bookKey : undefined;
  const officialUrl = officialBookKey ? WELLNESS_LINKS[officialBookKey] : '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!practitioner) return;
    setErrorMsg(null);
    if (!date || !time) {
      setErrorMsg('Please select a date and time.');
      return;
    }
    setSubmitting(true);
    try {
      const record = await bookAppointment({
        doctorId: practitioner.id,
        date,
        time,
        reason,
        studentName: studentName.trim() || 'Student',
        studentRoll: studentRoll.trim(),
      });
      setCreatedAppt(record);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save appointment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => onNavigate(isCounsellor ? 'counselling' : 'doctors')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#476360] dark:text-[#9ab3b0] hover:text-[#0f766e] dark:hover:text-[#2dd4bf] cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {isCounsellor ? 'Counselling' : 'Doctors'}
      </button>

      <div className="border-b border-[#cfe0dd]/70 dark:border-white/10 pb-4">
        <p className="text-xs font-medium text-[#0f766e] dark:text-[#2dd4bf]">
          {practitioner.spec}
        </p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#0f2422] dark:text-white">
          {practitioner.name}
        </h1>
        <p className="mt-1 font-mono-tabular text-xs sm:text-sm text-[#476360] dark:text-[#9ab3b0]">
          {practitioner.qual} · {practitioner.when}
        </p>
      </div>

      {officialUrl && (
        <div className="rounded-2xl border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-950/30 backdrop-blur-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200">
            Official booking confirms your slot. Book there first, then save a reminder here.
          </p>
          <a
            href={officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 min-h-[38px] px-4 py-2 rounded-xl bg-amber-900 text-white text-xs font-semibold shrink-0"
          >
            Open official booking
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {!user && (
        <div className="rounded-2xl glass-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#476360] dark:text-[#9ab3b0]">
            <Info className="w-4 h-4 text-[#0f766e] dark:text-[#2dd4bf] shrink-0 mt-0.5" />
            <span>
              You are browsing as a guest. This reminder saves only on this device unless you sign
              in as a student to send it directly to the Wellness Centre queue.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('auth')}
            className="min-h-[38px] px-4 py-2 rounded-xl border border-[#0f766e] text-[#0f766e] dark:border-[#2dd4bf] dark:text-[#2dd4bf] text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Student Sign In
          </button>
        </div>
      )}

      {createdAppt ? (
        <div className="rounded-2xl glass-panel p-6 space-y-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-xl font-bold text-[#0f2422] dark:text-white">
                {createdAppt.isLocalOnly ? 'Saved to this device' : 'Appointment request sent'}
              </h2>
              <p className="mt-1 text-sm text-[#476360] dark:text-[#9ab3b0]">
                {createdAppt.doctorName} ·{' '}
                <span className="font-mono-tabular">
                  {createdAppt.date} at {createdAppt.time}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => downloadAppointmentIcs(createdAppt)}
              className="inline-flex items-center gap-2 min-h-[42px] px-5 py-2 rounded-xl bg-[#0f766e] text-white text-sm font-semibold hover:bg-[#0d645d] transition-colors cursor-pointer"
            >
              <CalendarPlus className="w-4 h-4" />
              Add to calendar (.ics)
            </button>
            <button
              type="button"
              onClick={() => onNavigate('me')}
              className="min-h-[42px] px-5 py-2 rounded-xl glass-input text-sm font-semibold hover:border-[#0f766e] transition-colors cursor-pointer"
            >
              View My Appointments
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-2xl glass-panel p-6 space-y-4">
          {errorMsg && (
            <div className="rounded-xl border border-red-300/70 dark:border-red-500/30 bg-red-50/85 dark:bg-red-950/35 px-3 py-2 text-sm text-red-700 dark:text-red-200">
              {errorMsg}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
                Student Name
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Your full name"
                className="w-full min-h-[44px] rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
                Roll Number (optional)
              </label>
              <input
                type="text"
                maxLength={30}
                value={studentRoll}
                onChange={(e) => setStudentRoll(e.target.value)}
                placeholder="e.g., 240010042"
                className="font-mono-tabular w-full min-h-[44px] rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
                Preferred Date
              </label>
              <input
                type="date"
                required
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="font-mono-tabular w-full min-h-[44px] rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
                Preferred Time
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="font-mono-tabular w-full min-h-[44px] rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
              {user
                ? 'Reason / Symptoms for Doctor (optional)'
                : 'Note (stays on this device)'}
            </label>
            <textarea
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Briefly describe your symptoms or consultation topic (optional)"
              className="w-full rounded-xl glass-input px-3 py-2.5 text-sm focus:outline-2 focus:outline-[#0f766e]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-[#0f766e] text-white text-sm font-semibold hover:bg-[#0d645d] dark:bg-[#2dd4bf] dark:text-[#06201d] dark:hover:bg-[#14b8a6] disabled:opacity-60 transition-colors cursor-pointer"
          >
            {submitting
              ? 'Saving...'
              : user
                ? 'Submit Appointment Request'
                : 'Save to My Appointments'}
          </button>
        </form>
      )}
    </div>
  );
}

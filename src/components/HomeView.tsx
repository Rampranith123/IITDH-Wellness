import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarHeart,
  CreditCard,
  MessageSquareHeart,
  Phone,
  Stethoscope,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWellnessData } from '../context/WellnessDataContext';
import {
  DAYS,
  DOCTORS,
  WELLNESS_CONTACTS,
  buildTelHref,
  getDoctorAvailability,
  getNextSaturdayRoster,
} from '../data/wellnessData';
import type { AppView } from '../types/wellness';
import { DailyHealthTipCard } from './DailyHealthTipCard';

interface HomeViewProps {
  onNavigate: (view: AppView, arg?: string) => void;
}

export function HomeView({ onNavigate }: HomeViewProps) {
  const { firebaseUser, profile } = useAuth();
  const { doctorStatuses, specialistRosters } = useWellnessData();
  const [heroLoaded, setHeroLoaded] = useState(true);

  const now = new Date();
  const availableDoctors = DOCTORS.filter(
    (doc) => getDoctorAvailability(doc, doctorStatuses[doc.id], now).now
  );
  const roster = getNextSaturdayRoster(specialistRosters, now);

  return (
    <div className="space-y-8">
      {/* Hero Split + Immediate Emergency Strip */}
      <section className="grid xl:grid-cols-12 gap-6 items-stretch">
        {/* Left: Campus Emergency & Portal Overview */}
        <div className="xl:col-span-7 flex flex-col justify-between rounded-2xl glass-panel p-6 sm:p-8">
          <div>
            <p className="text-xs font-medium text-[#476360] dark:text-[#9ab3b0]">
              IIT Dharwad · Permanent Campus Healthcare
            </p>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0f2422] dark:text-white text-balance">
              Campus Wellness &amp; Medical Centre
            </h1>
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#476360] dark:text-[#9ab3b0] max-w-xl">
              Check live doctor duty timings, book OPD or counselling sessions, access your UHID
              health card, and reach campus emergency services in seconds.
            </p>
          </div>

          {/* Emergency SOS Callout */}
          <div className="mt-6 rounded-xl border border-red-400/50 dark:border-red-500/30 bg-red-600/95 backdrop-blur-md text-white p-5 shadow-lg shadow-red-900/15">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 font-display text-lg font-bold">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>Medical Emergency?</span>
                </div>
                <p className="mt-1 text-sm text-red-50 leading-relaxed">
                  Call the ambulance immediately, then inform FIC Health, Associate Dean Wellness, or
                  Dean Student Welfare.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                href={buildTelHref(WELLNESS_CONTACTS.ambulance)}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2 rounded-xl bg-white text-red-700 font-semibold text-sm hover:bg-red-50 transition-colors whitespace-nowrap shrink-0"
              >
                <Phone className="w-4 h-4" />
                <span className="font-mono-tabular">
                  Call Ambulance · {WELLNESS_CONTACTS.ambulance}
                </span>
              </a>
              <button
                type="button"
                onClick={() => onNavigate('emergency')}
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl border border-white/60 text-white font-medium text-sm hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                More emergency options
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Campus Wellness Visual */}
        <div className="xl:col-span-5 rounded-2xl overflow-hidden border border-white/80 dark:border-white/10 shadow-[0_8px_30px_rgba(15,118,110,0.08)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.4)] bg-teal-950 min-h-[260px] xl:min-h-full relative">
          {heroLoaded ? (
            <img
              src="/assets/aistudio/image_9c206593.png"
              alt="IIT Dharwad Wellness Centre building with campus ambulance"
              onError={() => setHeroLoaded(false)}
              className="w-full h-full object-cover min-h-[260px]"
            />
          ) : (
            <div className="w-full h-full min-h-[260px] bg-gradient-to-br from-[#0f766e] to-[#0b3d39] flex flex-col items-center justify-center p-6 text-white text-center">
              <Stethoscope className="w-10 h-10 mb-3 opacity-80" />
              <p className="font-display font-bold text-lg">IIT Dharwad Wellness Centre</p>
              <p className="text-xs text-teal-100 mt-1">24×7 Ambulance &amp; Campus OPD</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex flex-col justify-end p-6">
            <div className="rounded-xl bg-black/35 backdrop-blur-md border border-white/15 p-4">
              <p className="text-xs font-medium text-teal-200">
                Wellness Helpline ·{' '}
                <span className="font-mono-tabular">{WELLNESS_CONTACTS.wellness}</span>
              </p>
              <p className="mt-1 font-display text-lg font-bold text-white">
                {firebaseUser
                  ? `Welcome back, ${profile?.displayName || firebaseUser.displayName}`
                  : 'Separate Portals for Students & Doctors'}
              </p>
              {!firebaseUser && (
                <div className="mt-3 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => onNavigate('auth')}
                    className="min-h-[38px] px-4 py-1.5 rounded-lg bg-white text-[#0f766e] text-xs font-semibold hover:bg-teal-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Student / Doctor Sign In
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SaaS Operational KPI Strip */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-4" aria-label="Clinic status summary">
        <div className="rounded-2xl glass-panel p-4 sm:p-5">
          <p className="text-xs font-medium text-[#476360] dark:text-[#9ab3b0]">Doctors on duty</p>
          <p className="mt-1.5 font-mono-tabular text-2xl font-bold text-[#0f2422] dark:text-white">
            {availableDoctors.length} / {DOCTORS.length}
          </p>
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
            {availableDoctors.length > 0 ? 'OPD currently active' : 'Outside OPD hours'}
          </p>
        </div>

        <div className="rounded-2xl glass-panel p-4 sm:p-5">
          <p className="text-xs font-medium text-[#476360] dark:text-[#9ab3b0]">Campus ambulance</p>
          <p className="mt-1.5 font-mono-tabular text-xl sm:text-2xl font-bold text-[#0f2422] dark:text-white truncate">
            {WELLNESS_CONTACTS.ambulance}
          </p>
          <p className="mt-1 text-xs text-[#0f766e] dark:text-[#2dd4bf]">24×7 immediate dispatch</p>
        </div>

        <div className="rounded-2xl glass-panel p-4 sm:p-5">
          <p className="text-xs font-medium text-[#476360] dark:text-[#9ab3b0]">Next SDM visit</p>
          <p className="mt-1.5 font-mono-tabular text-xl sm:text-2xl font-bold text-[#0f2422] dark:text-white">
            {DAYS[roster.date.getDay()]} {roster.date.getDate()}/{roster.date.getMonth() + 1}
          </p>
          <p className="mt-1 font-mono-tabular text-xs text-[#476360] dark:text-[#9ab3b0] truncate">
            {roster.timeWindow}
          </p>
        </div>

        <div className="rounded-2xl glass-panel p-4 sm:p-5">
          <p className="text-xs font-medium text-[#476360] dark:text-[#9ab3b0]">Workspace mode</p>
          <p className="mt-1.5 font-display text-xl sm:text-2xl font-bold text-[#0f2422] dark:text-white truncate">
            {firebaseUser
              ? profile?.role === 'doctor'
                ? 'Doctor Desk'
                : 'Student Sync'
              : 'Guest Device'}
          </p>
          <p className="mt-1 text-xs text-[#476360] dark:text-[#9ab3b0]">
            {firebaseUser ? 'Cloud encrypted' : 'Local browser storage'}
          </p>
        </div>
      </section>

      {/* Daily Health Tip powered by server-side Gemini API */}
      <DailyHealthTipCard />

      {/* Available Right Now */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-4 border-b border-[#cfe0dd]/70 dark:border-white/10 pb-3">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0f2422] dark:text-white">
              Available right now
            </h2>
            <p className="text-xs sm:text-sm text-[#476360] dark:text-[#9ab3b0] mt-0.5">
              Live OPD duty status combining published timings and physician updates
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('doctors')}
            className="text-sm font-semibold text-[#0f766e] dark:text-[#2dd4bf] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            View all doctors
          </button>
        </div>

        {availableDoctors.length > 0 ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {availableDoctors.map((doc) => {
              const avail = getDoctorAvailability(doc, doctorStatuses[doc.id], now);
              return (
                <article
                  key={doc.id}
                  className="flex flex-col justify-between rounded-2xl glass-panel p-5"
                >
                  <div>
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-display text-base font-bold text-[#0f2422] dark:text-white">
                        {doc.name}
                      </h3>
                      <span
                        className={`text-xs font-semibold whitespace-nowrap shrink-0 ${
                          avail.overrideState === 'in_consultation'
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {avail.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs sm:text-sm text-[#476360] dark:text-[#9ab3b0]">
                      {doc.spec} · {doc.qual}
                    </p>
                    <p className="mt-2 font-mono-tabular text-xs text-[#476360] dark:text-[#9ab3b0]">
                      {doc.when} · {avail.detail}
                    </p>
                    {avail.customNote && (
                      <p className="mt-2 text-xs font-medium text-[#0f766e] dark:text-[#2dd4bf]">
                        Notice: {avail.customNote}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#cfe0dd]/60 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => onNavigate('book', doc.id)}
                      className="w-full min-h-[40px] px-4 py-2 rounded-xl bg-[#0f766e] text-white text-sm font-semibold hover:bg-[#0d645d] dark:bg-[#2dd4bf] dark:text-[#06201d] dark:hover:bg-[#14b8a6] transition-colors cursor-pointer"
                    >
                      Book / Remind Me
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl glass-panel p-6 text-center">
            <p className="text-sm text-[#476360] dark:text-[#9ab3b0]">
              No resident doctor is on scheduled duty at this hour. Call the Wellness Centre at{' '}
              <a
                href={buildTelHref(WELLNESS_CONTACTS.wellness)}
                className="font-mono-tabular font-semibold text-[#0f766e] dark:text-[#2dd4bf] hover:underline"
              >
                {WELLNESS_CONTACTS.wellness}
              </a>{' '}
              for urgent help.
            </p>
          </div>
        )}
      </section>

      {/* Quick Links & Next Specialist Visit */}
      <section className="grid xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 space-y-4">
          <h2 className="font-display text-xl font-bold text-[#0f2422] dark:text-white">
            Quick links
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => onNavigate('doctors')}
              className="text-left rounded-2xl glass-panel p-5 hover:border-[#0f766e] dark:hover:border-[#2dd4bf] transition-colors cursor-pointer"
            >
              <Stethoscope className="w-6 h-6 text-[#0f766e] dark:text-[#2dd4bf]" />
              <div className="mt-3 font-display text-base font-bold text-[#0f2422] dark:text-white">
                All Doctors
              </div>
              <div className="mt-1 text-xs sm:text-sm text-[#476360] dark:text-[#9ab3b0]">
                OPD timings &amp; visiting specialists
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('counselling')}
              className="text-left rounded-2xl glass-panel p-5 hover:border-[#0f766e] dark:hover:border-[#2dd4bf] transition-colors cursor-pointer"
            >
              <MessageSquareHeart className="w-6 h-6 text-[#0f766e] dark:text-[#2dd4bf]" />
              <div className="mt-3 font-display text-base font-bold text-[#0f2422] dark:text-white">
                Counselling
              </div>
              <div className="mt-1 text-xs sm:text-sm text-[#476360] dark:text-[#9ab3b0]">
                In-person &amp; 24×7 online support
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('me')}
              className="text-left rounded-2xl glass-panel p-5 hover:border-[#0f766e] dark:hover:border-[#2dd4bf] transition-colors cursor-pointer"
            >
              <CalendarHeart className="w-6 h-6 text-[#0f766e] dark:text-[#2dd4bf]" />
              <div className="mt-3 font-display text-base font-bold text-[#0f2422] dark:text-white">
                Mood Check-in
              </div>
              <div className="mt-1 text-xs sm:text-sm text-[#476360] dark:text-[#9ab3b0]">
                Private daily log &amp; appointments
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('more')}
              className="text-left rounded-2xl glass-panel p-5 hover:border-[#0f766e] dark:hover:border-[#2dd4bf] transition-colors cursor-pointer"
            >
              <CreditCard className="w-6 h-6 text-[#0f766e] dark:text-[#2dd4bf]" />
              <div className="mt-3 font-display text-base font-bold text-[#0f2422] dark:text-white">
                Insurance &amp; UHID
              </div>
              <div className="mt-1 text-xs sm:text-sm text-[#476360] dark:text-[#9ab3b0]">
                Digital UHID card &amp; IPD claim steps
              </div>
            </button>
          </div>
        </div>

        {/* Next Specialist Visit */}
        <div className="xl:col-span-5 space-y-4">
          <h2 className="font-display text-xl font-bold text-[#0f2422] dark:text-white">
            Next specialist visit
          </h2>
          <div className="rounded-2xl glass-panel p-6 space-y-4">
            <div>
              <p className="text-xs font-medium text-[#476360] dark:text-[#9ab3b0]">
                SDM Visiting Specialists · Saturday
              </p>
              <h3 className="mt-1 font-display text-lg font-bold text-[#0f2422] dark:text-white font-mono-tabular">
                {DAYS[roster.date.getDay()]} {roster.date.getDate()}/{roster.date.getMonth() + 1} ·{' '}
                {roster.timeWindow}
              </h3>
            </div>
            <ul className="divide-y divide-[#cfe0dd]/60 dark:divide-white/10 text-sm text-[#263f3c] dark:text-[#c7dcd9]">
              {roster.list.map((item, idx) => (
                <li key={idx} className="py-2.5 first:pt-0 last:pb-0">
                  {item}
                </li>
              ))}
            </ul>
            {roster.tentative && (
              <p className="rounded-xl border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/75 dark:bg-amber-950/25 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                Tentative — roster for this date is not published yet. Confirm at the centre.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

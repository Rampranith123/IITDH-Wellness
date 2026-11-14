import { useMemo, useState } from 'react';
import { CalendarOff, CheckCircle2, Clock, Search } from 'lucide-react';
import { useWellnessData } from '../context/WellnessDataContext';
import {
  DAYS,
  DOCTORS,
  getDoctorAvailability,
  getNextSaturdayRoster,
} from '../data/wellnessData';
import type { AppView, AvailabilityResult } from '../types/wellness';

interface DoctorsViewProps {
  onNavigate: (view: AppView, arg?: string) => void;
}

type CategoryFilter = 'all' | 'gp' | 'specialist' | 'ayush';

function getCapacityVisual(avail: AvailabilityResult) {
  if (avail.overrideState === 'in_consultation') {
    return {
      statusText: 'Busy · In Consultation',
      subText: 'Currently attending a patient',
      textColor: 'text-amber-700 dark:text-amber-400',
      barColors: [
        'bg-amber-500 dark:bg-amber-400',
        'bg-amber-500 dark:bg-amber-400',
        'bg-[#d5e3e0] dark:bg-white/10',
      ],
      Icon: Clock,
    };
  }
  if (avail.overrideState === 'on_leave') {
    return {
      statusText: 'Unavailable · On Leave',
      subText: 'Marked away by practitioner',
      textColor: 'text-red-600 dark:text-red-400',
      barColors: [
        'bg-red-400 dark:bg-red-500/60',
        'bg-[#d5e3e0] dark:bg-white/10',
        'bg-[#d5e3e0] dark:bg-white/10',
      ],
      Icon: CalendarOff,
    };
  }
  if (avail.now) {
    return {
      statusText: 'Available · Open for OPD',
      subText: avail.detail,
      textColor: 'text-emerald-700 dark:text-emerald-400',
      barColors: [
        'bg-emerald-600 dark:bg-emerald-400',
        'bg-emerald-600 dark:bg-emerald-400',
        'bg-emerald-600 dark:bg-emerald-400',
      ],
      Icon: CheckCircle2,
    };
  }
  return {
    statusText: `Off Duty · ${avail.label}`,
    subText: 'Outside scheduled OPD hours',
    textColor: 'text-[#476360] dark:text-[#9ab3b0]',
    barColors: [
      'bg-[#d5e3e0] dark:bg-white/10',
      'bg-[#d5e3e0] dark:bg-white/10',
      'bg-[#d5e3e0] dark:bg-white/10',
    ],
    Icon: Clock,
  };
}

export function DoctorsView({ onNavigate }: DoctorsViewProps) {
  const { doctorStatuses, specialistRosters } = useWellnessData();
  const [queryText, setQueryText] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [category, setCategory] = useState<CategoryFilter>('all');

  const now = new Date();
  const roster = getNextSaturdayRoster(specialistRosters, now);

  const clinicSummary = useMemo(() => {
    let available = 0;
    let busy = 0;
    let offDuty = 0;

    for (const doc of DOCTORS) {
      const avail = getDoctorAvailability(doc, doctorStatuses[doc.id], now);
      if (avail.overrideState === 'in_consultation') {
        busy += 1;
      } else if (avail.now) {
        available += 1;
      } else {
        offDuty += 1;
      }
    }

    return { available, busy, offDuty, total: DOCTORS.length };
  }, [doctorStatuses, now]);

  const filteredDoctors = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return DOCTORS.filter((doc) => {
      const hay = `${doc.name} ${doc.spec} ${doc.qual}`.toLowerCase();
      if (q && !hay.includes(q)) return false;

      if (availableOnly && !getDoctorAvailability(doc, doctorStatuses[doc.id], now).now) {
        return false;
      }

      if (category === 'gp' && !doc.spec.toLowerCase().includes('general')) return false;
      if (
        category === 'ayush' &&
        !doc.spec.toLowerCase().includes('ayurveda') &&
        !doc.spec.toLowerCase().includes('homoeopathy')
      ) {
        return false;
      }
      if (
        category === 'specialist' &&
        (doc.spec.toLowerCase().includes('general') ||
          doc.spec.toLowerCase().includes('ayurveda') ||
          doc.spec.toLowerCase().includes('homoeopathy'))
      ) {
        return false;
      }

      return true;
    });
  }, [queryText, availableOnly, category, doctorStatuses, now]);

  return (
    <div className="space-y-8">
      <div className="border-b border-[#cfe0dd]/70 dark:border-white/10 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0f2422] dark:text-white">
              Wellness Centre Doctors
            </h1>
            <p className="mt-1.5 text-sm text-[#476360] dark:text-[#9ab3b0]">
              Search resident physicians, specialists, Ayurveda, and Homoeopathy OPD schedules.
            </p>
          </div>

          {/* Live Clinic Capacity Summary (Unboxed Tabular Numerals) */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono-tabular">
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {clinicSummary.available} Available
            </span>
            <span className="text-[#b8cdc9] dark:text-white/20" aria-hidden="true">
              ·
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              {clinicSummary.busy} Busy
            </span>
            <span className="text-[#b8cdc9] dark:text-white/20" aria-hidden="true">
              ·
            </span>
            <span className="text-[#476360] dark:text-[#9ab3b0]">
              {clinicSummary.offDuty} Off Duty
            </span>
          </div>
        </div>

        {/* Search & Interactive Filter Controls */}
        <div className="mt-5 flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#476360] dark:text-[#9ab3b0] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <input
              type="search"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search doctor or specialty (e.g. ENT, Psychiatrist)"
              aria-label="Search doctor or specialty"
              className="w-full min-h-[44px] rounded-xl glass-input pl-10 pr-4 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAvailableOnly((v) => !v)}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                availableOnly
                  ? 'bg-[#0f766e] text-white border-[#0f766e] dark:bg-[#2dd4bf] dark:text-[#06201d] dark:border-[#2dd4bf]'
                  : 'glass-input hover:border-[#0f766e]'
              }`}
            >
              On duty now
            </button>

            <div
              role="group"
              aria-label="Specialty filter"
              className="inline-flex items-center rounded-xl glass-inset p-1 gap-1"
            >
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'gp', label: 'General' },
                  { id: 'specialist', label: 'Specialists' },
                  { id: 'ayush', label: 'AYUSH' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategory(tab.id)}
                  className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    category === tab.id
                      ? 'bg-white dark:bg-[#132623] text-[#0f2422] dark:text-white shadow-xs'
                      : 'text-[#476360] dark:text-[#9ab3b0] hover:text-[#0f2422] dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Doctors Grid */}
      {filteredDoctors.length > 0 ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDoctors.map((doc) => {
            const avail = getDoctorAvailability(doc, doctorStatuses[doc.id], now);
            const capacity = getCapacityVisual(avail);
            const StatusIcon = capacity.Icon;
            const isLiveOverride =
              Boolean(doctorStatuses[doc.id]) && avail.overrideState !== 'auto';

            return (
              <article
                key={doc.id}
                className="flex flex-col justify-between rounded-2xl glass-panel p-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-base font-bold text-[#0f2422] dark:text-white">
                        {doc.name}
                      </h2>
                      <p className="mt-0.5 text-sm font-medium text-[#0f766e] dark:text-[#2dd4bf]">
                        {doc.spec}
                      </p>
                    </div>
                    {isLiveOverride && (
                      <span className="font-mono-tabular text-[11px] font-medium text-[#476360] dark:text-[#9ab3b0] whitespace-nowrap shrink-0">
                        Live update
                      </span>
                    )}
                  </div>

                  {/* Real-Time Clinic Capacity & Busy/Available Visual Meter */}
                  <div className="mt-3 pt-3 border-t border-[#cfe0dd]/60 dark:border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${capacity.textColor}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{capacity.statusText}</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 h-1.5" aria-hidden="true">
                      {capacity.barColors.map((cls, idx) => (
                        <span key={idx} className={`rounded-full ${cls}`} />
                      ))}
                    </div>
                    <p className="text-[11px] text-[#476360] dark:text-[#9ab3b0]">
                      {capacity.subText}
                    </p>
                  </div>

                  <p className="mt-3 text-xs text-[#476360] dark:text-[#9ab3b0]">{doc.qual}</p>
                  <p className="mt-1.5 font-mono-tabular text-xs text-[#263f3c] dark:text-[#c7dcd9]">
                    {doc.when}
                  </p>

                  {avail.customNote && (
                    <p className="mt-2.5 text-xs font-medium text-[#0f766e] dark:text-[#2dd4bf]">
                      Clinic update: {avail.customNote}
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
        <div className="rounded-2xl glass-panel p-8 text-center">
          <p className="text-sm text-[#476360] dark:text-[#9ab3b0]">
            No doctors match your current search or filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setQueryText('');
              setAvailableOnly(false);
              setCategory('all');
            }}
            className="mt-3 text-sm font-semibold text-[#0f766e] dark:text-[#2dd4bf] hover:underline cursor-pointer"
          >
            Reset filters
          </button>
        </div>
      )}

      {/* Visiting Specialists & Physiotherapy Note */}
      <section className="grid md:grid-cols-2 gap-6 pt-2">
        <div className="rounded-2xl glass-panel p-6 space-y-3">
          <h2 className="font-display text-lg font-bold text-[#0f2422] dark:text-white">
            Visiting specialists
          </h2>
          <p className="font-mono-tabular text-xs font-medium text-[#476360] dark:text-[#9ab3b0]">
            SDM specialists · {DAYS[roster.date.getDay()]} {roster.date.getDate()}/
            {roster.date.getMonth() + 1}, {roster.timeWindow}
          </p>
          <ul className="divide-y divide-[#cfe0dd]/60 dark:divide-white/10 text-sm text-[#263f3c] dark:text-[#c7dcd9]">
            {roster.list.map((entry, idx) => (
              <li key={idx} className="py-2 first:pt-0 last:pb-0">
                {entry}
              </li>
            ))}
          </ul>
          {roster.tentative && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Tentative — roster for this date is not published yet. Confirm at the centre.
            </p>
          )}
        </div>

        <div className="rounded-2xl glass-panel p-6 space-y-3">
          <h2 className="font-display text-lg font-bold text-[#0f2422] dark:text-white">
            Physiotherapy &amp; roster schedule
          </h2>
          <p className="text-sm leading-relaxed text-[#476360] dark:text-[#9ab3b0]">
            Physiotherapy: Wed &amp; Sat (per the centre). Specialist rosters change monthly and are
            updated directly by Wellness Centre staff.
          </p>
        </div>
      </section>
    </div>
  );
}

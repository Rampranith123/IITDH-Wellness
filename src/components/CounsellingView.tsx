import { ExternalLink, Phone } from 'lucide-react';
import { useWellnessData } from '../context/WellnessDataContext';
import {
  COUNSELLORS,
  WELLNESS_CONTACTS,
  WELLNESS_LINKS,
  buildTelHref,
} from '../data/wellnessData';
import type { AppView } from '../types/wellness';

interface CounsellingViewProps {
  onNavigate: (view: AppView, arg?: string) => void;
}

export function CounsellingView({ onNavigate }: CounsellingViewProps) {
  const { doctorStatuses } = useWellnessData();

  return (
    <div className="space-y-8">
      <div className="border-b border-[#cfe0dd]/70 dark:border-white/10 pb-5">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0f2422] dark:text-white">
          Counselling &amp; Mental Health Support
        </h1>
        <p className="mt-1.5 text-sm text-[#476360] dark:text-[#9ab3b0]">
          Confidential face-to-face campus counselling and 24×7 national mental health support.
        </p>
      </div>

      {/* Face-to-Face Counsellors */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[#0f2422] dark:text-white">
          Face-to-face counselling
        </h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {COUNSELLORS.map((c) => {
            const officialBook = WELLNESS_LINKS[c.bookKey];
            const feedbackUrl = WELLNESS_LINKS[c.feedbackKey];
            const liveStatus = doctorStatuses[c.id];
            return (
              <article
                key={c.id}
                className="flex flex-col justify-between rounded-2xl glass-panel p-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-base font-bold text-[#0f2422] dark:text-white">
                      {c.name}
                    </h3>
                    {liveStatus && liveStatus.availabilityOverride !== 'auto' && (
                      <span
                        className={`text-xs font-semibold whitespace-nowrap ${
                          liveStatus.availabilityOverride === 'on_leave'
                            ? 'text-[#476360] dark:text-[#9ab3b0]'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {liveStatus.availabilityOverride === 'available'
                          ? 'Available Now'
                          : liveStatus.availabilityOverride === 'in_consultation'
                            ? 'In Session'
                            : 'On Leave'}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-medium text-[#0f766e] dark:text-[#2dd4bf]">
                    {c.spec}
                  </p>
                  <p className="mt-2 text-xs text-[#476360] dark:text-[#9ab3b0]">{c.qual}</p>
                  <p className="mt-2 font-mono-tabular text-xs text-[#263f3c] dark:text-[#c7dcd9]">
                    Schedule: {c.when}
                  </p>
                  {liveStatus?.customNote && (
                    <p className="mt-2 text-xs font-medium text-[#0f766e] dark:text-[#2dd4bf]">
                      Update: {liveStatus.customNote}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-[#cfe0dd]/60 dark:border-white/10 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('book', c.id)}
                    className="flex-1 min-h-[40px] px-4 py-2 rounded-xl bg-[#0f766e] text-white text-sm font-semibold hover:bg-[#0d645d] dark:bg-[#2dd4bf] dark:text-[#06201d] dark:hover:bg-[#14b8a6] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Book / Remind Me
                  </button>
                  {officialBook && (
                    <a
                      href={officialBook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 min-h-[40px] px-3 py-2 rounded-xl glass-input text-xs font-semibold hover:border-[#0f766e]"
                    >
                      Official booking
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {feedbackUrl && (
                    <a
                      href={feedbackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 min-h-[40px] px-3 py-2 rounded-xl glass-input text-xs font-semibold text-[#476360] dark:text-[#9ab3b0]"
                    >
                      Feedback
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Online Support */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[#0f2422] dark:text-white">
          Online support
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl glass-panel p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-[#0f2422] dark:text-white">
                Tele-MANAS (24×7, free)
              </h3>
              <p className="mt-1 text-sm text-[#476360] dark:text-[#9ab3b0]">
                National mental-health helpline available round the clock in multiple languages.
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={buildTelHref(WELLNESS_CONTACTS.tele_manas)}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span className="font-mono-tabular">Call {WELLNESS_CONTACTS.tele_manas}</span>
              </a>
              {WELLNESS_LINKS.teleManas && (
                <a
                  href={WELLNESS_LINKS.teleManas}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl glass-input text-sm font-semibold text-[#0f766e] dark:text-[#2dd4bf]"
                >
                  Connect online
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          <div className="rounded-2xl glass-panel p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-[#0f2422] dark:text-white">
                TalkToAngel
              </h3>
              <p className="mt-1 text-sm text-[#476360] dark:text-[#9ab3b0]">
                Online counselling sessions with a licensed mental health expert.
              </p>
            </div>
            <div className="mt-5">
              {WELLNESS_LINKS.talkToAngel ? (
                <div className="flex flex-wrap gap-3">
                  <a
                    href={WELLNESS_LINKS.talkToAngel}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 min-h-[44px] px-5 py-2 rounded-xl bg-[#0f766e] text-white text-sm font-semibold"
                  >
                    Connect to an expert
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  {WELLNESS_LINKS.talkToAngelManual && (
                    <a
                      href={WELLNESS_LINKS.talkToAngelManual}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl glass-input text-sm font-semibold text-[#0f766e] dark:text-[#2dd4bf]"
                    >
                      Instruction manual
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#476360] dark:text-[#9ab3b0]">
                  Link not added yet — see the official IIT Dharwad Wellness page for institutional
                  access instructions.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

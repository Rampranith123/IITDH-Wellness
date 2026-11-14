import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, HeartPulse, RefreshCw, Sparkles } from 'lucide-react';

interface DailyHealthTip {
  tip: string;
  category: string;
  actionStep: string;
  attribution: string;
  dateKey: string;
}

const STORAGE_KEY = 'iitdh_daily_health_tip_v1';

const FOCUS_OPTIONS = [
  { id: 'balanced', label: 'All Topics', promptHint: '' },
  { id: 'sleep', label: 'Sleep', promptHint: 'healthy sleep hygiene and rest for university students' },
  { id: 'focus', label: 'Mental Clarity', promptHint: 'stress relief, screen breaks, and study balance' },
  { id: 'nutrition', label: 'Nutrition', promptHint: 'hydration and balanced hostel or mess nutrition' },
  { id: 'movement', label: 'Posture & Activity', promptHint: 'desk posture, stretching, and light campus movement' },
] as const;

type FocusId = (typeof FOCUS_OPTIONS)[number]['id'];

function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readCachedTip(dateKey: string): DailyHealthTip | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DailyHealthTip>;
    if (
      parsed.dateKey === dateKey &&
      typeof parsed.tip === 'string' &&
      typeof parsed.category === 'string' &&
      typeof parsed.actionStep === 'string'
    ) {
      return {
        tip: parsed.tip,
        category: parsed.category,
        actionStep: parsed.actionStep,
        attribution: parsed.attribution || 'Campus Wellness Guidance',
        dateKey: parsed.dateKey,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function saveCachedTip(tip: DailyHealthTip): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tip));
  } catch {
    // Ignore storage quota errors
  }
}

export function DailyHealthTipCard() {
  const todayKey = getLocalDateKey();
  const [selectedFocus, setSelectedFocus] = useState<FocusId>('balanced');
  const [tipData, setTipData] = useState<DailyHealthTip | null>(() => readCachedTip(todayKey));
  const [loading, setLoading] = useState<boolean>(() => readCachedTip(todayKey) === null);
  const [error, setError] = useState<string | null>(null);

  const fetchTip = useCallback(
    async (options?: { focusId?: FocusId; previousTip?: string }) => {
      const activeFocus = options?.focusId ?? selectedFocus;
      const focusEntry = FOCUS_OPTIONS.find((item) => item.id === activeFocus);

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/health-tip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dateKey: todayKey,
            focus: focusEntry?.promptHint || undefined,
            previousTip: options?.previousTip,
          }),
        });

        const payload = (await response.json()) as Partial<DailyHealthTip> & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || 'Could not load today’s health tip.');
        }

        if (!payload.tip || !payload.category || !payload.actionStep) {
          throw new Error('Received an incomplete health tip response.');
        }

        const nextTip: DailyHealthTip = {
          tip: payload.tip,
          category: payload.category,
          actionStep: payload.actionStep,
          attribution: payload.attribution || 'Campus Wellness Guidance',
          dateKey: todayKey,
        };

        setTipData(nextTip);
        saveCachedTip(nextTip);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to fetch daily health tip.');
      } finally {
        setLoading(false);
      }
    },
    [selectedFocus, todayKey]
  );

  useEffect(() => {
    const cached = readCachedTip(todayKey);
    if (cached) {
      setTipData(cached);
      setLoading(false);
      return;
    }
    void fetchTip({ focusId: 'balanced' });
  }, [todayKey, fetchTip]);

  const handleFocusChange = (focusId: FocusId) => {
    setSelectedFocus(focusId);
    void fetchTip({ focusId, previousTip: tipData?.tip });
  };

  const formattedDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <section aria-label="Daily health tip">
      <div className="rounded-2xl glass-panel p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#cfe0dd]/70 dark:border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl glass-inset flex items-center justify-center text-[#0f766e] dark:text-[#2dd4bf] shrink-0">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg sm:text-xl font-bold text-[#0f2422] dark:text-white">
                  Daily Health Tip
                </h2>
                <Sparkles className="w-4 h-4 text-[#0f766e] dark:text-[#2dd4bf] shrink-0" />
              </div>
              <p className="text-xs text-[#476360] dark:text-[#9ab3b0] font-mono-tabular">
                {formattedDate} · {tipData?.category || 'Campus Wellness'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex flex-wrap items-center rounded-xl glass-inset p-1 gap-0.5"
              role="group"
              aria-label="Filter health tip topic"
            >
              {FOCUS_OPTIONS.map((option) => {
                const active = selectedFocus === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={loading}
                    onClick={() => handleFocusChange(option.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-60 ${
                      active
                        ? 'bg-[#0f766e] text-white dark:bg-[#2dd4bf] dark:text-[#06201d] shadow-xs'
                        : 'text-[#476360] dark:text-[#9ab3b0] hover:text-[#0f2422] dark:hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() => void fetchTip({ focusId: selectedFocus, previousTip: tipData?.tip })}
              className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3.5 py-1.5 rounded-xl border border-[#cfe0dd] dark:border-white/15 bg-white/60 dark:bg-white/5 text-xs font-semibold text-[#0f2422] dark:text-white hover:border-[#0f766e] dark:hover:border-[#2dd4bf] transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Refreshing…' : 'New tip'}</span>
            </button>
          </div>
        </div>

        <div className="mt-4">
          {loading && !tipData ? (
            <div className="space-y-3 py-1" aria-busy="true" aria-label="Loading daily health tip">
              <div className="h-5 w-11/12 rounded-lg bg-[#d5e3e0]/70 dark:bg-white/10 animate-pulse" />
              <div className="h-5 w-3/4 rounded-lg bg-[#d5e3e0]/60 dark:bg-white/10 animate-pulse" />
              <div className="h-10 w-full rounded-xl bg-[#d5e3e0]/50 dark:bg-white/5 animate-pulse mt-3" />
            </div>
          ) : error && !tipData ? (
            <div className="rounded-xl glass-inset p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                type="button"
                onClick={() => void fetchTip({ focusId: selectedFocus })}
                className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-4 py-1.5 rounded-xl bg-[#0f766e] text-white text-xs font-semibold hover:bg-[#0d645d] dark:bg-[#2dd4bf] dark:text-[#06201d] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try again
              </button>
            </div>
          ) : tipData ? (
            <div className="grid xl:grid-cols-12 gap-4 items-center">
              <div className="xl:col-span-8 space-y-1.5">
                <blockquote className="text-base sm:text-lg font-medium leading-relaxed text-[#0f2422] dark:text-white">
                  “{tipData.tip}”
                </blockquote>
                <p className="text-xs font-medium text-[#476360] dark:text-[#9ab3b0]">
                  — {tipData.attribution}
                </p>
                {error && (
                  <p className="text-xs text-amber-700 dark:text-amber-300 pt-1">
                    {error} Showing last saved tip.
                  </p>
                )}
              </div>

              <div className="xl:col-span-4 rounded-xl glass-inset p-4">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0f766e] dark:text-[#2dd4bf] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#476360] dark:text-[#9ab3b0]">
                      Today’s micro-habit
                    </p>
                    <p className="mt-1 text-sm font-medium text-[#0f2422] dark:text-white leading-snug">
                      {tipData.actionStep}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

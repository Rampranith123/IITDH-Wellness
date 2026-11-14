import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  HeartHandshake,
  Lock,
  Phone,
  TrendingUp,
} from 'lucide-react';
import {
  MOODS,
  WELLNESS_CONTACTS,
  buildTelHref,
  toIsoDate,
} from '../data/wellnessData';
import type { AppView, MoodEntry } from '../types/wellness';

interface MoodTrackerCardProps {
  moods: MoodEntry[];
  onSaveMood: (date: string, score: number, note: string) => Promise<void>;
  onNavigate: (view: AppView) => void;
}

interface DayPoint {
  date: string;
  shortLabel: string;
  entry: MoodEntry | null;
  index: number;
}

export function MoodTrackerCard({ moods, onSaveMood, onNavigate }: MoodTrackerCardProps) {
  const today = toIsoDate(new Date());
  const minDateObj = new Date();
  minDateObj.setDate(minDateObj.getDate() - 29);
  const minDate = toIsoDate(minDateObj);

  const [selectedDate, setSelectedDate] = useState<string>(today);
  const existingForSelected = useMemo(
    () => moods.find((m) => m.date === selectedDate) ?? null,
    [moods, selectedDate]
  );

  const [pickedScore, setPickedScore] = useState<number>(existingForSelected?.score || 0);
  const [moodNote, setMoodNote] = useState<string>(existingForSelected?.note || '');
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    setPickedScore(existingForSelected?.score || 0);
    setMoodNote(existingForSelected?.note || '');
  }, [selectedDate, existingForSelected]);

  // Build rolling 30-day window [today - 29d .. today]
  const days30: DayPoint[] = useMemo(() => {
    const map = new Map<string, MoodEntry>();
    for (const m of moods) {
      map.set(m.date, m);
    }
    const list: DayPoint[] = [];
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    cursor.setDate(cursor.getDate() - 29);

    for (let i = 0; i < 30; i++) {
      const iso = toIsoDate(cursor);
      const shortLabel = `${cursor.getDate()}/${cursor.getMonth() + 1}`;
      list.push({
        date: iso,
        shortLabel,
        entry: map.get(iso) ?? null,
        index: i,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return list;
  }, [moods]);

  const logged30 = useMemo(
    () => days30.filter((d): d is DayPoint & { entry: MoodEntry } => d.entry !== null),
    [days30]
  );

  const average30 = useMemo(() => {
    if (logged30.length === 0) return null;
    const sum = logged30.reduce((acc, d) => acc + d.entry.score, 0);
    return (sum / logged30.length).toFixed(1);
  }, [logged30]);

  const latestLogged = logged30.length > 0 ? logged30[logged30.length - 1] : null;
  const latestMoodMeta = latestLogged
    ? MOODS.find((m) => m.score === latestLogged.entry.score)
    : null;

  const activeScore = pickedScore || existingForSelected?.score || 0;
  const lastThree = moods.slice(-3);
  const showLowMoodSupport =
    (activeScore > 0 && activeScore <= 2) ||
    (lastThree.length === 3 && lastThree.every((m) => m.score <= 2));

  // SVG Trend Chart Geometry
  const chartW = 540;
  const chartH = 160;
  const padX = 18;
  const padY = 18;
  const plotW = chartW - padX * 2;
  const plotH = chartH - padY * 2;

  const coords = useMemo(() => {
    return days30.map((d, i) => {
      const x = padX + (i / 29) * plotW;
      const y = d.entry
        ? padY + ((5 - d.entry.score) / 4) * plotH
        : null;
      return { ...d, x, y };
    });
  }, [days30, plotW, plotH]);

  const polylinePoints = useMemo(() => {
    const pts = coords.filter((c): c is typeof c & { y: number } => c.y !== null);
    if (pts.length === 0) return '';
    return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }, [coords]);

  const areaPath = useMemo(() => {
    const pts = coords.filter((c): c is typeof c & { y: number } => c.y !== null);
    if (pts.length < 2) return '';
    const bottomY = padY + plotH;
    const segments = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
    segments.push(`L ${pts[pts.length - 1].x.toFixed(1)} ${bottomY.toFixed(1)}`);
    segments.push(`L ${pts[0].x.toFixed(1)} ${bottomY.toFixed(1)} Z`);
    return segments.join(' ');
  }, [coords, plotH]);

  const inspectedPoint =
    hoveredIndex !== null
      ? coords[hoveredIndex]
      : latestLogged
        ? coords[latestLogged.index]
        : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!activeScore) {
      setErrorMsg('Select a mood rating before saving.');
      return;
    }
    setSaving(true);
    try {
      await onSaveMood(selectedDate, activeScore, moodNote);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save mood entry.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold text-[#0f2422] dark:text-white">
          Mood Tracker
        </h2>
        <span className="inline-flex items-center gap-1 text-xs text-[#476360] dark:text-[#9ab3b0]">
          <Lock className="w-3.5 h-3.5" />
          Private to you
        </span>
      </div>

      {/* Daily Check-in Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl glass-panel p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[#476360] dark:text-[#9ab3b0]">
            How are you feeling {selectedDate === today ? 'today' : `on ${selectedDate}`}?
          </p>
          <input
            type="date"
            aria-label="Mood check-in date"
            min={minDate}
            max={today}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value || today)}
            className="font-mono-tabular text-xs rounded-xl glass-input px-2.5 py-1.5 focus:outline-2 focus:outline-[#0f766e]"
          />
        </div>

        <div className="grid grid-cols-5 gap-2">
          {MOODS.map((m) => {
            const selected = activeScore === m.score;
            return (
              <button
                key={m.score}
                type="button"
                onClick={() => setPickedScore(m.score)}
                title={`${m.label} (${m.score}/5)`}
                aria-label={`${m.label} (${m.score} out of 5)`}
                className={`flex flex-col items-center justify-center min-h-[60px] rounded-xl border-2 py-2 transition-colors cursor-pointer ${
                  selected
                    ? 'border-[#0f766e] dark:border-[#2dd4bf] bg-teal-50/85 dark:bg-teal-950/45'
                    : 'border-white/70 dark:border-white/10 glass-inset hover:border-[#0f766e]/50'
                }`}
              >
                <span className="text-2xl leading-none">{m.emoji}</span>
                <span className="mt-1 text-[11px] font-medium text-[#476360] dark:text-[#9ab3b0]">
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>

        {errorMsg && (
          <p className="text-xs font-medium text-red-600 dark:text-red-400">{errorMsg}</p>
        )}

        <textarea
          rows={2}
          maxLength={500}
          value={moodNote}
          onChange={(e) => setMoodNote(e.target.value)}
          placeholder="Anything on your mind? (optional)"
          className="w-full rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
        />

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="min-h-[40px] px-5 py-2 rounded-xl bg-[#0f766e] text-white text-sm font-semibold hover:bg-[#0d645d] dark:bg-[#2dd4bf] dark:text-[#06201d] dark:hover:bg-[#14b8a6] disabled:opacity-60 transition-colors cursor-pointer"
          >
            {saving
              ? 'Saving...'
              : existingForSelected
                ? 'Update check-in'
                : 'Save check-in'}
          </button>
          {savedToast && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Saved
            </span>
          )}
        </div>
      </form>

      {/* 30-Day Mood Trend Visualization */}
      <div className="rounded-2xl glass-panel p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#0f766e] dark:text-[#2dd4bf]" />
            <h3 className="font-display text-base font-bold text-[#0f2422] dark:text-white">
              30-day mood trend
            </h3>
          </div>
          <span className="font-mono-tabular text-xs text-[#476360] dark:text-[#9ab3b0]">
            {days30[0].shortLabel} – {days30[29].shortLabel}
          </span>
        </div>

        {/* Summary Metrics (Unboxed Tabular Numerals) */}
        <div className="grid grid-cols-3 gap-3 border-y border-[#cfe0dd]/60 dark:border-white/10 py-3">
          <div>
            <div className="text-[11px] text-[#476360] dark:text-[#9ab3b0]">30-day average</div>
            <div className="mt-0.5 font-mono-tabular text-base font-bold text-[#0f2422] dark:text-white">
              {average30 ? `${average30} / 5` : '—'}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#476360] dark:text-[#9ab3b0]">Days logged</div>
            <div className="mt-0.5 font-mono-tabular text-base font-bold text-[#0f2422] dark:text-white">
              {logged30.length} / 30
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#476360] dark:text-[#9ab3b0]">Latest</div>
            <div className="mt-0.5 font-mono-tabular text-base font-bold text-[#0f766e] dark:text-[#2dd4bf] truncate">
              {latestMoodMeta ? `${latestMoodMeta.emoji} ${latestMoodMeta.label}` : '—'}
            </div>
          </div>
        </div>

        {logged30.length > 0 ? (
          <div className="space-y-2">
            <div className="w-full overflow-hidden">
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                role="img"
                aria-label="30-day mood trend line chart"
                className="w-full h-40 overflow-visible"
              >
                <defs>
                  <linearGradient id="moodAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Horizontal 1..5 Reference Lines */}
                {[1, 2, 3, 4, 5].map((level) => {
                  const y = padY + ((5 - level) / 4) * plotH;
                  return (
                    <g key={level}>
                      <line
                        x1={padX}
                        y1={y}
                        x2={chartW - padX}
                        y2={y}
                        stroke="currentColor"
                        strokeDasharray="3 3"
                        className="text-[#cadad7] dark:text-white/10"
                      />
                      <text
                        x={2}
                        y={y + 3}
                        fontSize="10"
                        className="fill-[#647e7b] dark:fill-[#7f9c99] font-mono-tabular"
                      >
                        {level}
                      </text>
                    </g>
                  );
                })}

                {/* Area Fill */}
                {areaPath && <path d={areaPath} fill="url(#moodAreaGrad)" />}

                {/* Trend Polyline */}
                {polylinePoints && (
                  <polyline
                    fill="none"
                    stroke="#0f766e"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylinePoints}
                    className="dark:stroke-[#2dd4bf]"
                  />
                )}

                {/* Interactive Day Points */}
                {coords.map((pt) => {
                  const isHovered = hoveredIndex === pt.index;
                  const isSelectedDay = pt.date === selectedDate;
                  if (pt.y === null) {
                    return (
                      <rect
                        key={pt.date}
                        x={pt.x - 6}
                        y={padY}
                        width={12}
                        height={plotH}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredIndex(pt.index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onClick={() => setSelectedDate(pt.date)}
                      />
                    );
                  }
                  return (
                    <g
                      key={pt.date}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(pt.index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onClick={() => setSelectedDate(pt.date)}
                    >
                      <rect
                        x={pt.x - 8}
                        y={padY}
                        width={16}
                        height={plotH}
                        fill="transparent"
                      />
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered || isSelectedDay ? 5.5 : 3.8}
                        className={`transition-all ${
                          isHovered || isSelectedDay
                            ? 'fill-[#0f766e] dark:fill-[#2dd4bf] stroke-white dark:stroke-[#0f1f1d]'
                            : 'fill-white dark:fill-[#0f1f1d] stroke-[#0f766e] dark:stroke-[#2dd4bf]'
                        }`}
                        strokeWidth="2"
                      />
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* X-axis Milestone Labels */}
            <div className="flex items-center justify-between font-mono-tabular text-[11px] text-[#476360] dark:text-[#9ab3b0]">
              <span>{days30[0].shortLabel}</span>
              <span>{days30[10].shortLabel}</span>
              <span>{days30[20].shortLabel}</span>
              <span>Today</span>
            </div>

            {/* Selected / Hovered Day Readout */}
            {inspectedPoint && (
              <div className="rounded-xl glass-inset px-3 py-2 text-xs flex items-center justify-between gap-2">
                <span className="font-mono-tabular font-medium text-[#0f2422] dark:text-white">
                  {inspectedPoint.date}
                </span>
                {inspectedPoint.entry ? (
                  <span className="text-[#476360] dark:text-[#9ab3b0] truncate">
                    {MOODS.find((m) => m.score === inspectedPoint.entry?.score)?.emoji}{' '}
                    {MOODS.find((m) => m.score === inspectedPoint.entry?.score)?.label} (
                    {inspectedPoint.entry.score}/5)
                    {inspectedPoint.entry.note ? ` · ${inspectedPoint.entry.note}` : ''}
                  </span>
                ) : (
                  <span className="text-[#476360] dark:text-[#9ab3b0]">
                    No entry — tap chart to log this day
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 text-center space-y-1">
            <p className="text-sm text-[#476360] dark:text-[#9ab3b0]">
              No mood check-ins recorded in the last 30 days.
            </p>
            <p className="text-xs text-[#476360] dark:text-[#9ab3b0]">
              Pick a mood above to start your 30-day trend line.
            </p>
          </div>
        )}
      </div>

      {/* Compassionate Low-Mood Support */}
      {showLowMoodSupport && (
        <div className="rounded-2xl border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-950/30 backdrop-blur-xl p-5 space-y-3">
          <div className="flex items-start gap-2.5">
            <HeartHandshake className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display text-base font-bold text-[#0f2422] dark:text-white">
                Feeling low for a while?
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-[#476360] dark:text-[#9ab3b0]">
                You don&apos;t have to handle it alone. Talking to a campus counsellor can help, and
                Tele-MANAS is free and open 24×7.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate('counselling')}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0f766e] text-white text-xs font-semibold hover:bg-[#0d645d] cursor-pointer"
            >
              Book a counsellor
            </button>
            <a
              href={buildTelHref(WELLNESS_CONTACTS.tele_manas)}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
            >
              <Phone className="w-3.5 h-3.5" />
              Call {WELLNESS_CONTACTS.tele_manas}
            </a>
          </div>
        </div>
      )}
    </section>
  );
}

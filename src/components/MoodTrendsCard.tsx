import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarDays, TrendingUp } from 'lucide-react';
import { DAYS, MOODS, toIsoDate } from '../data/wellnessData';
import type { MoodEntry } from '../types/wellness';

interface MoodTrendsCardProps {
  moods: MoodEntry[];
  onLogToday?: () => void;
}

type ChartMode = 'trend' | 'bars';

interface WeekDayDatum {
  date: string;
  dayShort: string;
  dateShort: string;
  axisLabel: string;
  score: number | null;
  moodLabel: string;
  emoji: string;
  note: string;
  isToday: boolean;
}

const SCORE_COLORS: Record<number, string> = {
  1: '#dc2626', // Awful
  2: '#d97706', // Low
  3: '#0891b2', // Okay
  4: '#0f766e', // Good
  5: '#16a34a', // Great
};

function getScoreMeta(score: number | null) {
  if (score === null) return null;
  return MOODS.find((m) => m.score === score) ?? null;
}

function MoodTrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: WeekDayDatum }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0]?.payload;
  if (!datum) return null;

  return (
    <div className="rounded-xl bg-white/95 dark:bg-[#0f1f1d]/95 backdrop-blur-xl border border-[#cfe0dd] dark:border-white/15 px-3.5 py-2.5 shadow-lg max-w-[240px] space-y-1">
      <div className="flex items-center justify-between gap-3 text-xs text-[#476360] dark:text-[#9ab3b0]">
        <span className="font-semibold text-[#0f2422] dark:text-white">
          {datum.dayShort} · {datum.dateShort}
        </span>
        {datum.isToday && <span className="font-mono-tabular">Today</span>}
      </div>

      {datum.score !== null ? (
        <>
          <div className="flex items-center gap-2 text-sm font-bold text-[#0f2422] dark:text-white">
            <span>{datum.emoji}</span>
            <span>{datum.moodLabel}</span>
            <span className="font-mono-tabular text-xs font-semibold text-[#0f766e] dark:text-[#2dd4bf]">
              {datum.score} / 5
            </span>
          </div>
          {datum.note && (
            <p className="text-xs text-[#476360] dark:text-[#9ab3b0] line-clamp-2 pt-0.5 border-t border-[#cfe0dd]/60 dark:border-white/10">
              {datum.note}
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-[#476360] dark:text-[#9ab3b0]">No check-in logged</p>
      )}
    </div>
  );
}

export function MoodTrendsCard({ moods, onLogToday }: MoodTrendsCardProps) {
  const [chartMode, setChartMode] = useState<ChartMode>('trend');

  const { weekData, loggedDays, weeklyAvg, peakDay, weekDelta, rangeLabel } = useMemo(() => {
    const moodByDate = new Map<string, MoodEntry>();
    for (const entry of moods) {
      moodByDate.set(entry.date, entry);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = toIsoDate(today);

    const days: WeekDayDatum[] = [];
    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      const iso = toIsoDate(d);
      const entry = moodByDate.get(iso);
      const meta = entry ? getScoreMeta(entry.score) : null;
      const dayShort = DAYS[d.getDay()];
      const dateShort = d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });

      days.push({
        date: iso,
        dayShort,
        dateShort,
        axisLabel: iso === todayIso ? 'Today' : `${dayShort} ${d.getDate()}`,
        score: entry ? entry.score : null,
        moodLabel: meta?.label ?? 'Not logged',
        emoji: meta?.emoji ?? '—',
        note: entry?.note ?? '',
        isToday: iso === todayIso,
      });
    }

    const logged = days.filter((d): d is WeekDayDatum & { score: number } => d.score !== null);
    const avg =
      logged.length > 0
        ? Number((logged.reduce((acc, d) => acc + d.score, 0) / logged.length).toFixed(1))
        : null;

    let peak: (WeekDayDatum & { score: number }) | null = null;
    for (const d of logged) {
      if (!peak || d.score > peak.score) {
        peak = d;
      }
    }

    // Prior 7-day baseline [today - 13 .. today - 7]
    const priorScores: number[] = [];
    for (let offset = 13; offset >= 7; offset--) {
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      const entry = moodByDate.get(toIsoDate(d));
      if (entry) priorScores.push(entry.score);
    }
    let delta: number | null = null;
    if (avg !== null && priorScores.length > 0) {
      const priorAvg = priorScores.reduce((a, b) => a + b, 0) / priorScores.length;
      delta = Number((avg - priorAvg).toFixed(1));
    }

    return {
      weekData: days,
      loggedDays: logged,
      weeklyAvg: avg,
      peakDay: peak,
      weekDelta: delta,
      rangeLabel: `${days[0].dateShort} – ${days[6].dateShort}`,
    };
  }, [moods]);

  const avgMeta = weeklyAvg !== null ? getScoreMeta(Math.round(weeklyAvg)) : null;

  return (
    <section
      aria-labelledby="mood-trends-heading"
      className="rounded-2xl glass-panel p-5 sm:p-6 space-y-5"
    >
      {/* Header + Segmented View Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#476360] dark:text-[#9ab3b0]">
            <CalendarDays className="w-3.5 h-3.5 text-[#0f766e] dark:text-[#2dd4bf]" />
            <span>Past 7 days</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">{rangeLabel}</span>
          </div>
          <h2
            id="mood-trends-heading"
            className="font-display text-xl font-bold text-[#0f2422] dark:text-white flex items-center gap-2"
          >
            <TrendingUp className="w-5 h-5 text-[#0f766e] dark:text-[#2dd4bf]" />
            <span>Mood Trends</span>
          </h2>
        </div>

        <div
          role="group"
          aria-label="Mood chart display mode"
          className="inline-flex items-center self-start sm:self-auto rounded-xl glass-inset p-1 gap-1"
        >
          <button
            type="button"
            onClick={() => setChartMode('trend')}
            className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              chartMode === 'trend'
                ? 'bg-white dark:bg-[#132623] text-[#0f2422] dark:text-white shadow-xs'
                : 'text-[#476360] dark:text-[#9ab3b0] hover:text-[#0f2422] dark:hover:text-white'
            }`}
          >
            Weekly Trend
          </button>
          <button
            type="button"
            onClick={() => setChartMode('bars')}
            className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              chartMode === 'bars'
                ? 'bg-white dark:bg-[#132623] text-[#0f2422] dark:text-white shadow-xs'
                : 'text-[#476360] dark:text-[#9ab3b0] hover:text-[#0f2422] dark:hover:text-white'
            }`}
          >
            Daily Bars
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-y border-[#cfe0dd]/60 dark:border-white/10 py-3.5">
        <div>
          <div className="text-xs text-[#476360] dark:text-[#9ab3b0]">Weekly average</div>
          <div className="mt-0.5 font-mono-tabular text-lg font-bold text-[#0f2422] dark:text-white">
            {weeklyAvg !== null ? `${weeklyAvg} / 5` : '—'}
            {avgMeta && (
              <span className="ml-1.5 text-xs font-sans font-medium text-[#0f766e] dark:text-[#2dd4bf]">
                {avgMeta.label}
              </span>
            )}
          </div>
        </div>

        <div>
          <div className="text-xs text-[#476360] dark:text-[#9ab3b0]">Check-ins</div>
          <div className="mt-0.5 font-mono-tabular text-lg font-bold text-[#0f2422] dark:text-white">
            {loggedDays.length} / 7 days
          </div>
        </div>

        <div>
          <div className="text-xs text-[#476360] dark:text-[#9ab3b0]">Peak day</div>
          <div className="mt-0.5 text-lg font-bold text-[#0f2422] dark:text-white truncate">
            {peakDay ? (
              <span className="font-mono-tabular text-base">
                {peakDay.emoji} {peakDay.dayShort} ({peakDay.score}/5)
              </span>
            ) : (
              <span className="font-mono-tabular">—</span>
            )}
          </div>
        </div>

        <div>
          <div className="text-xs text-[#476360] dark:text-[#9ab3b0]">vs. prior week</div>
          <div
            className={`mt-0.5 font-mono-tabular text-base font-bold ${
              weekDelta === null
                ? 'text-[#476360] dark:text-[#9ab3b0]'
                : weekDelta > 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : weekDelta < 0
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-[#0f766e] dark:text-[#2dd4bf]'
            }`}
          >
            {weekDelta === null
              ? 'Baseline pending'
              : weekDelta > 0
                ? `+${weekDelta} higher`
                : weekDelta < 0
                  ? `${weekDelta} lower`
                  : 'Steady (0.0)'}
          </div>
        </div>
      </div>

      {/* Recharts Visualization */}
      {loggedDays.length > 0 ? (
        <div className="space-y-3">
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'trend' ? (
                <AreaChart data={weekData} margin={{ top: 12, right: 16, left: -12, bottom: 4 }}>
                  <defs>
                    <linearGradient id="weeklyMoodGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.34} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(100, 126, 123, 0.22)"
                  />
                  <XAxis
                    dataKey="axisLabel"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#647e7b', fontSize: 12 }}
                    dy={6}
                  />
                  <YAxis
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#647e7b', fontSize: 12 }}
                    tickFormatter={(val: number) => `${val}`}
                  />
                  <Tooltip
                    content={<MoodTrendTooltip />}
                    cursor={{ stroke: '#0f766e', strokeOpacity: 0.25, strokeWidth: 1.5 }}
                  />
                  {weeklyAvg !== null && (
                    <ReferenceLine
                      y={weeklyAvg}
                      stroke="#0f766e"
                      strokeDasharray="4 4"
                      strokeOpacity={0.55}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="score"
                    connectNulls
                    stroke="#0f766e"
                    strokeWidth={2.75}
                    fill="url(#weeklyMoodGradient)"
                    dot={{
                      r: 5,
                      fill: '#ffffff',
                      stroke: '#0f766e',
                      strokeWidth: 2.5,
                    }}
                    activeDot={{
                      r: 7,
                      fill: '#14b8a6',
                      stroke: '#ffffff',
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={weekData} margin={{ top: 12, right: 16, left: -12, bottom: 4 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(100, 126, 123, 0.22)"
                  />
                  <XAxis
                    dataKey="axisLabel"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#647e7b', fontSize: 12 }}
                    dy={6}
                  />
                  <YAxis
                    domain={[0, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#647e7b', fontSize: 12 }}
                  />
                  <Tooltip
                    content={<MoodTrendTooltip />}
                    cursor={{ fill: 'rgba(20, 184, 166, 0.08)' }}
                  />
                  {weeklyAvg !== null && (
                    <ReferenceLine
                      y={weeklyAvg}
                      stroke="#0f766e"
                      strokeDasharray="4 4"
                      strokeOpacity={0.55}
                    />
                  )}
                  <Bar
                    dataKey="score"
                    radius={[8, 8, 2, 2]}
                    maxBarSize={44}
                    background={{ fill: 'rgba(148, 163, 184, 0.12)', radius: 8 }}
                  >
                    {weekData.map((entry) => (
                      <Cell
                        key={entry.date}
                        fill={
                          entry.score !== null
                            ? SCORE_COLORS[entry.score] || '#0f766e'
                            : 'transparent'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* 7-Day Legend / Quick Mood Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-[#476360] dark:text-[#9ab3b0]">
            <div className="flex flex-wrap items-center gap-3">
              {MOODS.map((m) => (
                <span key={m.score} className="inline-flex items-center gap-1 font-mono-tabular">
                  <span>{m.emoji}</span>
                  <span>
                    {m.score} {m.label}
                  </span>
                </span>
              ))}
            </div>
            {weeklyAvg !== null && (
              <span className="font-mono-tabular">Dashed line: 7-day avg ({weeklyAvg})</span>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl glass-inset py-10 px-6 text-center space-y-3">
          <p className="text-sm font-medium text-[#0f2422] dark:text-white">
            No mood entries logged over the past 7 days.
          </p>
          <p className="text-xs text-[#476360] dark:text-[#9ab3b0] max-w-md mx-auto">
            Log your daily mood in the Mood Tracker above to visualize your weekly emotional trend,
            average score, and day-by-day patterns.
          </p>
          {onLogToday && (
            <button
              type="button"
              onClick={onLogToday}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0f766e] text-white text-xs font-semibold hover:bg-[#0d645d] dark:bg-[#2dd4bf] dark:text-[#06201d] dark:hover:bg-[#14b8a6] transition-colors cursor-pointer"
            >
              Log today&apos;s mood
            </button>
          )}
        </div>
      )}
    </section>
  );
}

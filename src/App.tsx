import React, { useEffect, useState } from 'react';
import { BellRing, Clock, X } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WellnessDataProvider } from './context/WellnessDataContext';
import { AuthView } from './components/AuthView';
import { BookingView } from './components/BookingView';
import { CounsellingView } from './components/CounsellingView';
import { DoctorPortalView } from './components/DoctorPortalView';
import { DoctorsView } from './components/DoctorsView';
import { EmergencyView } from './components/EmergencyView';
import { HomeView } from './components/HomeView';
import { MoreView } from './components/MoreView';
import { MyHealthView } from './components/MyHealthView';
import { Navbar } from './components/Navbar';
import type { AppView } from './types/wellness';
import { formatTime12h } from './data/wellnessData';
import {
  HealthReminder,
  TEST_REMINDER_EVENT,
  checkDueReminders,
  snoozeHealthReminder,
} from './utils/healthReminders';

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#f5f8f7] dark:bg-[#0b1413]">
          <div className="max-w-lg w-full rounded-2xl border border-red-200 dark:border-red-900 bg-white dark:bg-[#13201e] p-6 space-y-4">
            <h1 className="font-display text-xl font-bold text-[#112624] dark:text-white">
              Something went wrong
            </h1>
            <p className="text-sm text-[#4b6360] dark:text-[#98b1ae] break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.hash = '#/home';
              }}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-[#0f766e] text-white text-sm font-semibold cursor-pointer"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function parseHash(): { view: AppView; arg: string } {
  const raw = window.location.hash || '#/home';
  const cleaned = raw.startsWith('#/') ? raw.slice(2) : raw.replace(/^#/, '');
  const [name, arg = ''] = cleaned.split('/');
  const validViews: AppView[] = [
    'home',
    'doctors',
    'counselling',
    'me',
    'more',
    'emergency',
    'book',
    'auth',
    'doctor-portal',
  ];
  const view = validViews.includes(name as AppView) ? (name as AppView) : 'home';
  return { view, arg };
}

function WellnessShell() {
  const { profile, isVerifiedDoctor } = useAuth();
  const [route, setRoute] = useState<{ view: AppView; arg: string }>(() => parseHash());
  const [, setMinuteTick] = useState(0);
  const [activeAlerts, setActiveAlerts] = useState<HealthReminder[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('iitdh_theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem('iitdh_theme', darkMode ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [darkMode]);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setMinuteTick((t) => t + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const runCheck = () => {
      const due = checkDueReminders(new Date());
      if (due.length > 0) {
        setActiveAlerts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          return [...prev, ...due.filter((d) => !existingIds.has(d.id))];
        });
      }
    };

    const onTestAlert = (ev: Event) => {
      const customEv = ev as CustomEvent<HealthReminder>;
      if (customEv.detail) {
        setActiveAlerts((prev) => {
          const withoutSame = prev.filter((p) => p.id !== customEv.detail.id);
          return [...withoutSame, customEv.detail];
        });
      }
    };

    runCheck();
    const poll = setInterval(runCheck, 15000);
    window.addEventListener(TEST_REMINDER_EVENT, onTestAlert);
    return () => {
      clearInterval(poll);
      window.removeEventListener(TEST_REMINDER_EVENT, onTestAlert);
    };
  }, []);

  function dismissAlert(id: string) {
    setActiveAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  function snoozeAlert(id: string) {
    snoozeHealthReminder(id, 10);
    setActiveAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  function navigate(view: AppView, arg = '') {
    const targetHash = arg ? `#/${view}/${arg}` : `#/${view}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    } else {
      setRoute({ view, arg });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const effectiveView: AppView =
    route.view === 'doctor-portal' && (!isVerifiedDoctor || profile?.role !== 'doctor')
      ? 'auth'
      : route.view;

  return (
    <div className="min-h-screen flex flex-col text-[#0f2422] dark:text-[#e6f2f0] pb-20 lg:pb-0">
      <Navbar
        currentView={effectiveView}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
        onNavigate={navigate}
      />

      <div className="lg:pl-64 flex-1 flex flex-col">
        {activeAlerts.length > 0 && (
          <div
            role="status"
            aria-live="polite"
            className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 space-y-2"
          >
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-2xl glass-panel border-teal-400/60 dark:border-teal-500/30 bg-teal-50/85 dark:bg-teal-950/60 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <BellRing className="w-5 h-5 text-[#0f766e] dark:text-[#2dd4bf] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-[#0f2422] dark:text-white">
                      {alert.category === 'medication'
                        ? 'Medication Reminder'
                        : 'Appointment Reminder'}{' '}
                      · {alert.title}
                    </p>
                    <p className="text-xs text-[#4b6360] dark:text-[#98b1ae]">
                      <span className="font-mono-tabular">{formatTime12h(alert.time)}</span>
                      {alert.notes ? ` · ${alert.notes}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => snoozeAlert(alert.id)}
                    className="inline-flex items-center gap-1 min-h-[34px] px-3 py-1 rounded-lg glass-panel text-xs font-semibold text-[#0f2422] dark:text-white cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Snooze 10m
                  </button>
                  <button
                    type="button"
                    onClick={() => dismissAlert(alert.id)}
                    aria-label="Dismiss reminder alert"
                    className="inline-flex items-center gap-1 min-h-[34px] px-3 py-1 rounded-lg bg-[#0f766e] text-white dark:bg-[#2dd4bf] dark:text-[#06201d] text-xs font-semibold cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {effectiveView === 'home' && <HomeView onNavigate={navigate} />}
          {effectiveView === 'doctors' && <DoctorsView onNavigate={navigate} />}
          {effectiveView === 'counselling' && <CounsellingView onNavigate={navigate} />}
          {effectiveView === 'me' && <MyHealthView onNavigate={navigate} />}
          {effectiveView === 'more' && (
            <MoreView darkMode={darkMode} onToggleDark={() => setDarkMode((d) => !d)} />
          )}
          {effectiveView === 'emergency' && <EmergencyView onNavigate={navigate} />}
          {effectiveView === 'book' && (
            <BookingView practitionerId={route.arg} onNavigate={navigate} />
          )}
          {effectiveView === 'auth' && <AuthView onNavigate={navigate} />}
          {effectiveView === 'doctor-portal' && <DoctorPortalView />}
        </main>

        <footer className="border-t border-[#cfe0dd]/70 dark:border-white/10 glass-chrome mt-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#55706c] dark:text-[#86a39f]">
            <p>IIT Dharwad Wellness Centre · Campus Medical &amp; Counselling Services</p>
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => navigate('emergency')}
                className="hover:text-[#0f766e] dark:hover:text-[#2dd4bf] cursor-pointer"
              >
                Emergency SOS
              </button>
              <button
                type="button"
                onClick={() => navigate('auth')}
                className="hover:text-[#0f766e] dark:hover:text-[#2dd4bf] cursor-pointer"
              >
                Student &amp; Doctor Sign In
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <WellnessDataProvider>
          <WellnessShell />
        </WellnessDataProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}

import {
  AlertTriangle,
  CalendarHeart,
  ClipboardList,
  CreditCard,
  Home,
  LogIn,
  Menu,
  MessageSquareHeart,
  Moon,
  Stethoscope,
  Sun,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { AppView } from '../types/wellness';

interface NavbarProps {
  currentView: AppView;
  darkMode: boolean;
  onToggleDark: () => void;
  onNavigate: (view: AppView, arg?: string) => void;
}

const VIEW_TITLES: Record<AppView, string> = {
  home: 'Overview',
  doctors: 'Doctors & Specialists',
  counselling: 'Counselling Support',
  me: 'My Health',
  more: 'UHID, Insurance & Info',
  emergency: 'Emergency SOS',
  book: 'Book Appointment',
  auth: 'Student & Doctor Sign In',
  'doctor-portal': 'Doctor Desk',
};

export function Navbar({ currentView, darkMode, onToggleDark, onNavigate }: NavbarProps) {
  const { user, profile } = useAuth();
  const isDoctorMode = profile?.role === 'doctor';

  const sidebarItems: { id: AppView; label: string; icon: typeof Home; accent?: 'danger' }[] = [
    { id: 'home', label: 'Overview', icon: Home },
    { id: 'doctors', label: 'Doctors', icon: Stethoscope },
    { id: 'counselling', label: 'Counselling', icon: MessageSquareHeart },
    ...(isDoctorMode
      ? [{ id: 'doctor-portal' as AppView, label: 'Doctor Desk', icon: ClipboardList }]
      : [{ id: 'me' as AppView, label: 'My Health', icon: CalendarHeart }]),
    { id: 'more', label: 'UHID & Insurance', icon: CreditCard },
    { id: 'emergency', label: 'Emergency SOS', icon: AlertTriangle, accent: 'danger' },
  ];

  const mobileTabs: { id: AppView; label: string; icon: typeof Home }[] = isDoctorMode
    ? [
        { id: 'home', label: 'Home', icon: Home },
        { id: 'doctor-portal', label: 'Desk', icon: ClipboardList },
        { id: 'doctors', label: 'Doctors', icon: Stethoscope },
        { id: 'counselling', label: 'Counsel', icon: MessageSquareHeart },
        { id: 'more', label: 'More', icon: Menu },
      ]
    : [
        { id: 'home', label: 'Home', icon: Home },
        { id: 'doctors', label: 'Doctors', icon: Stethoscope },
        { id: 'counselling', label: 'Counsel', icon: MessageSquareHeart },
        { id: 'me', label: 'My Health', icon: CalendarHeart },
        { id: 'more', label: 'More', icon: Menu },
      ];

  const primaryActionLabel = user
    ? isDoctorMode
      ? `Dr. ${profile?.displayName?.split(' ')[0] || 'Portal'}`
      : profile?.displayName?.split(' ')[0] || 'Student'
    : 'Sign In';

  return (
    <>
      {/* Desktop SaaS Glassy Sidebar */}
      <aside
        aria-label="Workspace navigation"
        className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col justify-between border-r glass-chrome px-4 py-5"
      >
        <div className="space-y-6">
          {/* Brand Header */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="w-full text-left px-2 py-1 rounded-xl focus-visible:outline-2 focus-visible:outline-[#0f766e] cursor-pointer"
          >
            <div className="font-display text-lg font-bold tracking-tight text-[#0f766e] dark:text-[#2dd4bf] whitespace-nowrap">
              IIT Dharwad Wellness
            </div>
            <div className="mt-0.5 text-xs text-[#55706c] dark:text-[#86a39f]">
              {user
                ? isDoctorMode
                  ? 'Practitioner Workspace'
                  : 'Student Health Portal'
                : 'Campus Healthcare Portal'}
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const active =
                currentView === item.id ||
                (currentView === 'book' && item.id === 'doctors');
              const isDanger = item.accent === 'danger';

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 min-h-[42px] px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap cursor-pointer ${
                    active
                      ? isDanger
                        ? 'bg-red-600/12 text-red-700 dark:bg-red-500/20 dark:text-red-300 font-semibold border border-red-200/70 dark:border-red-500/30'
                        : 'bg-[#0f766e]/12 text-[#0f766e] dark:bg-[#2dd4bf]/15 dark:text-[#2dd4bf] font-semibold border border-[#0f766e]/20 dark:border-[#2dd4bf]/25'
                      : isDanger
                        ? 'text-red-600 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-950/30 border border-transparent'
                        : 'text-[#395350] dark:text-[#a2bbb8] hover:bg-white/60 dark:hover:bg-white/5 hover:text-[#0f2422] dark:hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Bottom: Theme Switch + Account Trigger */}
        <div className="space-y-3 pt-4 border-t border-[#cfe0dd]/70 dark:border-white/10">
          {/* Segmented Light / Dark Mode Switch */}
          <div
            role="group"
            aria-label="Theme selection"
            className="grid grid-cols-2 gap-1 p-1 rounded-xl glass-inset"
          >
            <button
              type="button"
              onClick={() => darkMode && onToggleDark()}
              className={`flex items-center justify-center gap-1.5 min-h-[34px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                !darkMode
                  ? 'bg-white text-[#0f2422] shadow-xs'
                  : 'text-[#86a39f] hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              Light
            </button>
            <button
              type="button"
              onClick={() => !darkMode && onToggleDark()}
              className={`flex items-center justify-center gap-1.5 min-h-[34px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                darkMode
                  ? 'bg-[#17302d] text-[#2dd4bf] shadow-xs'
                  : 'text-[#55706c] hover:text-[#0f2422]'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              Dark
            </button>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('auth')}
            className="w-full flex items-center justify-between gap-2 min-h-[44px] px-3.5 py-2.5 rounded-xl glass-panel text-left hover:border-[#0f766e]/50 dark:hover:border-[#2dd4bf]/40 transition-colors cursor-pointer"
          >
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#0f2422] dark:text-white truncate">
                {user
                  ? profile?.displayName || user.displayName || 'Account'
                  : 'Student / Doctor Sign In'}
              </div>
              <div className="text-[11px] text-[#55706c] dark:text-[#86a39f] truncate">
                {user
                  ? isDoctorMode
                    ? 'Doctor Portal active'
                    : 'Student Portal active'
                  : 'Supabase Auth'}
              </div>
            </div>
            <LogIn className="w-4 h-4 text-[#0f766e] dark:text-[#2dd4bf] shrink-0" />
          </button>
        </div>
      </aside>

      {/* Top SaaS Breadcrumb & Utility Bar */}
      <header className="sticky top-0 z-20 lg:pl-64 border-b glass-chrome">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 h-14">
          {/* Mobile Brand / Desktop Breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="lg:hidden font-display text-base font-bold tracking-tight text-[#0f766e] dark:text-[#2dd4bf] whitespace-nowrap shrink-0 cursor-pointer"
            >
              IIT Dharwad Wellness
            </button>
            <div className="hidden lg:flex items-center gap-2 text-sm text-[#55706c] dark:text-[#86a39f] truncate">
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="hover:text-[#0f2422] dark:hover:text-white transition-colors cursor-pointer"
              >
                Workspace
              </button>
              <span aria-hidden="true">/</span>
              <span className="font-semibold text-[#0f2422] dark:text-white truncate">
                {VIEW_TITLES[currentView]}
              </span>
            </div>
          </div>

          {/* Right Actions: Theme Switch + Primary Account CTA */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onToggleDark}
              aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              title={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              className="flex items-center justify-center min-h-[40px] min-w-[40px] rounded-xl glass-panel text-[#395350] dark:text-[#c7dcd9] hover:text-[#0f766e] dark:hover:text-[#2dd4bf] transition-colors cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => onNavigate('auth')}
              className="min-h-[40px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#0f766e] text-white hover:bg-[#0d645d] dark:bg-[#2dd4bf] dark:text-[#06201d] dark:hover:bg-[#14b8a6] transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
            >
              {primaryActionLabel}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t glass-chrome pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-15">
          {mobileTabs.map((item) => {
            const Icon = item.icon;
            const active =
              currentView === item.id ||
              (currentView === 'book' && item.id === 'doctors') ||
              (currentView === 'emergency' && item.id === 'home');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center justify-center min-h-[44px] gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
                  active
                    ? 'text-[#0f766e] dark:text-[#2dd4bf] font-semibold'
                    : 'text-[#55706c] dark:text-[#86a39f]'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.25 : 1.75} />
                <span className="truncate max-w-[68px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

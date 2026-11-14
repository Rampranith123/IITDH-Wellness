import { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  MapPin,
  Phone,
  Share2,
} from 'lucide-react';
import {
  EMERGENCY_PROTOCOL,
  WELLNESS_CONTACTS,
  buildTelHref,
} from '../data/wellnessData';
import type { AppView } from '../types/wellness';

interface EmergencyViewProps {
  onNavigate: (view: AppView) => void;
}

export function EmergencyView({ onNavigate }: EmergencyViewProps) {
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [locationText, setLocationText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleShareLocation() {
    setLocationMessage(null);
    if (!navigator.geolocation) {
      setLocationMessage('Geolocation is not supported on this browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false);
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
        const text = `Emergency — I need help at IIT Dharwad. My location: ${mapsUrl}`;
        setLocationText(text);

        if (navigator.share) {
          try {
            await navigator.share({ title: 'Emergency location', text });
            setLocationMessage('Location shared.');
            return;
          } catch {
            // Fall back to copy / anchor link below
          }
        }
        setLocationMessage('Coordinates captured. Copy or send via WhatsApp below.');
      },
      () => {
        setLocating(false);
        setLocationMessage('Could not get location. Please allow location access in browser settings.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleCopy() {
    if (!locationText) return;
    try {
      await navigator.clipboard.writeText(locationText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setLocationMessage('Unable to copy automatically. Select and copy the text manually.');
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <button
        type="button"
        onClick={() => onNavigate('home')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#476360] dark:text-[#9ab3b0] hover:text-[#0f766e] dark:hover:text-[#2dd4bf] cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </button>

      {/* Emergency Protocol Banner */}
      <section className="rounded-2xl border border-red-400/50 dark:border-red-500/30 bg-red-600/95 backdrop-blur-md text-white p-6 sm:p-7 space-y-2 shadow-lg shadow-red-900/15">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h1 className="font-display text-2xl font-bold">Emergency</h1>
        </div>
        <p className="text-sm sm:text-base text-red-50 leading-relaxed">{EMERGENCY_PROTOCOL}</p>
      </section>

      {/* Direct Call Actions */}
      <section className="grid sm:grid-cols-3 gap-3">
        <a
          href={buildTelHref(WELLNESS_CONTACTS.ambulance)}
          className="flex flex-col justify-center items-center text-center min-h-[76px] rounded-2xl bg-red-600 text-white p-4 hover:bg-red-700 transition-colors"
        >
          <span className="inline-flex items-center gap-2 font-display font-bold text-base">
            <Phone className="w-4 h-4" />
            Ambulance
          </span>
          <span className="mt-1 font-mono-tabular text-sm text-red-100">
            {WELLNESS_CONTACTS.ambulance}
          </span>
        </a>

        <a
          href={buildTelHref(WELLNESS_CONTACTS.wellness)}
          className="flex flex-col justify-center items-center text-center min-h-[76px] rounded-2xl bg-[#0f766e] text-white p-4 hover:bg-[#0d645d] transition-colors"
        >
          <span className="inline-flex items-center gap-2 font-display font-bold text-base">
            <Phone className="w-4 h-4" />
            Wellness Centre
          </span>
          <span className="mt-1 font-mono-tabular text-sm text-teal-100">
            {WELLNESS_CONTACTS.wellness}
          </span>
        </a>

        <a
          href={buildTelHref(WELLNESS_CONTACTS.landline)}
          className="flex flex-col justify-center items-center text-center min-h-[76px] rounded-2xl glass-panel p-4 hover:border-[#0f766e] transition-colors"
        >
          <span className="inline-flex items-center gap-2 font-display font-bold text-base text-[#0f2422] dark:text-white">
            <Phone className="w-4 h-4 text-[#0f766e] dark:text-[#2dd4bf]" />
            Landline
          </span>
          <span className="mt-1 font-mono-tabular text-sm text-[#476360] dark:text-[#9ab3b0]">
            {WELLNESS_CONTACTS.landline}
          </span>
        </a>
      </section>

      {/* Location Sharing */}
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0f2422] dark:text-white">
              Share my location
            </h2>
            <p className="mt-1 text-sm text-[#476360] dark:text-[#9ab3b0]">
              Capture your GPS coordinates to send to the ambulance driver, nurse, or a friend.
            </p>
          </div>
          <button
            type="button"
            disabled={locating}
            onClick={handleShareLocation}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2 rounded-xl border border-[#0f766e] text-[#0f766e] dark:border-[#2dd4bf] dark:text-[#2dd4bf] text-sm font-semibold hover:bg-teal-50/70 dark:hover:bg-teal-950/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <MapPin className="w-4 h-4" />
            {locating ? 'Getting location...' : 'Get & share my location'}
          </button>
        </div>

        {locationMessage && (
          <p className="text-xs sm:text-sm text-[#476360] dark:text-[#9ab3b0]">{locationMessage}</p>
        )}

        {locationText && (
          <div className="rounded-xl glass-inset p-4 space-y-3">
            <p className="font-mono-tabular text-xs break-all text-[#0f2422] dark:text-white">
              {locationText}
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 min-h-[38px] px-4 py-1.5 rounded-xl bg-[#0f766e] text-white text-xs font-semibold cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy message'}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(locationText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 min-h-[38px] px-4 py-1.5 rounded-xl glass-input text-xs font-semibold hover:border-[#0f766e]"
              >
                <Share2 className="w-3.5 h-3.5" />
                Send via WhatsApp
              </a>
            </div>
          </div>
        )}
      </section>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Campus Intercom */}
        <section className="rounded-2xl glass-panel p-6 space-y-3">
          <h2 className="font-display text-lg font-bold text-[#0f2422] dark:text-white">
            Campus intercom
          </h2>
          <p className="text-xs text-[#476360] dark:text-[#9ab3b0]">Dial from a campus phone.</p>
          <dl className="divide-y divide-[#cfe0dd]/60 dark:divide-white/10">
            {Object.entries(WELLNESS_CONTACTS.intercom).map(([label, ext]) => (
              <div key={label} className="flex items-center justify-between py-2.5">
                <dt className="text-sm text-[#263f3c] dark:text-[#c7dcd9]">{label}</dt>
                <dd className="font-mono-tabular text-sm font-bold text-[#0f2422] dark:text-white">
                  {ext}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Mental-Health Crisis */}
        <section className="rounded-2xl glass-panel p-6 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0f2422] dark:text-white">
              Mental-health crisis
            </h2>
            <p className="mt-1 text-sm text-[#476360] dark:text-[#9ab3b0]">
              Tele-MANAS provides 24×7 confidential mental health crisis intervention free of
              charge.
            </p>
          </div>
          <a
            href={buildTelHref(WELLNESS_CONTACTS.tele_manas)}
            className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors"
          >
            <Phone className="w-4 h-4" />
            <span className="font-mono-tabular">Tele-MANAS · {WELLNESS_CONTACTS.tele_manas}</span>
          </a>
        </section>
      </div>
    </div>
  );
}

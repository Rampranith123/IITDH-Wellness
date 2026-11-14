import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Mail,
  MapPin,
  Moon,
  Phone,
  Shield,
  Sun,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWellnessData } from '../context/WellnessDataContext';
import {
  WELLNESS_CONTACTS,
  WELLNESS_LINKS,
  buildTelHref,
} from '../data/wellnessData';

interface MoreViewProps {
  darkMode: boolean;
  onToggleDark: () => void;
}

export function MoreView({ darkMode, onToggleDark }: MoreViewProps) {
  const { user, profile, updateStudentProfile } = useAuth();
  const { localUhid, saveLocalUhid } = useWellnessData();

  const [name, setName] = useState(profile?.displayName || localUhid.name || '');
  const [roll, setRoll] = useState(profile?.rollNumber || localUhid.roll || '');
  const [uhid, setUhid] = useState(profile?.uhid || localUhid.uhid || '');
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.displayName || '');
      setRoll(profile.rollNumber || '');
      setUhid(profile.uhid || '');
    } else {
      setName(localUhid.name || '');
      setRoll(localUhid.roll || '');
      setUhid(localUhid.uhid || '');
    }
  }, [profile, localUhid]);

  async function handleSaveUhid(e: React.FormEvent) {
    e.preventDefault();
    if (user && profile) {
      await updateStudentProfile({
        displayName: name.trim() || profile.displayName,
        rollNumber: roll.trim(),
        uhid: uhid.trim(),
        hostelOrDept: profile.hostelOrDept || '',
      });
    } else {
      saveLocalUhid({
        name: name.trim(),
        roll: roll.trim(),
        uhid: uhid.trim(),
      });
    }
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  }

  const insuranceLinks = [
    { key: 'insurancePolicy', label: 'Policy' },
    { key: 'insurancePpt', label: 'Presentation' },
    { key: 'claimProcess', label: 'Claim process' },
    { key: 'claimForm', label: 'Claim form' },
  ].filter((item) => Boolean(WELLNESS_LINKS[item.key]));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#cfe0dd]/70 dark:border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0f2422] dark:text-white">
            UHID, Insurance &amp; Contact
          </h1>
          <p className="mt-1 text-sm text-[#476360] dark:text-[#9ab3b0]">
            Digital Wellness Centre card, student IPD insurance resources, and campus helplines.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleDark}
          className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-xl glass-input text-xs sm:text-sm font-medium hover:border-[#0f766e] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {darkMode ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-[#0f766e]" />
          )}
          {darkMode ? 'Light mode' : 'Dark mode'}
        </button>
      </div>

      <div className="grid xl:grid-cols-12 gap-8 items-start">
        {/* UHID Card & Editor */}
        <section className="xl:col-span-6 space-y-4">
          <h2 className="font-display text-xl font-bold text-[#0f2422] dark:text-white">
            UHID card
          </h2>

          {uhid && (
            <div className="rounded-2xl bg-gradient-to-br from-[#0f766e] via-[#0d6c65] to-[#0e7490] border border-white/25 text-white p-6 space-y-3 shadow-lg shadow-teal-900/20">
              <div className="text-sm font-medium text-teal-50">
                {name || 'IIT Dharwad Member'}
                {roll ? ` · ${roll}` : ''}
              </div>
              <div className="font-mono-tabular text-2xl sm:text-3xl font-bold tracking-wider">
                UHID {uhid}
              </div>
              <div className="text-xs text-teal-100">IIT Dharwad Wellness Centre</div>
            </div>
          )}

          <form onSubmit={handleSaveUhid} className="rounded-2xl glass-panel p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
                Name
              </label>
              <input
                type="text"
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full min-h-[42px] rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
                  Roll no.
                </label>
                <input
                  type="text"
                  maxLength={30}
                  value={roll}
                  onChange={(e) => setRoll(e.target.value)}
                  placeholder="e.g., 240010042"
                  className="font-mono-tabular w-full min-h-[42px] rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
                  UHID number
                </label>
                <input
                  type="text"
                  maxLength={40}
                  value={uhid}
                  onChange={(e) => setUhid(e.target.value)}
                  placeholder="Enter UHID"
                  className="font-mono-tabular w-full min-h-[42px] rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="min-h-[40px] px-5 py-2 rounded-xl bg-[#0f766e] text-white text-sm font-semibold hover:bg-[#0d645d] dark:bg-[#2dd4bf] dark:text-[#06201d] dark:hover:bg-[#14b8a6] transition-colors cursor-pointer"
              >
                {user ? 'Save to account' : 'Save on this phone'}
              </button>
              {savedMsg && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  Saved
                </span>
              )}
            </div>
          </form>
        </section>

        {/* IPD Insurance, Contact & Feedback */}
        <section className="xl:col-span-6 space-y-6">
          <div className="rounded-2xl glass-panel p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#0f766e] dark:text-[#2dd4bf]" />
              <h2 className="font-display text-lg font-bold text-[#0f2422] dark:text-white">
                IPD insurance (students)
              </h2>
            </div>
            {insuranceLinks.length > 0 ? (
              <div className="flex flex-wrap gap-2.5 pt-1">
                {insuranceLinks.map((item) => (
                  <a
                    key={item.key}
                    href={WELLNESS_LINKS[item.key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-xl glass-input text-sm font-medium text-[#0f766e] dark:text-[#2dd4bf]"
                  >
                    {item.label}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#476360] dark:text-[#9ab3b0]">
                Documents (Policy, Presentation, Claim process, and Claim form) are hosted on the
                official IIT Dharwad Wellness page.
              </p>
            )}
          </div>

          <div className="rounded-2xl glass-panel p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-[#0f2422] dark:text-white">
              Contact
            </h2>
            <dl className="divide-y divide-[#cfe0dd]/60 dark:divide-white/10 text-sm">
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-[#476360] dark:text-[#9ab3b0]">Ambulance</dt>
                <dd>
                  <a
                    href={buildTelHref(WELLNESS_CONTACTS.ambulance)}
                    className="inline-flex items-center gap-1.5 font-mono-tabular font-semibold text-[#0f766e] dark:text-[#2dd4bf] hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {WELLNESS_CONTACTS.ambulance}
                  </a>
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-[#476360] dark:text-[#9ab3b0]">Wellness Centre</dt>
                <dd>
                  <a
                    href={buildTelHref(WELLNESS_CONTACTS.wellness)}
                    className="inline-flex items-center gap-1.5 font-mono-tabular font-semibold text-[#0f766e] dark:text-[#2dd4bf] hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {WELLNESS_CONTACTS.wellness}
                  </a>
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-[#476360] dark:text-[#9ab3b0]">Landline</dt>
                <dd>
                  <a
                    href={buildTelHref(WELLNESS_CONTACTS.landline)}
                    className="font-mono-tabular font-semibold text-[#0f766e] dark:text-[#2dd4bf] hover:underline"
                  >
                    {WELLNESS_CONTACTS.landline}
                  </a>
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5 gap-4">
                <dt className="text-[#476360] dark:text-[#9ab3b0]">Email</dt>
                <dd className="truncate">
                  <a
                    href={`mailto:${WELLNESS_CONTACTS.email}`}
                    className="inline-flex items-center gap-1.5 font-mono-tabular font-semibold text-[#0f766e] dark:text-[#2dd4bf] hover:underline"
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    {WELLNESS_CONTACTS.email}
                  </a>
                </dd>
              </div>
            </dl>
            {WELLNESS_LINKS.map && (
              <a
                href={WELLNESS_LINKS.map}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-xl glass-input text-sm font-semibold text-[#0f766e] dark:text-[#2dd4bf]"
              >
                <MapPin className="w-4 h-4" />
                Wellness Centre location
              </a>
            )}
          </div>

          <div className="rounded-2xl glass-panel p-6 space-y-2">
            <h2 className="font-display text-lg font-bold text-[#0f2422] dark:text-white">
              Feedback
            </h2>
            {WELLNESS_LINKS.feedbackWellness ? (
              <a
                href={WELLNESS_LINKS.feedbackWellness}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0f766e] dark:text-[#2dd4bf] hover:underline"
              >
                Wellness Centre feedback form
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <p className="text-sm text-[#476360] dark:text-[#9ab3b0]">
                Feedback form link is available on the official IIT Dharwad Wellness page.
              </p>
            )}
          </div>
        </section>
      </div>

      <p className="text-center text-xs text-[#476360] dark:text-[#9ab3b0] pt-2">
        Doctor timings are shown as published by the Wellness Centre and may change.
      </p>
    </div>
  );
}

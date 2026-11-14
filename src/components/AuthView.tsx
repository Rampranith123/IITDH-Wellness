import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  GraduationCap,
  LogOut,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ALL_PRACTITIONERS } from '../data/wellnessData';
import type { AppView } from '../types/wellness';

interface AuthViewProps {
  onNavigate: (view: AppView) => void;
}

export function AuthView({ onNavigate }: AuthViewProps) {
  const {
    firebaseUser,
    profile,
    signingInPortal,
    authError,
    isAdmin,
    isVerifiedDoctor,
    needsDoctorVerification,
    doctorRequest,
    signInWithPortal,
    signOutUser,
    updateStudentProfile,
    switchPortalRole,
    submitDoctorVerificationRequest,
    clearAuthError,
  } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [rollNumber, setRollNumber] = useState(profile?.rollNumber || '');
  const [uhid, setUhid] = useState(profile?.uhid || '');
  const [hostelOrDept, setHostelOrDept] = useState(profile?.hostelOrDept || '');
  const [profileSaved, setProfileSaved] = useState(false);

  const [reqName, setReqName] = useState(firebaseUser?.displayName || '');
  const [reqDoctorId, setReqDoctorId] = useState(ALL_PRACTITIONERS[0].id);
  const [reqCredentials, setReqCredentials] = useState('');
  const [reqSubmitted, setReqSubmitted] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setRollNumber(profile.rollNumber || '');
      setUhid(profile.uhid || '');
      setHostelOrDept(profile.hostelOrDept || '');
    }
    if (firebaseUser?.displayName) {
      setReqName((prev) => prev || firebaseUser.displayName || '');
    }
  }, [profile, firebaseUser]);

  async function handleStudentSignIn() {
    clearAuthError();
    const res = await signInWithPortal('student');
    if (res === 'signed-in') {
      onNavigate('me');
    }
  }

  async function handleDoctorSignIn() {
    clearAuthError();
    const res = await signInWithPortal('doctor');
    if (res === 'signed-in') {
      onNavigate('doctor-portal');
    }
  }

  async function handleSaveStudentProfile(e: React.FormEvent) {
    e.preventDefault();
    await updateStudentProfile({
      displayName,
      rollNumber,
      uhid,
      hostelOrDept,
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  }

  async function handleDoctorRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reqName.trim() || !reqCredentials.trim()) return;
    await submitDoctorVerificationRequest({
      fullName: reqName.trim(),
      requestedDoctorId: reqDoctorId,
      credentials: reqCredentials.trim(),
    });
    setReqSubmitted(true);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-[#cfe0dd]/70 dark:border-white/10 pb-6">
        <p className="text-xs font-medium text-[#476360] dark:text-[#9ab3b0]">
          IIT Dharwad Wellness Centre · Account Access
        </p>
        <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0f2422] dark:text-white text-balance">
          {firebaseUser ? 'Account & Portal Access' : 'Sign in to Student or Doctor Portal'}
        </h1>
        <p className="mt-2 max-w-2xl text-sm sm:text-base text-[#476360] dark:text-[#9ab3b0]">
          Students and Wellness Centre practitioners sign in separately so medical appointments,
          UHID cards, and live OPD schedules stay cleanly separated and private.
        </p>
      </div>

      {authError && (
        <div
          role="alert"
          className="rounded-2xl border border-red-300/70 dark:border-red-500/30 bg-red-50/85 dark:bg-red-950/40 backdrop-blur-md px-4 py-3 text-sm text-red-800 dark:text-red-200"
        >
          {authError}
        </div>
      )}

      {/* Signed-in Account View */}
      {firebaseUser && (
        <div className="rounded-2xl glass-panel p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#cfe0dd]/60 dark:border-white/10 pb-5">
            <div>
              <p className="text-xs font-medium text-[#476360] dark:text-[#9ab3b0]">
                Signed in · {profile?.role === 'doctor' ? 'Doctor Portal' : 'Student Portal'}
                {isAdmin ? ' · Wellness Admin' : ''}
              </p>
              <h2 className="mt-1 font-display text-xl font-bold text-[#0f2422] dark:text-white">
                {profile?.displayName || firebaseUser.displayName || 'IIT Dharwad Member'}
              </h2>
              <p className="font-mono-tabular text-xs sm:text-sm text-[#476360] dark:text-[#9ab3b0]">
                {firebaseUser.email}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isVerifiedDoctor && (
                <button
                  type="button"
                  onClick={async () => {
                    const nextRole = profile?.role === 'doctor' ? 'student' : 'doctor';
                    await switchPortalRole(nextRole);
                    onNavigate(nextRole === 'doctor' ? 'doctor-portal' : 'me');
                  }}
                  className="min-h-[40px] px-4 py-2 rounded-xl border border-[#0f766e] text-[#0f766e] dark:border-[#2dd4bf] dark:text-[#2dd4bf] text-sm font-semibold hover:bg-teal-50/70 dark:hover:bg-teal-950/40 transition-colors cursor-pointer"
                >
                  Switch to {profile?.role === 'doctor' ? 'Student View' : 'Doctor Desk'}
                </button>
              )}
              <button
                type="button"
                onClick={signOutUser}
                className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-xl glass-input text-sm font-medium text-[#476360] dark:text-[#9ab3b0] hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>

          {/* Doctor Verification Request Flow (if user clicked Doctor Sign In without allowlist) */}
          {needsDoctorVerification && (
            <div className="rounded-xl border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/75 dark:bg-amber-950/25 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-display text-base font-bold text-[#0f2422] dark:text-white">
                    Doctor Portal Verification Required
                  </h3>
                  <p className="mt-1 text-sm text-[#476360] dark:text-[#9ab3b0]">
                    Your Google account ({firebaseUser.email}) is signed in as a student by default.
                    Submit your Wellness Centre practitioner details below so the administrator can
                    link your account to the Doctor Portal.
                  </p>
                </div>
              </div>

              {doctorRequest?.status === 'pending' || reqSubmitted ? (
                <div className="flex items-center gap-2.5 text-sm font-medium text-amber-800 dark:text-amber-300 pt-1">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>
                    Verification request submitted for{' '}
                    <strong>{doctorRequest?.fullName || reqName}</strong> — awaiting administrator
                    approval.
                  </span>
                </div>
              ) : (
                <form onSubmit={handleDoctorRequestSubmit} className="grid sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
                      Practitioner Full Name
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={reqName}
                      onChange={(e) => setReqName(e.target.value)}
                      placeholder="Dr. Full Name"
                      className="w-full rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
                      Roster Profile to Manage
                    </label>
                    <select
                      value={reqDoctorId}
                      onChange={(e) => setReqDoctorId(e.target.value)}
                      className="w-full rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
                    >
                      {ALL_PRACTITIONERS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.spec})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
                      Medical Reg. / Staff ID
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={reqCredentials}
                      onChange={(e) => setReqCredentials(e.target.value)}
                      placeholder="e.g., KMC-84920"
                      className="w-full rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
                    />
                  </div>
                  <div className="sm:col-span-3 flex items-center gap-3">
                    <button
                      type="submit"
                      className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0f766e] text-white text-sm font-semibold hover:bg-[#0d645d] transition-colors cursor-pointer"
                    >
                      Submit Verification Request
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Student Profile Details Form */}
          {profile?.role === 'student' && (
            <form onSubmit={handleSaveStudentProfile} className="space-y-4">
              <div>
                <h3 className="font-display text-base font-bold text-[#0f2422] dark:text-white">
                  Student Health &amp; UHID Details
                </h3>
                <p className="text-xs text-[#476360] dark:text-[#9ab3b0] mt-0.5">
                  Pre-fills your Wellness Centre appointment requests and syncs your digital UHID card.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-xl glass-input px-3 py-2.5 text-sm focus:outline-2 focus:outline-[#0f766e]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
                    Roll Number
                  </label>
                  <input
                    type="text"
                    maxLength={30}
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g., 240010042"
                    className="font-mono-tabular w-full rounded-xl glass-input px-3 py-2.5 text-sm focus:outline-2 focus:outline-[#0f766e]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
                    UHID Number
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    value={uhid}
                    onChange={(e) => setUhid(e.target.value)}
                    placeholder="Wellness Centre UHID"
                    className="font-mono-tabular w-full rounded-xl glass-input px-3 py-2.5 text-sm focus:outline-2 focus:outline-[#0f766e]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
                    Hostel / Department
                  </label>
                  <input
                    type="text"
                    maxLength={80}
                    value={hostelOrDept}
                    onChange={(e) => setHostelOrDept(e.target.value)}
                    placeholder="e.g., Hostel 2 · CSE"
                    className="w-full rounded-xl glass-input px-3 py-2.5 text-sm focus:outline-2 focus:outline-[#0f766e]"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <button
                  type="submit"
                  className="min-h-[40px] px-5 py-2 rounded-xl bg-[#0f766e] text-white text-sm font-semibold hover:bg-[#0d645d] dark:bg-[#2dd4bf] dark:text-[#06201d] dark:hover:bg-[#14b8a6] transition-colors cursor-pointer"
                >
                  Save Profile
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('me')}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0f766e] dark:text-[#2dd4bf] hover:underline cursor-pointer"
                >
                  Go to My Health
                  <ArrowRight className="w-4 h-4" />
                </button>
                {profileSaved && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Profile saved
                  </span>
                )}
              </div>
            </form>
          )}

          {profile?.role === 'doctor' && (
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <p className="text-sm text-[#476360] dark:text-[#9ab3b0]">
                You have active practitioner access to update live OPD status, manage student
                appointments, and publish Saturday specialist rosters.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('doctor-portal')}
                className="inline-flex items-center gap-2 min-h-[42px] px-5 py-2 rounded-xl bg-[#0f766e] text-white text-sm font-semibold hover:bg-[#0d645d] transition-colors cursor-pointer"
              >
                Open Doctor Desk
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Dual Separate Sign-In Portals */}
      <div className="grid md:grid-cols-2 gap-6 items-stretch">
        {/* Student Sign-In Portal */}
        <section className="flex flex-col justify-between rounded-2xl glass-panel p-6 sm:p-7">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl glass-inset text-[#0f766e] dark:text-[#2dd4bf]">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#476360] dark:text-[#9ab3b0]">
                  Campus Residents &amp; Scholars
                </p>
                <h2 className="font-display text-xl font-bold text-[#0f2422] dark:text-white">
                  Student Sign In
                </h2>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[#476360] dark:text-[#9ab3b0]">
              Sign in with your Google account to book appointments with Wellness Centre doctors and
              counsellors, store your UHID card, and maintain your private mood check-in log across
              devices.
            </p>

            <ul className="mt-5 space-y-2.5 text-sm text-[#263f3c] dark:text-[#c7dcd9]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0f766e] dark:text-[#2dd4bf] shrink-0" />
                <span>Send appointment requests directly to your chosen doctor</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0f766e] dark:text-[#2dd4bf] shrink-0" />
                <span>View doctor confirmation &amp; follow-up notes in My Health</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0f766e] dark:text-[#2dd4bf] shrink-0" />
                <span>Private mood journal visible strictly to you alone</span>
              </li>
            </ul>
          </div>

          <div className="mt-7 pt-5 border-t border-[#cfe0dd]/60 dark:border-white/10">
            <button
              type="button"
              disabled={signingInPortal !== null}
              onClick={handleStudentSignIn}
              className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-[#0f766e] text-white font-semibold text-sm hover:bg-[#0d645d] disabled:opacity-60 transition-colors cursor-pointer"
            >
              {signingInPortal === 'student'
                ? 'Signing in as Student...'
                : firebaseUser && profile?.role === 'student'
                  ? 'Signed in as Student · Switch Account'
                  : 'Continue as Student with Google'}
            </button>
          </div>
        </section>

        {/* Doctor & Counsellor Sign-In Portal */}
        <section className="flex flex-col justify-between rounded-2xl glass-panel p-6 sm:p-7">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl glass-inset text-[#0f2422] dark:text-[#2dd4bf]">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#476360] dark:text-[#9ab3b0]">
                  Physicians, Specialists &amp; Counsellors
                </p>
                <h2 className="font-display text-xl font-bold text-[#0f2422] dark:text-white">
                  Doctor Sign In
                </h2>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[#476360] dark:text-[#9ab3b0]">
              Dedicated practitioner portal for IIT Dharwad Wellness Centre medical staff. Update
              live OPD availability, review student appointment requests, and publish consultation
              notes.
            </p>

            <ul className="mt-5 space-y-2.5 text-sm text-[#263f3c] dark:text-[#c7dcd9]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0f766e] dark:text-[#2dd4bf] shrink-0" />
                <span>Toggle live duty status (Available, In Consultation, On Leave)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0f766e] dark:text-[#2dd4bf] shrink-0" />
                <span>Confirm student bookings &amp; record clinical follow-up guidance</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0f766e] dark:text-[#2dd4bf] shrink-0" />
                <span>Publish Saturday SDM visiting specialist rosters</span>
              </li>
            </ul>
          </div>

          <div className="mt-7 pt-5 border-t border-[#cfe0dd]/60 dark:border-white/10">
            <button
              type="button"
              disabled={signingInPortal !== null}
              onClick={handleDoctorSignIn}
              className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-[#0f2422] dark:bg-[#2dd4bf] text-white dark:text-[#06201d] font-semibold text-sm hover:bg-[#1a3835] dark:hover:bg-[#14b8a6] disabled:opacity-60 transition-colors cursor-pointer"
            >
              {signingInPortal === 'doctor'
                ? 'Signing in as Doctor...'
                : firebaseUser && profile?.role === 'doctor'
                  ? 'Signed in as Doctor · Switch Account'
                  : 'Continue as Doctor with Google'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

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
import type { AppView, UserRole } from '../types/wellness';

interface AuthViewProps {
  onNavigate: (view: AppView) => void;
}

export function AuthView({ onNavigate }: AuthViewProps) {
  const {
    user,
    profile,
    signingInPortal,
    authError,
    authNotice,
    unconfirmedEmail,
    passwordRecoveryPending,
    isAdmin,
    isVerifiedDoctor,
    needsDoctorVerification,
    doctorRequest,
    signInWithEmailPortal,
    resendSignupConfirmation,
    sendPasswordResetEmail,
    updateAccountPassword,
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

  const [reqName, setReqName] = useState(user?.displayName || '');
  const [reqDoctorId, setReqDoctorId] = useState(ALL_PRACTITIONERS[0].id);
  const [reqCredentials, setReqCredentials] = useState('');
  const [reqSubmitted, setReqSubmitted] = useState(false);

  // Student Portal Form State
  const [studentAuthMode, setStudentAuthMode] = useState<'signin' | 'signup'>('signin');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

  // Doctor Portal Form State
  const [doctorAuthMode, setDoctorAuthMode] = useState<'signin' | 'signup'>('signin');
  const [doctorName, setDoctorName] = useState('');
  const [doctorEmail, setDoctorEmail] = useState('');
  const [doctorPassword, setDoctorPassword] = useState('');

  // Password Recovery Update State
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [updatingRecovery, setUpdatingRecovery] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setRollNumber(profile.rollNumber || '');
      setUhid(profile.uhid || '');
      setHostelOrDept(profile.hostelOrDept || '');
    }
    if (user?.displayName) {
      setReqName((prev) => prev || user.displayName || '');
    }
  }, [profile, user]);

  async function handlePortalEmailSubmit(e: React.FormEvent, portal: UserRole) {
    e.preventDefault();
    clearAuthError();
    const isStudent = portal === 'student';
    const mode = isStudent ? studentAuthMode : doctorAuthMode;
    const email = isStudent ? studentEmail : doctorEmail;
    const password = isStudent ? studentPassword : doctorPassword;
    const fullName = isStudent ? studentName : doctorName;

    const res = await signInWithEmailPortal(portal, email, password, mode, fullName);
    if (res === 'signed-in') {
      onNavigate(portal === 'doctor' ? 'doctor-portal' : 'me');
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
          IIT Dharwad Wellness Centre · Email Account Access
        </p>
        <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0f2422] dark:text-white text-balance">
          {user ? 'Account & Portal Access' : 'Sign in to Student or Doctor Portal'}
        </h1>
        <p className="mt-2 max-w-2xl text-sm sm:text-base text-[#476360] dark:text-[#9ab3b0]">
          Students and Wellness Centre practitioners sign in separately with email and password so
          medical appointments, UHID cards, and live OPD schedules stay cleanly separated and private.
        </p>
      </div>

      {authError && (
        <div
          role="alert"
          className="rounded-2xl border border-red-300/70 dark:border-red-500/30 bg-red-50/85 dark:bg-red-950/40 backdrop-blur-md px-4 py-3 text-sm text-red-800 dark:text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <span>{authError}</span>
          {unconfirmedEmail && (
            <button
              type="button"
              onClick={() => void resendSignupConfirmation(unconfirmedEmail)}
              className="shrink-0 self-start sm:self-auto px-3 py-1.5 rounded-lg border border-red-400/60 dark:border-red-400/40 text-xs font-semibold hover:bg-red-100/70 dark:hover:bg-red-900/40 transition-colors cursor-pointer"
            >
              Resend confirmation email
            </button>
          )}
        </div>
      )}

      {authNotice && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-300/70 dark:border-emerald-500/30 bg-emerald-50/85 dark:bg-emerald-950/40 backdrop-blur-md px-4 py-3 text-sm text-emerald-900 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <span>{authNotice}</span>
          {unconfirmedEmail && (
            <button
              type="button"
              onClick={() => void resendSignupConfirmation(unconfirmedEmail)}
              className="shrink-0 self-start sm:self-auto px-3 py-1.5 rounded-lg border border-emerald-500/40 text-xs font-semibold hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
            >
              Resend confirmation email
            </button>
          )}
        </div>
      )}

      {passwordRecoveryPending && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setUpdatingRecovery(true);
            const ok = await updateAccountPassword(recoveryPassword);
            setUpdatingRecovery(false);
            if (ok) {
              setRecoveryPassword('');
            }
          }}
          className="rounded-2xl glass-panel p-5 sm:p-6 space-y-4 border border-teal-400/60 dark:border-teal-500/30"
        >
          <div>
            <h2 className="font-display text-lg font-bold text-[#0f2422] dark:text-white">
              Set a New Password
            </h2>
            <p className="text-xs sm:text-sm text-[#476360] dark:text-[#9ab3b0] mt-1">
              Enter your new password below to finish resetting your account credentials.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={recoveryPassword}
              onChange={(e) => setRecoveryPassword(e.target.value)}
              placeholder="New password (min 6 characters)"
              className="flex-1 min-h-[42px] rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
            />
            <button
              type="submit"
              disabled={updatingRecovery}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-[#0f766e] text-white dark:bg-[#2dd4bf] dark:text-[#06201d] text-sm font-semibold disabled:opacity-60 cursor-pointer"
            >
              {updatingRecovery ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      )}

      {/* Signed-in Account View */}
      {user && (
        <div className="rounded-2xl glass-panel p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#cfe0dd]/60 dark:border-white/10 pb-5">
            <div>
              <p className="text-xs font-medium text-[#476360] dark:text-[#9ab3b0]">
                Signed in · {profile?.role === 'doctor' ? 'Doctor Portal' : 'Student Portal'}
                {isAdmin ? ' · Wellness Admin' : ''}
              </p>
              <h2 className="mt-1 font-display text-xl font-bold text-[#0f2422] dark:text-white">
                {profile?.displayName || user.displayName || 'IIT Dharwad Member'}
              </h2>
              <p className="font-mono-tabular text-xs sm:text-sm text-[#476360] dark:text-[#9ab3b0]">
                {user.email}
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

          {/* Doctor Verification Request Flow */}
          {needsDoctorVerification && (
            <div className="rounded-xl border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/75 dark:bg-amber-950/25 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-display text-base font-bold text-[#0f2422] dark:text-white">
                    Doctor Portal Verification Required
                  </h3>
                  <p className="mt-1 text-sm text-[#476360] dark:text-[#9ab3b0]">
                    Your account ({user.email}) is signed in as a student by default. Submit your
                    Wellness Centre practitioner details below so the administrator can link your
                    account to the Doctor Portal.
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

      {/* Dual Separate Email Sign-In Portals */}
      <div className="grid md:grid-cols-2 gap-6 items-stretch">
        {/* Student Sign-In Portal */}
        <section className="flex flex-col justify-between rounded-2xl glass-panel p-6 sm:p-7 space-y-6">
          <div>
            <div className="flex items-center justify-between gap-3">
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

              <div className="inline-flex rounded-xl glass-inset p-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setStudentAuthMode('signin')}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                    studentAuthMode === 'signin'
                      ? 'bg-white dark:bg-[#132623] text-[#0f2422] dark:text-white shadow-xs'
                      : 'text-[#476360] dark:text-[#9ab3b0]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setStudentAuthMode('signup')}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                    studentAuthMode === 'signup'
                      ? 'bg-white dark:bg-[#132623] text-[#0f2422] dark:text-white shadow-xs'
                      : 'text-[#476360] dark:text-[#9ab3b0]'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[#476360] dark:text-[#9ab3b0]">
              Sign in with your email to book appointments with Wellness Centre doctors and
              counsellors, store your UHID card, and maintain your private mood check-in log across
              devices.
            </p>

            <ul className="mt-4 space-y-2 text-xs sm:text-sm text-[#263f3c] dark:text-[#c7dcd9]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0f766e] dark:text-[#2dd4bf] shrink-0" />
                <span>Send appointment requests directly to your chosen doctor</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0f766e] dark:text-[#2dd4bf] shrink-0" />
                <span>Private mood journal synced to your account</span>
              </li>
            </ul>
          </div>

          <form
            onSubmit={(e) => handlePortalEmailSubmit(e, 'student')}
            className="space-y-3 pt-4 border-t border-[#cfe0dd]/60 dark:border-white/10"
          >
            {studentAuthMode === 'signup' && (
              <input
                type="text"
                required
                maxLength={100}
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Full name"
                className="w-full min-h-[42px] rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
              />
            )}
            <input
              type="email"
              required
              autoComplete="email"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              placeholder="Student email (e.g., roll@iitdh.ac.in)"
              className="w-full min-h-[42px] rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
            />
            <input
              type="password"
              required
              minLength={6}
              autoComplete={studentAuthMode === 'signup' ? 'new-password' : 'current-password'}
              value={studentPassword}
              onChange={(e) => setStudentPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              className="w-full min-h-[42px] rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
            />
            {studentAuthMode === 'signin' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void sendPasswordResetEmail(studentEmail)}
                  className="text-xs font-medium text-[#0f766e] dark:text-[#2dd4bf] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            )}
            <button
              type="submit"
              disabled={signingInPortal !== null}
              className="w-full min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0f766e] text-white font-semibold text-sm hover:bg-[#0d645d] dark:bg-[#2dd4bf] dark:text-[#06201d] dark:hover:bg-[#14b8a6] disabled:opacity-60 transition-colors cursor-pointer"
            >
              {signingInPortal === 'student'
                ? 'Signing in as Student...'
                : studentAuthMode === 'signup'
                  ? 'Create Student Account'
                  : 'Sign In as Student'}
            </button>
          </form>
        </section>

        {/* Doctor & Counsellor Sign-In Portal */}
        <section className="flex flex-col justify-between rounded-2xl glass-panel p-6 sm:p-7 space-y-6">
          <div>
            <div className="flex items-center justify-between gap-3">
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

              <div className="inline-flex rounded-xl glass-inset p-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setDoctorAuthMode('signin')}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                    doctorAuthMode === 'signin'
                      ? 'bg-white dark:bg-[#132623] text-[#0f2422] dark:text-white shadow-xs'
                      : 'text-[#476360] dark:text-[#9ab3b0]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setDoctorAuthMode('signup')}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                    doctorAuthMode === 'signup'
                      ? 'bg-white dark:bg-[#132623] text-[#0f2422] dark:text-white shadow-xs'
                      : 'text-[#476360] dark:text-[#9ab3b0]'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[#476360] dark:text-[#9ab3b0]">
              Dedicated practitioner portal for IIT Dharwad Wellness Centre medical staff. Update
              live OPD availability, review student appointment requests, and publish consultation
              notes.
            </p>

            <ul className="mt-4 space-y-2 text-xs sm:text-sm text-[#263f3c] dark:text-[#c7dcd9]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0f766e] dark:text-[#2dd4bf] shrink-0" />
                <span>Toggle live duty status (Available, In Consultation, On Leave)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0f766e] dark:text-[#2dd4bf] shrink-0" />
                <span>Confirm student bookings &amp; publish Saturday specialist rosters</span>
              </li>
            </ul>
          </div>

          <form
            onSubmit={(e) => handlePortalEmailSubmit(e, 'doctor')}
            className="space-y-3 pt-4 border-t border-[#cfe0dd]/60 dark:border-white/10"
          >
            {doctorAuthMode === 'signup' && (
              <input
                type="text"
                required
                maxLength={100}
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="Practitioner full name"
                className="w-full min-h-[42px] rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
              />
            )}
            <input
              type="email"
              required
              autoComplete="email"
              value={doctorEmail}
              onChange={(e) => setDoctorEmail(e.target.value)}
              placeholder="Practitioner email"
              className="w-full min-h-[42px] rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
            />
            <input
              type="password"
              required
              minLength={6}
              autoComplete={doctorAuthMode === 'signup' ? 'new-password' : 'current-password'}
              value={doctorPassword}
              onChange={(e) => setDoctorPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              className="w-full min-h-[42px] rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
            />
            {doctorAuthMode === 'signin' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void sendPasswordResetEmail(doctorEmail)}
                  className="text-xs font-medium text-[#0f766e] dark:text-[#2dd4bf] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            )}
            <button
              type="submit"
              disabled={signingInPortal !== null}
              className="w-full min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0f2422] dark:bg-[#2dd4bf] text-white dark:text-[#06201d] font-semibold text-sm hover:bg-[#1a3835] dark:hover:bg-[#14b8a6] disabled:opacity-60 transition-colors cursor-pointer"
            >
              {signingInPortal === 'doctor'
                ? 'Signing in as Doctor...'
                : doctorAuthMode === 'signup'
                  ? 'Create Doctor Account'
                  : 'Sign In as Doctor'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

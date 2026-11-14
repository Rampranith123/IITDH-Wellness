import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  ShieldCheck,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWellnessData } from '../context/WellnessDataContext';
import {
  ALL_PRACTITIONERS,
  SPECIALIST_DEFAULT,
  SPECIALIST_TIME,
  formatTime12h,
  getNextSaturdayRoster,
} from '../data/wellnessData';
import type {
  AppointmentRecord,
  AppointmentStatus,
  AvailabilityOverride,
} from '../types/wellness';

export function DoctorPortalView() {
  const { firebaseUser, profile, isAdmin, switchPortalRole } = useAuth();
  const {
    doctorStatuses,
    appointments,
    specialistRosters,
    pendingDoctorRequests,
    allowlistEntries,
    saveDoctorStatus,
    updateAppointmentClinical,
    saveSpecialistRoster,
    approveDoctorRequest,
    rejectDoctorRequest,
    addAllowlistDoctor,
    removeAllowlistDoctor,
  } = useWellnessData();

  const [selectedDoctorId, setSelectedDoctorId] = useState(
    profile?.linkedDoctorId || ALL_PRACTITIONERS[0].id
  );
  const currentStatus = doctorStatuses[selectedDoctorId];

  const [availabilityOverride, setAvailabilityOverride] = useState<AvailabilityOverride>(
    currentStatus?.availabilityOverride || 'auto'
  );
  const [customNote, setCustomNote] = useState(currentStatus?.customNote || '');
  const [statusSaved, setStatusSaved] = useState(false);

  const [apptFilter, setApptFilter] = useState<'all' | AppointmentStatus>('all');
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});
  const [savingApptId, setSavingApptId] = useState<string | null>(null);

  const nextSat = getNextSaturdayRoster(specialistRosters);
  const [rosterDateKey, setRosterDateKey] = useState(nextSat.key);
  const [rosterTime, setRosterTime] = useState(nextSat.timeWindow || SPECIALIST_TIME);
  const [rosterLines, setRosterLines] = useState(
    (specialistRosters[nextSat.key]?.specialists || nextSat.list || SPECIALIST_DEFAULT).join('\n')
  );
  const [rosterSaved, setRosterSaved] = useState(false);

  // Admin quick allowlist form
  const [newDocEmail, setNewDocEmail] = useState('');
  const [newDocName, setNewDocName] = useState('');
  const [newDocRosterId, setNewDocRosterId] = useState(ALL_PRACTITIONERS[0].id);

  useEffect(() => {
    if (profile?.linkedDoctorId) {
      setSelectedDoctorId(profile.linkedDoctorId);
    }
  }, [profile?.linkedDoctorId]);

  useEffect(() => {
    const st = doctorStatuses[selectedDoctorId];
    setAvailabilityOverride(st?.availabilityOverride || 'auto');
    setCustomNote(st?.customNote || '');
  }, [selectedDoctorId, doctorStatuses]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (!isAdmin && a.doctorId !== selectedDoctorId && a.assignedDoctorUid !== firebaseUser?.uid) {
        return false;
      }
      if (apptFilter !== 'all' && a.status !== apptFilter) return false;
      return true;
    });
  }, [appointments, apptFilter, isAdmin, selectedDoctorId, firebaseUser?.uid]);

  async function handleSaveDutyStatus(e: React.FormEvent) {
    e.preventDefault();
    if (isAdmin && profile?.linkedDoctorId !== selectedDoctorId) {
      await switchPortalRole('doctor', selectedDoctorId);
    }
    await saveDoctorStatus(selectedDoctorId, availabilityOverride, customNote, true);
    setStatusSaved(true);
    setTimeout(() => setStatusSaved(false), 3000);
  }

  async function handleAppointmentAction(
    appt: AppointmentRecord,
    nextStatus: AppointmentStatus
  ) {
    setSavingApptId(appt.id);
    const note = notesDrafts[appt.id] ?? appt.doctorNotes ?? '';
    await updateAppointmentClinical(appt.id, {
      status: nextStatus,
      doctorNotes: note,
      claimUnassigned: !appt.assignedDoctorUid,
    });
    setSavingApptId(null);
  }

  async function handleSaveRoster(e: React.FormEvent) {
    e.preventDefault();
    const list = rosterLines
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!list.length) return;
    await saveSpecialistRoster(rosterDateKey, list, rosterTime);
    setRosterSaved(true);
    setTimeout(() => setRosterSaved(false), 3000);
  }

  async function handleAddAllowlist(e: React.FormEvent) {
    e.preventDefault();
    if (!newDocEmail.trim() || !newDocName.trim()) return;
    await addAllowlistDoctor(newDocEmail.trim(), newDocRosterId, newDocName.trim());
    setNewDocEmail('');
    setNewDocName('');
  }

  const activePractitioner = ALL_PRACTITIONERS.find((p) => p.id === selectedDoctorId);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#cfe0dd]/70 dark:border-white/10 pb-5">
        <div>
          <p className="text-xs font-medium text-[#0f766e] dark:text-[#2dd4bf]">
            IIT Dharwad Wellness Centre · Practitioner Workspace
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0f2422] dark:text-white">
            Doctor Desk
          </h1>
          <p className="mt-1 text-sm text-[#476360] dark:text-[#9ab3b0]">
            Manage live OPD duty status, review student appointment requests, and update clinical
            guidance.
          </p>
        </div>

        {isAdmin && (
          <div className="w-full sm:w-72">
            <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
              Active Roster Profile
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full min-h-[40px] rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
            >
              {ALL_PRACTITIONERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.spec})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Live Duty Control + Roster Editor */}
      <div className="grid xl:grid-cols-12 gap-6 items-start">
        <form onSubmit={handleSaveDutyStatus} className="xl:col-span-6 rounded-2xl glass-panel p-6 space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0f2422] dark:text-white">
              Live OPD Duty Status
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-[#476360] dark:text-[#9ab3b0]">
              Managing: <strong>{activePractitioner?.name}</strong> ({activePractitioner?.spec})
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {(
              [
                { id: 'auto', label: 'Published Schedule' },
                { id: 'available', label: 'Available Now' },
                { id: 'in_consultation', label: 'In Consultation' },
                { id: 'on_leave', label: 'On Leave Today' },
              ] as const
            ).map((opt) => {
              const active = availabilityOverride === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAvailabilityOverride(opt.id)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#0f766e] text-white border-[#0f766e] dark:bg-[#2dd4bf] dark:text-[#06201d] dark:border-[#2dd4bf]'
                      : 'glass-inset text-[#263f3c] dark:text-[#c7dcd9] hover:border-[#0f766e]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
              Live Clinic Notice for Students (optional)
            </label>
            <input
              type="text"
              maxLength={200}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g., OPD open in Room 102 till 5 PM"
              className="w-full min-h-[42px] rounded-xl glass-input px-3 py-2 text-sm focus:outline-2 focus:outline-[#0f766e]"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="min-h-[42px] px-5 py-2 rounded-xl bg-[#0f766e] text-white text-sm font-semibold hover:bg-[#0d645d] dark:bg-[#2dd4bf] dark:text-[#06201d] dark:hover:bg-[#14b8a6] transition-colors cursor-pointer"
            >
              Publish Live Status
            </button>
            {statusSaved && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                Live status updated
              </span>
            )}
          </div>
        </form>

        {/* Saturday Specialist Roster Editor */}
        <form onSubmit={handleSaveRoster} className="xl:col-span-6 rounded-2xl glass-panel p-6 space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0f2422] dark:text-white">
              Saturday SDM Specialist Roster
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-[#476360] dark:text-[#9ab3b0]">
              Publish confirmed Saturday visiting specialists so students see verified timings.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
                Saturday Date
              </label>
              <input
                type="date"
                required
                value={rosterDateKey}
                onChange={(e) => setRosterDateKey(e.target.value)}
                className="font-mono-tabular w-full min-h-[40px] rounded-xl glass-input px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
                Visiting Window
              </label>
              <input
                type="text"
                required
                maxLength={60}
                value={rosterTime}
                onChange={(e) => setRosterTime(e.target.value)}
                className="w-full min-h-[40px] rounded-xl glass-input px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
              Visiting Specialists (one per line)
            </label>
            <textarea
              rows={3}
              value={rosterLines}
              onChange={(e) => setRosterLines(e.target.value)}
              className="w-full rounded-xl glass-input px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="min-h-[40px] px-5 py-2 rounded-xl border border-[#0f766e] text-[#0f766e] dark:border-[#2dd4bf] dark:text-[#2dd4bf] text-sm font-semibold hover:bg-teal-50/70 dark:hover:bg-teal-950/30 transition-colors cursor-pointer"
            >
              Publish Saturday Roster
            </button>
            {rosterSaved && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                Roster published
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Student Appointment Queue */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#cfe0dd]/70 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-[#0f766e] dark:text-[#2dd4bf]" />
            <h2 className="font-display text-xl font-bold text-[#0f2422] dark:text-white">
              Student Appointment Queue
            </h2>
          </div>

          <div
            role="group"
            aria-label="Filter appointments"
            className="inline-flex items-center rounded-xl glass-inset p-1 gap-1 overflow-x-auto"
          >
            {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setApptFilter(st)}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  apptFilter === st
                    ? 'bg-white dark:bg-[#132623] text-[#0f2422] dark:text-white shadow-xs'
                    : 'text-[#476360] dark:text-[#9ab3b0]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {filteredAppointments.length > 0 ? (
          <div className="space-y-3">
            {filteredAppointments.map((appt) => {
              const isTerminal = appt.status === 'completed' || appt.status === 'cancelled';
              const draftNote = notesDrafts[appt.id] ?? appt.doctorNotes ?? '';

              return (
                <article key={appt.id} className="rounded-2xl glass-panel p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-base font-bold text-[#0f2422] dark:text-white">
                        {appt.studentName}
                        {appt.studentRoll ? (
                          <span className="ml-2 font-mono-tabular text-xs font-medium text-[#476360] dark:text-[#9ab3b0]">
                            {appt.studentRoll}
                          </span>
                        ) : null}
                        {appt.studentUhid ? (
                          <span className="ml-2 font-mono-tabular text-xs font-medium text-[#0f766e] dark:text-[#2dd4bf]">
                            UHID {appt.studentUhid}
                          </span>
                        ) : null}
                      </h3>
                      <p className="mt-0.5 text-xs sm:text-sm text-[#476360] dark:text-[#9ab3b0]">
                        With {appt.doctorName} ·{' '}
                        <span className="font-mono-tabular">
                          {appt.date} at {formatTime12h(appt.time)}
                        </span>
                      </p>
                    </div>
                    <span className="text-xs font-semibold capitalize text-[#0f766e] dark:text-[#2dd4bf]">
                      {appt.status}
                    </span>
                  </div>

                  {appt.reason && (
                    <p className="text-sm text-[#263f3c] dark:text-[#c7dcd9]">
                      Student note: {appt.reason}
                    </p>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
                      Clinical / Follow-Up Notes (visible to student)
                    </label>
                    <textarea
                      rows={2}
                      maxLength={1000}
                      disabled={isTerminal && !isAdmin}
                      value={draftNote}
                      onChange={(e) =>
                        setNotesDrafts((prev) => ({ ...prev, [appt.id]: e.target.value }))
                      }
                      placeholder="Add prescription instructions, follow-up timing, or referral note..."
                      className="w-full rounded-xl glass-input px-3 py-2 text-sm disabled:opacity-60"
                    />
                  </div>

                  {(!isTerminal || isAdmin) && (
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        disabled={savingApptId === appt.id}
                        onClick={() => handleAppointmentAction(appt, 'confirmed')}
                        className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#0f766e] text-white text-xs font-semibold hover:bg-[#0d645d] transition-colors cursor-pointer"
                      >
                        Confirm &amp; Save Note
                      </button>
                      <button
                        type="button"
                        disabled={savingApptId === appt.id}
                        onClick={() => handleAppointmentAction(appt, 'completed')}
                        className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#0f2422] dark:bg-[#2dd4bf] text-white dark:text-[#06201d] text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Mark Completed
                      </button>
                      <button
                        type="button"
                        disabled={savingApptId === appt.id}
                        onClick={() => handleAppointmentAction(appt, 'cancelled')}
                        className="min-h-[38px] px-4 py-1.5 rounded-xl glass-input text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50/70 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                      >
                        Cancel Slot
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl glass-panel p-8 text-center">
            <p className="text-sm text-[#476360] dark:text-[#9ab3b0]">
              No student appointments match this filter yet.
            </p>
          </div>
        )}
      </section>

      {/* Admin: Practitioner Verification & Allowlist */}
      {isAdmin && (
        <section className="rounded-2xl glass-panel p-6 space-y-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#0f766e] dark:text-[#2dd4bf]" />
            <h2 className="font-display text-lg font-bold text-[#0f2422] dark:text-white">
              Practitioner Access Approvals (Admin)
            </h2>
          </div>

          {pendingDoctorRequests.filter((r) => r.status === 'pending').length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[#476360] dark:text-[#9ab3b0]">
                Pending Verification Requests
              </h3>
              {pendingDoctorRequests
                .filter((r) => r.status === 'pending')
                .map((req) => (
                  <div
                    key={req.uid}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl glass-inset p-4"
                  >
                    <div>
                      <p className="font-display text-sm font-bold text-[#0f2422] dark:text-white">
                        {req.fullName} ·{' '}
                        <span className="font-mono-tabular font-normal text-xs">{req.email}</span>
                      </p>
                      <p className="text-xs text-[#476360] dark:text-[#9ab3b0]">
                        Requested profile: {req.requestedDoctorId} · Credentials: {req.credentials}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => approveDoctorRequest(req)}
                        className="inline-flex items-center gap-1 min-h-[36px] px-3 py-1.5 rounded-xl bg-[#0f766e] text-white text-xs font-semibold cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectDoctorRequest(req)}
                        className="inline-flex items-center gap-1 min-h-[36px] px-3 py-1.5 rounded-xl glass-input text-xs font-semibold text-red-600 dark:text-red-400 cursor-pointer"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          <form onSubmit={handleAddAllowlist} className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
                Doctor Email
              </label>
              <input
                type="email"
                required
                value={newDocEmail}
                onChange={(e) => setNewDocEmail(e.target.value)}
                placeholder="doctor@iitdh.ac.in"
                className="w-full min-h-[40px] rounded-xl glass-input px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
                Doctor Name
              </label>
              <input
                type="text"
                required
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                placeholder="Dr. Name"
                className="w-full min-h-[40px] rounded-xl glass-input px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#476360] dark:text-[#9ab3b0] mb-1">
                Assigned Roster Profile
              </label>
              <select
                value={newDocRosterId}
                onChange={(e) => setNewDocRosterId(e.target.value)}
                className="w-full min-h-[40px] rounded-xl glass-input px-3 py-1.5 text-sm"
              >
                {ALL_PRACTITIONERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0f766e] text-white text-xs font-semibold hover:bg-[#0d645d] cursor-pointer"
            >
              Authorize Doctor Email
            </button>
          </form>

          {allowlistEntries.length > 0 && (
            <div className="divide-y divide-[#cfe0dd]/60 dark:divide-white/10 text-xs">
              {allowlistEntries.map((entry) => (
                <div key={entry.email} className="flex items-center justify-between py-2.5">
                  <div>
                    <span className="font-semibold text-[#0f2422] dark:text-white">
                      {entry.doctorName}
                    </span>{' '}
                    · <span className="font-mono-tabular text-[#476360] dark:text-[#9ab3b0]">{entry.email}</span> ·{' '}
                    <span className="text-[#476360] dark:text-[#9ab3b0]">
                      Roster: {entry.assignedDoctorId}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAllowlistDoctor(entry.email)}
                    className="text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

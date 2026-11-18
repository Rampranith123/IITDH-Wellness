import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ALL_PRACTITIONERS, toIsoDate } from '../data/wellnessData';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type {
  AppointmentRecord,
  AppointmentStatus,
  AvailabilityOverride,
  DoctorAccessRequest,
  DoctorAllowlistEntry,
  DoctorStatus,
  MoodEntry,
  SpecialistRosterEntry,
} from '../types/wellness';

interface LocalUhid {
  name: string;
  roll: string;
  uhid: string;
  hostelOrDept?: string;
}

interface DoctorStatusRow {
  doctor_id: string;
  availability_override: AvailabilityOverride;
  custom_note: string;
  assigned_uid: string | null;
  updated_by_uid: string | null;
  updated_at?: string;
}

interface SpecialistRosterRow {
  date_key: string;
  specialists: string[];
  time_window: string;
  updated_by_uid: string | null;
  updated_at?: string;
}

interface AppointmentRow {
  id: string;
  student_uid: string;
  student_name: string;
  student_roll: string;
  student_uhid: string;
  doctor_id: string;
  doctor_name: string;
  doctor_spec: string;
  assigned_doctor_uid: string | null;
  date: string;
  time: string;
  reason: string;
  doctor_notes: string;
  status: AppointmentStatus;
  created_at?: string;
  updated_at?: string;
}

interface MoodRow {
  id?: string;
  user_uid: string;
  date: string;
  score: number;
  note: string;
  created_at?: string;
  updated_at?: string;
}

interface DoctorRequestRow {
  uid: string;
  email: string;
  full_name: string;
  requested_doctor_id: string;
  credentials: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at?: string;
  updated_at?: string;
}

interface DoctorAllowlistRow {
  email: string;
  assigned_doctor_id: string;
  doctor_name: string;
  approved_by_uid: string | null;
  created_at?: string;
}

function isMissingSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    Boolean(error.message?.includes('schema cache'))
  );
}

function mapDoctorStatusRow(row: DoctorStatusRow): DoctorStatus {
  return {
    doctorId: row.doctor_id,
    availabilityOverride: row.availability_override,
    customNote: row.custom_note || '',
    assignedUid: row.assigned_uid || '',
    updatedByUid: row.updated_by_uid || '',
    updatedAt: row.updated_at,
  };
}

function mapRosterRow(row: SpecialistRosterRow): SpecialistRosterEntry {
  return {
    dateKey: row.date_key,
    specialists: Array.isArray(row.specialists) ? row.specialists : [],
    timeWindow: row.time_window || '3 PM – 5 PM',
    updatedByUid: row.updated_by_uid || '',
    updatedAt: row.updated_at,
  };
}

function mapAppointmentRow(row: AppointmentRow): AppointmentRecord {
  return {
    id: row.id,
    studentUid: row.student_uid,
    studentName: row.student_name,
    studentRoll: row.student_roll || '',
    studentUhid: row.student_uhid || '',
    doctorId: row.doctor_id,
    doctorName: row.doctor_name,
    doctorSpec: row.doctor_spec,
    assignedDoctorUid: row.assigned_doctor_uid || '',
    date: row.date,
    time: row.time,
    reason: row.reason || '',
    doctorNotes: row.doctor_notes || '',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMoodRow(row: MoodRow): MoodEntry {
  return {
    date: row.date,
    score: row.score,
    note: row.note || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface WellnessDataContextValue {
  doctorStatuses: Record<string, DoctorStatus>;
  specialistRosters: Record<string, SpecialistRosterEntry>;
  appointments: AppointmentRecord[];
  moods: MoodEntry[];
  pendingDoctorRequests: DoctorAccessRequest[];
  allowlistEntries: DoctorAllowlistEntry[];
  localUhid: LocalUhid;
  saveLocalUhid: (data: LocalUhid) => void;
  bookAppointment: (input: {
    doctorId: string;
    date: string;
    time: string;
    reason: string;
    studentName?: string;
    studentRoll?: string;
    studentUhid?: string;
  }) => Promise<AppointmentRecord>;
  cancelAppointment: (appt: AppointmentRecord) => Promise<void>;
  deleteLocalAppointment: (id: string) => void;
  updateAppointmentClinical: (
    apptId: string,
    updates: { status: AppointmentStatus; doctorNotes: string; claimUnassigned?: boolean }
  ) => Promise<void>;
  saveMoodCheckIn: (date: string, score: number, note: string) => Promise<void>;
  saveDoctorStatus: (
    doctorId: string,
    availabilityOverride: AvailabilityOverride,
    customNote: string,
    claimOwnership?: boolean
  ) => Promise<void>;
  saveSpecialistRoster: (
    dateKey: string,
    specialists: string[],
    timeWindow: string
  ) => Promise<void>;
  approveDoctorRequest: (req: DoctorAccessRequest) => Promise<void>;
  rejectDoctorRequest: (req: DoctorAccessRequest) => Promise<void>;
  addAllowlistDoctor: (email: string, assignedDoctorId: string, doctorName: string) => Promise<void>;
  removeAllowlistDoctor: (email: string) => Promise<void>;
}

const WellnessDataContext = createContext<WellnessDataContextValue | null>(null);

const LOCAL_APPTS_KEY = 'iitdh_wellness_appts_v1';
const LOCAL_MOODS_KEY = 'iitdh_wellness_moods_v1';
const LOCAL_UHID_KEY = 'uhid';

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // ignore quota errors
  }
}

function sanitize(s: string, maxLen: number): string {
  return String(s ?? '').trim().slice(0, maxLen);
}

export function WellnessDataProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, isAdmin, isVerifiedDoctor } = useAuth();

  const [doctorStatuses, setDoctorStatuses] = useState<Record<string, DoctorStatus>>({});
  const [specialistRosters, setSpecialistRosters] = useState<Record<string, SpecialistRosterEntry>>(
    {}
  );
  const [remoteAppointments, setRemoteAppointments] = useState<AppointmentRecord[]>([]);
  const [localAppointments, setLocalAppointments] = useState<AppointmentRecord[]>(() =>
    readLocal<AppointmentRecord[]>(LOCAL_APPTS_KEY, [])
  );
  const [remoteMoods, setRemoteMoods] = useState<MoodEntry[]>([]);
  const [localMoods, setLocalMoods] = useState<MoodEntry[]>(() =>
    readLocal<MoodEntry[]>(LOCAL_MOODS_KEY, [])
  );
  const [localUhid, setLocalUhid] = useState<LocalUhid>(() =>
    readLocal<LocalUhid>(LOCAL_UHID_KEY, { name: '', roll: '', uhid: '', hostelOrDept: '' })
  );
  const [pendingDoctorRequests, setPendingDoctorRequests] = useState<DoctorAccessRequest[]>([]);
  const [allowlistEntries, setAllowlistEntries] = useState<DoctorAllowlistEntry[]>([]);
  const [tablesAvailable, setTablesAvailable] = useState(true);

  const fetchPublicClinicData = useCallback(async () => {
    if (!supabase) return;

    const [{ data: statusRows, error: statusErr }, { data: rosterRows, error: rosterErr }] =
      await Promise.all([
        supabase.from('doctor_statuses').select('*'),
        supabase.from('specialist_roster').select('*'),
      ]);

    if (isMissingSchemaError(statusErr) || isMissingSchemaError(rosterErr)) {
      setTablesAvailable(false);
      return;
    }

    setTablesAvailable(true);

    if (statusRows) {
      const next: Record<string, DoctorStatus> = {};
      for (const row of statusRows as DoctorStatusRow[]) {
        next[row.doctor_id] = mapDoctorStatusRow(row);
      }
      setDoctorStatuses(next);
    }

    if (rosterRows) {
      const next: Record<string, SpecialistRosterEntry> = {};
      for (const row of rosterRows as SpecialistRosterRow[]) {
        next[row.date_key] = mapRosterRow(row);
      }
      setSpecialistRosters(next);
    }
  }, []);

  // Public real-time doctor duty statuses & Saturday visiting rosters
  useEffect(() => {
    const client = supabase;
    if (!client) return;

    void fetchPublicClinicData();

    const channel = client
      .channel('public-clinic-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doctor_statuses' }, () => {
        void fetchPublicClinicData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'specialist_roster' }, () => {
        void fetchPublicClinicData();
      })
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [fetchPublicClinicData]);

  const fetchUserScopedData = useCallback(async () => {
    if (!supabase || !user || !profile) {
      setRemoteAppointments([]);
      setRemoteMoods([]);
      return;
    }

    const { data: moodRows, error: moodErr } = await supabase
      .from('moods')
      .select('*')
      .eq('user_uid', user.uid)
      .order('date', { ascending: true });

    if (isMissingSchemaError(moodErr)) {
      setTablesAvailable(false);
      return;
    }

    setTablesAvailable(true);

    if (moodRows) {
      setRemoteMoods((moodRows as MoodRow[]).map(mapMoodRow));
    }

    let apptsQuery = supabase.from('appointments').select('*');
    if (profile.role === 'doctor' && (isAdmin || isVerifiedDoctor)) {
      if (!isAdmin) {
        apptsQuery = apptsQuery.or(
          `assigned_doctor_uid.eq.${user.uid},assigned_doctor_uid.is.null`
        );
      }
    } else {
      apptsQuery = apptsQuery.eq('student_uid', user.uid);
    }

    const { data: apptRows, error: apptErr } = await apptsQuery;
    if (isMissingSchemaError(apptErr)) {
      setTablesAvailable(false);
      return;
    }
    if (apptRows) {
      const mapped = (apptRows as AppointmentRow[])
        .map(mapAppointmentRow)
        .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
      setRemoteAppointments(mapped);
    }
  }, [user, profile, isAdmin, isVerifiedDoctor]);

  // Authenticated private moods & role-scoped appointments
  useEffect(() => {
    const client = supabase;
    if (!client || !user || !profile) {
      setRemoteAppointments([]);
      setRemoteMoods([]);
      return;
    }

    void fetchUserScopedData();

    const channel = client
      .channel(`user-wellness-${user.uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'moods', filter: `user_uid=eq.${user.uid}` },
        () => {
          void fetchUserScopedData();
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        void fetchUserScopedData();
      })
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [user, profile, fetchUserScopedData]);

  const fetchAdminData = useCallback(async () => {
    if (!supabase || !user || !isAdmin) {
      setPendingDoctorRequests([]);
      setAllowlistEntries([]);
      return;
    }

    const [{ data: reqRows, error: reqErr }, { data: allowRows, error: allowErr }] =
      await Promise.all([
        supabase.from('doctor_requests').select('*'),
        supabase.from('doctor_allowlist').select('*'),
      ]);

    if (isMissingSchemaError(reqErr) || isMissingSchemaError(allowErr)) {
      setTablesAvailable(false);
      return;
    }

    if (reqRows) {
      setPendingDoctorRequests(
        (reqRows as DoctorRequestRow[]).map((r) => ({
          uid: r.uid,
          email: r.email,
          fullName: r.full_name,
          requestedDoctorId: r.requested_doctor_id,
          credentials: r.credentials,
          status: r.status,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }))
      );
    }

    if (allowRows) {
      setAllowlistEntries(
        (allowRows as DoctorAllowlistRow[]).map((a) => ({
          email: a.email,
          assignedDoctorId: a.assigned_doctor_id,
          doctorName: a.doctor_name,
          approvedByUid: a.approved_by_uid || '',
          createdAt: a.created_at,
        }))
      );
    }
  }, [user, isAdmin]);

  // Admin subscriptions for doctor verification
  useEffect(() => {
    const client = supabase;
    if (!client || !user || !isAdmin) {
      setPendingDoctorRequests([]);
      setAllowlistEntries([]);
      return;
    }

    void fetchAdminData();

    const channel = client
      .channel(`admin-wellness-${user.uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doctor_requests' }, () => {
        void fetchAdminData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doctor_allowlist' }, () => {
        void fetchAdminData();
      })
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [user, isAdmin, fetchAdminData]);

  function saveLocalUhid(data: LocalUhid) {
    setLocalUhid(data);
    writeLocal(LOCAL_UHID_KEY, data);
  }

  function saveLocalAppt(record: AppointmentRecord) {
    const updated = [...localAppointments, record].sort((a, b) =>
      `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
    );
    setLocalAppointments(updated);
    writeLocal(LOCAL_APPTS_KEY, updated);
    return record;
  }

  async function bookAppointment(input: {
    doctorId: string;
    date: string;
    time: string;
    reason: string;
    studentName?: string;
    studentRoll?: string;
    studentUhid?: string;
  }): Promise<AppointmentRecord> {
    const practitioner = ALL_PRACTITIONERS.find((p) => p.id === input.doctorId);
    if (!practitioner) {
      throw new Error('Practitioner not found');
    }

    const id = `appt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (!supabase || !user || !profile || !tablesAvailable) {
      return saveLocalAppt({
        id,
        studentUid: user?.uid || 'local',
        studentName: sanitize(input.studentName || profile?.displayName || localUhid.name || 'Student', 100),
        studentRoll: sanitize(input.studentRoll ?? profile?.rollNumber ?? localUhid.roll ?? '', 30),
        studentUhid: sanitize(input.studentUhid ?? profile?.uhid ?? localUhid.uhid ?? '', 40),
        doctorId: practitioner.id,
        doctorName: practitioner.name,
        doctorSpec: practitioner.spec,
        assignedDoctorUid: '',
        date: input.date,
        time: input.time,
        reason: sanitize(input.reason, 500),
        doctorNotes: '',
        status: 'pending',
        isLocalOnly: true,
      });
    }

    const assignedDoctorUid = doctorStatuses[practitioner.id]?.assignedUid || null;
    const rowPayload = {
      id,
      student_uid: user.uid,
      student_name: sanitize(input.studentName || profile.displayName || 'Student', 100),
      student_roll: sanitize(input.studentRoll ?? profile.rollNumber ?? '', 30),
      student_uhid: sanitize(input.studentUhid ?? profile.uhid ?? '', 40),
      doctor_id: practitioner.id,
      doctor_name: sanitize(practitioner.name, 100),
      doctor_spec: sanitize(practitioner.spec, 100),
      assigned_doctor_uid: assignedDoctorUid ? sanitize(assignedDoctorUid, 128) : null,
      date: input.date,
      time: input.time,
      reason: sanitize(input.reason, 500),
      doctor_notes: '',
      status: 'pending' as AppointmentStatus,
    };

    const { data, error } = await supabase
      .from('appointments')
      .insert(rowPayload)
      .select()
      .single<AppointmentRow>();

    if (error) {
      if (isMissingSchemaError(error)) {
        setTablesAvailable(false);
        return saveLocalAppt({
          id,
          studentUid: user.uid,
          studentName: rowPayload.student_name,
          studentRoll: rowPayload.student_roll,
          studentUhid: rowPayload.student_uhid,
          doctorId: rowPayload.doctor_id,
          doctorName: rowPayload.doctor_name,
          doctorSpec: rowPayload.doctor_spec,
          assignedDoctorUid: '',
          date: rowPayload.date,
          time: rowPayload.time,
          reason: rowPayload.reason,
          doctorNotes: '',
          status: 'pending',
          isLocalOnly: true,
        });
      }
      throw new Error(error.message);
    }

    const record = mapAppointmentRow(data);
    setRemoteAppointments((prev) =>
      [...prev, record].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
    );
    return record;
  }

  async function cancelAppointment(appt: AppointmentRecord) {
    if (appt.isLocalOnly || !supabase || !user || !tablesAvailable) {
      const updated = localAppointments.filter((a) => a.id !== appt.id);
      setLocalAppointments(updated);
      writeLocal(LOCAL_APPTS_KEY, updated);
      return;
    }

    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', appt.id);

    if (error) {
      throw new Error(error.message);
    }
    await fetchUserScopedData();
  }

  function deleteLocalAppointment(id: string) {
    const updated = localAppointments.filter((a) => a.id !== id);
    setLocalAppointments(updated);
    writeLocal(LOCAL_APPTS_KEY, updated);
  }

  async function updateAppointmentClinical(
    apptId: string,
    updates: { status: AppointmentStatus; doctorNotes: string; claimUnassigned?: boolean }
  ) {
    if (!supabase || !user) return;
    const body: Record<string, unknown> = {
      status: updates.status,
      doctor_notes: sanitize(updates.doctorNotes, 1000),
      updated_at: new Date().toISOString(),
    };
    if (updates.claimUnassigned) {
      body.assigned_doctor_uid = user.uid;
    }
    const { error } = await supabase.from('appointments').update(body).eq('id', apptId);
    if (error) {
      throw new Error(error.message);
    }
    await fetchUserScopedData();
  }

  async function saveMoodCheckIn(date: string, score: number, note: string) {
    const cleanDate = date || toIsoDate(new Date());
    const cleanScore = Math.min(5, Math.max(1, Math.round(score)));
    const cleanNote = sanitize(note, 500);

    const saveMoodLocal = () => {
      const next = localMoods
        .filter((m) => m.date !== cleanDate)
        .concat([{ date: cleanDate, score: cleanScore, note: cleanNote }])
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-90);
      setLocalMoods(next);
      writeLocal(LOCAL_MOODS_KEY, next);
    };

    if (!supabase || !user || !tablesAvailable) {
      saveMoodLocal();
      return;
    }

    const { error } = await supabase.from('moods').upsert(
      {
        user_uid: user.uid,
        date: cleanDate,
        score: cleanScore,
        note: cleanNote,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_uid,date' }
    );

    if (error) {
      if (isMissingSchemaError(error)) {
        setTablesAvailable(false);
        saveMoodLocal();
        return;
      }
      throw new Error(error.message);
    }
    await fetchUserScopedData();
  }

  async function saveDoctorStatus(
    doctorId: string,
    availabilityOverride: AvailabilityOverride,
    customNote: string,
    claimOwnership = true
  ) {
    if (!supabase || !user) return;
    const existing = doctorStatuses[doctorId];
    const assignedUid = claimOwnership ? user.uid : existing?.assignedUid || user.uid;

    const { error } = await supabase.from('doctor_statuses').upsert(
      {
        doctor_id: sanitize(doctorId, 64),
        availability_override: availabilityOverride,
        custom_note: sanitize(customNote, 200),
        assigned_uid: sanitize(assignedUid, 128),
        updated_by_uid: user.uid,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'doctor_id' }
    );

    if (error) {
      throw new Error(error.message);
    }
    await fetchPublicClinicData();
  }

  async function saveSpecialistRoster(
    dateKey: string,
    specialists: string[],
    timeWindow: string
  ) {
    if (!supabase || !user) return;
    const cleanList = specialists
      .map((s) => sanitize(s, 120))
      .filter(Boolean)
      .slice(0, 10);
    if (!cleanList.length) return;

    const { error } = await supabase.from('specialist_roster').upsert(
      {
        date_key: dateKey,
        specialists: cleanList,
        time_window: sanitize(timeWindow || '3 PM – 5 PM', 60),
        updated_by_uid: user.uid,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'date_key' }
    );

    if (error) {
      throw new Error(error.message);
    }
    await fetchPublicClinicData();
  }

  async function approveDoctorRequest(req: DoctorAccessRequest) {
    if (!supabase || !user || !isAdmin) return;
    const { error: allowErr } = await supabase.from('doctor_allowlist').upsert(
      {
        email: sanitize(req.email.toLowerCase(), 150),
        assigned_doctor_id: sanitize(req.requestedDoctorId, 64),
        doctor_name: sanitize(req.fullName, 100),
        approved_by_uid: user.uid,
      },
      { onConflict: 'email' }
    );
    if (allowErr) throw new Error(allowErr.message);

    const { error: reqErr } = await supabase
      .from('doctor_requests')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('uid', req.uid);
    if (reqErr) throw new Error(reqErr.message);

    await fetchAdminData();
  }

  async function rejectDoctorRequest(req: DoctorAccessRequest) {
    if (!supabase || !user || !isAdmin) return;
    const { error } = await supabase
      .from('doctor_requests')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('uid', req.uid);
    if (error) throw new Error(error.message);

    await fetchAdminData();
  }

  async function addAllowlistDoctor(email: string, assignedDoctorId: string, doctorName: string) {
    if (!supabase || !user || !isAdmin) return;
    const cleanEmail = sanitize(email.toLowerCase(), 150);
    const { error } = await supabase.from('doctor_allowlist').upsert(
      {
        email: cleanEmail,
        assigned_doctor_id: sanitize(assignedDoctorId, 64),
        doctor_name: sanitize(doctorName, 100),
        approved_by_uid: user.uid,
      },
      { onConflict: 'email' }
    );
    if (error) throw new Error(error.message);
    await fetchAdminData();
  }

  async function removeAllowlistDoctor(email: string) {
    if (!supabase || !user || !isAdmin) return;
    const { error } = await supabase.from('doctor_allowlist').delete().eq('email', email);
    if (error) throw new Error(error.message);
    await fetchAdminData();
  }

  const appointments = user && tablesAvailable ? remoteAppointments : localAppointments;
  const moods = user && tablesAvailable ? remoteMoods : localMoods;

  return (
    <WellnessDataContext.Provider
      value={{
        doctorStatuses,
        specialistRosters,
        appointments,
        moods,
        pendingDoctorRequests,
        allowlistEntries,
        localUhid,
        saveLocalUhid,
        bookAppointment,
        cancelAppointment,
        deleteLocalAppointment,
        updateAppointmentClinical,
        saveMoodCheckIn,
        saveDoctorStatus,
        saveSpecialistRoster,
        approveDoctorRequest,
        rejectDoctorRequest,
        addAllowlistDoctor,
        removeAllowlistDoctor,
      }}
    >
      {children}
    </WellnessDataContext.Provider>
  );
}

export function useWellnessData() {
  const ctx = useContext(WellnessDataContext);
  if (!ctx) throw new Error('useWellnessData must be used inside WellnessDataProvider');
  return ctx;
}

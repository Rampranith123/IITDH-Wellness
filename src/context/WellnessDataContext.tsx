import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  ALL_PRACTITIONERS,
  toIsoDate,
} from '../data/wellnessData';
import {
  OperationType,
  db,
  handleFirestoreError,
} from '../firebase';
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
  const { firebaseUser, profile, isAdmin, isVerifiedDoctor } = useAuth();

  const [doctorStatuses, setDoctorStatuses] = useState<Record<string, DoctorStatus>>({});
  const [specialistRosters, setSpecialistRosters] = useState<Record<string, SpecialistRosterEntry>>({});
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

  // Public real-time doctor duty statuses & Saturday visiting rosters
  useEffect(() => {
    const unsubStatuses = onSnapshot(
      collection(db, 'doctor_statuses'),
      (snap) => {
        const next: Record<string, DoctorStatus> = {};
        snap.forEach((d) => {
          next[d.id] = d.data() as DoctorStatus;
        });
        setDoctorStatuses(next);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'doctor_statuses');
      }
    );

    const unsubRosters = onSnapshot(
      collection(db, 'specialist_roster'),
      (snap) => {
        const next: Record<string, SpecialistRosterEntry> = {};
        snap.forEach((d) => {
          next[d.id] = d.data() as SpecialistRosterEntry;
        });
        setSpecialistRosters(next);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'specialist_roster');
      }
    );

    return () => {
      unsubStatuses();
      unsubRosters();
    };
  }, []);

  // Authenticated private moods & role-scoped appointments
  useEffect(() => {
    if (!firebaseUser || !profile) {
      setRemoteAppointments([]);
      setRemoteMoods([]);
      return;
    }

    const moodsPath = `users/${firebaseUser.uid}/moods`;
    const unsubMoods = onSnapshot(
      query(collection(db, 'users', firebaseUser.uid, 'moods'), orderBy('date', 'asc')),
      (snap) => {
        const rows: MoodEntry[] = [];
        snap.forEach((d) => rows.push(d.data() as MoodEntry));
        setRemoteMoods(rows);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, moodsPath);
      }
    );

    let apptsQuery;
    if (profile.role === 'doctor' && isAdmin) {
      apptsQuery = query(collection(db, 'appointments'));
    } else if (profile.role === 'doctor' && isVerifiedDoctor) {
      apptsQuery = query(
        collection(db, 'appointments'),
        where('assignedDoctorUid', '==', firebaseUser.uid)
      );
    } else {
      apptsQuery = query(
        collection(db, 'appointments'),
        where('studentUid', '==', firebaseUser.uid)
      );
    }

    const unsubAppts = onSnapshot(
      apptsQuery,
      (snap) => {
        const rows: AppointmentRecord[] = [];
        snap.forEach((d) => {
          rows.push({ ...(d.data() as Omit<AppointmentRecord, 'id'>), id: d.id });
        });
        rows.sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
        setRemoteAppointments(rows);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'appointments');
      }
    );

    return () => {
      unsubMoods();
      unsubAppts();
    };
  }, [firebaseUser, profile, isAdmin, isVerifiedDoctor]);

  // Admin subscriptions for doctor verification
  useEffect(() => {
    if (!firebaseUser || !isAdmin) {
      setPendingDoctorRequests([]);
      setAllowlistEntries([]);
      return;
    }

    const unsubReqs = onSnapshot(
      collection(db, 'doctor_requests'),
      (snap) => {
        const rows: DoctorAccessRequest[] = [];
        snap.forEach((d) => rows.push(d.data() as DoctorAccessRequest));
        setPendingDoctorRequests(rows);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'doctor_requests');
      }
    );

    const unsubAllow = onSnapshot(
      collection(db, 'doctor_allowlist'),
      (snap) => {
        const rows: DoctorAllowlistEntry[] = [];
        snap.forEach((d) => rows.push(d.data() as DoctorAllowlistEntry));
        setAllowlistEntries(rows);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'doctor_allowlist');
      }
    );

    return () => {
      unsubReqs();
      unsubAllow();
    };
  }, [firebaseUser, isAdmin]);

  function saveLocalUhid(data: LocalUhid) {
    setLocalUhid(data);
    writeLocal(LOCAL_UHID_KEY, data);
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

    if (!firebaseUser || !profile) {
      const localRecord: AppointmentRecord = {
        id,
        studentUid: 'local',
        studentName: sanitize(input.studentName || localUhid.name || 'Student', 100),
        studentRoll: sanitize(input.studentRoll || localUhid.roll || '', 30),
        studentUhid: sanitize(input.studentUhid || localUhid.uhid || '', 40),
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
      };
      const updated = [...localAppointments, localRecord].sort((a, b) =>
        `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
      );
      setLocalAppointments(updated);
      writeLocal(LOCAL_APPTS_KEY, updated);
      return localRecord;
    }

    const assignedDoctorUid = doctorStatuses[practitioner.id]?.assignedUid || '';
    const payload = {
      studentUid: firebaseUser.uid,
      studentName: sanitize(input.studentName || profile.displayName || 'Student', 100),
      studentRoll: sanitize(input.studentRoll ?? profile.rollNumber ?? '', 30),
      studentUhid: sanitize(input.studentUhid ?? profile.uhid ?? '', 40),
      doctorId: practitioner.id,
      doctorName: sanitize(practitioner.name, 100),
      doctorSpec: sanitize(practitioner.spec, 100),
      assignedDoctorUid: sanitize(assignedDoctorUid, 128),
      date: input.date,
      time: input.time,
      reason: sanitize(input.reason, 500),
      doctorNotes: '',
      status: 'pending' as AppointmentStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'appointments', id), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `appointments/${id}`);
    }

    return { ...payload, id };
  }

  async function cancelAppointment(appt: AppointmentRecord) {
    if (appt.isLocalOnly || !firebaseUser) {
      const updated = localAppointments.filter((a) => a.id !== appt.id);
      setLocalAppointments(updated);
      writeLocal(LOCAL_APPTS_KEY, updated);
      return;
    }

    try {
      await updateDoc(doc(db, 'appointments', appt.id), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `appointments/${appt.id}`);
    }
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
    if (!firebaseUser) return;
    const body: Record<string, unknown> = {
      status: updates.status,
      doctorNotes: sanitize(updates.doctorNotes, 1000),
      updatedAt: serverTimestamp(),
    };
    if (updates.claimUnassigned) {
      body.assignedDoctorUid = firebaseUser.uid;
    }
    try {
      await updateDoc(doc(db, 'appointments', apptId), body);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `appointments/${apptId}`);
    }
  }

  async function saveMoodCheckIn(date: string, score: number, note: string) {
    const cleanDate = date || toIsoDate(new Date());
    const cleanScore = Math.min(5, Math.max(1, Math.round(score)));
    const cleanNote = sanitize(note, 500);

    if (!firebaseUser) {
      const next = localMoods
        .filter((m) => m.date !== cleanDate)
        .concat([{ date: cleanDate, score: cleanScore, note: cleanNote }])
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-90);
      setLocalMoods(next);
      writeLocal(LOCAL_MOODS_KEY, next);
      return;
    }

    const existing = remoteMoods.find((m) => m.date === cleanDate);
    const ref = doc(db, 'users', firebaseUser.uid, 'moods', cleanDate);
    try {
      if (existing) {
        await updateDoc(ref, {
          score: cleanScore,
          note: cleanNote,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          date: cleanDate,
          score: cleanScore,
          note: cleanNote,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}/moods/${cleanDate}`);
    }
  }

  async function saveDoctorStatus(
    doctorId: string,
    availabilityOverride: AvailabilityOverride,
    customNote: string,
    claimOwnership = true
  ) {
    if (!firebaseUser) return;
    const existing = doctorStatuses[doctorId];
    const assignedUid = claimOwnership
      ? firebaseUser.uid
      : existing?.assignedUid || firebaseUser.uid;

    const ref = doc(db, 'doctor_statuses', doctorId);
    try {
      await setDoc(ref, {
        doctorId: sanitize(doctorId, 64),
        availabilityOverride,
        customNote: sanitize(customNote, 200),
        assignedUid: sanitize(assignedUid, 128),
        updatedByUid: firebaseUser.uid,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `doctor_statuses/${doctorId}`);
    }
  }

  async function saveSpecialistRoster(
    dateKey: string,
    specialists: string[],
    timeWindow: string
  ) {
    if (!firebaseUser) return;
    const cleanList = specialists
      .map((s) => sanitize(s, 120))
      .filter(Boolean)
      .slice(0, 10);
    if (!cleanList.length) return;

    const ref = doc(db, 'specialist_roster', dateKey);
    try {
      await setDoc(ref, {
        dateKey,
        specialists: cleanList,
        timeWindow: sanitize(timeWindow || '3 PM – 5 PM', 60),
        updatedByUid: firebaseUser.uid,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `specialist_roster/${dateKey}`);
    }
  }

  async function approveDoctorRequest(req: DoctorAccessRequest) {
    if (!firebaseUser || !isAdmin) return;
    try {
      await setDoc(doc(db, 'doctor_allowlist', req.email), {
        email: sanitize(req.email, 150),
        assignedDoctorId: sanitize(req.requestedDoctorId, 64),
        doctorName: sanitize(req.fullName, 100),
        approvedByUid: firebaseUser.uid,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'doctor_requests', req.uid), {
        status: 'approved',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `doctor_allowlist/${req.email}`);
    }
  }

  async function rejectDoctorRequest(req: DoctorAccessRequest) {
    if (!firebaseUser || !isAdmin) return;
    try {
      await updateDoc(doc(db, 'doctor_requests', req.uid), {
        status: 'rejected',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `doctor_requests/${req.uid}`);
    }
  }

  async function addAllowlistDoctor(email: string, assignedDoctorId: string, doctorName: string) {
    if (!firebaseUser || !isAdmin) return;
    const cleanEmail = sanitize(email.toLowerCase(), 150);
    try {
      await setDoc(doc(db, 'doctor_allowlist', cleanEmail), {
        email: cleanEmail,
        assignedDoctorId: sanitize(assignedDoctorId, 64),
        doctorName: sanitize(doctorName, 100),
        approvedByUid: firebaseUser.uid,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `doctor_allowlist/${cleanEmail}`);
    }
  }

  async function removeAllowlistDoctor(email: string) {
    if (!firebaseUser || !isAdmin) return;
    try {
      await deleteDoc(doc(db, 'doctor_allowlist', email));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `doctor_allowlist/${email}`);
    }
  }

  const appointments = firebaseUser ? remoteAppointments : localAppointments;
  const moods = firebaseUser ? remoteMoods : localMoods;

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

export type UserRole = 'student' | 'doctor';

export interface TimeSlot {
  days: number[]; // 0=Sun .. 6=Sat
  start: string;  // "HH:MM"
  end: string;    // "HH:MM"
}

export interface DoctorInfo {
  id: string;
  name: string;
  qual: string;
  spec: string;
  when: string;
  slots: TimeSlot[];
  bookKey?: string;
}

export interface CounsellorInfo {
  id: string;
  name: string;
  qual: string;
  spec: string;
  when: string;
  bookKey: string;
  feedbackKey: string;
}

export type AvailabilityOverride = 'auto' | 'available' | 'in_consultation' | 'on_leave';

export interface DoctorStatus {
  doctorId: string;
  availabilityOverride: AvailabilityOverride;
  customNote: string;
  assignedUid: string;
  updatedByUid: string;
  updatedAt?: unknown;
}

export interface AvailabilityResult {
  now: boolean;
  label: string;
  detail: string;
  overrideState: AvailabilityOverride;
  customNote?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  rollNumber: string;
  uhid: string;
  hostelOrDept: string;
  linkedDoctorId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MoodEntry {
  date: string; // YYYY-MM-DD
  score: number; // 1..5
  note: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface AppointmentRecord {
  id: string;
  studentUid: string;
  studentName: string;
  studentRoll: string;
  studentUhid: string;
  doctorId: string;
  doctorName: string;
  doctorSpec: string;
  assignedDoctorUid: string;
  date: string;
  time: string;
  reason: string;
  doctorNotes: string;
  status: AppointmentStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
  isLocalOnly?: boolean;
}

export interface DoctorAllowlistEntry {
  email: string;
  assignedDoctorId: string;
  doctorName: string;
  approvedByUid: string;
  createdAt?: unknown;
}

export interface DoctorAccessRequest {
  uid: string;
  email: string;
  fullName: string;
  requestedDoctorId: string;
  credentials: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SpecialistRosterEntry {
  dateKey: string;
  specialists: string[];
  timeWindow: string;
  updatedByUid: string;
  updatedAt?: unknown;
}

export type AppView =
  | 'home'
  | 'doctors'
  | 'counselling'
  | 'me'
  | 'more'
  | 'emergency'
  | 'book'
  | 'auth'
  | 'doctor-portal';

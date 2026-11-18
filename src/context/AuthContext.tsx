import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  isSupabaseConfigured,
  supabase,
} from '../lib/supabase';
import type {
  DoctorAccessRequest,
  DoctorAllowlistEntry,
  UserProfile,
  UserRole,
} from '../types/wellness';

const PENDING_PORTAL_KEY = 'iitdh_pending_portal';
const LOCAL_PROFILE_PREFIX = 'iitdh_profile_cache_v1:';

export interface AuthUserSummary {
  uid: string;
  email: string;
  displayName: string;
  requestedPortal?: UserRole;
}

interface ProfileRow {
  id: string;
  display_name: string;
  email: string;
  role: UserRole;
  roll_number: string;
  uhid: string;
  hostel_or_dept: string;
  linked_doctor_id: string;
  created_at?: string;
  updated_at?: string;
}

interface AllowlistRow {
  email: string;
  assigned_doctor_id: string;
  doctor_name: string;
  approved_by_uid: string | null;
  created_at?: string;
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

function mapProfileRow(row: ProfileRow): UserProfile {
  return {
    uid: row.id,
    displayName: row.display_name || '',
    email: row.email || '',
    role: row.role === 'doctor' ? 'doctor' : 'student',
    rollNumber: row.roll_number || '',
    uhid: row.uhid || '',
    hostelOrDept: row.hostel_or_dept || '',
    linkedDoctorId: row.linked_doctor_id || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAllowlistRow(row: AllowlistRow): DoctorAllowlistEntry {
  return {
    email: row.email,
    assignedDoctorId: row.assigned_doctor_id,
    doctorName: row.doctor_name,
    approvedByUid: row.approved_by_uid || '',
    createdAt: row.created_at,
  };
}

function mapRequestRow(row: DoctorRequestRow): DoctorAccessRequest {
  return {
    uid: row.uid,
    email: row.email,
    fullName: row.full_name,
    requestedDoctorId: row.requested_doctor_id,
    credentials: row.credentials,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAuthSummary(sbUser: SupabaseUser | null): AuthUserSummary | null {
  if (!sbUser) return null;
  const meta = (sbUser.user_metadata ?? {}) as Record<string, unknown>;
  const rawName =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    sbUser.email?.split('@')[0] ||
    'IIT Dharwad Member';
  const requestedPortal =
    meta.requested_portal === 'doctor' || meta.requested_portal === 'student'
      ? meta.requested_portal
      : undefined;
  return {
    uid: sbUser.id,
    email: sbUser.email || '',
    displayName: rawName,
    requestedPortal,
  };
}

function readCachedProfile(uid: string): UserProfile | null {
  try {
    const raw = localStorage.getItem(`${LOCAL_PROFILE_PREFIX}${uid}`);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

function writeCachedProfile(prof: UserProfile) {
  try {
    localStorage.setItem(`${LOCAL_PROFILE_PREFIX}${prof.uid}`, JSON.stringify(prof));
  } catch {
    // ignore storage errors
  }
}

function isMissingSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    Boolean(error.message?.includes('schema cache'))
  );
}

interface AuthContextValue {
  user: AuthUserSummary | null;
  authReady: boolean;
  isSupabaseConfigured: boolean;
  signingInPortal: UserRole | null;
  authError: string | null;
  authNotice: string | null;
  unconfirmedEmail: string | null;
  passwordRecoveryPending: boolean;
  profile: UserProfile | null;
  allowlistEntry: DoctorAllowlistEntry | null;
  doctorRequest: DoctorAccessRequest | null;
  isAdmin: boolean;
  isVerifiedDoctor: boolean;
  needsDoctorVerification: boolean;
  signInWithEmailPortal: (
    portal: UserRole,
    email: string,
    password: string,
    mode: 'signin' | 'signup',
    fullName?: string
  ) => Promise<'signed-in' | 'needs-verification' | 'check-email' | 'error'>;
  resendSignupConfirmation: (email: string) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  updateAccountPassword: (newPassword: string) => Promise<boolean>;
  signOutUser: () => Promise<void>;
  updateStudentProfile: (data: {
    displayName: string;
    rollNumber: string;
    uhid: string;
    hostelOrDept: string;
  }) => Promise<void>;
  switchPortalRole: (targetRole: UserRole, linkedDoctorId?: string) => Promise<void>;
  submitDoctorVerificationRequest: (data: {
    fullName: string;
    requestedDoctorId: string;
    credentials: string;
  }) => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function sanitizeStr(val: string, maxLen: number): string {
  return String(val ?? '').trim().slice(0, maxLen);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUserSummary | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [signingInPortal, setSigningInPortal] = useState<UserRole | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [passwordRecoveryPending, setPasswordRecoveryPending] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allowlistEntry, setAllowlistEntry] = useState<DoctorAllowlistEntry | null>(null);
  const [doctorRequest, setDoctorRequest] = useState<DoctorAccessRequest | null>(null);
  const [pendingDoctorFlow, setPendingDoctorFlow] = useState(false);

  const isAdmin = Boolean(
    user?.email && user.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()
  );
  const isVerifiedDoctor = Boolean(isAdmin || allowlistEntry);
  const needsDoctorVerification = Boolean(user && pendingDoctorFlow && !isVerifiedDoctor);

  const buildFallbackProfile = useCallback(
    (summary: AuthUserSummary, role: UserRole, linkedDoctorId = ''): UserProfile => {
      const cached = readCachedProfile(summary.uid);
      const next: UserProfile = {
        uid: summary.uid,
        displayName: cached?.displayName || sanitizeStr(summary.displayName || 'IITDH Member', 100),
        email: sanitizeStr(summary.email, 150),
        role,
        rollNumber: cached?.rollNumber || '',
        uhid: cached?.uhid || '',
        hostelOrDept: cached?.hostelOrDept || '',
        linkedDoctorId: linkedDoctorId || cached?.linkedDoctorId || '',
      };
      writeCachedProfile(next);
      return next;
    },
    []
  );

  const ensureUserProfile = useCallback(
    async (
      summary: AuthUserSummary,
      requestedPortal: UserRole
    ): Promise<'signed-in' | 'needs-verification'> => {
      const emailLower = summary.email.toLowerCase();
      const userIsAdmin = emailLower === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

      if (!supabase) {
        const fallbackRole: UserRole =
          requestedPortal === 'doctor' && userIsAdmin ? 'doctor' : 'student';
        setProfile(buildFallbackProfile(summary, fallbackRole));
        return 'signed-in';
      }

      let allowDoc: DoctorAllowlistEntry | null = null;
      if (summary.email) {
        const { data: allowRow, error: allowErr } = await supabase
          .from('doctor_allowlist')
          .select('*')
          .ilike('email', summary.email)
          .maybeSingle<AllowlistRow>();
        if (!allowErr && allowRow) {
          allowDoc = mapAllowlistRow(allowRow);
          setAllowlistEntry(allowDoc);
        }
      }

      const canBeDoctor = userIsAdmin || Boolean(allowDoc);
      const { data: existingProfileRow, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', summary.uid)
        .maybeSingle<ProfileRow>();

      if (isMissingSchemaError(fetchErr)) {
        const needsVerify = requestedPortal === 'doctor' && !canBeDoctor;
        setPendingDoctorFlow(needsVerify);
        const fallbackRole: UserRole =
          requestedPortal === 'doctor' && canBeDoctor ? 'doctor' : 'student';
        const fallbackDocId = fallbackRole === 'doctor' ? 'aravind' : '';
        setProfile(buildFallbackProfile(summary, fallbackRole, fallbackDocId));
        return needsVerify ? 'needs-verification' : 'signed-in';
      }

      if (requestedPortal === 'doctor' && !canBeDoctor) {
        if (!existingProfileRow) {
          const { data: inserted } = await supabase
            .from('profiles')
            .insert({
              id: summary.uid,
              display_name: sanitizeStr(summary.displayName || 'Practitioner', 100),
              email: sanitizeStr(summary.email, 150),
              role: 'student',
              roll_number: '',
              uhid: '',
              hostel_or_dept: '',
              linked_doctor_id: '',
            })
            .select()
            .single<ProfileRow>();
          const prof = inserted
            ? mapProfileRow(inserted)
            : buildFallbackProfile(summary, 'student');
          writeCachedProfile(prof);
          setProfile(prof);
        } else {
          const prof = mapProfileRow(existingProfileRow);
          writeCachedProfile(prof);
          setProfile(prof);
        }
        setPendingDoctorFlow(true);
        return 'needs-verification';
      }

      setPendingDoctorFlow(false);
      const targetRole: UserRole =
        requestedPortal === 'doctor' && canBeDoctor ? 'doctor' : 'student';
      const assignedDocId =
        targetRole === 'doctor'
          ? allowDoc?.assignedDoctorId || existingProfileRow?.linked_doctor_id || 'aravind'
          : existingProfileRow?.linked_doctor_id || '';

      if (!existingProfileRow) {
        const { data: inserted, error } = await supabase
          .from('profiles')
          .insert({
            id: summary.uid,
            display_name: sanitizeStr(summary.displayName || 'IITDH Member', 100),
            email: sanitizeStr(summary.email, 150),
            role: targetRole,
            roll_number: '',
            uhid: '',
            hostel_or_dept: '',
            linked_doctor_id: sanitizeStr(assignedDocId, 64),
          })
          .select()
          .single<ProfileRow>();
        if (error) {
          setProfile(buildFallbackProfile(summary, targetRole, assignedDocId));
        } else if (inserted) {
          const prof = mapProfileRow(inserted);
          writeCachedProfile(prof);
          setProfile(prof);
        }
      } else if (
        existingProfileRow.role !== targetRole &&
        (targetRole === 'student' || canBeDoctor)
      ) {
        const { data: updated, error } = await supabase
          .from('profiles')
          .update({
            role: targetRole,
            linked_doctor_id: sanitizeStr(assignedDocId, 64),
            updated_at: new Date().toISOString(),
          })
          .eq('id', summary.uid)
          .select()
          .single<ProfileRow>();
        if (error) {
          const prof = mapProfileRow(existingProfileRow);
          setProfile(prof);
        } else if (updated) {
          const prof = mapProfileRow(updated);
          writeCachedProfile(prof);
          setProfile(prof);
        }
      } else {
        const prof = mapProfileRow(existingProfileRow);
        writeCachedProfile(prof);
        setProfile(prof);
      }

      return 'signed-in';
    },
    [buildFallbackProfile]
  );

  const loadUserRecords = useCallback(
    async (summary: AuthUserSummary) => {
      if (!supabase) return;

      const userIsAdmin = summary.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
      const { data: profRow, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', summary.uid)
        .maybeSingle<ProfileRow>();

      if (isMissingSchemaError(profErr)) {
        const role: UserRole =
          summary.requestedPortal === 'doctor' && userIsAdmin ? 'doctor' : 'student';
        setProfile(buildFallbackProfile(summary, role, role === 'doctor' ? 'aravind' : ''));
        return;
      }

      if (profRow) {
        const mapped = mapProfileRow(profRow);
        writeCachedProfile(mapped);
        setProfile(mapped);
      } else {
        await ensureUserProfile(summary, summary.requestedPortal || 'student');
      }

      if (summary.email) {
        const { data: allowRow } = await supabase
          .from('doctor_allowlist')
          .select('*')
          .ilike('email', summary.email)
          .maybeSingle<AllowlistRow>();
        setAllowlistEntry(allowRow ? mapAllowlistRow(allowRow) : null);
      }

      const { data: reqRow } = await supabase
        .from('doctor_requests')
        .select('*')
        .eq('uid', summary.uid)
        .maybeSingle<DoctorRequestRow>();
      setDoctorRequest(reqRow ? mapRequestRow(reqRow) : null);
    },
    [buildFallbackProfile, ensureUserProfile]
  );

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    let mounted = true;

    const syncSession = async (sbUser: SupabaseUser | null) => {
      if (!mounted) return;
      const summary = toAuthSummary(sbUser);
      setUser(summary);
      setAuthReady(true);

      if (!summary) {
        setProfile(null);
        setAllowlistEntry(null);
        setDoctorRequest(null);
        setPendingDoctorFlow(false);
        return;
      }

      let pendingPortal: UserRole | null = null;
      try {
        const stored = sessionStorage.getItem(PENDING_PORTAL_KEY);
        if (stored === 'student' || stored === 'doctor') {
          pendingPortal = stored;
          sessionStorage.removeItem(PENDING_PORTAL_KEY);
        }
      } catch {
        // ignore sessionStorage error
      }

      if (pendingPortal) {
        await ensureUserProfile(summary, pendingPortal);
      } else {
        await loadUserRecords(summary);
      }
    };

    void supabase.auth.getSession().then(({ data }) => {
      void syncSession(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryPending(true);
      }
      void syncSession(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [ensureUserProfile, loadUserRecords]);

  // Realtime listener for profile, allowlist, and doctor verification status
  useEffect(() => {
    const client = supabase;
    if (!client || !user) return;

    const channel = client
      .channel(`auth-user-${user.uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.uid}` },
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            const prof = mapProfileRow(payload.new as ProfileRow);
            writeCachedProfile(prof);
            setProfile(prof);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'doctor_requests', filter: `uid=eq.${user.uid}` },
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && 'uid' in payload.new) {
            setDoctorRequest(mapRequestRow(payload.new as DoctorRequestRow));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'doctor_allowlist' },
        () => {
          void loadUserRecords(user);
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [user, loadUserRecords]);

  async function signInWithEmailPortal(
    portal: UserRole,
    email: string,
    password: string,
    mode: 'signin' | 'signup',
    fullName?: string
  ): Promise<'signed-in' | 'needs-verification' | 'check-email' | 'error'> {
    setAuthError(null);
    setAuthNotice(null);
    setUnconfirmedEmail(null);

    if (!supabase) {
      setAuthError('Supabase authentication is not configured.');
      return 'error';
    }

    const cleanEmail = sanitizeStr(email, 150);
    if (!cleanEmail || !password) {
      setAuthError('Please enter both your email address and password.');
      return 'error';
    }

    setSigningInPortal(portal);
    try {
      if (mode === 'signup') {
        try {
          sessionStorage.setItem(PENDING_PORTAL_KEY, portal);
        } catch {
          // ignore
        }

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: sanitizeStr(
                fullName || cleanEmail.split('@')[0] || 'IIT Dharwad Member',
                100
              ),
              requested_portal: portal,
            },
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) {
          setAuthError(error.message);
          return 'error';
        }

        if (!data.session && data.user) {
          setUnconfirmedEmail(cleanEmail);
          setAuthNotice(
            `Confirmation link sent to ${cleanEmail}. Check your inbox and verify your email, then sign in here.`
          );
          return 'check-email';
        }

        const summary = toAuthSummary(data.user);
        if (!summary) return 'error';
        setUser(summary);
        return await ensureUserProfile(summary, portal);
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        if (
          error.code === 'email_not_confirmed' ||
          error.message.toLowerCase().includes('email not confirmed')
        ) {
          setUnconfirmedEmail(cleanEmail);
        }
        setAuthError(error.message);
        return 'error';
      }

      const summary = toAuthSummary(data.user);
      if (!summary) return 'error';
      setUser(summary);
      return await ensureUserProfile(summary, portal);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to sign in with Supabase.');
      return 'error';
    } finally {
      setSigningInPortal(null);
    }
  }

  async function resendSignupConfirmation(email: string) {
    setAuthError(null);
    setAuthNotice(null);
    if (!supabase) return;
    const cleanEmail = sanitizeStr(email, 150);
    if (!cleanEmail) {
      setAuthError('Please enter your email address first.');
      return;
    }
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      setAuthError(error.message);
      return;
    }
    setAuthNotice(`A new verification email was sent to ${cleanEmail}. Check your inbox or spam folder.`);
  }

  async function sendPasswordResetEmail(email: string) {
    setAuthError(null);
    setAuthNotice(null);
    if (!supabase) return;
    const cleanEmail = sanitizeStr(email, 150);
    if (!cleanEmail) {
      setAuthError('Enter your email address first to receive a password reset link.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: window.location.origin,
    });
    if (error) {
      setAuthError(error.message);
      return;
    }
    setAuthNotice(`Password reset link sent to ${cleanEmail}. Check your inbox to set a new password.`);
  }

  async function updateAccountPassword(newPassword: string): Promise<boolean> {
    setAuthError(null);
    setAuthNotice(null);
    if (!supabase) return false;
    if (newPassword.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return false;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setAuthError(error.message);
      return false;
    }
    setPasswordRecoveryPending(false);
    setAuthNotice('Password updated successfully. You are now signed in.');
    return true;
  }

  async function signOutUser() {
    setAuthError(null);
    setAuthNotice(null);
    setUnconfirmedEmail(null);
    setPasswordRecoveryPending(false);
    setPendingDoctorFlow(false);
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setAllowlistEntry(null);
    setDoctorRequest(null);
  }

  async function updateStudentProfile(data: {
    displayName: string;
    rollNumber: string;
    uhid: string;
    hostelOrDept: string;
  }) {
    if (!user) return;
    const nextLocal: UserProfile = {
      uid: user.uid,
      displayName: sanitizeStr(data.displayName || user.displayName || 'Student', 100),
      email: user.email,
      role: profile?.role || 'student',
      rollNumber: sanitizeStr(data.rollNumber, 30),
      uhid: sanitizeStr(data.uhid, 40),
      hostelOrDept: sanitizeStr(data.hostelOrDept, 80),
      linkedDoctorId: profile?.linkedDoctorId || '',
    };
    writeCachedProfile(nextLocal);
    setProfile(nextLocal);

    if (!supabase) return;
    const { data: updated, error } = await supabase
      .from('profiles')
      .update({
        display_name: nextLocal.displayName,
        roll_number: nextLocal.rollNumber,
        uhid: nextLocal.uhid,
        hostel_or_dept: nextLocal.hostelOrDept,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.uid)
      .select()
      .single<ProfileRow>();

    if (error) {
      if (!isMissingSchemaError(error)) {
        setAuthError(error.message);
      }
      return;
    }
    if (updated) {
      const prof = mapProfileRow(updated);
      writeCachedProfile(prof);
      setProfile(prof);
    }
  }

  async function switchPortalRole(targetRole: UserRole, linkedDoctorId?: string) {
    if (!user) return;
    if (targetRole === 'doctor' && !isVerifiedDoctor) {
      setPendingDoctorFlow(true);
      return;
    }

    const nextLinked =
      linkedDoctorId !== undefined
        ? sanitizeStr(linkedDoctorId, 64)
        : allowlistEntry?.assignedDoctorId || profile?.linkedDoctorId || 'aravind';

    const nextLocal: UserProfile = {
      ...(profile || buildFallbackProfile(user, targetRole, nextLinked)),
      role: targetRole,
      linkedDoctorId: targetRole === 'doctor' ? nextLinked : profile?.linkedDoctorId || '',
    };
    writeCachedProfile(nextLocal);
    setProfile(nextLocal);
    setPendingDoctorFlow(false);

    if (!supabase) return;
    const { data: updated, error } = await supabase
      .from('profiles')
      .update({
        role: targetRole,
        linked_doctor_id: nextLocal.linkedDoctorId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.uid)
      .select()
      .single<ProfileRow>();

    if (error) {
      if (!isMissingSchemaError(error)) {
        setAuthError(error.message);
      }
      return;
    }
    if (updated) {
      const prof = mapProfileRow(updated);
      writeCachedProfile(prof);
      setProfile(prof);
    }
  }

  async function submitDoctorVerificationRequest(data: {
    fullName: string;
    requestedDoctorId: string;
    credentials: string;
  }) {
    if (!supabase || !user || !user.email) return;

    const { data: saved, error } = await supabase
      .from('doctor_requests')
      .upsert(
        {
          uid: user.uid,
          email: sanitizeStr(user.email, 150),
          full_name: sanitizeStr(data.fullName, 100),
          requested_doctor_id: sanitizeStr(data.requestedDoctorId, 64),
          credentials: sanitizeStr(data.credentials, 120),
          status: 'pending',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'uid' }
      )
      .select()
      .single<DoctorRequestRow>();

    if (error) {
      setAuthError(error.message);
      return;
    }
    if (saved) {
      setDoctorRequest(mapRequestRow(saved));
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        isSupabaseConfigured,
        signingInPortal,
        authError,
        authNotice,
        unconfirmedEmail,
        passwordRecoveryPending,
        profile,
        allowlistEntry,
        doctorRequest,
        isAdmin,
        isVerifiedDoctor,
        needsDoctorVerification,
        signInWithEmailPortal,
        resendSignupConfirmation,
        sendPasswordResetEmail,
        updateAccountPassword,
        signOutUser,
        updateStudentProfile,
        switchPortalRole,
        submitDoctorVerificationRequest,
        clearAuthError: () => {
          setAuthError(null);
          setAuthNotice(null);
          setUnconfirmedEmail(null);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

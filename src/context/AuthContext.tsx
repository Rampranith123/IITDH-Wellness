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

export interface AuthUserSummary {
  uid: string;
  email: string;
  displayName: string;
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
  return {
    uid: sbUser.id,
    email: sbUser.email || '',
    displayName: rawName,
  };
}

interface AuthContextValue {
  user: AuthUserSummary | null;
  authReady: boolean;
  isSupabaseConfigured: boolean;
  signingInPortal: UserRole | null;
  authError: string | null;
  authNotice: string | null;
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
  signInWithGooglePortal: (portal: UserRole) => Promise<void>;
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allowlistEntry, setAllowlistEntry] = useState<DoctorAllowlistEntry | null>(null);
  const [doctorRequest, setDoctorRequest] = useState<DoctorAccessRequest | null>(null);
  const [pendingDoctorFlow, setPendingDoctorFlow] = useState(false);

  const isAdmin = Boolean(
    user?.email && user.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()
  );
  const isVerifiedDoctor = Boolean(isAdmin || allowlistEntry);
  const needsDoctorVerification = Boolean(user && pendingDoctorFlow && !isVerifiedDoctor);

  const ensureUserProfile = useCallback(
    async (
      summary: AuthUserSummary,
      requestedPortal: UserRole
    ): Promise<'signed-in' | 'needs-verification'> => {
      if (!supabase) return 'signed-in';

      const emailLower = summary.email.toLowerCase();
      const userIsAdmin = emailLower === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

      let allowDoc: DoctorAllowlistEntry | null = null;
      if (summary.email) {
        const { data: allowRow } = await supabase
          .from('doctor_allowlist')
          .select('*')
          .ilike('email', summary.email)
          .maybeSingle<AllowlistRow>();
        if (allowRow) {
          allowDoc = mapAllowlistRow(allowRow);
          setAllowlistEntry(allowDoc);
        }
      }

      const canBeDoctor = userIsAdmin || Boolean(allowDoc);
      const { data: existingProfileRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', summary.uid)
        .maybeSingle<ProfileRow>();

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
          if (inserted) setProfile(mapProfileRow(inserted));
        } else {
          setProfile(mapProfileRow(existingProfileRow));
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
          console.error('Supabase profile creation failed:', error.message);
        } else if (inserted) {
          setProfile(mapProfileRow(inserted));
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
          console.error('Supabase profile role update failed:', error.message);
        } else if (updated) {
          setProfile(mapProfileRow(updated));
        }
      } else {
        setProfile(mapProfileRow(existingProfileRow));
      }

      return 'signed-in';
    },
    []
  );

  const loadUserRecords = useCallback(async (summary: AuthUserSummary) => {
    if (!supabase) return;

    const { data: profRow } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', summary.uid)
      .maybeSingle<ProfileRow>();
    if (profRow) {
      setProfile(mapProfileRow(profRow));
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
  }, []);

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
    } = supabase.auth.onAuthStateChange((_event, session) => {
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
            setProfile(mapProfileRow(payload.new as ProfileRow));
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

    if (!supabase) {
      setAuthError(
        'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Settings > Secrets.'
      );
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
            },
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) {
          setAuthError(error.message);
          return 'error';
        }

        if (!data.session && data.user) {
          setAuthNotice(
            `Confirmation link sent to ${cleanEmail}. Check your inbox, then sign in here.`
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

  async function signInWithGooglePortal(portal: UserRole) {
    setAuthError(null);
    setAuthNotice(null);

    if (!supabase) {
      setAuthError(
        'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Settings > Secrets.'
      );
      return;
    }

    setSigningInPortal(portal);
    try {
      try {
        sessionStorage.setItem(PENDING_PORTAL_KEY, portal);
      } catch {
        // ignore
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { prompt: 'select_account' },
        },
      });

      if (error) {
        setAuthError(error.message);
        setSigningInPortal(null);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to start Google sign-in.');
      setSigningInPortal(null);
    }
  }

  async function signOutUser() {
    setAuthError(null);
    setAuthNotice(null);
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
    if (!supabase || !user) return;
    const { data: updated, error } = await supabase
      .from('profiles')
      .update({
        display_name: sanitizeStr(data.displayName || user.displayName || 'Student', 100),
        roll_number: sanitizeStr(data.rollNumber, 30),
        uhid: sanitizeStr(data.uhid, 40),
        hostel_or_dept: sanitizeStr(data.hostelOrDept, 80),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.uid)
      .select()
      .single<ProfileRow>();

    if (error) {
      setAuthError(error.message);
      return;
    }
    if (updated) {
      setProfile(mapProfileRow(updated));
    }
  }

  async function switchPortalRole(targetRole: UserRole, linkedDoctorId?: string) {
    if (!supabase || !user) return;
    if (targetRole === 'doctor' && !isVerifiedDoctor) {
      setPendingDoctorFlow(true);
      return;
    }

    const nextLinked =
      linkedDoctorId !== undefined
        ? sanitizeStr(linkedDoctorId, 64)
        : allowlistEntry?.assignedDoctorId || profile?.linkedDoctorId || 'aravind';

    const { data: updated, error } = await supabase
      .from('profiles')
      .update({
        role: targetRole,
        linked_doctor_id: targetRole === 'doctor' ? nextLinked : profile?.linkedDoctorId || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.uid)
      .select()
      .single<ProfileRow>();

    if (error) {
      setAuthError(error.message);
      return;
    }
    if (updated) {
      setProfile(mapProfileRow(updated));
    }
    setPendingDoctorFlow(false);
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
        profile,
        allowlistEntry,
        doctorRequest,
        isAdmin,
        isVerifiedDoctor,
        needsDoctorVerification,
        signInWithEmailPortal,
        signInWithGooglePortal,
        signOutUser,
        updateStudentProfile,
        switchPortalRole,
        submitDoctorVerificationRequest,
        clearAuthError: () => {
          setAuthError(null);
          setAuthNotice(null);
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

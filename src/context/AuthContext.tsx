import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
} from '../firebase';
import type {
  DoctorAccessRequest,
  DoctorAllowlistEntry,
  UserProfile,
  UserRole,
} from '../types/wellness';

interface AuthContextValue {
  firebaseUser: User | null;
  authReady: boolean;
  signingInPortal: UserRole | null;
  authError: string | null;
  profile: UserProfile | null;
  allowlistEntry: DoctorAllowlistEntry | null;
  doctorRequest: DoctorAccessRequest | null;
  isAdmin: boolean;
  isVerifiedDoctor: boolean;
  needsDoctorVerification: boolean;
  signInWithPortal: (portal: UserRole) => Promise<'signed-in' | 'needs-verification' | 'error'>;
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
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingInPortal, setSigningInPortal] = useState<UserRole | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allowlistEntry, setAllowlistEntry] = useState<DoctorAllowlistEntry | null>(null);
  const [doctorRequest, setDoctorRequest] = useState<DoctorAccessRequest | null>(null);
  const [pendingDoctorFlow, setPendingDoctorFlow] = useState(false);

  const isAdmin = Boolean(
    firebaseUser?.emailVerified && firebaseUser?.email === BOOTSTRAP_ADMIN_EMAIL
  );
  const isVerifiedDoctor = Boolean(isAdmin || allowlistEntry);
  const needsDoctorVerification = Boolean(
    firebaseUser && pendingDoctorFlow && !isVerifiedDoctor
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (!user) {
        setProfile(null);
        setAllowlistEntry(null);
        setDoctorRequest(null);
        setPendingDoctorFlow(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;

    const userPath = `users/${firebaseUser.uid}`;
    const unsubUser = onSnapshot(
      doc(db, 'users', firebaseUser.uid),
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        } else {
          setProfile(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, userPath);
      }
    );

    let unsubAllow = () => {};
    if (firebaseUser.email && firebaseUser.emailVerified) {
      const allowPath = `doctor_allowlist/${firebaseUser.email}`;
      unsubAllow = onSnapshot(
        doc(db, 'doctor_allowlist', firebaseUser.email),
        (snap) => {
          setAllowlistEntry(snap.exists() ? (snap.data() as DoctorAllowlistEntry) : null);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, allowPath);
        }
      );
    }

    const reqPath = `doctor_requests/${firebaseUser.uid}`;
    const unsubReq = onSnapshot(
      doc(db, 'doctor_requests', firebaseUser.uid),
      (snap) => {
        setDoctorRequest(snap.exists() ? (snap.data() as DoctorAccessRequest) : null);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, reqPath);
      }
    );

    return () => {
      unsubUser();
      unsubAllow();
      unsubReq();
    };
  }, [firebaseUser]);

  async function ensureUserDoc(user: User, requestedPortal: UserRole): Promise<'signed-in' | 'needs-verification'> {
    const userIsAdmin = Boolean(user.emailVerified && user.email === BOOTSTRAP_ADMIN_EMAIL);
    let allowDoc: DoctorAllowlistEntry | null = null;

    if (user.email && user.emailVerified) {
      const allowSnap = await getDoc(doc(db, 'doctor_allowlist', user.email)).catch((err) => {
        handleFirestoreError(err, OperationType.GET, `doctor_allowlist/${user.email}`);
      });
      if (allowSnap.exists()) {
        allowDoc = allowSnap.data() as DoctorAllowlistEntry;
      }
    }

    const canBeDoctor = userIsAdmin || Boolean(allowDoc);
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef).catch((err) => {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    });

    if (requestedPortal === 'doctor' && !canBeDoctor) {
      // Create base student profile if missing so user stays valid under Firestore rules
      if (!userSnap.exists()) {
        try {
          await setDoc(userRef, {
            uid: user.uid,
            displayName: sanitizeStr(user.displayName || user.email?.split('@')[0] || 'Practitioner', 100),
            email: sanitizeStr(user.email || '', 150),
            role: 'student',
            rollNumber: '',
            uhid: '',
            hostelOrDept: '',
            linkedDoctorId: '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
        }
      }
      setPendingDoctorFlow(true);
      return 'needs-verification';
    }

    setPendingDoctorFlow(false);
    const targetRole: UserRole = requestedPortal === 'doctor' && canBeDoctor ? 'doctor' : 'student';
    const assignedDocId =
      targetRole === 'doctor'
        ? allowDoc?.assignedDoctorId || (userSnap.exists() ? (userSnap.data() as UserProfile).linkedDoctorId : '') || 'aravind'
        : userSnap.exists()
          ? (userSnap.data() as UserProfile).linkedDoctorId || ''
          : '';

    if (!userSnap.exists()) {
      try {
        await setDoc(userRef, {
          uid: user.uid,
          displayName: sanitizeStr(user.displayName || user.email?.split('@')[0] || 'IITDH Member', 100),
          email: sanitizeStr(user.email || '', 150),
          role: targetRole,
          rollNumber: '',
          uhid: '',
          hostelOrDept: '',
          linkedDoctorId: sanitizeStr(assignedDocId, 64),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
      }
    } else {
      const existingData = userSnap.data() as UserProfile;
      if (existingData.role !== targetRole && (targetRole === 'student' || canBeDoctor)) {
        try {
          await updateDoc(userRef, {
            role: targetRole,
            linkedDoctorId: sanitizeStr(assignedDocId, 64),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
        }
      }
    }

    return 'signed-in';
  }

  async function signInWithPortal(portal: UserRole): Promise<'signed-in' | 'needs-verification' | 'error'> {
    setAuthError(null);
    setSigningInPortal(portal);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (!result.user.emailVerified) {
        setAuthError('Please use a Google account with a verified email address.');
        return 'error';
      }
      return await ensureUserDoc(result.user, portal);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unable to sign in with Google.';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError(msg);
      }
      return 'error';
    } finally {
      setSigningInPortal(null);
    }
  }

  async function signOutUser() {
    setAuthError(null);
    setPendingDoctorFlow(false);
    await signOut(auth);
  }

  async function updateStudentProfile(data: {
    displayName: string;
    rollNumber: string;
    uhid: string;
    hostelOrDept: string;
  }) {
    if (!firebaseUser) return;
    const userRef = doc(db, 'users', firebaseUser.uid);
    try {
      await updateDoc(userRef, {
        displayName: sanitizeStr(data.displayName || firebaseUser.displayName || 'Student', 100),
        rollNumber: sanitizeStr(data.rollNumber, 30),
        uhid: sanitizeStr(data.uhid, 40),
        hostelOrDept: sanitizeStr(data.hostelOrDept, 80),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
    }
  }

  async function switchPortalRole(targetRole: UserRole, linkedDoctorId?: string) {
    if (!firebaseUser) return;
    if (targetRole === 'doctor' && !isVerifiedDoctor) {
      setPendingDoctorFlow(true);
      return;
    }
    const nextLinked =
      linkedDoctorId !== undefined
        ? sanitizeStr(linkedDoctorId, 64)
        : allowlistEntry?.assignedDoctorId || profile?.linkedDoctorId || 'aravind';

    const userRef = doc(db, 'users', firebaseUser.uid);
    try {
      await updateDoc(userRef, {
        role: targetRole,
        linkedDoctorId: targetRole === 'doctor' ? nextLinked : profile?.linkedDoctorId || '',
        updatedAt: serverTimestamp(),
      });
      setPendingDoctorFlow(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
    }
  }

  async function submitDoctorVerificationRequest(data: {
    fullName: string;
    requestedDoctorId: string;
    credentials: string;
  }) {
    if (!firebaseUser || !firebaseUser.email) return;
    const reqRef = doc(db, 'doctor_requests', firebaseUser.uid);
    try {
      await setDoc(reqRef, {
        uid: firebaseUser.uid,
        email: sanitizeStr(firebaseUser.email, 150),
        fullName: sanitizeStr(data.fullName, 100),
        requestedDoctorId: sanitizeStr(data.requestedDoctorId, 64),
        credentials: sanitizeStr(data.credentials, 120),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `doctor_requests/${firebaseUser.uid}`);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        authReady,
        signingInPortal,
        authError,
        profile,
        allowlistEntry,
        doctorRequest,
        isAdmin,
        isVerifiedDoctor,
        needsDoctorVerification,
        signInWithPortal,
        signOutUser,
        updateStudentProfile,
        switchPortalRole,
        submitDoctorVerificationRequest,
        clearAuthError: () => setAuthError(null),
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

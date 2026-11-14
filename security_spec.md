# Firestore Security Specification — IIT Dharwad Wellness

## 1. Data Invariants
1. **Strict Ownership of User Profiles & Mood Logs**: A user's `users/{userId}` document and `users/{userId}/moods/{dateId}` entries can only be read or written by `userId == request.auth.uid` (with admin read/support on `users/{userId}`, and **zero** external access to `moods`).
2. **Prevent Self-Assigned Doctor Roles**: Standard users creating their own `users/{userId}` document may only assign `role: 'student'` unless their verified email exists in `doctor_allowlist/{email}` or they are the bootstrapped Wellness Admin (`cs26bt042@iitdh.ac.in`).
3. **Appointment Confidentiality & Lifecycle Integrity**:
   - Students may only create appointments with `studentUid == request.auth.uid`, `status == 'pending'`, and `doctorNotes == ''`.
   - Students may only cancel their own non-completed/non-cancelled appointments or edit `reason`/`date`/`time` while `'pending'`.
   - Doctors may only view/list appointments where `doctorEmail == request.auth.token.email` (or `isBootstrapAdmin()`), and may only update `status` and `doctorNotes` (cannot forge `studentUid`, `reason`, etc.).
   - Once an appointment reaches a terminal state (`'completed'` or `'cancelled'`), no non-admin updates are permitted.
4. **Live Doctor Duty Overrides**: `doctor_statuses/{doctorId}` is publicly readable (no PII) for live campus availability, and writable only by the verified doctor assigned to `doctorId` or the Wellness Admin.
5. **Strict Server Timestamps & Bounded Payloads**: All `createdAt`/`updatedAt` fields must equal `request.time`, all string lengths and ID patterns (`^[a-zA-Z0-9_\-]+$`) are strictly bounded, and `allow list` never uses `get()` or `exists()`.

## 2. The "Dirty Dozen" Attack Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Write**: Creating `/appointments/appt1` with `request.auth == null`.
2. **Unverified Email Spoofing**: Writing `/doctor_statuses/aravind` with `email_verified: false`.
3. **Role Escalation**: Non-allowlisted student creating `/users/{uid}` with `role: 'doctor'`.
4. **Role Mutation on Update**: Student updating `/users/{uid}` to change `role` from `'student'` to `'doctor'`.
5. **Shadow Field Injection**: Creating `/appointments/appt1` with an extra undeclared field `isApproved: true`.
6. **Identity Spoofing on Appointment**: Student A creating an appointment with `studentUid: 'studentB'`.
7. **Doctor Notes Tampering by Student**: Student updating their appointment's `doctorNotes` or setting `status: 'confirmed'`.
8. **Terminal State Bypass**: Doctor or student attempting to change `status` on an appointment whose existing `status == 'completed'`.
9. **Cross-Student Mood Spying**: Signed-in user B reading `/users/studentA/moods/2026-11-14`.
10. **Blanket Appointment Scraping**: Non-admin user running `list` on `/appointments` without matching `studentUid` or `doctorEmail`.
11. **ID Poisoning / Resource Exhaustion**: Writing `/users/{uid}/moods/` with a 1500-char ID or `note` > 500 chars.
12. **Client Timestamp Forgery**: Creating `/appointments/appt1` with `createdAt` set to a forged past timestamp instead of `request.time`.

## 3. Verification Matrix
All 12 payloads are blocked by `isSignedIn()`, `isEmailVerified()`, `isValidId()`, `isValid[Entity]()`, `hasAll`/`hasOnly`, `affectedKeys().hasOnly()`, terminal status locks, and `request.time` checks in `firestore.rules`.

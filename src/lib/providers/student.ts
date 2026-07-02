/**
 * StudentService — the SINGLE gateway to student academic data.
 *
 * Pages, components, and features NEVER directly call backend endpoints.
 * They always go through StudentService.
 *
 * The default implementation is HttpStudentService (talks to the BFF API
 * routes at /api/v1/login, /api/v1/refresh, /api/v1/profile, /api/v1/results,
 * /api/v1/cgpa). Cookies handle JWT transport automatically.
 *
 * If you need to swap implementations (e.g. for tests), use
 * `__setStudentService` from a setup file.
 */

import type {
  AuthSession,
  AttendanceRecord,
  CGPAResult,
  LoginCredentials,
  LoginResponse,
  SemesterResult,
  StudentProfile,
} from "@/lib/types";
import { HttpStudentService } from "@/lib/providers/student-http";

export interface StudentService {
  /** Restore session on app boot. Returns true if session is usable. */
  initialize(): Promise<boolean>;

  /** Login using KTU credentials. Stores tokens, returns minimal student. */
  login(credentials: LoginCredentials): Promise<LoginResponse>;

  /** Logout everywhere — clear local session + notify backend. */
  logout(): Promise<void>;

  /** Check current session validity. */
  isAuthenticated(): boolean;

  /** Refresh the access token using the refresh token. */
  refreshSession(): Promise<boolean>;

  /** Get the latest student profile (from cache or backend). */
  getProfile(): Promise<StudentProfile>;

  /** Get semester results. */
  getResults(): Promise<SemesterResult[]>;

  /** Get CGPA summary. */
  getCGPA(): Promise<CGPAResult>;

  /** Get attendance per subject. */
  getAttendance(): Promise<AttendanceRecord[]>;

  /** Re-sync all cached academic data. Returns last-sync timestamp. */
  sync(): Promise<number>;

  /** Clear all cached academic data (used on logout or manual refresh). */
  clearCache(): Promise<void>;

  /** Subscribe to auth state changes. Returns unsubscribe fn. */
  onAuthChange(listener: (session: AuthSession | null) => void): () => void;
}

let _instance: StudentService | null = null;

export function getStudentService(): StudentService {
  if (!_instance) _instance = new HttpStudentService();
  return _instance;
}

export function __setStudentService(s: StudentService) {
  _instance = s;
}

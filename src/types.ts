/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Student {
  id: string; // Unique student identifier (ID number or UUID)
  name: string; // Khmer Name
  gender: 'M' | 'F'; // 'M' for male (ប្រុស), 'F' for female (ស្រី)
  dob: string; // Date of Birth (YYYY-MM-DD or Khmer format)
  classId: string; // Class name (e.g. B10, B11, ... B30)
  photo?: string; // Profile Photo (Base64 data url)
  qrStatus?: boolean; // Whether they have been issued or scanned personal QR codes
}

export interface AttendanceSession {
  id: string; // Unique session ID
  classId: string; // Target Class (e.g. B10)
  date: string; // Session Date (YYYY-MM-DD)
  timeSlot: string; // e.g., "08:00 - 09:30" or "02:00 - 03:30"
  subject?: string; // Optional Subject title
  createdAt: string; // ISO string
}

export interface AttendanceRecord {
  id: string; // Unique record ID
  sessionId: string; // Reference to AttendanceSession
  studentId: string; // Reference to Student
  studentName: string; // Frozen at time of attendance check
  gender: 'M' | 'F';
  dob: string;
  classId: string;
  timestamp: string; // Time of scanning/check-in
  photo?: string; // Check-in verified selfie (Base64 data url)
  status: 'Present' | 'Late' | 'Absent'; // វត្តមាន, យឺត, អវត្តមាន
}

export interface TeacherSettings {
  teacherPin: string; // Simple lock code, defaults to "1234"
}

// Global state container
export interface DBState {
  students: Student[];
  sessions: AttendanceSession[];
  records: AttendanceRecord[];
  settings: TeacherSettings;
}

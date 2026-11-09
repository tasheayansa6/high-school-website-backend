/**
 * Student portal types — aligned with `backend/src/services/studentPortal.service.js`
 * and `backend/src/utils/smsSerializers.js`. Password hashes are never returned.
 * No attendance / assignment / exam / fee types exist: the backend has no such modules.
 */

export interface StudentUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  studentCode: string;
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  /** Portal identity — always `student`. */
  actor: 'student';
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors backend `studentLoginBodySchema`: exactly one of `email` / `studentCode`. */
export type StudentLoginCredentials =
  | { email: string; studentCode?: undefined; password: string }
  | { studentCode: string; email?: undefined; password: string };

export interface StudentLoginResult {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  student: StudentUser;
}

export interface StudentMeResult {
  student: StudentUser;
}

export interface StudentAcademicYearRef {
  id: number;
  name: string;
  code: string;
  isCurrent: boolean;
}

export interface StudentGradeLevelRef {
  id: number;
  name: string;
  code: string;
  sortOrder: number;
}

export interface StudentSectionRef {
  id: number;
  name: string;
  code: string;
}

export interface StudentTeacherRef {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface StudentClassSummary {
  id: number;
  name: string;
  academicYear: StudentAcademicYearRef;
  gradeLevel: StudentGradeLevelRef;
  section: StudentSectionRef;
}

export interface StudentTermRef {
  id: number;
  name: string;
}

export interface StudentSummaryCounts {
  activeEnrollments: number;
  classOfferings: number;
  subjects: number;
  teachers: number;
}

export interface StudentEnrollmentItem {
  id: number;
  status: string;
  enrolledAt: string;
  classOffering: StudentClassSummary & { homeroomTeacher: StudentTeacherRef | null };
}

export interface StudentSubjectTeacher {
  assignmentId: number;
  isPrimary: boolean;
  academicTerm: StudentTermRef | null;
  classOffering: { id: number; name: string };
  teacher: StudentTeacherRef | null;
}

export interface StudentSubjectItem {
  id: number;
  name: string;
  code: string;
  description: string | null;
  teachers: StudentSubjectTeacher[];
}

export interface StudentDashboardOverview {
  student: StudentUser;
  counts: StudentSummaryCounts;
  enrollments: StudentEnrollmentItem[];
  subjects: StudentSubjectItem[];
}

export interface StudentProfileData {
  student: StudentUser;
  summary: StudentSummaryCounts;
  enrollments: StudentEnrollmentItem[];
}

export interface StudentClassListItem extends StudentClassSummary {
  homeroomTeacher: StudentTeacherRef | null;
  enrollmentId: number;
  enrolledAt: string;
  subjectCount: number;
}

export interface StudentClassList {
  items: StudentClassListItem[];
  total: number;
}

export interface StudentSubjectList {
  items: StudentSubjectItem[];
  total: number;
}

export interface StudentEnrollmentData {
  items: StudentEnrollmentItem[];
  total: number;
  current: StudentEnrollmentItem | null;
}

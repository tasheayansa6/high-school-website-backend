/**
 * Teacher portal types — aligned with `backend/src/services/teacherPortal.service.js`
 * and `backend/src/utils/smsSerializers.js`. Password hashes are never returned.
 */

import type { PaginationMeta } from '@/services/api/apiTypes';

export interface TeacherUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  employeeCode: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  /** Portal identity — always `teacher`. */
  actor: 'teacher';
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherLoginCredentials {
  email: string;
  password: string;
}

export interface TeacherLoginResult {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  teacher: TeacherUser;
}

export interface TeacherMeResult {
  teacher: TeacherUser;
}

export interface TeacherAcademicYearRef {
  id: number;
  name: string;
  code: string;
  isCurrent: boolean;
}

export interface TeacherGradeLevelRef {
  id: number;
  name: string;
  code: string;
  sortOrder: number;
}

export interface TeacherSectionRef {
  id: number;
  name: string;
  code: string;
}

export interface TeacherClassSummary {
  id: number;
  name: string;
  academicYear: TeacherAcademicYearRef;
  gradeLevel: TeacherGradeLevelRef;
  section: TeacherSectionRef;
}

export interface TeacherSubjectRef {
  id: number;
  name: string;
  code: string;
  description: string | null;
}

export interface TeacherTermRef {
  id: number;
  name: string;
}

export interface TeacherSummaryCounts {
  classOfferings: number;
  subjects: number;
  students: number;
  teachingAssignments: number;
}

export interface TeacherRecentAssignment {
  id: number;
  isPrimary: boolean;
  academicTerm: TeacherTermRef | null;
  createdAt: string;
  classOffering: TeacherClassSummary;
  subject: TeacherSubjectRef;
}

export interface TeacherDashboardOverview {
  teacher: TeacherUser;
  counts: TeacherSummaryCounts;
  recentAssignments: TeacherRecentAssignment[];
}

export interface TeacherProfileData {
  teacher: TeacherUser;
  summary: TeacherSummaryCounts;
}

export interface TeacherClassListItem extends TeacherClassSummary {
  enrollmentCount: number;
  subjects: TeacherSubjectRef[];
}

export interface TeacherClassList {
  items: TeacherClassListItem[];
  total: number;
}

export interface TeacherClassStudent {
  id: number;
  firstName: string;
  lastName: string;
  studentCode: string;
  email: string;
  isActive: boolean;
  enrollmentId: number;
  enrolledAt: string;
}

export interface TeacherClassSubject extends TeacherSubjectRef {
  assignmentId: number;
  isPrimary: boolean;
  academicTerm: TeacherTermRef | null;
}

export interface TeacherClassDetail {
  classOffering: TeacherClassSummary & {
    homeroomTeacher: {
      id: number;
      firstName: string;
      lastName: string;
      employeeCode: string | null;
    } | null;
    enrollmentCount: number;
  };
  subjects: TeacherClassSubject[];
  students: TeacherClassStudent[];
}

export interface TeacherSubjectListItem extends TeacherSubjectRef {
  classOfferings: TeacherClassSummary[];
}

export interface TeacherSubjectList {
  items: TeacherSubjectListItem[];
  total: number;
}

export interface TeacherStudentListItem {
  id: number;
  firstName: string;
  lastName: string;
  studentCode: string;
  email: string;
  isActive: boolean;
  classOfferings: TeacherClassSummary[];
}

export interface TeacherStudentList {
  items: TeacherStudentListItem[];
  pagination: PaginationMeta;
}

export interface TeacherStudentListQuery {
  page?: number;
  limit?: number;
  q?: string;
  classOfferingId?: number;
}

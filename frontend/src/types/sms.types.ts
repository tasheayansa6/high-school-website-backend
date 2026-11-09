/**
 * School Management System (admin) types.
 * Aligned with `backend/src/services/sms/*` and `backend/src/utils/smsSerializers.js`.
 * Password hashes are never returned by the API and are not modelled here.
 */

import type { PaginatedList } from '@/services/api/apiTypes';

export type SmsPaginatedResult<T> = PaginatedList<T>;

export type SortOrder = 'asc' | 'desc';

// --- Teachers ---------------------------------------------------------------

export interface SmsTeacher {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  employeeCode: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TeacherSortBy = 'createdAt' | 'lastName' | 'firstName' | 'email';

export interface TeacherListQuery {
  page?: number;
  limit?: number;
  q?: string;
  includeDeleted?: boolean;
  isActive?: boolean;
  sortBy?: TeacherSortBy;
  sortOrder?: SortOrder;
}

export interface CreateTeacherBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  employeeCode?: string | null;
  phone?: string | null;
  isActive?: boolean;
}

export interface UpdateTeacherBody {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  employeeCode?: string | null;
  phone?: string | null;
}

/** Nested teacher reference used by class offerings and teaching assignments. */
export interface SmsTeacherRef {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  employeeCode: string | null;
}

// --- Students ---------------------------------------------------------------

export interface SmsStudent {
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
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type StudentSortBy = TeacherSortBy | 'studentCode';

export interface StudentListQuery {
  page?: number;
  limit?: number;
  q?: string;
  includeDeleted?: boolean;
  isActive?: boolean;
  sortBy?: StudentSortBy;
  sortOrder?: SortOrder;
}

export interface CreateStudentBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  studentCode: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  phone?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  isActive?: boolean;
}

export interface UpdateStudentBody {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  studentCode?: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  phone?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
}

/** Nested student reference used by enrollments. */
export interface SmsStudentRef {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  studentCode: string;
}

// --- Academic years and terms ----------------------------------------------

export interface SmsAcademicTerm {
  id: number;
  academicYearId: number;
  name: string;
  sequence: number;
  startsOn: string;
  endsOn: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SmsAcademicYear {
  id: number;
  name: string;
  code: string;
  startsOn: string;
  endsOn: string;
  isCurrent: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Present on the detail endpoint only. */
  terms?: SmsAcademicTerm[];
}

export interface AcademicYearListQuery {
  page?: number;
  limit?: number;
  q?: string;
  includeDeleted?: boolean;
  isCurrent?: boolean;
}

export interface CreateAcademicYearBody {
  name: string;
  code: string;
  startsOn: string;
  endsOn: string;
  isCurrent?: boolean;
}

export interface UpdateAcademicYearBody {
  name?: string;
  code?: string;
  startsOn?: string;
  endsOn?: string;
}

export interface CreateAcademicTermBody {
  name: string;
  sequence: number;
  startsOn: string;
  endsOn: string;
}

export type UpdateAcademicTermBody = Partial<CreateAcademicTermBody>;

// --- Catalogs ---------------------------------------------------------------

export interface CatalogListQuery {
  page?: number;
  limit?: number;
  q?: string;
  includeDeleted?: boolean;
}

export interface SmsGradeLevel {
  id: number;
  name: string;
  code: string;
  sortOrder: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGradeLevelBody {
  name: string;
  code: string;
  sortOrder?: number;
}

export type UpdateGradeLevelBody = Partial<CreateGradeLevelBody>;

export interface SmsSection {
  id: number;
  name: string;
  code: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSectionBody {
  name: string;
  code: string;
}

export type UpdateSectionBody = Partial<CreateSectionBody>;

export interface SmsSubject {
  id: number;
  name: string;
  code: string;
  description: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubjectBody {
  name: string;
  code: string;
  description?: string | null;
}

export type UpdateSubjectBody = Partial<CreateSubjectBody>;

// --- Class offerings --------------------------------------------------------

export interface SmsClassOffering {
  id: number;
  name: string;
  academicYearId: number;
  gradeLevelId: number;
  sectionId: number;
  homeroomTeacherId: number | null;
  academicYear?: { id: number; name: string; code: string; isCurrent: boolean };
  gradeLevel?: { id: number; name: string; code: string; sortOrder: number };
  section?: { id: number; name: string; code: string };
  homeroomTeacher: SmsTeacherRef | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClassOfferingListQuery {
  page?: number;
  limit?: number;
  q?: string;
  includeDeleted?: boolean;
  academicYearId?: number;
  gradeLevelId?: number;
  sectionId?: number;
  homeroomTeacherId?: number;
}

export interface CreateClassOfferingBody {
  academicYearId: number;
  gradeLevelId: number;
  sectionId: number;
  name?: string;
  homeroomTeacherId?: number | null;
}

export interface UpdateClassOfferingBody {
  name?: string;
  homeroomTeacherId?: number | null;
}

// --- Teaching assignments ---------------------------------------------------

export interface SmsTeachingAssignment {
  id: number;
  teacherId: number;
  classOfferingId: number;
  subjectId: number;
  academicTermId: number | null;
  termScopeKey: string;
  isPrimary: boolean;
  teacher?: SmsTeacherRef | null;
  subject?: { id: number; name: string; code: string };
  classOffering?: {
    id: number;
    name: string;
    academicYearId: number;
    gradeLevelId: number;
    sectionId: number;
  };
  academicTerm: { id: number; name: string; sequence: number; academicYearId: number } | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeachingAssignmentListQuery {
  page?: number;
  limit?: number;
  includeDeleted?: boolean;
  teacherId?: number;
  classOfferingId?: number;
  subjectId?: number;
  academicTermId?: number;
}

export interface CreateTeachingAssignmentBody {
  teacherId: number;
  classOfferingId: number;
  subjectId: number;
  academicTermId?: number | null;
  isPrimary?: boolean;
}

// --- Enrollments ------------------------------------------------------------

export const ENROLLMENT_STATUSES = ['ACTIVE', 'TRANSFERRED', 'WITHDRAWN', 'COMPLETED'] as const;

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export interface SmsEnrollment {
  id: number;
  studentId: number;
  classOfferingId: number;
  academicYearId: number;
  status: EnrollmentStatus;
  enrolledAt: string;
  leftAt: string | null;
  student?: SmsStudentRef | null;
  classOffering?: {
    id: number;
    name: string;
    academicYearId: number;
    gradeLevelId: number;
    sectionId: number;
  };
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentListQuery {
  page?: number;
  limit?: number;
  includeDeleted?: boolean;
  studentId?: number;
  classOfferingId?: number;
  academicYearId?: number;
  status?: EnrollmentStatus;
}

export interface CreateEnrollmentBody {
  studentId: number;
  classOfferingId: number;
  academicYearId: number;
  status?: EnrollmentStatus;
  enrolledAt?: string;
}

export interface UpdateEnrollmentStatusBody {
  status: EnrollmentStatus;
  leftAt?: string | null;
}

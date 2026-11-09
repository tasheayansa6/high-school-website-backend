/**
 * SMS operations types (attendance, assignments, examinations, fees, announcements, reports).
 * Aligned with `backend/src/services/sms/{attendance,assignment,examination,fee,announcement,report}.service.js`.
 */

import type { PaginatedList } from '@/services/api/apiTypes';

export type OpsPaginated<T> = PaginatedList<T>;

export interface OpsStudentRef {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  studentCode: string;
}

export interface OpsClassRef {
  id: number;
  name: string;
  academicYearId: number;
  gradeLevelId: number;
  sectionId: number;
}

export interface OpsSubjectRef {
  id: number;
  name: string;
  code: string;
}

// --- Attendance --------------------------------------------------------------

export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export interface AttendanceRecord {
  id: number;
  studentId: number;
  classOfferingId: number;
  attendanceDate: string;
  status: AttendanceStatus;
  notes: string | null;
  recordedById: number | null;
  student?: OpsStudentRef;
  classOffering?: OpsClassRef;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceListQuery {
  page?: number;
  limit?: number;
  studentId?: number;
  classOfferingId?: number;
  status?: AttendanceStatus;
  date?: string;
  from?: string;
  to?: string;
}

export interface BulkAttendanceRecordInput {
  studentId: number;
  status: AttendanceStatus;
  notes?: string | null;
}

export interface BulkAttendanceBody {
  classOfferingId: number;
  attendanceDate: string;
  records: BulkAttendanceRecordInput[];
}

export interface BulkAttendanceResult {
  classOfferingId: number;
  attendanceDate: string;
  total: number;
  items: AttendanceRecord[];
}

// --- Assignments -------------------------------------------------------------

export interface AssignmentTeacherRef {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export const SUBMISSION_STATUSES = ['SUBMITTED', 'GRADED', 'RETURNED', 'LATE'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export interface AssignmentSubmission {
  id: number;
  assignmentId: number;
  studentId: number;
  content: string;
  status: SubmissionStatus;
  score: number | null;
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
  gradedById: number | null;
  student?: OpsStudentRef;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: number;
  title: string;
  description: string | null;
  classOfferingId: number;
  subjectId: number;
  teacherId: number;
  dueAt: string | null;
  maxScore: number;
  isPublished: boolean;
  classOffering?: OpsClassRef;
  subject?: OpsSubjectRef;
  teacher?: AssignmentTeacherRef;
  /** Present on student-portal lists: the student's own submission, if any. */
  submission?: AssignmentSubmission | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentListQuery {
  page?: number;
  limit?: number;
  q?: string;
  classOfferingId?: number;
  subjectId?: number;
  teacherId?: number;
  isPublished?: boolean;
}

export interface CreateAssignmentBody {
  title: string;
  description?: string | null;
  classOfferingId: number;
  subjectId: number;
  /** Required for admin create; teacher portal derives it from the token. */
  teacherId?: number;
  dueAt?: string | null;
  maxScore?: number;
  isPublished?: boolean;
}

export interface UpdateAssignmentBody {
  title?: string;
  description?: string | null;
  dueAt?: string | null;
  maxScore?: number;
  isPublished?: boolean;
}

export interface SubmissionListQuery {
  page?: number;
  limit?: number;
  status?: SubmissionStatus;
}

export interface SubmissionList extends OpsPaginated<AssignmentSubmission> {
  assignment: Assignment;
}

export interface GradeSubmissionBody {
  score: number;
  feedback?: string | null;
  status?: 'GRADED' | 'RETURNED';
}

export interface StudentAssignmentListQuery {
  page?: number;
  limit?: number;
  classOfferingId?: number;
  subjectId?: number;
}

// --- Examinations ------------------------------------------------------------

export interface Examination {
  id: number;
  name: string;
  examType: string;
  classOfferingId: number;
  subjectId: number;
  academicYearId: number;
  academicTermId: number | null;
  examDate: string | null;
  maxScore: number;
  categoryId?: number | null;
  weight?: number;
  marksStatus?: 'DRAFT' | 'SUBMITTED';
  submittedAt?: string | null;
  isPublished: boolean;
  classOffering?: OpsClassRef;
  subject?: OpsSubjectRef;
  academicTerm?: { id: number; name: string };
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExaminationListQuery {
  page?: number;
  limit?: number;
  q?: string;
  classOfferingId?: number;
  subjectId?: number;
  academicYearId?: number;
  academicTermId?: number;
  examType?: string;
  isPublished?: boolean;
}

export interface CreateExaminationBody {
  name: string;
  examType?: string;
  classOfferingId: number;
  subjectId: number;
  academicYearId: number;
  academicTermId?: number | null;
  examDate?: string | null;
  maxScore?: number;
}

export interface UpdateExaminationBody {
  name?: string;
  examType?: string;
  academicTermId?: number | null;
  examDate?: string | null;
  maxScore?: number;
}

export interface ExamResult {
  id: number;
  examId: number;
  studentId: number;
  score: number;
  gradeLetter: string | null;
  remarks: string | null;
  enteredById: number | null;
  student?: OpsStudentRef;
  exam?: {
    id: number;
    name: string;
    examType: string;
    examDate: string | null;
    maxScore: number;
    subject?: OpsSubjectRef;
    classOffering?: OpsClassRef;
  };
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExamResultList extends OpsPaginated<ExamResult> {
  examination: Examination;
}

export interface UpsertExamResultInput {
  studentId: number;
  score: number;
  gradeLetter?: string | null;
  remarks?: string | null;
}

export interface UpsertExamResultsBody {
  results: UpsertExamResultInput[];
}

export interface UpsertExamResultsResult {
  examination: Examination;
  total: number;
  items: ExamResult[];
}

export interface StudentExamResultsQuery {
  page?: number;
  limit?: number;
  academicYearId?: number;
  subjectId?: number;
}

// --- Fees --------------------------------------------------------------------

export const FEE_PAYMENT_STATUSES = ['UNPAID', 'PARTIAL', 'PAID', 'WAIVED'] as const;
export type FeePaymentStatus = (typeof FEE_PAYMENT_STATUSES)[number];

export interface FeeStructure {
  id: number;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeeStructureListQuery {
  page?: number;
  limit?: number;
  q?: string;
  isActive?: boolean;
}

export interface CreateFeeStructureBody {
  name: string;
  description?: string | null;
  amount: number;
  currency?: string;
  isActive?: boolean;
}

export type UpdateFeeStructureBody = Partial<CreateFeeStructureBody>;

export interface FeePayment {
  id: number;
  studentFeeId: number;
  amount: number;
  paymentMethod: string | null;
  reference: string | null;
  paidAt: string;
  recordedById: number | null;
  notes: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentFee {
  id: number;
  studentId: number;
  feeStructureId: number;
  academicYearId: number;
  academicTermId: number | null;
  amountDue: number;
  amountPaid: number;
  balance: number;
  status: FeePaymentStatus;
  dueDate: string | null;
  notes: string | null;
  student?: OpsStudentRef;
  feeStructure?: { id: number; name: string; currency: string; amount: number };
  academicYear?: { id: number; name: string; code: string };
  academicTerm?: { id: number; name: string };
  payments?: FeePayment[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentFeeListQuery {
  page?: number;
  limit?: number;
  studentId?: number;
  feeStructureId?: number;
  academicYearId?: number;
  academicTermId?: number;
  status?: FeePaymentStatus;
}

export interface AssignStudentFeeBody {
  studentId: number;
  feeStructureId: number;
  academicYearId: number;
  academicTermId?: number | null;
  amountDue?: number;
  dueDate?: string | null;
  notes?: string | null;
}

export interface UpdateStudentFeeBody {
  amountDue?: number;
  dueDate?: string | null;
  notes?: string | null;
  waived?: boolean;
}

export interface RecordPaymentBody {
  amount: number;
  paymentMethod?: string | null;
  reference?: string | null;
  paidAt?: string;
  notes?: string | null;
}

export interface PaymentList {
  studentFee: StudentFee;
  items: FeePayment[];
}

export interface RecordPaymentResult {
  payment: FeePayment;
  studentFee: StudentFee;
}

export interface StudentOwnFeesQuery {
  page?: number;
  limit?: number;
  academicYearId?: number;
  status?: FeePaymentStatus;
}

// --- Announcements -----------------------------------------------------------

export const ANNOUNCEMENT_AUDIENCES = ['ALL', 'TEACHERS', 'STUDENTS', 'CLASS'] as const;
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];

export interface Announcement {
  id: number;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  classOfferingId: number | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdById?: number | null;
  classOffering?: OpsClassRef;
  createdBy?: { id: number; firstName: string; lastName: string };
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementListQuery {
  page?: number;
  limit?: number;
  q?: string;
  audience?: AnnouncementAudience;
  classOfferingId?: number;
  isPublished?: boolean;
}

export interface CreateAnnouncementBody {
  title: string;
  body: string;
  audience?: AnnouncementAudience;
  classOfferingId?: number | null;
  isPublished?: boolean;
}

export interface UpdateAnnouncementBody {
  title?: string;
  body?: string;
  audience?: AnnouncementAudience;
  classOfferingId?: number | null;
}

export interface StudentAnnouncementsQuery {
  page?: number;
  limit?: number;
}

// --- Reports -----------------------------------------------------------------

export interface ReportOverviewQuery {
  academicYearId?: number;
  classOfferingId?: number;
  from?: string;
  to?: string;
}

export interface ReportFeeBucket {
  count: number;
  amountDue: number;
  amountPaid: number;
}

export interface ReportExamItem {
  examId: number;
  name: string;
  examType: string;
  isPublished: boolean;
  subject: { id: number; name: string } | null;
  classOffering: { id: number; name: string } | null;
  maxScore: number | null;
  resultCount: number;
  averageScore: number | null;
  averagePercent: number | null;
  minScore: number | null;
  maxRecordedScore: number | null;
}

export interface ReportOverview {
  filters: {
    academicYearId: number | null;
    classOfferingId: number | null;
    from: string | null;
    to: string | null;
  };
  attendance: {
    total: number;
    byStatus: Record<AttendanceStatus, number>;
    attendanceRate: number | null;
  };
  fees: {
    count: number;
    byStatus: Record<FeePaymentStatus, ReportFeeBucket>;
    totalDue: number | null;
    totalPaid: number | null;
    totalOutstanding: number | null;
  };
  exams: {
    examCount: number;
    overallAveragePercent: number | null;
    items: ReportExamItem[];
  };
  enrollments: {
    total: number;
    byStatus: Record<'ACTIVE' | 'TRANSFERRED' | 'WITHDRAWN' | 'COMPLETED', number>;
    activeByClassOffering: {
      classOfferingId: number;
      name: string | null;
      activeStudents: number;
    }[];
  };
}

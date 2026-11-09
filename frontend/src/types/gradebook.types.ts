import type { OpsClassRef, OpsStudentRef, OpsSubjectRef } from '@/types/ops.types';

export type ExamMarksStatus = 'DRAFT' | 'SUBMITTED';
export type GradeWeightMode = 'RELATIVE' | 'PERCENT';

export interface GradeBoundary {
  id?: number;
  letter: string;
  minPercent: number;
  maxPercent: number;
  remark?: string | null;
  sortOrder?: number;
}

export interface GradingScale {
  id: number;
  name: string;
  description: string | null;
  isDefault: boolean;
  weightMode: GradeWeightMode;
  treatMissingAsZero: boolean;
  decimalPlaces: number;
  boundaries: GradeBoundary[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentCategory {
  id: number;
  code: string;
  name: string;
  description: string | null;
  defaultWeight: number;
  sortOrder: number;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GradebookOverviewItem {
  classOfferingId: number;
  subjectId: number;
  academicYearId: number;
  academicTermId: number | null;
  assessmentCount: number;
  draftCount: number;
  submittedCount: number;
  publishedCount: number;
  classOffering?: OpsClassRef & {
    gradeLevel?: { id: number; name: string; code: string };
    section?: { id: number; name: string; code: string };
  };
  subject?: OpsSubjectRef;
}

export interface GradebookAssessment {
  id: number;
  name: string;
  examType: string;
  examDate: string | null;
  maxScore: number;
  weight: number;
  marksStatus: ExamMarksStatus;
  isPublished: boolean;
  categoryId: number | null;
  category: AssessmentCategory | null;
  submittedAt: string | null;
}

export interface GradebookStudentRow {
  studentId: number;
  student?: OpsStudentRef;
  marks: {
    assessmentId: number;
    score: number | null;
    gradeLetter: string | null;
    remarks: string | null;
    resultId: number | null;
    missing: boolean;
  }[];
  totalPercent: number | null;
  gradeLetter: string | null;
  gradeRemark: string | null;
  scoredCount: number;
  missingCount: number;
  complete: boolean;
}

export interface ClassSubjectGradebook {
  classOffering: {
    id: number;
    name: string;
    academicYearId: number;
    gradeLevel?: { id: number; name: string; code: string };
    section?: { id: number; name: string; code: string };
  };
  subject: OpsSubjectRef | null;
  academicYearId: number;
  academicTermId: number | null;
  gradingScale: GradingScale | null;
  weightValidation: { valid: boolean; message: string | null; sum: number };
  assessments: GradebookAssessment[];
  students: GradebookStudentRow[];
  summary: {
    studentCount: number;
    assessmentCount: number;
    classAveragePercent: number | null;
    missingMarksCount: number;
    submittedAssessmentCount: number;
    publishedAssessmentCount: number;
  };
}

export interface PendingSubmission {
  id: number;
  name: string;
  examType: string;
  maxScore: number;
  weight: number;
  marksStatus: ExamMarksStatus;
  isPublished: boolean;
  submittedAt: string | null;
  classOffering?: OpsClassRef;
  subject?: OpsSubjectRef;
  category: AssessmentCategory | null;
  submittedBy?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    employeeCode: string | null;
  } | null;
  resultCount: number;
}

export interface TeacherGradebookListItem {
  classOfferingId: number;
  subjectId: number;
  academicYearId: number;
  classOffering: OpsClassRef & {
    gradeLevel?: { id: number; name: string; code: string };
    section?: { id: number; name: string; code: string };
  };
  subject: OpsSubjectRef;
  assessmentCount: number;
  draftCount: number;
  submittedCount: number;
  publishedCount: number;
}

export interface StudentGradebookSummary {
  gradingScale: GradingScale | null;
  subjects: {
    subject: OpsSubjectRef;
    classOffering: OpsClassRef;
    academicYearId: number;
    academicTermId: number | null;
    academicTerm?: { id: number; name: string } | null;
    assessments: {
      id: number;
      name: string;
      examType: string;
      examDate: string | null;
      maxScore: number;
      weight: number;
      category: AssessmentCategory | null;
      score: number;
      gradeLetter: string | null;
      remarks: string | null;
    }[];
    totalPercent: number | null;
    gradeLetter: string | null;
    gradeRemark: string | null;
    scoredCount: number;
    missingCount: number;
  }[];
  summary: {
    subjectCount: number;
    assessmentCount: number;
    overallAveragePercent: number | null;
    overallGradeLetter: string | null;
    overallGradeRemark: string | null;
  };
}

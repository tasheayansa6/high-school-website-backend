import type { OpsPaginated } from '@/types/ops.types';

export const LEARNING_MATERIAL_CATEGORIES = [
  'NOTES',
  'HANDOUT',
  'SLIDES',
  'WORKSHEET',
  'ASSIGNMENT_RESOURCE',
  'OTHER',
] as const;

export type LearningMaterialCategory = (typeof LEARNING_MATERIAL_CATEGORIES)[number];

export const LEARNING_MATERIAL_CATEGORY_LABELS: Record<LearningMaterialCategory, string> = {
  NOTES: 'Notes',
  HANDOUT: 'Handout',
  SLIDES: 'Slides',
  WORKSHEET: 'Worksheet',
  ASSIGNMENT_RESOURCE: 'Assignment resource',
  OTHER: 'Other',
};

export interface LearningMaterial {
  id: number;
  title: string;
  description: string | null;
  category: LearningMaterialCategory;
  academicYearId: number;
  academicTermId: number | null;
  classOfferingId: number;
  subjectId: number;
  teacherId: number;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  isPublished: boolean;
  publishedAt: string | null;
  archivedAt: string | null;
  archivedById: number | null;
  createdAt?: string;
  updatedAt?: string;
  academicYear?: { id: number; name: string; code: string; isCurrent?: boolean };
  academicTerm?: { id: number; name: string; sequence: number } | null;
  classOffering?: {
    id: number;
    name: string;
    gradeLevel?: { id: number; name: string; code: string };
    section?: { id: number; name: string; code: string };
  };
  subject?: { id: number; name: string; code: string };
  teacher?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    employeeCode?: string | null;
  };
}

export type LearningMaterialList = OpsPaginated<LearningMaterial>;

export interface LearningMaterialListQuery {
  page?: number;
  limit?: number;
  q?: string;
  academicYearId?: number;
  academicTermId?: number;
  classOfferingId?: number;
  subjectId?: number;
  teacherId?: number;
  category?: LearningMaterialCategory;
  isPublished?: boolean;
  includeArchived?: boolean;
}

export interface LearningMaterialStats {
  total: number;
  published: number;
  draft: number;
  archived: number;
  totalFileBytes: number;
}

export interface CreateLearningMaterialFields {
  title: string;
  description?: string | null;
  category?: LearningMaterialCategory;
  academicYearId: number;
  academicTermId?: number | null;
  classOfferingId: number;
  subjectId: number;
  publish?: boolean;
}

export interface UpdateLearningMaterialBody {
  title?: string;
  description?: string | null;
  category?: LearningMaterialCategory;
  academicTermId?: number | null;
}

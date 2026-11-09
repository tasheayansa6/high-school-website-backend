import type { OpsPaginated } from '@/types/ops.types';

export const WEEKDAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
};

export interface Classroom {
  id: number;
  name: string;
  code: string;
  capacity: number | null;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TimetableEntry {
  id: number;
  timetableId: number;
  dayOfWeek: Weekday;
  startTime: string;
  endTime: string;
  subjectId: number;
  teacherId: number;
  classroomId: number | null;
  isActive: boolean;
  notes: string | null;
  subject?: { id: number; name: string; code: string };
  teacher?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    employeeCode?: string | null;
  };
  classroom?: Classroom | null;
  timetable?: {
    id: number;
    title?: string | null;
    isPublished?: boolean;
    classOffering?: {
      id: number;
      name: string;
      gradeLevel?: { id: number; name: string; code: string };
      section?: { id: number; name: string; code: string };
    };
    academicYear?: { id: number; name: string; code: string };
    academicTerm?: { id: number; name: string; sequence: number } | null;
  };
}

export interface Timetable {
  id: number;
  academicYearId: number;
  academicTermId: number | null;
  termScopeKey: string;
  classOfferingId: number;
  title: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdById: number;
  academicYear?: { id: number; name: string; code: string; isCurrent?: boolean };
  academicTerm?: { id: number; name: string; sequence: number } | null;
  classOffering?: {
    id: number;
    name: string;
    gradeLevel?: { id: number; name: string; code: string };
    section?: { id: number; name: string; code: string };
  };
  entries?: TimetableEntry[];
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TimetableListQuery {
  page?: number;
  limit?: number;
  academicYearId?: number;
  academicTermId?: number;
  classOfferingId?: number;
  teacherId?: number;
  subjectId?: number;
  dayOfWeek?: Weekday;
  isPublished?: boolean;
}

export interface CreateTimetableBody {
  academicYearId: number;
  academicTermId?: number | null;
  classOfferingId: number;
  title?: string | null;
}

export interface CreateTimetableEntryBody {
  dayOfWeek: Weekday;
  startTime: string;
  endTime: string;
  subjectId: number;
  teacherId: number;
  classroomId?: number | null;
  isActive?: boolean;
  notes?: string | null;
}

export type UpdateTimetableEntryBody = Partial<CreateTimetableEntryBody>;

export type TimetableList = OpsPaginated<Timetable>;
export type ClassroomList = OpsPaginated<Classroom>;

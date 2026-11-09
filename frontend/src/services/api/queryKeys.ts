import type { BlogListQuery, EventListQuery, PageListQuery } from '@/services/api/apiTypes';
import type { InquiryStatisticsQuery, RecentActivityQuery } from '@/types/dashboard.types';

/** Stable TanStack Query keys for public website data. */
export const queryKeys = {
  health: ['health'] as const,
  settings: {
    public: ['settings', 'public'] as const,
  },
  academic: {
    overview: ['academic', 'overview'] as const,
  },
  blog: {
    all: ['blog'] as const,
    posts: (query: BlogListQuery = {}) => ['blog', 'posts', query] as const,
    post: (slug: string) => ['blog', 'post', slug] as const,
    categories: ['blog', 'categories'] as const,
    categoryPosts: (slug: string, query: BlogListQuery = {}) =>
      ['blog', 'category', slug, 'posts', query] as const,
  },
  pages: {
    all: ['pages'] as const,
    list: (query: PageListQuery = {}) => ['pages', 'list', query] as const,
    detail: (slug: string) => ['pages', 'detail', slug] as const,
  },
  events: {
    all: ['events'] as const,
    list: (query: EventListQuery = {}) => ['events', 'list', query] as const,
    detail: (slug: string) => ['events', 'detail', slug] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    overview: ['dashboard', 'overview'] as const,
    recentActivity: (query: RecentActivityQuery = {}) =>
      ['dashboard', 'recent-activity', query] as const,
    contentStatistics: ['dashboard', 'content-statistics'] as const,
    inquiryStatistics: (query: InquiryStatisticsQuery = {}) =>
      ['dashboard', 'inquiry-statistics', query] as const,
  },
  cms: {
    pages: {
      all: ['cms', 'pages'] as const,
      list: (query: Record<string, unknown> = {}) => ['cms', 'pages', 'list', query] as const,
      detail: (id: number) => ['cms', 'pages', 'detail', id] as const,
    },
    posts: {
      all: ['cms', 'posts'] as const,
      list: (query: Record<string, unknown> = {}) => ['cms', 'posts', 'list', query] as const,
      detail: (id: number) => ['cms', 'posts', 'detail', id] as const,
    },
    categories: {
      all: ['cms', 'categories'] as const,
      list: (query: Record<string, unknown> = {}) => ['cms', 'categories', 'list', query] as const,
    },
    events: {
      all: ['cms', 'events'] as const,
      list: (query: Record<string, unknown> = {}) => ['cms', 'events', 'list', query] as const,
      detail: (id: number) => ['cms', 'events', 'detail', id] as const,
    },
    media: {
      all: ['cms', 'media'] as const,
      list: (query: Record<string, unknown> = {}) => ['cms', 'media', 'list', query] as const,
      detail: (id: number) => ['cms', 'media', 'detail', id] as const,
    },
    contactMessages: {
      all: ['cms', 'contact-messages'] as const,
      list: (query: Record<string, unknown> = {}) =>
        ['cms', 'contact-messages', 'list', query] as const,
    },
    newsletter: {
      all: ['cms', 'newsletter'] as const,
      list: (query: Record<string, unknown> = {}) => ['cms', 'newsletter', 'list', query] as const,
    },
    admissions: {
      all: ['cms', 'admissions'] as const,
      list: (query: Record<string, unknown> = {}) => ['cms', 'admissions', 'list', query] as const,
    },
  },
  sms: {
    all: ['sms'] as const,
    teachers: {
      all: ['sms', 'teachers'] as const,
      list: (query: Record<string, unknown> = {}) => ['sms', 'teachers', 'list', query] as const,
      detail: (id: number) => ['sms', 'teachers', 'detail', id] as const,
    },
    students: {
      all: ['sms', 'students'] as const,
      list: (query: Record<string, unknown> = {}) => ['sms', 'students', 'list', query] as const,
      detail: (id: number) => ['sms', 'students', 'detail', id] as const,
    },
    academicYears: {
      all: ['sms', 'academic-years'] as const,
      list: (query: Record<string, unknown> = {}) =>
        ['sms', 'academic-years', 'list', query] as const,
      detail: (id: number) => ['sms', 'academic-years', 'detail', id] as const,
      terms: (id: number) => ['sms', 'academic-years', 'terms', id] as const,
    },
    gradeLevels: {
      all: ['sms', 'grade-levels'] as const,
      list: (query: Record<string, unknown> = {}) =>
        ['sms', 'grade-levels', 'list', query] as const,
    },
    sections: {
      all: ['sms', 'sections'] as const,
      list: (query: Record<string, unknown> = {}) => ['sms', 'sections', 'list', query] as const,
    },
    subjects: {
      all: ['sms', 'subjects'] as const,
      list: (query: Record<string, unknown> = {}) => ['sms', 'subjects', 'list', query] as const,
    },
    classOfferings: {
      all: ['sms', 'class-offerings'] as const,
      list: (query: Record<string, unknown> = {}) =>
        ['sms', 'class-offerings', 'list', query] as const,
      detail: (id: number) => ['sms', 'class-offerings', 'detail', id] as const,
    },
    teachingAssignments: {
      all: ['sms', 'teaching-assignments'] as const,
      list: (query: Record<string, unknown> = {}) =>
        ['sms', 'teaching-assignments', 'list', query] as const,
    },
    enrollments: {
      all: ['sms', 'enrollments'] as const,
      list: (query: Record<string, unknown> = {}) => ['sms', 'enrollments', 'list', query] as const,
    },
    attendance: {
      all: ['sms', 'attendance'] as const,
      list: (query: Record<string, unknown> = {}) => ['sms', 'attendance', 'list', query] as const,
    },
    assignments: {
      all: ['sms', 'assignments'] as const,
      list: (query: Record<string, unknown> = {}) => ['sms', 'assignments', 'list', query] as const,
      submissions: (id: number, query: Record<string, unknown> = {}) =>
        ['sms', 'assignments', 'submissions', id, query] as const,
    },
    examinations: {
      all: ['sms', 'examinations'] as const,
      list: (query: Record<string, unknown> = {}) =>
        ['sms', 'examinations', 'list', query] as const,
      results: (id: number) => ['sms', 'examinations', 'results', id] as const,
    },
    feeStructures: {
      all: ['sms', 'fee-structures'] as const,
      list: (query: Record<string, unknown> = {}) =>
        ['sms', 'fee-structures', 'list', query] as const,
    },
    studentFees: {
      all: ['sms', 'student-fees'] as const,
      list: (query: Record<string, unknown> = {}) =>
        ['sms', 'student-fees', 'list', query] as const,
      payments: (id: number) => ['sms', 'student-fees', 'payments', id] as const,
    },
    announcements: {
      all: ['sms', 'announcements'] as const,
      list: (query: Record<string, unknown> = {}) =>
        ['sms', 'announcements', 'list', query] as const,
    },
    timetables: {
      all: ['sms', 'timetables'] as const,
      list: (query: Record<string, unknown> = {}) => ['sms', 'timetables', 'list', query] as const,
      detail: (id: number) => ['sms', 'timetables', 'detail', id] as const,
      classrooms: (query: Record<string, unknown> = {}) =>
        ['sms', 'timetables', 'classrooms', query] as const,
    },
    learningMaterials: {
      all: ['sms', 'learning-materials'] as const,
      list: (query: Record<string, unknown> = {}) =>
        ['sms', 'learning-materials', 'list', query] as const,
      stats: (query: Record<string, unknown> = {}) =>
        ['sms', 'learning-materials', 'stats', query] as const,
      detail: (id: number) => ['sms', 'learning-materials', 'detail', id] as const,
    },
    gradebook: {
      all: ['sms', 'gradebook'] as const,
      overview: (query: Record<string, unknown> = {}) =>
        ['sms', 'gradebook', 'overview', query] as const,
      classSubject: (query: Record<string, unknown> = {}) =>
        ['sms', 'gradebook', 'class-subject', query] as const,
      pending: (query: Record<string, unknown> = {}) =>
        ['sms', 'gradebook', 'pending', query] as const,
      scales: ['sms', 'gradebook', 'scales'] as const,
      categories: (query: Record<string, unknown> = {}) =>
        ['sms', 'gradebook', 'categories', query] as const,
    },
    reports: {
      all: ['sms', 'reports'] as const,
      overview: (query: Record<string, unknown> = {}) =>
        ['sms', 'reports', 'overview', query] as const,
    },
  },
  notifications: {
    admin: {
      all: ['notifications', 'admin'] as const,
      list: (query: Record<string, unknown> = {}) =>
        ['notifications', 'admin', 'list', query] as const,
      unread: ['notifications', 'admin', 'unread'] as const,
    },
    teacher: {
      all: ['notifications', 'teacher'] as const,
      list: (query: Record<string, unknown> = {}) =>
        ['notifications', 'teacher', 'list', query] as const,
      unread: ['notifications', 'teacher', 'unread'] as const,
    },
    student: {
      all: ['notifications', 'student'] as const,
      list: (query: Record<string, unknown> = {}) =>
        ['notifications', 'student', 'list', query] as const,
      unread: ['notifications', 'student', 'unread'] as const,
    },
  },
  messaging: {
    admin: {
      all: ['messaging', 'admin'] as const,
      list: (query: Record<string, unknown> = {}) =>
        ['messaging', 'admin', 'list', query] as const,
      unread: ['messaging', 'admin', 'unread'] as const,
      contacts: (query: Record<string, unknown> = {}) =>
        ['messaging', 'admin', 'contacts', query] as const,
      messages: (id: number, query: Record<string, unknown> = {}) =>
        ['messaging', 'admin', 'messages', id, query] as const,
      detail: (id: number) => ['messaging', 'admin', 'detail', id] as const,
    },
    teacher: {
      all: ['messaging', 'teacher'] as const,
      list: (query: Record<string, unknown> = {}) =>
        ['messaging', 'teacher', 'list', query] as const,
      unread: ['messaging', 'teacher', 'unread'] as const,
      contacts: (query: Record<string, unknown> = {}) =>
        ['messaging', 'teacher', 'contacts', query] as const,
      messages: (id: number, query: Record<string, unknown> = {}) =>
        ['messaging', 'teacher', 'messages', id, query] as const,
      detail: (id: number) => ['messaging', 'teacher', 'detail', id] as const,
    },
    student: {
      all: ['messaging', 'student'] as const,
      list: (query: Record<string, unknown> = {}) =>
        ['messaging', 'student', 'list', query] as const,
      unread: ['messaging', 'student', 'unread'] as const,
      contacts: (query: Record<string, unknown> = {}) =>
        ['messaging', 'student', 'contacts', query] as const,
      messages: (id: number, query: Record<string, unknown> = {}) =>
        ['messaging', 'student', 'messages', id, query] as const,
      detail: (id: number) => ['messaging', 'student', 'detail', id] as const,
    },
  },
  teacher: {
    all: ['teacher'] as const,
    overview: ['teacher', 'overview'] as const,
    profile: ['teacher', 'profile'] as const,
    classes: {
      all: ['teacher', 'classes'] as const,
      list: ['teacher', 'classes', 'list'] as const,
      detail: (id: number) => ['teacher', 'classes', 'detail', id] as const,
    },
    subjects: ['teacher', 'subjects'] as const,
    students: {
      all: ['teacher', 'students'] as const,
      list: (query: Record<string, unknown> = {}) =>
        ['teacher', 'students', 'list', query] as const,
    },
    attendance: {
      all: ['teacher', 'attendance'] as const,
      list: (query: Record<string, unknown> = {}) =>
        ['teacher', 'attendance', 'list', query] as const,
    },
    assignments: {
      all: ['teacher', 'assignments'] as const,
      list: (query: Record<string, unknown> = {}) =>
        ['teacher', 'assignments', 'list', query] as const,
      submissions: (id: number, query: Record<string, unknown> = {}) =>
        ['teacher', 'assignments', 'submissions', id, query] as const,
    },
    examinations: {
      all: ['teacher', 'examinations'] as const,
      list: (query: Record<string, unknown> = {}) =>
        ['teacher', 'examinations', 'list', query] as const,
      results: (id: number) => ['teacher', 'examinations', 'results', id] as const,
    },
    gradebook: {
      all: ['teacher', 'gradebook'] as const,
      list: (query: Record<string, unknown> = {}) =>
        ['teacher', 'gradebook', 'list', query] as const,
      classSubject: (query: Record<string, unknown> = {}) =>
        ['teacher', 'gradebook', 'class-subject', query] as const,
    },
    announcements: (query: Record<string, unknown> = {}) =>
      ['teacher', 'announcements', query] as const,
    timetable: (query: Record<string, unknown> = {}) => ['teacher', 'timetable', query] as const,
    learningMaterials: {
      all: ['teacher', 'learning-materials'] as const,
      list: (query: Record<string, unknown> = {}) =>
        ['teacher', 'learning-materials', 'list', query] as const,
    },
  },
  student: {
    all: ['student'] as const,
    overview: ['student', 'overview'] as const,
    profile: ['student', 'profile'] as const,
    enrollment: ['student', 'enrollment'] as const,
    classes: ['student', 'classes'] as const,
    subjects: ['student', 'subjects'] as const,
    attendance: (query: Record<string, unknown> = {}) => ['student', 'attendance', query] as const,
    assignments: (query: Record<string, unknown> = {}) =>
      ['student', 'assignments', query] as const,
    examResults: (query: Record<string, unknown> = {}) =>
      ['student', 'exam-results', query] as const,
    gradebookSummary: (query: Record<string, unknown> = {}) =>
      ['student', 'gradebook-summary', query] as const,
    fees: (query: Record<string, unknown> = {}) => ['student', 'fees', query] as const,
    announcements: (query: Record<string, unknown> = {}) =>
      ['student', 'announcements', query] as const,
    timetable: ['student', 'timetable'] as const,
    learningMaterials: (query: Record<string, unknown> = {}) =>
      ['student', 'learning-materials', query] as const,
  },
} as const;

/**
 * Centralized public API paths relative to `VITE_API_BASE_URL` (`/api/v1`).
 * Verified against `backend/src/routes/index.js` and module route files.
 */
export const endpoints = {
  health: '/health',
  blog: {
    posts: '/blog/posts',
    post: (slug: string) => `/blog/posts/${encodeURIComponent(slug)}`,
    categories: '/blog/categories',
    categoryPosts: (slug: string) => `/blog/categories/${encodeURIComponent(slug)}/posts`,
  },
  pages: {
    list: '/pages',
    detail: (slug: string) => `/pages/${encodeURIComponent(slug)}`,
  },
  events: {
    list: '/events',
    detail: (slug: string) => `/events/${encodeURIComponent(slug)}`,
  },
  settings: {
    public: '/settings/public',
  },
  academic: {
    overview: '/academic/overview',
  },
  contact: {
    submit: '/contact',
  },
  admissions: {
    inquiries: '/admissions/inquiries',
  },
  newsletter: {
    subscribe: '/newsletter/subscribe',
    confirm: '/newsletter/confirm',
    unsubscribe: '/newsletter/unsubscribe',
  },
  media: {
    /** Public content URL uses unguessable publicId (32-char hex), not numeric PK. */
    content: (publicId: string) => `/media/${publicId}/content`,
  },
  admin: {
    auth: {
      login: '/admin/auth/login',
      me: '/admin/auth/me',
      logout: '/admin/auth/logout',
    },
    dashboard: {
      overview: '/admin/dashboard/overview',
      recentActivity: '/admin/dashboard/recent-activity',
      contentStatistics: '/admin/dashboard/content-statistics',
      inquiryStatistics: '/admin/dashboard/inquiry-statistics',
    },
    pages: {
      list: '/admin/pages',
      create: '/admin/pages',
      detail: (id: number) => `/admin/pages/${id}`,
      publish: (id: number) => `/admin/pages/${id}/publish`,
      unpublish: (id: number) => `/admin/pages/${id}/unpublish`,
      restore: (id: number) => `/admin/pages/${id}/restore`,
    },
    blog: {
      posts: '/admin/blog/posts',
      post: (id: number) => `/admin/blog/posts/${id}`,
      publishPost: (id: number) => `/admin/blog/posts/${id}/publish`,
      unpublishPost: (id: number) => `/admin/blog/posts/${id}/unpublish`,
      restorePost: (id: number) => `/admin/blog/posts/${id}/restore`,
      categories: '/admin/blog/categories',
      category: (id: number) => `/admin/blog/categories/${id}`,
    },
    events: {
      list: '/admin/events',
      create: '/admin/events',
      detail: (id: number) => `/admin/events/${id}`,
      publish: (id: number) => `/admin/events/${id}/publish`,
      unpublish: (id: number) => `/admin/events/${id}/unpublish`,
      cancel: (id: number) => `/admin/events/${id}/cancel`,
      restore: (id: number) => `/admin/events/${id}/restore`,
    },
    media: {
      list: '/admin/media',
      upload: '/admin/media/upload',
      detail: (id: number) => `/admin/media/${id}`,
      restore: (id: number) => `/admin/media/${id}/restore`,
    },
    contactMessages: {
      list: '/admin/contact-messages',
      detail: (id: number) => `/admin/contact-messages/${id}`,
      status: (id: number) => `/admin/contact-messages/${id}/status`,
    },
    newsletter: {
      subscribers: '/admin/newsletter/subscribers',
      subscriber: (id: number) => `/admin/newsletter/subscribers/${id}`,
      subscriberStatus: (id: number) => `/admin/newsletter/subscribers/${id}/status`,
    },
    admissions: {
      inquiries: '/admin/admissions/inquiries',
      inquiry: (id: number) => `/admin/admissions/inquiries/${id}`,
      inquiryStatus: (id: number) => `/admin/admissions/inquiries/${id}/status`,
    },
    sms: {
      teachers: {
        list: '/admin/sms/teachers',
        detail: (id: number) => `/admin/sms/teachers/${id}`,
        activate: (id: number) => `/admin/sms/teachers/${id}/activate`,
        deactivate: (id: number) => `/admin/sms/teachers/${id}/deactivate`,
        restore: (id: number) => `/admin/sms/teachers/${id}/restore`,
      },
      students: {
        list: '/admin/sms/students',
        detail: (id: number) => `/admin/sms/students/${id}`,
        activate: (id: number) => `/admin/sms/students/${id}/activate`,
        deactivate: (id: number) => `/admin/sms/students/${id}/deactivate`,
        restore: (id: number) => `/admin/sms/students/${id}/restore`,
      },
      academicYears: {
        list: '/admin/sms/academic-years',
        detail: (id: number) => `/admin/sms/academic-years/${id}`,
        setCurrent: (id: number) => `/admin/sms/academic-years/${id}/set-current`,
        terms: (id: number) => `/admin/sms/academic-years/${id}/terms`,
        term: (id: number, termId: number) => `/admin/sms/academic-years/${id}/terms/${termId}`,
      },
      gradeLevels: {
        list: '/admin/sms/grade-levels',
        detail: (id: number) => `/admin/sms/grade-levels/${id}`,
      },
      sections: {
        list: '/admin/sms/sections',
        detail: (id: number) => `/admin/sms/sections/${id}`,
      },
      subjects: {
        list: '/admin/sms/subjects',
        detail: (id: number) => `/admin/sms/subjects/${id}`,
      },
      classOfferings: {
        list: '/admin/sms/class-offerings',
        detail: (id: number) => `/admin/sms/class-offerings/${id}`,
      },
      teachingAssignments: {
        list: '/admin/sms/teaching-assignments',
        detail: (id: number) => `/admin/sms/teaching-assignments/${id}`,
      },
      enrollments: {
        list: '/admin/sms/enrollments',
        detail: (id: number) => `/admin/sms/enrollments/${id}`,
        status: (id: number) => `/admin/sms/enrollments/${id}/status`,
      },
      attendance: {
        list: '/admin/sms/attendance',
        bulk: '/admin/sms/attendance/bulk',
        detail: (id: number) => `/admin/sms/attendance/${id}`,
      },
      assignments: {
        list: '/admin/sms/assignments',
        detail: (id: number) => `/admin/sms/assignments/${id}`,
        submissions: (id: number) => `/admin/sms/assignments/${id}/submissions`,
        gradeSubmission: (id: number, submissionId: number) =>
          `/admin/sms/assignments/${id}/submissions/${submissionId}/grade`,
      },
      examinations: {
        list: '/admin/sms/examinations',
        detail: (id: number) => `/admin/sms/examinations/${id}`,
        publish: (id: number) => `/admin/sms/examinations/${id}/publish`,
        results: (id: number) => `/admin/sms/examinations/${id}/results`,
        result: (id: number, resultId: number) =>
          `/admin/sms/examinations/${id}/results/${resultId}`,
      },
      fees: {
        list: '/admin/sms/fees',
        detail: (id: number) => `/admin/sms/fees/${id}`,
      },
      studentFees: {
        list: '/admin/sms/student-fees',
        detail: (id: number) => `/admin/sms/student-fees/${id}`,
        payments: (id: number) => `/admin/sms/student-fees/${id}/payments`,
        payment: (id: number, paymentId: number) =>
          `/admin/sms/student-fees/${id}/payments/${paymentId}`,
      },
      announcements: {
        list: '/admin/sms/announcements',
        detail: (id: number) => `/admin/sms/announcements/${id}`,
        publish: (id: number) => `/admin/sms/announcements/${id}/publish`,
      },
      timetables: {
        list: '/admin/sms/timetables',
        detail: (id: number) => `/admin/sms/timetables/${id}`,
        publish: (id: number) => `/admin/sms/timetables/${id}/publish`,
        unpublish: (id: number) => `/admin/sms/timetables/${id}/unpublish`,
        entries: (id: number) => `/admin/sms/timetables/${id}/entries`,
        entry: (id: number, entryId: number) => `/admin/sms/timetables/${id}/entries/${entryId}`,
        conflicts: '/admin/sms/timetables/conflicts',
        classrooms: {
          list: '/admin/sms/timetables/classrooms',
          detail: (id: number) => `/admin/sms/timetables/classrooms/${id}`,
        },
      },
      learningMaterials: {
        list: '/admin/sms/learning-materials',
        stats: '/admin/sms/learning-materials/stats',
        detail: (id: number) => `/admin/sms/learning-materials/${id}`,
        download: (id: number) => `/admin/sms/learning-materials/${id}/download`,
        publish: (id: number) => `/admin/sms/learning-materials/${id}/publish`,
        unpublish: (id: number) => `/admin/sms/learning-materials/${id}/unpublish`,
        archive: (id: number) => `/admin/sms/learning-materials/${id}/archive`,
      },
      gradebook: {
        overview: '/admin/sms/gradebook/overview',
        classSubject: '/admin/sms/gradebook/class-subject',
        pending: '/admin/sms/gradebook/pending',
        scales: '/admin/sms/gradebook/scales',
        scale: (id: number) => `/admin/sms/gradebook/scales/${id}`,
        categories: '/admin/sms/gradebook/categories',
        category: (id: number) => `/admin/sms/gradebook/categories/${id}`,
        validateWeights: '/admin/sms/gradebook/validate-weights',
        approve: (id: number) => `/admin/sms/gradebook/examinations/${id}/approve`,
        reject: (id: number) => `/admin/sms/gradebook/examinations/${id}/reject`,
        reopen: (id: number) => `/admin/sms/gradebook/examinations/${id}/reopen`,
      },
      reports: {
        overview: '/admin/sms/reports/overview',
      },
    },
    notifications: '/admin/notifications',
    messages: '/admin/messages',
  },
  teacher: {
    auth: {
      login: '/teacher/auth/login',
      me: '/teacher/auth/me',
      logout: '/teacher/auth/logout',
    },
    dashboard: {
      overview: '/teacher/dashboard/overview',
    },
    profile: '/teacher/profile',
    classes: {
      list: '/teacher/classes',
      detail: (id: number) => `/teacher/classes/${id}`,
    },
    subjects: {
      list: '/teacher/subjects',
    },
    students: {
      list: '/teacher/students',
    },
    attendance: {
      list: '/teacher/attendance',
      bulk: '/teacher/attendance/bulk',
    },
    assignments: {
      list: '/teacher/assignments',
      detail: (id: number) => `/teacher/assignments/${id}`,
      submissions: (id: number) => `/teacher/assignments/${id}/submissions`,
      gradeSubmission: (id: number, submissionId: number) =>
        `/teacher/assignments/${id}/submissions/${submissionId}/grade`,
    },
    examinations: {
      list: '/teacher/examinations',
      detail: (id: number) => `/teacher/examinations/${id}`,
      results: (id: number) => `/teacher/examinations/${id}/results`,
      submit: (id: number) => `/teacher/examinations/${id}/submit`,
    },
    gradebook: {
      list: '/teacher/gradebook',
      classSubject: '/teacher/gradebook/class-subject',
    },
    announcements: '/teacher/announcements',
    timetable: '/teacher/timetable',
    learningMaterials: {
      list: '/teacher/learning-materials',
      detail: (id: number) => `/teacher/learning-materials/${id}`,
      download: (id: number) => `/teacher/learning-materials/${id}/download`,
      file: (id: number) => `/teacher/learning-materials/${id}/file`,
      publish: (id: number) => `/teacher/learning-materials/${id}/publish`,
      unpublish: (id: number) => `/teacher/learning-materials/${id}/unpublish`,
    },
    notifications: '/teacher/notifications',
    messages: '/teacher/messages',
  },
  student: {
    auth: {
      login: '/student/auth/login',
      me: '/student/auth/me',
      logout: '/student/auth/logout',
    },
    dashboard: {
      overview: '/student/dashboard/overview',
    },
    profile: '/student/profile',
    enrollment: '/student/enrollment',
    classes: {
      list: '/student/classes',
    },
    subjects: {
      list: '/student/subjects',
    },
    attendance: '/student/attendance',
    assignments: {
      list: '/student/assignments',
      submit: (id: number) => `/student/assignments/${id}/submit`,
    },
    examResults: '/student/exam-results',
    gradebookSummary: '/student/gradebook/summary',
    fees: '/student/fees',
    announcements: '/student/announcements',
    timetable: '/student/timetable',
    learningMaterials: {
      list: '/student/learning-materials',
      detail: (id: number) => `/student/learning-materials/${id}`,
      download: (id: number) => `/student/learning-materials/${id}/download`,
    },
    notifications: '/student/notifications',
    messages: '/student/messages',
  },
} as const;

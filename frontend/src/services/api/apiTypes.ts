/** Shared API envelope — matches backend `sendSuccess` / `sendError`. */

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

/** Backend Zod validation errors use `field` (see errorHandler). */
export interface ApiErrorDetail {
  field?: string;
  path?: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
  errors?: ApiErrorDetail[];
  data?: unknown;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedList<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface FeaturedImage {
  id: number;
  publicId?: string;
  fileName: string;
  mimeType: string;
  altText: string | null;
  url: string;
}

export interface PublicAuthor {
  id: number;
  firstName: string;
  lastName: string;
}

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  /** Published posts in this category (public list). */
  postCount?: number;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  publishedAt: string | null;
  updatedAt: string;
  author: PublicAuthor | null;
  category: Pick<BlogCategory, 'id' | 'name' | 'slug'> | null;
  featuredImage: FeaturedImage | null;
}

export interface CmsPage {
  id: number;
  title: string;
  slug: string;
  content: string;
  publishedAt: string | null;
  updatedAt: string;
}

export interface SchoolEvent {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
  featuredImage: FeaturedImage | null;
}

export interface HealthData {
  status: 'ok' | 'degraded';
  api: string;
  database: string;
  databaseVerified: boolean;
  timestamp: string;
}

export interface PublicAcademicOverviewData {
  currentAcademicYear: {
    id: number;
    name: string;
    code: string;
    startsOn: string;
    endsOn: string;
  } | null;
  gradeLevels: {
    id: number;
    name: string;
    code: string;
    sortOrder: number;
  }[];
  subjects: {
    id: number;
    name: string;
    code: string;
    description: string | null;
  }[];
  counts: {
    gradeLevels: number;
    subjects: number;
  };
}

export interface PublicSettingsData {
  settings: Record<string, string>;
}

export interface ContactSubmitBody {
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
}

export interface ContactSubmissionReceipt {
  id: number;
  name: string;
  email: string;
  subject: string;
  createdAt: string;
}

export interface AdmissionInquiryBody {
  studentName: string;
  guardianName?: string | null;
  email: string;
  phone: string;
  gradeApplyingFor: string;
  academicYear: string;
  message: string;
}

export interface AdmissionInquiryReceipt {
  id: number;
  studentName: string;
  email: string;
  gradeApplyingFor: string;
  academicYear: string;
  status: string;
  createdAt: string;
}

export interface NewsletterSubscribeBody {
  email: string;
}

export interface NewsletterTokenBody {
  token: string;
}

export interface BlogListQuery {
  page?: number;
  limit?: number;
  q?: string;
  categoryId?: number;
  categorySlug?: string;
}

export interface PageListQuery {
  page?: number;
  limit?: number;
}

export interface EventListQuery {
  page?: number;
  limit?: number;
  q?: string;
}

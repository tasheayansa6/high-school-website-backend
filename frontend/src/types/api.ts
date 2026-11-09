/**
 * Re-export shared API types from the services layer for convenient imports.
 * Canonical definitions live in `src/services/api/apiTypes.ts`.
 */
export { ApiClientError, shouldRetryQuery, toApiClientError } from '@/services/api/apiError';
export type {
  AdmissionInquiryBody,
  AdmissionInquiryReceipt,
  ApiErrorDetail,
  ApiErrorResponse,
  ApiResponse,
  ApiSuccessResponse,
  BlogCategory,
  BlogListQuery,
  BlogPost,
  CmsPage,
  ContactSubmissionReceipt,
  ContactSubmitBody,
  EventListQuery,
  FeaturedImage,
  HealthData,
  NewsletterSubscribeBody,
  NewsletterTokenBody,
  PageListQuery,
  PaginatedList,
  PaginationMeta,
  PublicAuthor,
  PublicSettingsData,
  SchoolEvent,
} from '@/services/api/apiTypes';

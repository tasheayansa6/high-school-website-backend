/** Admin CMS types aligned with backend admin service payloads. */

export type PublicationStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'ARCHIVED';

export interface AdminActor {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface FeaturedImageRef {
  id: number;
  publicId?: string;
  fileName: string;
  mimeType: string;
  altText: string | null;
  url: string;
}

export interface AdminPage {
  id: number;
  title: string;
  slug: string;
  content: string;
  status: PublicationStatus;
  publishedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdById: number | null;
  updatedById: number | null;
  createdBy: AdminActor | null;
  updatedBy: AdminActor | null;
}

export interface CreatePageBody {
  title: string;
  slug?: string;
  content: string;
}

export interface UpdatePageBody {
  title?: string;
  slug?: string;
  content?: string;
}

export interface AdminPageListQuery {
  page?: number;
  limit?: number;
  status?: PublicationStatus;
  q?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'publishedAt';
  sortOrder?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

export interface AdminBlogCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  postCount?: number;
}

export interface CreateCategoryBody {
  name: string;
  slug?: string;
  description?: string | null;
}

export interface UpdateCategoryBody {
  name?: string;
  slug?: string;
  description?: string | null;
}

export interface AdminBlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  status: PublicationStatus;
  publishedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  authorId: number | null;
  categoryId: number | null;
  featuredImageId: number | null;
  author: AdminActor | null;
  category: Pick<AdminBlogCategory, 'id' | 'name' | 'slug' | 'description'> | null;
  featuredImage: FeaturedImageRef | null;
}

export interface CreatePostBody {
  title: string;
  slug?: string;
  excerpt?: string | null;
  content: string;
  categoryId?: number | null;
  featuredImageId?: number | null;
  authorId?: number;
}

export interface UpdatePostBody {
  title?: string;
  slug?: string;
  excerpt?: string | null;
  content?: string;
  categoryId?: number | null;
  featuredImageId?: number | null;
  authorId?: number;
}

export interface AdminPostListQuery {
  page?: number;
  limit?: number;
  q?: string;
  status?: PublicationStatus;
  categoryId?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

export interface AdminEvent {
  id: number;
  title: string;
  slug: string;
  description: string;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  status: EventStatus;
  publishedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdById: number | null;
  featuredImageId: number | null;
  featuredImage: FeaturedImageRef | null;
  createdBy: AdminActor | null;
}

export interface CreateEventBody {
  title: string;
  slug?: string;
  description: string;
  location?: string | null;
  startsAt: string;
  endsAt?: string | null;
  featuredImageId?: number | null;
}

export interface UpdateEventBody {
  title?: string;
  slug?: string;
  description?: string;
  location?: string | null;
  startsAt?: string;
  endsAt?: string | null;
  featuredImageId?: number | null;
}

export interface AdminEventListQuery {
  page?: number;
  limit?: number;
  q?: string;
  status?: EventStatus;
  timeframe?: 'upcoming' | 'past';
  sortBy?: 'startsAt' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

export interface AdminMediaAsset {
  id: number;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  altText: string | null;
  description: string | null;
  isGalleryImage: boolean;
  sortOrder: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  uploadedById: number | null;
  url: string;
  uploadedBy: AdminActor | null;
}

export interface AdminMediaListQuery {
  page?: number;
  limit?: number;
  q?: string;
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
  isGalleryImage?: boolean;
  sortOrder?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

export interface UpdateMediaBody {
  altText?: string | null;
  description?: string | null;
  isGalleryImage?: boolean;
  sortOrder?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

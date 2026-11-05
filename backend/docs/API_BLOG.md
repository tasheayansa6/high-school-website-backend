# Blog & School News API — Frontend Integration

Base path: `/api/v1`

Admin routes require:

```http
Authorization: Bearer <accessToken>
```

**Manage blog:** Super Admin, Content Editor (`blog:manage`)  
**Restore deleted articles:** Super Admin only (`blog:restore` via `*`)  
Communication Manager cannot modify articles.

## Publication workflow

1. Create article → `DRAFT` (author defaults to logged-in admin)
2. Assign category, optional excerpt / featured image media id
3. Edit while draft (status unchanged)
4. Publish → requires non-empty title/content, valid category, valid author → `PUBLISHED` + `publishedAt`
5. Unpublish → `DRAFT` (hidden publicly)
6. Soft delete → `deletedAt` set, status `DRAFT`
7. Restore (Super Admin) → clears `deletedAt`

## Featured articles note

The schema has **no** `isFeatured` boolean. Public/admin responses expose optional `featuredImage` media metadata via `featuredImageId`. A dedicated “featured posts” flag would need a small future migration if required.

## Public endpoints

### GET `/api/v1/blog/posts`

Query: `page`, `limit`, `q`, `categoryId`, `categorySlug`

### GET `/api/v1/blog/posts/:slug`

### GET `/api/v1/blog/categories`

### GET `/api/v1/blog/categories/:slug/posts`

Query: `page`, `limit`, `q`

Public post example:

```json
{
  "success": true,
  "message": "Article retrieved",
  "data": {
    "post": {
      "id": 1,
      "title": "Science Fair Highlights",
      "slug": "science-fair-highlights",
      "excerpt": "Students presented projects...",
      "content": "<p>...</p>",
      "publishedAt": "2026-11-04T12:00:00.000Z",
      "updatedAt": "2026-11-04T12:00:00.000Z",
      "author": { "id": 1, "firstName": "Site", "lastName": "Admin" },
      "category": { "id": 1, "name": "News", "slug": "news" },
      "featuredImage": {
        "id": 3,
        "fileName": "fair.jpg",
        "mimeType": "image/jpeg",
        "url": "http://localhost:5000/api/v1/media/1/content",
        "altText": "Science fair"
      }
    }
  }
}
```

Draft, unpublished, and soft-deleted articles return `404 POST_NOT_FOUND`.

## Administrator endpoints

### Posts

| Method | Path |
|--------|------|
| GET | `/api/v1/admin/blog/posts` |
| POST | `/api/v1/admin/blog/posts` |
| GET | `/api/v1/admin/blog/posts/:id` |
| PATCH | `/api/v1/admin/blog/posts/:id` |
| PATCH | `/api/v1/admin/blog/posts/:id/publish` |
| PATCH | `/api/v1/admin/blog/posts/:id/unpublish` |
| DELETE | `/api/v1/admin/blog/posts/:id` |
| PATCH | `/api/v1/admin/blog/posts/:id/restore` |

Create body:

```json
{
  "title": "Science Fair Highlights",
  "slug": "science-fair-highlights",
  "excerpt": "Optional summary",
  "content": "<p>Full article</p>",
  "categoryId": 1,
  "featuredImageId": null
}
```

Admin list query supports: `page`, `limit`, `q`, `status`, `categoryId`, `authorId`, `sortBy`, `sortOrder`, `includeDeleted`, `publishedFrom`, `publishedTo`.

### Categories

| Method | Path |
|--------|------|
| GET | `/api/v1/admin/blog/categories` |
| POST | `/api/v1/admin/blog/categories` |
| PATCH | `/api/v1/admin/blog/categories/:id` |
| DELETE | `/api/v1/admin/blog/categories/:id` |

Deleting a category that still has active articles returns `409 CATEGORY_IN_USE`.

## Common errors

| Status | Code |
|--------|------|
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN` |
| 404 | `POST_NOT_FOUND`, `CATEGORY_NOT_FOUND` |
| 409 | `POST_SLUG_CONFLICT`, `CATEGORY_SLUG_CONFLICT`, `CATEGORY_NAME_CONFLICT`, `CATEGORY_IN_USE` |
| 422 | `VALIDATION_ERROR`, `POST_CONTENT_REQUIRED`, `POST_CATEGORY_REQUIRED` |

## Pagination format

```json
{
  "items": [],
  "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
}
```

# Database ERD — High School Website Platform

Mermaid entity-relationship diagram of the Phase 3 core schema. Soft-delete columns and minor metadata fields are omitted for readability where they do not affect relationships.

```mermaid
erDiagram
  roles ||--o{ admins : "has"
  admins ||--o{ pages : "creates"
  admins ||--o{ pages : "updates"
  admins ||--o{ blog_posts : "authors"
  blog_categories ||--o{ blog_posts : "categorizes"
  media_assets ||--o{ blog_posts : "featured_image"
  admins ||--o{ contact_messages : "handles"
  admins ||--o{ events : "creates"
  admins ||--o{ media_assets : "uploads"
  admins ||--o{ website_settings : "updates"
  admins ||--o{ audit_logs : "performs"

  roles {
    int id PK
    varchar name UK
    varchar slug UK
    varchar description
    datetime created_at
    datetime updated_at
  }

  admins {
    int id PK
    varchar email UK
    varchar password_hash
    varchar first_name
    varchar last_name
    boolean is_active
    datetime last_login_at
    datetime deleted_at
    int role_id FK
    datetime created_at
    datetime updated_at
  }

  pages {
    int id PK
    varchar title
    varchar slug UK
    longtext content
    enum status
    datetime published_at
    datetime deleted_at
    int created_by_id FK
    int updated_by_id FK
    datetime created_at
    datetime updated_at
  }

  blog_categories {
    int id PK
    varchar name
    varchar slug UK
    varchar description
    datetime deleted_at
    datetime created_at
    datetime updated_at
  }

  blog_posts {
    int id PK
    varchar title
    varchar slug UK
    varchar excerpt
    longtext content
    enum status
    datetime published_at
    datetime deleted_at
    int author_id FK
    int category_id FK
    int featured_image_id FK
    datetime created_at
    datetime updated_at
  }

  contact_messages {
    int id PK
    varchar name
    varchar email
    varchar phone
    varchar subject
    text message
    enum status
    int handled_by_id FK
    datetime created_at
    datetime updated_at
  }

  newsletter_subscribers {
    int id PK
    varchar email UK
    enum status
    varchar confirmation_token UK
    datetime confirmed_at
    datetime unsubscribed_at
    datetime created_at
    datetime updated_at
  }

  events {
    int id PK
    varchar title
    text description
    varchar location
    datetime starts_at
    datetime ends_at
    enum status
    datetime deleted_at
    int created_by_id FK
    datetime created_at
    datetime updated_at
  }

  media_assets {
    int id PK
    varchar file_name
    varchar original_name
    varchar mime_type
    int file_size
    varchar storage_path
    varchar alt_text
    varchar description
    boolean is_gallery_image
    int sort_order
    datetime deleted_at
    int uploaded_by_id FK
    datetime created_at
    datetime updated_at
  }

  website_settings {
    int id PK
    varchar key UK
    text value
    varchar group
    varchar label
    int updated_by_id FK
    datetime created_at
    datetime updated_at
  }

  audit_logs {
    int id PK
    varchar action
    varchar entity_type
    varchar entity_id
    json metadata
    varchar ip_address
    int admin_id FK
    datetime created_at
  }
```

## Relationship notes

| From | To | On delete |
|------|----|-----------|
| `admins.role_id` | `roles` | Restrict |
| `blog_posts.author_id` | `admins` | Restrict |
| `blog_posts.category_id` | `blog_categories` | SetNull |
| `blog_posts.featured_image_id` | `media_assets` | SetNull |
| Most optional `*_by_id` / `admin_id` FKs | `admins` | SetNull |

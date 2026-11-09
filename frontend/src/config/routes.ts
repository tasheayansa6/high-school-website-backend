export const PUBLIC_ROUTES = {
  home: '/',
  about: '/about',
  academics: '/academics',
  /** News = public blogs (CMS). */
  news: '/news',
  blogs: '/blogs',
  blogDetail: '/blogs/:slug',
  events: '/events',
  eventDetail: '/events/:slug',
  /** Backend CMS pages. */
  content: '/content/:slug',
  contact: '/contact',
  /** Admission inquiry (public form). */
  admission: '/admission',
  register: '/register',
  signin: '/signin',
} as const;

export function blogDetailPath(slug: string): string {
  return `/news/${encodeURIComponent(slug)}`;
}

export function eventDetailPath(slug: string): string {
  return `/events/${encodeURIComponent(slug)}`;
}

export function contentPagePath(slug: string): string {
  return `/content/${encodeURIComponent(slug)}`;
}

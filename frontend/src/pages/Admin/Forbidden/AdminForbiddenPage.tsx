import { Link } from 'react-router-dom';

import { ADMIN_ROUTES } from '@/config/adminRoutes';

export default function AdminForbiddenPage() {
  return (
    <section className="mx-auto max-w-xl py-space-2xl text-center">
      <p className="mb-2 font-label-caps text-label-caps uppercase tracking-widest text-secondary">
        403
      </p>
      <h1 className="mb-3 font-display text-headline-md text-primary">Access forbidden</h1>
      <p className="mb-8 font-sans text-body-md text-on-surface-variant">
        Your administrator role does not include permission for this area. Contact a Super Admin if
        you need access.
      </p>
      <Link
        to={ADMIN_ROUTES.dashboard}
        className="font-label-caps text-label-caps uppercase tracking-wider text-primary underline-offset-2 hover:underline"
      >
        Return to dashboard
      </Link>
    </section>
  );
}

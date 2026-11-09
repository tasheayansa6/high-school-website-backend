import { Link } from 'react-router-dom';

import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { ADMIN_NAV } from '@/config/adminRoutes';
import { hasAllPermissions } from '@/config/permissions';
import { useAuth } from '@/hooks/useAuth';

const SMS_GROUP = 'School management';

/**
 * Shortcut links to school management modules the signed-in admin may open.
 * Purely navigational — the dashboard API exposes no teacher/student counts.
 */
export function SmsQuickLinksSection() {
  const { admin } = useAuth();
  const links = ADMIN_NAV.filter(
    (item) => item.group === SMS_GROUP && hasAllPermissions(admin?.permissions, item.permissions),
  );

  if (links.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="sms-quick-links-heading">
      <h2 id="sms-quick-links-heading" className="mb-4 font-display text-headline-sm text-primary">
        School management
      </h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              className="flex items-center gap-3 border border-outline-variant/40 bg-surface-container-lowest px-4 py-3 font-label-caps text-label-caps uppercase tracking-wider text-primary transition-colors hover:bg-surface-container-low"
            >
              <MaterialIcon name={item.icon} className="text-[20px] text-secondary" />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

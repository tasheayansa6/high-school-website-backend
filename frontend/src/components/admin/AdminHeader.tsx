import { AdminUserMenu } from '@/components/admin/AdminUserMenu';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { portalTopBarClass } from '@/components/portal/portalNav';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { ADMIN_ROUTES } from '@/config/adminRoutes';

interface AdminHeaderProps {
  onOpenMobileNav: () => void;
}

export function AdminHeader({ onOpenMobileNav }: AdminHeaderProps) {
  return (
    <header className={portalTopBarClass}>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-primary hover:bg-surface-container-low lg:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open admin navigation"
      >
        <MaterialIcon name="menu" className="text-[24px]" />
        <span className="font-label-caps text-label-caps uppercase tracking-wider">Menu</span>
      </button>

      <div className="hidden min-w-0 lg:block">
        <p className="font-label-caps text-label-caps uppercase tracking-widest text-secondary">
          Admin console
        </p>
        <p className="font-sans text-caption text-on-surface-variant">
          School operations and content management
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <NotificationBell portal="admin" notificationsPath={ADMIN_ROUTES.notifications} />
        <AdminUserMenu />
      </div>
    </header>
  );
}

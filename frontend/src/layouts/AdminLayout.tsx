import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { portalSidebarSpacerClass } from '@/components/portal/portalNav';
import { ADMIN_NAV } from '@/config/adminRoutes';
import { hasAllPermissions } from '@/config/permissions';
import { useAuth } from '@/hooks/useAuth';

export function AdminLayout() {
  const { admin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const items = ADMIN_NAV.filter((item) => hasAllPermissions(admin?.permissions, item.permissions));

  return (
    <div className="portal-shell-bg h-[100dvh] overflow-hidden text-on-surface">
      <div className="flex h-full">
        <AdminSidebar
          items={items}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
        />
        <div className={portalSidebarSpacerClass(collapsed)} aria-hidden />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <AdminHeader onOpenMobileNav={() => setMobileOpen(true)} />
          <main className="min-h-0 flex-1 overflow-y-auto px-margin-mobile py-space-xl pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-margin">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

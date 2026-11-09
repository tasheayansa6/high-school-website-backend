import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { NotificationBell } from '@/components/notifications/NotificationBell';
import { portalSidebarSpacerClass, portalTopBarClass } from '@/components/portal/portalNav';
import { StudentSidebar } from '@/components/student/StudentSidebar';
import { StudentUserMenu } from '@/components/student/StudentUserMenu';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { STUDENT_ROUTES } from '@/config/studentRoutes';

export function StudentLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="portal-shell-bg h-[100dvh] overflow-hidden text-on-surface">
      <div className="flex h-full">
        <StudentSidebar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
        />
        <div className={portalSidebarSpacerClass(collapsed)} aria-hidden />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className={portalTopBarClass}>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-primary hover:bg-surface-container-low lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open student navigation"
            >
              <MaterialIcon name="menu" className="text-[24px]" />
              <span className="font-label-caps text-label-caps uppercase tracking-wider">Menu</span>
            </button>

            <div className="hidden min-w-0 lg:block">
              <p className="font-label-caps text-label-caps uppercase tracking-widest text-secondary">
                Student workspace
              </p>
              <p className="font-sans text-caption text-on-surface-variant">
                Your classes, work, and results
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <NotificationBell portal="student" notificationsPath={STUDENT_ROUTES.notifications} />
              <StudentUserMenu />
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-margin-mobile py-space-xl md:px-margin">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

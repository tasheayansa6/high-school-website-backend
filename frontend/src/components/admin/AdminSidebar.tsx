import { NavLink } from 'react-router-dom';

import { portalNavLinkClass, portalSidebarClass } from '@/components/portal/portalNav';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { ADMIN_ROUTES, type AdminNavItem } from '@/config/adminRoutes';
import { SITE } from '@/config/site';
import { cn } from '@/utils/cn';

interface AdminSidebarProps {
  items: readonly AdminNavItem[];
  mobileOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export function AdminSidebar({
  items,
  mobileOpen,
  onClose,
  collapsed = false,
  onToggleCollapsed,
}: AdminSidebarProps) {
  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-brand-evergreen/50 lg:hidden"
          aria-label="Close navigation overlay"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={cn(
          portalSidebarClass,
          collapsed ? 'w-[4.5rem]' : 'w-72',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-5">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary font-display text-lg font-bold text-on-secondary"
            aria-hidden="true"
          >
            A
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="font-label-caps text-[0.65rem] uppercase tracking-widest text-secondary">
                Admin Portal
              </p>
              <p className="truncate font-display text-lg tracking-tight text-on-primary">
                {SITE.name}
              </p>
            </div>
          ) : null}
        </div>

        {onToggleCollapsed ? (
          <div className="hidden border-b border-white/10 px-2 py-2 lg:block">
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-on-primary/80 hover:bg-white/10"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <MaterialIcon
                name={collapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'}
                className="text-[20px]"
              />
            </button>
          </div>
        ) : null}

        <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="Admin">
          <ul className="space-y-1">
            {items.map((item, index) => (
              <li key={item.path}>
                {item.group && item.group !== items[index - 1]?.group && !collapsed ? (
                  <p className="mb-1 mt-4 px-3 font-label-caps text-[0.65rem] uppercase tracking-widest text-secondary/90">
                    {item.group}
                  </p>
                ) : null}
                <NavLink
                  to={item.path}
                  end={item.path === ADMIN_ROUTES.dashboard}
                  onClick={onClose}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) => portalNavLinkClass(isActive, collapsed)}
                >
                  <MaterialIcon name={item.icon} className="text-[20px]" />
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}

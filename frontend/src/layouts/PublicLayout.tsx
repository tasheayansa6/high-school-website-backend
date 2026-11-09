import { Outlet } from 'react-router-dom';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';

export function PublicLayout() {
  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-clip bg-brand-ivory text-on-surface antialiased">
      <SiteHeader />
      <main className="w-full min-w-0 flex-1 bg-brand-ivory">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

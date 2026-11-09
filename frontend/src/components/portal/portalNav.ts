import { cn } from '@/utils/cn';

/** Shared portal navigation styles for Admin / Teacher / Student shells. */
export function portalNavLinkClass(isActive: boolean, collapsed = false) {
  return cn(
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
    collapsed && 'justify-center px-2',
    isActive
      ? 'bg-secondary text-on-secondary shadow-sm'
      : 'text-on-primary/85 hover:bg-white/10 hover:text-on-primary',
  );
}

/** Fixed viewport sidebar — stays put while main content scrolls. */
export const portalSidebarClass =
  'fixed inset-y-0 left-0 z-40 flex h-[100dvh] max-h-[100dvh] flex-col bg-primary-container text-on-primary transition-[width,transform] duration-200 lg:translate-x-0';

/** Desktop spacer matching sidebar width so content is not covered. */
export function portalSidebarSpacerClass(collapsed = false) {
  return cn('hidden shrink-0 lg:block', collapsed ? 'w-[4.5rem]' : 'w-72');
}

export const portalTopBarClass =
  'flex items-center justify-between gap-4 border-b border-outline-variant/30 bg-surface-container-lowest/95 px-margin-mobile py-3.5 backdrop-blur-sm md:px-margin';

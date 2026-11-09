import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { PUBLIC_ROUTES } from '@/config/routes';

interface PageBreadcrumbProps {
  current: string;
}

export function PageBreadcrumb({ current }: PageBreadcrumbProps) {
  const { t } = useTranslation();
  return (
    <nav className="mb-3 font-sans text-sm text-on-surface-variant" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link to={PUBLIC_ROUTES.home} className="hover:text-primary">
            {t('nav.home')}
          </Link>
        </li>
        <li aria-hidden>/</li>
        <li className="text-on-surface">{current}</li>
      </ol>
    </nav>
  );
}

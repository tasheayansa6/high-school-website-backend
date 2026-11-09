import { useTranslation } from 'react-i18next';

import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { cn } from '@/utils/cn';

export type AuthMethod = 'email' | 'code';

interface AuthMethodToggleProps {
  value: AuthMethod;
  onChange: (method: AuthMethod) => void;
  disabled?: boolean;
}

export function AuthMethodToggle({ value, onChange, disabled }: AuthMethodToggleProps) {
  const { t } = useTranslation();

  return (
    <div
      className="grid grid-cols-2 gap-1 rounded-full bg-surface-container-low p-1"
      role="tablist"
      aria-label={t('signin.authMethod.label')}
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === 'email'}
        disabled={disabled}
        onClick={() => onChange('email')}
        className={cn(
          'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3 font-sans text-body-sm font-medium transition-colors',
          value === 'email'
            ? 'bg-primary text-on-primary shadow-sm'
            : 'text-on-surface-variant hover:text-primary',
        )}
      >
        <MaterialIcon name="mail" className="text-[18px]" />
        {t('signin.authMethod.email')}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'code'}
        disabled={disabled}
        onClick={() => onChange('code')}
        className={cn(
          'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3 font-sans text-body-sm font-medium transition-colors',
          value === 'code'
            ? 'bg-primary text-on-primary shadow-sm'
            : 'text-on-surface-variant hover:text-primary',
        )}
      >
        <MaterialIcon name="fingerprint" className="text-[18px]" />
        {t('signin.authMethod.code')}
      </button>
    </div>
  );
}

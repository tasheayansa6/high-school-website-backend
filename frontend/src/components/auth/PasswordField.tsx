import { useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { Input } from '@/components/forms/Input';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { cn } from '@/utils/cn';

interface PasswordFieldProps {
  id: string;
  register: UseFormRegisterReturn;
  hasError?: boolean;
  disabled?: boolean;
  placeholder?: string;
  autoComplete?: string;
  /** Extra classes for the input (e.g. left padding when a leading icon is shown). */
  inputClassName?: string;
  showLeadingLock?: boolean;
}

export function PasswordField({
  id,
  register,
  hasError,
  disabled,
  placeholder,
  autoComplete = 'current-password',
  inputClassName,
  showLeadingLock = false,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      {showLeadingLock ? (
        <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-on-surface-variant">
          <MaterialIcon name="lock" className="text-[20px]" />
        </span>
      ) : null}
      <Input
        id={id}
        type={showPassword ? 'text' : 'password'}
        autoComplete={autoComplete}
        hasError={Boolean(hasError)}
        aria-invalid={Boolean(hasError)}
        disabled={disabled}
        placeholder={placeholder}
        className={cn('pr-12', showLeadingLock && 'pl-11', inputClassName)}
        {...register}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex items-center px-3 text-on-surface-variant hover:text-primary"
        onClick={() => setShowPassword((value) => !value)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        <MaterialIcon
          name={showPassword ? 'visibility_off' : 'visibility'}
          className="text-[20px]"
        />
      </button>
    </div>
  );
}

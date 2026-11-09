import type { InputHTMLAttributes } from 'react';

import { cn } from '@/utils/cn';

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
  description?: string;
};

export function Checkbox({ id, label, description, className, ...rest }: CheckboxProps) {
  const descriptionId = description && id ? `${id}-description` : undefined;

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        id={id}
        type="checkbox"
        aria-describedby={descriptionId}
        className="mt-1 h-4 w-4 accent-primary rounded-none"
        {...rest}
      />
      <label htmlFor={id} className="font-sans text-body-sm text-on-surface-variant">
        {label}
        {description ? (
          <span id={descriptionId} className="mt-0.5 block text-xs text-outline">
            {description}
          </span>
        ) : null}
      </label>
    </div>
  );
}

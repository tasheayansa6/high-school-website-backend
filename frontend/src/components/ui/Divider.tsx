import { cn } from '@/utils/cn';

interface DividerProps {
  className?: string;
  tone?: 'default' | 'gold';
}

export function Divider({ className, tone = 'default' }: DividerProps) {
  return (
    <hr
      className={cn(
        'border-0 h-px w-full',
        tone === 'gold' ? 'bg-secondary-container' : 'bg-outline-variant/60',
        className,
      )}
    />
  );
}

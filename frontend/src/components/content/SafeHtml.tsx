import DOMPurify from 'dompurify';

import { cn } from '@/utils/cn';

interface SafeHtmlProps {
  html: string;
  className?: string;
}

/**
 * Renders CMS HTML after DOMPurify sanitization.
 * Scripts, event handlers, and unsafe URIs are stripped.
 */
export function SafeHtml({ html, className }: SafeHtmlProps) {
  const clean = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  });

  return (
    <div
      className={cn(
        'prose-cms max-w-none font-sans text-body-md leading-relaxed text-on-surface',
        '[&_a]:text-primary [&_a]:underline [&_h1]:font-display [&_h2]:font-display [&_h3]:font-display',
        '[&_img]:my-4 [&_img]:max-h-[32rem] [&_img]:w-full [&_img]:object-cover',
        '[&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5',
        className,
      )}
      // Sanitized above — required for CMS rich text from the backend.
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

interface AdminPlaceholderPageProps {
  title: string;
  description: string;
}

/** Shell placeholder for future CMS / dashboard management phases. */
export default function AdminPlaceholderPage({ title, description }: AdminPlaceholderPageProps) {
  return (
    <section className="max-w-3xl">
      <p className="mb-2 font-label-caps text-label-caps uppercase tracking-widest text-secondary">
        Admin module
      </p>
      <h1 className="mb-3 break-words font-display text-headline-md text-primary">{title}</h1>
      <p className="font-sans text-body-md text-on-surface-variant">{description}</p>
      <div className="mt-8 border border-outline-variant/40 bg-surface-container-low p-6">
        <p className="font-sans text-body-sm text-on-surface-variant">
          Management tools for this section will be implemented in a later phase. Authentication and
          permission checks are already enforced for this route.
        </p>
      </div>
    </section>
  );
}

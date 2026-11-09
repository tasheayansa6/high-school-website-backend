import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { StatusBadge } from '@/components/admin/cms/StatusBadge';
import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Textarea } from '@/components/forms/Textarea';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ADMIN_ROUTES } from '@/config/adminRoutes';
import { queryKeys } from '@/services/api/queryKeys';
import { createAdminPage, getAdminPage, updateAdminPage } from '@/services/cms/adminPageService';
import { getErrorMessage } from '@/utils/apiMessage';
import { applyApiFieldErrors } from '@/utils/formErrors';

const pageFormSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(255),
  slug: z.string().trim().max(255).optional(),
  content: z.string().min(1, 'content is required'),
});

type PageFormValues = z.input<typeof pageFormSchema>;

export default function AdminPageEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const pageId = !isNew ? Number(id) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: pageId ? queryKeys.cms.pages.detail(pageId) : ['cms', 'pages', 'new'],
    queryFn: ({ signal }) => getAdminPage(pageId!, { includeDeleted: true }, { signal }),
    enabled: pageId != null && Number.isFinite(pageId),
    select: (response) => response.data.page,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PageFormValues>({
    resolver: zodResolver(pageFormSchema),
    defaultValues: { title: '', slug: '', content: '' },
  });

  useEffect(() => {
    if (detailQuery.data) {
      reset({
        title: detailQuery.data.title,
        slug: detailQuery.data.slug,
        content: detailQuery.data.content,
      });
    }
  }, [detailQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: async (values: PageFormValues) => {
      const parsed = pageFormSchema.parse(values);
      const body = {
        title: parsed.title,
        content: parsed.content,
        ...(parsed.slug && parsed.slug.length > 0 ? { slug: parsed.slug } : {}),
      };
      if (isNew) {
        return createAdminPage(body);
      }
      return updateAdminPage(pageId!, body);
    },
    onSuccess: async (response) => {
      setFormError(null);
      setSuccessMessage(response.message);
      await queryClient.invalidateQueries({ queryKey: queryKeys.cms.pages.all });
      if (isNew) {
        void navigate(ADMIN_ROUTES.pageEdit(response.data.page.id), { replace: true });
      }
    },
    onError: (error) => {
      setSuccessMessage(null);
      const applied = applyApiFieldErrors(error, setError);
      if (!applied) {
        setFormError(getErrorMessage(error, 'Unable to save page.'));
      }
    },
  });

  const busy = isSubmitting || saveMutation.isPending;

  if (!isNew && detailQuery.isLoading) {
    return <LoadingState message="Loading page…" />;
  }

  if (!isNew && detailQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(detailQuery.error, 'Unable to load page.')}
        onRetry={() => void detailQuery.refetch()}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <CmsSectionHeader
        title={isNew ? 'New page' : 'Edit page'}
        description="Page content is stored as text. Use plain text or HTML only if your publishing workflow expects it."
      >
        <Link to={ADMIN_ROUTES.pages}>
          <Button type="button" variant="ghost" size="md">
            Back to pages
          </Button>
        </Link>
      </CmsSectionHeader>

      {!isNew && detailQuery.data ? (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <StatusBadge status={detailQuery.data.status} />
          <span className="font-sans text-caption text-on-surface-variant">
            ID {detailQuery.data.id}
          </span>
        </div>
      ) : null}

      <form
        className="space-y-5 border border-outline-variant/40 bg-surface-container-lowest p-6"
        onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
        noValidate
      >
        <FormField id="page-title" label="Title" required error={errors.title?.message}>
          <Input
            id="page-title"
            disabled={busy}
            hasError={Boolean(errors.title)}
            {...register('title')}
          />
        </FormField>
        <FormField
          id="page-slug"
          label="Slug"
          hint="Optional. Leave blank to let the backend generate a slug from the title."
          error={errors.slug?.message}
        >
          <Input
            id="page-slug"
            disabled={busy}
            hasError={Boolean(errors.slug)}
            {...register('slug')}
          />
        </FormField>
        <FormField id="page-content" label="Content" required error={errors.content?.message}>
          <Textarea
            id="page-content"
            rows={16}
            disabled={busy}
            hasError={Boolean(errors.content)}
            {...register('content')}
          />
        </FormField>

        {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
        {successMessage ? <FormAlert tone="success">{successMessage}</FormAlert> : null}

        <Button type="submit" variant="primary" size="lg" isLoading={busy} disabled={busy}>
          {isNew ? 'Create page' : 'Save changes'}
        </Button>
      </form>
    </div>
  );
}

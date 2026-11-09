import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { MediaPicker } from '@/components/admin/cms/MediaPicker';
import { StatusBadge } from '@/components/admin/cms/StatusBadge';
import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { Textarea } from '@/components/forms/Textarea';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ADMIN_ROUTES } from '@/config/adminRoutes';
import { queryKeys } from '@/services/api/queryKeys';
import {
  createAdminPost,
  getAdminPost,
  listAdminCategories,
  updateAdminPost,
} from '@/services/cms/adminBlogService';
import { getErrorMessage } from '@/utils/apiMessage';
import { applyApiFieldErrors } from '@/utils/formErrors';

const postFormSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(255),
  slug: z.string().trim().max(255).optional(),
  excerpt: z.string().trim().max(500).optional().nullable(),
  content: z.string().min(1, 'content is required'),
  categoryId: z.string().optional(),
  featuredImageId: z.number().int().positive().nullable().optional(),
});

type PostFormValues = z.input<typeof postFormSchema>;

export default function AdminBlogEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const postId = !isNew ? Number(id) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: postId ? queryKeys.cms.posts.detail(postId) : ['cms', 'posts', 'new'],
    queryFn: ({ signal }) => getAdminPost(postId!, { includeDeleted: true }, { signal }),
    enabled: postId != null && Number.isFinite(postId),
    select: (response) => response.data.post,
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.cms.categories.list({}),
    queryFn: ({ signal }) => listAdminCategories({}, { signal }),
    select: (response) => response.data.categories,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      categoryId: '',
      featuredImageId: null,
    },
  });

  useEffect(() => {
    if (detailQuery.data) {
      reset({
        title: detailQuery.data.title,
        slug: detailQuery.data.slug,
        excerpt: detailQuery.data.excerpt ?? '',
        content: detailQuery.data.content,
        categoryId: detailQuery.data.categoryId ? String(detailQuery.data.categoryId) : '',
        featuredImageId: detailQuery.data.featuredImageId,
      });
    }
  }, [detailQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: async (values: PostFormValues) => {
      const parsed = postFormSchema.parse(values);
      const body = {
        title: parsed.title,
        content: parsed.content,
        excerpt: parsed.excerpt && parsed.excerpt.length > 0 ? parsed.excerpt : null,
        categoryId: parsed.categoryId ? Number(parsed.categoryId) : null,
        featuredImageId: parsed.featuredImageId ?? null,
        ...(parsed.slug && parsed.slug.length > 0 ? { slug: parsed.slug } : {}),
      };
      if (isNew) return createAdminPost(body);
      return updateAdminPost(postId!, body);
    },
    onSuccess: async (response) => {
      setFormError(null);
      setSuccessMessage(response.message);
      await queryClient.invalidateQueries({ queryKey: queryKeys.cms.posts.all });
      if (isNew) {
        void navigate(ADMIN_ROUTES.blogEdit(response.data.post.id), { replace: true });
      }
    },
    onError: (error) => {
      setSuccessMessage(null);
      const applied = applyApiFieldErrors(error, setError);
      if (!applied) setFormError(getErrorMessage(error, 'Unable to save post.'));
    },
  });

  const busy = isSubmitting || saveMutation.isPending;

  if (!isNew && detailQuery.isLoading) return <LoadingState message="Loading post…" />;
  if (!isNew && detailQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(detailQuery.error, 'Unable to load post.')}
        onRetry={() => void detailQuery.refetch()}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <CmsSectionHeader
        title={isNew ? 'New blog post' : 'Edit blog post'}
        description="Content is stored as text. Featured images reference media assets from the media library."
      >
        <Link to={ADMIN_ROUTES.blogs}>
          <Button type="button" variant="ghost" size="md">
            Back to posts
          </Button>
        </Link>
      </CmsSectionHeader>

      {!isNew && detailQuery.data ? (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <StatusBadge status={detailQuery.data.status} />
          <span className="text-caption text-on-surface-variant">ID {detailQuery.data.id}</span>
        </div>
      ) : null}

      <form
        className="space-y-5 border border-outline-variant/40 bg-surface-container-lowest p-6"
        onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
        noValidate
      >
        <FormField id="post-title" label="Title" required error={errors.title?.message}>
          <Input
            id="post-title"
            disabled={busy}
            hasError={Boolean(errors.title)}
            {...register('title')}
          />
        </FormField>
        <FormField
          id="post-slug"
          label="Slug"
          hint="Optional. Backend can generate from title."
          error={errors.slug?.message}
        >
          <Input
            id="post-slug"
            disabled={busy}
            hasError={Boolean(errors.slug)}
            {...register('slug')}
          />
        </FormField>
        <FormField id="post-excerpt" label="Excerpt" error={errors.excerpt?.message}>
          <Textarea id="post-excerpt" rows={3} disabled={busy} {...register('excerpt')} />
        </FormField>
        <FormField
          id="post-category"
          label="Category"
          hint="Required before publish. Drafts may be saved without a category."
          error={errors.categoryId?.message}
        >
          <Select id="post-category" disabled={busy} {...register('categoryId')}>
            <option value="">No category</option>
            {(categoriesQuery.data ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="post-image" label="Featured image">
          <Controller
            control={control}
            name="featuredImageId"
            render={({ field }) => (
              <MediaPicker value={field.value ?? null} onChange={field.onChange} disabled={busy} />
            )}
          />
        </FormField>
        <FormField id="post-content" label="Content" required error={errors.content?.message}>
          <Textarea
            id="post-content"
            rows={14}
            disabled={busy}
            hasError={Boolean(errors.content)}
            {...register('content')}
          />
        </FormField>
        {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
        {successMessage ? <FormAlert tone="success">{successMessage}</FormAlert> : null}
        <Button type="submit" variant="primary" size="lg" isLoading={busy} disabled={busy}>
          {isNew ? 'Create post' : 'Save changes'}
        </Button>
      </form>
    </div>
  );
}

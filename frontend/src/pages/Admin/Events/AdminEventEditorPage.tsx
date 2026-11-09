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
import { Textarea } from '@/components/forms/Textarea';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ADMIN_ROUTES } from '@/config/adminRoutes';
import { queryKeys } from '@/services/api/queryKeys';
import {
  createAdminEvent,
  getAdminEvent,
  updateAdminEvent,
} from '@/services/cms/adminEventService';
import { getErrorMessage } from '@/utils/apiMessage';
import { applyApiFieldErrors } from '@/utils/formErrors';

function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString();
}

const eventFormSchema = z
  .object({
    title: z.string().trim().min(1).max(255),
    slug: z.string().trim().max(255).optional(),
    description: z.string().trim().min(1).max(20000),
    location: z.string().trim().max(255).optional().nullable(),
    startsAtLocal: z.string().min(1, 'startsAt is required'),
    endsAtLocal: z.string().optional().nullable(),
    featuredImageId: z.number().int().positive().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.endsAtLocal) return;
    if (new Date(data.endsAtLocal).getTime() < new Date(data.startsAtLocal).getTime()) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAtLocal'],
        message: 'endsAt must not be earlier than startsAt',
      });
    }
  });

type EventFormValues = z.input<typeof eventFormSchema>;

export default function AdminEventEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const eventId = !isNew ? Number(id) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: eventId ? queryKeys.cms.events.detail(eventId) : ['cms', 'events', 'new'],
    queryFn: ({ signal }) => getAdminEvent(eventId!, { includeDeleted: true }, { signal }),
    enabled: eventId != null && Number.isFinite(eventId),
    select: (response) => response.data.event,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: '',
      slug: '',
      description: '',
      location: '',
      startsAtLocal: '',
      endsAtLocal: '',
      featuredImageId: null,
    },
  });

  useEffect(() => {
    if (detailQuery.data) {
      reset({
        title: detailQuery.data.title,
        slug: detailQuery.data.slug,
        description: detailQuery.data.description,
        location: detailQuery.data.location ?? '',
        startsAtLocal: toLocalInputValue(detailQuery.data.startsAt),
        endsAtLocal: toLocalInputValue(detailQuery.data.endsAt),
        featuredImageId: detailQuery.data.featuredImageId,
      });
    }
  }, [detailQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: async (values: EventFormValues) => {
      const parsed = eventFormSchema.parse(values);
      const body = {
        title: parsed.title,
        description: parsed.description,
        location: parsed.location && parsed.location.length > 0 ? parsed.location : null,
        startsAt: fromLocalInputValue(parsed.startsAtLocal),
        endsAt: parsed.endsAtLocal ? fromLocalInputValue(parsed.endsAtLocal) : null,
        featuredImageId: parsed.featuredImageId ?? null,
        ...(parsed.slug && parsed.slug.length > 0 ? { slug: parsed.slug } : {}),
      };
      if (isNew) return createAdminEvent(body);
      return updateAdminEvent(eventId!, body);
    },
    onSuccess: async (response) => {
      setFormError(null);
      setSuccessMessage(response.message);
      await queryClient.invalidateQueries({ queryKey: queryKeys.cms.events.all });
      if (isNew) void navigate(ADMIN_ROUTES.eventEdit(response.data.event.id), { replace: true });
    },
    onError: (error) => {
      setSuccessMessage(null);
      const applied = applyApiFieldErrors(error, setError);
      if (!applied) setFormError(getErrorMessage(error, 'Unable to save event.'));
    },
  });

  const busy = isSubmitting || saveMutation.isPending;

  if (!isNew && detailQuery.isLoading) return <LoadingState message="Loading event…" />;
  if (!isNew && detailQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(detailQuery.error, 'Unable to load event.')}
        onRetry={() => void detailQuery.refetch()}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <CmsSectionHeader
        title={isNew ? 'New event' : 'Edit event'}
        description="Dates are sent to the backend as ISO-8601 timestamps."
      >
        <Link to={ADMIN_ROUTES.events}>
          <Button type="button" variant="ghost" size="md">
            Back to events
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
        <FormField id="event-title" label="Title" required error={errors.title?.message}>
          <Input id="event-title" disabled={busy} {...register('title')} />
        </FormField>
        <FormField id="event-slug" label="Slug" hint="Optional" error={errors.slug?.message}>
          <Input id="event-slug" disabled={busy} {...register('slug')} />
        </FormField>
        <FormField id="event-location" label="Location" error={errors.location?.message}>
          <Input id="event-location" disabled={busy} {...register('location')} />
        </FormField>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            id="event-starts"
            label="Starts at"
            required
            error={errors.startsAtLocal?.message}
          >
            <Input
              id="event-starts"
              type="datetime-local"
              disabled={busy}
              {...register('startsAtLocal')}
            />
          </FormField>
          <FormField id="event-ends" label="Ends at" error={errors.endsAtLocal?.message}>
            <Input
              id="event-ends"
              type="datetime-local"
              disabled={busy}
              {...register('endsAtLocal')}
            />
          </FormField>
        </div>
        <FormField id="event-image" label="Featured image">
          <Controller
            control={control}
            name="featuredImageId"
            render={({ field }) => (
              <MediaPicker value={field.value ?? null} onChange={field.onChange} disabled={busy} />
            )}
          />
        </FormField>
        <FormField
          id="event-description"
          label="Description"
          required
          error={errors.description?.message}
        >
          <Textarea id="event-description" rows={10} disabled={busy} {...register('description')} />
        </FormField>
        {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
        {successMessage ? <FormAlert tone="success">{successMessage}</FormAlert> : null}
        <Button type="submit" variant="primary" size="lg" isLoading={busy} disabled={busy}>
          {isNew ? 'Create event' : 'Save changes'}
        </Button>
      </form>
    </div>
  );
}

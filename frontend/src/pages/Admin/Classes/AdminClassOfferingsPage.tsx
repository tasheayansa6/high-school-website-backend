import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { ConfirmDialog } from '@/components/admin/cms/ConfirmDialog';
import { PaginationControls } from '@/components/admin/sms/PaginationControls';
import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import {
  useAcademicYearOptions,
  useGradeLevelOptions,
  useSectionOptions,
  useTeacherOptions,
} from '@/hooks/useSmsReferenceData';
import { queryKeys } from '@/services/api/queryKeys';
import {
  createClassOffering,
  deleteClassOffering,
  listClassOfferings,
  updateClassOffering,
} from '@/services/sms/classOfferingService';
import type { ClassOfferingListQuery, SmsClassOffering } from '@/types/sms.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { applyApiFieldErrors } from '@/utils/formErrors';
import { teacherLabel } from '@/utils/smsFormat';

const classSchema = z.object({
  academicYearId: z.string().min(1, 'Academic year is required'),
  gradeLevelId: z.string().min(1, 'Grade level is required'),
  sectionId: z.string().min(1, 'Section is required'),
  name: z.string().trim().max(150, 'Name must be at most 150 characters'),
  homeroomTeacherId: z.string(),
});

type ClassFormValues = z.input<typeof classSchema>;

const EMPTY_VALUES: ClassFormValues = {
  academicYearId: '',
  gradeLevelId: '',
  sectionId: '',
  name: '',
  homeroomTeacherId: '',
};
const PAGE_SIZE = 20;

interface Filters {
  academicYearId: string;
  gradeLevelId: string;
  sectionId: string;
  homeroomTeacherId: string;
}

const EMPTY_FILTERS: Filters = {
  academicYearId: '',
  gradeLevelId: '',
  sectionId: '',
  homeroomTeacherId: '',
};

export default function AdminClassOfferingsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<SmsClassOffering | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SmsClassOffering | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const years = useAcademicYearOptions();
  const grades = useGradeLevelOptions();
  const sections = useSectionOptions();
  const teachers = useTeacherOptions();

  const query = useMemo<ClassOfferingListQuery>(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(filters.academicYearId ? { academicYearId: Number(filters.academicYearId) } : {}),
      ...(filters.gradeLevelId ? { gradeLevelId: Number(filters.gradeLevelId) } : {}),
      ...(filters.sectionId ? { sectionId: Number(filters.sectionId) } : {}),
      ...(filters.homeroomTeacherId
        ? { homeroomTeacherId: Number(filters.homeroomTeacherId) }
        : {}),
    }),
    [page, filters],
  );

  const listQuery = useQuery({
    queryKey: queryKeys.sms.classOfferings.list({ ...query }),
    queryFn: ({ signal }) => listClassOfferings(query, { signal }),
    select: (response) => response.data,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: EMPTY_VALUES,
  });

  // Preselect the current academic year on the create form once years are loaded.
  useEffect(() => {
    if (editing || getValues('academicYearId')) return;
    const current = years.data?.find((year) => year.isCurrent);
    if (current) setValue('academicYearId', String(current.id));
  }, [years.data, editing, getValues, setValue]);

  function startEdit(item: SmsClassOffering) {
    setEditing(item);
    reset({
      academicYearId: String(item.academicYearId),
      gradeLevelId: String(item.gradeLevelId),
      sectionId: String(item.sectionId),
      name: item.name,
      homeroomTeacherId: item.homeroomTeacherId ? String(item.homeroomTeacherId) : '',
    });
    setActionError(null);
    setActionSuccess(null);
  }

  function startCreate() {
    setEditing(null);
    const current = years.data?.find((year) => year.isCurrent);
    reset({ ...EMPTY_VALUES, academicYearId: current ? String(current.id) : '' });
  }

  const saveMutation = useMutation({
    mutationFn: async (values: ClassFormValues) => {
      const parsed = classSchema.parse(values);
      const homeroomTeacherId =
        parsed.homeroomTeacherId === '' ? null : Number(parsed.homeroomTeacherId);
      if (editing) {
        return updateClassOffering(editing.id, {
          ...(parsed.name.length > 0 ? { name: parsed.name } : {}),
          homeroomTeacherId,
        });
      }
      return createClassOffering({
        academicYearId: Number(parsed.academicYearId),
        gradeLevelId: Number(parsed.gradeLevelId),
        sectionId: Number(parsed.sectionId),
        homeroomTeacherId,
        ...(parsed.name.length > 0 ? { name: parsed.name } : {}),
      });
    },
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      startCreate();
      await queryClient.invalidateQueries({ queryKey: queryKeys.sms.classOfferings.all });
    },
    onError: (error) => {
      setActionSuccess(null);
      const applied = applyApiFieldErrors(error, setError);
      if (!applied) setActionError(getErrorMessage(error, 'Unable to save class offering.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteClassOffering(id),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      if (editing && pendingDelete?.id === editing.id) startCreate();
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.sms.classOfferings.all });
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(getErrorMessage(error, 'Unable to delete class offering.'));
      setPendingDelete(null);
    },
  });

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  const busy = isSubmitting || saveMutation.isPending;
  const items = listQuery.data?.items ?? [];
  const refsLoading = years.isLoading || grades.isLoading || sections.isLoading;
  const refsError = years.error ?? grades.error ?? sections.error;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="School management"
        title="Classes"
        description="A class offering is a grade level and section in an academic year. Classes with teaching assignments or enrollments cannot be deleted."
      />

      {actionError ? (
        <FormAlert tone="error" className="mb-4">
          {actionError}
        </FormAlert>
      ) : null}
      {actionSuccess ? (
        <FormAlert tone="success" className="mb-4">
          {actionSuccess}
        </FormAlert>
      ) : null}
      {refsError ? (
        <ErrorState
          className="mb-4"
          message={getErrorMessage(refsError, 'Unable to load academic setup data.')}
          onRetry={() => {
            void years.refetch();
            void grades.refetch();
            void sections.refetch();
          }}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <form
          className="space-y-4 border border-outline-variant/40 bg-surface-container-lowest p-5 lg:col-span-2"
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          noValidate
        >
          <h2 className="font-display text-headline-sm text-primary">
            {editing ? `Edit: ${editing.name}` : 'Create class'}
          </h2>
          {editing ? (
            <p className="text-caption text-on-surface-variant">
              Academic year, grade level, and section cannot be changed after creation.
            </p>
          ) : null}
          <FormField
            id="class-year"
            label="Academic year"
            required
            error={errors.academicYearId?.message}
          >
            <Select
              id="class-year"
              disabled={busy || editing !== null || refsLoading}
              hasError={Boolean(errors.academicYearId)}
              {...register('academicYearId')}
            >
              <option value="">Select academic year</option>
              {(years.data ?? []).map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                  {year.isCurrent ? ' (current)' : ''}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              id="class-grade"
              label="Grade level"
              required
              error={errors.gradeLevelId?.message}
            >
              <Select
                id="class-grade"
                disabled={busy || editing !== null || refsLoading}
                hasError={Boolean(errors.gradeLevelId)}
                {...register('gradeLevelId')}
              >
                <option value="">Select grade</option>
                {(grades.data ?? []).map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              id="class-section"
              label="Section"
              required
              error={errors.sectionId?.message}
            >
              <Select
                id="class-section"
                disabled={busy || editing !== null || refsLoading}
                hasError={Boolean(errors.sectionId)}
                {...register('sectionId')}
              >
                <option value="">Select section</option>
                {(sections.data ?? []).map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField
            id="class-name"
            label="Name"
            hint={
              editing ? undefined : 'Optional. Generated from grade, section, and year when blank.'
            }
            error={errors.name?.message}
          >
            <Input id="class-name" disabled={busy} {...register('name')} />
          </FormField>
          <FormField
            id="class-homeroom"
            label="Homeroom teacher"
            hint={
              teachers.canListTeachers
                ? 'Optional.'
                : 'Teacher list requires the teachers:manage permission.'
            }
            error={errors.homeroomTeacherId?.message}
          >
            <Select
              id="class-homeroom"
              disabled={busy || !teachers.canListTeachers || teachers.isLoading}
              {...register('homeroomTeacherId')}
            >
              <option value="">No homeroom teacher</option>
              {(teachers.data ?? []).map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacherLabel(teacher)}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="primary" size="md" isLoading={busy} disabled={busy}>
              {editing ? 'Save class' : 'Create class'}
            </Button>
            {editing ? (
              <Button type="button" variant="ghost" size="md" onClick={startCreate} disabled={busy}>
                Cancel edit
              </Button>
            ) : null}
          </div>
        </form>

        <div className="lg:col-span-3">
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <FormField id="filter-year" label="Academic year">
              <Select
                id="filter-year"
                value={filters.academicYearId}
                onChange={(e) => updateFilter('academicYearId', e.target.value)}
              >
                <option value="">All years</option>
                {(years.data ?? []).map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="filter-grade" label="Grade level">
              <Select
                id="filter-grade"
                value={filters.gradeLevelId}
                onChange={(e) => updateFilter('gradeLevelId', e.target.value)}
              >
                <option value="">All grades</option>
                {(grades.data ?? []).map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="filter-section" label="Section">
              <Select
                id="filter-section"
                value={filters.sectionId}
                onChange={(e) => updateFilter('sectionId', e.target.value)}
              >
                <option value="">All sections</option>
                {(sections.data ?? []).map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="filter-homeroom" label="Homeroom teacher">
              <Select
                id="filter-homeroom"
                value={filters.homeroomTeacherId}
                disabled={!teachers.canListTeachers}
                onChange={(e) => updateFilter('homeroomTeacherId', e.target.value)}
              >
                <option value="">All teachers</option>
                {(teachers.data ?? []).map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacherLabel(teacher)}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {listQuery.isLoading ? <LoadingState message="Loading classes…" /> : null}
          {listQuery.isError ? (
            <ErrorState
              message={getErrorMessage(listQuery.error, 'Unable to load classes.')}
              onRetry={() => void listQuery.refetch()}
            />
          ) : null}
          {listQuery.isSuccess && items.length === 0 ? (
            <EmptyState
              title="No classes found"
              description="Create a class offering or adjust the filters."
            />
          ) : null}
          {items.length > 0 ? (
            <ul className="divide-y divide-outline-variant/30 border border-outline-variant/40 bg-surface-container-lowest">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-3 px-4 py-4"
                >
                  <div>
                    <p className="font-sans text-body-md text-primary">{item.name}</p>
                    <p className="text-caption text-on-surface-variant">
                      {item.academicYear?.name ?? `Year #${item.academicYearId}`} ·{' '}
                      {item.gradeLevel?.name ?? `Grade #${item.gradeLevelId}`} ·{' '}
                      {item.section?.name ?? `Section #${item.sectionId}`}
                    </p>
                    <p className="text-caption text-on-surface-variant">
                      Homeroom:{' '}
                      {item.homeroomTeacher ? teacherLabel(item.homeroomTeacher) : 'Not assigned'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="md" onClick={() => startEdit(item)}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      onClick={() => setPendingDelete(item)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          <PaginationControls pagination={listQuery.data?.pagination} onPageChange={setPage} />
          <p className="mt-3 font-sans text-caption text-on-surface-variant">
            Restore is not provided by the backend for class offerings.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this class?"
        description={`${pendingDelete?.name ?? 'This class'} will be soft-deleted. Deletion fails while teaching assignments or enrollments exist.`}
        confirmLabel="Delete class"
        busy={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
        }}
      />
    </div>
  );
}

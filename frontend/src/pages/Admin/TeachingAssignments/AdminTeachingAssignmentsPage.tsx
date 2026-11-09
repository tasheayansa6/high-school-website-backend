import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { ConfirmDialog } from '@/components/admin/cms/ConfirmDialog';
import { PaginationControls } from '@/components/admin/sms/PaginationControls';
import { Checkbox } from '@/components/forms/Checkbox';
import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Select } from '@/components/forms/Select';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import {
  REFERENCE_LIMIT,
  useClassOfferingOptions,
  useSubjectOptions,
  useTeacherOptions,
} from '@/hooks/useSmsReferenceData';
import { queryKeys } from '@/services/api/queryKeys';
import { listAcademicTerms } from '@/services/sms/academicYearService';
import {
  createTeachingAssignment,
  deleteTeachingAssignment,
  listTeachingAssignments,
} from '@/services/sms/teachingAssignmentService';
import type { SmsTeachingAssignment, TeachingAssignmentListQuery } from '@/types/sms.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { applyApiFieldErrors } from '@/utils/formErrors';
import { teacherLabel } from '@/utils/smsFormat';

const assignmentSchema = z.object({
  teacherId: z.string().min(1, 'Teacher is required'),
  classOfferingId: z.string().min(1, 'Class is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  academicTermId: z.string(),
  isPrimary: z.boolean(),
});

type AssignmentFormValues = z.input<typeof assignmentSchema>;

const EMPTY_VALUES: AssignmentFormValues = {
  teacherId: '',
  classOfferingId: '',
  subjectId: '',
  academicTermId: '',
  isPrimary: false,
};
const PAGE_SIZE = 20;

interface Filters {
  teacherId: string;
  classOfferingId: string;
  subjectId: string;
}

const EMPTY_FILTERS: Filters = { teacherId: '', classOfferingId: '', subjectId: '' };

export default function AdminTeachingAssignmentsPage() {
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<SmsTeachingAssignment | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const teachers = useTeacherOptions();
  const subjects = useSubjectOptions();
  const classes = useClassOfferingOptions();

  const query = useMemo<TeachingAssignmentListQuery>(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(filters.teacherId ? { teacherId: Number(filters.teacherId) } : {}),
      ...(filters.classOfferingId ? { classOfferingId: Number(filters.classOfferingId) } : {}),
      ...(filters.subjectId ? { subjectId: Number(filters.subjectId) } : {}),
    }),
    [page, filters],
  );

  const listQuery = useQuery({
    queryKey: queryKeys.sms.teachingAssignments.list({ ...query }),
    queryFn: ({ signal }) => listTeachingAssignments(query, { signal }),
    select: (response) => response.data,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: EMPTY_VALUES,
  });

  const selectedClassId = useWatch({ control, name: 'classOfferingId' });
  const selectedClass = (classes.data ?? []).find((item) => String(item.id) === selectedClassId);

  const termsQuery = useQuery({
    queryKey: queryKeys.sms.academicYears.terms(selectedClass?.academicYearId ?? 0),
    queryFn: ({ signal }) => listAcademicTerms(selectedClass!.academicYearId, { signal }),
    select: (response) => response.data.items,
    enabled: selectedClass != null,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: AssignmentFormValues) => {
      const parsed = assignmentSchema.parse(values);
      return createTeachingAssignment({
        teacherId: Number(parsed.teacherId),
        classOfferingId: Number(parsed.classOfferingId),
        subjectId: Number(parsed.subjectId),
        academicTermId: parsed.academicTermId === '' ? null : Number(parsed.academicTermId),
        isPrimary: parsed.isPrimary,
      });
    },
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      reset(EMPTY_VALUES);
      await queryClient.invalidateQueries({ queryKey: queryKeys.sms.teachingAssignments.all });
    },
    onError: (error) => {
      setActionSuccess(null);
      const applied = applyApiFieldErrors(error, setError);
      if (!applied) setActionError(getErrorMessage(error, 'Unable to create assignment.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTeachingAssignment(id),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.sms.teachingAssignments.all });
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(getErrorMessage(error, 'Unable to remove assignment.'));
      setPendingDelete(null);
    },
  });

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  const busy = isSubmitting || saveMutation.isPending;
  const items = listQuery.data?.items ?? [];
  const refsLoading = teachers.isLoading || subjects.isLoading || classes.isLoading;
  const refsError = teachers.error ?? subjects.error ?? classes.error;
  const mayBeTruncated = [teachers.data, subjects.data, classes.data].some(
    (list) => (list?.length ?? 0) >= REFERENCE_LIMIT,
  );

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="School management"
        title="Teacher Assignments"
        description="Assign teachers to a subject in a class, optionally scoped to a term. Assignments cannot be edited; remove and recreate instead."
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
      {!teachers.canListTeachers ? (
        <FormAlert tone="info" className="mb-4">
          Your role cannot list teachers (teachers:manage is required), so new assignments cannot be
          created here.
        </FormAlert>
      ) : null}
      {mayBeTruncated ? (
        <FormAlert tone="info" className="mb-4">
          Pickers show the first {REFERENCE_LIMIT} records of each list.
        </FormAlert>
      ) : null}
      {refsError ? (
        <ErrorState
          className="mb-4"
          message={getErrorMessage(refsError, 'Unable to load teachers, classes, or subjects.')}
          onRetry={() => {
            void teachers.refetch();
            void subjects.refetch();
            void classes.refetch();
          }}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <form
          className="space-y-4 border border-outline-variant/40 bg-surface-container-lowest p-5 lg:col-span-2"
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          noValidate
        >
          <h2 className="font-display text-headline-sm text-primary">Create assignment</h2>
          <FormField id="assign-teacher" label="Teacher" required error={errors.teacherId?.message}>
            <Select
              id="assign-teacher"
              disabled={busy || refsLoading || !teachers.canListTeachers}
              hasError={Boolean(errors.teacherId)}
              {...register('teacherId')}
            >
              <option value="">Select teacher</option>
              {(teachers.data ?? []).map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacherLabel(teacher)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            id="assign-class"
            label="Class"
            required
            error={errors.classOfferingId?.message}
          >
            <Select
              id="assign-class"
              disabled={busy || refsLoading}
              hasError={Boolean(errors.classOfferingId)}
              {...register('classOfferingId', {
                onChange: () => setValue('academicTermId', ''),
              })}
            >
              <option value="">Select class</option>
              {(classes.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="assign-subject" label="Subject" required error={errors.subjectId?.message}>
            <Select
              id="assign-subject"
              disabled={busy || refsLoading}
              hasError={Boolean(errors.subjectId)}
              {...register('subjectId')}
            >
              <option value="">Select subject</option>
              {(subjects.data ?? []).map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.code})
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            id="assign-term"
            label="Term"
            hint="Optional. Leave empty for the whole academic year."
            error={errors.academicTermId?.message}
          >
            <Select
              id="assign-term"
              disabled={busy || selectedClass == null || termsQuery.isLoading}
              {...register('academicTermId')}
            >
              <option value="">Whole year</option>
              {(termsQuery.data ?? []).map((term) => (
                <option key={term.id} value={term.id}>
                  {term.sequence}. {term.name}
                </option>
              ))}
            </Select>
          </FormField>
          <Checkbox
            id="assign-primary"
            label="Primary teacher"
            description="Marks this teacher as the primary teacher for the subject."
            disabled={busy}
            {...register('isPrimary')}
          />
          <Button type="submit" variant="primary" size="md" isLoading={busy} disabled={busy}>
            Create assignment
          </Button>
        </form>

        <div className="lg:col-span-3">
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <FormField id="filter-teacher" label="Teacher">
              <Select
                id="filter-teacher"
                value={filters.teacherId}
                disabled={!teachers.canListTeachers}
                onChange={(e) => updateFilter('teacherId', e.target.value)}
              >
                <option value="">All teachers</option>
                {(teachers.data ?? []).map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacherLabel(teacher)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="filter-class" label="Class">
              <Select
                id="filter-class"
                value={filters.classOfferingId}
                onChange={(e) => updateFilter('classOfferingId', e.target.value)}
              >
                <option value="">All classes</option>
                {(classes.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="filter-subject" label="Subject">
              <Select
                id="filter-subject"
                value={filters.subjectId}
                onChange={(e) => updateFilter('subjectId', e.target.value)}
              >
                <option value="">All subjects</option>
                {(subjects.data ?? []).map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {listQuery.isLoading ? <LoadingState message="Loading assignments…" /> : null}
          {listQuery.isError ? (
            <ErrorState
              message={getErrorMessage(listQuery.error, 'Unable to load assignments.')}
              onRetry={() => void listQuery.refetch()}
            />
          ) : null}
          {listQuery.isSuccess && items.length === 0 ? (
            <EmptyState
              title="No assignments found"
              description="Create an assignment or adjust the filters."
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
                    <p className="font-sans text-body-md text-primary">
                      {item.teacher ? teacherLabel(item.teacher) : `Teacher #${item.teacherId}`}
                      {item.isPrimary ? ' · Primary' : ''}
                    </p>
                    <p className="text-caption text-on-surface-variant">
                      {item.subject?.name ?? `Subject #${item.subjectId}`} ·{' '}
                      {item.classOffering?.name ?? `Class #${item.classOfferingId}`}
                    </p>
                    <p className="text-caption text-on-surface-variant">
                      {item.academicTerm
                        ? `Term ${item.academicTerm.sequence}: ${item.academicTerm.name}`
                        : 'Whole academic year'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => setPendingDelete(item)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          <PaginationControls pagination={listQuery.data?.pagination} onPageChange={setPage} />
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove this assignment?"
        description={
          pendingDelete
            ? `${pendingDelete.subject?.name ?? 'Subject'} in ${pendingDelete.classOffering?.name ?? 'this class'} will be unassigned from ${pendingDelete.teacher ? teacherLabel(pendingDelete.teacher) : 'the teacher'}. You can create it again later.`
            : ''
        }
        confirmLabel="Remove assignment"
        busy={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
        }}
      />
    </div>
  );
}

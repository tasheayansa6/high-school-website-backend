import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { ConfirmDialog } from '@/components/admin/cms/ConfirmDialog';
import { StatusBadge } from '@/components/admin/cms/StatusBadge';
import { PaginationControls } from '@/components/admin/sms/PaginationControls';
import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/hooks/useAuth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAcademicYearOptions, useClassOfferingOptions } from '@/hooks/useSmsReferenceData';
import { queryKeys } from '@/services/api/queryKeys';
import {
  createEnrollment,
  deleteEnrollment,
  listEnrollments,
  updateEnrollmentStatus,
} from '@/services/sms/enrollmentService';
import { listStudents } from '@/services/sms/studentService';
import {
  ENROLLMENT_STATUSES,
  type EnrollmentListQuery,
  type EnrollmentStatus,
  type SmsEnrollment,
  type SmsStudent,
} from '@/types/sms.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { applyApiFieldErrors } from '@/utils/formErrors';
import { formatDateOnly, personName, toDateInputValue } from '@/utils/smsFormat';

const enrollmentSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  classOfferingId: z.string().min(1, 'Class is required'),
  status: z.enum(ENROLLMENT_STATUSES),
  enrolledAt: z.string(),
});

type EnrollmentFormValues = z.input<typeof enrollmentSchema>;

const EMPTY_VALUES: EnrollmentFormValues = {
  studentId: '',
  classOfferingId: '',
  status: 'ACTIVE',
  enrolledAt: '',
};

const statusSchema = z.object({
  status: z.enum(ENROLLMENT_STATUSES),
  leftAt: z.string(),
});

type StatusFormValues = z.input<typeof statusSchema>;

const PAGE_SIZE = 20;

interface Filters {
  academicYearId: string;
  classOfferingId: string;
  status: '' | EnrollmentStatus;
}

const EMPTY_FILTERS: Filters = { academicYearId: '', classOfferingId: '', status: '' };

function StatusUpdateForm({
  enrollment,
  onDone,
  onSuccess,
}: {
  enrollment: SmsEnrollment;
  onDone: () => void;
  onSuccess: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<StatusFormValues>({
    resolver: zodResolver(statusSchema),
    defaultValues: {
      status: enrollment.status,
      leftAt: toDateInputValue(enrollment.leftAt),
    },
  });
  const nextStatus = useWatch({ control, name: 'status' });

  const mutation = useMutation({
    mutationFn: async (values: StatusFormValues) => {
      const parsed = statusSchema.parse(values);
      return updateEnrollmentStatus(enrollment.id, {
        status: parsed.status,
        ...(parsed.status !== 'ACTIVE' && parsed.leftAt ? { leftAt: parsed.leftAt } : {}),
      });
    },
    onSuccess: async (response) => {
      onSuccess(response.message);
      onDone();
      await queryClient.invalidateQueries({ queryKey: queryKeys.sms.enrollments.all });
    },
    onError: (error) => {
      const applied = applyApiFieldErrors(error, setError);
      if (!applied) setFormError(getErrorMessage(error, 'Unable to update enrollment status.'));
    },
  });

  const busy = isSubmitting || mutation.isPending;

  return (
    <form
      className="mt-6 space-y-4 border border-outline-variant/40 bg-surface-container-lowest p-5"
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      noValidate
    >
      <h2 className="font-display text-headline-sm text-primary">Change status</h2>
      <p className="text-caption text-on-surface-variant">
        {enrollment.student ? personName(enrollment.student) : `Student #${enrollment.studentId}`} ·{' '}
        {enrollment.classOffering?.name ?? `Class #${enrollment.classOfferingId}`}
      </p>
      <FormField id="status-value" label="Status" required error={errors.status?.message}>
        <Select id="status-value" disabled={busy} {...register('status')}>
          {ENROLLMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
      </FormField>
      {nextStatus !== 'ACTIVE' ? (
        <FormField
          id="status-left"
          label="Left on"
          hint="Optional. Defaults to the existing date or today."
          error={errors.leftAt?.message}
        >
          <Input id="status-left" type="date" disabled={busy} {...register('leftAt')} />
        </FormField>
      ) : null}
      {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="primary" size="md" isLoading={busy} disabled={busy}>
          Update status
        </Button>
        <Button type="button" variant="ghost" size="md" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function AdminEnrollmentsPage() {
  const queryClient = useQueryClient();
  const canListStudents = usePermission(PERMISSIONS.STUDENTS_MANAGE);
  const [statusTarget, setStatusTarget] = useState<SmsEnrollment | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SmsEnrollment | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [studentSearch, setStudentSearch] = useState('');
  const [chosenStudent, setChosenStudent] = useState<SmsStudent | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(studentSearch.trim(), 300);

  const years = useAcademicYearOptions();
  const classes = useClassOfferingOptions();

  const studentQuery = useMemo(
    () => ({
      page: 1,
      limit: 50,
      sortBy: 'lastName' as const,
      sortOrder: 'asc' as const,
      ...(debouncedSearch ? { q: debouncedSearch } : {}),
    }),
    [debouncedSearch],
  );
  const students = useQuery({
    queryKey: queryKeys.sms.students.list({ ...studentQuery }),
    queryFn: ({ signal }) => listStudents(studentQuery, { signal }),
    select: (response) => response.data.items,
    enabled: canListStudents,
  });

  const query = useMemo<EnrollmentListQuery>(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(filters.academicYearId ? { academicYearId: Number(filters.academicYearId) } : {}),
      ...(filters.classOfferingId ? { classOfferingId: Number(filters.classOfferingId) } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    }),
    [page, filters],
  );

  const listQuery = useQuery({
    queryKey: queryKeys.sms.enrollments.list({ ...query }),
    queryFn: ({ signal }) => listEnrollments(query, { signal }),
    select: (response) => response.data,
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EnrollmentFormValues>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: EMPTY_VALUES,
  });

  const selectedClassId = useWatch({ control, name: 'classOfferingId' });
  const selectedClass = (classes.data ?? []).find((item) => String(item.id) === selectedClassId);

  const studentOptions = useMemo(() => {
    const list = students.data ?? [];
    if (chosenStudent && !list.some((student) => student.id === chosenStudent.id)) {
      return [chosenStudent, ...list];
    }
    return list;
  }, [students.data, chosenStudent]);

  const saveMutation = useMutation({
    mutationFn: async (values: EnrollmentFormValues) => {
      const parsed = enrollmentSchema.parse(values);
      const classOffering = (classes.data ?? []).find(
        (item) => String(item.id) === parsed.classOfferingId,
      );
      if (!classOffering) {
        throw new Error('Selected class is no longer available.');
      }
      return createEnrollment({
        studentId: Number(parsed.studentId),
        classOfferingId: classOffering.id,
        academicYearId: classOffering.academicYearId,
        status: parsed.status,
        ...(parsed.enrolledAt ? { enrolledAt: parsed.enrolledAt } : {}),
      });
    },
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      reset(EMPTY_VALUES);
      setChosenStudent(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.sms.enrollments.all });
    },
    onError: (error) => {
      setActionSuccess(null);
      const applied = applyApiFieldErrors(error, setError);
      if (!applied) setActionError(getErrorMessage(error, 'Unable to create enrollment.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEnrollment(id),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      if (statusTarget && pendingDelete?.id === statusTarget.id) setStatusTarget(null);
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.sms.enrollments.all });
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(getErrorMessage(error, 'Unable to remove enrollment.'));
      setPendingDelete(null);
    },
  });

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => {
      const next = { ...current, [key]: value };
      if (key === 'academicYearId') next.classOfferingId = '';
      return next;
    });
    setPage(1);
  }

  const busy = isSubmitting || saveMutation.isPending;
  const items = listQuery.data?.items ?? [];
  const filterClasses = (classes.data ?? []).filter(
    (item) => !filters.academicYearId || String(item.academicYearId) === filters.academicYearId,
  );

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="School management"
        title="Enrollments"
        description="Enroll students in class offerings and track status changes. A student can only have one enrollment per class."
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
      {!canListStudents ? (
        <FormAlert tone="info" className="mb-4">
          Your role cannot list students (students:manage is required), so new enrollments cannot be
          created here.
        </FormAlert>
      ) : null}
      {classes.isError ? (
        <ErrorState
          className="mb-4"
          message={getErrorMessage(classes.error, 'Unable to load classes.')}
          onRetry={() => void classes.refetch()}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <form
            className="space-y-4 border border-outline-variant/40 bg-surface-container-lowest p-5"
            onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
            noValidate
          >
            <h2 className="font-display text-headline-sm text-primary">Enroll a student</h2>
            <FormField
              id="enroll-student-search"
              label="Find student"
              hint="Search by name, email, or student code."
            >
              <Input
                id="enroll-student-search"
                value={studentSearch}
                disabled={busy || !canListStudents}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
            </FormField>
            <FormField
              id="enroll-student"
              label="Student"
              required
              error={errors.studentId?.message}
            >
              <Select
                id="enroll-student"
                disabled={busy || !canListStudents}
                hasError={Boolean(errors.studentId)}
                {...register('studentId', {
                  onChange: (event: { target: { value: string } }) => {
                    const id = Number(event.target.value);
                    setChosenStudent(studentOptions.find((student) => student.id === id) ?? null);
                  },
                })}
              >
                <option value="">
                  {students.isLoading ? 'Loading students…' : 'Select student'}
                </option>
                {studentOptions.map((student) => (
                  <option key={student.id} value={student.id}>
                    {personName(student)} ({student.studentCode})
                  </option>
                ))}
              </Select>
            </FormField>
            {students.isError ? (
              <FormAlert tone="error">
                {getErrorMessage(students.error, 'Unable to load students.')}
              </FormAlert>
            ) : null}
            <FormField
              id="enroll-class"
              label="Class"
              required
              hint={
                selectedClass
                  ? `Academic year: ${selectedClass.academicYear?.name ?? selectedClass.academicYearId}`
                  : undefined
              }
              error={errors.classOfferingId?.message}
            >
              <Select
                id="enroll-class"
                disabled={busy || classes.isLoading}
                hasError={Boolean(errors.classOfferingId)}
                {...register('classOfferingId')}
              >
                <option value="">Select class</option>
                {(classes.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField id="enroll-status" label="Status" error={errors.status?.message}>
                <Select id="enroll-status" disabled={busy} {...register('status')}>
                  {ENROLLMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                id="enroll-date"
                label="Enrolled on"
                hint="Optional. Defaults to today."
                error={errors.enrolledAt?.message}
              >
                <Input id="enroll-date" type="date" disabled={busy} {...register('enrolledAt')} />
              </FormField>
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={busy}
              disabled={busy || !canListStudents}
            >
              Enroll student
            </Button>
          </form>

          {statusTarget ? (
            <StatusUpdateForm
              key={statusTarget.id}
              enrollment={statusTarget}
              onDone={() => setStatusTarget(null)}
              onSuccess={(message) => {
                setActionError(null);
                setActionSuccess(message);
              }}
            />
          ) : null}
        </div>

        <div className="lg:col-span-3">
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
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
            <FormField id="filter-class" label="Class">
              <Select
                id="filter-class"
                value={filters.classOfferingId}
                onChange={(e) => updateFilter('classOfferingId', e.target.value)}
              >
                <option value="">All classes</option>
                {filterClasses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField id="filter-status" label="Status">
              <Select
                id="filter-status"
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value as Filters['status'])}
              >
                <option value="">All statuses</option>
                {ENROLLMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {listQuery.isLoading ? <LoadingState message="Loading enrollments…" /> : null}
          {listQuery.isError ? (
            <ErrorState
              message={getErrorMessage(listQuery.error, 'Unable to load enrollments.')}
              onRetry={() => void listQuery.refetch()}
            />
          ) : null}
          {listQuery.isSuccess && items.length === 0 ? (
            <EmptyState
              title="No enrollments found"
              description="Enroll a student or adjust the filters."
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
                    <p className="flex flex-wrap items-center gap-2 font-sans text-body-md text-primary">
                      {item.student ? personName(item.student) : `Student #${item.studentId}`}
                      <StatusBadge status={item.status} />
                    </p>
                    <p className="text-caption text-on-surface-variant">
                      {item.student?.studentCode ?? '—'} ·{' '}
                      {item.classOffering?.name ?? `Class #${item.classOfferingId}`}
                    </p>
                    <p className="text-caption text-on-surface-variant">
                      Enrolled {formatDateOnly(item.enrolledAt)}
                      {item.leftAt ? ` · Left ${formatDateOnly(item.leftAt)}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      onClick={() => setStatusTarget(item)}
                    >
                      Change status
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      onClick={() => setPendingDelete(item)}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          <PaginationControls pagination={listQuery.data?.pagination} onPageChange={setPage} />
          <p className="mt-3 font-sans text-caption text-on-surface-variant">
            Restore is not provided by the backend for enrollments.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove this enrollment?"
        description={
          pendingDelete
            ? `${pendingDelete.student ? personName(pendingDelete.student) : 'The student'} will be removed from ${pendingDelete.classOffering?.name ?? 'this class'}. The student can be enrolled in the same class again later.`
            : ''
        }
        confirmLabel="Remove enrollment"
        busy={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
        }}
      />
    </div>
  );
}

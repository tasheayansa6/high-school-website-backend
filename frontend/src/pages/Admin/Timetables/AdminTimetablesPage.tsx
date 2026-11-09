import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { ConfirmDialog } from '@/components/admin/cms/ConfirmDialog';
import { StatusBadge } from '@/components/admin/cms/StatusBadge';
import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { TimetableWeekGrid } from '@/components/ops/TimetableWeekGrid';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import {
  useAcademicYearOptions,
  useClassOfferingOptions,
  useSubjectOptions,
  useTeacherOptions,
} from '@/hooks/useSmsReferenceData';
import { queryKeys } from '@/services/api/queryKeys';
import { listAcademicTerms } from '@/services/sms/academicYearService';
import { listTeachingAssignments } from '@/services/sms/teachingAssignmentService';
import {
  createClassroom,
  createTimetable,
  createTimetableEntry,
  deleteTimetable,
  deleteTimetableEntry,
  getTimetable,
  listClassrooms,
  listTimetables,
  publishTimetable,
  unpublishTimetable,
  updateTimetableEntry,
} from '@/services/sms/timetableService';
import {
  type TimetableEntry,
  type Weekday,
  WEEKDAY_LABELS,
  WEEKDAYS,
} from '@/types/timetable.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { applyApiFieldErrors } from '@/utils/formErrors';
import { personName, teacherLabel } from '@/utils/smsFormat';

const createSchema = z.object({
  academicYearId: z.string().min(1, 'Academic year is required'),
  academicTermId: z.string(),
  classOfferingId: z.string().min(1, 'Class is required'),
  title: z.string().max(255),
});

const entrySchema = z.object({
  dayOfWeek: z.enum(WEEKDAYS),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Use HH:mm'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Use HH:mm'),
  subjectId: z.string().min(1, 'Subject is required'),
  teacherId: z.string().min(1, 'Teacher is required'),
  classroomId: z.string(),
  notes: z.string().max(500),
});

type CreateValues = z.input<typeof createSchema>;
type EntryValues = z.input<typeof entrySchema>;

export default function AdminTimetablesPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<'timetable' | TimetableEntry | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [dayFilter, setDayFilter] = useState<'' | Weekday>('');

  const years = useAcademicYearOptions();
  const classes = useClassOfferingOptions(yearFilter ? Number(yearFilter) : undefined);
  const subjects = useSubjectOptions();
  const teachers = useTeacherOptions();

  const listQuery = useQuery({
    queryKey: queryKeys.sms.timetables.list({
      academicYearId: yearFilter ? Number(yearFilter) : undefined,
      classOfferingId: classFilter ? Number(classFilter) : undefined,
      teacherId: teacherFilter ? Number(teacherFilter) : undefined,
      subjectId: subjectFilter ? Number(subjectFilter) : undefined,
      dayOfWeek: dayFilter || undefined,
      limit: 50,
    }),
    queryFn: ({ signal }) =>
      listTimetables(
        {
          page: 1,
          limit: 50,
          ...(yearFilter ? { academicYearId: Number(yearFilter) } : {}),
          ...(classFilter ? { classOfferingId: Number(classFilter) } : {}),
          ...(teacherFilter ? { teacherId: Number(teacherFilter) } : {}),
          ...(subjectFilter ? { subjectId: Number(subjectFilter) } : {}),
          ...(dayFilter ? { dayOfWeek: dayFilter } : {}),
        },
        { signal },
      ),
    select: (response) => response.data,
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.sms.timetables.detail(selectedId ?? 0),
    queryFn: ({ signal }) => getTimetable(selectedId!, { signal }),
    select: (response) => response.data.timetable,
    enabled: selectedId != null,
  });

  const classroomsQuery = useQuery({
    queryKey: queryKeys.sms.timetables.classrooms({ limit: 100 }),
    queryFn: ({ signal }) => listClassrooms({ page: 1, limit: 100 }, { signal }),
    select: (response) => response.data.items,
  });

  const assignmentsQuery = useQuery({
    queryKey: ['sms', 'teaching-assignments', 'tt', detailQuery.data?.classOfferingId],
    queryFn: ({ signal }) =>
      listTeachingAssignments(
        { page: 1, limit: 100, classOfferingId: detailQuery.data!.classOfferingId },
        { signal },
      ),
    select: (response) => response.data.items,
    enabled: Boolean(detailQuery.data?.classOfferingId),
  });

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { academicYearId: '', academicTermId: '', classOfferingId: '', title: '' },
  });
  const entryForm = useForm<EntryValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      dayOfWeek: 'MONDAY',
      startTime: '08:00',
      endTime: '08:45',
      subjectId: '',
      teacherId: '',
      classroomId: '',
      notes: '',
    },
  });

  const createYearId = useWatch({ control: createForm.control, name: 'academicYearId' });
  const entrySubjectId = useWatch({ control: entryForm.control, name: 'subjectId' });

  const createTermsQuery = useQuery({
    queryKey: queryKeys.sms.academicYears.terms(Number(createYearId) || 0),
    queryFn: ({ signal }) => listAcademicTerms(Number(createYearId), { signal }),
    select: (response) => response.data.items,
    enabled: Boolean(createYearId),
  });

  const createClasses = useClassOfferingOptions(createYearId ? Number(createYearId) : undefined);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.sms.timetables.all });
  };

  const createMutation = useMutation({
    mutationFn: (values: CreateValues) =>
      createTimetable({
        academicYearId: Number(values.academicYearId),
        academicTermId: values.academicTermId ? Number(values.academicTermId) : null,
        classOfferingId: Number(values.classOfferingId),
        title: values.title.trim() || null,
      }),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      createForm.reset({ academicYearId: '', academicTermId: '', classOfferingId: '', title: '' });
      await invalidate();
      setSelectedId(response.data.timetable.id);
    },
    onError: (error) => {
      setActionSuccess(null);
      if (!applyApiFieldErrors(error, createForm.setError)) {
        setActionError(getErrorMessage(error, 'Unable to create timetable.'));
      }
    },
  });

  const entryMutation = useMutation({
    mutationFn: async (values: EntryValues) => {
      const body = {
        dayOfWeek: values.dayOfWeek,
        startTime: values.startTime,
        endTime: values.endTime,
        subjectId: Number(values.subjectId),
        teacherId: Number(values.teacherId),
        classroomId: values.classroomId ? Number(values.classroomId) : null,
        notes: values.notes.trim() || null,
      };
      if (editingEntry) {
        return updateTimetableEntry(selectedId!, editingEntry.id, body);
      }
      return createTimetableEntry(selectedId!, body);
    },
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      setEditingEntry(null);
      entryForm.reset({
        dayOfWeek: 'MONDAY',
        startTime: '08:00',
        endTime: '08:45',
        subjectId: '',
        teacherId: '',
        classroomId: '',
        notes: '',
      });
      await invalidate();
      await detailQuery.refetch();
    },
    onError: (error) => {
      setActionSuccess(null);
      if (!applyApiFieldErrors(error, entryForm.setError)) {
        setActionError(getErrorMessage(error, 'Unable to save timetable entry.'));
      }
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => publishTimetable(selectedId!),
    onSuccess: async (response) => {
      setActionSuccess(response.message);
      await invalidate();
      await detailQuery.refetch();
    },
    onError: (error) => setActionError(getErrorMessage(error, 'Unable to publish.')),
  });

  const unpublishMutation = useMutation({
    mutationFn: () => unpublishTimetable(selectedId!),
    onSuccess: async (response) => {
      setActionSuccess(response.message);
      await invalidate();
      await detailQuery.refetch();
    },
    onError: (error) => setActionError(getErrorMessage(error, 'Unable to unpublish.')),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (pendingDelete === 'timetable') return deleteTimetable(selectedId!);
      return deleteTimetableEntry(selectedId!, pendingDelete!.id);
    },
    onSuccess: async (response) => {
      setPendingDelete(null);
      setActionSuccess(response.message);
      if (pendingDelete === 'timetable') setSelectedId(null);
      await invalidate();
      if (selectedId) await detailQuery.refetch();
    },
    onError: (error) => {
      setPendingDelete(null);
      setActionError(getErrorMessage(error, 'Unable to delete.'));
    },
  });

  const roomMutation = useMutation({
    mutationFn: () =>
      createClassroom({
        name: `Room ${Date.now().toString(36).slice(-4).toUpperCase()}`,
        code: `R-${Date.now().toString(36).slice(-5).toUpperCase()}`,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.sms.timetables.classrooms({}) });
    },
  });

  const eligibleTeachers = useMemo(() => {
    const subjectId = Number(entrySubjectId) || 0;
    if (!subjectId || !assignmentsQuery.data) return teachers.data ?? [];
    const allowed = new Set(
      assignmentsQuery.data
        .filter((row) => row.subjectId === subjectId)
        .map((row) => row.teacherId),
    );
    return (teachers.data ?? []).filter((teacher) => allowed.has(teacher.id));
  }, [assignmentsQuery.data, entrySubjectId, teachers.data]);

  const timetable = detailQuery.data;
  const items = listQuery.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      <CmsSectionHeader
        eyebrow="Operations"
        title="Timetables"
        description="Build weekly class schedules, resolve conflicts, and publish for teachers and students."
      />

      {actionSuccess ? <FormAlert tone="success">{actionSuccess}</FormAlert> : null}
      {actionError ? <FormAlert tone="error">{actionError}</FormAlert> : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <form
            className="space-y-4 border border-outline-variant/40 bg-surface-container-lowest p-5"
            onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
            noValidate
          >
            <h2 className="font-display text-headline-sm text-primary">New timetable</h2>
            <FormField
              id="tt-year"
              label="Academic year"
              required
              error={createForm.formState.errors.academicYearId?.message}
            >
              <Select
                id="tt-year"
                {...createForm.register('academicYearId', {
                  onChange: () => {
                    createForm.setValue('academicTermId', '');
                    createForm.setValue('classOfferingId', '');
                  },
                })}
              >
                <option value="">Select year</option>
                {(years.data ?? []).map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              id="tt-term"
              label="Term"
              hint="Optional. Leave empty for a whole-year timetable."
              error={createForm.formState.errors.academicTermId?.message}
            >
              <Select
                id="tt-term"
                disabled={!createYearId || createTermsQuery.isLoading}
                {...createForm.register('academicTermId')}
              >
                <option value="">Whole year</option>
                {(createTermsQuery.data ?? []).map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.sequence}. {term.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              id="tt-class"
              label="Class (grade / section)"
              required
              error={createForm.formState.errors.classOfferingId?.message}
            >
              <Select
                id="tt-class"
                disabled={!createYearId}
                {...createForm.register('classOfferingId')}
              >
                <option value="">Select class</option>
                {(createClasses.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              id="tt-title"
              label="Title"
              error={createForm.formState.errors.title?.message}
            >
              <Input id="tt-title" {...createForm.register('title')} />
            </FormField>
            <Button type="submit" variant="primary" size="md" isLoading={createMutation.isPending}>
              Create timetable
            </Button>
          </form>

          <div className="border border-outline-variant/40 bg-surface-container-lowest p-5">
            <h2 className="mb-3 font-display text-headline-sm text-primary">Existing</h2>
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Select
                id="filter-year"
                value={yearFilter}
                onChange={(e) => {
                  setYearFilter(e.target.value);
                  setClassFilter('');
                }}
              >
                <option value="">All years</option>
                {(years.data ?? []).map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </Select>
              <Select
                id="filter-class"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="">All classes</option>
                {(classes.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
              <Select
                id="filter-teacher"
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
              >
                <option value="">All teachers</option>
                {(teachers.data ?? []).map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacherLabel(teacher)}
                  </option>
                ))}
              </Select>
              <Select
                id="filter-subject"
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
              >
                <option value="">All subjects</option>
                {(subjects.data ?? []).map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
              <Select
                id="filter-day"
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value as '' | Weekday)}
                className="sm:col-span-2"
              >
                <option value="">All days</option>
                {WEEKDAYS.map((day) => (
                  <option key={day} value={day}>
                    {WEEKDAY_LABELS[day]}
                  </option>
                ))}
              </Select>
            </div>
            {listQuery.isLoading ? <LoadingState message="Loading…" /> : null}
            {listQuery.isError ? (
              <ErrorState
                message={getErrorMessage(listQuery.error, 'Unable to load timetables.')}
                onRetry={() => void listQuery.refetch()}
              />
            ) : null}
            {listQuery.isSuccess && items.length === 0 ? (
              <EmptyState title="No timetables" description="Create one for a class offering." />
            ) : null}
            <ul className="divide-y divide-outline-variant/30">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`flex w-full items-start justify-between gap-2 px-1 py-3 text-left ${
                      selectedId === item.id ? 'bg-surface-container' : ''
                    }`}
                    onClick={() => {
                      setSelectedId(item.id);
                      setActionError(null);
                      setActionSuccess(null);
                    }}
                  >
                    <span>
                      <span className="block text-body-md text-primary">
                        {item.classOffering?.name ?? `Class #${item.classOfferingId}`}
                      </span>
                      <span className="text-caption text-on-surface-variant">
                        {item.academicYear?.name}
                        {item.title ? ` · ${item.title}` : ''}
                      </span>
                    </span>
                    <StatusBadge status={item.isPublished ? 'PUBLISHED' : 'DRAFT'} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-3">
          {!selectedId ? (
            <EmptyState
              title="Select a timetable"
              description="Choose an existing timetable or create a new one."
            />
          ) : detailQuery.isLoading ? (
            <LoadingState message="Loading timetable…" />
          ) : detailQuery.isError ? (
            <ErrorState
              message={getErrorMessage(detailQuery.error, 'Unable to load timetable.')}
              onRetry={() => void detailQuery.refetch()}
            />
          ) : timetable ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-headline-sm text-primary">
                    {timetable.classOffering?.name}
                  </h2>
                  <p className="text-caption text-on-surface-variant">
                    {timetable.academicYear?.name}
                    {timetable.academicTerm ? ` · ${timetable.academicTerm.name}` : ' · Whole year'}
                    {timetable.classOffering?.gradeLevel
                      ? ` · ${timetable.classOffering.gradeLevel.name}`
                      : ''}
                    {timetable.classOffering?.section
                      ? ` ${timetable.classOffering.section.name}`
                      : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {timetable.isPublished ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      onClick={() => unpublishMutation.mutate()}
                      isLoading={unpublishMutation.isPending}
                    >
                      Unpublish
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={() => publishMutation.mutate()}
                      isLoading={publishMutation.isPending}
                    >
                      Publish
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => setPendingDelete('timetable')}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              <TimetableWeekGrid
                entries={timetable.entries ?? []}
                onSelectEntry={(entry) => {
                  setEditingEntry(entry);
                  entryForm.reset({
                    dayOfWeek: entry.dayOfWeek,
                    startTime: entry.startTime,
                    endTime: entry.endTime,
                    subjectId: String(entry.subjectId),
                    teacherId: String(entry.teacherId),
                    classroomId: entry.classroomId ? String(entry.classroomId) : '',
                    notes: entry.notes ?? '',
                  });
                }}
              />

              <form
                className="space-y-4 border border-outline-variant/40 bg-surface-container-lowest p-5"
                onSubmit={entryForm.handleSubmit((values) => entryMutation.mutate(values))}
                noValidate
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-headline-sm text-primary">
                    {editingEntry ? 'Edit lesson' : 'Add lesson'}
                  </h3>
                  {editingEntry ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      onClick={() => {
                        setEditingEntry(null);
                        entryForm.reset();
                      }}
                    >
                      Cancel edit
                    </Button>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <FormField id="entry-day" label="Day" required>
                    <Select id="entry-day" {...entryForm.register('dayOfWeek')}>
                      {WEEKDAYS.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField
                    id="entry-start"
                    label="Start"
                    required
                    error={entryForm.formState.errors.startTime?.message}
                  >
                    <Input id="entry-start" type="time" {...entryForm.register('startTime')} />
                  </FormField>
                  <FormField
                    id="entry-end"
                    label="End"
                    required
                    error={entryForm.formState.errors.endTime?.message}
                  >
                    <Input id="entry-end" type="time" {...entryForm.register('endTime')} />
                  </FormField>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    id="entry-subject"
                    label="Subject"
                    required
                    error={entryForm.formState.errors.subjectId?.message}
                  >
                    <Select id="entry-subject" {...entryForm.register('subjectId')}>
                      <option value="">Select subject</option>
                      {(subjects.data ?? []).map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField
                    id="entry-teacher"
                    label="Teacher"
                    required
                    error={entryForm.formState.errors.teacherId?.message}
                  >
                    <Select id="entry-teacher" {...entryForm.register('teacherId')}>
                      <option value="">Select teacher</option>
                      {eligibleTeachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacherLabel(teacher)}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </div>
                <FormField id="entry-room" label="Classroom">
                  <div className="flex gap-2">
                    <Select
                      id="entry-room"
                      className="flex-1"
                      {...entryForm.register('classroomId')}
                    >
                      <option value="">None</option>
                      {(classroomsQuery.data ?? []).map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name} ({room.code})
                        </option>
                      ))}
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      onClick={() => roomMutation.mutate()}
                      isLoading={roomMutation.isPending}
                    >
                      Quick room
                    </Button>
                  </div>
                </FormField>
                <FormField id="entry-notes" label="Notes">
                  <Input id="entry-notes" {...entryForm.register('notes')} />
                </FormField>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={entryMutation.isPending}
                  >
                    {editingEntry ? 'Save lesson' : 'Add lesson'}
                  </Button>
                  {editingEntry ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      onClick={() => setPendingDelete(editingEntry)}
                    >
                      Delete lesson
                    </Button>
                  ) : null}
                </div>
              </form>
            </>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete === 'timetable' ? 'Delete timetable?' : 'Delete lesson?'}
        description={
          pendingDelete === 'timetable'
            ? 'This removes the timetable and soft-deletes all lessons.'
            : pendingDelete && typeof pendingDelete === 'object'
              ? `${pendingDelete.startTime}–${pendingDelete.endTime}${
                  pendingDelete.teacher ? ` · ${personName(pendingDelete.teacher)}` : ''
                }`
              : ''
        }
        confirmLabel="Delete"
        busy={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}

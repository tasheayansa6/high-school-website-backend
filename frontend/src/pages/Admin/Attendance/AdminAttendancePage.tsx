import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { AttendanceMarker } from '@/components/ops/AttendanceMarker';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useClassOfferingOptions } from '@/hooks/useSmsReferenceData';
import { queryKeys } from '@/services/api/queryKeys';
import { bulkMarkAttendance, listAttendance } from '@/services/sms/attendanceService';
import { listEnrollments } from '@/services/sms/enrollmentService';
import type { BulkAttendanceRecordInput } from '@/types/ops.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { personLabel, todayInputValue } from '@/utils/opsFormat';

export default function AdminAttendancePage() {
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(todayInputValue());
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const classes = useClassOfferingOptions();
  const classOfferingId = Number(classId) || 0;
  const ready = classOfferingId > 0 && date !== '';

  const enrollmentQuery = {
    page: 1,
    limit: 100,
    classOfferingId,
    status: 'ACTIVE' as const,
  };
  const enrollments = useQuery({
    queryKey: queryKeys.sms.enrollments.list({ ...enrollmentQuery }),
    queryFn: ({ signal }) => listEnrollments(enrollmentQuery, { signal }),
    select: (response) => response.data,
    enabled: classOfferingId > 0,
  });

  const attendanceQuery = { page: 1, limit: 100, classOfferingId, date };
  const records = useQuery({
    queryKey: queryKeys.sms.attendance.list({ ...attendanceQuery }),
    queryFn: ({ signal }) => listAttendance(attendanceQuery, { signal }),
    select: (response) => response.data,
    enabled: ready,
  });

  const students = useMemo(
    () =>
      (enrollments.data?.items ?? []).flatMap((enrollment) =>
        enrollment.student
          ? [{ id: enrollment.studentId, label: personLabel(enrollment.student) }]
          : [],
      ),
    [enrollments.data],
  );

  const saveMutation = useMutation({
    mutationFn: (rows: BulkAttendanceRecordInput[]) =>
      bulkMarkAttendance({ classOfferingId, attendanceDate: date, records: rows }),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      await queryClient.invalidateQueries({ queryKey: queryKeys.sms.attendance.all });
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(getErrorMessage(error, 'Unable to save attendance.'));
    },
  });

  const loading = enrollments.isLoading || records.isLoading;
  const loadError = enrollments.error ?? records.error;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="Operations"
        title="Attendance"
        description="Pick a class and date, then mark every enrolled student in one go."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField id="att-class" label="Class">
          <Select
            id="att-class"
            value={classId}
            disabled={classes.isLoading}
            onChange={(e) => {
              setClassId(e.target.value);
              setActionSuccess(null);
            }}
          >
            <option value="">Select class</option>
            {(classes.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="att-date" label="Date">
          <Input
            id="att-date"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setActionSuccess(null);
            }}
          />
        </FormField>
      </div>

      {classes.isError ? (
        <ErrorState
          className="mb-4"
          message={getErrorMessage(classes.error, 'Unable to load classes.')}
          onRetry={() => void classes.refetch()}
        />
      ) : null}
      {actionSuccess ? (
        <FormAlert tone="success" className="mb-4">
          {actionSuccess}
        </FormAlert>
      ) : null}
      {actionError ? (
        <FormAlert tone="error" className="mb-4">
          {actionError}
        </FormAlert>
      ) : null}

      {!ready ? (
        <EmptyState
          title="Select a class"
          description="Choose a class and date to mark attendance."
        />
      ) : null}
      {ready && loading ? <LoadingState message="Loading students…" /> : null}
      {ready && loadError ? (
        <ErrorState
          message={getErrorMessage(loadError, 'Unable to load attendance data.')}
          onRetry={() => {
            void enrollments.refetch();
            void records.refetch();
          }}
        />
      ) : null}
      {ready && enrollments.isSuccess && records.isSuccess ? (
        students.length === 0 ? (
          <EmptyState
            title="No active students"
            description="This class has no actively enrolled students."
          />
        ) : (
          <>
            {(enrollments.data?.pagination.totalPages ?? 1) > 1 ? (
              <FormAlert tone="info" className="mb-4">
                Only the first 100 enrolled students are shown.
              </FormAlert>
            ) : null}
            <AttendanceMarker
              key={`${classOfferingId}-${date}-${records.dataUpdatedAt}-${enrollments.dataUpdatedAt}`}
              students={students}
              records={records.data?.items ?? []}
              saving={saveMutation.isPending}
              onSave={(rows) => saveMutation.mutate(rows)}
            />
          </>
        )
      ) : null}
    </div>
  );
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { useTeacherAttendance } from '@/hooks/useTeacherOps';
import { useTeacherClass, useTeacherClasses } from '@/hooks/useTeacherPortal';
import { queryKeys } from '@/services/api/queryKeys';
import { bulkMarkTeacherAttendance } from '@/services/teacher/teacherOpsService';
import type { BulkAttendanceRecordInput } from '@/types/ops.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { personLabel, todayInputValue } from '@/utils/opsFormat';

export default function TeacherAttendancePage() {
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(todayInputValue());
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const classes = useTeacherClasses();
  const classOfferingId = Number(classId) || 0;
  const ready = classOfferingId > 0 && date !== '';

  const detail = useTeacherClass(classOfferingId > 0 ? classOfferingId : null);
  const records = useTeacherAttendance({ page: 1, limit: 100, classOfferingId, date }, ready);

  const students = useMemo(
    () =>
      (detail.data?.students ?? []).map((student) => ({
        id: student.id,
        label: personLabel(student),
      })),
    [detail.data],
  );

  const saveMutation = useMutation({
    mutationFn: (rows: BulkAttendanceRecordInput[]) =>
      bulkMarkTeacherAttendance({ classOfferingId, attendanceDate: date, records: rows }),
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      await queryClient.invalidateQueries({ queryKey: queryKeys.teacher.attendance.all });
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(getErrorMessage(error, 'Unable to save attendance.'));
    },
  });

  const loading = detail.isLoading || records.isLoading;
  const loadError = detail.error ?? records.error;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="Teacher portal"
        title="Attendance"
        description="Mark attendance for a class you teach."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField id="t-att-class" label="Class">
          <Select
            id="t-att-class"
            value={classId}
            disabled={classes.isLoading}
            onChange={(e) => {
              setClassId(e.target.value);
              setActionSuccess(null);
            }}
          >
            <option value="">Select class</option>
            {(classes.data?.items ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="t-att-date" label="Date">
          <Input
            id="t-att-date"
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
          message={getErrorMessage(classes.error, 'Unable to load your classes.')}
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
            void detail.refetch();
            void records.refetch();
          }}
        />
      ) : null}
      {ready && detail.isSuccess && records.isSuccess ? (
        students.length === 0 ? (
          <EmptyState
            title="No active students"
            description="This class has no actively enrolled students."
          />
        ) : (
          <AttendanceMarker
            key={`${classOfferingId}-${date}-${records.dataUpdatedAt}-${detail.dataUpdatedAt}`}
            students={students}
            records={records.data?.items ?? []}
            saving={saveMutation.isPending}
            onSave={(rows) => saveMutation.mutate(rows)}
          />
        )
      ) : null}
    </div>
  );
}

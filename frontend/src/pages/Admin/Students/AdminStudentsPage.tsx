import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

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
import { ADMIN_ROUTES } from '@/config/adminRoutes';
import { PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/hooks/useAuth';
import { useSmsListParams } from '@/hooks/useSmsListParams';
import { queryKeys } from '@/services/api/queryKeys';
import {
  activateStudent,
  deactivateStudent,
  deleteStudent,
  listStudents,
  restoreStudent,
} from '@/services/sms/studentService';
import type { SmsStudent, StudentListQuery } from '@/types/sms.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { personName } from '@/utils/smsFormat';

type StudentAction = 'deactivate' | 'delete' | 'restore';

interface PendingAction {
  student: SmsStudent;
  action: StudentAction;
}

const CONFIRM_COPY: Record<StudentAction, { title: string; description: string; label: string }> = {
  deactivate: {
    title: 'Deactivate this student?',
    description:
      'The student will no longer be able to sign in and existing sessions are revoked. You can activate the account again later.',
    label: 'Deactivate',
  },
  delete: {
    title: 'Delete this student?',
    description:
      'The student is soft-deleted and deactivated. Restoring requires the students:restore permission.',
    label: 'Delete student',
  },
  restore: {
    title: 'Restore this student?',
    description:
      'The record becomes visible again. The account stays inactive until you activate it explicitly.',
    label: 'Restore student',
  },
};

export default function AdminStudentsPage() {
  const queryClient = useQueryClient();
  const canRestore = usePermission(PERMISSIONS.STUDENTS_RESTORE);
  const { page, q, isActive, includeDeleted, searchInput, setSearchInput, updateParam } =
    useSmsListParams();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const query = useMemo<StudentListQuery>(
    () => ({
      page,
      limit: 20,
      sortBy: 'lastName',
      sortOrder: 'asc',
      ...(q ? { q } : {}),
      ...(isActive ? { isActive: isActive === 'true' } : {}),
      ...(includeDeleted ? { includeDeleted: true } : {}),
    }),
    [page, q, isActive, includeDeleted],
  );

  const listQuery = useQuery({
    queryKey: queryKeys.sms.students.list({ ...query }),
    queryFn: ({ signal }) => listStudents(query, { signal }),
    select: (response) => response.data,
  });

  const mutation = useMutation({
    mutationFn: async ({
      student,
      action,
    }: {
      student: SmsStudent;
      action: StudentAction | 'activate';
    }) => {
      if (action === 'activate') return activateStudent(student.id);
      if (action === 'deactivate') return deactivateStudent(student.id);
      if (action === 'restore') return restoreStudent(student.id);
      return deleteStudent(student.id);
    },
    onSuccess: async (response) => {
      setActionError(null);
      setActionSuccess(response.message);
      setPending(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.sms.students.all });
    },
    onError: (error) => {
      setActionSuccess(null);
      setActionError(getErrorMessage(error, 'Unable to complete student action.'));
      setPending(null);
    },
  });

  const items = listQuery.data?.items ?? [];
  const confirm = pending ? CONFIRM_COPY[pending.action] : null;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="School management"
        title="Students"
        description="Manage student accounts. Deactivation revokes access; deletion is a soft delete."
        actionTo={ADMIN_ROUTES.studentNew}
        actionLabel="New student"
      />

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <FormField id="students-q" label="Search" hint="Name, email, or student code">
          <Input
            id="students-q"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </FormField>
        <FormField id="students-active" label="Status">
          <Select
            id="students-active"
            value={isActive}
            onChange={(e) => updateParam('isActive', e.target.value)}
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </FormField>
        <FormField id="students-deleted" label="Deleted">
          <Select
            id="students-deleted"
            value={includeDeleted ? '1' : ''}
            onChange={(e) => updateParam('includeDeleted', e.target.value)}
          >
            <option value="">Hide deleted</option>
            <option value="1">Include deleted</option>
          </Select>
        </FormField>
      </div>

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
      {listQuery.isLoading ? <LoadingState message="Loading students…" /> : null}
      {listQuery.isError ? (
        <ErrorState
          message={getErrorMessage(listQuery.error, 'Unable to load students.')}
          onRetry={() => void listQuery.refetch()}
        />
      ) : null}
      {listQuery.isSuccess && items.length === 0 ? (
        <EmptyState
          title="No students found"
          description="Create a student or adjust the search and filters."
        />
      ) : null}

      {items.length > 0 ? (
        <div className="overflow-x-auto border border-outline-variant/40 bg-surface-container-lowest">
          <table className="min-w-full text-left">
            <thead className="border-b border-outline-variant/40 bg-surface-container-low">
              <tr>
                <th className="px-4 py-3 font-label-caps text-label-caps uppercase">Name</th>
                <th className="px-4 py-3 font-label-caps text-label-caps uppercase">Email</th>
                <th className="px-4 py-3 font-label-caps text-label-caps uppercase">Code</th>
                <th className="px-4 py-3 font-label-caps text-label-caps uppercase">Status</th>
                <th className="px-4 py-3 font-label-caps text-label-caps uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((student) => {
                const deleted = student.deletedAt !== null;
                return (
                  <tr key={student.id} className="border-b border-outline-variant/20 align-top">
                    <td className="px-4 py-3">
                      <Link
                        to={ADMIN_ROUTES.studentEdit(student.id)}
                        className="text-primary hover:underline"
                      >
                        {personName(student)}
                      </Link>
                      {student.guardianName ? (
                        <p className="text-caption text-on-surface-variant">
                          Guardian: {student.guardianName}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-body-sm text-on-surface-variant">
                      {student.email}
                    </td>
                    <td className="px-4 py-3 text-body-sm text-on-surface-variant">
                      {student.studentCode}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={deleted ? 'DELETED' : student.isActive ? 'ACTIVE' : 'INACTIVE'}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {!deleted ? (
                          <Link to={ADMIN_ROUTES.studentEdit(student.id)}>
                            <Button type="button" variant="ghost" size="md">
                              Edit
                            </Button>
                          </Link>
                        ) : null}
                        {!deleted && !student.isActive ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="md"
                            disabled={mutation.isPending}
                            onClick={() => mutation.mutate({ student, action: 'activate' })}
                          >
                            Activate
                          </Button>
                        ) : null}
                        {!deleted && student.isActive ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="md"
                            disabled={mutation.isPending}
                            onClick={() => setPending({ student, action: 'deactivate' })}
                          >
                            Deactivate
                          </Button>
                        ) : null}
                        {!deleted ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="md"
                            disabled={mutation.isPending}
                            onClick={() => setPending({ student, action: 'delete' })}
                          >
                            Delete
                          </Button>
                        ) : null}
                        {deleted && canRestore ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="md"
                            disabled={mutation.isPending}
                            onClick={() => setPending({ student, action: 'restore' })}
                          >
                            Restore
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <PaginationControls
        pagination={listQuery.data?.pagination}
        onPageChange={(next) => updateParam('page', String(next))}
      />

      <ConfirmDialog
        open={pending !== null}
        title={confirm?.title ?? ''}
        description={
          pending && confirm ? `${personName(pending.student)} — ${confirm.description}` : ''
        }
        confirmLabel={confirm?.label ?? 'Confirm'}
        busy={mutation.isPending}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) mutation.mutate(pending);
        }}
      />
    </div>
  );
}

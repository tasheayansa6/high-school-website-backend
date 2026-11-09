import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { StatusBadge } from '@/components/admin/cms/StatusBadge';
import { PaginationControls } from '@/components/admin/sms/PaginationControls';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { TEACHER_ROUTES } from '@/config/teacherRoutes';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useTeacherClasses, useTeacherStudents } from '@/hooks/useTeacherPortal';
import { getErrorMessage } from '@/utils/apiMessage';
import { personName } from '@/utils/smsFormat';

const PAGE_SIZE = 20;

export default function TeacherStudentsPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const classParam = Number(params.get('classOfferingId'));
  const classOfferingId = Number.isInteger(classParam) && classParam > 0 ? classParam : undefined;
  const q = params.get('q') ?? '';

  const [searchInput, setSearchInput] = useState(q);
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);

  useEffect(() => {
    if (debouncedSearch === q) {
      return;
    }
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (debouncedSearch) next.set('q', debouncedSearch);
        else next.delete('q');
        next.delete('page');
        return next;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const query = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(q ? { q } : {}),
      ...(classOfferingId ? { classOfferingId } : {}),
    }),
    [page, q, classOfferingId],
  );

  const classesQuery = useTeacherClasses();
  const studentsQuery = useTeacherStudents(query);
  const items = studentsQuery.data?.items ?? [];

  function updateParam(key: string, value: string) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    });
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <CmsSectionHeader
        eyebrow="Teacher portal"
        title="My Students"
        description="Students actively enrolled in classes you teach."
      />

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <FormField id="teacher-students-q" label="Search" hint="Name, email, or student code">
          <Input
            id="teacher-students-q"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </FormField>
        <FormField id="teacher-students-class" label="Class">
          <Select
            id="teacher-students-class"
            value={classOfferingId ? String(classOfferingId) : ''}
            onChange={(e) => updateParam('classOfferingId', e.target.value)}
          >
            <option value="">All my classes</option>
            {(classesQuery.data?.items ?? []).map((offering) => (
              <option key={offering.id} value={offering.id}>
                {offering.name} · {offering.academicYear.name}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      {studentsQuery.isLoading ? <LoadingState message="Loading students…" /> : null}
      {studentsQuery.isError ? (
        <ErrorState
          message={getErrorMessage(studentsQuery.error, 'Unable to load students.')}
          onRetry={() => void studentsQuery.refetch()}
        />
      ) : null}
      {studentsQuery.isSuccess && items.length === 0 ? (
        <EmptyState
          title="No students found"
          description="No active students match your classes and filters."
        />
      ) : null}

      {items.length > 0 ? (
        <div className="overflow-x-auto border border-outline-variant/40 bg-surface-container-lowest">
          <table className="min-w-full text-left">
            <thead className="border-b border-outline-variant/40 bg-surface-container-low">
              <tr>
                <th className="px-4 py-3 font-label-caps text-label-caps uppercase">Name</th>
                <th className="px-4 py-3 font-label-caps text-label-caps uppercase">Code</th>
                <th className="px-4 py-3 font-label-caps text-label-caps uppercase">Email</th>
                <th className="px-4 py-3 font-label-caps text-label-caps uppercase">Classes</th>
                <th className="px-4 py-3 font-label-caps text-label-caps uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((student) => (
                <tr key={student.id} className="border-b border-outline-variant/20 align-top">
                  <td className="px-4 py-3">{personName(student)}</td>
                  <td className="px-4 py-3 text-body-sm">{student.studentCode}</td>
                  <td className="px-4 py-3 text-body-sm">{student.email}</td>
                  <td className="px-4 py-3 text-body-sm">
                    {student.classOfferings.map((offering, index) => (
                      <span key={offering.id}>
                        {index > 0 ? ', ' : ''}
                        <Link
                          to={TEACHER_ROUTES.classDetail(offering.id)}
                          className="text-primary hover:underline"
                        >
                          {offering.name}
                        </Link>
                      </span>
                    ))}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={student.isActive ? 'ACTIVE' : 'INACTIVE'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <PaginationControls
        pagination={studentsQuery.data?.pagination}
        onPageChange={(next) => updateParam('page', next > 1 ? String(next) : '')}
      />
    </div>
  );
}

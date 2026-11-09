import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

import { CmsSectionHeader } from '@/components/admin/cms/CmsSectionHeader';
import { StatusBadge } from '@/components/admin/cms/StatusBadge';
import { Checkbox } from '@/components/forms/Checkbox';
import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ADMIN_ROUTES } from '@/config/adminRoutes';
import { queryKeys } from '@/services/api/queryKeys';
import { createTeacher, getTeacher, updateTeacher } from '@/services/sms/teacherService';
import type { UpdateTeacherBody } from '@/types/sms.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { applyApiFieldErrors } from '@/utils/formErrors';
import { emptyToNull } from '@/utils/smsFormat';

function buildSchema(isNew: boolean) {
  return z
    .object({
      email: z
        .string()
        .trim()
        .min(1, 'Email is required')
        .email('Enter a valid email address')
        .max(255),
      password: z.string().max(128, 'Password must be at most 128 characters'),
      firstName: z.string().trim().min(1, 'First name is required').max(100),
      lastName: z.string().trim().min(1, 'Last name is required').max(100),
      employeeCode: z.string().trim().max(50),
      phone: z.string().trim().max(50),
      isActive: z.boolean(),
    })
    .superRefine((data, ctx) => {
      if (isNew && data.password.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['password'], message: 'Password is required' });
      } else if (data.password.length > 0 && data.password.length < 8) {
        ctx.addIssue({
          code: 'custom',
          path: ['password'],
          message: 'Password must be at least 8 characters',
        });
      }
    });
}

type TeacherFormValues = z.input<ReturnType<typeof buildSchema>>;

const EMPTY_VALUES: TeacherFormValues = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  employeeCode: '',
  phone: '',
  isActive: true,
};

export default function AdminTeacherEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const teacherId = !isNew ? Number(id) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const schema = useMemo(() => buildSchema(isNew), [isNew]);

  const detailQuery = useQuery({
    queryKey: teacherId ? queryKeys.sms.teachers.detail(teacherId) : ['sms', 'teachers', 'new'],
    queryFn: ({ signal }) => getTeacher(teacherId!, { includeDeleted: true }, { signal }),
    enabled: teacherId != null && Number.isFinite(teacherId),
    select: (response) => response.data.teacher,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TeacherFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (detailQuery.data) {
      reset({
        email: detailQuery.data.email,
        password: '',
        firstName: detailQuery.data.firstName,
        lastName: detailQuery.data.lastName,
        employeeCode: detailQuery.data.employeeCode ?? '',
        phone: detailQuery.data.phone ?? '',
        isActive: detailQuery.data.isActive,
      });
    }
  }, [detailQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: async (values: TeacherFormValues) => {
      const parsed = schema.parse(values);
      if (isNew) {
        return createTeacher({
          email: parsed.email,
          password: parsed.password,
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          employeeCode: emptyToNull(parsed.employeeCode),
          phone: emptyToNull(parsed.phone),
          isActive: parsed.isActive,
        });
      }
      const body: UpdateTeacherBody = {
        email: parsed.email,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        employeeCode: emptyToNull(parsed.employeeCode),
        phone: emptyToNull(parsed.phone),
        ...(parsed.password.length > 0 ? { password: parsed.password } : {}),
      };
      return updateTeacher(teacherId!, body);
    },
    onSuccess: async (response) => {
      setFormError(null);
      setSuccessMessage(response.message);
      await queryClient.invalidateQueries({ queryKey: queryKeys.sms.teachers.all });
      if (isNew) {
        void navigate(ADMIN_ROUTES.teacherEdit(response.data.teacher.id), { replace: true });
      }
    },
    onError: (error) => {
      setSuccessMessage(null);
      const applied = applyApiFieldErrors(error, setError);
      if (!applied) setFormError(getErrorMessage(error, 'Unable to save teacher.'));
    },
  });

  const deleted = detailQuery.data?.deletedAt != null;
  const busy = isSubmitting || saveMutation.isPending;
  const locked = busy || deleted;

  if (!isNew && detailQuery.isLoading) return <LoadingState message="Loading teacher…" />;
  if (!isNew && detailQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(detailQuery.error, 'Unable to load teacher.')}
        onRetry={() => void detailQuery.refetch()}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <CmsSectionHeader
        eyebrow="School management"
        title={isNew ? 'New teacher' : 'Edit teacher'}
        description="Passwords are write-only and are never displayed."
      >
        <Link to={ADMIN_ROUTES.teachers}>
          <Button type="button" variant="ghost" size="md">
            Back to teachers
          </Button>
        </Link>
      </CmsSectionHeader>

      {!isNew && detailQuery.data ? (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <StatusBadge
            status={deleted ? 'DELETED' : detailQuery.data.isActive ? 'ACTIVE' : 'INACTIVE'}
          />
          <span className="text-caption text-on-surface-variant">ID {detailQuery.data.id}</span>
        </div>
      ) : null}

      {deleted ? (
        <FormAlert tone="info" className="mb-6">
          This teacher is deleted. Restore the record from the teachers list to edit it.
        </FormAlert>
      ) : null}

      <form
        className="space-y-5 border border-outline-variant/40 bg-surface-container-lowest p-6"
        onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
        noValidate
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            id="teacher-first"
            label="First name"
            required
            error={errors.firstName?.message}
          >
            <Input id="teacher-first" disabled={locked} {...register('firstName')} />
          </FormField>
          <FormField id="teacher-last" label="Last name" required error={errors.lastName?.message}>
            <Input id="teacher-last" disabled={locked} {...register('lastName')} />
          </FormField>
        </div>
        <FormField id="teacher-email" label="Email" required error={errors.email?.message}>
          <Input
            id="teacher-email"
            type="email"
            autoComplete="off"
            disabled={locked}
            {...register('email')}
          />
        </FormField>
        <FormField
          id="teacher-password"
          label="Password"
          required={isNew}
          hint={isNew ? 'At least 8 characters.' : 'Leave blank to keep the current password.'}
          error={errors.password?.message}
        >
          <Input
            id="teacher-password"
            type="password"
            autoComplete="new-password"
            disabled={locked}
            {...register('password')}
          />
        </FormField>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField id="teacher-code" label="Employee code" error={errors.employeeCode?.message}>
            <Input id="teacher-code" disabled={locked} {...register('employeeCode')} />
          </FormField>
          <FormField id="teacher-phone" label="Phone" error={errors.phone?.message}>
            <Input id="teacher-phone" type="tel" disabled={locked} {...register('phone')} />
          </FormField>
        </div>
        {isNew ? (
          <Checkbox
            id="teacher-active"
            label="Active"
            description="Inactive teachers cannot sign in."
            disabled={locked}
            {...register('isActive')}
          />
        ) : null}
        {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
        {successMessage ? <FormAlert tone="success">{successMessage}</FormAlert> : null}
        <Button type="submit" variant="primary" size="lg" isLoading={busy} disabled={locked}>
          {isNew ? 'Create teacher' : 'Save changes'}
        </Button>
      </form>
    </div>
  );
}

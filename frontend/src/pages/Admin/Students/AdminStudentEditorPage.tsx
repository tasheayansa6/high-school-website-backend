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
import { Select } from '@/components/forms/Select';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ADMIN_ROUTES } from '@/config/adminRoutes';
import { queryKeys } from '@/services/api/queryKeys';
import { createStudent, getStudent, updateStudent } from '@/services/sms/studentService';
import type { UpdateStudentBody } from '@/types/sms.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { applyApiFieldErrors } from '@/utils/formErrors';
import { emptyToNull, toDateInputValue } from '@/utils/smsFormat';

const GENDER_OPTIONS = ['Male', 'Female', 'Prefer not to say'] as const;
type GenderOption = (typeof GENDER_OPTIONS)[number] | '';

function normalizeGender(value: string | null | undefined): GenderOption {
  if (!value) return '';
  const match = GENDER_OPTIONS.find((option) => option.toLowerCase() === value.trim().toLowerCase());
  return match ?? '';
}

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
      studentCode: z.string().trim().min(1, 'Student code is required').max(50),
      dateOfBirth: z.string().trim(),
      gender: z.union([z.enum(GENDER_OPTIONS), z.literal('')]),
      phone: z.string().trim().max(50),
      guardianName: z.string().trim().max(150),
      guardianPhone: z.string().trim().max(50),
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

type StudentFormValues = z.input<ReturnType<typeof buildSchema>>;

const EMPTY_VALUES: StudentFormValues = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  studentCode: '',
  dateOfBirth: '',
  gender: '',
  phone: '',
  guardianName: '',
  guardianPhone: '',
  isActive: true,
};

export default function AdminStudentEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const studentId = !isNew ? Number(id) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const schema = useMemo(() => buildSchema(isNew), [isNew]);

  const detailQuery = useQuery({
    queryKey: studentId ? queryKeys.sms.students.detail(studentId) : ['sms', 'students', 'new'],
    queryFn: ({ signal }) => getStudent(studentId!, { includeDeleted: true }, { signal }),
    enabled: studentId != null && Number.isFinite(studentId),
    select: (response) => response.data.student,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (detailQuery.data) {
      const student = detailQuery.data;
      reset({
        email: student.email,
        password: '',
        firstName: student.firstName,
        lastName: student.lastName,
        studentCode: student.studentCode,
        dateOfBirth: toDateInputValue(student.dateOfBirth),
        gender: normalizeGender(student.gender),
        phone: student.phone ?? '',
        guardianName: student.guardianName ?? '',
        guardianPhone: student.guardianPhone ?? '',
        isActive: student.isActive,
      });
    }
  }, [detailQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: async (values: StudentFormValues) => {
      const parsed = schema.parse(values);
      const shared = {
        email: parsed.email,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        studentCode: parsed.studentCode,
        dateOfBirth: emptyToNull(parsed.dateOfBirth),
        gender: emptyToNull(parsed.gender),
        phone: emptyToNull(parsed.phone),
        guardianName: emptyToNull(parsed.guardianName),
        guardianPhone: emptyToNull(parsed.guardianPhone),
      };
      if (isNew) {
        return createStudent({ ...shared, password: parsed.password, isActive: parsed.isActive });
      }
      const body: UpdateStudentBody = {
        ...shared,
        ...(parsed.password.length > 0 ? { password: parsed.password } : {}),
      };
      return updateStudent(studentId!, body);
    },
    onSuccess: async (response) => {
      setFormError(null);
      setSuccessMessage(response.message);
      await queryClient.invalidateQueries({ queryKey: queryKeys.sms.students.all });
      if (isNew) {
        void navigate(ADMIN_ROUTES.studentEdit(response.data.student.id), { replace: true });
      }
    },
    onError: (error) => {
      setSuccessMessage(null);
      const applied = applyApiFieldErrors(error, setError);
      if (!applied) setFormError(getErrorMessage(error, 'Unable to save student.'));
    },
  });

  const deleted = detailQuery.data?.deletedAt != null;
  const busy = isSubmitting || saveMutation.isPending;
  const locked = busy || deleted;

  if (!isNew && detailQuery.isLoading) return <LoadingState message="Loading student…" />;
  if (!isNew && detailQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(detailQuery.error, 'Unable to load student.')}
        onRetry={() => void detailQuery.refetch()}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <CmsSectionHeader
        eyebrow="School management"
        title={isNew ? 'New student' : 'Edit student'}
        description="Passwords are write-only and are never displayed."
      >
        <Link to={ADMIN_ROUTES.students}>
          <Button type="button" variant="ghost" size="md">
            Back to students
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
          This student is deleted. Restore the record from the students list to edit it.
        </FormAlert>
      ) : null}

      <form
        className="space-y-5 border border-outline-variant/40 bg-surface-container-lowest p-6"
        onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
        noValidate
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            id="student-first"
            label="First name"
            required
            error={errors.firstName?.message}
          >
            <Input id="student-first" disabled={locked} {...register('firstName')} />
          </FormField>
          <FormField id="student-last" label="Last name" required error={errors.lastName?.message}>
            <Input id="student-last" disabled={locked} {...register('lastName')} />
          </FormField>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            id="student-code"
            label="Student code"
            required
            error={errors.studentCode?.message}
          >
            <Input id="student-code" disabled={locked} {...register('studentCode')} />
          </FormField>
          <FormField id="student-email" label="Email" required error={errors.email?.message}>
            <Input
              id="student-email"
              type="email"
              autoComplete="off"
              disabled={locked}
              {...register('email')}
            />
          </FormField>
        </div>
        <FormField
          id="student-password"
          label="Password"
          required={isNew}
          hint={isNew ? 'At least 8 characters.' : 'Leave blank to keep the current password.'}
          error={errors.password?.message}
        >
          <Input
            id="student-password"
            type="password"
            autoComplete="new-password"
            disabled={locked}
            {...register('password')}
          />
        </FormField>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField id="student-dob" label="Date of birth" error={errors.dateOfBirth?.message}>
            <Input id="student-dob" type="date" disabled={locked} {...register('dateOfBirth')} />
          </FormField>
          <FormField id="student-gender" label="Gender" error={errors.gender?.message}>
            <Select id="student-gender" disabled={locked} hasError={Boolean(errors.gender)} {...register('gender')}>
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="student-phone" label="Phone" error={errors.phone?.message}>
            <Input id="student-phone" type="tel" disabled={locked} {...register('phone')} />
          </FormField>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            id="student-guardian"
            label="Guardian name"
            error={errors.guardianName?.message}
          >
            <Input id="student-guardian" disabled={locked} {...register('guardianName')} />
          </FormField>
          <FormField
            id="student-guardian-phone"
            label="Guardian phone"
            error={errors.guardianPhone?.message}
          >
            <Input
              id="student-guardian-phone"
              type="tel"
              disabled={locked}
              {...register('guardianPhone')}
            />
          </FormField>
        </div>
        {isNew ? (
          <Checkbox
            id="student-active"
            label="Active"
            description="Inactive students cannot sign in."
            disabled={locked}
            {...register('isActive')}
          />
        ) : null}
        {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
        {successMessage ? <FormAlert tone="success">{successMessage}</FormAlert> : null}
        <Button type="submit" variant="primary" size="lg" isLoading={busy} disabled={locked}>
          {isNew ? 'Create student' : 'Save changes'}
        </Button>
      </form>
    </div>
  );
}

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { Checkbox } from '@/components/forms/Checkbox';
import { FormAlert } from '@/components/forms/FormAlert';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { Textarea } from '@/components/forms/Textarea';
import { Button } from '@/components/ui/Button';
import type { Assignment, CreateAssignmentBody, UpdateAssignmentBody } from '@/types/ops.types';
import { getErrorMessage } from '@/utils/apiMessage';
import { applyApiFieldErrors } from '@/utils/formErrors';
import { dateTimeInputToIso, toDateTimeInputValue } from '@/utils/opsFormat';

const schema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255),
  description: z.string().max(20000),
  classOfferingId: z.string().min(1, 'Class is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  teacherId: z.string(),
  dueAt: z.string(),
  maxScore: z
    .string()
    .refine((value) => value.trim() === '' || Number(value) > 0, 'Max score must be positive'),
  isPublished: z.boolean(),
});

type FormValues = z.input<typeof schema>;

export interface OptionItem {
  id: number;
  label: string;
}

interface AssignmentFormProps {
  editing: Assignment | null;
  classes: OptionItem[];
  subjectsForClass: (classOfferingId: number) => OptionItem[];
  /** Admin only: pick the owning teacher. Omit for the teacher portal. */
  teachers?: OptionItem[] | undefined;
  teachersHint?: string | undefined;
  onCreate: (body: CreateAssignmentBody) => Promise<unknown>;
  onUpdate: (id: number, body: UpdateAssignmentBody) => Promise<unknown>;
  onDone: () => void;
}

function defaultsFor(editing: Assignment | null): FormValues {
  return {
    title: editing?.title ?? '',
    description: editing?.description ?? '',
    classOfferingId: editing ? String(editing.classOfferingId) : '',
    subjectId: editing ? String(editing.subjectId) : '',
    teacherId: editing ? String(editing.teacherId) : '',
    dueAt: toDateTimeInputValue(editing?.dueAt),
    maxScore: editing ? String(editing.maxScore) : '100',
    isPublished: editing?.isPublished ?? false,
  };
}

/** Create / edit assignment form shared by the admin and teacher pages. */
export function AssignmentForm({
  editing,
  classes,
  subjectsForClass,
  teachers,
  teachersHint,
  onCreate,
  onUpdate,
  onDone,
}: AssignmentFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultsFor(editing),
  });
  const classId = Number(useWatch({ control, name: 'classOfferingId' })) || 0;
  const subjects = classId ? subjectsForClass(classId) : [];
  const isEdit = editing !== null;
  const needsTeacher = teachers !== undefined;

  async function submit(values: FormValues) {
    setFormError(null);
    const parsed = schema.parse(values);
    if (!isEdit && needsTeacher && !parsed.teacherId) {
      setError('teacherId', { message: 'Teacher is required' });
      return;
    }
    const description = parsed.description.trim();
    const maxScore = parsed.maxScore.trim() ? Number(parsed.maxScore) : undefined;
    const dueAt = dateTimeInputToIso(parsed.dueAt);
    try {
      if (isEdit) {
        await onUpdate(editing.id, {
          title: parsed.title,
          description: description || null,
          dueAt,
          ...(maxScore !== undefined ? { maxScore } : {}),
          isPublished: parsed.isPublished,
        });
      } else {
        await onCreate({
          title: parsed.title,
          ...(description ? { description } : {}),
          classOfferingId: Number(parsed.classOfferingId),
          subjectId: Number(parsed.subjectId),
          ...(needsTeacher ? { teacherId: Number(parsed.teacherId) } : {}),
          ...(dueAt ? { dueAt } : {}),
          ...(maxScore !== undefined ? { maxScore } : {}),
          isPublished: parsed.isPublished,
        });
      }
      onDone();
    } catch (error) {
      if (!applyApiFieldErrors(error, setError)) {
        setFormError(getErrorMessage(error, 'Unable to save the assignment.'));
      }
    }
  }

  return (
    <form
      className="space-y-4 border border-outline-variant/40 bg-surface-container-lowest p-5"
      onSubmit={handleSubmit(submit)}
      noValidate
    >
      <h2 className="font-display text-headline-sm text-primary">
        {isEdit ? 'Edit assignment' : 'New assignment'}
      </h2>
      <FormField id="asg-title" label="Title" required error={errors.title?.message}>
        <Input id="asg-title" hasError={Boolean(errors.title)} {...register('title')} />
      </FormField>
      <FormField id="asg-description" label="Description" error={errors.description?.message}>
        <Textarea id="asg-description" rows={4} {...register('description')} />
      </FormField>
      <FormField
        id="asg-class"
        label="Class"
        required
        hint={isEdit ? 'Class cannot be changed after creation.' : undefined}
        error={errors.classOfferingId?.message}
      >
        <Select
          id="asg-class"
          disabled={isEdit}
          hasError={Boolean(errors.classOfferingId)}
          {...register('classOfferingId', {
            onChange: () => setValue('subjectId', ''),
          })}
        >
          <option value="">Select class</option>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField id="asg-subject" label="Subject" required error={errors.subjectId?.message}>
        <Select
          id="asg-subject"
          disabled={isEdit || !classId}
          hasError={Boolean(errors.subjectId)}
          {...register('subjectId')}
        >
          <option value="">Select subject</option>
          {subjects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </Select>
      </FormField>
      {needsTeacher ? (
        <FormField
          id="asg-teacher"
          label="Teacher"
          required={!isEdit}
          hint={teachersHint}
          error={errors.teacherId?.message}
        >
          <Select
            id="asg-teacher"
            disabled={isEdit || (teachers?.length ?? 0) === 0}
            hasError={Boolean(errors.teacherId)}
            {...register('teacherId')}
          >
            <option value="">Select teacher</option>
            {teachers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
        </FormField>
      ) : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField id="asg-due" label="Due" error={errors.dueAt?.message}>
          <Input id="asg-due" type="datetime-local" {...register('dueAt')} />
        </FormField>
        <FormField id="asg-max" label="Max score" error={errors.maxScore?.message}>
          <Input
            id="asg-max"
            type="number"
            min={0}
            step="0.01"
            hasError={Boolean(errors.maxScore)}
            {...register('maxScore')}
          />
        </FormField>
      </div>
      <Checkbox
        id="asg-published"
        label="Published"
        description="Published assignments are visible to enrolled students."
        {...register('isPublished')}
      />
      {formError ? <FormAlert tone="error">{formError}</FormAlert> : null}
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {isEdit ? 'Save changes' : 'Create assignment'}
        </Button>
        <Button type="button" variant="ghost" size="md" onClick={onDone} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

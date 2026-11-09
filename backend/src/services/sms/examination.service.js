const { prisma } = require('../../config/database');
const { toStudentRef } = require('../../utils/smsSerializers');
const { recordAudit } = require('../audit.service');
const {
  buildPagination,
  notFound,
  validationFailure,
  getIp,
  whereWithDeleted,
} = require('./common');
const {
  toNumber,
  toDateOnly,
  auditActor,
  studentRefSelect,
  classRefSelect,
  subjectRefSelect,
  findClassOfferingOrThrow,
  findSubjectOrThrow,
  assertStudentsEnrolled,
  forbidden,
} = require('./ops.helpers');
const { resolveGradeLetter, validateScoreAgainstMax } = require('./gradebook.calc');
const gradebookService = require('./gradebook.service');

const EXAM_NOT_FOUND = 'EXAMINATION_NOT_FOUND';
const RESULT_NOT_FOUND = 'EXAM_RESULT_NOT_FOUND';

const examInclude = {
  classOffering: { select: classRefSelect },
  subject: { select: subjectRefSelect },
  academicTerm: { select: { id: true, name: true } },
  category: true,
  submittedBy: {
    select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true },
  },
};

function toExamination(exam) {
  return {
    id: exam.id,
    name: exam.name,
    examType: exam.examType,
    classOfferingId: exam.classOfferingId,
    subjectId: exam.subjectId,
    academicYearId: exam.academicYearId,
    academicTermId: exam.academicTermId,
    examDate: exam.examDate,
    maxScore: toNumber(exam.maxScore),
    categoryId: exam.categoryId ?? null,
    weight: toNumber(exam.weight) ?? 1,
    marksStatus: exam.marksStatus || 'DRAFT',
    submittedAt: exam.submittedAt || null,
    submittedById: exam.submittedById || null,
    isPublished: exam.isPublished,
    category: exam.category ? gradebookService.toCategory(exam.category) : undefined,
    submittedBy: exam.submittedBy || undefined,
    classOffering: exam.classOffering || undefined,
    subject: exam.subject || undefined,
    academicTerm: exam.academicTerm || undefined,
    deletedAt: exam.deletedAt,
    createdAt: exam.createdAt,
    updatedAt: exam.updatedAt,
  };
}

function toExamResult(result) {
  return {
    id: result.id,
    examId: result.examId,
    studentId: result.studentId,
    score: toNumber(result.score),
    gradeLetter: result.gradeLetter,
    remarks: result.remarks,
    enteredById: result.enteredById,
    student: result.student ? toStudentRef(result.student) : undefined,
    exam: result.exam
      ? {
          id: result.exam.id,
          name: result.exam.name,
          examType: result.exam.examType,
          examDate: result.exam.examDate,
          maxScore: toNumber(result.exam.maxScore),
          weight: result.exam.weight != null ? toNumber(result.exam.weight) : undefined,
          categoryId: result.exam.categoryId ?? undefined,
          isPublished: result.exam.isPublished,
          marksStatus: result.exam.marksStatus,
          subject: result.exam.subject || undefined,
          classOffering: result.exam.classOffering || undefined,
          category: result.exam.category ? gradebookService.toCategory(result.exam.category) : undefined,
        }
      : undefined,
    deletedAt: result.deletedAt,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  };
}

async function findExamOrThrow(id, { includeDeleted = false } = {}) {
  const exam = await prisma.examination.findFirst({
    where: whereWithDeleted({ id }, includeDeleted),
    include: examInclude,
  });
  if (!exam) throw notFound('Examination', EXAM_NOT_FOUND);
  return exam;
}

async function assertTermBelongsToYear(academicTermId, academicYearId) {
  if (!academicTermId) return;
  const term = await prisma.academicTerm.findFirst({
    where: { id: academicTermId, deletedAt: null },
  });
  if (!term) throw notFound('Academic term', 'ACADEMIC_TERM_NOT_FOUND');
  if (term.academicYearId !== academicYearId) {
    throw validationFailure("academicTermId must belong to the examination's academic year", 'academicTermId');
  }
}

async function assertCategoryExists(categoryId) {
  if (!categoryId) return;
  const category = await prisma.assessmentCategory.findFirst({
    where: { id: categoryId, deletedAt: null, isActive: true },
  });
  if (!category) throw notFound('Assessment category', 'ASSESSMENT_CATEGORY_NOT_FOUND');
  return category;
}

function assertMarksEditable(exam, actor) {
  if (exam.isPublished) {
    throw validationFailure('Published results cannot be modified. Unpublish first.', 'isPublished');
  }
  if (exam.marksStatus === 'SUBMITTED' && actor.teacherId && !actor.adminId) {
    throw forbidden('Submitted marks are locked until an administrator reopens them.');
  }
}

/**
 * @param {{ classSubjectPairs?: Array<{classOfferingId:number, subjectId:number}> }} [scope]
 */
async function listExaminations(
  {
    page = 1,
    limit = 20,
    q,
    classOfferingId,
    subjectId,
    academicYearId,
    academicTermId,
    examType,
    isPublished,
    marksStatus,
    categoryId,
    includeDeleted = false,
  } = {},
  scope = {}
) {
  const where = whereWithDeleted({}, includeDeleted);

  if (classOfferingId) where.classOfferingId = classOfferingId;
  if (subjectId) where.subjectId = subjectId;
  if (academicYearId) where.academicYearId = academicYearId;
  if (academicTermId) where.academicTermId = academicTermId;
  if (examType) where.examType = examType;
  if (isPublished !== undefined) where.isPublished = isPublished;
  if (marksStatus) where.marksStatus = marksStatus;
  if (categoryId) where.categoryId = categoryId;
  if (q) where.name = { contains: q };
  if (scope.classSubjectPairs) {
    where.AND = [
      {
        OR: scope.classSubjectPairs.length
          ? scope.classSubjectPairs.map((pair) => ({
              classOfferingId: pair.classOfferingId,
              subjectId: pair.subjectId,
            }))
          : [{ id: -1 }],
      },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.examination.count({ where }),
    prisma.examination.findMany({
      where,
      orderBy: [{ id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: examInclude,
    }),
  ]);

  return { items: items.map(toExamination), pagination: buildPagination({ page, limit, total }) };
}

async function getExaminationById(id, options = {}) {
  return toExamination(await findExamOrThrow(id, options));
}

async function resolveDefaultWeight(categoryId, explicitWeight) {
  if (explicitWeight !== undefined && explicitWeight !== null) return explicitWeight;
  if (!categoryId) return 1;
  const category = await prisma.assessmentCategory.findFirst({
    where: { id: categoryId, deletedAt: null },
  });
  return category ? toNumber(category.defaultWeight) ?? 1 : 1;
}

async function createExamination(payload, actor, requestMeta = {}) {
  const [classOffering, subject] = await Promise.all([
    findClassOfferingOrThrow(payload.classOfferingId),
    findSubjectOrThrow(payload.subjectId),
  ]);

  if (payload.academicYearId !== classOffering.academicYearId) {
    throw validationFailure(
      "academicYearId must match the class offering's academic year",
      'academicYearId'
    );
  }
  await assertTermBelongsToYear(payload.academicTermId, payload.academicYearId);
  await assertCategoryExists(payload.categoryId);

  if (payload.weight !== undefined && toNumber(payload.weight) < 0) {
    throw validationFailure('weight cannot be negative', 'weight');
  }

  const weight = await resolveDefaultWeight(payload.categoryId, payload.weight);

  const exam = await prisma.$transaction(async (tx) => {
    const created = await tx.examination.create({
      data: {
        name: payload.name,
        ...(payload.examType ? { examType: payload.examType } : {}),
        classOfferingId: classOffering.id,
        subjectId: subject.id,
        academicYearId: classOffering.academicYearId,
        academicTermId: payload.academicTermId ?? null,
        examDate: payload.examDate ? toDateOnly(payload.examDate) : null,
        ...(payload.maxScore !== undefined ? { maxScore: payload.maxScore } : {}),
        categoryId: payload.categoryId ?? null,
        weight,
        marksStatus: 'DRAFT',
      },
      include: examInclude,
    });

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'examinations.create',
      entityType: 'Examination',
      entityId: created.id,
      metadata: {
        classOfferingId: classOffering.id,
        subjectId: subject.id,
        categoryId: created.categoryId,
        weight: toNumber(created.weight),
      },
      ipAddress: getIp(requestMeta),
    });

    return created;
  });

  return toExamination(exam);
}

async function updateExamination(id, payload, actor, requestMeta = {}) {
  const existing = await findExamOrThrow(id);

  if (existing.isPublished && actor.teacherId && !actor.adminId) {
    throw forbidden('Published examinations cannot be modified by teachers.');
  }
  if (existing.marksStatus === 'SUBMITTED' && actor.teacherId && !actor.adminId) {
    throw forbidden('Submitted examinations cannot be modified until reopened.');
  }

  if (payload.academicTermId !== undefined) {
    await assertTermBelongsToYear(payload.academicTermId, existing.academicYearId);
  }
  if (payload.categoryId !== undefined) {
    await assertCategoryExists(payload.categoryId);
  }
  if (payload.weight !== undefined && toNumber(payload.weight) < 0) {
    throw validationFailure('weight cannot be negative', 'weight');
  }
  if (payload.maxScore !== undefined) {
    const over = await prisma.examResult.count({
      where: { examId: existing.id, deletedAt: null, score: { gt: payload.maxScore } },
    });
    if (over > 0) {
      throw validationFailure('maxScore is lower than existing recorded scores', 'maxScore');
    }
  }

  const data = {};
  for (const key of ['name', 'examType', 'academicTermId', 'maxScore', 'categoryId', 'weight']) {
    if (payload[key] !== undefined) data[key] = payload[key];
  }
  if (payload.examDate !== undefined) {
    data.examDate = payload.examDate ? toDateOnly(payload.examDate) : null;
  }

  const exam = await prisma.$transaction(async (tx) => {
    const updated = await tx.examination.update({
      where: { id: existing.id },
      data,
      include: examInclude,
    });

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'examinations.update',
      entityType: 'Examination',
      entityId: updated.id,
      metadata: { fields: Object.keys(data) },
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toExamination(exam);
}

/** Publishing makes results visible to students. */
async function publishExamination(id, actor, requestMeta = {}) {
  const existing = await findExamOrThrow(id);
  if (existing.isPublished) return toExamination(existing);

  const exam = await prisma.$transaction(async (tx) => {
    const updated = await tx.examination.update({
      where: { id: existing.id },
      data: {
        isPublished: true,
        marksStatus: 'SUBMITTED',
        submittedAt: existing.submittedAt || new Date(),
      },
      include: examInclude,
    });

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'examinations.publish',
      entityType: 'Examination',
      entityId: updated.id,
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  const result = toExamination(exam);
  const notificationEvents = require('./notification.events');
  await notificationEvents.notifyExamResultsPublished(result);
  return result;
}

async function unpublishExamination(id, actor, requestMeta = {}) {
  const existing = await findExamOrThrow(id);
  if (!existing.isPublished) return toExamination(existing);

  const exam = await prisma.$transaction(async (tx) => {
    const updated = await tx.examination.update({
      where: { id: existing.id },
      data: { isPublished: false },
      include: examInclude,
    });

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'examinations.unpublish',
      entityType: 'Examination',
      entityId: updated.id,
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toExamination(exam);
}

/** Teacher submits draft marks for admin review / publication. */
async function submitExaminationMarks(id, actor, requestMeta = {}) {
  const existing = await findExamOrThrow(id);
  if (existing.isPublished) {
    throw validationFailure('Examination is already published', 'isPublished');
  }
  if (existing.marksStatus === 'SUBMITTED') {
    return toExamination(existing);
  }

  const resultCount = await prisma.examResult.count({
    where: { examId: existing.id, deletedAt: null },
  });
  if (resultCount === 0) {
    throw validationFailure('Enter at least one mark before submitting', 'results');
  }

  const exam = await prisma.$transaction(async (tx) => {
    const updated = await tx.examination.update({
      where: { id: existing.id },
      data: {
        marksStatus: 'SUBMITTED',
        submittedAt: new Date(),
        submittedById: actor.teacherId || null,
      },
      include: examInclude,
    });

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'examinations.submit-marks',
      entityType: 'Examination',
      entityId: updated.id,
      metadata: { resultCount },
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  const result = toExamination(exam);
  const notificationEvents = require('./notification.events');
  await notificationEvents.notifyExamResultsSubmitted(result);
  return result;
}

/** Admin rejects / reopens submitted marks back to DRAFT. */
async function reopenExaminationMarks(id, actor, requestMeta = {}, { reason } = {}) {
  const existing = await findExamOrThrow(id);
  if (existing.isPublished) {
    throw validationFailure('Unpublish the examination before reopening marks', 'isPublished');
  }

  const exam = await prisma.$transaction(async (tx) => {
    const updated = await tx.examination.update({
      where: { id: existing.id },
      data: {
        marksStatus: 'DRAFT',
        submittedAt: null,
        submittedById: null,
      },
      include: examInclude,
    });

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'examinations.reopen-marks',
      entityType: 'Examination',
      entityId: updated.id,
      metadata: { reason: reason || null, previousStatus: existing.marksStatus },
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toExamination(exam);
}

async function softDeleteExamination(id, actor, requestMeta = {}) {
  const existing = await findExamOrThrow(id);

  const exam = await prisma.$transaction(async (tx) => {
    const updated = await tx.examination.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
      include: examInclude,
    });

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'examinations.delete',
      entityType: 'Examination',
      entityId: updated.id,
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toExamination(exam);
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

async function listResults(examId, { page = 1, limit = 50, includeDeleted = false } = {}) {
  const exam = await findExamOrThrow(examId);
  const where = whereWithDeleted({ examId: exam.id }, includeDeleted);

  const [total, items] = await Promise.all([
    prisma.examResult.count({ where }),
    prisma.examResult.findMany({
      where,
      orderBy: [{ studentId: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: { student: { select: studentRefSelect } },
    }),
  ]);

  return {
    examination: toExamination(exam),
    items: items.map(toExamResult),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function resolveAutoGradeLetter(score, maxScore, explicitLetter) {
  if (explicitLetter !== undefined) return explicitLetter;
  const scale = await gradebookService.getDefaultScale();
  if (!scale) return null;
  const percent = maxScore > 0 ? (Number(score) / Number(maxScore)) * 100 : null;
  return resolveGradeLetter(percent, scale.boundaries).letter;
}

/** Upsert results for an exam. `actor` is { adminId } or { teacherId }. */
async function upsertResults(examId, { results }, actor, requestMeta = {}) {
  const exam = await findExamOrThrow(examId);
  assertMarksEditable(exam, actor);

  const maxScore = Number(exam.maxScore);

  const byStudent = new Map(results.map((row) => [row.studentId, row]));
  const rows = [...byStudent.values()];

  for (const row of rows) {
    const check = validateScoreAgainstMax(row.score, maxScore);
    if (!check.valid) {
      throw validationFailure(
        `score for student ${row.studentId}: ${check.message}`,
        'results'
      );
    }
  }

  await assertStudentsEnrolled(exam.classOfferingId, rows.map((row) => row.studentId), 'results');

  const enteredById = actor.teacherId || null;
  const previous = await prisma.examResult.findMany({
    where: {
      examId: exam.id,
      studentId: { in: rows.map((r) => r.studentId) },
    },
    select: { studentId: true, score: true, gradeLetter: true, deletedAt: true },
  });
  const previousByStudent = new Map(previous.map((r) => [r.studentId, r]));

  const saved = await prisma.$transaction(async (tx) => {
    const out = [];
    const changes = [];
    for (const row of rows) {
      const gradeLetter = await resolveAutoGradeLetter(row.score, maxScore, row.gradeLetter);
      const prev = previousByStudent.get(row.studentId);
      out.push(
        await tx.examResult.upsert({
          where: { examId_studentId: { examId: exam.id, studentId: row.studentId } },
          create: {
            examId: exam.id,
            studentId: row.studentId,
            score: row.score,
            gradeLetter: gradeLetter ?? null,
            remarks: row.remarks ?? null,
            enteredById,
          },
          update: {
            score: row.score,
            gradeLetter: gradeLetter ?? null,
            remarks: row.remarks ?? null,
            enteredById,
            deletedAt: null,
          },
          include: { student: { select: studentRefSelect } },
        })
      );
      changes.push({
        studentId: row.studentId,
        previousScore: prev && !prev.deletedAt ? toNumber(prev.score) : null,
        score: row.score,
        gradeLetter: gradeLetter ?? null,
      });
    }

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'exam-results.upsert',
      entityType: 'Examination',
      entityId: exam.id,
      metadata: { total: out.length, changes },
      ipAddress: getIp(requestMeta),
    });

    return out;
  });

  return { examination: toExamination(exam), total: saved.length, items: saved.map(toExamResult) };
}

async function softDeleteResult(examId, resultId, actor, requestMeta = {}) {
  const exam = await findExamOrThrow(examId);
  assertMarksEditable(exam, actor);

  const existing = await prisma.examResult.findFirst({
    where: { id: resultId, examId: exam.id, deletedAt: null },
  });
  if (!existing) throw notFound('Exam result', RESULT_NOT_FOUND);

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.examResult.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
      include: { student: { select: studentRefSelect } },
    });

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'exam-results.delete',
      entityType: 'ExamResult',
      entityId: updated.id,
      metadata: { examId: exam.id, previousScore: toNumber(existing.score) },
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toExamResult(result);
}

/** Published results for a single student. */
async function listPublishedResultsForStudent(studentId, { page = 1, limit = 20, academicYearId, subjectId, academicTermId } = {}) {
  const where = {
    studentId,
    deletedAt: null,
    exam: {
      deletedAt: null,
      isPublished: true,
      ...(academicYearId ? { academicYearId } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(academicTermId ? { academicTermId } : {}),
    },
  };

  const [total, items] = await Promise.all([
    prisma.examResult.count({ where }),
    prisma.examResult.findMany({
      where,
      orderBy: [{ id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        exam: {
          select: {
            id: true,
            name: true,
            examType: true,
            examDate: true,
            maxScore: true,
            weight: true,
            categoryId: true,
            isPublished: true,
            marksStatus: true,
            subject: { select: subjectRefSelect },
            classOffering: { select: classRefSelect },
            category: true,
          },
        },
      },
    }),
  ]);

  return { items: items.map(toExamResult), pagination: buildPagination({ page, limit, total }) };
}

module.exports = {
  listExaminations,
  getExaminationById,
  createExamination,
  updateExamination,
  publishExamination,
  unpublishExamination,
  submitExaminationMarks,
  reopenExaminationMarks,
  softDeleteExamination,
  listResults,
  upsertResults,
  softDeleteResult,
  listPublishedResultsForStudent,
};

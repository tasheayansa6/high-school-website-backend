const { prisma } = require('../../config/database');
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
  auditActor,
  studentRefSelect,
  classRefSelect,
  subjectRefSelect,
  findClassOfferingOrThrow,
  findSubjectOrThrow,
} = require('./ops.helpers');
const {
  resolveGradeLetter,
  computeWeightedTotal,
  validateWeights,
  roundHalfUp,
} = require('./gradebook.calc');

const SCALE_NOT_FOUND = 'GRADING_SCALE_NOT_FOUND';
const CATEGORY_NOT_FOUND = 'ASSESSMENT_CATEGORY_NOT_FOUND';

function toScale(scale) {
  return {
    id: scale.id,
    name: scale.name,
    description: scale.description,
    isDefault: scale.isDefault,
    weightMode: scale.weightMode,
    treatMissingAsZero: scale.treatMissingAsZero,
    decimalPlaces: scale.decimalPlaces,
    boundaries: (scale.boundaries || []).map((b) => ({
      id: b.id,
      letter: b.letter,
      minPercent: toNumber(b.minPercent),
      maxPercent: toNumber(b.maxPercent),
      remark: b.remark,
      sortOrder: b.sortOrder,
    })),
    deletedAt: scale.deletedAt,
    createdAt: scale.createdAt,
    updatedAt: scale.updatedAt,
  };
}

function toCategory(category) {
  return {
    id: category.id,
    code: category.code,
    name: category.name,
    description: category.description,
    defaultWeight: toNumber(category.defaultWeight),
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    deletedAt: category.deletedAt,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

async function getDefaultScale() {
  const scale = await prisma.gradingScale.findFirst({
    where: { deletedAt: null, isDefault: true },
    include: { boundaries: { orderBy: [{ sortOrder: 'asc' }, { minPercent: 'desc' }] } },
  });
  if (scale) return scale;
  return prisma.gradingScale.findFirst({
    where: { deletedAt: null },
    include: { boundaries: { orderBy: [{ sortOrder: 'asc' }, { minPercent: 'desc' }] } },
    orderBy: { id: 'asc' },
  });
}

async function listGradingScales({ includeDeleted = false } = {}) {
  const items = await prisma.gradingScale.findMany({
    where: whereWithDeleted({}, includeDeleted),
    orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    include: { boundaries: { orderBy: [{ sortOrder: 'asc' }, { minPercent: 'desc' }] } },
  });
  return { items: items.map(toScale) };
}

async function getGradingScaleById(id, { includeDeleted = false } = {}) {
  const scale = await prisma.gradingScale.findFirst({
    where: whereWithDeleted({ id }, includeDeleted),
    include: { boundaries: { orderBy: [{ sortOrder: 'asc' }, { minPercent: 'desc' }] } },
  });
  if (!scale) throw notFound('Grading scale', SCALE_NOT_FOUND);
  return toScale(scale);
}

async function createGradingScale(payload, actor, requestMeta = {}) {
  if (payload.boundaries?.length) {
    for (const b of payload.boundaries) {
      if (Number(b.minPercent) > Number(b.maxPercent)) {
        throw validationFailure('minPercent cannot exceed maxPercent', 'boundaries');
      }
    }
  }

  const scale = await prisma.$transaction(async (tx) => {
    if (payload.isDefault) {
      await tx.gradingScale.updateMany({
        where: { isDefault: true, deletedAt: null },
        data: { isDefault: false },
      });
    }

    const created = await tx.gradingScale.create({
      data: {
        name: payload.name,
        description: payload.description ?? null,
        isDefault: payload.isDefault === true,
        weightMode: payload.weightMode || 'RELATIVE',
        treatMissingAsZero: payload.treatMissingAsZero === true,
        decimalPlaces: payload.decimalPlaces ?? 2,
        boundaries: payload.boundaries?.length
          ? {
              create: payload.boundaries.map((b, index) => ({
                letter: b.letter,
                minPercent: b.minPercent,
                maxPercent: b.maxPercent,
                remark: b.remark ?? null,
                sortOrder: b.sortOrder ?? index + 1,
              })),
            }
          : undefined,
      },
      include: { boundaries: { orderBy: [{ sortOrder: 'asc' }] } },
    });

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'grading-scales.create',
      entityType: 'GradingScale',
      entityId: created.id,
      ipAddress: getIp(requestMeta),
    });

    return created;
  });

  return toScale(scale);
}

async function updateGradingScale(id, payload, actor, requestMeta = {}) {
  const existing = await prisma.gradingScale.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw notFound('Grading scale', SCALE_NOT_FOUND);

  const scale = await prisma.$transaction(async (tx) => {
    if (payload.isDefault === true) {
      await tx.gradingScale.updateMany({
        where: { isDefault: true, deletedAt: null, NOT: { id } },
        data: { isDefault: false },
      });
    }

    const data = {};
    for (const key of ['name', 'description', 'weightMode', 'treatMissingAsZero', 'decimalPlaces', 'isDefault']) {
      if (payload[key] !== undefined) data[key] = payload[key];
    }

    if (payload.boundaries) {
      for (const b of payload.boundaries) {
        if (Number(b.minPercent) > Number(b.maxPercent)) {
          throw validationFailure('minPercent cannot exceed maxPercent', 'boundaries');
        }
      }
      await tx.gradeBoundary.deleteMany({ where: { gradingScaleId: id } });
      await tx.gradeBoundary.createMany({
        data: payload.boundaries.map((b, index) => ({
          gradingScaleId: id,
          letter: b.letter,
          minPercent: b.minPercent,
          maxPercent: b.maxPercent,
          remark: b.remark ?? null,
          sortOrder: b.sortOrder ?? index + 1,
        })),
      });
    }

    const updated = await tx.gradingScale.update({
      where: { id },
      data,
      include: { boundaries: { orderBy: [{ sortOrder: 'asc' }] } },
    });

    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'grading-scales.update',
      entityType: 'GradingScale',
      entityId: updated.id,
      metadata: { fields: Object.keys(payload) },
      ipAddress: getIp(requestMeta),
    });

    return updated;
  });

  return toScale(scale);
}

async function softDeleteGradingScale(id, actor, requestMeta = {}) {
  const existing = await prisma.gradingScale.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw notFound('Grading scale', SCALE_NOT_FOUND);
  if (existing.isDefault) {
    throw validationFailure('Cannot delete the default grading scale. Set another default first.', 'id');
  }

  const scale = await prisma.$transaction(async (tx) => {
    const updated = await tx.gradingScale.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: { boundaries: true },
    });
    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'grading-scales.delete',
      entityType: 'GradingScale',
      entityId: updated.id,
      ipAddress: getIp(requestMeta),
    });
    return updated;
  });

  return toScale(scale);
}

async function listAssessmentCategories({ includeDeleted = false, isActive } = {}) {
  const where = whereWithDeleted({}, includeDeleted);
  if (isActive !== undefined) where.isActive = isActive;
  const items = await prisma.assessmentCategory.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  return { items: items.map(toCategory) };
}

async function createAssessmentCategory(payload, actor, requestMeta = {}) {
  if (toNumber(payload.defaultWeight) != null && toNumber(payload.defaultWeight) < 0) {
    throw validationFailure('defaultWeight cannot be negative', 'defaultWeight');
  }

  const category = await prisma.$transaction(async (tx) => {
    const created = await tx.assessmentCategory.create({
      data: {
        code: payload.code.toUpperCase(),
        name: payload.name,
        description: payload.description ?? null,
        defaultWeight: payload.defaultWeight ?? 1,
        sortOrder: payload.sortOrder ?? 0,
        isActive: payload.isActive !== false,
      },
    });
    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'assessment-categories.create',
      entityType: 'AssessmentCategory',
      entityId: created.id,
      ipAddress: getIp(requestMeta),
    });
    return created;
  });

  return toCategory(category);
}

async function updateAssessmentCategory(id, payload, actor, requestMeta = {}) {
  const existing = await prisma.assessmentCategory.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw notFound('Assessment category', CATEGORY_NOT_FOUND);

  if (payload.defaultWeight !== undefined && toNumber(payload.defaultWeight) < 0) {
    throw validationFailure('defaultWeight cannot be negative', 'defaultWeight');
  }

  const category = await prisma.$transaction(async (tx) => {
    const data = {};
    for (const key of ['name', 'description', 'defaultWeight', 'sortOrder', 'isActive']) {
      if (payload[key] !== undefined) data[key] = payload[key];
    }
    if (payload.code !== undefined) data.code = payload.code.toUpperCase();

    const updated = await tx.assessmentCategory.update({ where: { id }, data });
    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'assessment-categories.update',
      entityType: 'AssessmentCategory',
      entityId: updated.id,
      metadata: { fields: Object.keys(data) },
      ipAddress: getIp(requestMeta),
    });
    return updated;
  });

  return toCategory(category);
}

async function softDeleteAssessmentCategory(id, actor, requestMeta = {}) {
  const existing = await prisma.assessmentCategory.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw notFound('Assessment category', CATEGORY_NOT_FOUND);

  const category = await prisma.$transaction(async (tx) => {
    await tx.examination.updateMany({
      where: { categoryId: id, deletedAt: null },
      data: { categoryId: null },
    });
    const updated = await tx.assessmentCategory.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await recordAudit({
      tx,
      ...auditActor(actor),
      action: 'assessment-categories.delete',
      entityType: 'AssessmentCategory',
      entityId: updated.id,
      ipAddress: getIp(requestMeta),
    });
    return updated;
  });

  return toCategory(category);
}

async function validateWeightConfiguration({ weights, weightMode, gradingScaleId } = {}) {
  let mode = weightMode;
  if (!mode && gradingScaleId) {
    const scale = await prisma.gradingScale.findFirst({
      where: { id: gradingScaleId, deletedAt: null },
    });
    if (!scale) throw notFound('Grading scale', SCALE_NOT_FOUND);
    mode = scale.weightMode;
  }
  if (!mode) {
    const def = await getDefaultScale();
    mode = def?.weightMode || 'RELATIVE';
  }
  return validateWeights(weights || [], mode);
}

async function buildClassSubjectGradebook({
  classOfferingId,
  subjectId,
  academicYearId,
  academicTermId,
  publishedOnly = false,
}) {
  await Promise.all([findClassOfferingOrThrow(classOfferingId), findSubjectOrThrow(subjectId)]);

  const classOffering = await prisma.classOffering.findFirst({
    where: { id: classOfferingId, deletedAt: null },
    include: {
      gradeLevel: { select: { id: true, name: true, code: true } },
      section: { select: { id: true, name: true, code: true } },
    },
  });

  const yearId = academicYearId || classOffering.academicYearId;

  const examWhere = {
    deletedAt: null,
    classOfferingId,
    subjectId,
    academicYearId: yearId,
  };
  if (academicTermId !== undefined && academicTermId !== null && academicTermId !== '') {
    examWhere.academicTermId = Number(academicTermId);
  }
  if (publishedOnly) examWhere.isPublished = true;

  const [exams, enrollments, scale] = await Promise.all([
    prisma.examination.findMany({
      where: examWhere,
      orderBy: [{ examDate: 'asc' }, { id: 'asc' }],
      include: {
        category: true,
        results: {
          where: { deletedAt: null },
          include: { student: { select: studentRefSelect } },
        },
      },
    }),
    prisma.enrollment.findMany({
      where: {
        classOfferingId,
        academicYearId: yearId,
        status: 'ACTIVE',
        deletedAt: null,
        student: { deletedAt: null },
      },
      include: { student: { select: studentRefSelect } },
      orderBy: [{ studentId: 'asc' }],
    }),
    getDefaultScale(),
  ]);

  const policy = {
    treatMissingAsZero: scale?.treatMissingAsZero === true,
    decimalPlaces: scale?.decimalPlaces ?? 2,
  };
  const boundaries = scale?.boundaries || [];

  const assessments = exams.map((exam) => ({
    id: exam.id,
    name: exam.name,
    examType: exam.examType,
    examDate: exam.examDate,
    maxScore: toNumber(exam.maxScore),
    weight: toNumber(exam.weight) ?? 1,
    marksStatus: exam.marksStatus,
    isPublished: exam.isPublished,
    categoryId: exam.categoryId,
    category: exam.category ? toCategory(exam.category) : null,
    submittedAt: exam.submittedAt,
  }));

  const students = enrollments.map((enrollment) => {
    const resultByExam = new Map();
    for (const exam of exams) {
      const result = exam.results.find((r) => r.studentId === enrollment.studentId);
      resultByExam.set(exam.id, result || null);
    }

    const calcInput = assessments.map((assessment) => {
      const result = resultByExam.get(assessment.id);
      return {
        assessmentId: assessment.id,
        maxScore: assessment.maxScore,
        weight: assessment.weight,
        score: result ? toNumber(result.score) : null,
      };
    });

    const total = computeWeightedTotal(calcInput, policy);
    const grade = resolveGradeLetter(total.percent, boundaries);

    return {
      studentId: enrollment.studentId,
      student: enrollment.student,
      marks: assessments.map((assessment) => {
        const result = resultByExam.get(assessment.id);
        return {
          assessmentId: assessment.id,
          score: result ? toNumber(result.score) : null,
          gradeLetter: result?.gradeLetter ?? null,
          remarks: result?.remarks ?? null,
          resultId: result?.id ?? null,
          missing: !result,
        };
      }),
      totalPercent: total.percent,
      gradeLetter: grade.letter,
      gradeRemark: grade.remark,
      scoredCount: total.scoredCount,
      missingCount: total.missingCount,
      complete: total.complete,
    };
  });

  const classPercents = students.map((s) => s.totalPercent).filter((p) => p != null);
  const classAverage =
    classPercents.length > 0
      ? roundHalfUp(classPercents.reduce((a, b) => a + b, 0) / classPercents.length, policy.decimalPlaces)
      : null;

  const weightCheck = validateWeights(
    assessments.map((a) => a.weight),
    scale?.weightMode || 'RELATIVE'
  );

  return {
    classOffering: {
      id: classOffering.id,
      name: classOffering.name,
      gradeLevel: classOffering.gradeLevel,
      section: classOffering.section,
      academicYearId: classOffering.academicYearId,
    },
    subject: await prisma.subject.findFirst({
      where: { id: subjectId },
      select: subjectRefSelect,
    }),
    academicYearId: yearId,
    academicTermId: academicTermId != null && academicTermId !== '' ? Number(academicTermId) : null,
    gradingScale: scale ? toScale(scale) : null,
    weightValidation: weightCheck,
    assessments,
    students,
    summary: {
      studentCount: students.length,
      assessmentCount: assessments.length,
      classAveragePercent: classAverage,
      missingMarksCount: students.reduce((sum, s) => sum + s.missingCount, 0),
      submittedAssessmentCount: assessments.filter((a) => a.marksStatus === 'SUBMITTED').length,
      publishedAssessmentCount: assessments.filter((a) => a.isPublished).length,
    },
  };
}

async function listGradebookOverview({
  page = 1,
  limit = 20,
  academicYearId,
  academicTermId,
  classOfferingId,
  subjectId,
  gradeLevelId,
  marksStatus,
} = {}) {
  const examWhere = { deletedAt: null };
  if (academicYearId) examWhere.academicYearId = academicYearId;
  if (academicTermId) examWhere.academicTermId = academicTermId;
  if (classOfferingId) examWhere.classOfferingId = classOfferingId;
  if (subjectId) examWhere.subjectId = subjectId;
  if (marksStatus) examWhere.marksStatus = marksStatus;
  if (gradeLevelId) {
    examWhere.classOffering = { gradeLevelId, deletedAt: null };
  }

  const grouped = await prisma.examination.groupBy({
    by: ['classOfferingId', 'subjectId', 'academicYearId', 'academicTermId'],
    where: examWhere,
    _count: { _all: true },
    orderBy: [{ academicYearId: 'desc' }, { classOfferingId: 'asc' }, { subjectId: 'asc' }],
    skip: (page - 1) * limit,
    take: limit,
  });

  const totalGroups = await prisma.examination.groupBy({
    by: ['classOfferingId', 'subjectId', 'academicYearId', 'academicTermId'],
    where: examWhere,
  });

  const classIds = [...new Set(grouped.map((g) => g.classOfferingId))];
  const subjectIds = [...new Set(grouped.map((g) => g.subjectId))];

  const [classes, subjects] = await Promise.all([
    prisma.classOffering.findMany({
      where: { id: { in: classIds } },
      select: {
        ...classRefSelect,
        gradeLevel: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true, code: true } },
      },
    }),
    prisma.subject.findMany({
      where: { id: { in: subjectIds } },
      select: subjectRefSelect,
    }),
  ]);

  const classMap = new Map(classes.map((c) => [c.id, c]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const items = [];
  for (const group of grouped) {
    const statusCounts = await prisma.examination.groupBy({
      by: ['marksStatus', 'isPublished'],
      where: {
        deletedAt: null,
        classOfferingId: group.classOfferingId,
        subjectId: group.subjectId,
        academicYearId: group.academicYearId,
        academicTermId: group.academicTermId,
      },
      _count: { _all: true },
    });

    items.push({
      classOfferingId: group.classOfferingId,
      subjectId: group.subjectId,
      academicYearId: group.academicYearId,
      academicTermId: group.academicTermId,
      assessmentCount: group._count._all,
      classOffering: classMap.get(group.classOfferingId) || null,
      subject: subjectMap.get(group.subjectId) || null,
      draftCount: statusCounts
        .filter((s) => s.marksStatus === 'DRAFT')
        .reduce((n, s) => n + s._count._all, 0),
      submittedCount: statusCounts
        .filter((s) => s.marksStatus === 'SUBMITTED')
        .reduce((n, s) => n + s._count._all, 0),
      publishedCount: statusCounts
        .filter((s) => s.isPublished)
        .reduce((n, s) => n + s._count._all, 0),
    });
  }

  return {
    items,
    pagination: buildPagination({ page, limit, total: totalGroups.length }),
  };
}

async function listPendingSubmissions({ page = 1, limit = 20, academicYearId, academicTermId } = {}) {
  const where = {
    deletedAt: null,
    marksStatus: 'SUBMITTED',
    isPublished: false,
  };
  if (academicYearId) where.academicYearId = academicYearId;
  if (academicTermId) where.academicTermId = academicTermId;

  const [total, items] = await Promise.all([
    prisma.examination.count({ where }),
    prisma.examination.findMany({
      where,
      orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        classOffering: { select: classRefSelect },
        subject: { select: subjectRefSelect },
        category: true,
        submittedBy: {
          select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true },
        },
        _count: { select: { results: { where: { deletedAt: null } } } },
      },
    }),
  ]);

  return {
    items: items.map((exam) => ({
      id: exam.id,
      name: exam.name,
      examType: exam.examType,
      maxScore: toNumber(exam.maxScore),
      weight: toNumber(exam.weight),
      marksStatus: exam.marksStatus,
      isPublished: exam.isPublished,
      submittedAt: exam.submittedAt,
      classOffering: exam.classOffering,
      subject: exam.subject,
      category: exam.category ? toCategory(exam.category) : null,
      submittedBy: exam.submittedBy,
      resultCount: exam._count.results,
    })),
    pagination: buildPagination({ page, limit, total }),
  };
}

async function getStudentPublishedSummary(studentId, { academicYearId, academicTermId } = {}) {
  const examWhere = {
    deletedAt: null,
    isPublished: true,
  };
  if (academicYearId) examWhere.academicYearId = academicYearId;
  if (academicTermId) examWhere.academicTermId = academicTermId;

  const results = await prisma.examResult.findMany({
    where: {
      studentId,
      deletedAt: null,
      exam: examWhere,
    },
    include: {
      exam: {
        include: {
          subject: { select: subjectRefSelect },
          classOffering: { select: classRefSelect },
          category: true,
          academicTerm: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ id: 'desc' }],
  });

  const scale = await getDefaultScale();
  const policy = {
    treatMissingAsZero: scale?.treatMissingAsZero === true,
    decimalPlaces: scale?.decimalPlaces ?? 2,
  };
  const boundaries = scale?.boundaries || [];

  const bySubject = new Map();
  for (const result of results) {
    const key = `${result.exam.subjectId}:${result.exam.academicTermId ?? 'none'}:${result.exam.academicYearId}`;
    if (!bySubject.has(key)) {
      bySubject.set(key, {
        subject: result.exam.subject,
        classOffering: result.exam.classOffering,
        academicYearId: result.exam.academicYearId,
        academicTermId: result.exam.academicTermId,
        academicTerm: result.exam.academicTerm,
        assessments: [],
      });
    }
    bySubject.get(key).assessments.push({
      id: result.exam.id,
      name: result.exam.name,
      examType: result.exam.examType,
      examDate: result.exam.examDate,
      maxScore: toNumber(result.exam.maxScore),
      weight: toNumber(result.exam.weight) ?? 1,
      category: result.exam.category ? toCategory(result.exam.category) : null,
      score: toNumber(result.score),
      gradeLetter: result.gradeLetter,
      remarks: result.remarks,
    });
  }

  const subjects = [...bySubject.values()].map((group) => {
    const total = computeWeightedTotal(
      group.assessments.map((a) => ({
        assessmentId: a.id,
        maxScore: a.maxScore,
        weight: a.weight,
        score: a.score,
      })),
      policy
    );
    const grade = resolveGradeLetter(total.percent, boundaries);
    return {
      ...group,
      totalPercent: total.percent,
      gradeLetter: grade.letter,
      gradeRemark: grade.remark,
      scoredCount: total.scoredCount,
      missingCount: total.missingCount,
    };
  });

  const percents = subjects.map((s) => s.totalPercent).filter((p) => p != null);
  const overallAverage =
    percents.length > 0
      ? roundHalfUp(percents.reduce((a, b) => a + b, 0) / percents.length, policy.decimalPlaces)
      : null;
  const overallGrade = resolveGradeLetter(overallAverage, boundaries);

  return {
    gradingScale: scale ? toScale(scale) : null,
    subjects,
    summary: {
      subjectCount: subjects.length,
      assessmentCount: results.length,
      overallAveragePercent: overallAverage,
      overallGradeLetter: overallGrade.letter,
      overallGradeRemark: overallGrade.remark,
    },
  };
}

async function listTeacherGradebooks(teacherId, { academicYearId, academicTermId } = {}) {
  const assignments = await prisma.teachingAssignment.findMany({
    where: {
      teacherId,
      deletedAt: null,
      classOffering: {
        deletedAt: null,
        ...(academicYearId ? { academicYearId } : {}),
      },
      subject: { deletedAt: null },
    },
    include: {
      classOffering: {
        select: {
          ...classRefSelect,
          academicYearId: true,
          gradeLevel: { select: { id: true, name: true, code: true } },
          section: { select: { id: true, name: true, code: true } },
        },
      },
      subject: { select: subjectRefSelect },
    },
    orderBy: [{ classOfferingId: 'asc' }, { subjectId: 'asc' }],
  });

  const seen = new Set();
  const items = [];
  for (const row of assignments) {
    const key = `${row.classOfferingId}:${row.subjectId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const examWhere = {
      deletedAt: null,
      classOfferingId: row.classOfferingId,
      subjectId: row.subjectId,
      academicYearId: row.classOffering.academicYearId,
    };
    if (academicTermId) examWhere.academicTermId = academicTermId;

    const [assessmentCount, draftCount, submittedCount, publishedCount] = await Promise.all([
      prisma.examination.count({ where: examWhere }),
      prisma.examination.count({ where: { ...examWhere, marksStatus: 'DRAFT' } }),
      prisma.examination.count({ where: { ...examWhere, marksStatus: 'SUBMITTED' } }),
      prisma.examination.count({ where: { ...examWhere, isPublished: true } }),
    ]);

    items.push({
      classOfferingId: row.classOfferingId,
      subjectId: row.subjectId,
      academicYearId: row.classOffering.academicYearId,
      classOffering: row.classOffering,
      subject: row.subject,
      assessmentCount,
      draftCount,
      submittedCount,
      publishedCount,
    });
  }

  return { items };
}

module.exports = {
  listGradingScales,
  getGradingScaleById,
  createGradingScale,
  updateGradingScale,
  softDeleteGradingScale,
  listAssessmentCategories,
  createAssessmentCategory,
  updateAssessmentCategory,
  softDeleteAssessmentCategory,
  validateWeightConfiguration,
  buildClassSubjectGradebook,
  listGradebookOverview,
  listPendingSubmissions,
  getStudentPublishedSummary,
  listTeacherGradebooks,
  getDefaultScale,
  toScale,
  toCategory,
};

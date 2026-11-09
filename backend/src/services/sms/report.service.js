const { prisma } = require('../../config/database');
const { toNumber, toDateOnly } = require('./ops.helpers');

const round2 = (value) => (value === null || value === undefined ? null : Math.round(value * 100) / 100);

function countsByKey(rows, key, keys) {
  const out = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const row of rows) out[row[key]] = row._count._all;
  return out;
}

async function getAttendanceSummary({ academicYearId, classOfferingId, from, to }) {
  const where = { deletedAt: null };
  if (classOfferingId) where.classOfferingId = classOfferingId;
  if (academicYearId) where.classOffering = { academicYearId };
  if (from || to) {
    where.attendanceDate = {};
    if (from) where.attendanceDate.gte = toDateOnly(from);
    if (to) where.attendanceDate.lte = toDateOnly(to);
  }

  const rows = await prisma.attendanceRecord.groupBy({ by: ['status'], where, _count: { _all: true } });
  const byStatus = countsByKey(rows, 'status', ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']);
  const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);
  const attended = byStatus.PRESENT + byStatus.LATE;

  return {
    total,
    byStatus,
    attendanceRate: total === 0 ? null : round2((attended / total) * 100),
  };
}

async function getFeeSummary({ academicYearId }) {
  const where = { deletedAt: null };
  if (academicYearId) where.academicYearId = academicYearId;

  const rows = await prisma.studentFee.groupBy({
    by: ['status'],
    where,
    _count: { _all: true },
    _sum: { amountDue: true, amountPaid: true },
  });

  const byStatus = {};
  for (const status of ['UNPAID', 'PARTIAL', 'PAID', 'WAIVED']) {
    byStatus[status] = { count: 0, amountDue: 0, amountPaid: 0 };
  }
  let totalDue = 0;
  let totalPaid = 0;
  let count = 0;

  for (const row of rows) {
    const due = toNumber(row._sum.amountDue) || 0;
    const paid = toNumber(row._sum.amountPaid) || 0;
    byStatus[row.status] = { count: row._count._all, amountDue: due, amountPaid: paid };
    count += row._count._all;
    // Waived fees are not expected revenue.
    if (row.status !== 'WAIVED') {
      totalDue += due;
      totalPaid += paid;
    }
  }

  return {
    count,
    byStatus,
    totalDue: round2(totalDue),
    totalPaid: round2(totalPaid),
    totalOutstanding: round2(totalDue - totalPaid),
  };
}

async function getExamSummary({ academicYearId, classOfferingId }) {
  const examWhere = { deletedAt: null };
  if (academicYearId) examWhere.academicYearId = academicYearId;
  if (classOfferingId) examWhere.classOfferingId = classOfferingId;

  const exams = await prisma.examination.findMany({
    where: examWhere,
    orderBy: { id: 'desc' },
    take: 100,
    select: {
      id: true,
      name: true,
      examType: true,
      isPublished: true,
      maxScore: true,
      subject: { select: { id: true, name: true } },
      classOffering: { select: { id: true, name: true } },
    },
  });

  const stats = exams.length
    ? await prisma.examResult.groupBy({
        by: ['examId'],
        where: { deletedAt: null, examId: { in: exams.map((exam) => exam.id) } },
        _avg: { score: true },
        _min: { score: true },
        _max: { score: true },
        _count: { _all: true },
      })
    : [];
  const statsByExam = new Map(stats.map((row) => [row.examId, row]));

  const items = exams.map((exam) => {
    const stat = statsByExam.get(exam.id);
    const maxScore = toNumber(exam.maxScore);
    const average = stat ? toNumber(stat._avg.score) : null;
    return {
      examId: exam.id,
      name: exam.name,
      examType: exam.examType,
      isPublished: exam.isPublished,
      subject: exam.subject,
      classOffering: exam.classOffering,
      maxScore,
      resultCount: stat ? stat._count._all : 0,
      averageScore: round2(average),
      averagePercent: average === null ? null : round2((average / maxScore) * 100),
      minScore: stat ? toNumber(stat._min.score) : null,
      maxRecordedScore: stat ? toNumber(stat._max.score) : null,
    };
  });

  const withResults = items.filter((item) => item.averagePercent !== null);
  const overallAveragePercent = withResults.length
    ? round2(withResults.reduce((sum, item) => sum + item.averagePercent, 0) / withResults.length)
    : null;

  return { examCount: exams.length, overallAveragePercent, items };
}

async function getEnrollmentSummary({ academicYearId, classOfferingId }) {
  const where = { deletedAt: null };
  if (academicYearId) where.academicYearId = academicYearId;
  if (classOfferingId) where.classOfferingId = classOfferingId;

  const [byStatusRows, byClassRows] = await Promise.all([
    prisma.enrollment.groupBy({ by: ['status'], where, _count: { _all: true } }),
    prisma.enrollment.groupBy({
      by: ['classOfferingId'],
      where: { ...where, status: 'ACTIVE' },
      _count: { _all: true },
    }),
  ]);

  const classes = byClassRows.length
    ? await prisma.classOffering.findMany({
        where: { id: { in: byClassRows.map((row) => row.classOfferingId) } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(classes.map((row) => [row.id, row.name]));

  const byStatus = countsByKey(byStatusRows, 'status', ['ACTIVE', 'TRANSFERRED', 'WITHDRAWN', 'COMPLETED']);

  return {
    total: Object.values(byStatus).reduce((sum, n) => sum + n, 0),
    byStatus,
    activeByClassOffering: byClassRows
      .map((row) => ({
        classOfferingId: row.classOfferingId,
        name: nameById.get(row.classOfferingId) || null,
        activeStudents: row._count._all,
      }))
      .sort((a, b) => b.activeStudents - a.activeStudents),
  };
}

async function getOverview(filters = {}) {
  const [attendance, fees, exams, enrollments] = await Promise.all([
    getAttendanceSummary(filters),
    getFeeSummary(filters),
    getExamSummary(filters),
    getEnrollmentSummary(filters),
  ]);

  return {
    filters: {
      academicYearId: filters.academicYearId ?? null,
      classOfferingId: filters.classOfferingId ?? null,
      from: filters.from ?? null,
      to: filters.to ?? null,
    },
    attendance,
    fees,
    exams,
    enrollments,
  };
}

module.exports = { getOverview };

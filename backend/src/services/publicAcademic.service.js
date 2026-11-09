const { prisma } = require('../config/database');

/**
 * Public, non-sensitive academic catalog for the Feature / marketing pages.
 * Returns only active (non-deleted) grade levels and subjects that look like
 * real school catalog entries — never E2E / SMS test scaffolding.
 */

/**
 * Detect synthetic rows created by Playwright/backend suites.
 * Keep this conservative: only match known test naming conventions.
 */
function isSyntheticCatalogEntry({ name, code }) {
  const n = String(name || '').trim();
  const c = String(code || '').trim();

  if (!n && !c) return true;

  // Playwright scaffold: "E2E Grade …", "E2E Maths …", "E2E Year …"
  if (/^E2E\b/i.test(n)) return true;

  // Backend suite prefixes (sms.*, pub.academic, etc.)
  if (/^(sms\.|pub\.|phase\d*)/i.test(n)) return true;

  // Codes from e2e helpers: E{stamp}-G / -M / -Y / -S / -OUT
  if (/^E[0-9A-Z]{4,12}-[GYMST]$/i.test(c)) return true;
  if (/^E[0-9A-Z]{4,12}-(OUT|T|STU)/i.test(c)) return true;

  // Common backend test code prefixes
  if (
    /^(PUBAC|XPORT|LMAT|GBOOK|NOTIF|TTABLE|DMMSG|SMSAC|SMSOP|SMSWF|PHASE)/i.test(
      c
    )
  ) {
    return true;
  }

  return false;
}

function toPublicGrade(row) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    sortOrder: row.sortOrder,
  };
}

function toPublicSubject(row) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
  };
}

async function getOverview() {
  const [gradeLevelRows, subjectRows, currentYear] = await Promise.all([
    prisma.gradeLevel.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        code: true,
        sortOrder: true,
      },
    }),
    prisma.subject.findMany({
      where: { deletedAt: null },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
      },
    }),
    prisma.academicYear.findFirst({
      where: { deletedAt: null, isCurrent: true },
      select: {
        id: true,
        name: true,
        code: true,
        startsOn: true,
        endsOn: true,
      },
    }),
  ]);

  const gradeLevels = gradeLevelRows
    .filter((row) => !isSyntheticCatalogEntry(row))
    .map(toPublicGrade);

  const subjects = subjectRows
    .filter((row) => !isSyntheticCatalogEntry(row))
    .map(toPublicSubject);

  return {
    currentAcademicYear:
      currentYear && !isSyntheticCatalogEntry(currentYear)
        ? {
            id: currentYear.id,
            name: currentYear.name,
            code: currentYear.code,
            startsOn: currentYear.startsOn,
            endsOn: currentYear.endsOn,
          }
        : null,
    gradeLevels,
    subjects,
    counts: {
      gradeLevels: gradeLevels.length,
      subjects: subjects.length,
    },
  };
}

module.exports = {
  getOverview,
  isSyntheticCatalogEntry,
};
